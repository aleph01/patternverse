import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets');
const directory = resolve(assets, 'systemic-therapy');
mkdirSync(directory, { recursive: true });

// Both compositions describe the same invented comparison. No variable was
// isolated, and neither composition represents a measured clinical outcome.
const conditions = [
  { label: 'Timing', usual: 'Late; both tired', sunday: 'After lunch; time available' },
  { label: 'Preparation', usual: 'Requests raised in passing', sunday: 'Three written decisions' },
  {
    label: 'Availability',
    usual: 'Work shifts unchecked',
    sunday: 'Shifts checked before agreeing',
  },
];
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
<title id="title">Conditions surrounding a helpful exception</title>
<desc id="desc">In Nora and Ian's fictional household-planning example, the responsibilities and work schedules remain the same. Difficult discussions happen late, with requests raised in passing and shifts unchecked. One manageable Sunday discussion followed lunch, used three written decisions, and included checking shifts. Several conditions differed together; no cause is established. Green labels candidate helpful conditions, not measured improvement.</desc>
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
  text(50, 46, 'What surrounded the exception?', 30) +
  '<rect x="32" y="76" width="1056" height="78" class="context"/>' +
  text(50, 126, 'Same household responsibilities and work schedules', 30) +
  text(50, 212, 'Difficult conversations', 28) +
  text(594, 212, 'One manageable Sunday', 28, true) +
  '<path d="M565 184V648" class="fine"/>' +
  conditions
    .map((condition, index) => {
      const y = 268 + index * 132;
      return (
        '<g data-condition="' +
        index +
        '">' +
        text(50, y, condition.label, 24) +
        text(50, y + 46, condition.usual, 29) +
        text(594, y + 46, condition.sunday, 28, true) +
        rule(y + 76, 1120) +
        '</g>'
      );
    })
    .join('') +
  text(50, 700, 'Several conditions differed together; no cause is established.', 27) +
  text(50, 744, 'Fictional comparison. Green marks candidate helpful conditions.', 27);

const compact =
  text(40, 46, 'What surrounded the exception?', 29) +
  '<rect x="32" y="78" width="596" height="110" class="context"/>' +
  text(50, 123, 'Same household responsibilities', 30) +
  text(50, 166, 'and work schedules', 30) +
  conditions
    .map((condition, index) => {
      const y = 250 + index * 280;
      return (
        '<g data-condition="' +
        index +
        '">' +
        text(40, y, condition.label, 28) +
        text(40, y + 48, 'Difficult conversations', 26) +
        text(40, y + 94, condition.usual, 31) +
        text(40, y + 150, 'One manageable Sunday', 26, true) +
        text(40, y + 196, condition.sunday, 30, true) +
        rule(y + 228, 660) +
        '</g>'
      );
    })
    .join('') +
  text(40, 1110, 'Several conditions differed together.', 28) +
  text(40, 1152, 'No cause is established.', 28) +
  text(40, 1210, 'Fictional comparison. Green marks', 27) +
  text(40, 1252, 'candidate helpful conditions.', 27);

const figures = [
  ['helpful-conversation-conditions.svg', 1120, 780, wide],
  ['helpful-conversation-conditions-mobile.svg', 660, 1290, compact],
];
for (const [name, width, height, body] of figures) {
  writeFileSync(resolve(directory, name), svg(width, height, body));
}

// Read the current shared manifest immediately before updating our two entries.
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
for (const [name, width, height] of figures) {
  manifest[`systemic-therapy/${name}`] = { width, height };
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Created desktop and phone resource comparisons and registered their dimensions.');
