import { lightEditorial } from './ml-illustration-style.mjs';
// Original diagram composed from the actual fitted models and exact subset solver.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-decision-focused-learning.html'),
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
  let chart, result;
  try {
    chart = dom.window.document.querySelector('svg').innerHTML;
    result = JSON.parse(dom.window.eval('JSON.stringify(fitted)'));
  } finally {
    dom.window.close();
  }
  const width = mobile ? 360 : 720,
    height = mobile ? 1180 : 800,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(16, 33, 26, 'Lower error can', true) +
      text(16, 64, 26, 'mean worse decisions.', true) +
      text(16, 91, 14, 'An exact three-job training example.')
    : text(20, 40, 29, 'Lower error can mean worse decisions.', true) +
      text(20, 73, 16, 'Same predictor family. Same optimizer. Different fitting objective.');
  body +=
    box(left, 110, wide, 180) +
    text(
      left + 12,
      140,
      17,
      'Budget: ' + result.budget + ' units · best true benefit: ' + result.oracle.value,
      true,
    );
  const cols = mobile ? [12, 110, 220] : [12, 260, 490];
  ['Job', 'Units', 'True benefit'].forEach(
    (label, i) => (body += text(left + cols[i], 175, 15, label, true)),
  );
  ['A', 'B', 'C'].forEach((name, i) => {
    [name, [2, 2, 3][i], result.truth[i]].forEach(
      (value, j) => (body += text(left + cols[j], 205 + i * 28, 17, value, true)),
    );
  });
  const chartY = mobile ? 350 : 330,
    chartHeight = mobile ? 480 : 240,
    chartWidth = mobile ? 328 : 680;
  body +=
    '<svg x="' +
    left +
    '" y="' +
    chartY +
    '" width="' +
    chartWidth +
    '" height="' +
    chartHeight +
    '" viewBox="0 0 ' +
    chartWidth +
    ' ' +
    chartHeight +
    '">' +
    chart +
    '</svg>';
  const mechanism = mobile ? 895 : 620;
  body += box(left, mechanism, wide, mobile ? 130 : 100);
  body += text(left + 12, mechanism + 29, 17, 'Both search 21 candidate values.', true);
  body += text(left + 12, mechanism + 59, 16, 'Decisions use predicted benefits.');
  body += text(left + 12, mechanism + 88, 16, 'Regret uses true benefits.');
  if (mobile) {
    body += text(left, 1090, 14, 'One fictional training instance.');
    body += text(left, 1118, 14, 'No held-out generalization is measured.');
    body += text(left, 1150, 13, 'Additive benefits; indivisible jobs; exact solves.');
  } else {
    body += text(
      left,
      754,
      14,
      'One fictional training instance. Neither fit is evaluated on unseen cases.',
    );
    body += text(
      left,
      782,
      13,
      'Additive benefits; indivisible jobs; exact solves; deterministic optimizer and parameter ties.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">Decision-focused learning compared with prediction-error fitting</title><desc id="desc">Jobs A, B, C use 2, 2, 3 units and have true benefits 6, 5, 10. At capacity four, the best subset A plus B is worth eleven. MSE fitting selects theta 0.1, MSE 0.2475, and job C with regret one. Regret fitting selects theta 1.1, MSE 1.7808, and jobs A plus B with regret zero. Both fit the same 21 candidates to one training case.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/decision-focused-learning' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Decision-Focused Learning desktop and phone illustrations.');
