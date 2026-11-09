import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectPublicBuild } from './check-public-build.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(resolve(repository, 'packages/compiler/package.json'));
const { parseDocument } = require('yaml');
const ignored = new Set([
  '.git',
  '.local',
  '.codex',
  '.agents',
  'node_modules',
  'build',
  'dist',
  'generated',
  'target',
  '.svelte-kit',
  '.wrangler',
  'test-results',
  'playwright-report',
  'coverage',
  'artifacts',
  '.DS_Store',
]);

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? files(path) : entry.isFile() ? [path] : [];
    }),
  );
  return nested.flat().sort();
}

/** Copy an immutable candidate; never alter the editable corpus or its publication flags. */
export async function stageSiteRelease(source, destination, policy) {
  const allowed = new Set(policy.entities);
  if (!allowed.size || allowed.size !== policy.entities.length)
    throw new Error('The release inventory must be nonempty and unique.');
  await mkdir(destination); // Refuse to overwrite an earlier candidate.
  const filter = (path) => {
    const parts = relative(source, path).split('/');
    return (
      !parts.some(
        (part) =>
          ignored.has(part) ||
          part.startsWith('.public-routes') ||
          (/^(?:\.env|\.dev\.vars)(?:\.|$)/.test(part) && !part.endsWith('.example')),
      ) && parts[0] !== 'content'
    );
  };
  // Copy top-level entries individually: Node refuses a root-to-child copy even
  // when its filter excludes the destination's entire .local subtree.
  for (const name of await readdir(source)) {
    const path = join(source, name);
    if (filter(path)) await cp(path, join(destination, name), { recursive: true, filter });
  }

  const retained = [];
  const excluded = [];
  const removedMemberships = [];
  for (const path of await files(join(source, 'content'))) {
    if (!path.endsWith('.md')) continue;
    const text = await readFile(path, 'utf8');
    const match = /^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))([\s\S]*)$/.exec(text);
    if (!match) throw new Error(`Missing frontmatter: ${relative(source, path)}`);
    const document = parseDocument(match[2]);
    if (document.errors.length) throw new Error(`Invalid frontmatter: ${relative(source, path)}`);
    const entity = document.toJS();
    const key = `${entity.type}:${entity.id}`;
    if (!allowed.has(key) || entity.status !== 'published') {
      excluded.push({ key, status: entity.status, path: relative(source, path) });
      continue;
    }
    // Existing collections must not expose or link to held-back additions.
    for (const field of ['items', 'verses', 'implements']) {
      if (!Array.isArray(entity[field])) continue;
      const approved = entity[field].filter((id) =>
        policy.entities.some((key) => key.endsWith(`:${id}`)),
      );
      if (approved.length !== entity[field].length) {
        removedMemberships.push({
          key,
          field,
          removed: entity[field].filter((id) => !approved.includes(id)),
        });
        document.set(field, approved);
      }
    }
    const output = join(destination, relative(source, path));
    await mkdir(dirname(output), { recursive: true });
    await writeFile(
      output,
      removedMemberships.some((change) => change.key === key)
        ? `---\n${document.toString()}---\n${match[4]}`
        : text,
    );
    retained.push(key);
  }
  if (JSON.stringify(retained.sort()) !== JSON.stringify([...allowed].sort()))
    throw new Error(
      'A previously published entity is missing, duplicated, or no longer published.',
    );
  for (const directory of [
    'patterns',
    'concepts',
    'practices',
    'collections',
    'verses',
    'assets/widgets',
  ])
    await mkdir(join(destination, 'content', directory), { recursive: true });
  if (!policy.excludeContentAssets)
    throw new Error('This release requires all new content assets to remain excluded.');
  await writeFile(join(destination, 'content/assets/manifest.json'), '{}\n');

  // Static assets bypass content status, so exclude the unpublished course explicitly.
  const { rm } = await import('node:fs/promises');
  // With every canonical content asset held back, this route has no entries.
  // Omit it from the candidate rather than relaxing SvelteKit's prerender checks.
  await rm(join(destination, 'apps/web/src/routes/assets'), { recursive: true, force: true });
  for (const directory of policy.excludeStaticDirectories) {
    if (!/^[a-z0-9/-]+$/.test(directory) || directory.split('/').includes('..'))
      throw new Error('Invalid static exclusion.');
    await rm(join(destination, 'apps/web/static', directory), { recursive: true, force: true });
  }
  const graphicsPath = join(destination, 'apps/web/src/lib/illustrations/pattern-graphics.json');
  const graphics = JSON.parse(await readFile(graphicsPath, 'utf8'));
  graphics.graphics = graphics.graphics.filter(({ id }) => allowed.has(`pattern:${id}`));
  await writeFile(graphicsPath, `${JSON.stringify(graphics, null, 2)}\n`);

  // Reuse installed tools without copying dependencies or private environment files.
  const modules = [
    source,
    ...(await readdir(join(source, 'apps'))).map((name) => join(source, 'apps', name)),
    ...(await readdir(join(source, 'packages'))).map((name) => join(source, 'packages', name)),
  ];
  for (const directory of modules) {
    try {
      await readdir(join(directory, 'node_modules'));
    } catch {
      continue;
    }
    await symlink(
      join(directory, 'node_modules'),
      join(destination, relative(source, directory), 'node_modules'),
      'dir',
    );
  }
  const report = {
    name: policy.name,
    baseline: policy.baseline,
    retained,
    excluded,
    removedMemberships,
    excludedAssets: [
      'content/assets/*',
      ...policy.excludeStaticDirectories.map((path) => `apps/web/static/${path}`),
    ],
    published: false,
    checks: [],
  };
  await writeFile(join(destination, 'release-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

export async function inspectReleaseContent(destination, policy) {
  const corpus = JSON.parse(await readFile(join(destination, 'generated/commons.json'), 'utf8'));
  const actual = corpus.entities.map(({ type, id }) => `${type}:${id}`).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...policy.entities].sort()))
    throw new Error('The compiled release differs from the approved live content inventory.');
  const failures = await inspectPublicBuild(join(destination, 'apps/web/build'));
  if (failures.length) throw new Error(failures.join('\n'));
  const report = JSON.parse(await readFile(join(destination, 'release-report.json'), 'utf8'));
  const builtFiles = await files(join(destination, 'apps/web/build'));
  for (const { key } of report.excluded) {
    const [type, id] = key.split(':');
    if (
      builtFiles.some(
        (file) => relative(join(destination, 'apps/web/build'), file) === `${type}/${id}.html`,
      )
    )
      throw new Error(`Held-back page in public output: ${key}`);
  }
  if (
    builtFiles.some((file) =>
      /\/(?:assets\/(?:photography|widgets)|diagrams\/songwriting)\//.test(file),
    )
  )
    throw new Error('Held-back content assets in public output.');
  const fingerprint = createHash('sha256');
  for (const file of builtFiles)
    fingerprint.update(relative(destination, file)).update(await readFile(file));
  return {
    entities: actual.length,
    publicFiles: builtFiles.length,
    sha256: fingerprint.digest('hex'),
  };
}

