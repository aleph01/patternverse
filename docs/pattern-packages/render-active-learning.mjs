import { lightEditorial } from './ml-illustration-style.mjs';
// Render actual initial and two-query states into authored desktop and phone compositions.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-active-learning.html'),
  'utf8',
);
const dom = new JSDOM(source, {
  runScripts: 'dangerously',
  beforeParse(window) {
    Object.defineProperty(window, 'innerWidth', { value: 360 });
  },
});
const snapshots = [];
try {
  for (const round of [0, 2]) {
    while (dom.window.eval('session.round') < round)
      dom.window.document.querySelector('#next').click();
    snapshots.push(dom.window.document.querySelector('svg').innerHTML);
  }
} finally {
  dom.window.close();
}

const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const mobile of [false, true]) {
  const width = mobile ? 360 : 720;
  const height = mobile ? 1100 : 650;
  const title = mobile
    ? '<text x="16" y="33" font-size="24" font-weight="700">Choose what to label next</text><text x="16" y="60" font-size="14">The same model. The same label budget.</text>'
    : '<text x="20" y="37" font-size="29" font-weight="700">Choose what to label next</text><text x="20" y="68" font-size="16">Two strategies start with two labels, then each requests two more.</text>';
  const panels = snapshots
    .map((body, i) => {
      const x = mobile ? 16 : 20 + i * 352;
      const y = mobile ? (i ? 570 : 105) : 120;
      return `<g transform="translate(${x},${y})"><text font-size="20" font-weight="700">${i ? 'After two queries' : 'Before querying'}</text><text y="25" font-size="14">${i ? '4 training labels per strategy' : '2 training labels per strategy'}</text><svg y="43" width="328" height="370" viewBox="0 0 328 370">${body}</svg></g>`;
    })
    .join('');
  const foot = mobile
    ? '<text x="16" y="1035" font-size="14">Solid: fitted cutoff. Dashed: truth.</text><text x="16" y="1060" font-size="14">Shading: possible cutoffs after labeling.</text><text x="16" y="1085" font-size="13">Synthetic, noiseless scenario; random seed 2026.</text>'
    : '<text x="20" y="580" font-size="15">Solid: fitted cutoff. Dashed: truth. Shading: possible cutoffs after labeling.</text><text x="20" y="610" font-size="14">Synthetic, noiseless scenario; true cutoff 63, random seed 2026, 200 separate test scores.</text><text x="20" y="635" font-size="14">These intervals describe model consistency, not statistical confidence.</text>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">Active learning with the same labeling budget</title><desc id="desc">Before querying, both fitted cutoffs are 50 and both classify 174 of 200 separate test scores correctly. With two extra labels per strategy, uncertainty selection fits 62.5 and gets 199 correct; seeded random selection fits 53 and gets 180 correct. The simulator's true cutoff is 63.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style><rect width="${width}" height="${height}" fill="#fff"/>${title}${panels}${foot}</svg>\n`;
  const asset = `machine-learning/active-learning-label-budget${mobile ? '-mobile' : ''}.svg`;
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Rendered Active Learning desktop and phone illustrations.');
