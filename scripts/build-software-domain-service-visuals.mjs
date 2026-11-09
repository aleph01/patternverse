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

const interference = (d) =>
  `<path d="${d}" fill="none" stroke="#626962" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#wiring)"/>`;
const responsibilitiesDescription =
  "A booking use case supplies a workshop request and room-offer snapshots to the select_room domain service. RoomOffer.can_host checks each offer's own compatibility; select_room compares qualifying offers by seat count and room ID, then returns a selected offer or no match.";
const bookingDescription =
  'The application obtains candidate snapshots, asks the domain service to select a room, and submits a booking command to the room owner. If the selected room has been taken meanwhile, the booking is rejected and the application reloads candidates and re-evaluates selection.';

function responsibilities(compact) {
  const drawing = compact
    ? text(24, 32, 'Business decision,', 22) +
      text(24, 60, 'explicit responsibilities', 22) +
      card(24, 104, 312, 'Application use case', 'Load inputs; act on result', false, 100) +
      rect(24, 270, 312, 510, true, true) +
      text(44, 306, 'Domain model', 20) +
      card(44, 352, 272, 'select_room', 'Compare supplied offers', true) +
      arrow('M180 204V350') +
      text(196, 248, 'calls', 18, true) +
      arrow('M180 428V464') +
      card(44, 466, 272, '1. RoomOffer.can_host', 'Seats + required features', false, 100, true) +
      arrow('M180 566V604') +
      card(44, 606, 272, '2. Choose smallest fit', 'Then break ties by room ID', true, 100, true) +
      arrow('M180 706V854') +
      text(196, 820, 'return', 18, true) +
      card(24, 856, 312, 'RoomOffer or None', 'No booking side effect', false, 100) +
      text(24, 1014, 'Application: load and book', 18) +
      text(24, 1044, 'Domain service: decide', 18)
    : text(24, 34, 'One domain decision, distinct responsibilities', 24) +
      card(24, 82, 672, 'Application use case', 'Load request + room offers; act on the result') +
      rect(24, 214, 672, 346, true, true) +
      text(44, 248, 'Domain model', 21) +
      card(
        44,
        280,
        632,
        'select_room · domain service',
        'Compare supplied offers without retaining request state',
        true,
      ) +
      arrow('M360 158V278') +
      text(378, 194, 'calls with snapshots', 17, true) +
      card(44, 416, 280, '1. RoomOffer.can_host', 'Seats + required features', false, 100, true) +
      card(388, 416, 288, '2. Choose smallest fit', 'Then break ties by room ID', true, 100, true) +
      arrow('M184 356V414') +
      arrow('M532 356V414') +
      arrow('M360 356V630') +
      text(378, 600, 'return', 17, true) +
      card(24, 632, 672, 'Selected RoomOffer or None', 'No booking or retained per-request state') +
      text(24, 754, 'Application: load and book · domain service: decide', 18);
  return svg(
    'Domain service decision and its collaborators',
    responsibilitiesDescription,
    compact ? 360 : 720,
    compact ? 1072 : 784,
    drawing,
  );
}

function booking(compact) {
  const drawing = compact
    ? text(24, 32, 'Choosing a room', 22) +
      text(24, 60, 'does not book it', 22) +
      card(24, 104, 312, '1. Load candidate offers', 'A/B: 12 · C: 20 · D: 10 seats', false, 100) +
      arrow('M180 204V252') +
      card(24, 254, 312, '2. select_room returns A', '12 seats · 12 attendees', true, 100) +
      interference('M180 354V412') +
      card(
        24,
        414,
        312,
        '3. Another writer books A',
        'Owner commits the change',
        false,
        100,
        true,
      ) +
      interference('M180 514V572') +
      card(24, 574, 312, '4. Booking A is rejected', 'Availability changed', false, 100) +
      arrow('M180 674V732') +
      rect(24, 734, 312, 132, true) +
      text(40, 766, '5. Reload and re-evaluate', 20) +
      text(40, 806, 'A is no longer offered.', 18) +
      text(40, 840, 'select_room returns room-B', 18) +
      text(24, 926, 'Booking requires an atomic', 18) +
      text(24, 956, 'availability check and write.', 18) +
      text(24, 1008, 'Solid: use case · dashed: other writer', 16, true)
    : text(24, 34, 'A selection result is not a reservation', 24) +
      card(24, 100, 312, '1. Load candidate offers', 'A/B: 12 · C: 20 · D: 10 seats', false, 100) +
      arrow('M180 200V250') +
      card(24, 252, 312, '2. select_room returns A', '12 seats · 12 attendees', true, 100) +
      card(
        384,
        252,
        312,
        '3. Another writer books A',
        'Owner commits the change',
        false,
        100,
        true,
      ) +
      text(384, 386, 'Concurrent change', 17, true) +
      interference('M540 352V398H250V438') +
      arrow('M180 352V438') +
      card(
        24,
        440,
        312,
        '4. Book A: conflict',
        'Owner rejects stale availability',
        false,
        100,
        true,
      ) +
      arrow('M180 540V586H360V616') +
      card(
        24,
        618,
        672,
        '5. Reload offers; re-evaluate',
        'B remains suitable: select_room returns room-B',
        true,
        100,
      ) +
      text(24, 770, 'Booking requires an atomic availability check and write.', 19) +
      text(24, 808, 'Solid: use-case sequence · dashed: concurrent state change', 17, true);
  return svg(
    'Selection and booking have different guarantees',
    bookingDescription,
    compact ? 360 : 720,
    compact ? 1040 : 836,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['domain-service-responsibilities', responsibilities],
  ['domain-service-selection-booking', booking],
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
console.log(
  'Built Domain Service responsibilities and selection/booking figures with separate phone layouts.',
);
