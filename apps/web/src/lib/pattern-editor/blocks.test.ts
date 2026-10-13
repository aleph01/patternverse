import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { editor, initSync } from '$lib/mira/engine/pattern_wasm.js';
import type { Inspection } from './types';
import {
  addPath,
  byteOffset,
  editableStatement,
  endInsertion,
  moveRule,
  newBlock,
  newPaths,
  patchSource,
  promptPatch,
  removePath,
  responseOptions,
  sliceSource,
} from './blocks';

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
const prefix =
  ':language 1\n:title "Café 🙂"\n\n!show {\n  <!-- Keep this comment and spacing. -->\n}\n\n';
const start = prefix + newBlock('', 'choose') + '\n-> end\n';
function fixture() {
  const structure = valid(start);
  const response = responseOptions(structure, endInsertion(structure)!.start)[0];
  return patchSource(start, [
    { span: endInsertion(structure)!, replacement: newPaths(start, response) },
  ]);
}

describe('compiler-backed block source editing', () => {
  it('offers typed inputs once, even though the compiler also includes them in bindings', () => {
    const source = ':language 1\n:input subject text\n!ask note {\nA note?\n}\n-> end';
    const structure = valid(source);
    const responses = responseOptions(structure, endInsertion(structure)!.start);
    expect(responses.map((r) => r.name)).toEqual(['subject', 'note']);
  });
  it('uses real compiler fields, updates a prompt and preserves all untouched source bytes', () => {
    const structure = valid(start),
      statement = structure.source_statements!.find((s) => s.kind === 'choose')!;
    const changed = patchSource(start, [promptPatch(statement, 'What helps today?')]);
    valid(changed);
    expect(changed.slice(0, prefix.length)).toBe(prefix);
    expect(changed).toContain(':option explore "Explore options"');
    expect(changed.endsWith('\n-> end\n')).toBe(true);
    expect(sliceSource(start, statement.span)).toContain('What would help?');
  });
  it('round-trips exact cases, an empty fallback and an explicitly shared continuation', () => {
    const source = fixture(),
      structure = valid(source);
    expect(structure.paths).toHaveLength(1);
    const paths = structure.paths![0];
    expect(paths.mode).toBe('match');
    expect(paths.response).toBe('choice');
    expect(paths.arms).toHaveLength(3);
    expect(paths.arms.at(-1)!.destination).toBe(paths.continuation);
    expect(source.startsWith(prefix)).toBe(true);
  });
  it('adds and removes a case without rewriting original bodies, and inserts a child into Otherwise', () => {
    const source = fixture(),
      paths = valid(source).paths![0];
    const added = addPath(source, paths, '"unsure"'),
      projection = valid(added);
    expect(projection.paths![0].arms).toHaveLength(4);
    const fallback = projection.paths![0].arms.at(-1)!;
    const withChild = patchSource(added, [
      {
        span: { start: fallback.terminal.start, end: fallback.terminal.start },
        replacement: newBlock(added, 'ask'),
      },
    ]);
    expect(valid(withChild).paths![0].arms.at(-1)!.content.end).toBeGreaterThan(
      fallback.content.end,
    );
    const removed = removePath(withChild, valid(withChild).paths![0], 2);
    valid(removed);
    expect(removed).toContain('What options could you explore?');
    expect(removed).toContain('Write your question here.');
    expect(() => removePath(source, paths, 2)).toThrow('Otherwise');
  });
  it('keeps ordered rule priority in language rather than interpreting rules in the editor', () => {
    const rated = prefix + newBlock('', 'rate') + '\n-> end\n';
    const structure = valid(rated);
    const source = patchSource(rated, [
      {
        span: endInsertion(structure)!,
        replacement: newPaths(rated, responseOptions(structure, endInsertion(structure)!.start)[0]),
      },
    ]);
    const paths = valid(source).paths![0];
    expect(paths.arms[0].rule!.value).toBe(8);
    const moved = moveRule(source, paths, 1);
    expect(valid(moved).paths![0].arms[0].rule!.value).toBe(4);
    const added = addPath(moved, valid(moved).paths![0], 'rating < 2');
    expect(valid(added).paths![0].arms).toHaveLength(4);
  });
  it('does not erase unsupported syntax and still uses compiler errors for invalid edits', () => {
    const source = prefix + '!collect notes {\n:max 2\n!ask note {\nA note?\n}\n}\n-> end\n';
    const structure = valid(source);
    expect(editableStatement(structure.source_statements!.find((s) => s.kind === 'collect')!)).toBe(
      false,
    );
    const candidate = patchSource(source, [
      { span: endInsertion(structure)!, replacement: newBlock(source, 'timer') },
    ]);
    valid(candidate);
    expect(candidate.slice(0, source.indexOf('-> end'))).toBe(
      source.slice(0, source.indexOf('-> end')),
    );
    expect(inspect(candidate.replace(':duration 60', ':duration -1')).structure).toBeNull();
  });
  it('rejects overlapping edits and UTF-8 midpoint edits', () => {
    const source = '🙂 Café';
    expect(byteOffset(source, 2)).toBe(4);
    expect(patchSource(source, [{ span: { start: 5, end: 10 }, replacement: 'Mira' }])).toBe(
      '🙂 Mira',
    );
    expect(() => patchSource(source, [{ span: { start: 1, end: 2 }, replacement: 'x' }])).toThrow(
      'character boundary',
    );
    expect(() =>
      patchSource(source, [
        { span: { start: 0, end: 5 }, replacement: 'x' },
        { span: { start: 4, end: 10 }, replacement: 'y' },
      ]),
    ).toThrow('overlap');
  });
  it.each(['ask', 'show', 'choose', 'rate', 'timer'] as const)(
    'generates %s using canonical language and collision-free bindings',
    (kind) => {
      const source = prefix + newBlock('', kind) + newBlock(newBlock('', kind), kind) + '-> end';
      valid(source);
    },
  );
});
