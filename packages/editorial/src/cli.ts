import { fileURLToPath } from 'node:url';
import { simulationHtml, simulationIds } from './simulation-assets.js';
import { parseArgs } from 'node:util';
import { resolve, join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { configSchema, briefSchema } from './contracts.js';
import {
  importResearch,
  initCollection,
  runCollection,
  exportCollection,
  type Goal,
} from './pipeline.js';
import { atomicWrite, exists, json, load, lock, readJson, save } from './store.js';
import { mockExecutor } from './mock.js';

const help = `Patternverse Editorial Pipeline
Run from repository root: pnpm --filter @patternverse/editorial editorial <command> [options]

plan     --id ID --domain DOMAIN --target N [--mock] [--config FILE] [--brief FILE]
         [--dir DIR] [--execute | --dry-run] [--max-tasks N]
review   --dir DIR [--execute | --dry-run] [--max-tasks N]
produce  --dir DIR [--execute | --dry-run] [--max-tasks N]
audit    --dir DIR [--execute | --dry-run] [--max-tasks N]
resume   --dir DIR [--execute | --dry-run] [--retry] [--max-tasks N]
status   --dir DIR
pause    --dir DIR
configure --dir DIR --config FILE
export   --dir DIR
simulations --dir DIR

Default storage: <repo>/.local/editorial/<id>. Real calls require --execute on every invocation.
A new plan without --execute creates state and previews. Mock mode never invokes Codex.
All exports remain draft staging; no publish command exists. See packages/editorial/README.md.`;
async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      id: { type: 'string' },
      domain: { type: 'string' },
      target: { type: 'string' },
      dir: { type: 'string' },
      repo: { type: 'string' },
      config: { type: 'string' },
      brief: { type: 'string' },
      'from-research': { type: 'string' },
      mock: { type: 'boolean' },
      execute: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      retry: { type: 'boolean' },
      'max-tasks': { type: 'string' },
      help: { type: 'boolean' },
    },
  });
  const command = positionals[0];
  if (!command || values.help) {
    console.log(help);
    return;
  }
  const commands = [
    'plan',
    'review',
    'produce',
    'audit',
    'resume',
    'status',
    'pause',
    'configure',
    'export',
    'simulations',
  ];
  if (!commands.includes(command)) throw new Error(`Unknown command ${command}`);
  if (values.execute && values['dry-run']) throw new Error('Choose --execute or --dry-run');
  // pnpm runs package scripts in the package directory; repository root is relative to this module.
  const repo = resolve(values.repo ?? fileURLToPath(new URL('../../../', import.meta.url)));
  const dir = resolve(
    values.dir ??
      (values.id
        ? join(repo, '.local', 'editorial', values.id)
        : (() => {
            throw new Error('--dir required');
          })()),
  );
  if (command === 'plan' && !(await exists(join(dir, 'state.json')))) {
    if (!values.id || !values.domain || !values.target)
      throw new Error('New plans require --id, --domain and --target');
    if (values['dry-run']) {
      console.log(
        json({
          dry_run: true,
          id: values.id,
          domain: values.domain,
          target: Number(values.target),
          directory: dir,
          stages: ['domain-research', 'discovery', 'design'],
          brief: values.brief ? briefSchema.parse(await readJson(resolve(values.brief))) : null,
          config: configSchema.parse(values.config ? await readJson(resolve(values.config)) : {}),
        }),
      );
      return;
    }
    await initCollection({
      dir,
      repo,
      id: values.id,
      domain: values.domain,
      target: Number(values.target),
      mode: values.mock ? 'mock' : 'codex',
      config: values.config ? await readJson(resolve(values.config)) : {},
      brief: values.brief ? await readJson(resolve(values.brief)) : undefined,
    });
    if (values['from-research']) await importResearch(dir, resolve(values['from-research']));
  }
  if (command === 'simulations') {
    for (const id of simulationIds)
      await atomicWrite(join(dir, `${id}.html`), await simulationHtml(id));
    console.log(json({ directory: dir, environments: simulationIds }));
    return;
  }
  if (command === 'status') {
    const state = await load(dir);
    console.log(
      json(
        (await exists(join(dir, 'PAUSE')))
          ? { ...state, status: 'paused', pause_requested: true }
          : state,
      ),
    );
    return;
  }
  if (command === 'pause') {
    await atomicWrite(join(dir, 'PAUSE'), new Date().toISOString());
    console.log('Pause requested');
    return;
  }
  if (command === 'configure') {
    if (!values.config) throw new Error('--config required');
    const release = await lock(dir);
    try {
      const state = await load(dir);
      state.config = configSchema.parse({
        ...state.config,
        ...((await readJson(resolve(values.config))) as object),
      });
      await save(dir, state);
    } finally {
      await release();
    }
    console.log('Configuration updated; usage counters preserved');
    return;
  }
  if (command === 'export') {
    console.log(json(await exportCollection(dir)));
    return;
  }
  let goal: Goal = command as Goal;
  if (command === 'resume') {
    goal = ((await readJson(join(dir, 'goal.json'))) as { goal: Goal }).goal;
    if (!['plan', 'review', 'produce', 'audit'].includes(goal))
      throw new Error('Invalid saved goal');
    if (!values['dry-run']) {
      // Refuse to unpause a live execution; pause file removal is serialized with worker ownership.
      const release = await lock(dir);
      try {
        if (await exists(join(dir, 'PAUSE'))) await unlink(join(dir, 'PAUSE'));
      } finally {
        await release();
      }
    }
  }
  const state = await load(dir);
  if (values.mock && state.mode !== 'mock')
    throw new Error('Cannot mix mock and real artifacts; create a separate collection');
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    const result = await runCollection(dir, goal, {
      execute: values.execute,
      dryRun: values['dry-run'] || (state.mode === 'codex' && !values.execute),
      maxTasks: values['max-tasks'] ? Number(values['max-tasks']) : undefined,
      retry: values.retry,
      executor: state.mode === 'mock' ? mockExecutor : undefined,
      signal: controller.signal,
    });
    console.log(json(result));
    if ('status' in result && result.status === 'needs-attention') process.exitCode = 2;
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
