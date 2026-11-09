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

const replayDescription =
  'Warehouse event E901 adds 40 mug units and records its processed identity in the same database transaction. The acknowledgment is lost. Redelivery with the same consumer, source, event ID, SKU, and quantity finds the committed record and leaves stock at 40. A distinct event E902 can legitimately add another 40.';
const boundaryDescription =
  'Before database commit, a failed stock constraint rolls back both the processed-message row and stock change, so retry remains possible. After commit, losing acknowledgment leaves both records durable, so redelivery is a duplicate. An external email or remote API call sits outside this database boundary and has no protection from this transaction.';
function replay(compact) {
  const drawing = compact
    ? text(24, 34, 'Repeat delivery, preserve intent', 22) +
      text(24, 86, 'stock-receipts / warehouse-a', 17, true) +
      card(24, 144, 312, 'E901: MUG / 40 units', 'Record E901 + stock 0 → 40', true, 208) +
      text(40, 268, 'One database commit', 18, true) +
      text(40, 314, 'applied; acknowledgment lost', 17, true) +
      arrow('M180 352V442') +
      text(196, 404, 'redelivery', 17, true) +
      card(24, 444, 312, 'E901: same payload', 'Record exists; no second add.', false, 176) +
      text(40, 554, 'Return: duplicate', 18, true) +
      text(40, 594, 'Stock: 40 units', 18, true) +
      card(24, 736, 312, 'E902: distinct receipt', 'Same MUG / 40 units', true, 176) +
      text(40, 846, 'One commit: stock 40 → 80', 18, true) +
      text(40, 886, 'Return: applied', 18, true) +
      text(24, 996, 'Identity distinguishes intent.', 18) +
      text(24, 1040, 'Equal contents can be new work.', 17, true)
    : text(24, 34, 'A replay repeats delivery, not the stock change', 24) +
      text(24, 86, 'Consumer: stock-receipts / source: warehouse-a', 19, true) +
      rect(24, 144, 672, 192, true) +
      text(40, 180, 'First E901: MUG / 40 physical units', 22) +
      text(40, 230, 'One commit: processed(E901, MUG, 40) + stock 0 → 40', 20, true) +
      text(40, 290, 'Return: applied. Acknowledgment is lost after commit.', 19, true) +
      arrow('M360 336V414') +
      text(376, 382, 'redelivery', 17, true) +
      card(
        24,
        416,
        672,
        'Same E901 + same payload',
        'Find the committed identity; do not add 40 again.',
        false,
        176,
      ) +
      text(40, 546, 'Return: duplicate / stock: 40 units', 20, true) +
      card(
        24,
        704,
        672,
        'Later E902: a distinct receipt',
        'Same MUG / 40 units; different intended operation.',
        true,
        160,
      ) +
      text(40, 816, 'One commit: stock 40 → 80 / return: applied', 20, true) +
      text(
        24,
        952,
        'Identity stays stable across retries, while independent receipts stay distinct.',
        18,
      ) +
      text(
        24,
        992,
        'The arrow means another delivery of E901, not a second physical shipment.',
        18,
        true,
      );
  return svg(
    'Idempotent Receiver: stable receipt identity',
    replayDescription,
    compact ? 360 : 720,
    compact ? 1096 : 1048,
    drawing,
  );
}
function boundary(compact) {
  const drawing = compact
    ? text(24, 34, 'One atomic database boundary', 22) +
      card(24, 112, 312, 'One SQLite transaction', 'Processed key + payload', true, 176) +
      text(40, 216, 'Inventory change', 18, true) +
      text(40, 256, 'Commit both or roll back both.', 17, true) +
      arrow('M180 288V330H12V476H46') +
      arrow('M12 476V756H46') +
      card(48, 384, 288, 'Before commit: failure', 'Roll back marker and update.', false, 184) +
      text(64, 500, 'No completed receipt recorded.', 16, true) +
      text(64, 540, 'Retry can still apply.', 18, true) +
      card(48, 664, 288, 'After commit: ack lost', 'Both database changes survive.', true, 184) +
      text(64, 780, 'Redelivery is a duplicate.', 18, true) +
      text(64, 820, 'No additional stock change.', 17, true) +
      card(
        24,
        952,
        312,
        'Outside this boundary',
        'Broker acknowledgment follows commit.',
        false,
        176,
        true,
      ) +
      text(40, 1062, 'Email and remote API effects', 17, true) +
      text(40, 1100, 'need their own protection.', 17, true) +
      text(24, 1200, 'Branches: alternative failure points.', 16, true)
    : text(24, 34, 'Protect the database effect as one unit', 24) +
      rect(24, 112, 672, 160, true) +
      text(40, 150, 'Inside one SQLite transaction', 22) +
      text(40, 196, 'Processed key + payload', 19, true) +
      text(400, 196, 'Inventory quantity change', 19, true) +
      text(40, 244, 'Both commit, or neither survives.', 19, true) +
      arrow('M360 272V320H180V382') +
      arrow('M360 320H540V382') +
      card(
        24,
        384,
        312,
        'Before commit: constraint fails',
        'Roll back marker and update.',
        false,
        200,
      ) +
      text(40, 504, 'No completed receipt recorded.', 17, true) +
      text(40, 548, 'Retry after fixing the failure.', 18, true) +
      card(384, 384, 312, 'After commit: ack lost', 'Both database changes survive.', true, 200) +
      text(400, 504, 'Redelivery is a duplicate.', 18, true) +
      text(400, 548, 'No additional stock change.', 18, true) +
      card(
        24,
        704,
        672,
        'Outside this database boundary',
        'Broker acknowledgment follows commit.',
        false,
        176,
        true,
      ) +
      text(40, 824, 'Email and remote API effects need their own protection.', 20, true) +
      text(
        24,
        968,
        'Arrows: alternative failure points around commit, not delivery guarantees.',
        18,
      );
  return svg(
    'Idempotent Receiver: atomic effect and acknowledgment',
    boundaryDescription,
    compact ? 360 : 720,
    compact ? 1256 : 1024,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['idempotent-receiver-replay', replay],
  ['idempotent-receiver-boundary', boundary],
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
console.log('Built two Idempotent Receiver diagrams with separate phone compositions.');
