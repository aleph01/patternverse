// Local draft preview with its own SvelteKit output and a frozen Markdown snapshot.
import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const snapshot = await mkdtemp(join(tmpdir(), 'patternverse-segmentation-'));
const web = join(snapshot, 'apps/web');
const port = '5198';

try {
  await mkdir(web, { recursive: true });
  for (const file of ['package.json', 'patternverse.yaml']) {
    await cp(join(repository, file), join(snapshot, file));
  }
  await mkdir(join(snapshot, 'scripts'));
  await cp(
    join(repository, 'scripts/navigation-adapter.mjs'),
    join(snapshot, 'scripts/navigation-adapter.mjs'),
  );
  await mkdir(join(snapshot, 'docs/songwriting-course'), { recursive: true });
  for (const file of ['examples.json', 'listening-pilot.json']) {
    await cp(
      join(repository, 'docs/songwriting-course', file),
      join(snapshot, 'docs/songwriting-course', file),
    );
  }
  await cp(
    join(repository, 'apps/article-contributions/src'),
    join(snapshot, 'apps/article-contributions/src'),
    { recursive: true },
  );
  for (const file of ['package.json', 'vite.config.ts', 'tsconfig.json']) {
    await cp(join(repository, 'apps/web', file), join(web, file));
  }
  await cp(join(repository, 'apps/web/svelte.config.js'), join(web, 'preview-base.config.js'));
  await writeFile(
    join(web, 'svelte.config.js'),
    `import config from './preview-base.config.js';
export default { ...config, kit: { ...config.kit, serviceWorker: { ...config.kit.serviceWorker, register: false } } };
`,
  );
  for (const directory of ['src', 'static']) {
    await cp(join(repository, 'apps/web', directory), join(web, directory), {
      recursive: true,
      filter: (path) => !basename(path).startsWith('.public-routes'),
    });
  }
  await mkdir(join(snapshot, 'content'));
  for (const directory of ['collections', 'concepts', 'patterns', 'practices', 'verses']) {
    await cp(join(repository, 'content', directory), join(snapshot, 'content', directory), {
      recursive: true,
    });
  }
  // Copy assets too: unrelated concurrent illustration edits must not reload this preview.
  // No publication or source asset is changed.
  await cp(join(repository, 'content/assets'), join(snapshot, 'content/assets'), {
    recursive: true,
  });
  await symlink(join(repository, 'node_modules'), join(snapshot, 'node_modules'), 'dir');
  await symlink(join(repository, 'apps/web/node_modules'), join(web, 'node_modules'), 'dir');
  console.log(`Draft article: http://127.0.0.1:${port}/pattern/engineering-segmentation`);
  console.log(`Isolated snapshot: ${snapshot}`);
  console.log('Restart this preview to pick up Markdown changes.');
  const environment = { ...process.env };
  delete environment.PATTERNVERSE_PUBLIC_BUILD;
  const child = spawn(
    process.execPath,
    [
      resolve(repository, 'apps/web/node_modules/vite/bin/vite.js'),
      'dev',
      '--host',
      '127.0.0.1',
      '--port',
      port,
      '--strictPort',
    ],
    { cwd: web, env: environment, stdio: 'inherit' },
  );
  const stop = () => child.kill('SIGTERM');
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  process.exitCode = await new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolveExit(signal ? 0 : (code ?? 1)));
  });
} finally {
  await rm(snapshot, { recursive: true, force: true });
}
