import type { PracticeDefinition } from '@patternverse/schema';
import { describe, expect, it } from 'vitest';
import {
  parsePracticeFromBody,
  serializePracticeDefinition,
  upsertPracticeFence,
} from '../src/index.js';

const practice: PracticeDefinition = {
  title: 'Small Practice',
  introduction: 'Try one small thing.',
  steps: [
    {
      id: 'notice',
      blocks: [
        { id: 'notice-copy', type: 'markdown', content: 'Notice **this**.' },
        {
          id: 'notice-response',
          type: 'text-input',
          label: 'What did you notice?',
          multiline: true,
          required: false,
        },
        {
          id: 'notice-timer',
          type: 'timer',
          defaultDurationSeconds: 120,
          userAdjustable: true,
        },
      ],
    },
  ],
};

describe('Practice Markdown serialization', () => {
  it('round-trips the same PracticeDefinition through fenced YAML', () => {
    const body = upsertPracticeFence('Article before.\n\nArticle after.', practice);
    const parsed = parsePracticeFromBody(body);

    expect(parsed.errors).toEqual([]);
    expect(parsed.practice).toEqual(practice);
    expect(parsed.articleBody).toBe('Article before.\n\nArticle after.');
  });

  it('updates only the fenced block and preserves ordinary article Markdown exactly', () => {
    const originalArticle = '# Heading\n\n\nText with  two spaces.\n\n- one\n- two';
    const initial = upsertPracticeFence(originalArticle, practice);
    const updatedPractice = { ...practice, title: 'Changed Practice' };
    const updated = upsertPracticeFence(initial, updatedPractice);

    expect(parsePracticeFromBody(updated).articleBody).toBe(originalArticle);
    expect(parsePracticeFromBody(updated).practice).toEqual(updatedPractice);
    expect(updated.match(/```patternverse-practice/g)).toHaveLength(1);
  });

  it('serializes readable YAML and can remove the Practice without damaging the article', () => {
    const fenced = upsertPracticeFence('Keep this article.', practice);
    expect(serializePracticeDefinition(practice)).toContain('defaultDurationSeconds: 120');
    expect(upsertPracticeFence(fenced, undefined)).toBe('Keep this article.');
  });
});
