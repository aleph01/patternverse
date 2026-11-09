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

const dashed = (d) =>
  `<path d="${d}" fill="none" stroke="#626962" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#wiring)"/>`;

const trackingDescription =
  'One maintenance operation registers label A as modified, B as new, and C as removed. The Unit of Work tracks those object snapshots, then translates them into UPDATE, INSERT, and DELETE operations under one database transaction. No registration writes SQL by itself.';
const failureDescription =
  'The Unit of Work updates A, then attempts to insert duplicate B. The insert fails, so the transaction rolls back the earlier update. A retains its committed value, and the failed Unit of Work is discarded. A successful batch can commit all three kinds of change together.';
function tracking(compact) {
  const drawing = compact
    ? text(24, 32, 'Track the objects,', 22) +
      text(24, 60, 'then coordinate the writes', 22) +
      card(24, 104, 312, 'One maintenance operation', 'Rename A · add B · retire C', false, 100) +
      arrow('M180 204V278') +
      rect(24, 280, 312, 620, true, true) +
      text(40, 318, 'Unit of Work registry', 21) +
      card(44, 356, 272, 'Modified A', 'Ready → UPDATE', false, 100) +
      card(44, 496, 272, 'New B', 'New → INSERT', false, 100) +
      card(44, 636, 272, 'Removed C', 'Obsolete → DELETE', false, 100) +
      text(44, 800, 'Final snapshots only', 17) +
      text(44, 836, 'No SQL during registration', 17, true) +
      card(24, 996, 312, 'Explicit commit', 'Flush, then commit transaction', true, 120) +
      arrow('M180 900V994') +
      text(24, 1180, 'UPDATE → INSERT → DELETE', 18) +
      text(24, 1216, 'One local persistence boundary', 17, true)
    : text(24, 34, 'Track objects before coordinating persistence', 24) +
      card(
        24,
        84,
        672,
        'One label-maintenance operation',
        'Rename A · add B · retire C',
        false,
        88,
      ) +
      arrow('M360 172V246') +
      rect(24, 248, 672, 320, true, true) +
      text(44, 286, 'Unit of Work registry', 23) +
      rect(44, 324, 192, 128) +
      text(60, 358, 'Modified', 20) +
      text(60, 400, 'A → Ready', 18) +
      text(60, 434, 'UPDATE', 17, true) +
      rect(264, 324, 192, 128) +
      text(280, 358, 'New', 20) +
      text(280, 400, 'B → New', 18) +
      text(280, 434, 'INSERT', 17, true) +
      rect(484, 324, 192, 128) +
      text(500, 358, 'Removed', 20) +
      text(500, 400, 'C → Obsolete', 18) +
      text(500, 434, 'DELETE', 17, true) +
      text(44, 520, 'Registration collects snapshots; no SQL yet.', 19) +
      card(
        24,
        664,
        672,
        'Commit: flush registered writes, then COMMIT',
        'One business scope; one local database transaction',
        true,
        100,
      ) +
      arrow('M360 568V662') +
      text(376, 620, 'explicit commit', 17, true) +
      text(24, 824, 'Registry order here: UPDATE → INSERT → DELETE.', 18);
  return svg(
    'Unit of Work tracks new, modified, and removed objects',
    trackingDescription,
    compact ? 360 : 720,
    compact ? 1252 : 860,
    drawing,
  );
}
function failure(compact) {
  const drawing = compact
    ? text(24, 32, 'A later write fails;', 22) +
      text(24, 60, 'earlier writes roll back', 22) +
      card(24, 104, 312, 'Committed labels', 'A: Ready · B: New', false, 100) +
      arrow('M180 204V282') +
      rect(24, 284, 312, 580, true, true) +
      text(40, 320, 'One commit attempt', 21) +
      card(44, 352, 272, 'UPDATE A → Wrong', 'Provisional write', false, 100) +
      card(44, 512, 272, 'INSERT B → Duplicate', 'Uniqueness constraint fails', false, 100) +
      arrow('M180 452V510') +
      card(44, 712, 272, 'ROLLBACK', 'Undo earlier UPDATE', false, 100) +
      dashed('M180 612V710') +
      card(24, 960, 312, 'A: Ready · B: New', 'Committed state unchanged', true, 100) +
      dashed('M180 812V958') +
      text(24, 1124, 'Failed scope is finished.', 18) +
      text(24, 1160, 'Retry with a new Unit of Work.', 17, true) +
      text(24, 1196, 'Dashed: failure / rollback', 16, true)
    : text(24, 34, 'A later write fails; earlier writes roll back', 24) +
      card(24, 84, 672, 'Committed labels', 'A: Ready · B: New', false, 88) +
      arrow('M360 172V246') +
      rect(24, 248, 672, 392, true, true) +
      text(44, 286, 'One commit attempt', 23) +
      card(44, 324, 280, 'UPDATE A → Wrong', 'Provisional write', false, 100) +
      card(396, 324, 280, 'INSERT B → Duplicate', 'Uniqueness constraint fails', false, 100) +
      arrow('M324 374H394') +
      card(44, 508, 632, 'ROLLBACK', 'Undo earlier UPDATE', false, 88) +
      dashed('M536 424V466H360V506') +
      text(552, 460, 'fails', 17, true) +
      card(24, 728, 672, 'Committed labels unchanged', 'A: Ready · B: New', true, 88) +
      dashed('M360 596V726') +
      text(24, 880, 'Failed scope closes; retry with fresh inputs.', 18) +
      text(24, 916, 'Dashed: failed write and rollback path.', 17, true);
  return svg(
    'A failed Unit of Work rolls back its earlier writes',
    failureDescription,
    compact ? 360 : 720,
    compact ? 1232 : 952,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['unit-of-work-tracking', tracking],
  ['unit-of-work-failure', failure],
]) {
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`;
    const content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[`software-engineering/${filename}`] = {
      width: Number(width),
      height: Number(height),
    };
  }
}
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await writeFile(manifestPath, JSON.stringify({ ...manifest, ...dimensions }, null, 2) + '\n');
console.log('Built Unit of Work tracking and failure figures with separate phone layouts.');
