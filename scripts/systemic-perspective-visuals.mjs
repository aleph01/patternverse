import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets');
const directory = resolve(assets, 'systemic-therapy');
mkdirSync(directory, { recursive: true });

// These are alternative accounts within an invented case, not known motives.
// Both compositions keep the event and all three accounts unchanged.
const accounts = [
  {
    label: "Mara's first account",
    meaning: ['“He does not care.”'],
    question: ['What supports or challenges', 'that account?'],
  },
  {
    label: 'A possible constraint',
    meaning: ['“He cannot make Sunday.”'],
    question: ['What makes Sunday possible', 'or difficult?'],
  },
  {
    label: 'A possible disagreement',
    meaning: ['“He wants a different', 'care plan.”'],
    question: ['What help does Lee propose?'],
  },
];
const escape = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x, y, value, size = 26, accent = false) =>
  `<text x="${x}" y="${y}" font-size="${size}"${accent ? ' class="accent"' : ''}>${escape(value)}</text>`;
const rule = (y, width) => `<path d="M32 ${y}H${width - 32}" class="fine"/>`;

const svg = (
  width,
  height,
  body,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-systemic-style="light-editorial">
<title id="title">One event, several possible meanings</title>
<desc id="desc">The fictional event stays the same: Lee declines an extra Sunday visit. Mara's first account is that he does not care. Other possibilities are a practical constraint or disagreement about the care plan. Each account is paired with a question that could clarify it. Green marks inquiry, not a correct or preferred explanation. These are not established motives and the figure shows no clinical outcome.</desc>
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
  text(50, 44, 'Same observation; accounts to check', 28) +
  '<rect x="32" y="70" width="1056" height="78" class="context"/>' +
  text(50, 120, 'Lee declines an extra Sunday visit.', 30) +
  text(50, 205, 'Possible account', 25) +
  text(605, 205, 'Question to explore', 25, true) +
  '<path d="M570 180V670" class="fine"/>' +
  accounts
    .map((account, index) => {
      const y = 250 + index * 150;
      return (
        '<g data-account="' +
        index +
        '">' +
        text(50, y, account.label, 23) +
        account.meaning
          .map((line, lineIndex) => text(50, y + 43 + lineIndex * 40, line, 29))
          .join('') +
        account.question
          .map((line, lineIndex) => text(605, y + 43 + lineIndex * 40, line, 27, true))
          .join('') +
        rule(y + 115, 1120) +
        '</g>'
      );
    })
    .join('') +
  text(50, 728, 'Fictional scenario. Accounts remain provisional.', 25) +
  text(50, 766, 'Green marks inquiry, not an established explanation.', 25);

const compact =
  text(40, 46, 'One event, several possible meanings', 29) +
  text(40, 103, 'Shared observation', 25) +
  '<rect x="32" y="120" width="596" height="106" class="context"/>' +
  text(50, 164, 'Lee declines an extra', 31) +
  text(50, 206, 'Sunday visit.', 31) +
  accounts
    .map((account, index) => {
      const y = 280 + index * 330;
      return (
        '<g data-account="' +
        index +
        '">' +
        text(40, y, account.label, 26) +
        account.meaning
          .map((line, lineIndex) => text(40, y + 48 + lineIndex * 42, line, 31))
          .join('') +
        text(40, y + 136, 'Question to explore', 26, true) +
        account.question
          .map((line, lineIndex) => text(40, y + 180 + lineIndex * 42, line, 29, true))
          .join('') +
        rule(y + 260, 660) +
        '</g>'
      );
    })
    .join('') +
  text(40, 1260, 'Fictional accounts to check.', 27) +
  text(40, 1302, 'No explanation is established here.', 27);

const figures = [
  ['perspective-care-accounts.svg', 1120, 800, wide],
  ['perspective-care-accounts-mobile.svg', 660, 1340, compact],
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
console.log('Created desktop and phone perspective comparisons and registered their dimensions.');
