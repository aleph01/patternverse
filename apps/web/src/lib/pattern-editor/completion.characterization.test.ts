import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { applyCompletion, completions } from './completion';

// Recorded against the original implementation before extraction. These snapshots lock
// down ordering, descriptions, templates, replacement ranges, and the resulting caret.
const fixtures: Record<string, string> = {
  commands: '',
  boundCommands: 'result = ',
  rootAttributes: ':',
  formAttributes: '!form reflection {\n:',
  fieldAttributes: '!form reflection {\n!ask thought {\n:',
  flowAttributes: 'flow helper {\n:',
  classifierAttributes: 'classifier intent -> Intent {\n:',
  matchAttributes: '?match value {\n:',
  branchAttributes: '?branch {\n:',
  classifyAttributes: 'kind = value ?~ intent {\n:',
  useAttributes: '!use helper {\n:',
  refineAttributes: '!refine review = wording {\n:',
  collectAttributes: '!collect entries {\n:',
  agentAttributes: '!agent suggestion {\n:',
  timerAttributes: '!timer pause {\n:',
  formTimerAttributes: '!form reflection {\n!timer pause {\n:',
  rateAttributes: '!rate score 0..10 {\n:',
  chooseAttributes: '!choose choice {\n:',
  rankAttributes: '!rank ordered {\n:',
  chooseParameters: '!choose choice [',
  rankParameters: '!rank ordered [',
  refineParameters: '!refine[',
  suppliedParameters: '!choose choice [multi, min=1, prefer=chips, ',
  pureFunctions: 'value = cl',
  pipelineFunctions: 'value = original |> cl',
  pipelineAlternatives: 'value = original |> fi',
  ordinaryAlternatives: 'value = fi',
  helpers: 'fn clean(s: text) -> text => s |> trim\nvalue = cl',
  enumTypes: 'type Intent = answer | other\nvalue = In',
  enumVariants: 'type Intent = answer\n | question | other\nvalue = Intent.',
  enumCases: 'type Intent = answer | other\nkind = Intent.answer\n?match kind {\n:case ',
  prefixedEnumCases:
    'type Intent = answer | other\nkind = Intent.answer\n?match kind {\n:case Intent.',
  classifiers: 'classifier intent -> Intent {\n}\nkind = message ?~ in',
  flowAndImportCalls: ':import "p@hash" as helper\nflow helper {\n}\n!use he',
  eventHandlers: 'flow handle {\n}\nevents {\non user.message -> ha',
  transitions: 'finish:\n-> ',
  collectTransitions: '!collect entries {\n-> ',
  iterationTransitions: 'entries = each item in [1] {\n-> ',
  loopTransitions: '?loop[4] state = initial {\n-> ',
  refineTransitions: '!refine review = wording {\n-> ',
  functionReturn: 'fn clean(s: text) -> ',
  interpolation: ':input topic text\n!show {\n{{to',
  quotedInterpolation: ':input topic text\nvalue = "{{to',
  implicitDirectiveBoundary: '!ask response\nQuestion?\n!show {\n{{res',
  comment: '# !as',
  quotedText: 'value = "!as',
  explicitProse: '!show {\nPlease !as',
  implicitProse: '!ask response\nPlease !as',
  pendingBinding: 'answer = !ask {\n{{ans',
  nestedBindings: 'entries = each item in [1] {\nlocal = 2\nvalue = loc',
  closedBindings: 'entries = each item in [1] {\nlocal = 2\n}\nloc',
  isolatedFlow: ':input secret text\nflow helper {\n:input topic text\nvalue = ',
  duplicateBindingAndFunction: 'trim = "text"\nvalue = tr',
  indentedCommand: '# café 🙂\n\t  !as',
  caseInsensitive: '!AS',
};

describe('completion compatibility contract', () => {
  it.each(Object.entries(fixtures))('preserves %s suggestions and edits', (name, source) => {
    const set = completions(source, source.length);
    expect({
      set,
      edits: set.items.map((completion) => applyCompletion(source, set, completion)),
    }).toMatchSnapshot(name);
  });

  it('preserves replacement ranges inside a token and exact pinned imports', () => {
    const source = '# 🙂\n  !askkk\n-> end';
    const set = completions(source, source.indexOf('!askkk') + 3);
    const imports = completions(':import ', 8, undefined, [
      { name: 'unpinned', title: 'No pin' },
      { name: 'saved', title: 'Saved pattern', import_reference: 'real@exact-pin' },
      { name: 'saved', title: 'Duplicate', import_reference: 'real@exact-pin' },
    ]);
    expect({ set, edit: applyCompletion(source, set, set.items[0]!), imports }).toMatchSnapshot();
  });

  it('keeps insertion outside its range intact for arbitrary Unicode and indentation', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: 'grapheme' }),
        fc.string({ unit: 'grapheme' }),
        fc.array(fc.constantFrom(' ', '\t'), { maxLength: 8 }),
        fc.integer({ min: 0, max: 6 }),
        (prefix, suffix, spaces, split) => {
          const indentation = spaces.join('');
          const start = prefix.length + 1 + indentation.length;
          const source = prefix + '\n' + indentation + '!askkk' + suffix;
          const completion = { label: 'test', insert: 'first\n  ¦second\nend', detail: '' };
          const next = applyCompletion(
            source,
            { from: start, to: start + split, items: [completion] },
            completion,
          );
          const inserted = `first\n${indentation}  second\n${indentation}end`;
          expect(next.source).toBe(source.slice(0, start) + inserted + source.slice(start + split));
          expect(next.caret).toBe(start + `first\n${indentation}  `.length);
          expect(next.source.slice(next.caret).startsWith('second')).toBe(true);
        },
      ),
      { seed: 20261011, numRuns: 300 },
    );
  });

  it('always returns bounded, unique, prefix-matching suggestions for arbitrary source', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string({ unit: 'grapheme' }), fc.constantFrom(...Object.values(fixtures))),
        fc.nat(),
        (source, offset) => {
          const position = offset % (source.length + 1);
          const set = completions(source, position);
          const token = source.slice(set.from, position).toLowerCase();
          expect(set.from).toBeGreaterThanOrEqual(0);
          expect(set.from).toBeLessThanOrEqual(position);
          expect(set.to).toBeGreaterThanOrEqual(position);
          expect(set.to).toBeLessThanOrEqual(source.length);
          expect(set.items.length).toBeLessThanOrEqual(30);
          expect(new Set(set.items.map((item) => item.insert)).size).toBe(set.items.length);
          for (const item of set.items)
            expect(item.label.toLowerCase().startsWith(token)).toBe(true);
        },
      ),
      { seed: 20261011, numRuns: 300 },
    );
  });
});
