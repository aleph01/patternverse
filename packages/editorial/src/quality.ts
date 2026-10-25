import { parseMarkdownEntity, compileCorpus, type ParsedEntity } from '@patternverse/compiler';
import {
  researchSchema,
  discoverySchema,
  designSchema,
  articleSchema,
  reviewSchema,
  factcheckSchema,
  enrichmentSchema,
  type Config,
  type Design,
  type Stage,
  type Review,
  type Factcheck,
} from './contracts.js';

export type CatalogEntry = {
  id: string;
  title: string;
  summary: string;
  type: string;
  tags: string[];
  verses: string[];
};
export const unique = (values: readonly string[], label: string) => {
  if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
};
export const known = (values: readonly string[], allowed: readonly string[], label: string) => {
  for (const value of values)
    if (!allowed.includes(value)) throw new Error(`Unknown ${label}: ${value}`);
};
export const mean = (scores: Record<string, number>) =>
  Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
export const reviewPasses = (review: Review, config: Config) =>
  review.verdict === 'pass' &&
  Object.values(review.scores).every((s) => s >= config.min_review_score) &&
  !review.issues.some((i) => i.severity !== 'minor');
export const factsPass = (facts: Factcheck) =>
  facts.verdict === 'pass' &&
  facts.claims.every(
    (c) => c.status !== 'unsupported' && c.source_ids.length > 0 && c.correction === null,
  );
