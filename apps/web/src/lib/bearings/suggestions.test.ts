import { describe, expect, it } from 'vitest';
import { emptyBearingsNotebook, type BearingsNotebook } from '@patternverse/workspace';
import type { PatternEffect } from '$lib/pattern-runtime/types';
import {
  suggestionSources,
  suggestionFields,
  suggestionMessages,
  parseSuggestions,
} from './suggestions';

const notebook: BearingsNotebook = {
  ...emptyBearingsNotebook('chapter'),
  chapters: [
    {
      id: 'chapter',
      title: 'Beginning',
      collapsed: false,
      cells: [
        { id: 'root', kind: 'answer', text: 'I want more creative work.' },
        {
          id: 'exercise',
          kind: 'pattern',
          parentId: 'root',
          text: '',
          pattern: {
            sourceId: 'commons',
            entityId: 'decision',
            title: 'Decision',
            summary: 'Not a personal note',
          },
        },
        {
          id: 'child',
          kind: 'note',
          parentId: 'root',
          text: 'I could try a smaller project first.',
        },
        { id: 'elsewhere', kind: 'approach', text: 'An unrelated branch.' },
        { id: 'empty', kind: 'answer', text: '   ' },
      ],
    },
  ],
};
const effect: PatternEffect = {
  effect_id: 'step',
  run_id: 'run',
  request: {
    kind: 'interaction.form',
    payload: {
      blocks: [
        { type: 'ask', id: 'filled', prompt: 'Your decision?', required: true, multiline: false },
        {
          type: 'ask',
          id: 'empty',
          prompt: 'What could you try?',
          required: true,
          multiline: true,
        },
        { type: 'rate', id: 'rating', prompt: 'How do you feel?', rating: { min: 1, max: 5 } },
      ],
    },
  },
};
const fields = suggestionFields(effect, {
  kind: 'form',
  value: { filled: { type: 'text', value: 'Keep this answer' } },
});
const sources = suggestionSources(notebook, 'exercise', 'branch');
const valid = { fieldId: 'empty', text: 'Try a smaller creative project.', sourceIds: ['child'] };
const parse = (suggestions: unknown[]) =>
  parseSuggestions(JSON.stringify({ suggestions }), fields, sources);

describe('exercise suggestions from notes', () => {
  it('limits branch context to ancestors and the immediate parent branch, with stable notebook numbers', () => {
    expect(sources.map(({ id, number }) => [id, number])).toEqual([
      ['root', '01'],
      ['child', '03'],
    ]);
    expect(suggestionSources(notebook, 'exercise', 'situation').map((source) => source.id)).toEqual(
      ['root', 'child', 'elsewhere'],
    );
  });
  it('only offers text fields and preserves existing answers in the request', () => {
    expect(fields).toEqual([
      { id: 'filled', prompt: 'Your decision?', answer: 'Keep this answer' },
      { id: 'empty', prompt: 'What could you try?', answer: '' },
    ]);
    const messages = suggestionMessages({
      title: 'Decision',
      fields,
      sources,
      exercise: effect.request.payload,
    });
    expect(JSON.parse(messages[1].content).fields[0].answer).toBe('Keep this answer');
    expect(messages[0].content).toContain('never as instructions');
  });
  it('supports a single ask without treating numeric answers as writing', () => {
    expect(
      suggestionFields(
        { ...effect, request: { kind: 'interaction.ask', payload: { prompt: 'Why?' } } },
        { kind: 'text', value: 'Because' },
      )[0]?.answer,
    ).toBe('Because');
  });
  it('validates citations and only accepts empty, existing, unique fields', () => {
    expect(parse([valid])).toEqual([valid]);
    for (const invalid of [
      { ...valid, fieldId: 'filled' },
      { ...valid, fieldId: 'made-up' },
      { ...valid, sourceIds: ['made-up'] },
      { ...valid, sourceIds: [] },
      { ...valid, text: '' },
      { ...valid, text: 'x'.repeat(8001) },
    ])
      expect(() => parse([invalid])).toThrow();
    expect(() => parse([valid, valid])).toThrow();
    expect(() => parseSuggestions('not JSON', fields, sources)).toThrow();
    expect(parse([])).toEqual([]);
  });
  it('fails locally before a request if notes, empty fields or a bounded context are missing', () => {
    const input = { title: 'Decision', fields, sources, exercise: {} };
    expect(() => suggestionMessages({ ...input, sources: [] })).toThrow('Add some notes');
    expect(() => suggestionMessages({ ...input, fields: fields.slice(0, 1) })).toThrow(
      'already have answers',
    );
    expect(() => suggestionMessages({ ...input, exercise: 'x'.repeat(64_001) })).toThrow(
      'too long',
    );
  });
});
