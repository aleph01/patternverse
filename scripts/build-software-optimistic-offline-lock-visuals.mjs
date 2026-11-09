import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets/software-engineering');
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 19, secondary = false) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${secondary ? '#626962' : '#252c28'}">${esc(value)}</text>`;
const rect = (x, y, width, height, accent = false, surface = false) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${surface ? '#fff' : accent ? '#edf5f0' : '#f1f2ef'}" stroke="${accent ? '#00855b' : '#a6aca3'}" stroke-width="1.2"/>`;
const arrow = (d) =>
  `<path d="${d}" fill="none" stroke="#00855b" stroke-width="1.5" marker-end="url(#arrow)"/>`;
const card = (x, y, width, title, detail, accent = false, height = 76, small = false) =>
  rect(x, y, width, height, accent) +
  text(x + 16, y + 29, title, small ? 18 : 20) +
  text(x + 16, y + 55, detail, small ? 16 : 17, true);

function svg(title, description, width, height, drawing) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}path,rect{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker><marker id="wiring" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#626962" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}

const conflictDescription =
  "Alice and Bob both read note version 1 and edit outside database transactions. Alice's conditional save matches version 1, writes her title, and commits version 2. Bob's later save still expects version 1, matches no row, and is rejected without overwriting Alice.";
const saveDescription =
  'A short save transaction conditionally changes the note and advances its version, then inserts the edit-log row. Both commit together. A stale version or later log failure rolls the transaction back. After conflict, the application reloads and reviews before making a new proposal; it does not blindly retry the old replacement.';
function conflict(compact) {
  const d = compact
    ? text(24, 32, 'Two edits start', 22) +
      text(24, 60, 'at version 1', 22) +
      card(
        24,
        104,
        312,
        'Same note, read separately',
        'Each keeps its original token.',
        false,
        100,
      ) +
      text(24, 248, 'Reads', 18) +
      rect(8, 264, 344, 312, false, true) +
      arrow('M180 204V262') +
      card(24, 296, 312, 'Alice: Launch plan', 'Expected version: 1', false, 100) +
      card(24, 440, 312, 'Bob: Budget plan', 'Expected version: 1', false, 100) +
      text(24, 628, 'No transaction held while editing.', 18) +
      card(24, 712, 312, '1. Alice: v1 matches', 'Store Launch plan; version 2.', true, 124) +
      card(24, 948, 312, '2. Bob: v1 is stale', 'Zero matches; conflict.', false, 124) +
      text(40, 1042, 'Stored version 2 remains.', 17, true) +
      arrow('M180 836V946') +
      text(196, 900, 'save later', 17, true) +
      text(24, 1140, 'Reload and review;', 18) +
      text(24, 1176, 'do not blindly retry.', 17, true)
    : text(24, 34, 'Two edits start at version 1', 24) +
      card(
        24,
        84,
        672,
        'Load independently: same note, version 1',
        'Both snapshots keep the original version.',
        false,
        88,
      ) +
      card(24, 248, 312, 'Alice: Launch plan', 'Expected version: 1', false, 100) +
      card(384, 248, 312, 'Bob: Budget plan', 'Expected version: 1', false, 100) +
      arrow('M180 172V246') +
      arrow('M540 172V246') +
      text(24, 408, 'Editing interval: no database transaction held.', 18, true) +
      card(
        24,
        464,
        672,
        '1. Alice saves: WHERE version = 1 matches',
        'Title: Launch plan; committed version: 2',
        true,
        100,
      ) +
      card(
        24,
        664,
        672,
        '2. Bob saves: WHERE version = 1 matches zero',
        'Conflict; Alice’s version 2 remains.',
        false,
        100,
      ) +
      arrow('M360 564V662') +
      text(376, 620, 'Bob saves later', 17, true) +
      text(24, 834, 'Reload and review before proposing another write.', 18);
  return svg(
    'Original-version validation rejects the later stale save',
    conflictDescription,
    compact ? 360 : 720,
    compact ? 1224 : 880,
    d,
  );
}
function saving(compact) {
  const d = compact
    ? text(24, 32, 'One short save transaction', 22) +
      text(24, 60, 'contains every write', 22) +
      rect(8, 84, 344, 1000, true, true) +
      card(24, 132, 312, 'BEGIN IMMEDIATE', 'Short write transaction.', false, 120) +
      card(24, 352, 312, 'UPDATE: ID + version', 'One match required.', true, 144) +
      text(40, 462, 'Title + version provisional.', 17, true) +
      card(24, 624, 312, 'INSERT edit-log row', 'Still provisional.', false, 116) +
      card(24, 884, 312, 'COMMIT', 'Now report success.', true, 116) +
      arrow('M180 252V350') +
      arrow('M180 496V622') +
      arrow('M180 740V882') +
      text(24, 1148, 'After BEGIN: error → ROLLBACK.', 18) +
      text(24, 1184, 'Reload and review a conflict.', 17, true)
    : text(24, 34, 'Compare, write, and complete together', 24) +
      rect(24, 84, 672, 768, true, true) +
      card(44, 132, 632, 'BEGIN IMMEDIATE', 'One short database write transaction.', false, 88) +
      card(
        44,
        320,
        632,
        'Conditional UPDATE: ID + expected version',
        'One match → title and version are provisional.',
        true,
        100,
      ) +
      card(44, 520, 632, 'INSERT edit-log row', 'Still provisional.', false, 88) +
      card(44, 720, 632, 'COMMIT', 'Now return the new snapshot.', true, 88) +
      arrow('M360 220V318') +
      arrow('M360 420V518') +
      arrow('M360 608V718') +
      text(24, 916, 'After BEGIN: any error rolls back this save.', 18);
  return svg(
    'Conditional update and edit log share one completion boundary',
    saveDescription,
    compact ? 360 : 720,
    compact ? 1224 : 960,
    d,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['optimistic-offline-lock-conflict', conflict],
  ['optimistic-offline-lock-save', saving],
])
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`,
      content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[`software-engineering/${filename}`] = { width: +width, height: +height };
  }
const p = resolve(root, 'content/assets/manifest.json');
await writeFile(
  p,
  JSON.stringify({ ...JSON.parse(await readFile(p, 'utf8')), ...dimensions }, null, 2) + '\n',
);
console.log('Built Optimistic Offline Lock figures and phone layouts.');
