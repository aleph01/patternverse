import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  navigationManifest,
  embedNavigationManifest,
  NAVIGATION_TOKEN,
} from './navigation-adapter.mjs';

test('fingerprints documents, page data and immutable search, excluding auth and unrelated endpoints', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'patternverse-navigation-'));
  try {
    await mkdir(join(directory, 'library'));
    await writeFile(join(directory, 'library.html'), 'document bytes');
    await writeFile(join(directory, 'library/__data.json'), 'data bytes');
    const searchPath = `/library/search/${createHash('sha256').update('search bytes').digest('hex')}.json`;
    await mkdir(join(directory, 'library/search'));
    await writeFile(join(directory, searchPath.slice(1)), 'search bytes');
    const prerendered = {
      pages: new Map([
        ['/app/library', { file: 'library.html' }],
        ['/app/auth/callback', { file: 'missing.html' }],
        ['/app/#section', { file: 'missing.html' }],
      ]),
      assets: new Map([
        ['/app/library/__data.json', { type: 'application/json' }],
        [`/app${searchPath}`, { type: 'application/json' }],
        ['/app/api/private', { type: 'application/json' }],
      ]),
      redirects: new Map([['/app/old', { status: 308, location: '/app/library' }]]),
    };
    const manifest = await navigationManifest(prerendered, directory, '/app');
    assert.deepEqual(manifest.pages, {
      '/library': createHash('sha256').update('document bytes').digest('base64'),
      '/library/__data.json': createHash('sha256').update('data bytes').digest('base64'),
      [searchPath]: createHash('sha256').update('search bytes').digest('base64'),
    });
    assert.deepEqual(manifest.redirects, { '/old': { status: 308, location: '/app/library' } });
    const output = embedNavigationManifest(`atob('${NAVIGATION_TOKEN}')`, manifest);
    assert.deepEqual(JSON.parse(Buffer.from(output.slice(6, -2), 'base64').toString()), manifest);
    assert.throws(() => embedNavigationManifest('missing placeholder', manifest));
    assert.throws(() => embedNavigationManifest(NAVIGATION_TOKEN.repeat(2), manifest));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
