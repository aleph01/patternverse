import { lightEditorial } from './ml-illustration-style.mjs';
// Original composition from the executable ranked residuals, interval, and coverage counts.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-conformal-prediction.html'),
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
  let chart, chartHeight, result;
  try {
    const svg = dom.window.document.querySelector('#mechanism');
    chart = svg.innerHTML;
    chartHeight = Number(svg.getAttribute('viewBox').split(' ')[3]);
    result = JSON.parse(dom.window.eval('JSON.stringify(report)'));
  } finally {
    dom.window.close();
  }
  const width = mobile ? 360 : 720,
    height = mobile ? 930 : 770,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 34, 26, 'A corrected rank.', true) +
      text(left, 67, 26, 'An interval radius.', true) +
      text(left, 98, 15, '90% target · nine calibration records.')
    : text(left, 42, 29, 'A corrected rank sets the radius.', true) +
      text(left, 76, 17, '90% target · nine calibration records · frozen prediction model.');
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
  const summaryY = mobile ? 600 : 480;
  body +=
    box(left, summaryY, wide, 155) +
    text(left + 12, summaryY + 29, 17, 'Separate evaluation · 10 cases', true);
  result.summary.forEach((r, i) => {
    body += text(
      left + 12,
      summaryY + 60 + i * 29,
      16,
      r.group + ': ' + r.covered + '/' + r.n + ' (' + ((100 * r.covered) / r.n).toFixed(0) + '%)',
      i === 2,
    );
  });
  if (mobile) {
    body += text(left, 804, 14, 'Overall coverage can hide subgroup misses.');
    body += text(left, 835, 14, 'The new point has no observed outcome.');
    body += text(left, 878, 14, 'Fictional data; exchangeability is assumed');
    body += text(left, 903, 14, 'by the theorem, not proved by this example.');
  } else {
    body += text(
      left,
      684,
      15,
      'Overall coverage can hide subgroup misses. The new point is excluded from evaluation.',
    );
    body += text(
      left,
      724,
      14,
      'Fictional data. The theorem assumes exchangeability; this example does not establish it.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">A finite-sample conformal rank determines an interval radius</title><desc id="desc">Nine sorted absolute residuals are one, two, two, three, four, four, five, seven, nine minutes. At a ninety-percent target, the corrected rank is nine, giving radius nine and interval thirty-one to forty-nine around a prediction of forty. Separate fictional evaluation covers nine of ten overall: eight of eight routine cases and one of two complex cases. The new-point outcome is unknown and no population guarantee is demonstrated by this example.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/conformal-prediction' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Conformal Prediction desktop and phone illustrations.');
