import { lightEditorial } from './ml-illustration-style.mjs';
// Original composition using actual record-level metrics and bars from the explorer.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-slice-based-evaluation.html'),
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
  let chart, overall;
  try {
    chart = dom.window.document.querySelector('svg').innerHTML;
    overall = JSON.parse(dom.window.eval('JSON.stringify(report.overall)'));
  } finally {
    dom.window.close();
  }
  const width = mobile ? 360 : 720,
    height = mobile ? 1070 : 950,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 34, 26, 'Overall improves.', true) +
      text(left, 67, 26, 'Desktop regresses.', true) +
      text(left, 97, 15, 'The same cases tell both stories.')
    : text(left, 42, 29, 'Overall improves. Desktop regresses.', true) +
      text(left, 76, 17, 'Evaluate the same predictions on meaningful subsets.');
  body +=
    box(left, 120, wide, mobile ? 145 : 115) +
    text(left + 12, 149, 17, 'Overall · ' + overall.rows + ' fictional tickets', true);
  const fraction = (r) => r.k + '/' + r.n + ' = ' + (100 * r.rate).toFixed(1) + '%';
  if (mobile) {
    body +=
      text(left + 12, 178, 18, 'A: ' + fraction(overall.a), true) +
      text(left + 12, 207, 18, 'B: ' + fraction(overall.b), true) +
      text(left + 12, 239, 14, 'A = current (green) · B = candidate (orange)');
  } else {
    body +=
      text(left + 12, 180, 18, 'A: ' + fraction(overall.a) + ' → B: ' + fraction(overall.b), true) +
      text(left + 12, 210, 14, 'A = current (green) · B = candidate (orange)');
  }
  body +=
    '<svg x="' +
    left +
    '" y="' +
    (mobile ? 295 : 265) +
    '" width="' +
    wide +
    '" height="510" viewBox="0 0 ' +
    wide +
    ' 510">' +
    chart +
    '</svg>';
  body +=
    box(left, mobile ? 830 : 800, wide, mobile ? 120 : 90) +
    text(left + 12, mobile ? 859 : 829, 17, 'One overall gain; uneven changes.', true);
  if (mobile) {
    body += text(left + 12, 888, 15, 'Desktop: one fewer correct case.');
    body += text(left + 12, 915, 15, 'Mobile: two more correct cases.');
    body += text(left + 12, 940, 14, 'Tablet: no evidence, not zero accuracy.');
    body += text(left, 988, 14, 'Small fictional counts; no population claim.');
    body += text(left, 1014, 14, 'The 100% mobile result uses four cases.');
    body += text(left, 1042, 14, 'A slice difference does not establish a cause.');
  } else {
    body += text(
      left + 12,
      858,
      16,
      'Desktop loses one correct case; mobile gains two. Tablet has no evidence.',
    );
    body += text(
      left,
      922,
      14,
      'Small fictional counts; the 100% mobile result uses four cases. No population claim.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">An overall gain can hide a slice regression</title><desc id="desc">On twenty fictional cases, A gets sixteen correct and B seventeen. Desktop accuracy falls from fourteen of sixteen to thirteen of sixteen; mobile rises from two of four to four of four. Tablet has zero examples and no measured performance. Both models are evaluated on the same fixed records. No population conclusion or causal explanation is established.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/slice-based-evaluation' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Slice-Based Evaluation desktop and phone illustrations.');
