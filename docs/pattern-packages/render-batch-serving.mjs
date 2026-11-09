// Original batch publication drawing from computed predictions and active-set lookups.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lightEditorial } from './ml-illustration-style.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const dom = new JSDOM(
  await readFile(resolve(root, 'content/assets/widgets/ml-batch-serving.html'), 'utf8'),
  { runScripts: 'dangerously' },
);
try {
  const path = resolve(root, 'content/assets/manifest.json'),
    manifest = JSON.parse(await readFile(path, 'utf8'));
  for (const mobile of [false, true]) {
    const width = mobile ? 360 : 720,
      height = mobile ? 870 : 610;
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
      '" role="img" aria-labelledby="title desc"><title id="title">Batch Serving: score, publish and look up prepared predictions</title><desc id="desc">Four candidate prediction records pass an exact-key publication check. Run R8 uses inputs cut off at 08:00 and publishes at 08:20. At 08:30, a lookup for merchant A returns nine items with an input-cutoff age of thirty minutes and publication age ten minutes.</desc><rect width="' +
      width +
      '" height="' +
      height +
      '" fill="#fff"/><g transform="translate(' +
      (mobile ? 16 : 20) +
      ',20)">' +
      body +
      '</g></svg>';
    const asset = 'machine-learning/batch-serving' + (mobile ? '-mobile' : '') + '.svg';
    await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
    manifest[asset] = { width, height };
  }
  await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
} finally {
  dom.window.close();
}
console.log(
  'Rendered Batch Serving desktop and phone diagrams from prediction publication and lookup rules.',
);
