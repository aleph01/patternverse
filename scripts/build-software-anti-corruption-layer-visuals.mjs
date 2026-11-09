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

const modelDescription =
  'The shop asks availability for local SKU-42. A shop-owned Anti-Corruption Layer maps it to supplier ITEM-9 and calls the supplier lookup. The supplier’s active record reports quantity 10, committed 7, and damaged 2. The layer returns a local Availability with one sellable unit; the shop’s own model decides whether a request for two units can be supplied.';
const outcomesDescription =
  'A valid supplier snapshot with quantity 10, committed 7, and damaged 2 yields one sellable unit; a request for two is false under the local rule. A timeout yields StockUnavailable, not a zero-stock Availability. An unmapped local SKU fails before calling the supplier. These outcomes do not reserve or change stock.';
function model(compact) {
  const d = compact
    ? text(24, 32, 'External capability, local meaning', 21) +
      card(24, 104, 312, 'Shop asks availability', 'Local SKU: SKU-42', false, 128) +
      text(40, 198, 'Model owns can_supply(2).', 17, true) +
      arrow('M180 232V318') +
      text(196, 282, 'request', 17, true) +
      card(24, 320, 312, 'Shop-owned boundary', 'SKU-42 → ITEM-9', true, 176) +
      text(40, 414, 'Calls the supplier lookup.', 17, true) +
      text(40, 450, 'Supplier types stay here.', 17, true) +
      arrow('M180 496V582') +
      text(196, 546, 'lookup', 17, true) +
      card(24, 584, 312, 'Supplier snapshot', 'Active record: A', false, 176) +
      text(40, 678, 'Total 10 / committed 7', 17, true) +
      text(40, 714, 'Damaged 2; categories disjoint.', 16, true) +
      arrow('M180 760V846') +
      text(196, 810, 'interpret', 17, true) +
      card(24, 848, 312, 'Boundary returns local value', 'SKU-42 / sellable_units: 1', true, 144) +
      text(40, 942, 'Domain: can_supply(2) → False', 16, true) +
      text(24, 1072, 'Read snapshot; no reservation.', 17) +
      text(24, 1112, 'Timeout is not zero stock.', 17, true)
    : text(24, 34, 'External capability through the shop’s own model', 24) +
      card(
        24,
        104,
        672,
        'Shop model and local policy',
        'availability(SKU-42) returns Availability(sellable_units=1).',
        false,
        128,
      ) +
      text(40, 198, 'can_supply(2) → False is the shop’s rule.', 18, true) +
      arrow('M180 232V350') +
      text(196, 294, 'local request', 17, true) +
      arrow('M540 352V234') +
      text(556, 294, 'local value', 17, true) +
      card(24, 352, 672, 'Shop-owned SupplierStockACL', 'Identity: SKU-42 → ITEM-9', true, 192) +
      text(
        40,
        446,
        'Translate: 10 − 7 − 2 = 1 sellable unit, not status A → available.',
        18,
        true,
      ) +
      text(40, 502, 'Failure contract: TimeoutError → StockUnavailable', 18, true) +
      arrow('M180 544V694') +
      text(196, 618, 'lookup ITEM-9', 17, true) +
      arrow('M540 696V546') +
      text(556, 618, 'snapshot', 17, true) +
      card(
        24,
        696,
        672,
        'Supplier model',
        'lookup(ITEM-9): status A / quantity 10 / committed 7 / damaged 2',
        false,
        128,
      ) +
      text(40, 790, 'A means active record; quantity includes excluded units.', 18, true) +
      text(
        24,
        912,
        'Solid arrows show requests and returned values, not source dependencies.',
        17,
      ) +
      text(24, 952, 'Source dependency: boundary.py imports domain.py.', 17, true);
  return svg(
    'Anti-Corruption Layer: a protected local stock model',
    modelDescription,
    compact ? 360 : 720,
    compact ? 1168 : 1008,
    d,
  );
}
function outcomes(compact) {
  const d = compact
    ? text(24, 32, 'Insufficient is different from unknown', 20) +
      card(24, 104, 312, 'Coherent snapshot', '10 − 7 − 2 = 1 sellable unit', true, 144) +
      text(40, 198, 'can_supply(2) → False', 18, true) +
      card(24, 336, 312, 'Supplier timeout', 'StockUnavailable', false, 144) +
      text(40, 430, 'Not an Availability with zero.', 17, true) +
      card(24, 568, 312, 'Unmapped local SKU', 'StockUnavailable', false, 144) +
      text(40, 662, 'No supplier call is made.', 17, true) +
      text(24, 816, 'No invented stock facts.', 18) +
      text(24, 856, 'No reservation or stock change.', 17, true)
    : text(24, 34, 'Insufficient stock and missing evidence are different', 24) +
      card(
        24,
        104,
        312,
        'Coherent supplier snapshot',
        '10 total − 7 committed − 2 damaged',
        false,
        128,
        true,
      ) +
      arrow('M336 168H382') +
      card(384, 104, 312, 'Availability(SKU-42, 1)', 'can_supply(2) → False', true, 128) +
      card(24, 336, 312, 'Supplier timeout', 'No usable response', false, 128) +
      arrow('M336 400H382') +
      card(384, 336, 312, 'StockUnavailable', 'Availability not established', false, 128) +
      card(
        24,
        568,
        312,
        'Unmapped local SKU',
        'SKU-MISSING has no supplier ID.',
        false,
        128,
        true,
      ) +
      arrow('M336 632H382') +
      card(384, 568, 312, 'StockUnavailable', 'No supplier call is made.', false, 128) +
      text(24, 816, 'Unknown availability is not zero units.', 18) +
      text(24, 856, 'None of these reads reserves or changes stock.', 18) +
      text(
        24,
        896,
        'The domain’s supply rule remains separate from integration failure.',
        17,
        true,
      );
  return svg(
    'Anti-Corruption Layer: local facts and integration uncertainty',
    outcomesDescription,
    compact ? 360 : 720,
    compact ? 920 : 952,
    d,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['anti-corruption-layer-model', model],
  ['anti-corruption-layer-outcomes', outcomes],
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
console.log('Built two Anti-Corruption Layer diagrams with phone compositions.');
