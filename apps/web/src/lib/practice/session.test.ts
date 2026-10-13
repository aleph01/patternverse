// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PracticeDefinition } from '@patternverse/schema';
import { legacyPracticeSource, upsertPracticeFence } from '@patternverse/compiler/practice';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import { editorValuesFromEntity, validateEditorValues } from '$lib/editor';
import type { StandaloneRun } from '$lib/mira/guided';
import { formBlocks } from '$lib/pattern-run/form';

const fence = String.fromCharCode(96).repeat(3);
const practice: PracticeDefinition = {
  title: 'A legacy practice',
  introduction: 'Keep {{literal}}.\n!ask is prose here.',
  steps: [
    {
      id: 'first',
      title: 'Reflect',
      blocks: [
        {
          id: 'answer',
          type: 'text-input',
          label: 'Your answer?',
          placeholder: 'Keep this placeholder',
          multiline: true,
          required: true,
        },
        {
          id: 'optional',
          type: 'text-input',
          label: 'Anything else?',
          multiline: false,
          required: false,
        },
      ],
    },
    {
      id: 'second',
      title: 'A pause',
      blocks: [
        {
          id: 'timer',
          type: 'timer',
          label: 'A background pause',
          defaultDurationSeconds: 60,
          userAdjustable: true,
          persistent: true,
        },
        {
          id: '123',
          type: 'text-input',
          label: 'After the pause?',
          multiline: true,
          required: false,
        },
      ],
    },
  ],
};
beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
const execute = (value: Record<string, unknown>): StandaloneRun =>
  JSON.parse(editor(JSON.stringify(value)));

describe('legacy import compatibility, not a second execution engine', () => {
  it('preserves grouped questions, flags, placeholders, literal prose and persistent timers', () => {
    const source = legacyPracticeSource(practice);
    const run = execute({ operation: 'start', source, root_id: 'legacy-import', inputs: {} });
    const effect = run.view.pending!;
    expect(effect.request.kind).toBe('interaction.form');
    const blocks = formBlocks(effect);
    expect(blocks).toContainEqual({ type: 'show', content: practice.introduction });
    expect(blocks).toContainEqual({
      type: 'ask',
      id: 'answer',
      prompt: 'Your answer?',
      required: true,
      multiline: true,
      placeholder: 'Keep this placeholder',
    });
    expect(blocks).toContainEqual({
      type: 'ask',
      id: 'optional',
      prompt: 'Anything else?',
      required: false,
      multiline: false,
      placeholder: null,
    });
    const timer = blocks.find((block) => block.type === 'timer');
    expect(timer).toMatchObject({
      id: 'timer',
      persistent: true,
      timer: {
        duration_seconds: 60,
        adjustable: true,
        min_seconds: 1,
        max_seconds: 86400,
        blocking: false,
      },
    });
    const value = {
      answer: { type: 'text', value: 'Keep me' },
      optional: { type: 'text', value: '' },
      timer: {
        type: 'record',
        value: {
          duration_seconds: { type: 'number', value: 60 },
          elapsed_seconds: { type: 'number', value: 0 },
          completed: { type: 'boolean', value: false },
        },
      },
    };
    const command = {
      run_id: effect.run_id,
      event: { Fulfill: { effect_id: effect.effect_id, result: { kind: 'form', value } } },
    };
    const next = execute({ operation: 'apply', saved: run.saved, expected_revision: 0, command });
    expect(next.view.pending?.request.kind).toBe('interaction.form');
    expect(formBlocks(next.view.pending!)).toContainEqual({
      type: 'ask',
      id: 'field_123',
      prompt: 'After the pause?',
      required: false,
      multiline: true,
      placeholder: null,
    });
    expect(JSON.stringify(next.view.items)).toContain('Keep me');
  });
  it('converts a personal draft without mutating the original, then writes only language source', () => {
    const entity = {
      id: 'my-practice',
      type: 'pattern' as const,
      title: 'My practice',
      status: 'draft' as const,
      sourceId: 'personal',
      body: upsertPracticeFence('An unchanged article.', practice),
    };
    const original = entity.body;
    const values = editorValuesFromEntity(entity);
    expect(entity.body).toBe(original);
    expect(values.practice).toBeUndefined();
    expect(values.body).toBe('An unchanged article.');
    expect(values.languagePracticeSource).toBe(legacyPracticeSource(practice));
    const saved = validateEditorValues(values);
    expect(saved.success).toBe(true);
    if (saved.success) {
      expect(saved.entity.body).toContain(fence + 'patternverse-language');
      expect(saved.entity.body).not.toContain(fence + 'patternverse-practice');
      expect(editorValuesFromEntity(saved.entity).languagePracticeSource).toBe(
        values.languagePracticeSource?.trimEnd(),
      );
    }
  });
  it('keeps malformed or ambiguous personal source intact and blocks saving it', () => {
    const body = 'Article.\n\n' + fence + 'patternverse-practice\nnot: a practice\n' + fence;
    const entity = {
      id: 'broken',
      type: 'pattern' as const,
      title: 'Broken',
      status: 'draft' as const,
      sourceId: 'personal',
      body,
    };
    const values = editorValuesFromEntity(entity);
    expect(values.body).toBe(body);
    expect(validateEditorValues(values).success).toBe(false);
    const ambiguous =
      upsertPracticeFence('Article.', practice) +
      '\n\n' +
      fence +
      'patternverse-language\n:language 1\n-> end\n' +
      fence;
    const conflict = editorValuesFromEntity({ ...entity, body: ambiguous });
    expect(conflict.body).toBe(ambiguous);
    expect(validateEditorValues(conflict).success).toBe(false);
  });
});
