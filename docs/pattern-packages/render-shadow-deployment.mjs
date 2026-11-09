import { lightEditorial } from './ml-illustration-style.mjs';
// Original flow composition from the executable queue, response paths, and paired counts.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-shadow-deployment.html'),
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
    .replaceAll('var(--band)', '#c8e1d2')
    .replaceAll('var(--accent)', '#28684d');
  const width = mobile ? 360 : 720,
    height = mobile ? 1070 : 810,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 34, 26, 'Observe the candidate.', true) +
      text(left, 67, 26, 'Keep serving separate.', true) +
      text(left, 98, 15, 'Twelve copied requests · 150-ms deadline.')
    : text(left, 42, 29, 'Observe the candidate. Keep serving separate.', true) +
      text(left, 76, 17, 'Twelve copied requests · two isolated shadow workers · 150-ms deadline.');
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
  const y = mobile ? 775 : 530;
  body +=
    '<rect x="' +
    left +
    '" y="' +
    y +
    '" width="' +
    wide +
    '" height="175" rx="8" fill="#f2f6f2"/>' +
    text(left + 12, y + 28, 17, 'Paired evidence, with missingness', true) +
    text(left + 12, y + 60, 15, result.onTime + '/' + result.mirrored + ' shadow results on time') +
    text(
      left + 12,
      y + 91,
      15,
      result.pairs + ' labeled pairs · live errors ' + result.incumbentErrors,
    ) +
    text(
      left + 12,
      y + 122,
      15,
      'Shadow errors ' +
        result.candidateErrors +
        ' · ' +
        result.disagreements +
        '/' +
        result.onTime +
        ' disagree',
      true,
    ) +
    text(left + 12, y + 151, 14, result.misses + ' deadline misses remain visible.');
  if (mobile) {
    body +=
      text(left, 996, 14, 'Fictional replay; isolation is assumed.') +
      text(left, 1030, 14, 'Shadow results cannot establish business lift.');
  } else {
    body +=
      text(
        left,
        748,
        15,
        'Fictional replay. Deadline misses can change which requests enter the comparison.',
      ) +
      text(
        left,
        785,
        14,
        'Complete isolation is assumed; shadow outputs never control user responses.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">A shadow observes live requests without gaining serving authority</title><desc id="desc">Twelve fictional requests receive incumbent responses. Copies reach two separate shadow workers with a one-hundred-fifty-millisecond deadline. Ten shadow results arrive on time; two miss the deadline. Eight timely pairs have labels, with two incumbent errors and one candidate error. Five of ten timely predictions disagree. Shadow outputs go only to offline comparison, never to users. The simulation assumes complete incumbent isolation and does not cancel work after deadlines.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/shadow-deployment' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Shadow Deployment desktop and phone illustrations.');
