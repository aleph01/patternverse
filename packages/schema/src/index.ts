import { z } from 'zod';

export const SCHEMA_VERSION = 1 as const;
export const ENTITY_TYPES = ['pattern', 'concept', 'practice', 'collection', 'verse'] as const;
export const ENTITY_STATUSES = ['draft', 'published', 'deprecated'] as const;
export const PRACTICE_BLOCK_TYPES = ['markdown', 'text-input', 'timer'] as const;
export const MAX_TIMER_DURATION_SECONDS = 86_400 as const;

export const entityTypeSchema = z.enum(ENTITY_TYPES);
export const entityStatusSchema = z.enum(ENTITY_STATUSES);
export const usefulnessSchema = z.union([z.null(), z.literal(0), z.literal(1), z.literal(2)]);

export const entityIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'IDs must use lowercase-kebab-case.');

export const sourceManifestSchema = z
  .object({
    id: entityIdSchema,
    name: z.string().trim().min(1),
    schema_version: z.literal(SCHEMA_VERSION),
  })
  .strict();

/** @deprecated Use sourceManifestSchema. Kept as a compatibility alias for Milestone 0 consumers. */
export const sourceSchema = sourceManifestSchema;

export const patternverseSourceSchema = z
  .object({
    id: entityIdSchema,
    name: z.string().trim().min(1),
    readonly: z.boolean(),
  })
  .strict();

export const entityRefSchema = z
  .object({
    sourceId: entityIdSchema,
    entityId: entityIdSchema,
  })
  .strict();

export const copiedFromSchema = z
  .object({
    source: entityIdSchema,
    id: entityIdSchema,
  })
  .strict();

const commonMetadataShape = {
  id: entityIdSchema,
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1).optional(),
  status: entityStatusSchema,
  aliases: z.array(z.string().trim().min(1)).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  attribution: z.string().trim().min(1).optional(),
  copied_from: copiedFromSchema.optional(),
};

const verseMembershipShape = {
  verses: z.array(entityIdSchema).optional(),
};

export const patternMetadataSchema = z
  .object({
    ...commonMetadataShape,
    ...verseMembershipShape,
    type: z.literal('pattern'),
  })
  .strict();

export const conceptMetadataSchema = z
  .object({
    ...commonMetadataShape,
    ...verseMembershipShape,
    type: z.literal('concept'),
  })
  .strict();

export const practiceMetadataSchema = z
  .object({
    ...commonMetadataShape,
    ...verseMembershipShape,
    type: z.literal('practice'),
    implements: z.array(entityIdSchema).optional(),
    duration_minutes: z.number().int().positive().optional(),
  })
  .strict();

export const collectionMetadataSchema = z
  .object({
    ...commonMetadataShape,
    ...verseMembershipShape,
    type: z.literal('collection'),
    items: z.array(entityIdSchema),
  })
  .strict();

export const verseMetadataSchema = z
  .object({
    ...commonMetadataShape,
    type: z.literal('verse'),
  })
  .strict();

export const entityMetadataSchema = z.discriminatedUnion('type', [
  patternMetadataSchema,
  conceptMetadataSchema,
  practiceMetadataSchema,
  collectionMetadataSchema,
  verseMetadataSchema,
]);

const documentShape = {
  body: z.string(),
  sourceId: entityIdSchema,
  sourcePath: z.string().min(1).optional(),
};

export const rawPatternSchema = patternMetadataSchema.extend(documentShape).strict();
export const rawConceptSchema = conceptMetadataSchema.extend(documentShape).strict();
export const rawPracticeSchema = practiceMetadataSchema.extend(documentShape).strict();
export const rawCollectionSchema = collectionMetadataSchema.extend(documentShape).strict();
export const rawVerseSchema = verseMetadataSchema.extend(documentShape).strict();

export const rawEntitySchema = z.discriminatedUnion('type', [
  rawPatternSchema,
  rawConceptSchema,
  rawPracticeSchema,
  rawCollectionSchema,
  rawVerseSchema,
]);

export const markdownPracticeBlockSchema = z
  .object({
    id: entityIdSchema,
    type: z.literal('markdown'),
    content: z.string().trim().min(1),
  })
  .strict();

export const textInputPracticeBlockSchema = z
  .object({
    id: entityIdSchema,
    type: z.literal('text-input'),
    label: z.string().trim().min(1),
    placeholder: z.string().trim().min(1).optional(),
    multiline: z.boolean(),
    required: z.boolean(),
  })
  .strict();

