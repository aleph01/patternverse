import { lightEditorial } from './ml-illustration-style.mjs';
// Original composition; the two fitted evaluation cards come from the executable explorer.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-leakage-safe-evaluation.html'),
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
  let chart;
  try {
    chart = dom.window.document.querySelector('svg').innerHTML;
  } finally {
    dom.window.close();
  }
  const width = mobile ? 360 : 720,
    height = mobile ? 1110 : 770,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 34, 26, 'Which customers', true) +
      text(left, 66, 26, 'are unseen?', true) +
      text(left, 94, 15, 'Same row counts. Different questions.')
    : text(left, 42, 29, 'Which customers are unseen?', true) +
      text(left, 75, 17, 'Same row counts. Different generalization questions.');
  body += box(left, 115, wide, 130);
  body += text(left + 12, 144, 17, 'Claim: predict for unseen customers.', true);
  body += text(left + 12, 174, 15, '8 customers · 2 visits per customer');
  body += text(left + 12, 201, 15, 'IDs:       A  B  C  D  E  F  G  H');
  body += text(left + 12, 228, 15, 'Labels:  0  1  0  1  0  1  0  1');
  const chartY = 275,
    chartHeight = mobile ? 560 : 280;
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
  const mechanism = mobile ? 865 : 585;
  body += box(left, mechanism, wide, mobile ? 150 : 110);
  body += text(left + 12, mechanism + 29, 17, 'Fit: store training ID labels.', true);
  if (mobile) {
    body += text(left + 12, mechanism + 59, 15, 'Unfamiliar ID? Use training majority.');
    body += text(left + 12, mechanism + 88, 15, 'Only the second design tests');
    body += text(left + 12, mechanism + 113, 15, 'IDs absent from fitting.');
    body += text(left + 12, mechanism + 138, 14, 'Ties predict zero; labels stay constant.');
    body += text(left, 1050, 14, 'Fictional data. Four grouped test customers.');
    body += text(left, 1076, 14, 'Identity separation alone does not test');
    body += text(left, 1098, 14, 'time drift or feature availability.');
  } else {
    body += text(
      left + 12,
      mechanism + 58,
      16,
      'Unfamiliar ID? Use the training majority; ties predict zero.',
    );
    body += text(
      left + 12,
      mechanism + 87,
      16,
      'Only the second design tests customer IDs absent from fitting.',
    );
    body += text(
      left,
      728,
      14,
      'Fictional data; stable labels; four grouped test customers, not eight independent entities.',
    );
    body += text(
      left,
      755,
      14,
      'Identity separation alone does not test time drift or feature availability.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">Two evaluation splits with equal row counts</title><desc id="desc">Eight fictional customers have two visits each. Holding out second visits shares eight customer IDs and the fitted ID lookup gets eight of eight correct. Holding out customers E through H shares no IDs and gets four of eight correct. Both train and test on eight rows, and both majority baselines get four of eight. The appropriate evaluation depends on whether the claim concerns known or unseen customers.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/leakage-safe-evaluation' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Leakage-Safe Evaluation desktop and phone illustrations.');
