import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets');
const directory = resolve(assets, 'systemic-therapy');
mkdirSync(directory, { recursive: true });

// The shared fictional observation is expanded, not replaced or averaged.
// Both participant accounts remain visible and no clinical result is measured.
const escape = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x, y, value, size = 28, accent = false) =>
  `<text x="${x}" y="${y}" font-size="${size}"${accent ? ' class="accent"' : ''}>${escape(value)}</text>`;
const rule = (y, width) => `<path d="M32 ${y}H${width - 32}" class="fine"/>`;
const svg = (
  width,
  height,
  body,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-systemic-style="light-editorial">
<title id="title">One observation and two experiences to retain</title>
<desc id="desc">In the fictional couple example, Tess and Daniel both report fewer arguments. Tess describes relief when evenings do not escalate. Daniel describes concerns that remain unfinished because they are not returned to. The green review question asks whether they can pause and later return to a concern. The same observation remains, but the review includes both relief and an unmet purpose. These are qualitative fictional accounts, not measured improvement or causal evidence.</desc>
<style>
:root{color-scheme:only light;--paper:#ffffff;--ink:#252c28;--secondary:#a6aca3;--neutral:#f1f2ef;--mint:#edf5f0;--accent:#00855b}
svg{background:#ffffff;color:var(--ink)}
text{fill:var(--ink);font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}
path,rect{vector-effect:non-scaling-stroke;stroke-linecap:butt;stroke-linejoin:round}
.paper{fill:var(--paper)}.context{fill:var(--neutral)}
.fine{fill:none;stroke:var(--secondary);stroke-width:1}
.accent{fill:var(--accent)}
</style>
<rect width="${width}" height="${height}" class="paper"/>
${body}
</svg>\n`;

const wide =
  text(50, 46, 'One observation; two experiences', 30) +
  '<rect x="32" y="76" width="1056" height="78" class="context"/>' +
  text(50, 126, 'Both report fewer arguments.', 31) +
  text(50, 216, 'Tess’s experience', 28) +
  text(594, 216, 'Daniel’s experience', 28) +
  '<path d="M565 184V352" class="fine"/>' +
  text(50, 282, 'Relief when evenings', 30) +
  text(50, 324, 'do not escalate.', 30) +
  text(594, 282, 'Concerns stay unfinished.', 29) +
  text(594, 324, 'They do not return to them.', 29) +
  rule(382, 1120) +
  text(50, 448, 'Question that changes the review', 27, true) +
  text(50, 502, 'Can they pause and later return', 31, true) +
  text(50, 546, 'to a concern?', 31, true) +
  rule(590, 1120) +
  text(50, 648, 'Relief is real; the original purpose is still unmet.', 28) +
  text(50, 706, 'Fictional accounts, not measured improvement.', 27);

const compact =
  text(40, 46, 'One observation;', 30) +
  text(40, 88, 'two experiences', 30) +
  '<rect x="32" y="120" width="596" height="106" class="context"/>' +
  text(50, 162, 'Both report', 31) +
  text(50, 204, 'fewer arguments.', 31) +
  text(40, 284, 'Tess’s experience', 28) +
  text(40, 336, 'Relief when evenings', 31) +
  text(40, 378, 'do not escalate.', 31) +
  rule(420, 660) +
  text(40, 480, 'Daniel’s experience', 28) +
  text(40, 532, 'Concerns stay unfinished.', 31) +
  text(40, 574, 'They do not return to them.', 31) +
  rule(616, 660) +
  text(40, 676, 'Question for review', 28, true) +
  text(40, 728, 'Can they pause', 31, true) +
  text(40, 770, 'and later return', 31, true) +
  text(40, 812, 'to a concern?', 31, true) +
  rule(854, 660) +
  text(40, 914, 'Relief is real; the original', 29) +
  text(40, 956, 'purpose is still unmet.', 29) +
  text(40, 1022, 'Fictional accounts,', 27) +
  text(40, 1064, 'not measured improvement.', 27);

const figures = [
  ['feedback-different-effects.svg', 1120, 750, wide],
  ['feedback-different-effects-mobile.svg', 660, 1105, compact],
];
for (const [name, width, height, body] of figures) {
  writeFileSync(resolve(directory, name), svg(width, height, body));
}

// Preserve the current shared manifest and upsert only these two dimensions.
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
for (const [name, width, height] of figures) {
  manifest[`systemic-therapy/${name}`] = { width, height };
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Created desktop and phone feedback figures and registered their dimensions.');
