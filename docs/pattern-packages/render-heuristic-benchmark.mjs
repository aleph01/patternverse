// Original explanatory comparison derived from the explorer's actual default records.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lightEditorial } from './ml-illustration-style.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const dom = new JSDOM(
  await readFile(resolve(root, 'content/assets/widgets/ml-heuristic-benchmark.html'), 'utf8'),
  { runScripts: 'dangerously' },
);
try {
  const manifestPath = resolve(root, 'content/assets/manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  for (const mobile of [false, true]) {
    const width = mobile ? 360 : 720,
      height = mobile ? 820 : 550;
    const graphic = dom.window.eval('comparisonGraphic(report,' + mobile + ')');
    const inner = graphic.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    const title = mobile
      ? '<text x="16" y="28" font-size="25">More correct.</text><text x="16" y="59" font-size="25">More costly.</text>'
      : '<text x="20" y="38" font-size="28">More correct. More costly.</text>';
    const asset = 'machine-learning/heuristic-benchmark' + (mobile ? '-mobile' : '') + '.svg';
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      width +
      '" height="' +
      height +
      '" viewBox="0 0 ' +
      width +
      ' ' +
      height +
      '" role="img" aria-labelledby="title desc"><title id="title">Heuristic benchmark: compare the same deliveries</title><desc id="desc">At the default threshold and assigned penalties, the rule gets 17 of 20 right and costs 7 units. The candidate gets 18 right but costs 10 units. Each missed late delivery costs five units; each false alert costs one.</desc><rect width="' +
      width +
      '" height="' +
      height +
      '" fill="#fff"/>' +
      title +
      '<g transform="translate(' +
      (mobile ? 16 : 20) +
      ',' +
      (mobile ? 88 : 80) +
      ')">' +
      inner +
      '</g></svg>';
    await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
    manifest[asset] = { width, height };
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
} finally {
  dom.window.close();
}
console.log(
  'Rendered desktop and phone Heuristic Benchmark comparisons from the computed default.',
);
