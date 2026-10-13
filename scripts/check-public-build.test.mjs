import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectPublicBuild } from './check-public-build.mjs';

test('rejects private files and recognizable credentials without disclosing values', async () => {
  const root = await mkdtemp(join(tmpdir(), 'patternverse-release-test-'));
  try {
    await mkdir(join(root, 'assets'));
    const synthetic = 'sk-or-v1-' + 'x'.repeat(40);
    await writeFile(join(root, 'assets', 'leak.js'), JSON.stringify(synthetic));
    await writeFile(join(root, '.env.local'), 'SYNTHETIC_SECRET=fixture');
    await writeFile(join(root, 'source.js.map'), '{}');
    const failures = await inspectPublicBuild(root);
    assert.equal(failures.length, 3);
    assert.ok(failures.every((failure) => !failure.includes(synthetic)));
  } finally {
    // Only removes the unique test directory created immediately above.
    await rm(root, { recursive: true, force: true });
  }
});

test('allows normal public assets and public application identifiers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'patternverse-release-test-'));
  try {
    await writeFile(join(root, 'app.js'), 'const publicDropboxAppKey = "public-identifier";');
    assert.deepEqual(await inspectPublicBuild(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects the local-only Pattern Markdown preview', async () => {
  const root = await mkdtemp(join(tmpdir(), 'patternverse-release-test-'));
  try {
    await writeFile(join(root, 'preview.js'), 'Local authoring preview · not a public page');
    assert.deepEqual(await inspectPublicBuild(root), ['preview.js: private show preview']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects personal studio pages, links, and bundled controls', async () => {
  const root = await mkdtemp(join(tmpdir(), 'patternverse-release-test-'));
  try {
    await writeFile(
      join(root, 'studio.html'),
      '<main class="illustration-studio">Private tool</main>',
    );
    await writeFile(join(root, 'app.js'), 'const label = "Make an illustration";');
    await writeFile(join(root, 'workspace.html'), '<a href="/tools/illustrations">Studio</a>');
    await writeFile(join(root, 'marks.js'), 'const label = "Pattern mark studio";');
    await writeFile(join(root, 'endpoint.js'), 'fetch("/__pattern-mark-studio/catalog")');
    const failures = await inspectPublicBuild(root);
    assert.equal(failures.length, 5);
    assert.ok(failures.every((failure) => failure.endsWith(': private illustration studio')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
