import { z } from 'zod';
import { entityIdSchema, patternMetadataSchema } from '@patternverse/schema';

const text = z.string().trim().min(1);
const texts = z.array(text);
const ids = z.array(entityIdSchema);
const score = z.number().min(0).max(5);
export const scoresSchema = z
  .object({
    usefulness: score,
    reusability: score,
    distinctiveness: score,
    teachability: score,
    grounding: score,
    coverage: score,
  })
  .strict();
export const sourceSchema = z
  .object({
    id: entityIdSchema,
    url: z.url().refine((u) => /^https?:/.test(u), 'Use HTTP(S) sources'),
    title: text,
    publisher: text,
    accessed_at: z.iso.date(),
    findings: texts.min(1),
    limitations: text,
  })
  .strict();
const claimSchema = z.object({ claim: text, source_ids: ids.min(1), qualification: text }).strict();
export const researchSchema = z
  .object({
    scope: text,
    concepts: texts.min(1),
    problems: texts.min(1),
    techniques: texts.min(1),
    subdomains: texts.min(1),
    sources: z.array(sourceSchema).min(2),
    claims: z.array(claimSchema).min(1),
    gaps: texts,
  })
  .strict();
export const candidateSchema = z
  .object({
    id: entityIdSchema,
    title: text,
    problem: text,
    mechanism: text,
    subdomain: text,
    scores: scoresSchema,
    source_ids: ids.min(1),
    disposition: z.enum(['keep', 'merge', 'reject']),
    merge_into: entityIdSchema.nullable(),
    reason: text,
    existing_overlap: texts,
  })
  .strict();
export const discoverySchema = z
  .object({
    candidates: z.array(candidateSchema).min(1),
    gaps: texts,
    coverage_notes: text,
  })
  .strict();
export const relationSchema = z
  .object({
    from: entityIdSchema,
    to: entityIdSchema,
    kind: z.enum(['prerequisite', 'complement', 'alternative', 'related']),
    rationale: text,
  })
  .strict();
export const designSchema = z
  .object({
    title: text,
    rationale: text,
    selected: ids,
    count_rationale: text,
    groups: z.array(z.object({ id: entityIdSchema, title: text, items: ids.min(1) }).strict()),
    progression: ids,
    relationships: z.array(relationSchema),
    deferred: z.array(z.object({ id: entityIdSchema, reason: text }).strict()),
    gaps: texts,
    terminology: z.array(z.object({ term: text, meaning: text }).strict()),
  })
  .strict();
export const outlineSchema = z
  .object({
    thesis: text.max(800),
    mechanism: text.max(1200),
    sections: z
      .array(
        z
          .object({
            heading: text.max(100),
            purpose: text.max(600),
            examples: z.array(text.max(1000)).max(4),
          })
          .strict(),
      )
      .min(4)
      .max(8),
    limitations: texts.min(1),
    claim_source_ids: ids.min(1),
  })
  .strict();
export const articleSchema = z
  .object({ title: text, body: text, source_ids: ids.min(1), change_notes: texts })
  .strict();
export const reviewSchema = z
  .object({
    verdict: z.enum(['pass', 'revise', 'reject']),
    scores: scoresSchema,
    issues: z.array(
      z
        .object({
          severity: z.enum(['blocking', 'major', 'minor']),
          location: text,
          problem: text,
          remedy: text,
        })
        .strict(),
    ),
    strengths: texts,
    coverage_notes: text,
  })
  .strict();
export const factcheckSchema = z
  .object({
    verdict: z.enum(['pass', 'revise', 'reject']),
    claims: z
      .array(
        z
          .object({
            claim: text,
            status: z.enum(['supported', 'qualified', 'unsupported']),
            source_ids: ids,
            verification: text,
            correction: text.nullable(),
          })
          .strict(),
      )
      .min(1),
    sources: z.array(sourceSchema),
    limitations: texts,
  })
  .strict();
// Canonical metadata stays in @patternverse/schema. This sidecar follows docs/pattern-packages.
export const briefSchema = z
  .object({
    scope: text,
    audience: text,
    collection_goal: text.nullable(),
    candidate_seeds: z.array(z.object({ title: text, insight: text }).strict()),
    simulation_environments: z.array(z.enum(['control-thermostat', 'control-signals'])),
    notes: texts,
    background: text.nullable(),
  })
  .strict();
export const simulationSchema = z
  .object({
    environment_id: z.enum(['control-thermostat', 'control-signals']),
    learning_goal: text,
    setup: text,
    experiment: text,
    observe: text,
    limitations: text,
  })
  .strict();
