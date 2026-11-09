// Original shared-definition and online-copy drawing from executable window aggregation.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lightEditorial } from './ml-illustration-style.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const dom = new JSDOM(
  await readFile(resolve(root, 'content/assets/widgets/ml-feature-store.html'), 'utf8'),
  { runScripts: 'dangerously' },
);
try {
  const path = resolve(root, 'content/assets/manifest.json'),
    manifest = JSON.parse(await readFile(path, 'utf8'));
  for (const mobile of [false, true]) {
    const width = mobile ? 360 : 720,
      height = mobile ? 780 : 560;
    const body = dom.window
      .eval('mechanismGraphic(report,' + mobile + ')')
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '');
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      width +
      '" height="' +
      height +
      '" viewBox="0 0 ' +
      width +
      ' ' +
      height +
      '" role="img" aria-labelledby="title desc"><title id="title">Feature Store: shared meaning and different cutoffs</title><desc id="desc">Definition v1 counts available orders over sixty minutes. Historical retrieval at 09:40 gives seven orders. At serving time 10:05, the online copy published at 10:00 contains twelve orders and is five minutes old; recomputing from the source at 10:05 gives twenty. Values are computed from fictional events.</desc><rect width="' +
      width +
      '" height="' +
      height +
      '" fill="#fff"/><g transform="translate(' +
      (mobile ? 16 : 20) +
      ',20)">' +
      body +
      '</g></svg>';
    const asset = 'machine-learning/feature-store' + (mobile ? '-mobile' : '') + '.svg';
    await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
    manifest[asset] = { width, height };
  }
  await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
} finally {
  dom.window.close();
}
console.log('Rendered Feature Store desktop and phone diagrams from computed window counts.');
