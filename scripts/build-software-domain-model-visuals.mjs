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

const responsibilitiesDescription =
  'The website and batch importer both invoke Workshop operations. Workshop owns capacity, registration state, and its reservation collection. Reservations are created and removed through those operations, while callers receive an immutable view of the records.';
const registrationDescription =
  'While registration is open, reserve and cancel can change reservations after their checks pass. close_registration moves the workshop to closed. Closed registration rejects reserve and cancel; closing it again leaves it closed.';
function responsibilities(compact) {
  const drawing = compact
    ? text(24, 32, 'Ask the model to perform', 22) +
      text(24, 60, 'a valid business change', 22) +
      card(24, 112, 312, 'Website + batch importer', 'Use the same model operations', false, 76) +
      arrow('M180 188V278') +
      text(198, 240, 'reserve / cancel', 16) +
      rect(24, 280, 312, 468, false, true) +
      text(40, 316, 'Workshop', 22) +
      card(44, 340, 272, 'Operations check rules', 'Open · unique · enough seats', true, 76) +
      arrow('M180 416V456') +
      card(44, 458, 272, 'Owned reservations', 'Immutable records; private map', false, 76) +
      text(44, 576, 'Fixed capacity', 19) +
      text(44, 610, 'Registration open or closed', 18) +
      text(44, 654, 'Remaining = capacity', 18) +
      text(44, 682, '− total reserved seats', 18) +
      text(40, 724, 'No direct append from callers.', 16, true) +
      text(24, 800, 'Failed checks leave bookings intact.', 17)
    : text(24, 34, 'Business operations protect the state they own', 24) +
      card(24, 102, 300, 'Website', 'Requests a reservation', false, 76) +
      card(396, 102, 300, 'Batch importer', 'Requests a reservation', false, 76) +
      arrow('M174 178V278') +
      arrow('M546 178V278') +
      text(240, 248, 'reserve / cancel through the model', 17) +
      rect(24, 280, 672, 290, false, true) +
      text(44, 318, 'Workshop', 22) +
      card(44, 344, 286, 'Operations check rules', 'Open · unique · enough seats', true, 76) +
      arrow('M330 382H366') +
      card(368, 344, 308, 'Owned reservations', 'Immutable records; private map', false, 76) +
      text(44, 470, 'Fixed capacity · registration state', 19) +
      text(44, 508, 'Remaining = capacity − total reserved seats', 19) +
      text(44, 546, 'Rejected operations do not change the reservation collection.', 17, true) +
      text(24, 622, 'The same domain operations serve every application entry point.', 18);
  return svg(
    'Shared domain operations and owned reservation state',
    responsibilitiesDescription,
    compact ? 360 : 720,
    compact ? 838 : 660,
    drawing,
  );
}
function registration(compact) {
  const drawing = compact
    ? text(24, 32, 'Registration has an', 22) +
      text(24, 60, 'explicit lifecycle', 22) +
      card(24, 114, 312, 'Open', 'reserve and cancel may succeed', true, 80) +
      arrow('M90 194V258H270V196') +
      text(44, 302, 'reserve / cancel after checks', 17) +
      text(44, 336, 'Success stays open.', 18) +
      arrow('M24 154H12V504H22') +
      text(44, 408, 'close_registration', 18) +
      card(24, 464, 312, 'Closed', 'reserve and cancel are rejected', false, 80) +
      text(24, 604, 'Bookings stay unchanged on rejection.', 17) +
      text(24, 644, 'Closing again leaves it closed.', 17, true) +
      text(24, 710, 'This is the example’s policy,', 18) +
      text(24, 740, 'not a universal cancellation rule.', 18)
    : text(24, 34, 'Registration state controls which changes are allowed', 24) +
      card(24, 120, 300, 'Open', 'reserve / cancel after checks', true, 88) +
      card(396, 120, 300, 'Closed', 'reserve / cancel rejected', false, 88) +
      arrow('M324 164H394') +
      text(286, 88, 'close_registration', 17) +
      arrow('M100 208V260H248V210') +
      text(24, 306, 'Successful reserve or cancel stays open.', 18) +
      text(24, 344, 'Invalid operations leave bookings unchanged.', 18) +
      text(396, 306, 'Close again: stays closed.', 18) +
      text(24, 414, 'The policy closes registration; it does not delete reservations.', 18) +
      text(
        24,
        452,
        'No database lock, timer, or class hierarchy is supplied by this diagram.',
        17,
        true,
      );
  return svg(
    'Open and closed registration with guarded operations',
    registrationDescription,
    compact ? 360 : 720,
    compact ? 778 : 490,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['domain-model-responsibilities', responsibilities],
  ['domain-model-registration', registration],
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
  'Built Domain Model responsibility and registration diagrams with separate phone layouts.',
);
