import { lightEditorial } from './ml-illustration-style.mjs';
// Compose an original diagram from the actual rule matrix and copied-rule explorer state.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const dom = new JSDOM(
  await readFile(resolve(root, 'content/assets/widgets/ml-weak-supervision.html'), 'utf8'),
  {
    runScripts: 'dangerously',
    beforeParse(window) {
      Object.defineProperty(window, 'innerWidth', { value: 360 });
    },
  },
);
let chart, matrix;
try {
  dom.window.document.querySelector('#copy').click();
  chart = dom.window.document.querySelector('svg').innerHTML;
  matrix = JSON.parse(
    dom.window.eval(
      'JSON.stringify(samples.map(s=>labelVotes(s,{refund:true,billing:true,delivery:true,copy:false}).slice(0,3).map(v=>v.value)))',
    ),
  );
} finally {
  dom.window.close();
}
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
  '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="9" fill="#f2f6f2"/>';
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const mobile of [false, true]) {
  const width = mobile ? 360 : 720,
    height = mobile ? 1210 : 720;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(16, 33, 26, 'Noisy clues become', true) +
      text(16, 64, 26, 'training labels', true) +
      text(16, 90, 14, 'Preserve missing votes and disagreements.')
    : text(20, 40, 29, 'Noisy clues become training labels', true) +
      text(20, 72, 16, 'Abstain where a rule has no answer. Preserve disagreements.');
  const left = mobile ? 16 : 20;
  body += box(left, 110, 328, 175) + text(left + 12, 139, 19, 'Three imperfect sources', true);
  body += text(left + 12, 174, 15, 'R: “refund” → Refund · weight 2');
  body += text(left + 12, 209, 15, 'B: “charged twice” → Refund · weight 1');
  body += text(left + 12, 244, 15, 'D: “delivered” → Other · weight 3');
  body += text(left + 12, 270, 13, 'Nonmatch → abstain. Weights are assigned.');
  body += text(left + 12, 304, 14, 'Four fictional tickets', true) + box(left, 310, 328, 228);
  body +=
    text(left + 12, 338, 15, 'A: “Refund please; tracking', true) +
    text(left + 12, 360, 15, 'says delivered.”', true);
  for (const [i, label] of ['Ticket', 'R', 'B', 'D'].entries())
    body += text(left + [12, 95, 175, 255][i], 390, 14, label, true);
  for (const [i, row] of matrix.entries()) {
    body += text(left + 12, 416 + 25 * i, 15, String.fromCharCode(65 + i), true);
    for (const [j, vote] of row.entries())
      body += text(
        left + [95, 175, 255][j],
        416 + 25 * i,
        14,
        vote === -1 ? '—' : vote === 1 ? 'Refund' : 'Other',
      );
  }
  body += text(left + 12, 523, 13, 'Coverage 3/4 · overlap 2/4 · conflict 1/4');
  const right = mobile ? 16 : 372,
    top = mobile ? 573 : 120;
  body += text(right, top, 19, 'Ticket A · copied R enabled', true);
  body +=
    '<svg x="' +
    right +
    '" y="' +
    (top + 20) +
    '" width="328" height="360" viewBox="0 0 328 360">' +
    chart +
    '</svg>';
  body += text(right, top + 405, 14, 'A copied rule adds no independent evidence.');
  body += text(right, top + 429, 14, 'Vote share is not a probability or accuracy.');
  const flow = mobile ? 1040 : 590;
  if (mobile) {
    for (const [i, title] of [
      'Aggregated targets',
      '↓ Train a separate predictor',
      '↓ Evaluate with reviewed labels',
    ].entries()) {
      body += box(16, flow + i * 48, 328, 38) + text(28, flow + 25 + i * 48, 16, title, true);
    }
    body += text(16, 1200, 12, 'Synthetic teaching example; no model performance claimed.');
  } else {
    for (const [i, title] of [
      'Aggregated targets',
      '→ Train predictor',
      '→ Independent evaluation',
    ].entries()) {
      body += box(20 + 232 * i, flow, 216, 48) + text(30 + 232 * i, flow + 30, 15, title, true);
    }
    body += text(
      20,
      676,
      14,
      'The matrix has no verified ticket labels. Coverage does not establish correctness.',
    );
    body += text(
      20,
      701,
      13,
      'Original synthetic example. Exact-copy handling illustrates one known dependency only.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">Weak supervision: noisy votes and copied evidence</title><desc id="desc">Three text rules label three of four fictional tickets and conflict on ticket A. With assigned weights, counting an exact copied refund rule flips A from 40 percent to 57.1 percent Refund share. Counting the copy once restores 40 percent. Aggregated targets train a separate predictor that needs independent evaluation.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/weak-supervision-votes' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Weak Supervision desktop and phone illustrations.');
