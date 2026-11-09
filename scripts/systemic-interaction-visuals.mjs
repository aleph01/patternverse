import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets');
const directory = resolve(assets, 'systemic-therapy');
mkdirSync(directory, { recursive: true });

// The variation changes the reply while preserving the fictional opening.
// Its next response is deliberately left open rather than drawn as a success.
const escape = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x, y, value, size = 28, accent = false) =>
  `<text x="${x}" y="${y}" font-size="${size}"${accent ? ' class="accent"' : ''}>${escape(value)}</text>`;
const rule = (y, width) => `<path d="M32 ${y}H${width - 32}" class="fine"/>`;
const arrow = (path) => `<path d="${path}" class="sequence" marker-end="url(#order)"/>`;
const svg = (
  width,
  height,
  body,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-systemic-style="light-editorial">
<title id="title">One changed reply, with the next response left open</title>
<desc id="desc">Both fictional sequences begin with Maia describing a difficult shift. In the familiar sequence, Owen offers solutions, followed by Maia explaining why they will not work. In the agreed variation, Owen asks what kind of response she wants. The next response remains open to discover. Green marks the changed reply. Arrows indicate response order, not established causation. No improvement is predicted or measured.</desc>
<defs><marker id="order" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="#a6aca3" stroke-width="1.25"/></marker></defs>
<style>
:root{color-scheme:only light;--paper:#ffffff;--ink:#252c28;--secondary:#a6aca3;--neutral:#f1f2ef;--mint:#edf5f0;--accent:#00855b}
svg{background:#ffffff;color:var(--ink)}
text{fill:var(--ink);font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}
path,rect{vector-effect:non-scaling-stroke;stroke-linecap:butt;stroke-linejoin:round}
.paper{fill:var(--paper)}.context{fill:var(--neutral)}
.fine{fill:none;stroke:var(--secondary);stroke-width:1}
.sequence{fill:none;stroke:var(--secondary);stroke-width:1.25}
.accent{fill:var(--accent)}
</style>
<rect width="${width}" height="${height}" class="paper"/>
${body}
</svg>\n`;

const wide =
  text(50, 46, 'One changed reply; the response stays open', 30) +
  '<rect x="32" y="78" width="1056" height="112" class="context"/>' +
  text(50, 118, 'Same opening', 24) +
  text(50, 164, 'Maia describes a difficult shift.', 31) +
  text(50, 250, 'Familiar sequence', 27) +
  text(50, 310, 'Owen offers solutions.', 29) +
  arrow('M500 328H600') +
  text(650, 310, 'Maia explains why', 29) +
  text(650, 352, 'they will not work.', 29) +
  rule(402, 1120) +
  text(50, 468, 'Agreed variation', 27) +
  text(50, 526, 'Owen asks what kind', 29, true) +
  text(50, 568, 'of response she wants.', 29, true) +
  arrow('M500 544H600') +
  text(650, 526, 'Next response:', 29) +
  text(650, 568, 'open to discover.', 29) +
  rule(618, 1120) +
  text(50, 684, 'Green marks the changed reply.', 27) +
  text(50, 726, 'Arrows show response order, not proven causes.', 27) +
  text(50, 768, 'Fictional comparison; no outcome is predicted.', 27);

const compact =
  text(40, 46, 'One changed reply', 30) +
  text(40, 90, 'The next response stays open', 28) +
  '<rect x="32" y="120" width="596" height="150" class="context"/>' +
  text(50, 164, 'Same opening', 26) +
  text(50, 208, 'Maia describes', 31) +
  text(50, 250, 'a difficult shift.', 31) +
  text(40, 330, 'Familiar sequence', 28) +
  text(40, 390, 'Owen offers solutions.', 31) +
  arrow('M40 425V475') +
  text(40, 535, 'Maia explains why', 31) +
  text(40, 579, 'they will not work.', 31) +
  rule(625, 660) +
  text(40, 690, 'Agreed variation', 28) +
  text(40, 750, 'Owen asks what kind', 31, true) +
  text(40, 794, 'of response she wants.', 31, true) +
  arrow('M40 830V880') +
  text(40, 940, 'Next response:', 31) +
  text(40, 984, 'open to discover.', 31) +
  rule(1030, 660) +
  text(40, 1090, 'Green marks the changed reply.', 28) +
  text(40, 1140, 'Arrows show response order,', 27) +
  text(40, 1182, 'not proven causes.', 27) +
  text(40, 1250, 'Fictional comparison;', 27) +
  text(40, 1292, 'no outcome is predicted.', 27);

const figures = [
  ['interaction-changed-reply.svg', 1120, 810, wide],
  ['interaction-changed-reply-mobile.svg', 660, 1335, compact],
];
for (const [name, width, height, body] of figures) {
  writeFileSync(resolve(directory, name), svg(width, height, body));
}

// Read the shared manifest immediately before updating only our own entries.
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
for (const [name, width, height] of figures) {
  manifest[`systemic-therapy/${name}`] = { width, height };
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Created desktop and phone interaction figures and registered their dimensions.');
