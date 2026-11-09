import { lightEditorial } from './ml-illustration-style.mjs';
// Original hierarchy and coherence comparison, derived from the executable fixture.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const slug = 'hierarchical-forecast-reconciliation',
  source = await readFile(resolve(root, `content/assets/widgets/ml-${slug}.html`), 'utf8');
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
  let chart;
  try {
    chart = dom.window.document.querySelector('#mechanism').innerHTML;
  } finally {
    dom.window.close();
  }
  if (!chart.includes('diagram-title')) throw new Error('The computed hierarchy did not render.');
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
    height = mobile ? 1380 : 1160,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    ch = mobile ? 1000 : 800;
  let body = `<rect width="${width}" height="${height}" fill="#fff"/>`;
  body += mobile
    ? text(left, 36, 27, 'Make the forecasts', true) +
      text(left, 73, 27, 'add up.', true) +
      text(left, 105, 14, 'Equal-weight reconciliation; fictional data.')
    : text(left, 42, 27, 'Make seven forecasts add up.', true) +
      text(
        left,
        82,
        16,
        'Equal-weight least squares adjusts all levels together; fictional weekly demand.',
      );
  body += `<svg x="${left}" y="125" width="${wide}" height="${ch}" viewBox="0 0 ${wide} ${ch}">${chart}</svg>`;
  const y = mobile ? 1170 : 965;
  body +=
    `<rect x="${left}" y="${y}" width="${wide}" height="140" rx="8" fill="#f2f6f2"/>` +
    text(left + 12, y + 29, 17, 'Another coherent answer: bottom-up', true);
  if (mobile)
    body +=
      text(left + 12, y + 62, 14, 'Keep stores (30, 30, 20, 30).') +
      text(left + 12, y + 91, 14, 'North 60; South 50; Total 110.') +
      text(left + 12, y + 120, 13, 'Different assumptions, different adjustments.');
  else
    body +=
      text(
        left + 12,
        y + 64,
        15,
        'Retain stores (30, 30, 20, 30); sum to North 60, South 50, Total 110.',
      ) +
      text(
        left + 12,
        y + 101,
        14,
        'Coherence alone does not select the most useful forecasting method.',
      );
  body += text(
    left,
    height - 22,
    13,
    'Unrounded values obey sums; node values round to two decimals.',
  );
  if (mobile)
    body = body.replace(
      text(left, height - 22, 13, 'Unrounded values obey sums; node values round to two decimals.'),
      text(left, height - 40, 13, 'Unrounded values obey the sums.') +
        text(left, height - 16, 13, 'Node values round to two decimals.'),
    );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">Reconcile a hierarchy without confusing coherence and accuracy</title><desc id="desc">Seven fictional base forecasts have gaps ten, ten and minus ten units. Equal-weight reconciliation changes total 120 to 115.7143, North 70 to 69.5238 and South 40 to 46.1905, with four adjusted stores summing to these regions. All gaps become zero. If actual store outcomes equal the original store forecasts, store mean absolute error increases from zero to 3.3333, illustrating that coherence does not guarantee individual-series accuracy. Bottom-up retains store values and instead gives total 110.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>${body}</svg>\n`;
  const asset = `machine-learning/${slug}${mobile ? '-mobile' : ''}.svg`;
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered reconciliation desktop and phone illustrations.');
