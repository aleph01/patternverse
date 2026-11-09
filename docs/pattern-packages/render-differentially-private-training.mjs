import { lightEditorial } from './ml-illustration-style.mjs';
// Original illustration derived from the executable fictional clipping and accounting example.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-differentially-private-training.html'),
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
    height = mobile ? 1260 : 860,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    chartHeight = mobile ? 850 : 465;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 35, 27, 'Bound. Perturb.', true) +
      text(left, 70, 27, 'Account.', true) +
      text(left, 103, 14, 'One fictional update; a separate privacy ledger.')
    : text(left, 42, 29, 'Bound. Perturb. Account.', true) +
      text(left, 80, 17, 'Clip each contribution before adding calibrated noise to the sum.');
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
  const y = mobile ? 1010 : 635;
  body +=
    '<rect x="' +
    left +
    '" y="' +
    y +
    '" width="' +
    wide +
    '" height="125" rx="8" fill="#f2f6f2"/>' +
    text(left + 12, y + 30, 17, 'Repeated access costs privacy', true) +
    text(left + 12, y + 62, 15, '1 access: ε bound ' + r.epsilon.toFixed(4)) +
    text(
      left + 12,
      y + 94,
      15,
      '4 accesses: ε bound ' + (0.5 + 2 * Math.sqrt(0.5 * Math.log(100000))).toFixed(4),
    );
  body += mobile
    ? text(left, 1170, 14, 'Fixed public noise values teach the arithmetic.') +
      text(left, 1203, 14, 'They provide no privacy protection.') +
      text(left, 1236, 13, 'Bound assumes fresh Gaussian noise; δ = 0.00001.')
    : text(
        left,
        798,
        14,
        'Fixed public replay values teach arithmetic and provide no privacy protection.',
      ) +
      text(
        left,
        832,
        14,
        'The bound assumes fresh Gaussian noise, replace-one adjacency, and no subsampling.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">Clipping, Gaussian perturbation, and privacy accounting are distinct steps</title><desc id="desc">Four fictional two-dimensional gradients are clipped at norm one. Their sum is minus point four, one point three. Fixed replay noise one, minus two gives mean point one five, minus point one seven five, and parameter update minus point zero one five, point zero one seven five. This deterministic replay is not private. Separately, fresh Gaussian noise with standard deviation four, replace-one-record sensitivity two, and delta one in one hundred thousand gives converted epsilon bound two point five two four three for one full-batch access and five point two nine eight five for four accesses.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset =
    'machine-learning/differentially-private-training' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Differentially Private Training desktop and phone illustrations.');