export const enrichmentSchema = z
  .object({
    short_description: text,
    use_when: texts.min(2),
    goals: texts.min(1),
    mechanisms: texts.min(1),
    tags: texts.min(1),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    estimated_practice_time: text.nullable(),
    prerequisites: texts,
    not_ideal_when: texts.min(1),
    example_user_queries: texts.min(8).max(15),
    related_patterns: ids,
    practice: z
      .object({ title: text, duration_minutes: z.number().int().positive(), body: text })
      .strict()
      .nullable(),
    simulation: simulationSchema.nullable(),
    visual: z
      .object({
        type: z.enum([
          'none',
          'diagram',
          'comparison',
          'svg',
          'example-image',
          'interactive-simulation',
        ]),
        rationale: text,
        brief: text.nullable(),
      })
      .strict(),
  })
  .strict();
export const auditSchema = z
  .object({
    verdict: z.enum(['pass', 'revise', 'reject']),
    summary: text,
    findings: z.array(
      z
        .object({
          category: z.enum([
            'redundancy',
            'coverage',
            'accuracy',
            'organization',
            'terminology',
            'article-quality',
            'relationships',
            'visuals',
          ]),
          severity: z.enum(['blocking', 'major', 'minor']),
          pattern_ids: ids,
          evidence: text,
          improvement: text,
        })
        .strict(),
    ),
    priorities: texts,
    limitations: texts,
  })
  .strict();
export const stageSchemas = {
  'domain-research': researchSchema,
  discovery: discoverySchema,
  design: designSchema,
  'plan-review': reviewSchema,
  research: researchSchema,
  outline: outlineSchema,
  draft: articleSchema,
  critique: reviewSchema,
  factcheck: factcheckSchema,
  revision: articleSchema,
  enrichment: enrichmentSchema,
  audit: auditSchema,
};
export type Stage = keyof typeof stageSchemas;
export type Research = z.infer<typeof researchSchema>;
export type Discovery = z.infer<typeof discoverySchema>;
export type Design = z.infer<typeof designSchema>;
export type Article = z.infer<typeof articleSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type Factcheck = z.infer<typeof factcheckSchema>;
export type Enrichment = z.infer<typeof enrichmentSchema>;

export const configSchema = z
  .object({
    model: text.nullable().default(null),
    reasoning_effort: z.enum(['low', 'medium', 'high', 'xhigh']).default('high'),
    stage_models: z
      .record(z.string(), text)
      .refine(
        (models) => Object.keys(models).every((stage) => stage in stageSchemas),
        'Unknown stage in stage_models',
      )
      .default({}),
    min_candidate_score: score.default(3.5),
    min_review_score: score.default(4),
    candidate_multiplier: z.number().int().min(2).max(10).default(3),
    min_article_words: z.number().int().min(100).default(800),
    max_article_words: z.number().int().min(100).default(1600),
    max_revisions: z.number().int().min(1).max(5).default(2),
    max_attempts: z.number().int().min(1).max(5).default(2),
    max_calls: z.number().int().positive().default(100),
    max_tasks_per_run: z.number().int().positive().default(10),
    unreported_token_reserve: z.number().int().positive().default(50000),
    max_tokens: z.number().int().positive().default(1000000),
    max_seconds: z.number().int().positive().default(7200),
    task_timeout_seconds: z.number().int().positive().default(600),
    max_output_bytes: z.number().int().positive().default(2000000),
    max_context_bytes: z.number().int().positive().default(500000),
    web_search: z.boolean().default(true),
  })
  .strict()
  .refine((c) => c.max_article_words >= c.min_article_words, 'Invalid article word range');
export type Config = z.infer<typeof configSchema>;
export const taskSchema = z
  .object({
    id: text,
    stage: z.enum(Object.keys(stageSchemas) as [Stage, ...Stage[]]),
    pattern: entityIdSchema.nullable(),
    revision: z.number().int().nonnegative(),
    status: z.enum(['pending', 'running', 'succeeded', 'failed', 'blocked']),
    attempts: z.number().int().nonnegative(),
    artifact: text.nullable(),
    sha256: text.nullable(),
    error: text.nullable(),
  })
  .strict();
export type Task = z.infer<typeof taskSchema>;
export const stateSchema = z
  .object({
    version: z.literal(1),
    id: entityIdSchema,
    domain: text,
    target: z.number().int().positive().max(200),
    mode: z.enum(['mock', 'codex']),
    repo: text,
    created_at: z.iso.datetime(),
    config: configSchema,
    status: z.enum(['ready', 'running', 'paused', 'needs-attention', 'complete']),
    reason: text.nullable(),
    budget: z
      .object({
        calls: z.number().int().nonnegative(),
        tokens: z.number().int().nonnegative(),
        seconds: z.number().nonnegative(),
      })
      .strict(),
    tasks: z.array(taskSchema),
    accepted: z.array(z.object({ id: entityIdSchema, directory: text, sha256: text }).strict()),
  })
  .strict();
export type State = z.infer<typeof stateSchema>;
export const canonicalPattern = (
  id: string,
  title: string,
  domain: string,
  enrichment: Enrichment,
) =>
  patternMetadataSchema.parse({
    id,
    type: 'pattern',
    title,
    status: 'draft',
    summary: enrichment.short_description,
    tags: enrichment.tags,
    verses: [domain],
  });