function run(command, args, cwd, env) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolveRun()
        : reject(new Error(`${command} ${args.join(' ')} failed (${code}).`)),
    );
  });
}

async function prepare() {
  if (process.argv.length > 2)
    throw new Error('This command accepts no publish or upload options.');
  const policy = JSON.parse(
    await readFile(join(repository, 'releases/site-improvements-2026-10-23.json'), 'utf8'),
  );
  const parent = join(repository, '.local/releases', policy.name);
  await mkdir(parent, { recursive: true });
  const destination = join(parent, new Date().toISOString().replace(/[:.]/g, '-'));
  console.log(`Preparing release copy: ${destination}`);
  const report = await stageSiteRelease(repository, destination, policy);
  console.log(
    `Retaining ${report.retained.length} live entities; excluding ${report.excluded.length} unreviewed entities and their assets.`,
  );
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PATTERNVERSE_INCLUDE_DRAFTS: 'false',
    VITE_RELEASE_PROFILE: 'core',
  };
  delete env.CLOUDFLARE_API_TOKEN;
  delete env.CLOUDFLARE_ACCOUNT_ID;
  // Carry only the existing public Dropbox identifier into the build.
  if (!env.PUBLIC_DROPBOX_APP_KEY) {
    for (const filename of ['.env', '.env.local', '.env.production', '.env.production.local']) {
      try {
        const local = await readFile(join(repository, 'apps/web', filename), 'utf8');
        const value = /^PUBLIC_DROPBOX_APP_KEY\s*=\s*["']?([^\s"'#]+)["']?\s*$/m.exec(local)?.[1];
        if (value) env.PUBLIC_DROPBOX_APP_KEY = value;
      } catch {
        /* CI can supply public configuration explicitly. */
      }
    }
  }
  if (!env.PUBLIC_DROPBOX_APP_KEY)
    throw new Error('The existing public Dropbox app identifier is required for this release.');
  try {
    for (const args of [
      ['validate:content'],
      ['compile:content:production'],
      ['--filter', '@patternverse/web', 'build'],
    ]) {
      await run('pnpm', args, destination, env);
      report.checks.push({ command: `pnpm ${args.join(' ')}`, result: 'passed' });
    }
    report.artifact = await inspectReleaseContent(destination, policy);
    report.checks.push({
      command: 'Approved content inventory and public artifact scan',
      result: 'passed',
    });
    report.status = 'built; verification pending';
  } catch (error) {
    report.status = 'failed';
    report.failure = error.message;
    throw error;
  } finally {
    await writeFile(
      join(destination, 'release-report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    await writeFile(
      join(parent, 'latest.json'),
      `${JSON.stringify({ destination, status: report.status }, null, 2)}\n`,
    );
    console.log(`Release report: ${join(destination, 'release-report.json')}`);
  }
  console.log('Release candidate built and content exclusions verified. Nothing was uploaded.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  prepare().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
