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
  'Application code asks the Workshops repository for workshops with room for two attendees. Either the memory implementation filters stored Workshop objects or the SQLite implementation queries rows and constructs Workshop objects. The caller receives the same ordered domain-level result without seeing SQL or cursors.';
const snapshotsDescription =
  'A repository returns workshop A with two seats left. Another booking then commits one remaining seat. The caller still holds its immutable two-seat snapshot; a new repository read can obtain the updated state. Neither the selection nor the old snapshot reserves seats; booking needs its own concurrency protection.';
function boundary(compact) {
  const drawing = compact
    ? text(24, 32, 'Ask for domain objects,', 22) +
      text(24, 60, 'keep storage behind the boundary', 20) +
      card(24, 104, 312, 'Application caller', 'with_room_for(2)', false, 84) +
      arrow('M180 188V266') +
      rect(24, 268, 312, 144, true) +
      text(40, 300, 'Workshops contract', 22) +
      text(40, 334, 'add(Workshop) · get(id)', 18) +
      text(40, 370, 'with_room_for(seats)', 18) +
      card(24, 508, 312, 'MemoryWorkshops', 'Filter Workshops; order by ID', false, 120) +
      card(24, 748, 312, 'SqliteWorkshops', 'Query rows → Workshop objects', false, 120) +
      arrow('M180 412V506') +
      arrow('M336 370H348V808H338') +
      card(24, 968, 312, 'Same domain result', 'A: 2 seats · B: 3 seats', true, 100) +
      dashed('M24 568H12V1018H22') +
      dashed('M180 868V966') +
      text(24, 1132, 'Solid: call the chosen adapter.', 17) +
      text(24, 1168, 'Dashed: return selected objects.', 17, true)
    : text(24, 34, 'One domain contract, different storage', 24) +
      card(24, 84, 672, 'Application caller', 'repo.with_room_for(2)', false, 88) +
      arrow('M360 172V246') +
      card(
        24,
        248,
        672,
        'Workshops access contract',
        'add(Workshop) · get(id) · with_room_for(seats)',
        true,
        100,
      ) +
      card(24, 454, 312, 'MemoryWorkshops', 'Filter Workshops; order by ID', false, 120) +
      card(384, 454, 312, 'SqliteWorkshops', 'Query rows → Workshop objects', false, 120) +
      arrow('M180 348V452') +
      arrow('M540 348V452') +
      card(
        24,
        654,
        672,
        'Same domain result',
        'Workshop A: 2 seats · Workshop B: 3 seats',
        true,
        88,
      ) +
      dashed('M180 574V612H280V652') +
      dashed('M540 574V612H440V652') +
      text(24, 808, 'Solid: call the chosen adapter · dashed: return domain objects', 18);
  return svg(
    'Repository keeps storage behind domain-oriented access',
    boundaryDescription,
    compact ? 360 : 720,
    compact ? 1204 : 844,
    drawing,
  );
}
function snapshots(compact) {
  const drawing = compact
    ? text(24, 32, 'A returned snapshot', 22) +
      text(24, 60, 'is not a reservation', 22) +
      card(24, 104, 312, 'Repository read', 'A has 2 seats left', false, 112) +
      card(24, 296, 312, 'Another booking commits', 'Stored A now has 1 seat', false, 112) +
      arrow('M180 216V294') +
      text(196, 264, 'later', 17, true) +
      card(24, 500, 312, 'Caller still holds A: 2', 'Immutable old snapshot', false, 100) +
      dashed('M24 160H12V550H22') +
      card(24, 680, 312, "New get('A')", 'Can observe the updated state', false, 100) +
      arrow('M180 408V448H348V730H338') +
      rect(24, 868, 312, 160, true) +
      text(40, 904, 'No reservation yet', 21) +
      text(40, 946, 'Booking must recheck and update', 17) +
      text(40, 978, 'with concurrency protection.', 17, true) +
      text(24, 1096, 'Dashed: retained old snapshot.', 17, true)
    : text(24, 34, 'An access boundary is not a reservation', 24) +
      card(24, 84, 312, 'Repository read', 'A has 2 seats left', false, 120) +
      card(384, 84, 312, 'Another booking commits', 'Stored A now has 1 seat', false, 120) +
      arrow('M336 144H382') +
      text(340, 116, 'later', 15, true) +
      card(24, 320, 312, 'Caller still holds A: 2', 'Immutable old snapshot', false, 120) +
      card(384, 320, 312, "New get('A')", 'Can observe the updated state', false, 120) +
      dashed('M180 204V318') +
      arrow('M540 204V318') +
      card(
        24,
        520,
        672,
        'Selection does not reserve seats',
        'Booking must recheck and update under concurrency protection',
        true,
        100,
      ) +
      text(24, 688, 'Dashed: retained snapshot · solid: later action or new read', 18, true);
  return svg(
    'Repository retrieval does not provide a booking guarantee',
    snapshotsDescription,
    compact ? 360 : 720,
    compact ? 1132 : 724,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['repository-boundary', boundary],
  ['repository-snapshots', snapshots],
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
console.log('Built Repository boundary and snapshot figures with separate phone layouts.');
