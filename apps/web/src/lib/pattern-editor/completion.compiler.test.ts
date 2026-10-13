import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import { completions, type CheckedSource } from './completion';
import type { Inspection } from './types';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);

function checked(source: string): CheckedSource {
  const result: Inspection = JSON.parse(editor(JSON.stringify({ operation: 'inspect', source })));
  expect(result.diagnostics.filter((issue) => issue.severity === 'Error')).toEqual([]);
  expect(result.structure).not.toBeNull();
  return { source, structure: result.structure! };
}
function labels(source: string, inspection: CheckedSource, position = source.length) {
  return completions(source, position, inspection).items.map((item) => item.label);
}

describe('completion uses the existing compiler projection', () => {
  it('completes nested record fields without inferring types from source text', () => {
    const prefix = ':language 1\nrecord = {text: "hello", nested: {value: 2}}\n';
    const inspection = checked(prefix + '-> end');
    expect(labels(prefix + 'value = record.', inspection)).toEqual([
      'record.nested',
      'record.text',
    ]);
    expect(labels(prefix + 'value = record.nested.', inspection)).toEqual(['record.nested.value']);
    expect(
      completions(prefix + 'value = record.', prefix.length + 'value = record.'.length).items,
    ).toEqual([]);
  });

  it('uses compiler-projected form records without exposing sibling field bindings', () => {
    const prefix =
      ':language 1\n!form reflection {\n!ask thought {\nA thought?\n}\n!ask note {\nA note?\n}\n}\n';
    const inspection = checked(prefix + '-> end');
    expect(labels(prefix + 'value = reflection.', inspection)).toEqual([
      'reflection.note',
      'reflection.thought',
    ]);
    const position = prefix.indexOf('A note?');
    const edited = prefix.slice(0, position) + '{{thought' + prefix.slice(position);
    expect(labels(edited, inspection, position + '{{thought'.length)).toEqual([]);
    // Preserve the existing hint behavior: compiler-projected form shape can be
    // offered during a field edit. Suggestions are not an availability check.
    const recordEdit = prefix.slice(0, position) + '{{reflection.' + prefix.slice(position);
    expect(labels(recordEdit, inspection, position + '{{reflection.'.length)).toEqual([
      'reflection.note',
      'reflection.thought',
    ]);
  });

  it('uses UTF-8 compiler spans despite UTF-16 editor positions', () => {
    const prefix =
      ':language 1\n:title "café 🙂 漢字"\n!choose choice {\nChoose.\n- yes: "Yes"\n- no: "No"\n}\n';
    const inspection = checked(prefix + '-> end');
    expect(labels(prefix + 'value = choice.', inspection)).toEqual([
      'choice.value',
      'choice.label',
    ]);
  });

  it('retains valid types while editing the current line, but rejects stale preceding text', () => {
    const prefix = ':language 1\nrecord = {text: "hello"}\n';
    const inspection = checked(prefix + 'value = record.text\n-> end');
    expect(labels(prefix + 'value = record.t', inspection)).toEqual(['record.text']);
    expect(labels(prefix.replace('"hello"', '3') + 'value = record.t', inspection)).toEqual([]);
    expect(labels('# added\n' + prefix + 'value = record.t', inspection)).toEqual([]);
  });

  it('does not publish a compiler-projected binding before its step ends', () => {
    const source = ':language 1\n!ask answer {\nWhat comes to mind?\n}\n-> end';
    const inspection = checked(source);
    const position = source.indexOf('What comes');
    const edited = source.slice(0, position) + '{{ans' + source.slice(position);
    expect(labels(edited, inspection, position + '{{ans'.length)).toEqual([]);
  });

  it('does not leak compiler root inputs into an isolated flow', () => {
    const prefix = ':language 1\n:input secret text\nflow helper {\n:input topic text\n';
    const inspection = checked(prefix + '!show {\n{{topic}}\n}\n-> end\n}\n-> end');
    expect(labels(prefix + 'value = sec', inspection)).toEqual([]);
    expect(labels(prefix + 'value = top', inspection)).toEqual(['topic']);
  });

  it('uses compiler enum metadata for match cases on nested record fields', () => {
    const prefix =
      ':language 1\ntype Intent = answer | other\nrecord = {kind: Intent.answer}\n?match record.kind {\n';
    const inspection = checked(prefix + ':case answer -> end\n:else -> end\n}\n-> end');
    expect(labels(prefix + ':case ', inspection)).toEqual(['answer', 'other']);
    expect(labels(prefix + ':case Intent.a', inspection)).toEqual(['Intent.answer']);
  });

  it('preserves binding order and the thirty-item cap', () => {
    const prefix =
      ':language 1\n' +
      Array.from({ length: 35 }, (_, index) => `value_${index} = ${index}\n`).join('');
    const inspection = checked(prefix + '-> end');
    expect(labels(prefix + 'value_', inspection)).toEqual(
      Array.from({ length: 30 }, (_, index) => `value_${index}`),
    );
  });
});
