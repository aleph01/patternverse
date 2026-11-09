import { lightEditorial } from './ml-illustration-style.mjs';
// Original composition from the executable selector and its actual subgroup counts.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-selective-prediction.html'),
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
    height = mobile ? 1020 : 800,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 34, 26, 'Answer some.', true) +
      text(left, 67, 26, 'Defer the rest.', true) +
      text(left, 98, 15, 'Twelve tickets · threshold 0.80.')
    : text(left, 42, 29, 'Answer some. Defer the rest.', true) +
      text(left, 76, 17, 'Twelve tickets · fixed predictions · threshold 0.80 includes equality.');
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
  const y = mobile ? 710 : 470;
  body +=
    '<rect x="' +
    left +
    '" y="' +
    y +
    '" width="' +
    wide +
    '" height="140" rx="8" fill="#f2f6f2"/>' +
    text(left + 12, y + 28, 16, 'Same gate, different group results', true);
  result.summary.slice(1).forEach((r, i) => {
    body += text(
      left + 12,
      y + 59 + i * 31,
      mobile ? 14 : 16,
      r.group +
        ': ' +
        r.accepted +
        '/' +
        r.n +
        ' accepted · ' +
        r.errors +
        '/' +
        r.accepted +
        ' wrong',
      i === 1,
    );
  });
  if (mobile) {
    body +=
      text(left, 892, 14, 'Review: 4 tickets × 2 units = 8 units.') +
      text(left, 920, 14, 'Errors: 2 × 10 = 20. Total: 28 units.') +
      text(left, 964, 14, 'Fictional data; perfect review assumed.') +
      text(left, 992, 14, 'Observed rates are not guarantees.');
  } else {
    body +=
      text(left, 656, 16, 'Full review: 2 automatic errors × 10 + 4 reviews × 2 = 28 cost units.') +
      text(
        left,
        707,
        15,
        'Abstaining changes the accepted population; it does not correct the predictor.',
      ) +
      text(
        left,
        756,
        14,
        'Fictional data; perfect review assumed. Observed rates are not population guarantees.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">Selective prediction separates automated decisions from deferred work</title><desc id="desc">A threshold of 0.80 accepts eight of twelve fictional tickets, with two errors and four deferred cases. Both tied scores of 0.80 are accepted. Routine has six of eight accepted and zero accepted errors; complex has two of four accepted and two accepted errors. If every deferred case receives a correct two-unit review and each automatic error costs ten, total cost is twenty-eight units. No population guarantee is established.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/selective-prediction' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Selective Prediction desktop and phone illustrations.');
