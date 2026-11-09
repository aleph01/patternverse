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

const ownershipDescription =
  'Orders and Inventory use separate runtime roles and each issues SQL only to its own private schema. The two schemas share one PostgreSQL server. An inter-service API request connects the services above the storage boundary, rather than granting Orders direct access to Inventory tables.';
const commitsDescription =
  'Inventory commits a two-unit local adjustment, leaving three available units. A later Orders transaction rejects an order with zero requested units, leaving no order row. Inventory remains at three. Direct cross-service SQL is denied; a real workflow must resolve partial progress through a service contract and explicit recovery.';
function ownership(compact) {
  const drawing = compact
    ? text(24, 34, 'Private ownership, shared hosting', 21) +
      card(24, 112, 312, 'Orders service', 'Runtime role: orders_app', false, 112) +
      arrow('M180 224V302') +
      text(196, 274, 'Own SQL', 17, true) +
      card(24, 304, 312, 'Private orders schema', 'orders.orders', true, 144) +
      text(40, 414, 'Owner: orders_owner', 17, true) +
      arrow('M24 168H12V648H22') +
      text(40, 520, 'API request to Inventory', 18, true) +
      card(24, 592, 312, 'Inventory service', 'Runtime role: inventory_app', false, 112) +
      arrow('M180 704V782') +
      text(196, 754, 'Own SQL', 17, true) +
      card(24, 784, 312, 'Private inventory schema', 'inventory.stock', true, 144) +
      text(40, 894, 'Owner: inventory_owner', 17, true) +
      text(24, 1008, 'Both schemas share one server.', 18) +
      text(24, 1050, 'Each runtime role gets only its own SQL.', 16, true) +
      text(24, 1120, 'API calls do not grant foreign-table access.', 15, true)
    : text(24, 34, 'One server can host two private stores', 24) +
      card(24, 112, 312, 'Orders service', 'Runtime role: orders_app', false, 112) +
      card(384, 112, 312, 'Inventory service', 'Runtime role: inventory_app', false, 112) +
      arrow('M336 168H382') +
      text(341, 144, 'API', 16, true) +
      rect(24, 352, 672, 368, false, true) +
      arrow('M180 224V430') +
      text(196, 312, 'Own SQL', 18, true) +
      arrow('M540 224V430') +
      text(556, 312, 'Own SQL', 18, true) +
      card(48, 432, 264, 'orders schema', 'orders.orders', true, 176) +
      text(64, 550, 'Owner: orders_owner', 16, true) +
      card(408, 432, 264, 'inventory schema', 'inventory.stock', true, 176) +
      text(424, 550, 'Owner: inventory_owner', 16, true) +
      text(40, 680, 'Same PostgreSQL server; separate schemas and runtime privileges.', 20, true) +
      text(24, 800, 'Arrows: service API request or SQL into the service’s own store.', 18) +
      text(24, 840, 'No runtime role receives a direct SQL grant to the other schema.', 18, true);
  return svg(
    'Database per Service: ownership versus physical hosting',
    ownershipDescription,
    compact ? 360 : 720,
    compact ? 1176 : 896,
    drawing,
  );
}
function commits(compact) {
  const drawing = compact
    ? text(24, 34, 'Local commits, partial progress', 22) +
      card(
        24,
        112,
        312,
        'Inventory transaction commits',
        'MUG: 5 − 2 = 3 available units',
        true,
        176,
      ) +
      text(40, 228, 'Local change is now committed.', 17, true) +
      arrow('M180 288V382') +
      text(196, 342, 'later', 17, true) +
      card(24, 384, 312, 'Orders transaction rejects', 'O42 / requested_units: 0', false, 208) +
      text(40, 504, 'CHECK violation: no order row.', 17, true) +
      text(40, 548, 'Inventory still has 3 units.', 18, true) +
      card(
        24,
        704,
        312,
        'Explicit recovery is required',
        'No implicit cross-service rollback.',
        false,
        176,
        true,
      ) +
      text(40, 824, 'A real workflow needs owned state', 16, true) +
      text(40, 856, 'and service-level coordination.', 16, true) +
      text(24, 968, 'Arrow: execution order, not one commit.', 16, true)
    : text(24, 34, 'Private stores have local commit boundaries', 24) +
      card(
        24,
        112,
        672,
        'Inventory transaction commits',
        'MUG available_units: 5 − 2 = 3 physical units',
        true,
        176,
      ) +
      text(40, 236, 'The Inventory change is committed before the next transaction.', 19, true) +
      arrow('M360 288V382') +
      text(376, 340, 'later local transaction', 17, true) +
      card(
        24,
        384,
        672,
        'Orders transaction rejects its zero-unit instruction',
        'O42 / requested_units: 0 / CHECK violation',
        false,
        176,
      ) +
      text(40, 508, 'No order row is written. Inventory remains at 3 units.', 20, true) +
      card(
        24,
        672,
        672,
        'Recovery belongs to an explicit service workflow',
        'Runtime SQL cannot bypass the other service’s private schema.',
        false,
        176,
        true,
      ) +
      text(
        40,
        804,
        'Separate commits do not supply an all-or-nothing business operation.',
        18,
        true,
      ) +
      text(
        24,
        952,
        'Arrow: execution order. This is a deliberate failure fixture, not checkout code.',
        17,
      );
  return svg(
    'Database per Service: partial progress across local transactions',
    commitsDescription,
    compact ? 360 : 720,
    compact ? 1024 : 1008,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['database-per-service-ownership', ownership],
  ['database-per-service-commits', commits],
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
console.log('Built two Database per Service diagrams with phone compositions.');
