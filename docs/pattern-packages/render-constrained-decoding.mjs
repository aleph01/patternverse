import { lightEditorial } from './ml-illustration-style.mjs';
// Original prefix-mask-selection illustration derived from executable toy token probabilities.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-constrained-decoding.html'),
  'utf8',
);
const manifestPath = resolve(root, 'content/assets/manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x, y, size, s, b = false) =>
  `<text x="${x}" y="${y}" font-size="${size}"${b ? ' font-weight="700"' : ''}>${escape(s)}</text>`;
for (const mobile of [false, true]) {
  const dom = new JSDOM(source, {
    runScripts: 'dangerously',
    beforeParse(w) {
      Object.defineProperty(w, 'innerWidth', { value: mobile ? 360 : 1000 });
    },
  });
  let chart, r;
  try {
    chart = dom.window.document.querySelector('#mechanism').innerHTML;
    r = JSON.parse(dom.window.eval('JSON.stringify(report)'));
  } finally {
    dom.window.close();
  }
  chart = chart
    .replaceAll('var(--ink)', '#24372f')
    .replaceAll('var(--panel)', '#f2f6f2')
    .replaceAll('var(--accent)', '#28684d');
  const width = mobile ? 360 : 720,
    height = mobile ? 1370 : 940,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    ch = mobile ? 930 : 470;
  let body = `<rect width="${width}" height="${height}" fill="#fff"/>`;
  body += mobile
    ? text(left, 35, 27, 'Valid structure.', true) +
      text(left, 70, 27, 'Meaning still matters.', true) +
      text(left, 103, 14, 'Fictional token weights; no model inference.')
    : text(left, 42, 29, 'Valid structure. Meaning still matters.', true) +
      text(
        left,
        80,
        17,
        'Prefix → whole-token legality → mask and normalize → choose a continuation.',
      );
  body += `<svg x="${left}" y="125" width="${wide}" height="${ch}" viewBox="0 0 ${wide} ${ch}">${chart}</svg>`;
  const y = mobile ? 1110 : 645;
  body += `<rect x="${left}" y="${y}" width="${wide}" height="${mobile ? 170 : 190}" rx="8" fill="#f2f6f2"/>`;
  body +=
    text(left + 12, y + 30, 17, 'Computed complete output', true) +
    text(left + 12, y + 66, 17, r.text, true) +
    text(left + 12, y + 100, 14, 'Human reference: RENEW');
  body += mobile
    ? text(left + 12, y + 133, 14, 'Accepted structure; wrong reference label.')
    : text(left + 12, y + 139, 15, 'T1 starts at 20%; masking gives 20/49 ≈ 40.82%.') +
      text(
        left + 12,
        y + 170,
        14,
        'The mask excludes invalid strings; it does not choose the intended task label.',
      );
  body += mobile
    ? text(left, 1320, 14, 'Combined token T8: "RENEW"}') +
      text(left, 1350, 13, 'Different token paths can reach the same text.')
    : text(left, 882, 15, 'Combined token T8 contains the value and closing brace: "RENEW"}') +
      text(
        left,
        924,
        14,
        'EOS is allowed only after a complete object. A token limit can still interrupt generation.',
      );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">A legal token mask enforces structure without establishing the intended label</title><desc id="desc">For the fictional prefix of a label object, five of ten handcrafted tokens retain 49 percent of the base probability. HOLD has base probability 20 percent and masked probability 20 over 49, about 40.82 percent. Greedy selection emits HOLD, a closing brace, and EOS. The resulting object is accepted but disagrees with the human reference RENEW. A combined RENEW-and-brace token also illustrates whole-token matching. No model inference or task accuracy measurement runs.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>${body}</svg>\n`;
  const asset = 'machine-learning/constrained-decoding' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Constrained Decoding desktop and phone illustrations.');
