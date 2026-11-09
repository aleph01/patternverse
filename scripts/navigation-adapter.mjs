import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const NAVIGATION_TOKEN = '__PATTERNVERSE_NAVIGATION_MANIFEST__';

/** Bind navigation bytes to the build, including its bootstrap/CSP hashes. */
export async function navigationManifest(prerendered, directory, base = '') {
  const pages = {};
  const redirects = {};
  const include = (path) => !path.includes('#') && !path.startsWith(`${base}/auth/`);
  const digest = async (file) =>
    createHash('sha256')
      .update(await readFile(resolve(directory, file)))
      .digest('base64');
  for (const [path, page] of prerendered.pages) {
    if (include(path)) pages[path.slice(base.length)] = await digest(page.file);
  }
  for (const [path] of prerendered.assets) {
    if (
      include(path) &&
      (path.endsWith('/__data.json') ||
        /^\/library\/search\/[a-f0-9]{64}\.json$/.test(path.slice(base.length)))
    )
      pages[path.slice(base.length)] = await digest(decodeURI(path.slice(base.length + 1)));
  }
  for (const [path, redirect] of prerendered.redirects) {
    if (include(path)) redirects[path.slice(base.length)] = redirect;
  }
  return { pages, redirects };
}

export function embedNavigationManifest(source, manifest) {
  if (source.split(NAVIGATION_TOKEN).length !== 2)
    throw new Error('Expected exactly one navigation manifest placeholder in the service worker.');
  return source.replace(NAVIGATION_TOKEN, Buffer.from(JSON.stringify(manifest)).toString('base64'));
}

/** @param {import('@sveltejs/kit').Adapter} adapter @returns {import('@sveltejs/kit').Adapter} */
export function withNavigationCache(adapter) {
  return {
    ...adapter,
    async adapt(builder) {
      const temporary = builder.getBuildDirectory('navigation-cache');
      builder.rimraf(temporary);
      try {
        builder.writePrerendered(temporary);
        const manifest = await navigationManifest(
          builder.prerendered,
          temporary,
          builder.config.kit.paths.base,
        );
        const worker = resolve(builder.getClientDirectory(), 'service-worker.js');
        await writeFile(worker, embedNavigationManifest(await readFile(worker, 'utf8'), manifest));
        await adapter.adapt(builder);
      } finally {
        builder.rimraf(temporary);
      }
    },
  };
}
