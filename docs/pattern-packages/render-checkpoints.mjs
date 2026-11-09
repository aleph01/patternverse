// Original checkpoint state and continuation drawing from executable momentum updates.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lightEditorial } from './ml-illustration-style.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const dom = new JSDOM(
  await readFile(resolve(root, 'content/assets/widgets/ml-checkpoints.html'), 'utf8'),
  { runScripts: 'dangerously' },
);
try {
  const path = resolve(root, 'content/assets/manifest.json'),
    manifest = JSON.parse(await readFile(path, 'utf8'));
  for (const mobile of [false, true]) {
    const width = mobile ? 360 : 720,
      height = mobile ? 790 : 580;
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
      '" role="img" aria-labelledby="title desc"><title id="title">Checkpoints: preserve training state, not only weights</title><desc id="desc">A snapshot after three scalar updates contains weight 0.666, momentum minus 2.26, three completed updates and next target three. Complete restoration reproduces next weight 1.0124. Restoring only the weight resets momentum and data position and instead gives 0.6994. These are synthetic training calculations, not prediction-quality measurements.</desc><rect width="' +
      width +
      '" height="' +
      height +
      '" fill="#fff"/><g transform="translate(' +
      (mobile ? 16 : 20) +
      ',20)">' +
      body +
      '</g></svg>';
    const asset = 'machine-learning/checkpoints' + (mobile ? '-mobile' : '') + '.svg';
    await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
    manifest[asset] = { width, height };
  }
  await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
} finally {
  dom.window.close();
}
console.log('Rendered Checkpoints desktop and phone diagrams from training-state continuations.');
