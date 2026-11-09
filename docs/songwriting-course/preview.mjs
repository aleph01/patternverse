import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.SONGWRITING_PREVIEW_PORT ?? 5181);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid review port');

const repository = fileURLToPath(new URL('../../', import.meta.url));
const snapshot = await mkdtemp(join(tmpdir(), 'patternverse-songwriting-'));
const web = join(snapshot, 'apps/web');

// Keep both the corpus and SvelteKit's generated files separate from concurrent
// authoring/public builds. The editable repository and its publication stay intact.
try {
  await mkdir(web, { recursive: true });
  for (const file of ['package.json', 'patternverse.yaml']) {
    await cp(join(repository, file), join(snapshot, file));
  }
  await mkdir(join(snapshot, 'scripts'));
  await mkdir(join(snapshot, 'docs/songwriting-course'), { recursive: true });
  for (const file of ['examples.json', 'listening-pilot.json']) {
    await cp(
      join(repository, 'docs/songwriting-course', file),
      join(snapshot, 'docs/songwriting-course', file),
    );
  }
  await mkdir(join(snapshot, 'content/assets'), { recursive: true });
  await cp(
    join(repository, 'content/assets/manifest.json'),
    join(snapshot, 'content/assets/manifest.json'),
  );
  await cp(
    join(repository, 'scripts/navigation-adapter.mjs'),
    join(snapshot, 'scripts/navigation-adapter.mjs'),
  );
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
  await symlink(join(repository, 'node_modules'), join(snapshot, 'node_modules'), 'dir');
  await symlink(join(repository, 'apps/web/node_modules'), join(web, 'node_modules'), 'dir');
  for (const directory of ['collections', 'concepts', 'patterns', 'verses']) {
    const destination = join(snapshot, 'content', directory);
    await mkdir(destination, { recursive: true });
    for (const file of await readdir(join(repository, 'content', directory))) {
      if (file.startsWith('songwriting-') || (directory === 'verses' && file === 'music.md')) {
        await cp(join(repository, 'content', directory, file), join(destination, file));
      }
    }
  }

  console.log(
    `Unpublished songwriting review: http://localhost:${port}/collection/songwriting-course`,
  );
  console.log(`Isolated course snapshot: ${snapshot}`);
  console.log('Restart this preview to pick up editorial changes.');
  const environment = { ...process.env };
  environment.PATTERNVERSE_MUSIC_LESSON_ROOT = join(repository, '.local/music-lessons');
  delete environment.PATTERNVERSE_PUBLIC_BUILD;
  const child = spawn(
    process.execPath,
    [
      resolve(repository, 'apps/web/node_modules/vite/bin/vite.js'),
      'dev',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
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
