import { mkdtemp, readFile, writeFile, rm, readdir, utimes } from 'node:fs/promises';
import { tmpdir, hostname } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  initCollection,
  importResearch,
  runCollection,
  exportCollection,
  compileCollection,
  type Catalog,
} from '../src/pipeline.js';
import { mockExecutor } from '../src/mock.js';
import { configSchema, stageSchemas } from '../src/contracts.js';
import { ExecutionError, type Executor } from '../src/executor.js';
import { artifact, json, load, lock, save, treeHash, verifyAccepted } from '../src/store.js';
import { validateDesign, validateStage } from '../src/quality.js';

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});
async function setup(mode: 'mock' | 'codex' = 'mock', overrides = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'editorial-test-'));
  dirs.push(dir);
  const catalog: Catalog = { sourceId: 'commons', entries: [], entities: [], diagnostics: [] };
  await initCollection({
    dir,
    id: 'test-collection',
    repo: process.cwd(),
    domain: 'photography',
    target: 3,
    mode,
    catalog,
    config: {
      min_article_words: 100,
      max_article_words: 800,
      max_calls: 100,
      max_tasks_per_run: 100,
      ...overrides,
    },
  });
  return dir;
}
const run = (dir: string, goal: 'plan' | 'review' | 'produce' | 'audit' = 'audit', options = {}) =>
  runCollection(dir, goal, { executor: mockExecutor, ...options });

