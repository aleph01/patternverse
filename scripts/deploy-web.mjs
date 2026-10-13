import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const help = `Publish Patternverse to Cloudflare Pages.

  pnpm deploy:web                 Build, check public assets, and publish to production
  pnpm deploy:web --build-only    Build and check without contacting Cloudflare

Requires an existing Pages project (default: patternverse; override with
CLOUDFLARE_PAGES_PROJECT). Production branch: main.
Local use supports Wrangler login. CI requires CLOUDFLARE_API_TOKEN and
CLOUDFLARE_ACCOUNT_ID. See docs/web-deployment.md for the one-time setup.
`;

function execute(command, args, options) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { ...options, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} failed (${signal ?? code}). Publishing stopped.`));
    });
  });
}

export async function runDeployment({
  args = process.argv.slice(2),
  env = process.env,
  run = execute,
  log = console.log,
} = {}) {
  const flags = args.filter((arg) => arg !== '--');
  if (flags.some((arg) => !['--build-only', '--help', '-h'].includes(arg))) {
    throw new Error('Unknown option. Use pnpm deploy:web --help.');
  }
  if (flags.includes('--help') || flags.includes('-h')) {
    log(help);
    return;
  }
  const buildOnly = flags.includes('--build-only');
  if (!buildOnly && env.CI && (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID)) {
    throw new Error('Configure CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID before publishing.');
  }
  const project = env.CLOUDFLARE_PAGES_PROJECT || 'patternverse';
  if (!/^[a-z0-9][a-z0-9-]*$/.test(project)) {
    throw new Error('CLOUDFLARE_PAGES_PROJECT must be a valid Pages project name.');
  }
  // Publishing credentials are needed only by Wrangler, never by the web build.
  const buildEnv = { ...env, NODE_ENV: 'production', PATTERNVERSE_INCLUDE_DRAFTS: 'false' };
  delete buildEnv.CLOUDFLARE_API_TOKEN;
  delete buildEnv.CLOUDFLARE_ACCOUNT_ID;
  for (const task of ['validate:content', 'compile:content:production', 'build']) {
    log(`Running ${task}…`);
    await run('pnpm', [task], { cwd: root, env: buildEnv });
  }
  await run(process.execPath, [resolve(root, 'scripts/check-public-build.mjs'), 'apps/web/build'], {
    cwd: root,
    env: buildEnv,
  });
  if (buildOnly) {
    log('Production build checked. Nothing was uploaded.');
    return;
  }
  log(`Publishing to ${project} (production)…`);
  const deployArgs = [
    resolve(root, 'node_modules/wrangler/bin/wrangler.js'),
    'pages',
    'deploy',
    'build',
    '--project-name',
    project,
    '--branch',
    'main',
  ];
  if (env.GITHUB_SHA) deployArgs.push('--commit-hash', env.GITHUB_SHA);
  await run(process.execPath, deployArgs, { cwd: resolve(root, 'apps/web'), env });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runDeployment().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
