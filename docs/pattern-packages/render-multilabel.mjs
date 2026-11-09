// Original independent label decisions drawn from executable set selection.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lightEditorial } from './ml-illustration-style.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const dom = new JSDOM(
  await readFile(resolve(root, 'content/assets/widgets/ml-multilabel.html'), 'utf8'),
  { runScripts: 'dangerously' },
);
try {
  const path = resolve(root, 'content/assets/manifest.json'),
    manifest = JSON.parse(await readFile(path, 'utf8'));
  for (const mobile of [false, true]) {
    const width = mobile ? 360 : 720,
      height = mobile ? 700 : 540;
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
      '" role="img" aria-labelledby="title desc"><title id="title">Multilabel: several label decisions for one input</title><desc id="desc">Ticket C has Billing score 0.70, Access score 0.20 and Delivery score 0.60. Separate threshold comparisons at 0.50 include Billing and Delivery, giving prediction one, zero, one. The fully reviewed target matches that set. Scores are fictional inputs; no model is trained.</desc><rect width="' +
      width +
      '" height="' +
      height +
      '" fill="#fff"/><g transform="translate(' +
      (mobile ? 16 : 20) +
      ',20)">' +
      body +
      '</g></svg>';
    const asset = 'machine-learning/multilabel' + (mobile ? '-mobile' : '') + '.svg';
    await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
    manifest[asset] = { width, height };
  }
  await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
} finally {
  dom.window.close();
}
console.log('Rendered Multilabel desktop and phone diagrams from computed label selections.');