export function validateResearch(value: unknown) {
  const r = researchSchema.parse(value);
  unique(
    r.sources.map((s) => s.id),
    'source IDs',
  );
  unique(
    r.sources.map((s) => s.url),
    'source URLs',
  );
  for (const s of r.sources)
    if (s.accessed_at > new Date().toISOString().slice(0, 10))
      throw new Error('Future source access date');
  for (const claim of r.claims)
    known(
      claim.source_ids,
      r.sources.map((s) => s.id),
      'source',
    );
}
export function validateDesign(
  value: unknown,
  discovery: unknown,
  catalog: CatalogEntry[],
  target: number,
  config: Config,
) {
  const d = designSchema.parse(value),
    pool = discoverySchema.parse(discovery).candidates;
  if (!d.selected.length || d.selected.length > Math.ceil(target * 1.2))
    throw new Error('Select 1 to approximately target patterns; explain any shortfall');
  unique(d.selected, 'selection');
  unique(
    d.groups.map((g) => g.id),
    'taxonomy groups',
  );
  unique(d.progression, 'progression');
  known(d.progression, d.selected, 'progression item');
  if (d.progression.length !== d.selected.length)
    throw new Error('Progression must include every selected pattern');
  for (const id of d.selected) {
    const candidate = pool.find((c) => c.id === id);
    if (
      !candidate ||
      candidate.disposition !== 'keep' ||
      mean(candidate.scores) < config.min_candidate_score ||
      candidate.scores.grounding < config.min_candidate_score ||
      candidate.scores.distinctiveness < config.min_candidate_score
    )
      throw new Error(`Weak or unknown selection: ${id}`);
    if (catalog.some((e) => e.id === id)) throw new Error(`Existing entity ID is protected: ${id}`);
  }
  const grouped = d.groups.flatMap((g) => g.items);
  known(grouped, d.selected, 'group member');
  if (d.selected.some((id) => !grouped.includes(id)))
    throw new Error('Taxonomy misses a selected pattern');
  for (const relation of d.relationships) {
    known([relation.from], d.selected, 'relationship origin');
    known(
      [relation.to],
      [...d.selected, ...catalog.filter((e) => e.type === 'pattern').map((e) => e.id)],
      'relationship target',
    );
    if (relation.from === relation.to) throw new Error('Self relationship');
  }
  unique(
    d.relationships.map((r) => `${r.from}:${r.kind}:${r.to}`),
    'relationships',
  );
  const visit = (id: string, path: string[]) => {
    if (path.includes(id)) throw new Error('Prerequisite cycle');
    for (const r of d.relationships.filter((r) => r.from === id && r.kind === 'prerequisite'))
      visit(r.to, [...path, id]);
  };
  d.selected.forEach((id) => visit(id, []));
  for (const r of d.relationships.filter(
    (r) => r.kind === 'prerequisite' && d.selected.includes(r.to),
  )) {
    if (d.progression.indexOf(r.to) > d.progression.indexOf(r.from))
      throw new Error('Prerequisite must precede dependent pattern');
  }
  known(
    d.deferred.map((x) => x.id),
    pool.map((x) => x.id),
    'deferred candidate',
  );
}
export function validateStage(
  stage: Stage,
  value: unknown,
  context: Record<string, unknown>,
  config: Config,
) {
  const sourceIds = context.source_ids as string[];
  if (stage === 'domain-research' || stage === 'research') validateResearch(value);
  if (stage === 'domain-research' || stage === 'research' || stage === 'factcheck') {
    const sources = (value as { sources: { id: string; url: string; accessed_at: string }[] })
      .sources;
    const previous = (context.sources ?? []) as { id: string; url: string }[];
    unique(
      sources.map((s) => s.id),
      'source IDs',
    );
    unique(
      sources.map((s) => s.url),
      'source URLs',
    );
    for (const source of sources) {
      if (source.accessed_at > new Date().toISOString().slice(0, 10))
        throw new Error('Future source access date');
      if (previous.some((s) => s.id === source.id && s.url !== source.url))
        throw new Error(`Source ID collision: ${source.id}`);
    }
  }

  if (stage === 'discovery') {
    const d = discoverySchema.parse(value);
    unique(
      d.candidates.map((c) => c.id),
      'candidates',
    );
    const desired = Number(context.target) * config.candidate_multiplier;
    if (d.candidates.length < desired)
      throw new Error(`Candidate pool needs at least ${desired} candidates`);
    for (const c of d.candidates) {
      known(c.source_ids, sourceIds, 'candidate source');
      if (c.disposition === 'merge') {
        const target = d.candidates.find((t) => t.id === c.merge_into);
        if (!target || target.id === c.id || target.disposition !== 'keep')
          throw new Error('Merge must name a kept candidate');
      } else if (c.merge_into !== null) throw new Error('Only merged candidates have merge_into');
    }
  }
  if (stage === 'design') {
    const design = designSchema.parse(value);
    const reserved = [
      ...(context.catalog as CatalogEntry[]).map((e) => e.id),
      ...design.selected,
      String(context.collection_id),
    ];
    if (design.groups.some((g) => reserved.includes(g.id)))
      throw new Error('Taxonomy group ID collision');
    if (design.selected.includes(String(context.collection_id)))
      throw new Error('Pattern and root collection ID collision');
    validateDesign(
      value,
      context.discovery,
      context.catalog as CatalogEntry[],
      Number(context.target),
      config,
    );
  }
  if (stage === 'draft' || stage === 'revision') {
    const article = articleSchema.parse(value);
    const count = article.body.split(/\s+/).length;
    if (count < config.min_article_words || count > config.max_article_words)
      throw new Error(`Article word count ${count} outside configured range`);
    if (
      /unlock your potential|by incorporating this technique into your life|in today.s fast.paced world/i.test(
        article.body,
      )
    )
      throw new Error('Generic filler detected');
    if (/```patternverse-widget/.test(article.body))
      throw new Error('Interactive widgets are added only through approved enrichment assets');
    if (/```patternverse-(?:language|practice)/.test(article.body))
      throw new Error('Keep practices separate from articles');
    if (/!\[[^\]]*\]\((?!https?:)/.test(article.body))
      throw new Error(
        'Local images require a separately supplied and verified asset; use a visual brief',
      );
    known(article.source_ids, sourceIds, 'article source');
  }
  if (stage === 'outline')
    known((value as { claim_source_ids: string[] }).claim_source_ids, sourceIds, 'outline source');
  if (stage === 'factcheck') {
    const f = factcheckSchema.parse(value);
    const allowed = [...sourceIds, ...f.sources.map((s) => s.id)];
    for (const c of f.claims) {
      known(c.source_ids, allowed, 'fact-check source');
      if (c.status !== 'unsupported' && !c.source_ids.length)
        throw new Error('Supported claims need a source');
    }
  }
  if (stage === 'enrichment') {
    const e = enrichmentSchema.parse(value);
    unique(
      e.example_user_queries.map((q) => q.toLowerCase()),
      'recommendation queries',
    );
    if (e.simulation) {
      const allowed =
        (context.editorial_brief as { simulation_environments: string[] } | undefined)
          ?.simulation_environments ?? [];
      known([e.simulation.environment_id], allowed, 'approved simulation');
    }
    if (e.visual.type === 'interactive-simulation' && !e.simulation)
      throw new Error('Interactive visual requires a simulation specification');
    const d = designSchema.parse(context.design);
    known(
      e.related_patterns,
      [
        ...d.selected,
        ...(context.catalog as CatalogEntry[]).filter((c) => c.type === 'pattern').map((c) => c.id),
      ],
      'related pattern',
    );
    if (e.related_patterns.includes(String(context.pattern)))
      throw new Error('Self related pattern');
    if (e.visual.type !== 'none' && !e.visual.brief)
      throw new Error('Visual choice needs an actionable brief');
  }
  if (stage === 'critique' || stage === 'plan-review') reviewSchema.parse(value);
}
export function parsed(markdown: string, sourceId: string, sourcePath: string): ParsedEntity {
  const result = parseMarkdownEntity(markdown, {
    sourceId,
    sourcePath,
    unknownFieldPolicy: 'error',
  });
  if (!result.entity || result.diagnostics.some((d) => d.severity === 'error'))
    throw new Error(`Content schema: ${JSON.stringify(result.diagnostics)}`);
  return result.entity;
}
export function compileCheck(entities: ParsedEntity[]) {
  const sources = [...new Set(entities.map((e) => e.sourceId))].map((id) => ({
    id,
    name: id,
    readonly: true,
  }));
  const compiled = compileCorpus(entities, sources);
  if (
    compiled.diagnostics.some((d) => d.severity === 'error') ||
    compiled.unresolvedReferences.length
  )
    throw new Error(`Collection compiler errors: ${JSON.stringify(compiled.diagnostics)}`);
  return compiled;
}
export function relationshipText(design: Design, id: string) {
  return design.relationships
    .filter((r) => r.from === id)
    .map((r) => `- ${r.kind}: [[${r.to}]]. ${r.rationale}`)
    .join('\n');
}
