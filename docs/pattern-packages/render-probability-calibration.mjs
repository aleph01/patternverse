import { lightEditorial } from './ml-illustration-style.mjs';
// Original composition: actual fitted temperature, held-out metrics, and reliability points.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-probability-calibration.html'),
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
    result = JSON.parse(dom.window.eval('JSON.stringify(report)'));
  } finally {
    dom.window.close();
  }
  const width = mobile ? 360 : 720,
    height = mobile ? 1030 : 910,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 34, 26, 'Better probabilities.', true) +
      text(left, 67, 26, 'Same classes.', true) +
      text(left, 98, 15, 'Fit on one set. Evaluate on another.')
    : text(left, 42, 29, 'Better probabilities. Same classes.', true) +
      text(left, 76, 17, 'Fit on one set. Evaluate on different cases.');
  body +=
    box(left, 120, wide, mobile ? 140 : 110) +
    text(left + 12, 149, 17, 'Fit T = ' + result.fit.temperature.toFixed(4), true);
  body += text(left + 12, 178, 15, '20 calibration cases · 2/10 and 8/10 issues');
  body += text(left + 12, 207, 17, 'p: 0.1 / 0.9 → 0.2 / 0.8', true);
  if (mobile) body += text(left + 12, 240, 14, 'Evaluate 20 different cases: 3/10 and 7/10.');
  const chartY = mobile ? 290 : 270,
    chartHeight = mobile ? 360 : 355;
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
  const metricY = mobile ? 690 : 660;
  body +=
    box(left, metricY, wide, 150) +
    text(left + 12, metricY + 29, 17, 'Separate evaluation · 20 cases', true);
  body += text(
    left + 12,
    metricY + 59,
    16,
    'Brier: ' + result.raw.brier.toFixed(4) + ' → ' + result.mapped.brier.toFixed(4),
  );
  body += text(
    left + 12,
    metricY + 88,
    16,
    'Log loss: ' + result.raw.logLoss.toFixed(4) + ' → ' + result.mapped.logLoss.toFixed(4),
  );
  body += text(
    left + 12,
    metricY + 119,
    16,
    'Accuracy at 0.5: ' + result.raw.correct + '/20 → ' + result.mapped.correct + '/20',
    true,
  );
  if (mobile) {
    body += text(left, 891, 14, 'Five equal-width bins; 10 cases per point.');
    body += text(left, 919, 14, 'Mapped values still differ from observed');
    body += text(left, 943, 14, 'positive fractions 0.3 and 0.7.');
    body += text(left, 986, 14, 'Fictional data. No population guarantee.');
    body += text(left, 1012, 14, 'Temperature constrained to [0.25, 10].');
  } else {
    body += text(
      left,
      854,
      14,
      'Five equal-width bins; 10 cases per point. Mapped values still differ from 0.3 and 0.7.',
    );
    body += text(
      left,
      887,
      14,
      'Fictional data. No population guarantee. Temperature constrained to [0.25, 10].',
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
    '" role="img" aria-labelledby="title desc"><title id="title">Calibrate probabilities without changing the predicted classes</title><desc id="desc">Twenty calibration cases fit temperature 1.5850, mapping probabilities 0.1 and 0.9 to 0.2 and 0.8. Twenty different evaluation cases have positive fractions 0.3 and 0.7. Reliability points move closer to the diagonal. Brier loss falls from 0.2500 to 0.2200 and log loss from 0.7645 to 0.6390, but accuracy remains fourteen of twenty at threshold 0.5. All data are fictional and the mapped values remain imperfect.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/probability-calibration' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Probability Calibration desktop and phone illustrations.');
