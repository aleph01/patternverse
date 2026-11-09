import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stagePublicRoutes } from './build-public-web.mjs';
import { inspectPublicBuild } from './check-public-build.mjs';

test('stages public routes while keeping the unpublished game only in the original source', async () => {
  const root = await mkdtemp(join(tmpdir(), 'patternverse-public-routes-'));
  try {
    const source = join(root, 'routes');
    const destination = join(root, 'staged');
    for (const route of ['apps/tender-wilds', 'mira', 'pattern/[id]']) {
      await mkdir(join(source, route), { recursive: true });
      await writeFile(join(source, route, '+page.svelte'), route);
    }
    await writeFile(join(source, '+layout.svelte'), "import '../app.css';");
    await stagePublicRoutes(source, destination);
    assert.deepEqual(await readdir(join(destination, 'apps')), []);
    assert.equal(await readFile(join(destination, 'mira/+page.svelte'), 'utf8'), 'mira');
    assert.equal(
      await readFile(join(destination, 'pattern/[id]/+page.svelte'), 'utf8'),
      'pattern/[id]',
    );
    assert.equal(
      await readFile(join(destination, '+layout.svelte'), 'utf8'),
      "import '../app.css';",
    );
    assert.equal(
      await readFile(join(source, 'apps/tender-wilds/+page.svelte'), 'utf8'),
      'apps/tender-wilds',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects an unpublished game route or its bundled game code', async () => {
  const root = await mkdtemp(join(tmpdir(), 'patternverse-public-routes-'));
  try {
    await mkdir(join(root, 'apps'));
    await writeFile(join(root, 'apps/tender-wilds.html'), '<main>Game</main>');
    await writeFile(join(root, 'game.js'), 'const title = "Tender Wilds";');
    assert.deepEqual(await inspectPublicBuild(root), [
      'apps/tender-wilds.html: unpublished Tender Wilds route',
      'game.js: unpublished Tender Wilds app',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
