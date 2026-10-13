import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import { beforeAll, describe, expect, it } from 'vitest';
import { editor, initSync } from '$lib/mira/engine/pattern_wasm.js';
import type { Inspection } from './types';
import {
  editableStatement,
  endInsertion,
  newBlock,
  newPaths,
  patchSource,
  removePath,
  responseOptions,
} from './blocks';
import {
  addPathCase,
  blockFieldsDraft,
  editBlockFields,
  editPaths,
  insertPathBlock,
  pathCasesForResponse,
  pathsDraft,
  type BlockFieldsDraft,
} from './edits';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
const inspect = (source: string): Inspection =>
  JSON.parse(editor(JSON.stringify({ operation: 'inspect', source })));
function valid(source: string) {
  const result = inspect(source);
  expect(result.diagnostics.filter((d) => d.severity === 'Error')).toEqual([]);
  expect(result.structure).toBeTruthy();
  return result.structure!;
}
const prefix = ':language 1\n:title "Café 🙂"\n\n!show {\n  <!-- Keep this source. -->\n}\n\n';
function blockEdit(source: string, kind: string, changes: Partial<BlockFieldsDraft>) {
  const statement = valid(source).source_statements!.find((s) => s.kind === kind)!;
  const original = blockFieldsDraft(statement);
  const result = editBlockFields(source, statement, original, { ...original, ...changes });
  if (result.error !== undefined) throw new Error(result.error);
  return result.source;
}
function fixture(kind: 'choose' | 'rate' | 'ask' = 'choose') {
  const source = prefix + newBlock('', kind) + '\n-> end\n';
  const model = valid(source);
  return patchSource(source, [
    {
      span: endInsertion(model)!,
      replacement: newPaths(source, responseOptions(model, endInsertion(model)!.start)[0]),
    },
  ]);
}

