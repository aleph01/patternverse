import { lightEditorial } from './ml-illustration-style.mjs';
// Original responsive composition, sharing executable routing and gate results with the explorer.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-canary-rollout-with-rollback.html'),
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
for (const mobile of [false, true]) {
  const dom = new JSDOM(source, {
    runScripts: 'dangerously',
    beforeParse(window) {
      Object.defineProperty(window, 'innerWidth', { value: mobile ? 360 : 1000 });
    },
  });
  let chart, result;
  try {
    chart = dom.window.document.querySelector('#mechanism').innerHTML;
    result = JSON.parse(dom.window.eval('JSON.stringify(report)'));
  } finally {
    dom.window.close();
  }
  chart = chart
    .replaceAll('var(--ink)', '#24372f')
    .replaceAll('var(--panel)', '#f2f6f2')
    .replaceAll('var(--band)', '#c8e1d2')
    .replaceAll('var(--accent)', '#28684d');
  const width = mobile ? 360 : 720,
    height = mobile ? 1030 : 730,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    chartHeight = mobile ? 620 : 300;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 34, 27, 'Release in stages.', true) +
      text(left, 68, 27, 'Keep a return path.', true) +
      text(left, 100, 15, 'A canary serves real user requests.')
    : text(left, 42, 30, 'Release in stages. Keep a return path.', true) +
      text(left, 78, 17, 'A canary serves real user requests; rollback changes future routing.');
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
  const y = mobile ? 790 : 470,
    last = result.last;
  body +=
    '<rect x="' +
    left +
    '" y="' +
    y +
    '" width="' +
    wide +
    '" height="155" rx="8" fill="#f2f6f2"/>' +
    text(left + 12, y + 28, 17, 'Separate the release metrics', true) +
    text(
      left + 12,
      y + 61,
      15,
      'Window 2: combined ' + (last.failures + last.controlFailures) + '/100 = 5%',
    ) +
    text(
      left + 12,
      y + 94,
      15,
      'Candidate alone: ' + last.failures + '/' + last.n + ' = 12%',
      true,
    ) +
    text(left + 12, y + 127, 14, 'The candidate breaches its 5% failure limit.');
  body += mobile
    ? text(left, 984, 14, 'Fictional gates; no confidence guarantee.') +
      text(left, 1015, 14, 'No extra rollback window in this preview.')
    : text(
        left,
        671,
        15,
        'Thirty-five candidate requests have already been served; recovery cannot undo them.',
      ) +
      text(
        left,
        710,
        14,
        'Fictional replay · complete labels · warm incumbent · no in-flight work or rollback lag.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">A staged canary release rolls back when candidate failures exceed its limit</title><desc id="desc">A fictional ten-percent first window serves ten candidate requests and passes. A twenty-five-percent second window serves twenty-five candidate requests; three fail, exceeding a five-percent serving failure limit. Future requests return to the incumbent. Thirty-five of two hundred requests have already reached the candidate. The combined second-window failure rate is five percent, hiding the candidate twelve-percent failure rate. No rollback lag is assumed.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset =
    'machine-learning/canary-rollout-with-rollback' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Canary Rollout with Rollback desktop and phone illustrations.');
