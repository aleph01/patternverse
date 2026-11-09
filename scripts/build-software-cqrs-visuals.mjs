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

const modelsDescription =
  'A Book Seats command goes through a SeatPool model that checks capacity and changes booked seats. An Availability query uses SQL to return an immutable title, remaining count, status, and observed version. Both paths access one shows table; the query does not load the command model or perform booking.';
const freshnessDescription =
  'An availability DTO reports two remaining seats at version zero. A later booking command commits both seats and advances the stored version to one. The old DTO still reports two. A new command for one seat validates current state and rejects it; a fresh query reports zero, sold out, version one.';
function models(compact) {
  const drawing = compact
    ? text(24, 34, 'Separate models, shared storage', 22) +
      card(24, 112, 312, 'Book Seats command', 'SHOW-7 / quantity: 2', false, 100) +
      arrow('M180 212V270') +
      card(24, 272, 312, 'Command model: SeatPool', 'Capacity / booked / booking rule', true, 144) +
      text(40, 380, 'Validate current state, then commit.', 16, true) +
      card(24, 528, 312, 'Availability query', 'SHOW-7', false, 100) +
      arrow('M180 628V686') +
      card(
        24,
        688,
        312,
        'Query model: Availability',
        'Title / remaining / status / version',
        false,
        144,
      ) +
      text(40, 796, 'SQL builds an immutable DTO.', 17, true) +
      arrow('M24 344H12V1088H22') +
      text(40, 904, 'Command reads + writes', 18, true) +
      arrow('M180 832V1006') +
      text(196, 966, 'SELECT', 17, true) +
      card(
        24,
        1008,
        312,
        'One shows table in SQLite',
        'Shared source of current state',
        true,
        176,
      ) +
      text(40, 1118, 'No event log or second database.', 17, true) +
      text(40, 1158, 'Both models have one owner.', 17, true) +
      text(24, 1264, 'Arrows: calls into models and storage.', 16, true)
    : text(24, 34, 'Different responsibilities, one shared store', 24) +
      card(24, 112, 312, 'Book Seats command', 'SHOW-7 / quantity: 2', false, 100) +
      card(384, 112, 312, 'Availability query', 'SHOW-7', false, 100) +
      arrow('M180 212V302') +
      arrow('M540 212V302') +
      card(24, 304, 312, 'Command model: SeatPool', 'Capacity / booked / booking rule', true, 176) +
      text(40, 420, 'Validate latest state in transaction.', 16, true) +
      card(
        384,
        304,
        312,
        'Query model: Availability',
        'Title / remaining / status / version',
        false,
        176,
      ) +
      text(400, 420, 'SQL builds an immutable DTO.', 17, true) +
      arrow('M180 480V606') +
      text(196, 548, 'read + write', 17, true) +
      arrow('M540 480V606') +
      text(556, 548, 'SELECT', 17, true) +
      card(
        24,
        608,
        672,
        'One shows table in SQLite',
        'Command updates booked and version; query derives display fields.',
        true,
        176,
      ) +
      text(
        40,
        732,
        'Both models belong to one owner. No event log or separate read database.',
        17,
        true,
      ) +
      text(24, 864, 'Arrows are calls. Queries do not invoke the booking model.', 18) +
      text(
        24,
        904,
        'The two paths share storage, rather than one overloaded conceptual model.',
        18,
        true,
      );
  return svg(
    'CQRS: separate command and query models',
    modelsDescription,
    compact ? 360 : 720,
    compact ? 1320 : 960,
    drawing,
  );
}
function freshness(compact) {
  const drawing = compact
    ? text(24, 34, 'Old answers are snapshots', 23) +
      card(24, 112, 312, 'Old query DTO / version 0', '2 remaining / available', false, 144) +
      text(40, 220, 'Immutable snapshot', 18, true) +
      arrow('M180 256V366') +
      text(196, 316, 'later', 17, true) +
      card(
        24,
        368,
        312,
        'BookSeats(2) commits',
        'Capacity: 2 / booked: 2 / version: 1',
        true,
        184,
      ) +
      text(40, 496, 'Kept DTO still: 2 / version 0', 17, true) +
      text(40, 532, 'Authoritative remaining: 0', 17, true) +
      arrow('M180 552V670') +
      text(196, 620, 'try 1 seat', 17, true) +
      card(24, 672, 312, 'BookSeats(1) rejects', 'Checks current state, not old DTO.', false, 160) +
      text(40, 788, 'Insufficient seats', 18, true) +
      arrow('M180 832V942') +
      text(196, 900, 'SELECT', 17, true) +
      card(24, 944, 312, 'Fresh query / version 1', '0 remaining / sold out', true, 144) +
      text(40, 1052, 'New immutable DTO', 18, true) +
      text(24, 1168, 'No asynchronous projection is used.', 17, true)
    : text(24, 34, 'Use current state to decide the next command', 24) +
      card(
        24,
        112,
        312,
        'Old query DTO / version 0',
        'Remaining: 2 / status: available',
        false,
        144,
      ) +
      card(
        384,
        112,
        312,
        'Authoritative state / version 0',
        'Capacity: 2 / booked: 0',
        false,
        144,
      ) +
      arrow('M180 256V350') +
      text(196, 308, 'keep snapshot', 16, true) +
      arrow('M540 256V350') +
      text(556, 308, 'book 2', 17, true) +
      card(
        24,
        352,
        312,
        'Kept DTO / still version 0',
        'Remaining: 2 / status: available',
        false,
        176,
      ) +
      text(40, 484, 'An earlier observation stays old.', 17, true) +
      card(384, 352, 312, 'BookSeats(2) commits', 'Booked: 2 / version: 1', true, 176) +
      text(400, 484, 'Authoritative remaining: 0', 18, true) +
      arrow('M540 528V584H180V638') +
      arrow('M540 584V638') +
      text(556, 600, 'SELECT', 16, true) +
      card(24, 640, 312, 'BookSeats(1) rejects', 'Checks the current write state.', false, 176) +
      text(40, 760, 'Insufficient seats', 19, true) +
      card(384, 640, 312, 'New query / version 1', '0 remaining / sold out', true, 176) +
      text(400, 760, 'DTO derived after commit', 18, true) +
      text(
        24,
        904,
        'Arrows: retention, committed change, command validation, and a new query.',
        17,
      ) +
      text(
        24,
        944,
        'A returned answer is an observation, not authority to allocate seats.',
        18,
        true,
      );
  return svg(
    'CQRS: query freshness and authoritative command validation',
    freshnessDescription,
    compact ? 360 : 720,
    compact ? 1224 : 1000,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['cqrs-models', models],
  ['cqrs-freshness', freshness],
])
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`,
      content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[`software-engineering/${filename}`] = { width: +width, height: +height };
  }
const manifest = resolve(root, 'content/assets/manifest.json');
await writeFile(
  manifest,
  JSON.stringify({ ...JSON.parse(await readFile(manifest, 'utf8')), ...dimensions }, null, 2) +
    '\n',
);
console.log('Built two CQRS diagrams with separately composed phone variants.');
