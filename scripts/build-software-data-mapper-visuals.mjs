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

const representationsDescription =
  'An Appointment contains a TimeSlot with start minute 540 and end minute 570. AppointmentMapper translates that object into an appointments row with appointment_key A-7, begin_minute 540, and duration_minutes 30. On loading, the mapper reconstructs the end as start plus duration. The model has no dependency on the mapper or SQL.';
const lifecycleDescription =
  'The caller constructs a replacement Appointment and explicitly asks the mapper to update it. The mapper writes a provisional row change inside a caller-owned transaction. Caller commit makes it durable, while rollback discards it. Neither mapping nor object replacement automatically saves the appointment.';
function representations(compact) {
  const drawing = compact
    ? text(24, 32, 'Different representations,', 22) +
      text(24, 60, 'one appointment', 22) +
      rect(24, 104, 312, 220) +
      text(40, 140, 'Appointment', 22) +
      text(40, 176, 'id: A-7', 18) +
      rect(44, 200, 272, 100, false, true) +
      text(60, 234, 'TimeSlot', 20) +
      text(60, 274, 'start: 540 · end: 570', 18) +
      rect(24, 432, 312, 176, true) +
      text(40, 468, 'AppointmentMapper', 22) +
      text(40, 510, 'Write: end − start', 18) +
      text(40, 548, 'Read: start + duration', 18) +
      text(40, 584, 'Duration: 30 whole minutes', 17, true) +
      rect(24, 724, 312, 200) +
      text(40, 760, 'appointments row', 22) +
      text(40, 802, 'appointment_key: A-7', 17) +
      text(40, 844, 'begin_minute: 540', 17) +
      text(40, 886, 'duration_minutes: 30', 17) +
      arrow('M180 324V430') +
      arrow('M180 608V722') +
      dashed('M24 824H12V536H22') +
      dashed('M24 476H12V214H22') +
      text(24, 1000, 'Solid: write · dashed: read', 18) +
      text(24, 1040, 'Model imports no mapper or SQL.', 17, true) +
      text(24, 1076, 'All times: minutes after midnight.', 17, true)
    : text(24, 34, 'Objects and rows can have different shapes', 24) +
      rect(24, 104, 280, 240) +
      text(40, 140, 'Appointment', 22) +
      text(40, 178, 'id: A-7', 18) +
      rect(44, 200, 240, 124, false, true) +
      text(60, 234, 'TimeSlot', 20) +
      text(60, 270, 'start: 540', 18) +
      text(60, 304, 'end: 570', 18) +
      rect(416, 104, 280, 240) +
      text(432, 140, 'appointments row', 22) +
      text(432, 186, 'appointment_key: A-7', 18) +
      text(432, 232, 'begin_minute: 540', 18) +
      text(432, 278, 'duration_minutes: 30', 18) +
      arrow('M304 184H414') +
      text(334, 162, 'write', 17, true) +
      dashed('M416 264H306') +
      text(338, 242, 'read', 17, true) +
      rect(24, 424, 672, 144, true) +
      text(44, 464, 'AppointmentMapper knows both representations', 22) +
      text(44, 504, 'Write: duration = end − start = 30', 19) +
      text(44, 542, 'Read: end = start + duration = 570', 19) +
      text(24, 636, 'Model imports no mapper, SQL, or table definitions.', 18);
  return svg(
    'Data Mapper translates object and row representations',
    representationsDescription,
    compact ? 360 : 720,
    compact ? 1112 : 672,
    drawing,
  );
}
function lifecycle(compact) {
  const drawing = compact
    ? text(24, 32, 'Explicit writes,', 22) +
      text(24, 60, 'caller-owned transaction', 22) +
      card(24, 104, 312, 'New Appointment A-7', 'TimeSlot: 600–645 minutes', false, 100) +
      arrow('M180 204V282') +
      rect(24, 284, 312, 640, true, true) +
      text(40, 320, 'Caller-owned transaction', 20) +
      card(44, 352, 272, 'Mapper.update', 'Write start 600, length 45', false, 100) +
      card(44, 504, 272, 'Provisional row', 'No hidden commit', false, 100) +
      arrow('M180 452V502') +
      card(44, 684, 272, 'COMMIT', 'Keep changed row', true, 84) +
      card(44, 804, 272, 'ROLLBACK', 'Restore previous row', false, 84) +
      arrow('M180 604V682') +
      dashed('M316 554H324V846H318') +
      text(24, 1008, 'Object replacement alone', 18) +
      text(24, 1040, 'does not save anything.', 18) +
      text(24, 1104, 'Solid: commit path · dashed: rollback', 16, true)
    : text(24, 34, 'Mapping writes; the caller decides the outcome', 24) +
      card(24, 84, 672, 'New Appointment A-7', 'TimeSlot: 600–645 whole minutes', false, 88) +
      arrow('M360 172V246') +
      rect(24, 248, 672, 520, true, true) +
      text(44, 284, 'Caller-owned transaction', 22) +
      card(
        44,
        316,
        632,
        'AppointmentMapper.update',
        'Write begin_minute = 600 and duration_minutes = 45',
        false,
        88,
      ) +
      card(
        44,
        452,
        632,
        'Provisional row change',
        'Uncommitted until the caller decides',
        false,
        88,
      ) +
      arrow('M360 404V450') +
      card(44, 640, 292, 'COMMIT', 'Keep changed row', true, 88) +
      card(384, 640, 292, 'ROLLBACK', 'Restore previous row', false, 88) +
      arrow('M360 540V582H190V638') +
      dashed('M360 582H530V638') +
      text(24, 832, 'Replacing the object alone performs no I/O.', 18) +
      text(24, 870, 'Old TimeSlot stays [540, 570); reloading reads the stored outcome.', 17, true);
  return svg(
    'Data Mapper leaves transaction ownership with the caller',
    lifecycleDescription,
    compact ? 360 : 720,
    compact ? 1140 : 906,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['data-mapper-representations', representations],
  ['data-mapper-lifecycle', lifecycle],
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
console.log('Built Data Mapper representations and lifecycle figures with separate phone layouts.');
