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

const boundaryDescription =
  'A web adapter and a command-line adapter both call book on the service layer. The service coordinates loading, invoking Workshop.after_booking, writing availability and the booking record, then committing. Workshop owns the capacity rule; SQLite owns persistence and locking.';
const transactionDescription =
  'The booking operation begins a write transaction, reads availability, applies the domain rule, updates remaining seats, and inserts the booking row. Commit makes both writes visible together. If the insert fails because a booking ID already exists, rollback restores the earlier capacity update and the caller receives an error.';
function boundary(compact) {
  const drawing = compact
    ? text(24, 32, 'One operation,', 22) +
      text(24, 60, 'different callers', 22) +
      card(24, 104, 144, 'Web', 'Parse / present', false, 100, true) +
      card(192, 104, 144, 'CLI', 'Parse / print', false, 100, true) +
      arrow('M96 204V246H138V278') +
      arrow('M264 204V246H222V278') +
      rect(24, 280, 312, 160, true) +
      text(40, 314, 'Service Layer · book', 21) +
      text(40, 354, 'Load → ask the model', 18) +
      text(40, 390, 'Write → commit', 18) +
      text(40, 420, 'Return remaining seats', 17, true) +
      card(24, 520, 312, 'Workshop.after_booking', 'Capacity rule', false, 100) +
      arrow('M180 440V518') +
      text(196, 490, 'invoke', 17, true) +
      card(24, 700, 312, 'SQLite', 'Lock / save / rollback', false, 100) +
      arrow('M336 388H348V750H338') +
      text(24, 862, 'Arrows: calls to collaborators.', 17) +
      text(24, 904, 'The service coordinates.', 18) +
      text(24, 936, 'The model decides capacity.', 17, true) +
      text(24, 968, 'The database protects writes.', 17, true)
    : text(24, 34, 'One application operation, different callers', 24) +
      card(24, 84, 312, 'Web adapter', 'Parse fields / present response', false, 100) +
      card(384, 84, 312, 'Command-line adapter', 'Parse arguments / print result', false, 100) +
      arrow('M180 184V216H280V246') +
      arrow('M540 184V216H440V246') +
      rect(24, 248, 672, 136, true) +
      text(44, 282, 'Service Layer · book', 23) +
      text(44, 324, 'Load → invoke model → write both changes → commit', 20) +
      text(44, 360, 'Return remaining seats after a successful commit', 18, true) +
      card(24, 484, 312, 'Workshop.after_booking', 'Owns the capacity rule', false, 100) +
      card(384, 484, 312, 'SQLite', 'Owns locking and persistence', false, 100) +
      arrow('M180 384V482') +
      arrow('M540 384V482') +
      text(196, 442, 'invoke', 17, true) +
      text(556, 442, 'read / write', 17, true) +
      text(24, 648, 'Arrows: calls to collaborators, not separate deployments.', 18) +
      text(24, 688, 'One service operation does not itself create atomicity.', 18, true);
  return svg(
    'Service Layer coordinates one application boundary',
    boundaryDescription,
    compact ? 360 : 720,
    compact ? 1008 : 724,
    drawing,
  );
}
function transaction(compact) {
  const drawing = compact
    ? text(24, 32, 'Save both changes,', 22) +
      text(24, 60, 'or keep neither', 22) +
      card(24, 104, 312, 'BEGIN IMMEDIATE', 'Acquire write transaction', true, 80) +
      card(24, 244, 312, 'Load + domain decision', '3 seats − 2 booked = 1 left', false, 80) +
      card(24, 384, 312, 'UPDATE availability', 'First write: seats_left = 1', false, 80) +
      card(24, 524, 312, 'INSERT booking', 'Second write: unique booking ID', false, 80) +
      arrow('M180 184V242') +
      arrow('M180 324V382') +
      arrow('M180 464V522') +
      card(24, 704, 312, 'COMMIT', 'Return 1 remaining seat', true, 100) +
      arrow('M180 604V702') +
      text(196, 660, 'success', 17, true) +
      card(24, 904, 312, 'Duplicate ID → ROLLBACK', 'Restore the first write', false, 100) +
      dashed('M336 564H348V954H338') +
      text(24, 1080, 'Green: successful sequence.', 17) +
      text(24, 1112, 'Dashed: insert fails; undo writes.', 17, true) +
      text(24, 1152, 'The caller receives an error.', 18)
    : text(24, 34, 'One operation owns its local transaction', 24) +
      card(
        24,
        84,
        400,
        'BEGIN IMMEDIATE',
        'Acquire the write transaction before reading',
        true,
        80,
      ) +
      card(24, 224, 400, 'Load + domain decision', '3 seats − 2 booked = 1 remaining', false, 80) +
      card(24, 364, 400, 'UPDATE availability', 'First write: seats_left = 1', false, 80) +
      card(24, 504, 400, 'INSERT booking', 'Second write: unique booking ID', false, 80) +
      arrow('M224 164V222') +
      arrow('M224 304V362') +
      arrow('M224 444V502') +
      card(24, 674, 400, 'COMMIT', 'Return 1 remaining seat', true, 100) +
      arrow('M224 584V672') +
      text(240, 634, 'success', 17, true) +
      rect(472, 504, 224, 120) +
      text(488, 534, 'Duplicate booking ID', 18) +
      text(488, 568, 'ROLLBACK', 20) +
      text(488, 600, 'Restore first write', 17, true) +
      dashed('M424 544H470') +
      text(438, 484, 'error', 16, true) +
      text(472, 690, 'Error to caller', 18) +
      text(472, 722, 'No writes retained', 17, true) +
      text(24, 820, 'Green: successful sequence · dashed: insert failure and rollback', 18);
  return svg(
    'Service Layer coordinates commit and rollback',
    transactionDescription,
    compact ? 360 : 720,
    compact ? 1192 : 852,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['service-layer-boundary', boundary],
  ['service-layer-transaction', transaction],
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
console.log('Built Service Layer boundary and transaction figures with separate phone layouts.');