describe('persistent editorial workflow', () => {
  it('runs 3 articles serially through every separate stage, audits, compiles and exports drafts', async () => {
    const dir = await setup();
    expect(await run(dir)).toMatchObject({ status: 'complete' });
    const state = await load(dir);
    expect(state.accepted).toHaveLength(3);
    expect(state.tasks.filter((t) => t.stage === 'revision')).toHaveLength(3);
    expect(state.tasks.filter((t) => t.stage === 'critique')).toHaveLength(6);
    expect(state.tasks.filter((t) => t.stage === 'factcheck')).toHaveLength(6);
    expect(state.budget.calls).toBe(32);
    expect(state.budget.tokens).toBe(0);
    expect(await compileCollection(dir, state)).toMatchObject({
      staged_patterns: 3,
      unresolved_references: 0,
    });
    const output = await exportCollectionWithRepoFixture(dir);
    expect(output.staged_patterns).toBe(3);
    const content = await readFile(
      join(output.directory, 'content/patterns/test-collection-fixture-1.md'),
      'utf8',
    );
    expect(content).toContain('status: draft');
    const sidecar = JSON.parse(await readFile(join(output.directory, 'package.json'), 'utf8'));
    expect(sidecar.patterns[0].example_user_queries).toHaveLength(8);
    expect(sidecar.mock).toBe(true);
    const acceptedHashes = await Promise.all(
      state.accepted.map((a) => treeHash(join(dir, a.directory))),
    );
    expect(await run(dir)).toMatchObject({ executed: 0, status: 'complete' });
    expect(await Promise.all(state.accepted.map((a) => treeHash(join(dir, a.directory))))).toEqual(
      acceptedHashes,
    );
  });
  it('planning and review stop at their boundaries', async () => {
    const dir = await setup();
    await run(dir, 'plan');
    expect((await load(dir)).tasks).toHaveLength(3);
    await run(dir, 'review');
    expect((await load(dir)).tasks).toHaveLength(4);
    expect((await load(dir)).accepted).toHaveLength(0);
  });
  it('dry runs do not mutate files, call executors, or accept pending work', async () => {
    const dir = await setup();
    const before = await treeHash(dir);
    expect(await run(dir, 'audit', { dryRun: true })).toMatchObject({ dry_run: true });
    expect(await treeHash(dir)).toBe(before);
  });
  it('requires explicit execution for subscription mode', async () => {
    const dir = await setup('codex');
    await expect(run(dir)).rejects.toThrow('--execute');
    expect((await load(dir)).budget.calls).toBe(0);
  });
  it('stops at per-run and lifetime budgets and resumes without repeating successes', async () => {
    const dir = await setup('mock', { max_calls: 3 });
    expect(await run(dir, 'audit', { maxTasks: 1 })).toMatchObject({
      status: 'paused',
      executed: 1,
    });
    expect(await run(dir)).toMatchObject({ status: 'paused', executed: 2 });
    const state = await load(dir);
    state.config.max_calls = 100;
    await save(dir, state);
    expect(await run(dir)).toMatchObject({ status: 'complete', executed: 29 });
    expect((await load(dir)).tasks.every((t) => t.attempts === 1)).toBe(true);
  });
  it('halts at a usage limit and retries only the incomplete execution', async () => {
    const dir = await setup();
    const quota: Executor = async () => {
      throw new ExecutionError('Usage limit', 'usage-limit');
    };
    expect(await run(dir, 'audit', { executor: quota })).toMatchObject({ status: 'paused' });
    expect(await run(dir)).toMatchObject({ status: 'needs-attention', executed: 0 });
    expect(await run(dir, 'audit', { retry: true })).toMatchObject({ status: 'complete' });
    expect((await load(dir)).tasks[0]?.attempts).toBe(2);
  });
  it('rejects malformed model output, persists error and retries with local feedback', async () => {
    const dir = await setup();
    expect(
      await run(dir, 'plan', { executor: async () => ({ output: { bogus: true }, tokens: 8 }) }),
    ).toMatchObject({ status: 'needs-attention' });
    const failed = await load(dir);
    expect(failed.budget.tokens).toBe(8);
    expect(
      await readFile(join(dir, 'attempts/collection.domain-research.r0/1/failure.json'), 'utf8'),
    ).toContain('error');
    await run(dir, 'plan', { retry: true });
    expect((await load(dir)).tasks[0]?.attempts).toBe(2);
  });
  it('recovers an interrupted validated receipt without another call', async () => {
    const dir = await setup();
    await run(dir, 'plan', { maxTasks: 1 });
    const state = await load(dir);
    const task = state.tasks[0]!;
    task.status = 'running';
    task.artifact = null;
    task.sha256 = null;
    await save(dir, state);
    expect(await run(dir, 'plan')).toMatchObject({ executed: 2 });
    expect((await load(dir)).tasks[0]?.attempts).toBe(1);
  });
  it('retries interrupted work without a complete receipt', async () => {
    const dir = await setup();
    await run(dir, 'plan', { maxTasks: 1 });
    const state = await load(dir);
    const task = state.tasks[0]!;
    await rm(join(dir, task.artifact!));
    task.status = 'running';
    task.artifact = null;
    task.sha256 = null;
    await save(dir, state);
    expect(await run(dir, 'plan', { retry: true })).toMatchObject({ executed: 3 });
    expect((await load(dir)).tasks[0]?.attempts).toBe(2);
  });
  it('pauses on request and does not start another execution', async () => {
    const dir = await setup();
    await writeFile(join(dir, 'PAUSE'), 'pause');
    expect(await run(dir)).toMatchObject({ status: 'paused' });
    expect((await load(dir)).tasks).toHaveLength(0);
    await rm(join(dir, 'PAUSE'));
    expect(await run(dir, 'plan')).toMatchObject({ executed: 3 });
  });
  it('bounds failed reviews and never accepts unsupported claims', async () => {
    const dir = await setup('mock', { max_revisions: 1 });
    const executor: Executor = async (r) => {
      const result = await mockExecutor(r);
      if (r.stage === 'factcheck')
        return {
          ...result,
          output: {
            verdict: 'revise',
            claims: [
              {
                claim: 'Unsupported',
                status: 'unsupported',
                source_ids: [],
                verification: 'No evidence',
                correction: 'Remove',
              },
            ],
            sources: [],
            limitations: [],
          },
        };
      return result;
    };
    expect(await run(dir, 'audit', { executor })).toMatchObject({ status: 'needs-attention' });
    expect((await load(dir)).accepted).toHaveLength(0);
    expect((await load(dir)).tasks.filter((t) => t.stage === 'revision')).toHaveLength(1);
  });
  it('uses revised article in independent re-reviews and preserves numeric version separately', async () => {
    const dir = await setup();
    let checked = false;
    const executor: Executor = async (r) => {
      if (r.stage === 'critique' && r.revision === 1) {
        expect(r.context.version).toBe(1);
        expect(r.context.article).toEqual(r.context.revision);
        checked = true;
      }
      return mockExecutor(r);
    };
    await run(dir, 'produce', { executor });
    expect(checked).toBe(true);
  });
  it('detects edits to accepted work and task artifacts', async () => {
    const dir = await setup();
    await run(dir, 'produce');
    const state = await load(dir);
    await writeFile(join(dir, state.accepted[0]!.directory, 'package.json'), '{}');
    await expect(verifyAccepted(dir, state)).rejects.toThrow('Accepted work changed');
    const task = state.tasks[0]!;
    await writeFile(join(dir, task.artifact!), '{}');
    await expect(artifact(dir, task)).rejects.toThrow('Artifact changed');
  });
  it('bounds attempts and preserves previous execution directories', async () => {
    const dir = await setup('mock', { max_attempts: 2 });
    const bad: Executor = async () => {
      throw new Error('Unavailable');
    };
    await run(dir, 'plan', { executor: bad });
    await run(dir, 'plan', { executor: bad, retry: true });
    expect(await run(dir, 'plan', { retry: true })).toMatchObject({
      status: 'needs-attention',
      executed: 0,
    });
    expect(await readdir(join(dir, 'attempts/collection.domain-research.r0'))).toEqual(['1', '2']);
  });
  it('bounds design revisions after failed collection review', async () => {
    const dir = await setup('mock', { max_revisions: 1 });
    const executor: Executor = async (r) => {
      const value = await mockExecutor(r);
      return r.stage === 'plan-review'
        ? {
            ...value,
            output: {
              ...(value.output as object),
              verdict: 'revise',
              scores: {
                usefulness: 2,
                reusability: 2,
                distinctiveness: 2,
                teachability: 2,
                grounding: 2,
                coverage: 2,
              },
            },
          }
        : value;
    };
    expect(await run(dir, 'review', { executor })).toMatchObject({ status: 'needs-attention' });
    expect((await load(dir)).tasks.filter((t) => t.stage === 'design')).toHaveLength(2);
  });
});

