import { lightEditorial } from './ml-illustration-style.mjs';
// Original composition from executable validation findings and batch disposition.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-schema-based-data-validation.html'),
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
  let chart, chartHeight, result;
  try {
    const svg = dom.window.document.querySelector('#mechanism');
    chart = svg.innerHTML;
    chartHeight = Number(svg.getAttribute('viewBox').split(' ')[3]);
    result = JSON.parse(dom.window.eval('JSON.stringify(report)'));
  } finally {
    dom.window.close();
  }
  chart = chart
    .replaceAll('var(--ink)', '#24372f')
    .replaceAll('var(--panel)', '#f2f6f2')
    .replaceAll('var(--band)', '#c8e1d2');
  const width = mobile ? 360 : 720,
    height = mobile ? 1010 : 860,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 34, 26, 'Check expectations.', true) +
      text(left, 67, 26, 'Keep failures visible.', true) +
      text(left, 98, 15, 'v1 training · six fictional records.')
    : text(left, 42, 29, 'Check expectations before training.', true) +
      text(left, 76, 17, 'v1 training · strict types · six fictional records.');
  body +=
    '<svg x="' +
    left +
    '" y="120" width="' +
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
  const y = mobile ? 640 : 552;
  body +=
    '<rect x="' +
    left +
    '" y="' +
    y +
    '" width="' +
    wide +
    '" height="178" rx="8" fill="#f2f6f2"/>' +
    text(left + 12, y + 28, 17, 'Field violations, not row counts', true);
  result.summary.forEach((r, i) => {
    body += text(left + 12, y + 57 + i * 28, 15, r.field + ': ' + r.count, i === 0);
  });
  if (mobile) {
    body +=
      text(left, 862, 14, 'D05 violates two different field rules.') +
      text(left, 892, 14, 'No rows are silently dropped or repaired.') +
      text(left, 946, 14, 'Passing checks does not establish meaning.') +
      text(left, 977, 14, 'Wrong units can still look valid.');
  } else {
    body +=
      text(
        left,
        778,
        15,
        'D05 violates two field rules. No rows are silently dropped or repaired.',
      ) +
      text(
        left,
        824,
        14,
        'Passing these checks does not establish correct units, labels, or predictive usefulness.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">A schema makes input violations visible before training</title><desc id="desc">Six fictional delivery records are validated against strict contract version one in training mode. Only D01 passes. D02 has a string distance, D03 a negative distance, D04 an unapproved service, D05 a null distance and invalid hour, and D06 a missing label. Five rows are flagged and six violations hold the complete batch. Three violations concern distance and one each concerns service, hour, and label. Passing a schema does not certify semantic correctness.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset =
    'machine-learning/schema-based-data-validation' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Schema-Based Data Validation desktop and phone illustrations.');
