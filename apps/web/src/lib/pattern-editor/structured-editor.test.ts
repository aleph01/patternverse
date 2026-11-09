// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { editor, initSync } from '$lib/mira/engine/pattern_wasm.js';
import PracticeBlockEditor from './PracticeBlockEditor.svelte';
import { endInsertion, newPaths, patchSource, responseOptions } from './blocks';
import { insertLocalBlock, replaceLocalCondition } from './structured-edits';
import { blockFieldsDraft, editBlockFields } from './edits';
import type { Inspection } from './types';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
afterEach(cleanup);
const inspect = (source: string): Inspection =>
  JSON.parse(editor(JSON.stringify({ operation: 'inspect', source })));
const source =
  ':language 1\n:title "Café 🙂"\nanswer = !choose {\n- yes: "Yes"\n- no: "No"\nContinue?\n}\n?match answer {\n:case yes {\nreflection = !form {\n:title "Reflect"\nnotes = !ask [optional] {\nYour notes?\n}\n}\n}\n:case no {\n!show {\nLeave it here.\n}\n}\n}\n-> end';

it('projects nested cases and form fields with exact UTF-8 ranges and permits local inserts', () => {
  const model = inspect(source).structure!;
  expect(model).toBeTruthy();
  const match = model.source_statements!.find((s) => s.kind === '?match')!;
  expect(match.children?.map((s) => s.argument?.value)).toEqual(['yes', 'no']);
  const form = match.children![0].children![0];
  expect(form.children![0].binding?.value).toBe('notes');
  const candidate = insertLocalBlock(source, match.children![1], 'ask');
  expect(inspect(candidate).structure).toBeTruthy();
  expect(candidate).toContain('response = !ask');
  expect(candidate).toContain('Café 🙂');
  expect(
    inspect(replaceLocalCondition(source, match.children![0], 'invented')).structure,
  ).toBeNull();
});

it('generates exhaustive local choices rather than label-and-jump paths', () => {
  const start = source.slice(0, source.indexOf('?match')) + '-> end';
  const model = inspect(start).structure!;
  const response = responseOptions(model, endInsertion(model)!.start)[0];
  const candidate = patchSource(start, [
    { span: endInsertion(model)!, replacement: newPaths(start, response) },
  ]);
  expect(candidate).toContain(':case "yes" {');
  expect(candidate).toContain(':case "no" {');
  expect(candidate).not.toMatch(/-> path_|after_paths:/);
  expect(inspect(candidate).structure).toBeTruthy();
});

it('edits requiredness through the new marker while preserving form wording and fields', async () => {
  const form =
    ':language 1\nreflection = !form {\n:title "Café 🙂"\nnotes = !ask {\n:placeholder "Your own words"\nWhat do you notice?\n}\n}\n-> end';
  const onchange = vi.fn();
  render(PracticeBlockEditor, {
    source: form,
    inspection: inspect(form),
    onchange,
    onreveal: vi.fn(),
    onpendingchange: vi.fn(),
  });
  await fireEvent.click(screen.getByLabelText('Answer is optional'));
  await fireEvent.click(screen.getByRole('button', { name: 'Apply changes', hidden: true }));
  await waitFor(() => expect(onchange).toHaveBeenCalledOnce());
  const candidate = onchange.mock.calls[0][0];
  expect(candidate).toContain('notes = !ask [optional]');
  expect(candidate).toContain(':placeholder "Your own words"');
  expect(candidate).toContain('What do you notice?');
  expect(inspect(candidate).structure).toBeTruthy();
});

it('shows nested local branches and preserves advanced source as editable source', () => {
  render(PracticeBlockEditor, {
    source,
    inspection: inspect(source),
    onchange: vi.fn(),
    onreveal: vi.fn(),
    onpendingchange: vi.fn(),
  });
  expect(screen.getByText('Paths based on answer')).toBeTruthy();
  expect(screen.getByText('When answer is yes')).toBeTruthy();
  expect(screen.getByText('When answer is no')).toBeTruthy();
  expect(screen.getByText('Reflect')).toBeTruthy();
});

it('keeps field metadata outside prompt edits when requiredness changes', () => {
  const source =
    ':language 1\nreflection = !form {\nnotes = !ask {\n\n:required false\n:multiline false\n:placeholder "Keep this hint"\n\nOriginal question?\n}\n}\n-> end';
  const field = inspect(source).structure!.source_statements![0].children![0];
  expect(field.body?.value).not.toContain(':placeholder');
  const original = blockFieldsDraft(field);
  const result = editBlockFields(source, field, original, {
    ...original,
    optional: false,
    prompt: 'Changed question?',
  });
  expect(result.error).toBeUndefined();
  expect(result.source).toContain(':placeholder "Keep this hint"');
  expect(result.source).toContain(':multiline false');
  expect(inspect(result.source!).structure).toBeTruthy();
});
