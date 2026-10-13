import { describe, expect, it } from 'vitest';
import { applyCompletion, completions, type CheckedSource } from './completion.js';
import type { CompletionLibraryEntry as LibraryEntry } from './types';

function suggest(source: string, checked?: CheckedSource) {
  return completions(source, source.length, checked);
}
const labels = (source: string, checked?: CheckedSource) =>
  suggest(source, checked).items.map((item) => item.label);
describe('local Pattern completion', () => {
  it('offers grouped forms and field flags without leaking sibling field bindings', () => {
    expect(labels('reflection = !fo')).toEqual(['!form']);
    expect(labels('reflection = !form {\n:ti')).toEqual([':title']);
    expect(labels('reflection = !form {\n!ask thought {\n:re')).toEqual([':required']);
    expect(labels('reflection = !form {\n!ask thought {\n:mu')).toEqual([':multiline']);
    expect(labels('reflection = !form {\n!ask thought {\n:pl')).toEqual([':placeholder']);
    expect(labels('reflection = !form {\n!ask thought {\nQuestion?\n}\n!ask note {\n{{th')).toEqual(
      [],
    );
  });
  it('offers bounded timers and suppresses command suggestions in timer prose', () => {
    expect(labels('pause = !ti')).toEqual(['!timer']);
    expect(labels('pause = !timer {\n:du')).toEqual([':duration']);
    expect(labels('pause = !timer {\nTake time !as')).toEqual([]);
  });
  it('offers flow calls and event templates without leaking enclosing inputs', () => {
    const declaration =
      ':language 1\n:input private_value text\nflow ask_topic {\n:input topic text\n:output answer\nanswer = !ask {\nQuestion\n}\n-> end\n}\n';
    expect(labels(declaration + 'result = !use ask_')).toEqual(['ask_topic']);
    expect(labels(declaration + 'events {\non user.message -> ask_')).toEqual(['ask_topic']);
    expect(labels(':language 1\nflo')).toEqual(['flow']);
    expect(labels(':language 1\neve')).toEqual(['events']);
    expect(
      labels(':language 1\n:input private_value text\nflow helper {\nvalue = private_'),
    ).toEqual([]);
  });
  it('completes commands in binding context and keeps snippets in language one', () => {
    const source = ':language 1\nanswer = !as';
    const options = suggest(source);
    expect(options.items.map((item) => item.label)).toEqual(['!ask']);
    expect(applyCompletion(source, options, options.items[0]!).source).toBe(
      ':language 1\nanswer = !ask {\n  What comes to mind?\n}',
    );
    expect(labels(':language 1\nanswer = !')).not.toContain('!show');
    expect(labels(':language 1\n!ref')).toContain('!refine');
    expect(labels(':lang')).toEqual([':language']);
    expect(suggest(':lang').items[0]!.insert).toBe(':language 1');
  });
  it('does not autocomplete prose, comments, quoted strings, or private names from closed iterations', () => {
    for (const source of [
      '# !as',
      'value = "!as',
      '!show {\nPlease !as',
      '!ask response\nPlease !as',
    ])
      expect(labels(source)).toEqual([]);
    expect(
      labels(':language 1\nentries = each item in [1] {\nlocal = 2\n-> yield local\n}\nloc'),
    ).toEqual([]);
    expect(labels(':language 1\nentries = each item in [1] {\nlocal = 2\nresult = loc')).toContain(
      'local',
    );
    expect(labels(':language 1\nanswer = !ask {\n{{ans')).toEqual([]);
  });
  it('completes explicit bindings in interpolations and typed enum/classifier declarations', () => {
    const base =
      ':language 1\ntype Intent = answer | question | other\nclassifier intent -> Intent {\n:case answer "Answers."\n:case question "Asks."\n:fallback other\n}\nmessage = "hello"\n';
    expect(labels(base + 'kind = message ?~ in')).toEqual(['intent']);
    expect(labels(base + 'kind = message ?~ intent\n?match kind {\n:case a')).toEqual(['answer']);
    expect(labels(base + 'kind = Intent.a')).toEqual(['Intent.answer']);
    expect(labels(base + '!show {\n{{mes')).toEqual(['message']);
    expect(labels(base + 'kind = message ?~ intent {\n:wi')).toEqual([':with']);
  });
  it('gets record fields from the compiler and discards types when earlier source changed', () => {
    const prefix = ':language 1\nrecord = {text: "hello"}\n';
    const checked: CheckedSource = {
      source: prefix + '-> end',
      structure: {
        title: null,
        revision: 'r',
        inputs: {},
        outputs: {},
        dependencies: {},
        bindings: [
          {
            name: 'record',
            slot: 0,
            span: { start: 12, end: 18 },
            value_type: { record: { text: 'text', nested: { record: { value: 'number' } } } },
          },
        ],
        steps: [
          {
            kind: 'derive',
            binding: 'record',
            dependency: null,
            span: { start: 12, end: prefix.length - 1 },
            children: [],
            locals: [],
            targets: [],
          },
        ],
      },
    };
    expect(labels(prefix + 'value = record.t', checked)).toEqual(['record.text']);
    expect(labels(prefix + '!show {\n{{record.nested.', checked)).toEqual([]); // preceding source no longer matches
    expect(labels(prefix.replace('"hello"', '3') + 'value = record.t', checked)).toEqual([]);
  });
  it('offers labels, effect-specific parameters and exact pinned imports', () => {
    const source = '?match thing {\n:case a -> fi\n}\nfinish:\n-> end';
    const position = source.indexOf('fi') + 2;
    expect(completions(source, position).items.map((item) => item.label)).toEqual(['finish']);
    expect(labels('choice = !choose[mu')).toEqual(['multi']);
    expect(labels('review = !refine[ro')).toEqual(['rounds=4']);
    expect(labels('choice = !choose [mu')).toEqual(['multi']);
    expect(labels('!choose choice [multi, mi')).toEqual(['min=1']);
    expect(labels('!choose choice [multi, min=1, mi')).toEqual([]);
    expect(labels('choice = !choose [pr')).toEqual([
      'prefer=checklist',
      'prefer=chips',
      'prefer=radio',
    ]);
    expect(labels(':import "real@hash" as helper\nresult = !use he')).toEqual(['helper']);
    const entry = {
      name: 'saved',
      title: 'Saved pattern',
      import_reference: 'real@exact-pin',
    } as LibraryEntry;
    const options = completions(':import ', 8, undefined, [entry]);
    expect(options.items[0]?.insert).toBe('"real@exact-pin" as helper');
  });
  it('replaces the complete token and preserves indentation and Unicode caret offsets', () => {
    const source = '# café 🙂\n  !askkk\n-> end';
    const position = source.indexOf('!askkk') + 3;
    const options = completions(source, position);
    const next = applyCompletion(
      source,
      options,
      options.items.find((item) => item.label === '!ask')!,
    );
    expect(next.source).toContain('  !ask response {\n    What comes to mind?\n  }\n-> end');
    expect(next.source.slice(next.caret)).toMatch(/^What comes/);
  });
});
