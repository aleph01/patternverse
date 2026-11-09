import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets');
const directory = resolve(assets, 'systemic-therapy');
mkdirSync(directory, { recursive: true });

// Desired differences in a fictional conversation, not clinical measurements.
// The two compositions preserve each person's account and the unresolved issues.
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
<title id="title">A shared hope and two accounts of its meaning</title>
<desc id="desc">In the fictional case, Ellie and Paul both want more trust. Ellie would notice time with friends without repeated checking, and acknowledgment of updates without further questions. Paul would notice a clear return arrangement, updates when plans change, and room to ask about delays without accusations. Some overlap is identified: clear plans and delays discussed without accusations. Contact frequency and return time remain disputed. These are desired differences, not observed improvements.</desc>
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
  text(50, 46, 'From a shared word to different signs', 30) +
  '<rect x="32" y="76" width="1056" height="78" class="context"/>' +
  text(50, 126, 'Shared hope: more trust', 31) +
  text(50, 216, 'Ellie would notice', 28) +
  text(594, 216, 'Paul would notice', 28) +
  '<path d="M565 184V450" class="fine"/>' +
  text(50, 282, 'Time with friends', 31) +
  text(50, 326, 'without repeated checking', 29) +
  text(50, 390, 'An update is acknowledged', 29) +
  text(50, 433, 'without more questions', 29) +
  text(594, 282, 'A clear return arrangement', 29) +
  text(594, 326, 'An update if plans change', 29) +
  text(594, 390, 'Room to ask what happened', 29) +
  text(594, 433, 'without an accusation', 29) +
  rule(475, 1120) +
  text(50, 535, 'Some overlap', 28, true) +
  text(50, 584, 'Clear plans; delays discussed without accusations', 29, true) +
  rule(624, 1120) +
  text(50, 680, 'Still to agree: contact frequency and return time.', 28) +
  text(50, 738, 'Fictional desired differences, not observed results.', 27);

const compact =
  text(40, 46, 'From a shared word to different signs', 29) +
  '<rect x="32" y="76" width="596" height="80" class="context"/>' +
  text(50, 126, 'Shared hope: more trust', 31) +
  text(40, 220, 'Ellie would notice', 28) +
  text(40, 270, 'Time with friends', 31) +
  text(40, 312, 'without repeated checking', 31) +
  text(40, 370, 'An update is acknowledged', 31) +
  text(40, 412, 'without more questions', 31) +
  rule(450, 660) +
  text(40, 510, 'Paul would notice', 28) +
  text(40, 560, 'A clear return arrangement', 31) +
  text(40, 602, 'An update if plans change', 31) +
  text(40, 660, 'Room to ask what happened', 31) +
  text(40, 702, 'without an accusation', 31) +
  rule(740, 660) +
  text(40, 800, 'Some overlap', 28, true) +
  text(40, 850, 'Clear plans; delays discussed', 31, true) +
  text(40, 892, 'without accusations', 31, true) +
  rule(930, 660) +
  text(40, 985, 'Still to agree:', 28) +
  text(40, 1027, 'contact frequency and return time', 29) +
  text(40, 1090, 'Fictional desired differences,', 27) +
  text(40, 1132, 'not observed results.', 27);

const figures = [
  ['preferred-future-trust.svg', 1120, 780, wide],
  ['preferred-future-trust-mobile.svg', 660, 1170, compact],
];
for (const [name, width, height, body] of figures) {
  writeFileSync(resolve(directory, name), svg(width, height, body));
}

// Preserve the current shared manifest and update only these two assets.
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
for (const [name, width, height] of figures) {
  manifest[`systemic-therapy/${name}`] = { width, height };
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Created desktop and phone preferred-future figures and registered their dimensions.');
