import { lightEditorial } from './ml-illustration-style.mjs';
// Original responsive explanation, using the same sampled log and estimators as the explorer.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-controlled-exploration-with-propensity-logging.html'),
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
  let chart, result, capped;
  try {
    chart = dom.window.document.querySelector('#mechanism').innerHTML;
    result = JSON.parse(dom.window.eval('JSON.stringify(report)'));
    capped = dom.window.eval("simulate(.3,'ABC','contextual',2).cappedIPS");
  } finally {
    dom.window.close();
  }
  chart = chart
    .replaceAll('var(--ink)', '#24372f')
    .replaceAll('var(--panel)', '#f2f6f2')
    .replaceAll('var(--band)', '#c8e1d2')
    .replaceAll('var(--accent)', '#28684d');
  const width = mobile ? 360 : 720,
    height = mobile ? 1160 : 760,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    chartHeight = mobile ? 730 : 340;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 34, 27, 'Explore deliberately.', true) +
      text(left, 68, 27, 'Keep the probabilities.', true) +
      text(left, 100, 15, 'Only selected rewards become visible.')
    : text(left, 42, 29, 'Explore deliberately. Keep the probabilities.', true) +
      text(left, 78, 17, 'Knowing what was selected includes knowing how likely it was.');
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
  const y = mobile ? 900 : 510;
  body +=
    '<rect x="' +
    left +
    '" y="' +
    y +
    '" width="' +
    wide +
    '" height="155" rx="8" fill="#f2f6f2"/>' +
    text(left + 12, y + 28, 17, 'A large weight is fragile evidence', true) +
    text(left + 12, y + 61, 15, 'Weights sum to ' + result.weightSum.toFixed(3)) +
    text(left + 12, y + 94, 15, 'Weight concentration: ' + result.ess.toFixed(3)) +
    text(left + 12, y + 127, 14, 'Cap 2 → capped IPS ' + capped.toFixed(3));
  body += mobile
    ? text(left, 1100, 14, 'Fictional ten-row replay; no confidence interval.') +
      text(left, 1134, 14, 'Zero support blocks evaluation.')
    : text(
        left,
        709,
        15,
        'Raw IPS can exceed the binary reward range in a small, unevenly weighted sample.',
      ) +
      text(
        left,
        741,
        14,
        'Fictional ten-row replay · complete rewards · fixed target · no confidence interval.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">Controlled exploration links selected actions to logged probabilities and importance weights</title><desc id="desc">In a fictional ten-row replay, epsilon point three over three eligible actions assigns A probability point eight and B and C point one each. Request R09 selects B and receives reward one. The target also chooses B, so its importance weight is ten. Four rows match the target; weighted rewards sum to twelve point five and weights sum to thirteen point seven five. IPS is one point two five and self-normalized IPS is approximately point nine zero nine. A weight cap of two changes capped IPS to point four five. These are unstable illustrative estimates, not confidence guarantees.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset =
    'machine-learning/controlled-exploration-with-propensity-logging' +
    (mobile ? '-mobile' : '') +
    '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Rendered Controlled Exploration with Propensity Logging desktop and phone illustrations.',
);
