import { spawn } from 'node:child_process';
import { cp, mkdtemp, rename, rm } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectPublicBuild } from './check-public-build.mjs';

const web = fileURLToPath(new URL('../apps/web/', import.meta.url));

async function runWebTool(tool, args, env, label) {
  await new Promise((resolveTool, reject) => {
    const child = spawn(process.execPath, [resolve(web, tool), ...args], {
      cwd: web,
      env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolveTool();
      else reject(new Error(`${label} failed (${signal ?? code}).`));
    });
  });
}

export async function stagePublicRoutes(source, destination) {
  await cp(source, destination, {
    recursive: true,
    filter: (path) => {
      const route = relative(source, path).split(sep).join('/');
      return route !== 'apps/tender-wilds' && !route.startsWith('apps/tender-wilds/');
    },
  });
}

async function build() {
  // tsconfig.json extends the normal generated configuration, including in a
  // fresh checkout. Seed it before compiling into the isolated public cache.
  await runWebTool(
    'node_modules/@sveltejs/kit/svelte-kit.js',
    ['sync'],
    { ...process.env, PATTERNVERSE_PUBLIC_BUILD: 'false' },
    'SvelteKit sync',
  );
  const staged = resolve(web, 'src/.public-routes');
  // Reserve our own temporary directory; never move or delete the editable routes.
  const temporary = await mkdtemp(resolve(dirname(staged), '.public-routes-'));
  try {
    await stagePublicRoutes(resolve(web, 'src/routes'), temporary);
    // Fail if another build owns the staging directory instead of deleting its files.
    await rename(temporary, staged);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
  try {
    await runWebTool(
      'node_modules/vite/bin/vite.js',
      ['build'],
      { ...process.env, PATTERNVERSE_PUBLIC_BUILD: 'true' },
      'Public web build',
    );
    const failures = await inspectPublicBuild(resolve(web, 'build'));
    if (failures.length) throw new Error(`Public build rejected:\n${failures.join('\n')}`);
    console.log('Public web build checks passed.');
  } finally {
    await rm(staged, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
