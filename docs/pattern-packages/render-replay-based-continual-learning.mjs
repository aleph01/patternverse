import { lightEditorial } from './ml-illustration-style.mjs';
// Original replay memory, gradient, and error trajectory derived from the executable fixture.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const slug = 'replay-based-continual-learning';
const source = await readFile(resolve(root, `content/assets/widgets/ml-${slug}.html`), 'utf8');
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
    height = mobile ? 1500 : 1310,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    ch = mobile ? 970 : 860;
  let body = `<rect width="${width}" height="${height}" fill="#fff"/>`;
  body += mobile
    ? text(left, 36, 27, 'Keep old examples', true) +
      text(left, 73, 27, 'in the learning loop.', true) +
      text(left, 105, 14, 'A fictional linear model; exact updates.')
    : text(left, 42, 27, 'Keep old examples in the learning loop.', true) +
      text(left, 82, 16, 'Old A (1,0,0) → 1; old B (0,1,0) → −1; new C (1,1,1) → 1.');
  body += `<svg x="${left}" y="125" width="${wide}" height="${ch}" viewBox="0 0 ${wide} ${ch}">${chart}</svg>`;
  const y = mobile ? 1140 : 1020,
    final = r.trace.at(-1),
    control = r.control.at(-1),
    nominal = r.currentOnly.at(-1);
  body +=
    `<rect x="${left}" y="${y}" width="${wide}" height="${mobile ? 270 : 200}" rx="8" fill="#f2f6f2"/>` +
    text(left + 12, y + 30, 17, 'After the same twelve C updates', true);
  if (mobile)
    body +=
      text(left + 12, y + 66, 14, 'Current only, step 0.25:') +
      text(left + 12, y + 91, 14, 'old ' + nominal.old.toFixed(4) + '; new below 10⁻¹²') +
      text(left + 12, y + 130, 14, 'Matched current only, step 0.125:') +
      text(left + 12, y + 155, 14, 'old ' + control.old.toFixed(4) + '; new 0.0000126') +
      text(left + 12, y + 194, 14, 'Replay ρ = 0.5, step 0.25:') +
      text(
        left + 12,
        y + 219,
        14,
        'old ' + final.old.toFixed(4) + '; new ' + final.new.toFixed(4),
      ) +
      text(left + 12, y + 251, 13, 'Old A (1,0,0) → 1; B (0,1,0) → −1.');
  else
    body +=
      text(
        left + 12,
        y + 66,
        15,
        'Current only (step 0.25): old ' + nominal.old.toFixed(4) + '; new below 10⁻¹²',
      ) +
      text(
        left + 12,
        y + 103,
        15,
        'Matched current only (step 0.125): old ' + control.old.toFixed(4) + '; new 0.0000126',
      ) +
      text(
        left + 12,
        y + 140,
        15,
        'Replay (ρ = 0.5, step 0.25): old ' +
          final.old.toFixed(4) +
          '; new ' +
          final.new.toFixed(4),
      ) +
      text(
        left + 12,
        y + 177,
        14,
        'Corrective memory feedback reduces old error beyond slowing the new update.',
      );
  body += mobile
    ? text(left, 1455, 13, 'Four memory slots, with equal A/B quotas.') +
      text(left, 1480, 13, 'Frozen memory; no held-out performance claim.')
    : text(
        left,
        1280,
        14,
        'Four frozen memory slots, equal A/B quotas. All errors describe the teaching fixture.',
      );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">Replay stored examples to counter forgetting during new updates</title><desc id="desc">Four frozen memory records A3, A4, B3, B4 accompany twelve updates on new cohort C. A three-weight linear model starts at one, minus one, zero. Current and memory mean gradients receive equal weight at learning rate 0.25. Old mean squared error ends at 0.0619 and new error at 0.0079. The matched current-only control has step size 0.125 and old error 0.1103. The plot shows old and new replay errors and old error for this matched control. These are deterministic fixture errors without held-out evaluation.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>${body}</svg>\n`;
  const asset = `machine-learning/${slug}${mobile ? '-mobile' : ''}.svg`;
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered replay-based continual-learning desktop and phone illustrations.');
