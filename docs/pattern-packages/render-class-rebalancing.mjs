// Original class-mass and fitted-score comparison from the executable teaching model.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lightEditorial } from './ml-illustration-style.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const dom = new JSDOM(
  await readFile(resolve(root, 'content/assets/widgets/ml-class-rebalancing.html'), 'utf8'),
  { runScripts: 'dangerously' },
);
try {
  const path = resolve(root, 'content/assets/manifest.json'),
    manifest = JSON.parse(await readFile(path, 'utf8'));
  for (const mobile of [false, true]) {
    const width = mobile ? 360 : 720,
      height = mobile ? 860 : 580;
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
      '" role="img" aria-labelledby="title desc"><title id="title">Class Rebalancing: same records, different training influence</title><desc id="desc">The original 900 ordinary and 100 defect records receive equal total class weight when defect weight is nine. Independently fitted group scores change from 0.012, 0.198, 0.886 to 0.100, 0.690, 0.986. The middle group crosses threshold 0.5. Data are invented; these are training calculations, not held-out performance.</desc><rect width="' +
      width +
      '" height="' +
      height +
      '" fill="#fff"/><g transform="translate(' +
      (mobile ? 16 : 20) +
      ',20)">' +
      body +
      '</g></svg>';
    const asset = 'machine-learning/class-rebalancing' + (mobile ? '-mobile' : '') + '.svg';
    await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
    manifest[asset] = { width, height };
  }
  await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
} finally {
  dom.window.close();
}
console.log('Rendered Class Rebalancing desktop and phone diagrams from the exact weighted fit.');
