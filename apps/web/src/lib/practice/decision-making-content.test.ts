// @vitest-environment jsdom
import { resolve } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, expect, it } from 'vitest';
import { parseLanguagePracticeFromBody } from '@patternverse/compiler/practice';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import type { StandaloneRun } from '$lib/mira/guided';
import { formBlocks, type FormAnswers } from '$lib/pattern-run/form';

const root = resolve(process.cwd(), '../..');
const ids = [
  'reduce-the-first-step',
  'separate-reversible-from-irreversible-decisions',
  'define-the-decision-before-comparing-options',
  'make-trade-offs-explicit',
  'map-outcomes-likelihoods-and-preferences',
  'look-for-the-decisive-unknown',
  'prefer-the-smallest-useful-experiment',
  'run-a-premortem',
  'keep-a-decision-journal',
];
const files = [...ids.map((id) => `patterns/${id}.md`), 'practices/five-alternative-frames.md'];
beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
function execute(request: Record<string, unknown>): StandaloneRun {
  return JSON.parse(editor(JSON.stringify(request)));
}
function advance(run: StandaloneRun, value: FormAnswers) {
  const effect = run.view.pending!;
  return execute({
    operation: 'apply',
    saved: run.saved,
    expected_revision: run.view.revision,
    command: {
      run_id: effect.run_id,
      event: { Fulfill: { effect_id: effect.effect_id, result: { kind: 'form', value } } },
    },
  });
}

it('has no public legacy practice fences and preserves article YAML frontmatter', () => {
  for (const directory of ['patterns', 'practices'])
    for (const name of readdirSync(resolve(root, 'content', directory))) {
      if (!name.endsWith('.md')) continue;
      const text = readFileSync(resolve(root, 'content', directory, name), 'utf8');
      expect(text.startsWith('---\n')).toBe(true);
      expect(text).not.toContain('```patternverse-practice');
    }
});
it.each(files)(
  'runs migrated %s through the shipped Rust engine with grouped validation and continuous history',
  (file) => {
    const parsed = parseLanguagePracticeFromBody(
      readFileSync(resolve(root, 'content', file), 'utf8'),
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.source).toBeTruthy();
    let run = execute({ operation: 'start', source: parsed.source, root_id: file, inputs: {} });
    const expectedGroups = (parsed.source!.match(/= !form \{/g) ?? []).length;
    let groups = 0;
    while (run.view.pending) {
      const effect = run.view.pending;
      expect(effect.request.kind).toBe('interaction.form');
      const fields = formBlocks(effect).filter((block) => block.type === 'ask');
      const empty = Object.fromEntries(
        fields.map((field) => [field.id, { type: 'text', value: '' }]),
      ) as FormAnswers;
      if (fields.some((field) => field.required)) {
        expect(() => advance(run, empty)).toThrow();
        expect(run.view.pending.effect_id).toBe(effect.effect_id);
      }
      const answers = Object.fromEntries(
        fields.map((field) => [
          field.id,
          {
            type: 'text',
            value: field.required ? `Synthetic response for ${field.id}` : '',
          },
        ]),
      ) as FormAnswers;
      run = advance(run, answers);
      expect(run.view.items.filter((item) => item.result)).toHaveLength(++groups);
      expect(groups).toBeLessThanOrEqual(expectedGroups);
      for (const item of run.view.items.filter((item) => item.result))
        expect(item.effect.request.kind).toBe('interaction.form');
    }
    expect(groups).toBe(expectedGroups);
    expect(run.view.status).toBe('Completed');
  },
);
it('preserves grouped outcome fields and their table placeholders', () => {
  const source = parseLanguagePracticeFromBody(
    readFileSync(
      resolve(root, 'content/patterns/map-outcomes-likelihoods-and-preferences.md'),
      'utf8',
    ),
  ).source!;
  expect(source).toContain(':placeholder "Option | Outcome"');
  expect(source).toContain(':placeholder "Option | Outcome | Likelihood"');
  expect(source).toContain(':placeholder "Option | Outcome | Likelihood | Preference"');
});