describe('form-to-language edits', () => {
  it.each(['ask', 'show', 'choose', 'rate', 'timer'] as const)(
    'leaves unedited %s source byte-identical',
    (kind) => {
      const source = prefix + newBlock('', kind) + '\n-> end\n';
      expect(blockEdit(source, kind, {})).toBe(source);
    },
  );
  it('changes a functional rating range without changing labels or comments', () => {
    const source =
      prefix + 'score = !rate 0..5 {\n  :low "Low"\n  :high "High"\n  Clarity?\n}\n-> end\n';
    const changed = blockEdit(source, 'rate', { range: '-5..5', prompt: 'How clear?' });
    expect(changed).toBe(source.replace('0..5', '-5..5').replace('Clarity?', 'How clear?'));
    valid(changed);
  });
  it('lets the compiler reject invalid ranges rather than adding a second validator', () => {
    const source = prefix + newBlock('', 'rate') + '-> end';
    const changed = blockEdit(source, 'rate', { range: 'invalid' });
    expect(inspect(changed).structure).toBeNull();
  });
  it('preserves interleaved choice attributes, option identity and quoted Unicode labels', () => {
    const source =
      prefix +
      '!choose route {\n  :option yes "Yes"\n  :multi\n  :option no "No"\n  Pick a route.\n}\n-> end\n';
    const changed = blockEdit(source, 'choose', {
      options: [
        { value: 'yes', label: 'Café "🙂"' },
        { value: 'no', label: 'No' },
        { value: 'maybe', label: 'Maybe' },
      ],
    });
    valid(changed);
    expect(changed).toContain('  :multi\n');
    expect(changed).toContain(':option yes ' + JSON.stringify('Café "🙂"'));
    expect(changed).toContain(':option maybe "Maybe"');
    expect(changed.startsWith(prefix)).toBe(true);
    expect(changed.endsWith('  Pick a route.\n}\n-> end\n')).toBe(true);
  });
  it('preserves timer attribute order while adding optional controls and changing the prompt', () => {
    const source =
      prefix + '!timer pause {\n  :blocking true\n  :duration 60\n  Pause.\n}\n-> end\n';
    const changed = blockEdit(source, 'timer', {
      duration: '1.5',
      adjustable: true,
      min: '0.5',
      max: '3',
      sticky: false,
      blocking: false,
      prompt: 'Take a moment.',
    });
    const statement = valid(changed).source_statements!.find((s) => s.kind === 'timer')!;
    const values = Object.fromEntries(statement.attributes.map((a) => [a.name, a.args[0].value]));
    expect(values).toEqual({
      duration: '90',
      blocking: 'false',
      adjustable: 'true',
      sticky: 'false',
      min: '30',
      max: '180',
    });
    expect(changed).toContain('  :blocking false\n  :duration 90\n');
    expect(changed.startsWith(prefix)).toBe(true);
  });
  it('removes adjustable bounds while preserving the timer body', () => {
    const source =
      prefix +
      '!timer pause {\n  :duration 60\n  :adjustable true\n  :min 30\n  :blocking false\n  :max 180\n  Pause.\n}\n-> end';
    const changed = blockEdit(source, 'timer', { adjustable: false });
    valid(changed);
    expect(changed).not.toMatch(/:min|:max/);
    expect(changed).toContain('  :blocking false\n');
    expect(changed.endsWith('  Pause.\n}\n-> end')).toBe(true);
  });
  it.each([
    { duration: '' },
    { duration: '0' },
    { duration: '1441' },
    { duration: '0.123' },
    { adjustable: true, min: '2' },
    { adjustable: true, max: '0.5' },
    { adjustable: true, min: '' },
  ])('rejects invalid minute input atomically: %j', (changes) => {
    const source = prefix + newBlock('', 'timer') + '-> end';
    const statement = valid(source).source_statements!.find((s) => s.kind === 'timer')!;
    const original = blockFieldsDraft(statement);
    const result = editBlockFields(source, statement, original, {
      ...original,
      prompt: 'Must not commit',
      ...changes,
    });
    expect(result.error).toContain('valid minutes');
    expect(result.source).toBeUndefined();
  });
  it('round-trips exact whole seconds, bounds and Unicode prompts across generated drafts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 86400 }),
        fc.constantFrom('Café 🙂', 'Überlegen', '日本語', 'Two\nlines'),
        (seconds, prompt) => {
          const source = prefix + newBlock('', 'timer') + '\n-> end\n';
          const changed = blockEdit(source, 'timer', {
            duration: seconds / 60,
            adjustable: true,
            min: 1 / 60,
            max: 1440,
            prompt,
          });
          const timer = valid(changed).source_statements!.find((s) => s.kind === 'timer')!;
          expect(timer.attributes.find((a) => a.name === 'duration')!.args[0].value).toBe(
            String(seconds),
          );
          expect(blockFieldsDraft(timer).prompt).toBe(prompt);
          expect(changed.startsWith(prefix)).toBe(true);
          expect(changed.endsWith('\n-> end\n')).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('paths source edits', () => {
  it('preserves control formatting for a no-op or a destination-only edit', () => {
    const source = fixture().replace(':case "explore"', ':case   explore');
    const model = valid(source),
      paths = model.paths![0],
      draft = pathsDraft(paths);
    const response = responseOptions(model, paths.control.start)[0];
    expect(editPaths(source, paths, draft, response)).toBe(source);
    draft.cases[0].destination = 'end';
    const changed = editPaths(source, paths, draft, response);
    valid(changed);
    expect(changed).toContain(':case   explore');
    expect(changed).toBe(source.replace('-> after_paths\npath_second:', '-> end\npath_second:'));
  });
  it('updates cases and explicit destinations, leaving child bodies and surrounding source intact', () => {
    const source = fixture();
    const model = valid(source),
      paths = model.paths![0],
      draft = pathsDraft(paths);
    draft.cases[0].value = 'unsure';
    draft.cases.at(-1)!.destination = 'end';
    const changed = editPaths(source, paths, draft, responseOptions(model, paths.control.start)[0]);
    const next = valid(changed).paths![0];
    expect(next.arms[0].value).toBe('unsure');
    expect(next.arms.at(-1)!.destination).toBe('end');
    expect(changed).toContain('What options could you explore?');
    expect(changed).toContain('What is one small action you could take?');
    expect(changed.startsWith(prefix)).toBe(true);
    expect(changed.endsWith('\n-> end\n')).toBe(true);
  });
  it('retains compiler validation of duplicate cases', () => {
    const source = fixture();
    const model = valid(source),
      paths = model.paths![0],
      draft = pathsDraft(paths);
    draft.cases[1].value = draft.cases[0].value;
    const result = inspect(
      editPaths(source, paths, draft, responseOptions(model, paths.control.start)[0]),
    );
    expect(result.structure).toBeNull();
    expect(result.diagnostics.some((d) => d.message.includes('Duplicate match case'))).toBe(true);
  });
  it('changes a match into ordered numerical rules using the selected response', () => {
    const source = fixture().replace('?match choice', newBlock('', 'rate') + '?match choice');
    const model = valid(source),
      paths = model.paths![0],
      draft = pathsDraft(paths);
    draft.response = 'rating';
    draft.cases[0].number = '9';
    draft.cases[1].number = '4';
    const changed = editPaths(
      source,
      paths,
      draft,
      responseOptions(model, paths.control.start).find((r) => r.name === 'rating'),
    );
    const next = valid(changed).paths![0];
    expect(next.mode).toBe('branch');
    expect(next.arms.slice(0, -1).map((a) => a.rule!.value)).toEqual([9, 4]);
  });
  it('leaves advanced condition expressions in Source rather than inventing an editable projection', () => {
    const source = fixture('rate');
    const advanced = source.replace('rating >= 8', 'rating > 5 and rating < 9');
    const advancedModel = valid(advanced);
    expect(advancedModel.paths).toEqual([]);
    expect(
      editableStatement(advancedModel.source_statements!.find((s) => s.kind === '?branch')!),
    ).toBe(false);
    const changed = blockEdit(advanced, 'rate', { prompt: 'How clear are you?' });
    valid(changed);
    expect(changed).toContain('rating > 5 and rating < 9');
  });
  it.each(['choice', 'boolean', 'number', 'text'])(
    'sets %s authoring defaults without mutating cases or destinations',
    (type) => {
      const source = fixture(),
        paths = valid(source).paths![0],
        original = pathsDraft(paths).cases;
      const before = structuredClone(original);
      const changed = pathCasesForResponse(original, {
        name: 'response',
        title: 'Response',
        type,
        choices:
          type === 'choice'
            ? [
                { value: 'one', label: 'One' },
                { value: 'two', label: 'Two' },
              ]
            : [],
      });
      expect(original).toEqual(before);
      expect(changed.at(-1)).toEqual(before.at(-1));
      expect(changed.map((c) => c.destination)).toEqual(before.map((c) => c.destination));
      expect(changed.slice(0, 2).map((c) => c.value)).toEqual(
        type === 'choice'
          ? ['one', 'two']
          : type === 'boolean'
            ? ['true', 'false']
            : type === 'number'
              ? ['0', '1']
              : ['case 1', 'case 2'],
      );
      expect(changed.slice(0, 2).map((c) => c.number)).toEqual(['8', '4']);
    },
  );
  it('serializes boolean match cases without quotes and adds the remaining boolean', () => {
    const start = ':language 1\n:input ready boolean\n-> end\n';
    const model = valid(start),
      response = responseOptions(model, endInsertion(model)!.start)[0];
    const source = patchSource(start, [
      { span: endInsertion(model)!, replacement: newPaths(start, response) },
    ]);
    const paths = valid(source).paths![0],
      draft = pathsDraft(paths);
    const changed = editPaths(source, paths, draft, response);
    valid(changed);
    expect(changed).toContain(':case true');
    expect(changed).toContain(':case false');
    const single = removePath(changed, valid(changed).paths![0], 1);
    const singlePaths = valid(single).paths![0];
    const added = addPathCase(single, singlePaths, pathsDraft(singlePaths).cases, response);
    valid(added);
    expect(added).toContain(':case false');
  });
  it('adds the unused choice and supplies rule defaults for numeric responses', () => {
    for (const kind of ['choose', 'rate'] as const) {
      const source = fixture(kind),
        model = valid(source),
        paths = model.paths![0];
      const changed = addPathCase(
        source,
        paths,
        pathsDraft(paths).cases,
        responseOptions(model, paths.control.start)[0],
      );
      const next = valid(changed).paths![0];
      expect(next.arms).toHaveLength(4);
      if (kind === 'choose') expect(next.arms[2].value).toBe('unsure');
      else expect(next.arms[2].rule!.operator).toBe('<');
    }
  });
  it.each(['ask', 'show', 'choose', 'rate', 'timer'] as const)(
    'inserts a %s in Otherwise without rewriting the paths',
    (kind) => {
      const source = fixture(),
        paths = valid(source).paths![0];
      const changed = insertPathBlock(source, paths, paths.arms.length - 1, kind);
      valid(changed);
      expect(changed).toContain(newBlock(source, kind));
      expect(changed.startsWith(source.slice(0, source.indexOf('path_otherwise:')))).toBe(true);
    },
  );
});
