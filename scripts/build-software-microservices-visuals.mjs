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

const boundariesDescription =
  'Orders release 7 and Inventory release 12 are separate deployment units. Orders sends a reservation request to Inventory through its contract. Each service accesses only its own records.';
const uncertaintyDescription =
  'Inventory accepts a reservation and reduces stock, but its reply is lost. Orders stays pending. A later retry with the same order identity retrieves the existing reservation and lets Orders confirm without reducing stock again.';

function service(x, y, width, title, api, state) {
  return (
    rect(x, y, width, 246, false, true) +
    text(x + 16, y + 34, title, 20) +
    card(x + 20, y + 64, width - 40, api, 'Public contract', true, 68) +
    `<path d="M${x + width / 2} ${y + 132}V${y + 158}" stroke="#a6aca3" stroke-width="1.2"/>` +
    card(x + 20, y + 158, width - 40, state, 'Owned by this service', false, 68)
  );
}
function boundaries(compact) {
  const drawing = compact
    ? text(24, 32, 'Business boundaries;', 22) +
      text(24, 60, 'independent releases', 22) +
      service(24, 108, 312, 'Orders · release 7', 'Place order', 'Order status') +
      text(64, 406, 'reserve · network request', 17) +
      arrow('M44 206H12V582H42') +
      service(24, 484, 312, 'Inventory · release 12', 'Reserve units', 'Stock + reservations') +
      text(24, 788, 'Each service owns its records.', 17) +
      text(24, 820, 'Releases keep contracts compatible.', 17, true)
    : text(24, 34, 'Business boundaries that are also release boundaries', 24) +
      service(24, 120, 284, 'Orders · release 7', 'Place order', 'Order status') +
      service(412, 120, 284, 'Inventory · release 12', 'Reserve units', 'Stock + reservations') +
      arrow('M288 218H430') +
      text(328, 168, 'reserve', 17) +
      text(314, 192, 'network request', 14) +
      text(24, 428, 'Separate deployables; explicit communication contracts.', 19) +
      text(24, 464, 'No service writes directly to the other service’s records.', 17, true);
  return svg(
    'Independent service releases and owned records',
    boundariesDescription,
    compact ? 360 : 720,
    compact ? 856 : 512,
    drawing,
  );
}
const dashed = (d) =>
  `<path d="${d}" fill="none" stroke="#626962" stroke-width="1.4" stroke-dasharray="5 4"/>`;
const cross = (x, y) =>
  `<path d="M${x - 5} ${y - 5}L${x + 5} ${y + 5}M${x - 5} ${y + 5}L${x + 5} ${y - 5}" stroke="#626962" stroke-width="1.4"/>`;
function event(y, title, line1, line2, accent = false) {
  return (
    rect(24, y, 312, 126, accent) +
    text(40, y + 30, title, 20) +
    text(40, y + 66, line1, 18) +
    text(40, y + 96, line2, 17, true)
  );
}
function uncertainty(compact) {
  const drawing = compact
    ? text(24, 32, 'A lost reply is an', 22) +
      text(24, 60, 'uncertain outcome', 22) +
      text(24, 98, 'Read downward: event order', 17, true) +
      event(130, '1 · Orders requests', 'Reserve 2 units for o1', 'Order status: pending') +
      arrow('M180 256V296') +
      event(298, '2 · Inventory records', 'Stock: 4 → 2 units', 'Remembers o1: reserved', true) +
      dashed('M180 424V468') +
      cross(180, 452) +
      text(200, 458, 'Reply lost', 17, true) +
      event(482, '3 · Orders waits', 'Outcome remains unknown', 'Order status: pending') +
      arrow('M180 608V648') +
      event(
        650,
        '4 · Orders retries o1',
        'Same identity + 2 units',
        'Inventory returns saved result',
        true,
      ) +
      arrow('M180 776V816') +
      event(818, '5 · Orders confirms', 'Order status: confirmed', 'Stock stays at 2 units', true) +
      text(24, 990, 'No cross-service transaction.', 17, true)
    : text(24, 34, 'A lost reply does not undo a remote change', 24) +
      card(40, 86, 220, 'Orders', 'Owns order status', false, 72) +
      card(460, 86, 220, 'Inventory', 'Owns stock + receipts', false, 72) +
      `<path d="M150 158V648M570 158V648" stroke="#a6aca3" stroke-width="1.2"/>` +
      text(230, 194, 'reserve o1 · 2 units', 18) +
      arrow('M150 214H568') +
      rect(414, 244, 282, 72, true) +
      text(430, 272, 'Stock: 4 → 2 units', 18) +
      text(430, 298, 'Save o1: reserved', 17, true) +
      dashed('M570 350H300') +
      cross(300, 350) +
      text(348, 338, 'reply lost', 17, true) +
      rect(24, 380, 262, 64) +
      text(40, 406, 'Order stays pending', 19) +
      text(40, 430, 'Remote outcome unknown', 17, true) +
      text(226, 478, 'retry o1 · same 2 units', 18) +
      arrow('M150 498H568') +
      text(224, 564, 'saved result: reserved', 18) +
      arrow('M570 584H152') +
      text(24, 694, 'Orders confirms. Inventory still has 2 available units.', 19) +
      text(24, 728, 'Retry identity prevents another deduction in this example.', 17, true);
  return svg(
    'Remote success with a lost reply and an explicit retry',
    uncertaintyDescription,
    compact ? 360 : 720,
    compact ? 1028 : 766,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['microservices-boundaries', boundaries],
  ['microservices-uncertainty', uncertainty],
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
  'Built Microservices release-boundary and uncertain-response figures with separate phone layouts.',
);