async function exportCollectionWithRepoFixture(dir: string) {
  const repo = join(dir, 'repo');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(join(repo, 'content'), { recursive: true });
  await writeFile(join(repo, 'patternverse.yaml'), 'id: commons\nname: Test\nschema_version: 1\n');
  const state = await load(dir);
  state.repo = repo;
  await save(dir, state);
  return exportCollection(dir);
}

describe('locks and quality contracts', () => {
  it('refuses live locks and reclaims dead locks', async () => {
    const dir = await setup();
    const release = await lock(dir);
    await expect(lock(dir)).rejects.toThrow('locked');
    await release();
    await writeFile(join(dir, '.lock'), json({ pid: 2147483647, host: hostname(), token: 'old' }));
    const recovered = await lock(dir);
    await recovered();
  });
  it('does not reclaim a lock from another host based on age', async () => {
    const dir = await setup();
    await writeFile(join(dir, '.lock'), json({ pid: 1, host: 'other-host', token: 'old' }));
    await utimes(join(dir, '.lock'), 1, 1);
    await expect(lock(dir)).rejects.toThrow('another host');
  });
  it('generates strict JSON schemas with no optional object fields', () => {
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return;
      const object = node as Record<string, unknown>;
      if (object.type === 'object') {
        expect(object.additionalProperties).toBe(false);
        expect(new Set(object.required as string[])).toEqual(
          new Set(Object.keys(object.properties as object)),
        );
      }
      Object.values(object).forEach((v) => (Array.isArray(v) ? v.forEach(walk) : walk(v)));
    };
    Object.values(stageSchemas).forEach((s) => walk(z.toJSONSchema(s)));
  });
  it('rejects existing IDs, weak choices, broken relations, missing taxonomy and cycles', async () => {
    const dir = await setup();
    await run(dir, 'plan');
    const state = await load(dir);
    const discovery = await artifact(
      dir,
      state.tasks.find((t) => t.stage === 'discovery')!,
    );
    const design = (await artifact(
      dir,
      state.tasks.find((t) => t.stage === 'design')!,
    )) as z.infer<typeof stageSchemas.design>;
    expect(() =>
      validateDesign(
        design,
        discovery,
        [
          {
            id: design.selected[0]!,
            type: 'pattern',
            title: 'Existing',
            summary: '',
            tags: [],
            verses: [],
          },
        ],
        3,
        state.config,
      ),
    ).toThrow('protected');
    expect(() => validateDesign({ ...design, groups: [] }, discovery, [], 3, state.config)).toThrow(
      'Taxonomy',
    );
    expect(() =>
      validateDesign(
        {
          ...design,
          relationships: [
            { from: design.selected[0], to: 'missing', kind: 'related', rationale: 'test' },
          ],
        },
        discovery,
        [],
        3,
        state.config,
      ),
    ).toThrow('Unknown');
    expect(() =>
      validateDesign(
        {
          ...design,
          relationships: [
            {
              from: design.selected[0],
              to: design.selected[1],
              kind: 'prerequisite',
              rationale: 'test',
            },
            {
              from: design.selected[1],
              to: design.selected[0],
              kind: 'prerequisite',
              rationale: 'test',
            },
          ],
        },
        discovery,
        [],
        3,
        state.config,
      ),
    ).toThrow('cycle');
    const weak = structuredClone(discovery) as { candidates: { scores: Record<string, number> }[] };
    weak.candidates[0]!.scores.grounding = 1;
    expect(() => validateDesign(design, weak, [], 3, state.config)).toThrow('Weak');
  });
  it('rejects unknown source IDs, duplicate queries and invalid configurations', async () => {
    expect(() => configSchema.parse({ min_article_words: 900, max_article_words: 100 })).toThrow();
    const dir = await setup();
    await run(dir, 'produce');
    const state = await load(dir);
    const task = state.tasks.find((t) => t.stage === 'enrichment')!;
    const value = (await artifact(dir, task)) as { example_user_queries: string[] };
    value.example_user_queries[1] = value.example_user_queries[0]!;
    expect(() =>
      validateStage(
        'enrichment',
        value,
        { design: awaitableDesignPlaceholder(), catalog: [] },
        state.config,
      ),
    ).toThrow('Duplicate');
    expect(() =>
      validateStage(
        'outline',
        { claim_source_ids: ['invented'] },
        { source_ids: [] },
        state.config,
      ),
    ).toThrow('Unknown');
  });
});
function awaitableDesignPlaceholder() {
  return {};
}

