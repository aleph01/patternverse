import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectPublicBuild } from './check-public-build.mjs';

test('rejects HTML from a different build before its client can crash during startup', async () => {
  const root = await mkdtemp(join(tmpdir(), 'patternverse-startup-test-'));
  try {
    await writeFile(join(root, 'client.js'), 'globalThis.__sveltekit_current.data;');
    await writeFile(join(root, 'article.html'), '<script>__sveltekit_other = {base: ""};</script>');
    assert.deepEqual(await inspectPublicBuild(root), [
      'article.html: startup identifier does not match the client build',
    ]);
    await writeFile(
      join(root, 'article.html'),
      '<script>__sveltekit_current = {base: ""};</script>',
    );
    assert.deepEqual(await inspectPublicBuild(root), []);
    await writeFile(join(root, 'client.js'), '// Missing SvelteKit startup code');
    assert.deepEqual(await inspectPublicBuild(root), [
      'article.html: startup identifier does not match the client build',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

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

test('allows long public URL fragments containing ask while still rejecting API-key tokens', async () => {
  const root = await mkdtemp(join(tmpdir(), 'patternverse-release-test-'));
  try {
    const publicUrl =
      'https://www.nice.org.uk/guidance/ph50/chapter/Recommendations#recommendation-6-ensure-trained-staff-ask-people-about-domestic-violence-and-abuse';
    await writeFile(join(root, 'reference.html'), `<a href="${publicUrl}">Source</a>`);
    assert.deepEqual(await inspectPublicBuild(root), []);
    for (const prefix of ['sk-', 'sk-proj-']) {
      await writeFile(join(root, 'key.json'), JSON.stringify({ key: prefix + 'x'.repeat(48) }));
      assert.deepEqual(await inspectPublicBuild(root), ['key.json: possible credential']);
    }
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
