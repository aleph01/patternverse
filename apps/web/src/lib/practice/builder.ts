import type { PracticeBlock, PracticeDefinition, PracticeStep } from '@patternverse/schema';

type IdFactory = (sourceId: string) => string;
type BlockUpdate = (block: PracticeBlock) => PracticeBlock;

const move = <T>(values: readonly T[], fromIndex: number, toIndex: number): T[] => {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= values.length ||
    toIndex >= values.length ||
    fromIndex === toIndex
  ) {
    return [...values];
  }
  const next = [...values];
  const [value] = next.splice(fromIndex, 1);
  if (value === undefined) return [...values];
  next.splice(toIndex, 0, value);
  return next;
};

const updateStep = (
  definition: PracticeDefinition,
  stepId: string,
  update: (step: PracticeStep) => PracticeStep,
): PracticeDefinition => ({
  ...definition,
  steps: definition.steps.map((step) => (step.id === stepId ? update(step) : step)),
});

export const addStep = (
  definition: PracticeDefinition,
  step: PracticeStep,
): PracticeDefinition => ({ ...definition, steps: [...definition.steps, step] });

export const removeStep = (definition: PracticeDefinition, stepId: string): PracticeDefinition => ({
  ...definition,
  steps: definition.steps.filter((step) => step.id !== stepId),
});

export const moveStep = (
  definition: PracticeDefinition,
  fromIndex: number,
  toIndex: number,
): PracticeDefinition => ({ ...definition, steps: move(definition.steps, fromIndex, toIndex) });

export const duplicateStep = (
  definition: PracticeDefinition,
  stepId: string,
  createId: IdFactory,
): PracticeDefinition => {
  const index = definition.steps.findIndex((step) => step.id === stepId);
  const source = definition.steps[index];
  if (!source) return definition;
  const duplicate: PracticeStep = {
    ...source,
    id: createId(source.id),
    blocks: source.blocks.map((block) => ({ ...block, id: createId(block.id) })),
  };
  return {
    ...definition,
    steps: [
      ...definition.steps.slice(0, index + 1),
      duplicate,
      ...definition.steps.slice(index + 1),
    ],
  };
};

export const addBlock = (
  definition: PracticeDefinition,
  stepId: string,
  block: PracticeBlock,
): PracticeDefinition =>
  updateStep(definition, stepId, (step) => ({ ...step, blocks: [...step.blocks, block] }));

export const removeBlock = (
  definition: PracticeDefinition,
  stepId: string,
  blockId: string,
): PracticeDefinition =>
  updateStep(definition, stepId, (step) => ({
    ...step,
    blocks: step.blocks.filter((block) => block.id !== blockId),
  }));

export const moveBlock = (
  definition: PracticeDefinition,
  stepId: string,
  fromIndex: number,
  toIndex: number,
): PracticeDefinition =>
  updateStep(definition, stepId, (step) => ({
    ...step,
    blocks: move(step.blocks, fromIndex, toIndex),
  }));

export const duplicateBlock = (
  definition: PracticeDefinition,
  stepId: string,
  blockId: string,
  createId: IdFactory,
): PracticeDefinition =>
  updateStep(definition, stepId, (step) => {
    const index = step.blocks.findIndex((block) => block.id === blockId);
    const source = step.blocks[index];
    if (!source) return step;
    return {
      ...step,
      blocks: [
        ...step.blocks.slice(0, index + 1),
        { ...source, id: createId(source.id) },
        ...step.blocks.slice(index + 1),
      ],
    };
  });

export const updateBlock = (
  definition: PracticeDefinition,
  stepId: string,
  blockId: string,
  update: BlockUpdate,
): PracticeDefinition =>
  updateStep(definition, stepId, (step) => ({
    ...step,
    blocks: step.blocks.map((block) => (block.id === blockId ? update(block) : block)),
  }));
