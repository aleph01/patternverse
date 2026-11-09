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

const responsibilitiesDescription =
  'A caller loads and works with a Task object. The Task contains its title and completion flag, rename and complete business operations, and find and save persistence methods. The same class issues SQL for the corresponding tasks row; no separate mapper is used.';
const rollbackDescription =
  'A Task is loaded with done false. Calling complete changes the object to done true; save writes a provisional done true row. A later caller rollback restores the database row to done false while the object remains done true. Reloading creates an object reflecting the stored false value.';
function responsibilities(compact) {
  const drawing = compact
    ? text(24, 32, 'One record object,', 22) +
      text(24, 60, 'business behavior and SQL', 22) +
      card(24, 104, 312, 'Caller', 'find · complete · save', false, 100) +
      arrow('M180 204V278') +
      rect(24, 280, 312, 560, true, true) +
      text(40, 316, 'Task', 23) +
      rect(44, 348, 272, 112) +
      text(60, 380, 'Data', 20) +
      text(60, 416, 'id: 1 · done: False', 17) +
      text(60, 446, 'title: Label cartons', 17, true) +
      rect(44, 488, 272, 132) +
      text(60, 520, 'Business rules', 20) +
      text(60, 558, 'rename(title) · complete()', 17) +
      text(60, 596, 'No rename if done', 17, true) +
      rect(44, 648, 272, 132) +
      text(60, 680, 'Persistence methods', 20) +
      text(60, 718, 'find(db, id) · save()', 17) +
      text(60, 756, 'SELECT / INSERT / UPDATE', 16, true) +
      card(24, 928, 312, 'tasks row', 'id: 1 · done: 0', false, 100) +
      arrow('M180 840V926') +
      text(24, 1100, 'One class owns both roles.', 18) +
      text(24, 1136, 'Arrows: calls, then SQL.', 17, true)
    : text(24, 34, 'One record owns behavior and database access', 24) +
      card(24, 84, 672, 'Caller', 'Task.find(db, id) · task.complete() · task.save()', false, 88) +
      arrow('M360 172V246') +
      text(376, 218, 'call', 17, true) +
      rect(24, 248, 672, 300, true, true) +
      text(44, 284, 'Task · one record object', 23) +
      rect(44, 316, 192, 176) +
      text(60, 350, 'Data', 20) +
      text(60, 388, 'id: 1', 17) +
      text(60, 426, 'done: False', 17) +
      text(60, 464, 'Label cartons', 17, true) +
      rect(264, 316, 192, 176) +
      text(280, 350, 'Business rules', 20) +
      text(280, 388, 'rename(title)', 17) +
      text(280, 426, 'complete()', 17) +
      text(280, 464, 'No rename if done', 15, true) +
      rect(484, 316, 192, 176) +
      text(500, 350, 'Persistence', 20) +
      text(500, 388, 'find(db, id)', 17) +
      text(500, 426, 'save()', 17) +
      text(500, 464, 'SQL inside the class', 15, true) +
      card(24, 656, 672, 'tasks row', "id: 1 · title: 'Label cartons' · done: 0", false, 88) +
      arrow('M360 548V654') +
      text(376, 612, 'record method runs SQL', 17, true) +
      text(24, 808, 'Arrows: calls, then SQL. No separate mapper.', 18);
  return svg(
    'Active Record combines row state, rules, and persistence',
    responsibilitiesDescription,
    compact ? 360 : 720,
    compact ? 1172 : 844,
    drawing,
  );
}
function rollback(compact) {
  const panel = (x, y, w, title, detail, accent = false) =>
    card(x, y, w, title, detail, accent, 100);
  const drawing = compact
    ? text(24, 32, 'Rollback restores the row,', 22) +
      text(24, 60, 'not the object', 22) +
      rect(24, 104, 312, 144) +
      text(40, 138, 'Loaded', 21) +
      text(40, 180, 'Task.done: False', 18) +
      text(40, 220, 'Database done: 0', 18, true) +
      rect(24, 324, 312, 164) +
      text(40, 358, 'complete + save', 21) +
      text(40, 400, 'Task.done: True', 18) +
      text(40, 438, 'Database done: 1', 18) +
      text(40, 468, 'Writer sees uncommitted state', 16, true) +
      arrow('M180 248V322') +
      rect(24, 564, 312, 164, true) +
      text(40, 598, 'ROLLBACK', 21) +
      text(40, 640, 'Task.done: True', 18) +
      text(40, 678, 'Database done: 0', 18) +
      text(40, 708, 'Row restored; object unchanged', 16, true) +
      dashed('M180 488V562') +
      card(24, 848, 312, 'Fresh Task.find', 'done: False from database', false, 100) +
      arrow('M180 728V846') +
      text(196, 796, 'reload', 17, true) +
      text(24, 1008, 'Old object is still done: True.', 18) +
      text(24, 1044, 'Discard it after the failed use case.', 17, true)
    : text(24, 34, 'Rollback changes the row, not the object', 24) +
      text(24, 84, 'Stage', 18, true) +
      text(264, 84, 'In-memory Task', 18, true) +
      text(504, 84, 'Database (writer)', 18, true) +
      panel(24, 112, 200, 'Loaded', 'Committed baseline') +
      panel(264, 112, 200, 'done: False', 'Local object') +
      panel(504, 112, 192, 'done: 0', 'Committed') +
      panel(24, 292, 200, 'complete + save', 'Provisional SQL') +
      panel(264, 292, 200, 'done: True', 'Changed in memory') +
      panel(504, 292, 192, 'done: 1', 'Uncommitted') +
      panel(24, 472, 200, 'ROLLBACK', 'Use case fails') +
      panel(264, 472, 200, 'done: True', 'Object unchanged', true) +
      panel(504, 472, 192, 'done: 0', 'Row restored') +
      text(24, 644, 'Reload or discard the affected object.', 18) +
      text(24, 682, 'An assigned ID is not proof of a committed row.', 17, true);
  return svg(
    'Active Record object state is not restored by database rollback',
    rollbackDescription,
    compact ? 360 : 720,
    compact ? 1080 : 718,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['active-record-responsibilities', responsibilities],
  ['active-record-rollback', rollback],
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
console.log('Built Active Record responsibility and rollback figures with separate phone layouts.');
