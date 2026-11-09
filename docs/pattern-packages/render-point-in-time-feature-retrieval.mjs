import { lightEditorial } from './ml-illustration-style.mjs';
// Original composition derived from executable two-clock retrieval and comparison results.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-point-in-time-feature-retrieval.html'),
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
    height = mobile ? 1060 : 980,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 34, 26, 'Replay what was', true) +
      text(left, 67, 26, 'available then.', true) +
      text(left, 98, 15, 'Merchant A · decision at 10:00 UTC.')
    : text(left, 42, 29, 'Replay what was available then.', true) +
      text(left, 76, 17, 'Merchant A · decision at 10:00 UTC · maximum age 60 minutes.');
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
  const y = mobile ? 795 : 710;
  body +=
    '<rect x="' +
    left +
    '" y="' +
    y +
    '" width="' +
    wide +
    '" height="155" rx="8" fill="#f2f6f2"/>' +
    text(left + 12, y + 28, 17, 'Same archive. Three answers.', true);
  [
    ['Replay known then', result.known],
    ['Event cutoff only', result.eventOnly],
    ['Latest in archive', result.latest],
  ].forEach(([label, row], i) => {
    body += text(
      left + 12,
      y + 59 + i * 29,
      15,
      label + ': ' + row.id + ' = ' + row.value,
      i === 0,
    );
  });
  if (mobile) {
    body +=
      text(left, 992, 14, 'F04 corrects F03 after the decision.') +
      text(left, 1024, 14, 'Fictional snapshots; no model is fitted.');
  } else {
    body +=
      text(
        left,
        909,
        15,
        'F04 corrects F03 at 10:10. An old event time does not make it known at 10:00.',
      ) +
      text(
        left,
        952,
        14,
        'Fictional snapshots. Ready time means usable on the prediction path, not just ingested.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">Historical feature retrieval checks event time and availability separately</title><desc id="desc">At ten o’clock UTC for merchant A, with a sixty-minute age limit, F01 and F03 qualify. F03 is newest and gives fifty. F02 and F04 arrive later, F05 is a future event, F06 belongs to merchant B, and F07 is too old. An event-only query selects corrected F04 with sixty-five; latest-in-archive selects F05 with ninety. The retained archive is queried at ten-thirty, not used as the historical cutoff.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset =
    'machine-learning/point-in-time-feature-retrieval' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Point-in-Time Feature Retrieval desktop and phone illustrations.');
