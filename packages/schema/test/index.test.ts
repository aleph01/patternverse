import { describe, expect, it } from 'vitest';

import {
  entityMetadataSchema,
  entityRefSchema,
  sourceManifestSchema,
  practiceDefinitionSchema,
  usefulnessSchema,
} from '../src/index.js';

describe('source and identity schemas', () => {
  it('accepts a version one corpus manifest and source-aware reference', () => {
    expect(
      sourceManifestSchema.parse({
        id: 'commons',
        name: 'Patternverse Commons',
        schema_version: 1,
      }),
    ).toEqual({ id: 'commons', name: 'Patternverse Commons', schema_version: 1 });
    expect(entityRefSchema.parse({ sourceId: 'commons', entityId: 'creative-reframing' })).toEqual({
      sourceId: 'commons',
      entityId: 'creative-reframing',
    });
  });

  it('rejects unknown manifest fields and unstable identifier casing', () => {
    expect(
      sourceManifestSchema.safeParse({
        id: 'Commons',
        name: 'Commons',
        schema_version: 1,
        owner: 'someone',
      }).success,
    ).toBe(false);
  });
});

describe('V1 entity union', () => {
  it.each([
    { id: 'one', type: 'pattern', title: 'One', status: 'published' },
    { id: 'two', type: 'concept', title: 'Two', status: 'draft' },
    {
      id: 'three',
      type: 'practice',
      title: 'Three',
      status: 'published',
      implements: ['one'],
      duration_minutes: 10,
    },
    {
      id: 'four',
      type: 'collection',
      title: 'Four',
      status: 'published',
      items: ['one', 'two'],
    },
    { id: 'five', type: 'verse', title: 'Five', status: 'deprecated' },
  ])('accepts $type metadata', (metadata) => {
    expect(entityMetadataSchema.safeParse(metadata).success).toBe(true);
  });

  it('rejects tags and Verse item lists as unsupported schema extensions', () => {
    expect(
      entityMetadataSchema.safeParse({
        id: 'one',
        type: 'pattern',
        title: 'One',
        status: 'published',
        tags: ['unofficial'],
      }).success,
    ).toBe(false);
    expect(
      entityMetadataSchema.safeParse({
        id: 'creativity',
        type: 'verse',
        title: 'Creativity',
        status: 'published',
        items: ['one'],
      }).success,
    ).toBe(false);
  });
});

describe('Practice definition schema', () => {
  const validPractice = () => ({
    title: 'A focused Practice',
    introduction: 'Begin with something manageable.',
    steps: [
      {
        id: 'prepare',
        title: 'Prepare',
        blocks: [
          { id: 'guidance', type: 'markdown', content: 'Pause for a moment.' },
          {
            id: 'response',
            type: 'text-input',
            label: 'What is happening?',
            multiline: true,
            required: true,
          },
          {
            id: 'timer',
            type: 'timer',
            defaultDurationSeconds: 600,
            userAdjustable: true,
          },
        ],
      },
    ],
  });

  it('accepts ordered Markdown, text-input, and timer blocks', () => {
    const result = practiceDefinitionSchema.parse(validPractice());
    expect(result.steps[0]?.blocks.map((block) => block.type)).toEqual([
      'markdown',
      'text-input',
      'timer',
    ]);
  });

  it.each([
    ['missing title', (practice: Record<string, unknown>) => delete practice.title],
    ['empty steps', (practice: Record<string, unknown>) => (practice.steps = [])],
    [
      'duplicate step IDs',
      (practice: Record<string, unknown>) => {
        const step = (practice.steps as Record<string, unknown>[])[0];
        practice.steps = [step, { ...step }];
      },
    ],
    [
      'duplicate block IDs',
      (practice: Record<string, unknown>) => {
        const steps = practice.steps as { blocks: Record<string, unknown>[] }[];
        steps[0]?.blocks.push({ id: 'guidance', type: 'markdown', content: 'Again.' });
      },
    ],
    [
      'invalid timer duration',
      (practice: Record<string, unknown>) => {
        const steps = practice.steps as { blocks: Record<string, unknown>[] }[];
        const timer = steps[0]?.blocks.find((block) => block.type === 'timer');
        if (timer) timer.defaultDurationSeconds = 0;
      },
    ],
    [
      'unknown fields',
      (practice: Record<string, unknown>) => {
        practice.score = true;
      },
    ],
  ])('rejects %s', (_name, mutate) => {
    const practice = validPractice() as unknown as Record<string, unknown>;
    mutate(practice);
    expect(practiceDefinitionSchema.safeParse(practice).success).toBe(false);
  });
});

describe('personal usefulness', () => {
  it.each([null, 0, 1, 2])('accepts %s', (value) => {
    expect(usefulnessSchema.safeParse(value).success).toBe(true);
  });

  it('rejects scores outside the private three-level scale', () => {
    expect(usefulnessSchema.safeParse(3).success).toBe(false);
  });
});
