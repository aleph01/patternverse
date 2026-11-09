import { lightEditorial } from './ml-illustration-style.mjs';
// Original fan-out/fan-in diagram generated from the executable local-training round.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-federated-learning.html'),
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
    height = mobile ? 1290 : 1050,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    chartHeight = mobile ? 750 : 510;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 34, 27, 'Train locally.', true) +
      text(left, 68, 27, 'Combine updates.', true) +
      text(left, 100, 15, 'One round; three separate data holders.')
    : text(left, 42, 29, 'Train locally. Combine updates.', true) +
      text(left, 78, 17, 'A common starting model → separate local steps → weighted aggregation.');
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
  const y = mobile ? 920 : 680;
  body +=
    '<rect x="' +
    left +
    '" y="' +
    y +
    '" width="' +
    wide +
    '" height="190" rx="8" fill="#f2f6f2"/>' +
    text(left + 12, y + 28, 17, 'Local steps change the path', true) +
    text(left + 12, y + 61, 15, 'Federated w ' + r.w.toFixed(6)) +
    text(left + 12, y + 94, 15, 'Centralized w ' + r.fullReference.toFixed(6)) +
    text(left + 12, y + 127, 14, 'Same eight records; same learning rate.') +
    text(left + 12, y + 160, 14, 'One local step matches at 0.225000.');
  body += mobile
    ? text(left, 1160, 14, 'Global training loss ' + r.loss.toFixed(4)) +
      text(left, 1194, 14, 'Client C loss: 0.5000 → ' + r.clientLosses[2].after.toFixed(4)) +
      text(left, 1240, 14, 'Fictional scalar model; values shown for teaching.') +
      text(left, 1272, 14, 'No secure aggregation or privacy noise.')
    : text(
        left,
        925,
        15,
        'Global training loss falls to ' +
          r.loss.toFixed(4) +
          '; client C rises from 0.5000 to ' +
          r.clientLosses[2].after.toFixed(4) +
          '.',
      ) +
      text(
        left,
        975,
        14,
        'Three parameter downloads + three uploads in this round; protocol overhead is excluded.',
      ) +
      text(
        left,
        1020,
        14,
        'Fictional scalar model · synchronous clients · no secure aggregation or differential privacy.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">Federated learning combines compatible local models from a common starting point</title><desc id="desc">A fictional server sends scalar model zero to clients A, B, and C. They hold four, two, and two local examples. After two full-batch gradient steps, they return models point one nine, one point two eight, and minus point one nine. Weighting by the included example counts gives shared model point three six seven five. Two centralized steps on the same records give point four one zero six two five. Global training loss decreases while client C loss increases. All values are displayed for explanation; no privacy protocol is simulated.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/federated-learning' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Federated Learning desktop and phone illustrations.');