it('blocks an invalid article reference at drafting, before reviews and acceptance', async () => {
  const dir = await setup();
  const executor: Executor = async (request) => {
    const result = await mockExecutor(request);
    if (request.stage === 'draft') {
      const article = result.output as { body: string };
      article.body += '\n\n[[missing-pattern]]';
    }
    return result;
  };
  expect(await run(dir, 'produce', { executor })).toMatchObject({ status: 'needs-attention' });
  const state = await load(dir);
  expect(state.tasks.at(-1)?.stage).toBe('draft');
  expect(state.tasks.at(-1)?.error).toContain('compiler');
  expect(state.accepted).toHaveLength(0);
});

it('reconstructs usage receipts after interruption without resetting the budget', async () => {
  const dir = await setup();
  await run(dir, 'plan', { maxTasks: 1 });
  const state = await load(dir);
  const task = state.tasks[0]!;
  await rm(join(dir, 'attempts', task.id, '1', 'usage.json'));
  await writeFile(join(dir, 'attempts', task.id, '1', 'execution.json'), json({ tokens: 123 }));
  task.status = 'running';
  task.artifact = null;
  task.sha256 = null;
  await save(dir, state);
  await run(dir, 'plan');
  expect((await load(dir)).budget.tokens).toBe(123);
  expect((await load(dir)).budget.seconds).toBeGreaterThanOrEqual(600);
});

it('export recompiles against the current corpus and refuses newly conflicting IDs', async () => {
  const dir = await setup();
  await run(dir, 'produce');
  await exportCollectionWithRepoFixture(dir);
  const state = await load(dir);
  const { mkdir } = await import('node:fs/promises');
  await mkdir(join(state.repo, 'content/patterns'), { recursive: true });
  await writeFile(
    join(state.repo, 'content/patterns/new-conflict.md'),
    `---\nid: ${state.accepted[0]!.id}\ntype: pattern\ntitle: New published pattern\nstatus: published\n---\nProtected content\n`,
  );
  await expect(exportCollection(dir)).rejects.toThrow('manual reconciliation');
  expect(await readFile(join(state.repo, 'content/patterns/new-conflict.md'), 'utf8')).toContain(
    'Protected content',
  );
});

