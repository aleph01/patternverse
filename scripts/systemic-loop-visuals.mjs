import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets');
const directory = resolve(assets, 'systemic-therapy');
mkdirSync(directory, { recursive: true });

// Fictional interview reconstruction. Quotes are invented participant accounts,
// not observed clinical data or assertions about an absent person's motives.
const steps = [
  {
    name: 'Asha',
    action: ['asks about homework'],
    meaning: ['“I need to know', 'where he is up to.”'],
  },
  {
    name: 'Leo',
    action: ['answers briefly,', 'turns away'],
    meaning: ['“It feels like', 'an inspection.”'],
  },
  { name: 'Asha', action: ['asks again, moves closer'], meaning: ['“He is ignoring it.”'] },
  { name: 'Leo', action: ['stops answering'], meaning: ['“I need space.”'] },
];

const text = (x, y, value, size = 26, anchor = 'start') =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${value}</text>`;
const arrow = (d, returning = false) =>
  `<path d="${d}" class="${returning ? 'return' : 'sequence'}" marker-end="url(#${returning ? 'green' : 'gray'})"/>`;
const node = (step, x, y, width, compact = false) =>
  `<g data-participant="${step.name}"><rect x="${x}" y="${y}" width="${width}" height="220" class="episode"/>` +
  text(x + 22, y + 34, step.name, compact ? 27 : 24) +
  step.action
    .map((line, index) => text(x + 22, y + 79 + index * 42, line, compact ? 30 : 28))
    .join('') +
  step.meaning
    .map((line, index) => text(x + 22, y + 164 + index * 33, line, compact ? 27 : 24))
    .join('') +
  '</g>';

const svg = (
  width,
  height,
  body,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-systemic-style="light-editorial">
<title id="title">Checking that produces less information</title>
<desc id="desc">A fictional homework exchange: Asha asks about progress; Leo answers briefly and turns away; Asha asks again and moves closer; Leo stops answering. Each event includes an invented first-person account. The green return arrow highlights Asha's account that less information prompts renewed checking. Arrows represent the reconstructed sequence, not proven causes or equal responsibility.</desc>
<defs>
<marker id="gray" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="#a6aca3" stroke-width="1.25"/></marker>
<marker id="green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="#00855b" stroke-width="1.5"/></marker>
</defs>
<style>
:root{color-scheme:only light;--paper:#ffffff;--ink:#252c28;--secondary:#a6aca3;--neutral:#f1f2ef;--mint:#edf5f0;--accent:#00855b}
svg{background:#ffffff;color:var(--ink)}
text{fill:var(--ink);font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}
path,rect{vector-effect:non-scaling-stroke;stroke-linecap:butt;stroke-linejoin:round}
.paper{fill:var(--paper)}.episode{fill:var(--neutral);stroke:var(--secondary);stroke-width:1}
.sequence{fill:none;stroke:var(--secondary);stroke-width:1.25}
.return{fill:none;stroke:var(--accent);stroke-width:1.5}
</style>
<rect width="${width}" height="${height}" class="paper"/>
${body}
</svg>\n`;

const wide =
  text(540, 46, 'Asha and Leo · reconstructed episode', 27, 'middle') +
  arrow('M480 210H620') +
  arrow('M810 320V470') +
  arrow('M620 580H480') +
  arrow('M100 580H42V210H100', true) +
  node(steps[0], 100, 100, 380) +
  node(steps[1], 620, 100, 380) +
  node(steps[2], 620, 470, 380) +
  node(steps[3], 100, 470, 380) +
  arrow('M46 746H94', true) +
  text(112, 754, 'Green traces the return to checking.', 24) +
  text(46, 803, 'Arrows show a reconstructed sequence, not proven causes.', 24);

const compact =
  text(330, 46, 'Asha and Leo · one episode', 28, 'middle') +
  arrow('M330 310V390') +
  arrow('M330 610V690') +
  arrow('M330 910V990') +
  arrow('M90 1100H38V200H90', true) +
  steps.map((step, index) => node(step, 90, 90 + index * 300, 480, true)).join('') +
  arrow('M46 1278H94', true) +
  text(112, 1286, 'Return to checking', 27) +
  text(46, 1332, 'Arrows follow the described sequence.', 26) +
  text(46, 1370, 'They do not prove causation.', 26);

const figures = [
  ['homework-loop.svg', 1080, 840, wide],
  ['homework-loop-mobile.svg', 660, 1410, compact],
];
for (const [name, width, height, body] of figures) {
  writeFileSync(resolve(directory, name), svg(width, height, body));
}

// Merge with the current shared manifest; do not regenerate other articles.
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
for (const [name, width, height] of figures) {
  manifest[`systemic-therapy/${name}`] = { width, height };
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Created desktop and phone loop diagrams and registered their dimensions.');
