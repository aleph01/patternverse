import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { inspectReleaseContent, stageSiteRelease } from './prepare-site-release.mjs';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'patternverse-release-test-'));
  const source = join(root, 'source');
  const destination = join(source, '.local/candidate');
  for (const directory of [
    'content/patterns',
    'content/collections',
    'content/assets/widgets',
    'apps/web/static/diagrams/songwriting',
    'apps/web/src/lib/illustrations',
    'packages',
    '.local',
  ])
    await mkdir(join(source, directory), { recursive: true });
  const write = (path, body) => writeFile(join(source, path), body);
  await write(
    'content/patterns/existing.md',
    '---\nid: existing\ntype: pattern\nstatus: published\n---\nExisting article.\n',
  );
  await write(
    'content/patterns/unreviewed.md',
    '---\nid: unreviewed\ntype: pattern\nstatus: published\n---\nUnreviewed article.\n',
  );
  await write(
    'content/collections/existing-group.md',
    '---\nid: existing-group\ntype: collection\nstatus: published\nitems: [existing, unreviewed]\n---\nExisting collection.\n',
  );
  await write('content/assets/widgets/unreviewed.html', 'Unreviewed example');
  await write('apps/web/static/diagrams/songwriting/draft.svg', '<svg/>');
  await write('apps/web/static/offline.html', 'Existing offline page');
  await write(
    'apps/web/src/lib/illustrations/pattern-graphics.json',
    JSON.stringify({ graphics: [{ id: 'existing' }, { id: 'unreviewed' }] }),
  );
  await write('.env', 'PRIVATE_FIXTURE=never-copy-this');
  const policy = {
    name: 'fixture',
    entities: ['pattern:existing', 'collection:existing-group'],
    excludeContentAssets: true,
    excludeStaticDirectories: ['diagrams/songwriting'],
  };
  return { root, source, destination, policy };
}

test('release staging excludes published-but-unreviewed content, assets and artwork without editing the working project', async () => {
  const f = await fixture();
  try {
    const before = await readFile(join(f.source, 'content/collections/existing-group.md'), 'utf8');
    const report = await stageSiteRelease(f.source, f.destination, f.policy);
    assert.equal(report.published, false);
    assert.equal(report.excluded.length, 1);
    assert.deepEqual(await readdir(join(f.destination, 'content/patterns')), ['existing.md']);
    assert.deepEqual(await readdir(join(f.destination, 'content/assets/widgets')), []);
    assert.equal(
      await readFile(join(f.destination, 'content/assets/manifest.json'), 'utf8'),
      '{}\n',
    );
    assert.deepEqual(
      JSON.parse(
        await readFile(
          join(f.destination, 'apps/web/src/lib/illustrations/pattern-graphics.json'),
          'utf8',
        ),
      ).graphics,
      [{ id: 'existing' }],
    );
    await assert.rejects(readFile(join(f.destination, '.env')));
    await assert.rejects(readdir(join(f.destination, 'apps/web/static/diagrams/songwriting')));
    assert.doesNotMatch(
      await readFile(join(f.destination, 'content/collections/existing-group.md'), 'utf8'),
      /unreviewed/,
    );
    assert.equal(
      await readFile(join(f.source, 'content/collections/existing-group.md'), 'utf8'),
      before,
    );
    await assert.rejects(stageSiteRelease(f.source, f.destination, f.policy), /EEXIST/);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('release preparation fails when a live article would be lost', async () => {
  const f = await fixture();
  try {
    await assert.rejects(
      stageSiteRelease(f.source, f.destination, {
        ...f.policy,
        entities: [...f.policy.entities, 'pattern:missing'],
      }),
      /previously published entity/,
    );
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('artifact verification rejects leaked pages even when the compiler inventory is correct', async () => {
  const f = await fixture();
  try {
    await stageSiteRelease(f.source, f.destination, f.policy);
    await mkdir(join(f.destination, 'generated'));
    await mkdir(join(f.destination, 'apps/web/build/pattern'), { recursive: true });
    await writeFile(
      join(f.destination, 'generated/commons.json'),
      JSON.stringify({
        entities: [
          { type: 'pattern', id: 'existing' },
          { type: 'collection', id: 'existing-group' },
        ],
      }),
    );
    assert.equal((await inspectReleaseContent(f.destination, f.policy)).entities, 2);
    await writeFile(
      join(f.destination, 'apps/web/build/pattern/unreviewed.html'),
      'Leaked article',
    );
    await assert.rejects(inspectReleaseContent(f.destination, f.policy), /Held-back page/);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
