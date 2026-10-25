import { simulationContext } from './simulation-context.js';
import { mkdir, readFile, writeFile, rename, rm, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { loadCorpus, serializeEntity, type ParsedEntity } from '@patternverse/compiler';
import { entityIdSchema } from '@patternverse/schema';
import {
  briefSchema,
  stageSchemas,
  stateSchema,
  configSchema,
  researchSchema,
  discoverySchema,
  designSchema,
  articleSchema,
  reviewSchema,
  factcheckSchema,
  enrichmentSchema,
  auditSchema,
  canonicalPattern,
  type State,
  type Task,
  type Stage,
} from './contracts.js';
import {
  artifact,
  atomicWrite,
  exists,
  hash,
  inside,
  json,
  load,
  lock,
  readJson,
  save,
  treeHash,
  verifyAccepted,
} from './store.js';
import { simulationHtml } from './simulation-assets.js';
import { checkLogin, codexExecutor, ExecutionError, type Executor } from './executor.js';
import {
  compileCheck,
  known,
  parsed,
  relationshipText,
  reviewPasses,
  factsPass,
  validateStage,
  type CatalogEntry,
} from './quality.js';

const promptsDir = fileURLToPath(new URL('../prompts/', import.meta.url));
export type Goal = 'plan' | 'review' | 'produce' | 'audit';
export type Catalog = {
  entries: CatalogEntry[];
  entities: ParsedEntity[];
  sourceId: string;
  diagnostics: unknown[];
};
export async function catalogFor(repo: string): Promise<Catalog> {
  const loaded = await loadCorpus({
    manifestPath: join(repo, 'patternverse.yaml'),
    contentDirectory: join(repo, 'content'),
    readonly: true,
  });
  if (!loaded.manifest || loaded.diagnostics.some((d) => d.severity === 'error'))
    throw new Error(`Repository content cannot be read: ${JSON.stringify(loaded.diagnostics)}`);
  return {
    sourceId: loaded.manifest.id,
    entities: [...loaded.entities],
    diagnostics: [...loaded.diagnostics],
    entries: loaded.entities.map((e) => ({
      id: e.id,
      title: e.title,
      summary: e.summary ?? '',
      type: e.type,
      tags: [...(e.tags ?? [])],
      verses: [...('verses' in e ? (e.verses ?? []) : [])],
    })),
  };
}
export async function initCollection(options: {
  dir: string;
  repo: string;
  id: string;
  domain: string;
  target: number;
  mode: 'mock' | 'codex';
  config?: unknown;
  catalog?: Catalog;
  brief?: unknown;
}) {
  const dir = resolve(options.dir);
  // Collection data never shares the publication directories.
  const content = resolve(options.repo, 'content');
  if (dir === content || dir.startsWith(`${content}/`))
    throw new Error('Collection storage must be outside content/');
  const release = await lock(dir);
  try {
    if (await exists(join(dir, 'state.json'))) throw new Error('Collection exists; use resume');
    const catalog = options.catalog ?? (await catalogFor(resolve(options.repo)));
    const state = stateSchema.parse({
      version: 1,
      id: options.id,
      domain: options.domain,
      target: options.target,
      mode: options.mode,
      repo: resolve(options.repo),
      created_at: new Date().toISOString(),
      config: configSchema.parse(options.config ?? {}),
      status: 'ready',
      reason: null,
      budget: { calls: 0, tokens: 0, seconds: 0 },
      tasks: [],
      accepted: [],
    });
    if (options.brief)
      await atomicWrite(join(dir, 'brief.json'), json(briefSchema.parse(options.brief)));
    await atomicWrite(join(dir, 'catalog.json'), json(catalog));
    await atomicWrite(join(dir, 'goal.json'), json({ goal: 'plan' }));
    await save(dir, state);
    return state;
  } finally {
    await release();
  }
}
function latest(state: State, stage: Stage, pattern: string | null = null) {
  return state.tasks.filter((t) => t.stage === stage && t.pattern === pattern).at(-1);
}
const succeeded = (task: Task | undefined): task is Task => task?.status === 'succeeded';
function taskFor(state: State, stage: Stage, pattern: string | null = null, revision = 0): Task {
  const id = `${pattern ?? 'collection'}.${stage}.r${revision}`;
  let task = state.tasks.find((t) => t.id === id);
  if (!task) {
    task = {
      id,
      stage,
      pattern,
      revision,
      status: 'pending',
      attempts: 0,
      artifact: null,
      sha256: null,
      error: null,
    };
    state.tasks.push(task);
  }
  return task;
}
const data = async (dir: string, state: State, stage: Stage, pattern: string | null = null) => {
  const task = latest(state, stage, pattern);
  return succeeded(task) ? artifact(dir, task) : undefined;
};
export async function importResearch(dir: string, from: string) {
  const release = await lock(dir);
  try {
    const state = await load(dir),
      source = await load(from);
    if (state.tasks.length || state.accepted.length)
      throw new Error('Research can only be imported into a fresh collection');
    if (state.domain !== source.domain || state.mode !== source.mode)
      throw new Error('Imported research must share domain and execution mode');
    const origin = latest(source, 'domain-research');
    if (!succeeded(origin)) throw new Error('Source collection has no successful domain research');
    const output = researchSchema.parse(await artifact(from, origin));
    validateStage('domain-research', output, { source_ids: [], sources: [] }, state.config);
    const relative = 'imports/domain-research/validated.json';
    const serialized = json(output);
    await atomicWrite(inside(dir, relative), serialized);
    await atomicWrite(
      join(dir, 'imports/domain-research/provenance.json'),
      json({
        source_collection: source.id,
        source_directory: resolve(from),
        source_artifact: origin.artifact,
        source_sha256: origin.sha256,
        imported_at: new Date().toISOString(),
      }),
    );
    const task = taskFor(state, 'domain-research');
    task.status = 'succeeded';
    task.artifact = relative;
    task.sha256 = hash(serialized);
    await save(dir, state);
  } finally {
    await release();
  }
}
async function designData(dir: string, state: State) {
  return designSchema.parse(await data(dir, state, 'design'));
}

export async function nextTask(dir: string, state: State, goal: Goal): Promise<Task | null> {
  for (const stage of ['domain-research', 'discovery', 'design'] as const) {
    const current = latest(state, stage);
    if (!succeeded(current)) return current ?? taskFor(state, stage);
  }
  if (goal === 'plan') return null;
  const designTask = latest(state, 'design')!;
  const reviewTask = latest(state, 'plan-review');
  if (!succeeded(reviewTask) || reviewTask.revision !== designTask.revision)
    return taskFor(state, 'plan-review', null, designTask.revision);
  const review = reviewSchema.parse(await artifact(dir, reviewTask));
  if (!reviewPasses(review, state.config)) {
    if (review.verdict === 'reject' || designTask.revision >= state.config.max_revisions)
      throw new Error(
        'Collection design needs editorial attention; bounded plan revisions exhausted or rejected',
      );
    return taskFor(state, 'design', null, designTask.revision + 1);
  }
  if (goal === 'review') return null;
  const design = await designData(dir, state);
  for (const pattern of design.progression) {
    if (state.accepted.some((a) => a.id === pattern)) continue;
    for (const stage of ['research', 'outline', 'draft'] as const) {
      const current = latest(state, stage, pattern);
      if (!succeeded(current)) return current ?? taskFor(state, stage, pattern);
    }
    const revisionTask = latest(state, 'revision', pattern);
    const version = revisionTask?.revision ?? 0;
    // Interrupted/failed revisions must finish before any critic can inspect that version.
    if (revisionTask && !succeeded(revisionTask)) return revisionTask;
    for (const stage of ['critique', 'factcheck'] as const) {
      const current = latest(state, stage, pattern);
      if (!succeeded(current) || current.revision !== version)
        return taskFor(state, stage, pattern, version);
    }
    const critique = reviewSchema.parse(await data(dir, state, 'critique', pattern));
    const facts = factcheckSchema.parse(await data(dir, state, 'factcheck', pattern));
    // Always execute at least one distinct revision, then independently re-review it.
    if (version === 0 || !reviewPasses(critique, state.config) || !factsPass(facts)) {
      if (
        version >= state.config.max_revisions ||
        critique.verdict === 'reject' ||
        facts.verdict === 'reject'
      )
        throw new Error(
          `Pattern ${pattern} needs editorial attention; revision bound or rejection`,
        );
      return taskFor(state, 'revision', pattern, version + 1);
    }
    const enrich = latest(state, 'enrichment', pattern);
    if (!succeeded(enrich)) return enrich ?? taskFor(state, 'enrichment', pattern, version);
    await acceptPattern(dir, state, pattern);
    await save(dir, state);
  }
  if (goal !== 'audit') return null;
  const audit = latest(state, 'audit');
  return succeeded(audit) ? null : (audit ?? taskFor(state, 'audit'));
}
export async function contextFor(
  dir: string,
  state: State,
  task: Task,
): Promise<Record<string, unknown>> {
  const catalog = (await readJson(join(dir, 'catalog.json'))) as Catalog;
  // Relevant successes only: article executions never receive other unfinished article drafts.
  const domainWords = state.domain
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);
  const design = await data(dir, state, 'design');
  const neighborIds = design
    ? designSchema.parse(design).relationships.flatMap((r) => [r.from, r.to])
    : [];
  const focusedCatalog = catalog.entries.filter(
    (entry) =>
      neighborIds.includes(entry.id) ||
      domainWords.some((word) =>
        `${entry.title} ${entry.tags.join(' ')} ${entry.verses.join(' ')}`
          .toLowerCase()
          .includes(word),
      ),
  );
  const currentRelationships = design
    ? designSchema
        .parse(design)
        .relationships.filter(
          (r) => !task.pattern || r.from === task.pattern || r.to === task.pattern,
        )
    : [];
  const existingNeighborIds = currentRelationships.flatMap((r) => [r.from, r.to]);
  const existingNeighborArticles = catalog.entities
    .filter((e) => existingNeighborIds.includes(e.id))
    .map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      body: e.body,
      source_path: e.sourcePath,
    }));
  const context: Record<string, unknown> = {
    collection_id: state.id,
    domain: state.domain,
    target: state.target,
    pattern: task.pattern,
    revision: task.revision,
    config: state.config,
    today: new Date().toISOString().slice(0, 10),
    catalog: task.pattern || task.stage === 'domain-research' ? focusedCatalog : catalog.entries,
    catalog_ids: catalog.entries.map((entry) => entry.id),
    existing_neighbor_articles: existingNeighborArticles,
    accepted_ids: state.accepted.map((a) => a.id),
    local_feedback: task.error,
  };
  if (await exists(join(dir, 'brief.json')))
    context.editorial_brief = briefSchema.parse(await readJson(join(dir, 'brief.json')));
  if (
    (context.editorial_brief as { simulation_environments?: string[] } | undefined)
      ?.simulation_environments?.length
  )
    context.simulation_models = await simulationContext();
  const sourceMap = new Map<string, z.infer<typeof researchSchema>['sources'][number]>();
  for (const t of state.tasks.filter((t) => succeeded(t))) {
    const output = await artifact(dir, t);
    // A shared source registry prevents ID collisions across separately produced articles.
    if (t.stage === 'research' || t.stage === 'domain-research' || t.stage === 'factcheck') {
      for (const source of (output as { sources: z.infer<typeof researchSchema>['sources'] })
        .sources) {
        const prior = sourceMap.get(source.id);
        if (prior && prior.url !== source.url) throw new Error(`Source ID collision: ${source.id}`);
        sourceMap.set(source.id, source);
      }
    }
    const currentAuditArtifact =
      !t.pattern ||
      (t === latest(state, t.stage, t.pattern) &&
        !(t.stage === 'draft' && succeeded(latest(state, 'revision', t.pattern))));
    if (
      (!t.pattern || t.pattern === task.pattern || task.stage === 'audit') &&
      (task.stage !== 'audit' || currentAuditArtifact)
    ) {
      const key =
        t.pattern && task.stage === 'audit' ? `${t.pattern}:${t.stage}:r${t.revision}` : t.stage;
      context[key] = output;
    }
  }
  if (task.pattern) {
    const d = discoverySchema.parse(context.discovery);
    context.candidate = d.candidates.find((c) => c.id === task.pattern);
    const revision = context.revision;
    // Keep numeric execution version separate from the previous revised article.
    context.version = task.revision;
    if (typeof revision === 'number') delete context.revision;
    if (context.revision && typeof context.revision === 'object')
      context.article = context.revision;
    else if (context.draft) context.article = context.draft;
  }
  let sources = [...sourceMap.values()];
  if (task.pattern) {
    // Each execution gets the current pattern's evidence, not the whole candidate pool.
    delete context.discovery;
    delete context['domain-research'];
    delete context.catalog_ids;
    if (context.revision) delete context.draft;
    if (task.stage !== 'research') {
      const relevantIds = new Set<string>();
      for (const t of state.tasks.filter((t) => succeeded(t) && t.pattern === task.pattern)) {
        const value = (await artifact(dir, t)) as {
          sources?: { id: string }[];
          source_ids?: string[];
          claim_source_ids?: string[];
        };
        value.sources?.forEach((source) => relevantIds.add(source.id));
        value.source_ids?.forEach((id) => relevantIds.add(id));
        value.claim_source_ids?.forEach((id) => relevantIds.add(id));
      }
      sources = sources.filter((source) => relevantIds.has(source.id));
    }
    if (task.stage === 'factcheck' || task.stage === 'enrichment') delete context.outline;
    if (task.stage === 'enrichment') {
      delete context.research;
      delete context.critique;
      delete context.factcheck;
    }
    // Full neighboring articles are useful to the critic; other stages receive catalog boundaries.
    if (task.stage !== 'critique') delete context.existing_neighbor_articles;
  }
  context.sources = sources;
  context.source_ids = sources.map((source) => source.id);
  return context;
}
async function acceptPattern(dir: string, state: State, id: string) {
  const design = await designData(dir, state);
  const article = articleSchema.parse(await data(dir, state, 'revision', id));
  const enrichment = enrichmentSchema.parse(await data(dir, state, 'enrichment', id));
  const catalog = (await readJson(join(dir, 'catalog.json'))) as Catalog;
  if (catalog.entries.some((e) => e.id === id)) throw new Error(`Protected existing ID: ${id}`);
  const verse = entityIdSchema.safeParse(state.domain).success
    ? state.domain
    : `${state.id}-domain`;
  const metadata = canonicalPattern(id, article.title, verse, enrichment);
  const context = await contextFor(dir, state, latest(state, 'enrichment', id)!);
  const allSources = context.sources as z.infer<typeof researchSchema>['sources'];
  const sources = allSources.filter((s) => article.source_ids.includes(s.id));
  const neighbors = relationshipText(design, id);
  const simulation = enrichment.simulation;
  const widget = simulation
    ? `\n\n## Explore the model\n\n\`\`\`patternverse-widget\n${JSON.stringify({ src: `${simulation.environment_id}.html`, title: simulation.learning_goal.slice(0, 160), height: 1000, fallback: `${simulation.setup} ${simulation.experiment} ${simulation.observe} ${simulation.limitations}`.slice(0, 2000) })}\n\`\`\`\n\n${simulation.limitations}`
    : '';
  const body = `${article.body}${widget}\n\n${neighbors ? `## Related patterns\n\n${neighbors}\n\n` : ''}## Sources\n\n${sources.map((s) => `- [${s.title}](${s.url}) — ${s.publisher}. Checked ${s.accessed_at}.`).join('\n')}`;
  const markdown = serializeEntity({ ...metadata, body, sourceId: catalog.sourceId });
  const entity = parsed(markdown, catalog.sourceId, `patterns/${id}.md`);
  const placeholders = design.selected
    .filter((p) => p !== id)
    .map((p) =>
      parsed(
        serializeEntity({
          id: p,
          title: p,
          type: 'pattern',
          status: 'draft',
          body: '',
          sourceId: catalog.sourceId,
        }),
        catalog.sourceId,
        `patterns/${p}.md`,
      ),
    );
  const verseEntity = catalog.entities.some((e) => e.id === verse)
    ? []
    : [
        parsed(
          serializeEntity({
            id: verse,
            title: state.domain,
            type: 'verse',
            status: 'draft',
            body: '',
            sourceId: catalog.sourceId,
          }),
          catalog.sourceId,
          `verses/${verse}.md`,
        ),
      ];
  const candidates = [entity];
  let practiceMarkdown: string | undefined;
  if (enrichment.practice) {
    const p = enrichment.practice;
    const practiceId = `${id}-practice`;
    if (catalog.entries.some((e) => e.id === practiceId) || design.selected.includes(practiceId))
      throw new Error('Practice ID collision');
    if (/```patternverse-/.test(p.body))
      throw new Error(
        'Use plain Markdown practices; executable practice compilation is not part of this pipeline',
      );
    practiceMarkdown = serializeEntity({
      id: practiceId,
      type: 'practice',
      title: p.title,
      status: 'draft',
      implements: [id],
      verses: [verse],
      duration_minutes: p.duration_minutes,
      body: p.body,
      sourceId: catalog.sourceId,
    });
    candidates.push(parsed(practiceMarkdown, catalog.sourceId, `practices/${practiceId}.md`));
  }
  compileCheck([...catalog.entities, ...verseEntity, ...placeholders, ...candidates]);
  const temp = join(dir, `.accept-${id}`);
  await rm(temp, { recursive: true, force: true });
  await mkdir(join(temp, 'patterns'), { recursive: true });
  await writeFile(join(temp, 'patterns', `${id}.md`), markdown);
  if (practiceMarkdown) {
    await mkdir(join(temp, 'practices'));
    await writeFile(join(temp, 'practices', `${id}-practice.md`), practiceMarkdown);
  }
  await writeFile(
    join(temp, 'package.json'),
    json({
      format_version: 1,
      id,
      title: article.title,
      ...enrichment,
      sources,
      relationships: design.relationships.filter((r) => r.from === id),
      visual_status: simulation
        ? 'bundled-interactive-model'
        : enrichment.visual.type === 'none'
          ? 'not-needed'
          : 'brief-only',
      simulation_asset_sha256: simulation
        ? hash(await simulationHtml(simulation.environment_id))
        : null,
      mock: state.mode === 'mock',
    }),
  );
  const digest = await treeHash(temp),
    directory = `accepted/${id}`,
    destination = inside(dir, directory);
  await mkdir(join(dir, 'accepted'), { recursive: true });
  if (await exists(destination)) {
    if ((await treeHash(destination)) !== digest)
      throw new Error(`Existing accepted artifact differs: ${id}`);
    await rm(temp, { recursive: true });
  } else await rename(temp, destination);
  state.accepted.push({ id, directory, sha256: digest });
}
export async function compileCollection(dir: string, state: State, currentCatalog?: Catalog) {
  const catalog = currentCatalog ?? ((await readJson(join(dir, 'catalog.json'))) as Catalog);
  const design = await designData(dir, state);
  if (state.accepted.length !== design.selected.length) throw new Error('Collection is incomplete');
  const entities = [...catalog.entities];
  const files: Record<string, string> = {};
  for (const item of state.accepted) {
    const sidecar = (await readJson(inside(dir, `${item.directory}/package.json`))) as {
      simulation?: { environment_id: 'control-thermostat' | 'control-signals' };
      simulation_asset_sha256?: string;
    };
    if (sidecar.simulation) {
      const html = await simulationHtml(sidecar.simulation.environment_id);
      if (sidecar.simulation_asset_sha256 !== hash(html))
        throw new Error(
          'Simulation model changed since acceptance; review a new collection version',
        );
      files[`assets/widgets/${sidecar.simulation.environment_id}.html`] = html;
    }
  }
  for (const item of state.accepted) {
    for (const kind of ['patterns', 'practices']) {
      const path = inside(dir, `${item.directory}/${kind}`);
      if (!(await exists(path))) continue;
      for (const name of await readdir(path)) {
        const markdown = await readFile(join(path, name), 'utf8');
        const entity = parsed(markdown, catalog.sourceId, `${kind}/${name}`);
        if (entities.some((e) => e.id === entity.id))
          throw new Error(`Existing entity collision: ${entity.id}`);
        entities.push(entity);
        files[`${kind}/${name}`] = markdown;
      }
    }
  }
  const verse = entityIdSchema.safeParse(state.domain).success
    ? state.domain
    : `${state.id}-domain`;
  if (!entities.some((e) => e.id === verse)) {
    const markdown = serializeEntity({
      id: verse,
      title: state.domain,
      type: 'verse',
      status: 'draft',
      body: design.rationale,
      sourceId: catalog.sourceId,
    });
    entities.push(parsed(markdown, catalog.sourceId, `verses/${verse}.md`));
    files[`verses/${verse}.md`] = markdown;
  }
  for (const group of [
    ...design.groups,
    { id: state.id, title: design.title, items: design.progression },
  ]) {
    if (entities.some((e) => e.id === group.id))
      throw new Error(`Collection ID collision: ${group.id}`);
    const markdown = serializeEntity({
      id: group.id,
      title: group.title,
      type: 'collection',
      status: 'draft',
      items: group.items,
      verses: [verse],
      body: design.rationale,
      sourceId: catalog.sourceId,
    });
    entities.push(parsed(markdown, catalog.sourceId, `collections/${group.id}.md`));
    files[`collections/${group.id}.md`] = markdown;
  }
  compileCheck(entities);
  return {
    files,
    entity_count: entities.length,
    staged_patterns: state.accepted.length,
    unresolved_references: 0,
  };
}
async function validateOutput(
  dir: string,
  state: State,
  task: Task,
  output: unknown,
  context: Record<string, unknown>,
) {
  validateStage(task.stage, output, context, state.config);
  if (task.stage === 'draft' || task.stage === 'revision') {
    const catalog = (await readJson(join(dir, 'catalog.json'))) as Catalog;
    const design = designSchema.parse(context.design);
    const article = articleSchema.parse(output);
    const current = parsed(
      serializeEntity({
        id: task.pattern!,
        title: article.title,
        type: 'pattern',
        status: 'draft',
        body: article.body,
        sourceId: catalog.sourceId,
      }),
      catalog.sourceId,
      `patterns/${task.pattern}.md`,
    );
    const placeholders = design.selected
      .filter((id) => id !== task.pattern)
      .map((id) =>
        parsed(
          serializeEntity({
            id,
            title: id,
            type: 'pattern',
            status: 'draft',
            body: '',
            sourceId: catalog.sourceId,
          }),
          catalog.sourceId,
          `patterns/${id}.md`,
        ),
      );
    compileCheck([...catalog.entities, current, ...placeholders]);
  }
  if (task.stage === 'audit')
    known(
      auditSchema.parse(output).findings.flatMap((f) => f.pattern_ids),
      (await designData(dir, state)).selected,
      'audit pattern',
    );
}
async function recover(dir: string, state: State) {
  await verifyAccepted(dir, state);
  let chargedTokens = 0,
    chargedSeconds = 0;
  for (const task of state.tasks) {
    for (let attempt = 1; attempt <= task.attempts; attempt++) {
      const path = join(dir, 'attempts', task.id, String(attempt));
      const usageFile = join(path, 'usage.json');
      if (!(await exists(usageFile))) {
        await mkdir(path, { recursive: true });
        const execution = (await exists(join(path, 'execution.json')))
          ? ((await readJson(join(path, 'execution.json'))) as { tokens: number })
          : null;
        let eventTokens = 0,
          reported = false;
        if (await exists(join(path, 'events.jsonl')))
          for (const line of (await readFile(join(path, 'events.jsonl'), 'utf8')).split('\n')) {
            try {
              const e = JSON.parse(line);
              if (e.type === 'turn.completed' && e.usage) {
                reported = true;
                eventTokens += (e.usage.input_tokens ?? 0) + (e.usage.output_tokens ?? 0);
              }
            } catch {
              /* incomplete event */
            }
          }
        await atomicWrite(
          usageFile,
          json({
            tokens:
              execution?.tokens ?? (reported ? eventTokens : state.config.unreported_token_reserve),
            seconds: state.config.task_timeout_seconds,
            estimated_after_interruption: true,
          }),
        );
      }
      const usage = z
        .object({ tokens: z.number().nonnegative(), seconds: z.number().nonnegative() })
        .parse(await readJson(usageFile));
      chargedTokens += usage.tokens;
      chargedSeconds += usage.seconds;
    }
    if (task.status === 'succeeded') {
      await artifact(dir, task);
      continue;
    }
    if (task.status !== 'running' && task.status !== 'failed') continue;
    const attemptDirectory = join(dir, 'attempts', task.id, String(task.attempts));
    const rawResponse = join(attemptDirectory, 'response.json');
    const validated = join(attemptDirectory, 'validated.json');
    // A complete CLI turn can outlive the parent process or fail only in transport bookkeeping.
    // Adopt it only after the same schema and semantic gates, without spending another call.
    if (
      !(await exists(validated)) &&
      (await exists(rawResponse)) &&
      (await exists(join(attemptDirectory, 'events.jsonl')))
    ) {
      const terminalEvents = (await readFile(join(attemptDirectory, 'events.jsonl'), 'utf8'))
        .split('\n')
        .flatMap((line) => {
          try {
            const e = JSON.parse(line);
            return ['turn.completed', 'turn.failed', 'error'].includes(e.type) ? [e.type] : [];
          } catch {
            return [];
          }
        });
      if (terminalEvents.at(-1) === 'turn.completed') {
        try {
          const output = stageSchemas[task.stage].parse(await readJson(rawResponse));
          await validateOutput(dir, state, task, output, await contextFor(dir, state, task));
          await atomicWrite(validated, json(output));
        } catch {
          /* Invalid responses remain failed and require a fresh bounded attempt. */
        }
      }
    }
    const relative = `attempts/${task.id}/${task.attempts}/validated.json`;
    const receipt = inside(dir, relative);
    if (await exists(receipt)) {
      const output = await readJson(receipt);
      stageSchemas[task.stage].parse(output);
      task.status = 'succeeded';
      task.artifact = relative;
      task.sha256 = hash(await readFile(receipt, 'utf8'));
      task.error = null;
    } else if (task.status === 'running') {
      task.status = 'failed';
      task.error = 'Interrupted before validated result; retry is safe';
    }
  }
  state.budget.tokens = chargedTokens;
  state.budget.seconds = chargedSeconds;
}
export async function runCollection(
  dir: string,
  goal: Goal,
  options: {
    execute?: boolean;
    dryRun?: boolean;
    maxTasks?: number;
    retry?: boolean;
    executor?: Executor;
    signal?: AbortSignal;
  } = {},
) {
  dir = resolve(dir);
  if (options.dryRun) {
    const state = await load(dir);
    return {
      dry_run: true,
      mode: state.mode,
      goal,
      next: await nextTaskPreview(dir, state, goal),
      budget: state.budget,
      config: state.config,
    };
  }
  const release = await lock(dir);
  try {
    const state = await load(dir);
    if (state.mode === 'codex' && !options.execute)
      throw new Error('Real subscription usage requires --execute; use --dry-run to preview');
    if (state.mode === 'codex' && !options.executor) await checkLogin();
    await recover(dir, state);
    if (await exists(join(dir, 'PAUSE'))) {
      state.status = 'paused';
      state.reason = 'PAUSE file present; use resume';
      await save(dir, state);
      return { status: state.status, reason: state.reason };
    }
    const maxTasks = options.maxTasks ?? state.config.max_tasks_per_run;
    if (!Number.isInteger(maxTasks) || maxTasks < 1) throw new Error('maxTasks must be positive');
    state.status = 'running';
    state.reason = null;
    await atomicWrite(join(dir, 'goal.json'), json({ goal }));
    let executed = 0;
    while (true) {
      if (options.signal?.aborted || (await exists(join(dir, 'PAUSE')))) {
        state.status = 'paused';
        state.reason = 'Operator pause or interruption';
        break;
      }
      let task: Task | null;
      try {
        task = await nextTask(dir, state, goal);
      } catch (error) {
        state.status = 'needs-attention';
        state.reason = String(error);
        break;
      }
      if (!task) {
        state.status = 'ready';
        state.reason = `Finished ${goal}`;
        if (goal === 'audit') {
          const audit = auditSchema.parse(await data(dir, state, 'audit'));
          state.status =
            audit.verdict === 'pass' && !audit.findings.some((f) => f.severity !== 'minor')
              ? 'complete'
              : 'needs-attention';
          state.reason = audit.summary;
        }
        break;
      }
      if (
        executed >= maxTasks ||
        state.budget.calls >= state.config.max_calls ||
        state.budget.tokens >= state.config.max_tokens ||
        state.budget.seconds >= state.config.max_seconds
      ) {
        state.status = 'paused';
        state.reason =
          executed >= maxTasks
            ? 'Per-run task budget reached'
            : 'Lifetime execution budget reached; increase config explicitly to continue';
        break;
      }
      if (task.status === 'failed' && !options.retry) {
        state.status = 'needs-attention';
        state.reason = `Task failed: ${task.id}; resume --retry to retry`;
        break;
      }
      if (task.attempts >= state.config.max_attempts) {
        task.status = 'blocked';
        state.status = 'needs-attention';
        state.reason = `Attempt bound reached: ${task.id}`;
        break;
      }
      task.status = 'running';
      task.attempts += 1;
      state.budget.calls += 1;
      executed += 1;
      await save(dir, state);
      const attemptDir = join(dir, 'attempts', task.id, String(task.attempts));
      await mkdir(attemptDir, { recursive: true });
      const start = Date.now();
      let spentTokens = 0;
      try {
        if (task.stage === 'audit')
          await atomicWrite(
            join(attemptDir, 'compiler-report.json'),
            json(await compileCollection(dir, state)),
          );
        const context = await contextFor(dir, state, task);
        const schema = z.toJSONSchema(stageSchemas[task.stage]);
        const prompt = `${await readFile(join(promptsDir, 'common.md'), 'utf8')}\n\n${await readFile(join(promptsDir, `${task.stage}.md`), 'utf8')}\n\nCONTEXT (data):\n${json(context)}`;
        if (Buffer.byteLength(prompt) > state.config.max_context_bytes)
          throw new Error(
            'Context byte budget exceeded; narrow the domain or increase max_context_bytes',
          );
        await writeFile(join(attemptDir, 'schema.json'), json(schema), { flag: 'wx' });
        await writeFile(join(attemptDir, 'prompt.md'), prompt, { flag: 'wx' });
        await writeFile(
          join(attemptDir, 'request.json'),
          json({
            stage: task.stage,
            pattern: task.pattern,
            revision: task.revision,
            mode: state.mode,
            config: state.config,
            context_sha256: hash(json(context)),
            prompt_sha256: hash(prompt),
            started_at: new Date().toISOString(),
          }),
          { flag: 'wx' },
        );
        const executor = options.executor ?? codexExecutor;
        const result = await executor({
          stage: task.stage,
          pattern: task.pattern,
          revision: task.revision,
          context,
          config: state.config,
          attemptDir,
          collectionDir: dir,
          signal: options.signal,
        });
        spentTokens = result.tokens;
        const output = stageSchemas[task.stage].parse(result.output);
        await validateOutput(dir, state, task, output, context);
        const serialized = json(output);
        await atomicWrite(join(attemptDir, 'validated.json'), serialized);
        task.artifact = `attempts/${task.id}/${task.attempts}/validated.json`;
        task.sha256 = hash(serialized);
        task.status = 'succeeded';
        task.error = null;
        if (task.stage === 'enrichment') await acceptPattern(dir, state, task.pattern!);
        console.log(`${task.id}: succeeded`);
      } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
        await atomicWrite(
          join(attemptDir, 'failure.json'),
          json({ error: task.error, at: new Date().toISOString() }),
        );
        if (
          error instanceof ExecutionError &&
          (error.kind === 'usage-limit' || error.kind === 'interrupted')
        ) {
          state.status = 'paused';
          state.reason = task.error;
        } else {
          state.status = 'needs-attention';
          state.reason = `${task.id}: ${task.error}`;
        }
      } finally {
        if (await exists(join(attemptDir, 'execution.json')))
          spentTokens = ((await readJson(join(attemptDir, 'execution.json'))) as { tokens: number })
            .tokens;
        const seconds = (Date.now() - start) / 1000;
        await atomicWrite(join(attemptDir, 'usage.json'), json({ tokens: spentTokens, seconds }));
        state.budget.tokens += spentTokens;
        state.budget.seconds += seconds;
        await save(dir, state);
      }
      if (state.status !== 'running') break;
    }
    await save(dir, state);
    return {
      status: state.status,
      reason: state.reason,
      accepted: state.accepted.map((a) => a.id),
      executed,
      budget: state.budget,
    };
  } finally {
    await release();
  }
}
// A dry run must not accept artifacts or mutate state as the production scheduler does.
async function nextTaskPreview(dir: string, state: State, goal: Goal) {
  const clone = structuredClone(state);
  if (
    clone.tasks.some(
      (t) =>
        t.stage === 'enrichment' &&
        t.status === 'succeeded' &&
        !clone.accepted.some((a) => a.id === t.pattern),
    )
  )
    return 'accept pending pattern after validation';
  return (await nextTask(dir, clone, goal))?.id ?? `finished ${goal}`;
}
export async function exportCollection(dir: string) {
  const release = await lock(dir);
  try {
    const state = await load(dir);
    await verifyAccepted(dir, state);
    // Detect new library IDs since planning. No repository files are ever written here.
    const current = await catalogFor(state.repo);
    const stagedIds = state.accepted.map((a) => a.id);
    if (current.entries.some((e) => stagedIds.includes(e.id)))
      throw new Error(
        'Repository gained an ID used by this collection; manual reconciliation required',
      );
    const bundle = await compileCollection(dir, state, current);
    const relative = `exports/${hash(json(bundle.files)).slice(0, 16)}`;
    const destination = inside(dir, relative);
    if (!(await exists(destination))) {
      const temp = join(dir, '.export');
      await rm(temp, { recursive: true, force: true });
      await mkdir(temp);
      for (const [path, contents] of Object.entries(bundle.files))
        await atomicWrite(join(temp, 'content', path), contents);
      await atomicWrite(
        join(temp, 'patternverse.yaml'),
        `id: ${((await readJson(join(dir, 'catalog.json'))) as Catalog).sourceId}\nname: Editorial staging\nschema_version: 1\n`,
      );
      await atomicWrite(
        join(temp, 'package.json'),
        json({
          format_version: 1,
          title: (await designData(dir, state)).title,
          collection: state.id,
          groups: (await designData(dir, state)).groups,
          beginner_path: (await designData(dir, state)).progression,
          patterns: await Promise.all(
            state.accepted.map((a) => readJson(inside(dir, `${a.directory}/package.json`))),
          ),
          mock: state.mode === 'mock',
        }),
      );
      await mkdir(join(dir, 'exports'), { recursive: true });
      await rename(temp, destination);
    }
    return {
      directory: destination,
      staged_patterns: bundle.staged_patterns,
      unresolved_references: bundle.unresolved_references,
      note: 'Draft staging only. References to existing Commons entities require the repository corpus. No publication performed.',
    };
  } finally {
    await release();
  }
}
