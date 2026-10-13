import { describe, expect, it } from 'vitest';
import {
  editorValuesFromEntity,
  emptyEditorValues,
  slugFromTitle,
  validateEditorValues,
} from './editor';
import { getEditorEntityType, isEditorEntityType } from './editor/entityTypes';

describe('browser editor model', () => {
  it.each(['concept', 'practice'] as const)(
    'preserves existing %s records without offering their type for creation',
    (type) => {
      expect(isEditorEntityType(type)).toBe(false);
      expect(getEditorEntityType(type).label).toBe(type);
      const existing = {
        id: `existing-${type}`,
        type,
        sourceId: 'personal',
        status: 'draft' as const,
        title: `Existing ${type}`,
        body: 'Keep this article.',
      };
      const result = validateEditorValues(editorValuesFromEntity(existing));
      expect(result.success).toBe(true);
      if (result.success) expect(result.entity).toEqual(existing);
    },
  );

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

  it('imports legacy structured practices but only writes Pattern Language', () => {
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
    expect(result.entity.body).toContain('```patternverse-language');
    expect(result.entity.body).not.toContain('```patternverse-practice');
    expect(result.entity.body).toContain(':title "Small Step Practice"');

    const restored = editorValuesFromEntity(result.entity);
    expect(restored.body).toBe(values.body);
    expect(restored.practice).toBeUndefined();
    expect(restored.languagePracticeSource).toContain('!form');
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

  it('round trips language source without mixing it into the article or legacy practice', () => {
    const values = emptyEditorValues();
    Object.assign(values, {
      id: 'source-practice',
      title: 'Source Practice',
      body: 'An unchanged article.',
      languagePracticeSource: ':language 1\n!show {\n```js\nexample\n```\n}\n-> end',
    });
    const result = validateEditorValues(values);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.entity.body).toContain('````patternverse-language');
    const restored = editorValuesFromEntity(result.entity);
    expect(restored.languagePracticeSource).toBe(values.languagePracticeSource);
    expect(restored.body).toBe(values.body);
    expect(restored.practice).toBeUndefined();
    values.practice = { title: 'Old practice', steps: [] };
    expect(validateEditorValues(values).success).toBe(false);
    values.practice = undefined;
    values.type = 'collection';
    expect(validateEditorValues(values).success).toBe(false);
  });
});
