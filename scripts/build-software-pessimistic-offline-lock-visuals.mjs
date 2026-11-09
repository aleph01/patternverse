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

const reservationDescription =
  "A short acquisition transaction stores Alice's unique owner token and commits. Alice edits with no database transaction held open. Bob's competing acquisition is refused while that lock row exists. Alice later saves under an ownership check and removes the lock in one short transaction.";
const ownershipDescription =
  "After Alice's ownership ends, Bob acquires the note using a fresh token. A late save using Alice's old token matches no ownership row and is rejected. A late cancellation using that token cannot remove Bob's lock. Bob can still save or cancel his own reservation.";
function reservation(compact) {
  const d = compact
    ? text(24, 32, 'Reserve write ownership', 22) +
      text(24, 60, 'across separate requests', 22) +
      card(24, 104, 312, '1. Acquire', 'Insert A; read protected title.', true, 144) +
      text(40, 214, 'COMMIT; return handle.', 17, true) +
      card(24, 352, 312, '2. Edit across requests', 'Committed lock row persists.', false, 116) +
      arrow('M180 248V350') +
      card(24, 592, 312, 'Competing acquisition', 'Existing note key → Busy.', false, 116) +
      arrow('M180 468V590') +
      card(24, 824, 312, '3. Owner saves', 'Check A; write; delete lock.', true, 144) +
      text(40, 934, 'COMMIT all three together.', 17, true) +
      arrow('M180 708V822') +
      text(196, 770, 'owner completes', 17, true) +
      text(24, 1040, 'Lock row persists between calls.', 18) +
      text(24, 1080, 'No long database transaction.', 17, true)
    : text(24, 34, 'Logical ownership outlives short transactions', 24) +
      card(
        24,
        84,
        672,
        '1. Acquire write ownership',
        'Insert owner A; read title; COMMIT.',
        true,
        120,
      ) +
      text(40, 178, 'Return the acquisition handle.', 17, true) +
      card(
        24,
        320,
        672,
        '2. Edit across requests',
        'No database transaction held; lock row persists.',
        false,
        100,
      ) +
      arrow('M360 204V318') +
      card(24, 520, 312, 'Bob tries to acquire', 'Existing note key → Busy.', false, 112) +
      card(384, 520, 312, 'Alice saves with A', 'Check owner; write; delete lock.', true, 112) +
      arrow('M180 420V518') +
      arrow('M540 420V518') +
      card(
        24,
        744,
        672,
        'Short completion transaction',
        'Ownership check, data write, and release commit together.',
        true,
        88,
      ) +
      arrow('M540 632V742') +
      text(24, 892, 'Read-only queries remain allowed.', 17, true);
  return svg(
    'A persistent write reservation spans an offline edit',
    reservationDescription,
    compact ? 360 : 720,
    compact ? 1128 : 936,
    d,
  );
}
function ownership(compact) {
  const d = compact
    ? text(24, 32, 'An old token', 22) +
      text(24, 60, 'cannot act for a new owner', 22) +
      card(24, 104, 312, 'B owns note 1 now', 'A was released or revoked.', true, 144) +
      text(40, 214, 'B has a fresh token.', 17, true) +
      text(24, 288, 'Late calls', 18) +
      rect(8, 304, 344, 440, false, true) +
      arrow('M180 248V302') +
      card(24, 344, 312, 'Late save with A', 'Owner check matches zero.', false, 144) +
      text(40, 452, 'Reject; title unchanged.', 17, true) +
      card(24, 552, 312, 'Late cancel with A', 'DELETE matches zero.', false, 144) +
      text(40, 660, 'Keep B’s lock.', 17, true) +
      card(24, 856, 312, 'B remains the owner', 'A cannot release B’s lock.', true, 116) +
      arrow('M180 744V854') +
      text(24, 1040, 'Validate at write and release.', 18) +
      text(24, 1080, 'Fresh token for every acquisition.', 17, true)
    : text(24, 34, 'Old ownership cannot replace a new acquisition', 24) +
      card(
        24,
        84,
        672,
        'New acquisition: note 1 now belongs to token B',
        'Earlier token A has been released or revoked.',
        true,
        88,
      ) +
      card(24, 296, 312, 'Late save with token A', 'Owner check matches zero.', false, 140) +
      text(40, 400, 'Reject; title unchanged.', 17, true) +
      card(384, 296, 312, 'Late cancel with token A', 'DELETE matches zero.', false, 140) +
      text(400, 400, 'Keep B’s lock.', 17, true) +
      arrow('M180 172V294') +
      arrow('M540 172V294') +
      card(
        24,
        572,
        672,
        'B remains the owner',
        'Only the current handle can save or cancel.',
        true,
        112,
      ) +
      arrow('M180 436V570') +
      arrow('M540 436V570') +
      text(24, 756, 'Token is per acquisition; username alone is insufficient.', 17, true);
  return svg(
    'Guard both writes and release with current ownership',
    ownershipDescription,
    compact ? 360 : 720,
    compact ? 1128 : 800,
    d,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['pessimistic-offline-lock-reservation', reservation],
  ['pessimistic-offline-lock-ownership', ownership],
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
console.log('Built Pessimistic Offline Lock figures and phone layouts.');
