import { lightEditorial } from './ml-illustration-style.mjs';
// Original neighborhood and objective comparison from exact fictional linear-model calculations.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-adversarial-training.html'),
  'utf8',
);
const manifestPath = resolve(root, 'content/assets/manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const text = (x, y, size, value, bold = false) =>
  `<text x="${x}" y="${y}" font-size="${size}"${bold ? ' font-weight="700"' : ''}>${value}</text>`;
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
  for (const [name, color] of Object.entries({
    ink: '#24372f',
    panel: '#f2f6f2',
    paper: '#fff',
    accent: '#28684d',
    muted: '#53685b',
    line: '#b4c7b9',
    band: '#c8e1d2',
  }))
    chart = chart.replaceAll(`var(--${name})`, color);
  const width = mobile ? 360 : 720,
    height = mobile ? 1340 : 1250,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    ch = mobile ? 750 : 850;
  let body = `<rect width="${width}" height="${height}" fill="#fff"/>`;
  body += mobile
    ? text(left, 36, 27, 'Train for the', true) +
      text(left, 73, 27, 'whole neighborhood.', true) +
      text(left, 105, 14, 'Eight fictional records. Three fixed models.')
    : text(left, 42, 27, 'Train for the whole neighborhood.', true) +
      text(left, 82, 16, 'Same eight records. Clean loss or worst-case loss?');
  body += `<svg x="${left}" y="125" width="${wide}" height="${ch}" viewBox="0 0 ${wide} ${ch}">${chart}</svg>`;
  for (const [i, f] of [r.fits[0], r.selected].entries()) {
    const x = mobile ? left : left + i * 346,
      y = (mobile ? 920 : 1015) + (mobile ? i * 170 : 0),
      cw = mobile ? 328 : 334;
    body +=
      `<rect x="${x}" y="${y}" width="${cw}" height="150" rx="8" fill="#f2f6f2"/>` +
      text(x + 12, y + 29, 17, i ? 'Worst-loss winner' : 'Clean-loss winner', true) +
      text(x + 12, y + 60, 15, f.name + ': w = (' + f.w.join(', ') + ')') +
      text(
        x + 12,
        y + 91,
        14,
        'Clean ' +
          Math.round(8 * f.cleanAccuracy) +
          '/8; robust ' +
          Math.round(8 * f.robustAccuracy) +
          '/8',
      ) +
      text(x + 12, y + 124, 14, 'Worst mean loss ' + f.worstLoss.toFixed(4));
  }
  body += mobile
    ? text(left, 1295, 13, 'L∞ radius 0.25; exact linear attacks.') +
      text(left, 1320, 13, 'Training-fixture rates; no deployment estimate.')
    : text(
        left,
        1218,
        14,
        'L∞ radius 0.25. Exact linear attacks; no neural training or deployment estimate.',
      );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">Select a model by the worst allowed input, not only its original input</title><desc id="desc">Eight fictional points have a broad shape cue and a fine pattern cue. At L-infinity radius 0.25, minimizing clean logistic loss among three models chooses weights zero and five, with clean accuracy eight of eight and robust accuracy zero of eight. Minimizing exact worst-case mean loss chooses weights one and zero, with six of eight for both rates. The plot shows the broad-cue boundary, a permitted square around positive record P1 at one and 0.2, and an exact attack moving it to 0.75 and 0.2. Its signed margin decreases from one to 0.75. These are training-fixture results.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>${body}</svg>\n`;
  const asset = 'machine-learning/adversarial-training' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered adversarial-training desktop and phone illustrations.');