export const timerPracticeBlockSchema = z
  .object({
    id: entityIdSchema,
    type: z.literal('timer'),
    label: z.string().trim().min(1).optional(),
    defaultDurationSeconds: z
      .number()
      .int('defaultDurationSeconds must be a positive integer.')
      .positive('defaultDurationSeconds must be a positive integer.')
      .max(MAX_TIMER_DURATION_SECONDS, 'defaultDurationSeconds must not exceed 24 hours.'),
    userAdjustable: z.boolean(),
    persistent: z.boolean().optional(),
  })
  .strict();

export const practiceBlockSchema = z.discriminatedUnion('type', [
  markdownPracticeBlockSchema,
  textInputPracticeBlockSchema,
  timerPracticeBlockSchema,
]);

export const practiceStepSchema = z
  .object({
    id: entityIdSchema,
    title: z.string().trim().min(1).optional(),
    blocks: z.array(practiceBlockSchema).min(1, 'A Practice step must contain at least one block.'),
  })
  .strict();

export const practiceDefinitionSchema = z
  .object({
    title: z.string().trim().min(1, 'Practice title is required.'),
    introduction: z.string().trim().min(1).optional(),
    steps: z.array(practiceStepSchema).min(1, 'A Practice must contain at least one step.'),
  })
  .strict()
  .superRefine((practice, context) => {
    const stepIds = practice.steps.map((step) => step.id);
    for (const id of new Set(stepIds.filter((value, index) => stepIds.indexOf(value) !== index))) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate Practice step ID: ${id}`,
        path: ['steps'],
      });
    }

    const blockIds = practice.steps.flatMap((step) => step.blocks.map((block) => block.id));
    for (const id of new Set(
      blockIds.filter((value, index) => blockIds.indexOf(value) !== index),
    )) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate Practice block ID: ${id}`,
        path: ['steps'],
      });
    }
  });

/** @deprecated Use practiceDefinitionSchema. */
export const structuredPracticeSchema = practiceDefinitionSchema;

export type EntityType = z.infer<typeof entityTypeSchema>;
export type EntityStatus = z.infer<typeof entityStatusSchema>;
export type Usefulness = z.infer<typeof usefulnessSchema>;
export type PatternverseSourceManifest = z.infer<typeof sourceManifestSchema>;
export type PatternverseSource = z.infer<typeof patternverseSourceSchema>;
export type EntityRef = z.infer<typeof entityRefSchema>;
/** Stable source-qualified identity shared by compilation, browsing and private user state. */
export const entityRefKey = (ref: EntityRef): string => `${ref.sourceId}:${ref.entityId}`;
export type CopiedFrom = z.infer<typeof copiedFromSchema>;
export type PatternEntity = z.infer<typeof patternMetadataSchema>;
export type ConceptEntity = z.infer<typeof conceptMetadataSchema>;
export type PracticeEntity = z.infer<typeof practiceMetadataSchema>;
export type CollectionEntity = z.infer<typeof collectionMetadataSchema>;
export type VerseEntity = z.infer<typeof verseMetadataSchema>;
export type Entity = z.infer<typeof entityMetadataSchema>;
export type RawPatternEntity = z.infer<typeof rawPatternSchema>;
export type RawConceptEntity = z.infer<typeof rawConceptSchema>;
export type RawPracticeEntity = z.infer<typeof rawPracticeSchema>;
export type RawCollectionEntity = z.infer<typeof rawCollectionSchema>;
export type RawVerseEntity = z.infer<typeof rawVerseSchema>;
export type RawEntity = z.infer<typeof rawEntitySchema>;
export type MarkdownPracticeBlock = z.infer<typeof markdownPracticeBlockSchema>;
export type TextInputPracticeBlock = z.infer<typeof textInputPracticeBlockSchema>;
export type TimerPracticeBlock = z.infer<typeof timerPracticeBlockSchema>;
export type PracticeBlock = z.infer<typeof practiceBlockSchema>;
export type PracticeStep = z.infer<typeof practiceStepSchema>;
export type PracticeDefinition = z.infer<typeof practiceDefinitionSchema>;
/** @deprecated Use PracticeDefinition. */
export type StructuredPractice = PracticeDefinition;
