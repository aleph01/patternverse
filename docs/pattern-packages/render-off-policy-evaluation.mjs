import { lightEditorial } from './ml-illustration-style.mjs';
// Original responsive estimator composition sharing the executable sample and corrections.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-off-policy-evaluation.html'),
  'utf8',
);
const manifestPath = resolve(root, 'content/assets/manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
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
for (const mobile of [false, true]) {
  const dom = new JSDOM(source, {
    runScripts: 'dangerously',
    beforeParse(window) {
      Object.defineProperty(window, 'innerWidth', { value: mobile ? 360 : 1000 });
    },
  });
  let chart, r;
  try {
    chart = dom.window.document.querySelector('#mechanism').innerHTML;
    r = JSON.parse(dom.window.eval('JSON.stringify(report)'));
  } finally {
    dom.window.close();
  }
  chart = chart
    .replaceAll('var(--ink)', '#24372f')
    .replaceAll('var(--panel)', '#f2f6f2')
    .replaceAll('var(--band)', '#c8e1d2')
    .replaceAll('var(--accent)', '#28684d');
  const width = mobile ? 360 : 720,
    height = mobile ? 1180 : 800,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    chartHeight = mobile ? 740 : 360;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 34, 27, 'Estimate a policy.', true) +
      text(left, 68, 27, 'Check the evidence.', true) +
      text(left, 100, 15, 'Model predictions meet logged outcomes.')
    : text(left, 42, 29, 'Estimate a policy. Check the evidence.', true) +
      text(
        left,
        78,
        17,
        'Doubly robust estimation corrects a reward model using observed feedback.',
      );
  body +=
    '<svg x="' +
    left +
    '" y="125" width="' +
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
  const y = mobile ? 910 : 530;
  body +=
    '<rect x="' +
    left +
    '" y="' +
    y +
    '" width="' +
    wide +
    '" height="155" rx="8" fill="#f2f6f2"/>' +
    text(left + 12, y + 28, 17, 'A sample differs from its expectation', true) +
    text(left + 12, y + 61, 15, 'Sample DR ' + r.dr.toFixed(5)) +
    text(left + 12, y + 94, 15, 'Exact toy expected DR ' + r.expectation.dr.toFixed(5)) +
    text(left + 12, y + 127, 14, 'Known only in this synthetic world.');
  body += mobile
    ? text(left, 1120, 14, 'Correct propensities; approximate reward model.') +
      text(left, 1154, 14, 'Eight fictional rows; no confidence interval.')
    : text(
        left,
        735,
        15,
        'IPS ' +
          r.ips.toFixed(5) +
          ' · DM ' +
          r.dm.toFixed(5) +
          ' · a rare outcome can drive the correction.',
      ) +
      text(
        left,
        775,
        14,
        'Eight fictional rows · correct propensities · approximate model · no confidence interval.',
      );
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    width +
    '" height="' +
    height +
    '" viewBox="0 0 ' +
    width +
    ' ' +
    height +
    '" role="img" aria-labelledby="title desc"><title id="title">Off-policy evaluation combines reward predictions and weighted residual corrections</title><desc id="desc">A fictional eight-row sample has direct reward-model average point seven. The mean importance-weighted residual correction is minus point four six eight seven five, giving doubly robust estimate point two three one two five. A rare observed B failure has weight five and individual corrected row minus three point two. The corresponding exact toy expectation is point six two five; only the invented potential outcomes make that expectation directly computable. No confidence interval or deployment effect is claimed.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/off-policy-evaluation' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Off-Policy Evaluation desktop and phone illustrations.');
