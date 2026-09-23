import { describe, expect, it } from 'vitest';
import {
  editorValuesFromEntity,
  emptyEditorValues,
  slugFromTitle,
  validateEditorValues,
} from './editor';

describe('browser editor model', () => {
  it('creates valid Drafts by default and reports structured validation errors', () => {
    const values = emptyEditorValues();
    values.id = 'reduce-friction';
    values.title = 'Reduce Friction';
    values.body = 'Make the first step smaller.';

    const valid = validateEditorValues(values);
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.entity.status).toBe('draft');
      expect(valid.entity.sourceId).toBe('personal');
    }

    values.id = 'Not valid';
    const invalid = validateEditorValues(values);
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.errors.join(' ')).toContain('lowercase-kebab-case');
  });

  it('preserves ordered Collection items through the editor model', () => {
    const values = emptyEditorValues();
    values.id = 'my-sequence';
    values.type = 'collection';
    values.title = 'My Sequence';
    values.items = ['start-small', 'check-progress', 'adjust-course'];

    const result = validateEditorValues(values);
    expect(result.success).toBe(true);
    if (!result.success || result.entity.type !== 'collection') return;
    expect(result.entity.items).toEqual(['start-small', 'check-progress', 'adjust-course']);
    expect(editorValuesFromEntity(result.entity).items).toEqual(values.items);
  });

  it('derives stable kebab-case IDs from titles', () => {
    expect(slugFromTitle('Five Alternative Frames')).toBe('five-alternative-frames');
    expect(slugFromTitle('Über clarity & pace')).toBe('uber-clarity-pace');
  });

  it('stores a visual Practice as portable fenced YAML and restores the builder model', () => {
    const values = emptyEditorValues();
    values.id = 'small-step';
    values.title = 'Small Step';
    values.body = 'Keep this article unchanged.';
    values.practice = {
      title: 'Small Step Practice',
      steps: [
        {
          id: 'try-it',
          blocks: [{ id: 'try-it-copy', type: 'markdown', content: 'Try it.' }],
        },
      ],
    };

    const result = validateEditorValues(values);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.entity.body).toContain('```patternverse-practice');
    expect(result.entity.body).toContain('title: Small Step Practice');

    const restored = editorValuesFromEntity(result.entity);
    expect(restored.body).toBe(values.body);
    expect(restored.practice).toEqual(values.practice);
  });

  it('blocks saving an invalid visual Practice without discarding its article', () => {
    const values = emptyEditorValues();
    values.id = 'invalid-practice';
    values.title = 'Invalid Practice';
    values.body = 'Still here.';
    values.practice = { title: '', steps: [] };

    const result = validateEditorValues(values);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.join(' ')).toContain('Practice title is required');
    expect(values.body).toBe('Still here.');
  });
});
