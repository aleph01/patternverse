import type { PracticeDefinition } from '@patternverse/schema';
import { describe, expect, it } from 'vitest';
import {
  addBlock,
  addStep,
  duplicateBlock,
  duplicateStep,
  moveBlock,
  moveStep,
  removeBlock,
  removeStep,
  updateBlock,
} from './builder';

const definition = (): PracticeDefinition => ({
  title: 'A Practice',
  steps: [
    {
      id: 'first-step',
      title: 'First',
      blocks: [{ id: 'first-copy', type: 'markdown', content: 'First copy.' }],
    },
    {
      id: 'second-step',
      title: 'Second',
      blocks: [
        {
          id: 'second-response',
          type: 'text-input',
          label: 'Response',
          multiline: true,
          required: false,
        },
      ],
    },
  ],
});

describe('Practice builder transformations', () => {
  it('adds, removes, and reorders steps without mutating its input', () => {
    const original = definition();
    const added = addStep(original, {
      id: 'third-step',
      blocks: [{ id: 'third-copy', type: 'markdown', content: 'Third.' }],
    });
    const moved = moveStep(added, 2, 0);
    const removed = removeStep(moved, 'second-step');

    expect(added.steps.map((step) => step.id)).toEqual(['first-step', 'second-step', 'third-step']);
    expect(moved.steps.map((step) => step.id)).toEqual(['third-step', 'first-step', 'second-step']);
    expect(removed.steps.map((step) => step.id)).toEqual(['third-step', 'first-step']);
    expect(original).toEqual(definition());
  });

  it('duplicates a step and regenerates both the step and block IDs', () => {
    const duplicated = duplicateStep(definition(), 'first-step', (id) => `copy-${id}`);
    expect(duplicated.steps[1]).toEqual({
      id: 'copy-first-step',
      title: 'First',
      blocks: [{ id: 'copy-first-copy', type: 'markdown', content: 'First copy.' }],
    });
  });

  it('adds, removes, reorders, duplicates, and updates blocks immutably', () => {
    const original = definition();
    const added = addBlock(original, 'first-step', {
      id: 'first-timer',
      type: 'timer',
      defaultDurationSeconds: 300,
      userAdjustable: true,
    });
    const moved = moveBlock(added, 'first-step', 1, 0);
    const duplicated = duplicateBlock(moved, 'first-step', 'first-timer', (id) => `copy-${id}`);
    const updated = updateBlock(duplicated, 'first-step', 'copy-first-timer', (block) =>
      block.type === 'timer' ? { ...block, defaultDurationSeconds: 600 } : block,
    );
    const removed = removeBlock(updated, 'first-step', 'first-copy');

    expect(removed.steps[0]?.blocks).toEqual([
      {
        id: 'first-timer',
        type: 'timer',
        defaultDurationSeconds: 300,
        userAdjustable: true,
      },
      {
        id: 'copy-first-timer',
        type: 'timer',
        defaultDurationSeconds: 600,
        userAdjustable: true,
      },
    ]);
    expect(original).toEqual(definition());
  });
});