it('persists editorial seeds and exports two reusable simulation assets once per collection', async () => {
  const dir = await setup();
  await writeFile(
    join(dir, 'brief.json'),
    json({
      scope: 'Control pilot',
      audience: 'Learners',
      collection_goal: 'Three patterns',
      candidate_seeds: [{ title: 'Add Hysteresis', insight: 'Avoid chatter' }],
      simulation_environments: ['control-thermostat', 'control-signals'],
      notes: [],
      background: null,
    }),
  );
  const executor: Executor = async (request) => {
    expect(request.context.editorial_brief).toBeDefined();
    const result = await mockExecutor(request);
    if (request.stage === 'enrichment') {
      const value = result.output as Record<string, unknown>;
      value.simulation = {
        environment_id: request.pattern?.endsWith('3') ? 'control-signals' : 'control-thermostat',
        learning_goal: 'Compare the model response',
        setup: 'Use the default controls',
        experiment: 'Vary one parameter',
        observe: 'Compare traces',
        limitations: 'Educational model only',
      };
      value.visual = {
        type: 'interactive-simulation',
        rationale: 'See the mechanism',
        brief: 'Use the approved shared environment',
      };
    }
    return result;
  };
  expect(await run(dir, 'audit', { executor })).toMatchObject({ status: 'complete' });
  const state = await load(dir);
  const bundle = await compileCollection(dir, state);
  expect(Object.keys(bundle.files).filter((p) => p.endsWith('.html'))).toHaveLength(2);
  expect(bundle.files['patterns/test-collection-fixture-1.md']).toContain('patternverse-widget');
  const output = await exportCollectionWithRepoFixture(dir);
  expect(
    await readFile(
      join(output.directory, 'content/assets/widgets/control-thermostat.html'),
      'utf8',
    ),
  ).toContain('Tune the room');
});

it('imports checked domain research with provenance without model usage', async () => {
  const from = await setup();
  await run(from, 'plan', { maxTasks: 1 });
  const dir = await setup();
  await importResearch(dir, from);
  const state = await load(dir);
  expect(state.tasks[0]?.status).toBe('succeeded');
  expect(state.tasks[0]?.attempts).toBe(0);
  expect(state.budget.calls).toBe(0);
  expect(await readFile(join(dir, 'imports/domain-research/provenance.json'), 'utf8')).toContain(
    'source_sha256',
  );
  expect(await run(dir, 'plan')).toMatchObject({ executed: 2 });
  await expect(importResearch(dir, from)).rejects.toThrow('fresh collection');
});
it('recovers a completed raw CLI response through validation without another execution', async () => {
  const dir = await setup();
  await run(dir, 'plan', { maxTasks: 1 });
  const state = await load(dir);
  const task = state.tasks[0]!;
  await rm(join(dir, task.artifact!));
  await writeFile(
    join(dir, 'attempts', task.id, '1', 'events.jsonl'),
    JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 12, output_tokens: 3 } }) +
      '\n',
  );
  task.status = 'failed';
  task.artifact = null;
  task.sha256 = null;
  task.error = 'Interrupted transport bookkeeping';
  await save(dir, state);
  expect(await run(dir, 'plan')).toMatchObject({ executed: 2 });
  expect((await load(dir)).tasks[0]?.attempts).toBe(1);
});

it('keeps article context focused while preserving its candidate and source ledger', async () => {
  const dir = await setup();
  await run(dir, 'produce', { maxTasks: 5 });
  const state = await load(dir);
  const { contextFor, nextTask } = await import('../src/pipeline.js');
  const task = await nextTask(dir, state, 'produce');
  const context = await contextFor(dir, state, task!);
  expect(context.candidate).toBeDefined();
  expect(context.research).toBeDefined();
  expect(context.sources).toHaveLength(2);
  expect(context.discovery).toBeUndefined();
  expect(context['domain-research']).toBeUndefined();
  expect(context.existing_neighbor_articles).toBeUndefined();
});

it('initializes a resumable planning goal and rejects misspelled stage settings', async () => {
  const dir = await setup();
  expect(JSON.parse(await readFile(join(dir, 'goal.json'), 'utf8'))).toEqual({ goal: 'plan' });
  expect(() => configSchema.parse({ stage_models: { 'fact-check': 'some-model' } })).toThrow(
    'Unknown stage',
  );
});
