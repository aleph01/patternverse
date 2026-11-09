import { lightEditorial } from './ml-illustration-style.mjs';
// Original diagrams derived from the executable fictional camera fixture.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const slug = 'domain-invariant-representation-learning';
const source = await readFile(resolve(root, `content/assets/widgets/ml-${slug}.html`), 'utf8');
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
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
  for (const [name, color] of Object.entries({
    ink: '#24372f',
    panel: '#f2f6f2',
    accent: '#28684d',
    muted: '#53685b',
    line: '#b4c7b9',
    band: '#c8e1d2',
  }))
    chart = chart.replaceAll(`var(--${name})`, color);
  const width = mobile ? 360 : 720,
    height = mobile ? 1250 : 1025,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    ch = mobile ? 760 : 630;
  let body = `<rect width="${width}" height="${height}" fill="#fff"/>`;
  body += mobile
    ? text(left, 36, 27, 'Keep the defect cue.', true) +
      text(left, 72, 27, 'Remove the camera.', true) +
      text(left, 105, 14, 'Sixteen fictional observations.')
    : text(left, 42, 27, 'Keep the defect cue. Remove the camera.', true) +
      text(left, 82, 16, 'Balanced cameras share the same cue-to-label rule.');
  body += `<svg x="${left}" y="125" width="${wide}" height="${ch}" viewBox="0 0 ${wide} ${ch}">${chart}</svg>`;
  const y = mobile ? 930 : 795;
  body +=
    `<rect x="${left}" y="${y}" width="${wide}" height="${mobile ? 235 : 150}" rx="8" fill="#f2f6f2"/>` +
    text(left + 12, y + 30, 17, 'What the bars mean', true);
  if (mobile)
    body +=
      text(left + 12, y + 65, 14, 'z = −1: 4 normal S + 4 normal T.') +
      text(left + 12, y + 94, 14, 'z = +1: 4 defect S + 4 defect T.') +
      text(left + 12, y + 130, 14, 'The task keeps its shared rule.') +
      text(left + 12, y + 159, 14, 'The domain lookup must guess.') +
      text(left + 12, y + 195, 14, 'Different class proportions can') +
      text(left + 12, y + 220, 14, 'make the two objectives conflict.');
  else
    body +=
      text(
        left + 12,
        y + 63,
        15,
        'z = −1: 4 normal S + 4 normal T. z = +1: 4 defect S + 4 defect T.',
      ) +
      text(left + 12, y + 96, 15, 'The task keeps its shared rule; the domain lookup must guess.') +
      text(
        left + 12,
        y + 128,
        14,
        'Different class proportions can make the task and alignment objectives conflict.',
      );
  body += mobile
    ? text(left, height - 50, 13, 'Empirical fixture only; no neural training') +
      text(left, height - 25, 13, 'or transfer guarantee.')
    : text(
        left,
        height - 28,
        14,
        'Empirical fixture only; no neural training or transfer guarantee.',
      );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">Retain a shared task cue while removing a camera marker</title><desc id="desc">Each of two fictional cameras supplies four normal and four defective examples. The encoder removes the camera marker and retains cue q. The task threshold gets eight of eight correct in each domain. Equal encoded domain counts limit optimal empirical domain lookup to eight of sixteen correct. This balanced example is not a transfer guarantee.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>${body}</svg>\n`;
  const asset = `machine-learning/${slug}${mobile ? '-mobile' : ''}.svg`;
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered desktop and phone domain-invariance illustrations.');
