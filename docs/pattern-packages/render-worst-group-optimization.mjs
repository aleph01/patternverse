import { lightEditorial } from './ml-illustration-style.mjs';
// Original objective comparison and group-loss plot derived from exact scalar fits to fictional records.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-worst-group-optimization.html'),
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
    .replaceAll('var(--accent)', '#28684d')
    .replaceAll('var(--muted)', '#53685b')
    .replaceAll('var(--line)', '#b4c7b9')
    .replaceAll('var(--band)', '#c8e1d2');
  const width = mobile ? 360 : 720,
    height = mobile ? 1530 : 1120,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    ch = mobile ? 1080 : 660;
  let body = `<rect width="${width}" height="${height}" fill="#fff"/>`;
  body += mobile
    ? text(left, 35, 27, 'Fit the weakest group.', true) +
      text(left, 70, 27, 'See the average cost.', true) +
      text(left, 103, 14, 'Fictional records; exact scalar fits.')
    : text(left, 42, 27, 'Fit the weakest group. See the average cost.', true) +
      text(
        left,
        80,
        17,
        'One shared prediction. Three objectives. Group means use their own counts.',
      );
  body += `<svg x="${left}" y="125" width="${wide}" height="${ch}" viewBox="0 0 ${wide} ${ch}">${chart}</svg>`;
  const y = mobile ? 1240 : 840;
  body += `<rect x="${left}" y="${y}" width="${wide}" height="${mobile ? 200 : 175}" rx="8" fill="#f2f6f2"/>`;
  body += text(left + 12, y + 30, 17, 'The same 100 training records', true);
  if (mobile)
    body +=
      text(left + 12, y + 64, 14, 'A: 90 × 5 min') +
      text(left + 12, y + 90, 14, 'B: 5 × 6 min + 5 × 8 min');
  else body += text(left + 12, y + 64, 15, 'A: 90 × 5 min. B: 5 × 6 min + 5 × 8 min.');
  const offset = mobile ? 117 : 96;
  body +=
    text(
      left + 12,
      y + offset,
      15,
      'Minimax: ' + r.selected.prediction.toFixed(2) + ' min for both groups.',
      true,
    ) +
    text(left + 12, y + offset + 31, 14, 'Mean MSE = worst MSE = ' + r.selected.worst.toFixed(4)) +
    text(left + 12, y + offset + 61, 14, 'ERM: mean 0.4600; worst 4.2400.');
  body += mobile
    ? text(
        left,
        1480,
        13,
        'Projection: ' + Math.round(r.mixture * 100) + '% B; group data fixed.',
      ) + text(left, 1510, 13, 'No held-out or population result is measured.')
    : text(
        left,
        1060,
        15,
        'Projection: ' +
          Math.round(r.mixture * 100) +
          '% group B, with unchanged within-group data.',
      ) +
      text(
        left,
        1100,
        14,
        'Worst-group loss falls while the mean rises. No held-out performance is measured.',
      );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">Three training objectives trade sample-average loss against worst-group loss</title><desc id="desc">A fictional constant predictor 5 plus theta fits 90 routine requests at five minutes and ten older-channel requests split between six and eight minutes. Average loss chooses theta 0.20, equal group weighting 1, and worst-group loss 1.25. The worst-group fit predicts 6.25 minutes and gives both groups MSE 1.5625, compared with ERM mean MSE 0.46 and worst MSE 4.24. Curves show the two group mean squared losses and their maximum; the selected dot lies at the exact minimax solution. Mixture projections reweight these training losses and are not measured deployment results.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>${body}</svg>\n`;
  const asset = 'machine-learning/worst-group-optimization' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Worst-Group Optimization desktop and phone illustrations.');
