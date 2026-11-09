import { lightEditorial } from './ml-illustration-style.mjs';
// Original composition: example cards and counts are produced by the executable test suite.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-behavioral-testing.html'),
  'utf8',
);
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const text = (x, y, size, value, bold = false) =>
  '<text x="' +
  x +
  '" y="' +
  y +
  '" font-size="' +
  size +
  '"' +
  (bold ? ' font-weight="700"' : '') +
  '>' +
  value +
  '</text>';
const box = (x, y, w, h) =>
  '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="#f2f6f2"/>';
for (const mobile of [false, true]) {
  const dom = new JSDOM(source, {
    runScripts: 'dangerously',
    beforeParse(window) {
      Object.defineProperty(window, 'innerWidth', { value: mobile ? 360 : 1000 });
    },
  });
  let chart, counts;
  try {
    chart = dom.window.document.querySelector('svg').innerHTML;
    counts = JSON.parse(dom.window.eval('JSON.stringify(counts(results))'));
  } finally {
    dom.window.close();
  }
  const width = mobile ? 360 : 720,
    height = mobile ? 1320 : 750,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 35, 26, 'What should change?', true) +
      text(left, 68, 26, 'What should stay?', true) +
      text(left, 97, 15, 'Three expectations. Different evidence.')
    : text(left, 42, 29, 'What should change? What should stay?', true) +
      text(left, 76, 17, 'Three expectations reveal different model behaviors.');
  body += box(left, 120, wide, 110) + text(left + 12, 149, 17, 'Fictional sentiment rule', true);
  body += text(left + 12, 179, 15, 'Ignores “not”; name shortcut weight = 1.');
  body += text(left + 12, 207, 15, 'Positive score ≥ 0.5 → positive label.');
  const chartY = 260,
    chartHeight = mobile ? 810 : 270;
  body +=
    '<svg x="' +
    left +
    '" y="' +
    chartY +
    '" width="' +
    wide +
    '" height="' +
    chartHeight +
    '" viewBox="0 0 ' +
    wide +
    ' ' +
    chartHeight +
    '">' +
    chart +
    '</svg>';
  const summary = mobile ? 1100 : 560;
  body += box(left, summary, wide, mobile ? 120 : 100);
  body += text(left + 12, summary + 29, 17, 'All seven selected cases', true);
  const values = [
    'Label: ' + counts.MFT.passed + '/' + counts.MFT.total,
    'Invariance: ' + counts.INV.passed + '/' + counts.INV.total,
    'Direction: ' + counts.DIR.passed + '/' + counts.DIR.total,
  ];
  if (mobile) {
    body += text(left + 12, summary + 59, 16, values[0] + ' · ' + values[1]);
    body += text(left + 12, summary + 87, 16, values[2] + ' · equality allowed');
    body += text(left, 1260, 14, 'Passing a relation can permit wrong answers.');
    body += text(left, 1287, 14, 'Constructed scores; no calibration or');
    body += text(left, 1309, 14, 'deployment accuracy is measured.');
  } else {
    body += text(left + 12, summary + 59, 17, values.join(' · '));
    body += text(
      left + 12,
      summary + 85,
      14,
      'The displayed cards show one case from each family.',
    );
    body += text(
      left,
      704,
      15,
      'Passing a relation can permit wrong answers. Keep labeled tests alongside paired checks.',
    );
    body += text(
      left,
      734,
      14,
      'Constructed scores, not calibrated probabilities or deployment accuracy.',
    );
  }
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    width +
    '" height="' +
    height +
    '" viewBox="0 0 ' +
    width +
    ' ' +
    height +
    '" role="img" aria-labelledby="title desc"><title id="title">Different behavioral expectations detect different failures</title><desc id="desc">The synthetic rule ignores negation and uses a name shortcut. A not-good negative labeled case fails at score 0.7311. Adding Mira changes 0.7311 to 0.8808 and fails score invariance within 0.02. Replacing good with not good leaves the score unchanged and passes the weaker non-increasing relation. Across seven selected cases the rule passes two of three label tests, zero of two invariance tests, and two of two directional tests.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/behavioral-testing' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Behavioral Testing desktop and phone illustrations.');
