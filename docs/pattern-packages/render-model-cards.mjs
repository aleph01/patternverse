import { lightEditorial } from './ml-illustration-style.mjs';
// Original evidence-to-use diagram for a fictional model card. No model is executed.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const e = metadata.patterns.find((p) => p.id === 'ml-model-cards').example;
const groups = e.groups.map((g) => ({ ...g, accuracy: g.correct / g.total }));
const total = groups.reduce((s, g) => s + g.total, 0),
  correct = groups.reduce((s, g) => s + g.correct, 0);
const rows = [
  { name: 'All tickets', correct, total, accuracy: correct / total },
  { ...groups[0], name: 'Short tickets' },
  { ...groups[1], name: 'Long tickets' },
];
const manifestPath = resolve(root, 'content/assets/manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x, y, size, value, bold = false) =>
  '<text x="' +
  x +
  '" y="' +
  y +
  '" font-size="' +
  size +
  '"' +
  (bold ? ' font-weight="700"' : '') +
  '>' +
  esc(value) +
  '</text>';
const rect = (x, y, w, h, fill = '#f2f6f2', dash = false) =>
  '<rect x="' +
  x +
  '" y="' +
  y +
  '" width="' +
  w +
  '" height="' +
  h +
  '" rx="8" fill="' +
  fill +
  '" stroke="#b4c7b9"' +
  (dash ? ' stroke-dasharray="5 4"' : '') +
  '/>';
for (const mobile of [false, true]) {
  const width = mobile ? 360 : 720,
    height = mobile ? 1360 : 970,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 36, 27, 'A score needs', true) +
      text(left, 70, 27, 'a scope.', true) +
      text(left, 103, 14, 'Fictional model card · evidence and boundaries')
    : text(left, 43, 29, 'A score needs a scope.', true) +
      text(left, 80, 17, 'A model card carries evidence and boundaries with a specific release.');
  body +=
    rect(left, 125, wide, mobile ? 125 : 90) +
    text(left + 12, 155, 19, e.model + ' ' + e.version, true);
  body += text(left + 12, 184, 14, 'Card revision ' + e.card_revision + ' · owner: ' + e.owner);
  body += mobile
    ? text(left + 12, 212, 14, 'Fixed tokenizer · ' + e.input_limit_tokens + '-token limit') +
      text(left + 12, 237, 14, 'Highest-scoring queue → agent confirmation')
    : text(
        left + 12,
        201,
        14,
        'Fixed tokenizer · ' +
          e.input_limit_tokens +
          '-token limit · highest-scoring queue → agent confirmation',
      );
  const cy = mobile ? 280 : 250,
    cw = mobile ? 328 : 295;
  body +=
    rect(left, cy, cw, 190) +
    text(left + 12, cy + 30, 19, 'The claim', true) +
    text(left + 12, cy + 67, 20, Math.round((correct / total) * 100) + '% accuracy', true) +
    text(left + 12, cy + 100, 15, 'Matched reviewer-assigned queues') +
    text(left + 12, cy + 132, 15, 'on English holdout tickets.') +
    text(left + 12, cy + 164, 14, 'Evidence reference: ' + e.evaluation_report);
  const ex = mobile ? left : 335,
    ey = mobile ? 500 : 250,
    ew = mobile ? wide : 365,
    eh = mobile ? 295 : 240;
  body +=
    rect(ex, ey, ew, eh) +
    text(ex + 12, ey + 30, 19, 'The evidence', true) +
    text(ex + 12, ey + 57, 14, e.evaluation_report + ' · one held-out ticket per customer');
  rows.forEach((r, i) => {
    const y = ey + 90 + i * (mobile ? 68 : 54),
      bar = mobile ? 230 : 265;
    body +=
      text(ex + 12, y, 15, r.name, true) +
      text(ex + ew - 12, y, 15, Math.round(r.accuracy * 100) + '%');
    // Anchor percentages to the right inside the card, independent of string width.
    body = body.replace(
      'x="' + (ex + ew - 12) + '" y="' + y + '"',
      'x="' + (ex + ew - 12) + '" text-anchor="end" y="' + y + '"',
    );
    body +=
      '<rect x="' +
      (ex + 12) +
      '" y="' +
      (y + 9) +
      '" width="' +
      bar +
      '" height="8" rx="3" fill="#dfe9e1"/><rect x="' +
      (ex + 12) +
      '" y="' +
      (y + 9) +
      '" width="' +
      bar * r.accuracy +
      '" height="8" rx="3" fill="#28684d"/>' +
      text(
        ex + 12,
        y + 35,
        13,
        r.correct.toLocaleString('en-US') + ' / ' + r.total.toLocaleString('en-US') + ' correct',
      );
  });
  const by = mobile ? 825 : 535,
    bh = mobile ? 250 : 200;
  body +=
    rect(left, by, wide, bh) +
    text(left + 12, by + 30, 19, 'Boundaries travel with the score', true);
  const lines = mobile
    ? [
        'Intended: English queue suggestions',
        'with agent confirmation.',
        'Long tickets: route manually pending',
        'further evaluation.',
        'Spanish tickets: not evaluated.',
        'Automatic closure: outside intended use.',
      ]
    : [
        'Intended: English queue suggestions with agent confirmation.',
        'Long tickets: route manually pending further evaluation.',
        'Spanish tickets: not evaluated.',
        'Automatic closure: outside intended use.',
      ];
  lines.forEach((s, i) => {
    body += text(left + 12, by + 64 + i * 28, 15, s);
  });
  const vy = mobile ? 1105 : 770,
    vh = mobile ? 150 : 115;
  body +=
    rect(left, vy, wide, vh, '#fff', true) +
    text(left + 12, vy + 30, 19, 'New release → new evidence', true) +
    text(left + 12, vy + 62, 15, '1.3: new weights · 256-token limit');
  body += mobile
    ? text(left + 12, vy + 94, 15, 'Evaluation pending. E17 describes 1.2.') +
      text(left + 12, vy + 126, 14, 'Copying the card does not validate 1.3.')
    : text(
        left + 12,
        vy + 94,
        15,
        'Evaluation pending. E17 describes 1.2; copying its card does not validate 1.3.',
      );
  body += mobile
    ? text(left, 1300, 14, 'Fictional counts; observed point estimates.') +
      text(left, 1328, 14, 'Documentation does not enforce restrictions.')
    : text(
        left,
        930,
        14,
        'Fictional counts · observed point estimates · documentation does not enforce restrictions.',
      );
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    width +
    '" height="' +
    height +
    '" viewBox="0 0 ' +
    width +
    ' ' +
    height +
    '" role="img" aria-labelledby="title desc"><title id="title">A model card binds a release to evidence and use boundaries</title><desc id="desc">Fictional route-assist version 1.2 has 920 correct of 1,000 tickets, or 92 percent. Short tickets are 855 of 900, or 95 percent; long tickets are 65 of 100, or 65 percent. Evidence report E17 describes English queue suggestions confirmed by an agent. Long tickets require manual routing pending evaluation. Spanish is not evaluated; automatic case closure is outside intended use. Version 1.3 changes weights and the input limit and needs its own evidence. Documentation does not enforce restrictions or certify deployment.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/model-cards' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Model Cards desktop and phone illustrations.');
