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

const organizationDescription =
  'An issue-stock request enters the issue_stock procedure. The procedure validates the quantity, reads stock, checks units against availability, calculates the remainder, and writes stock plus a movement record. The capacity decision lives inside the procedure; database rows hold data rather than supplying business-object methods.';
const outcomesDescription =
  'A successful issue starts with five units, subtracts three, inserts movement I-1, and commits two remaining units. A later attempt using duplicate movement I-1 starts with two units, temporarily subtracts one, fails to insert, and rolls back to two. The original I-1 movement remains three units.';
function organization(compact) {
  const drawing = compact
    ? text(24, 32, 'Business rules follow', 22) +
      text(24, 60, 'the request procedure', 22) +
      card(24, 104, 312, 'Issue-stock request', 'P-7 · 3 units · movement I-1', false, 84) +
      arrow('M180 188V258') +
      rect(24, 260, 312, 700, true, true) +
      text(44, 296, 'issue_stock', 23) +
      card(44, 324, 272, 'Validate units', 'Positive whole count', false, 88) +
      card(44, 452, 272, 'Read available', 'P-7 has 5 units', false, 88) +
      card(44, 580, 272, 'Check + calculate', '3 <= 5; remaining = 2', true, 112) +
      arrow('M180 412V450') +
      arrow('M180 540V578') +
      card(44, 808, 272, 'Write stock + movement', 'Use a local transaction', false, 100) +
      arrow('M180 692V806') +
      text(24, 1024, 'The procedure owns the rule.', 18) +
      text(24, 1060, 'Rows supply data.', 17, true) +
      text(24, 1096, 'Arrows: execution order.', 17, true)
    : text(24, 34, 'Business rules live in the request procedure', 24) +
      card(24, 84, 672, 'Issue-stock request', 'P-7 · 3 whole units · movement I-1', false, 88) +
      arrow('M360 172V242') +
      rect(24, 244, 672, 540, true, true) +
      text(44, 282, 'issue_stock', 23) +
      card(44, 316, 280, 'Validate units', 'Positive whole count', false, 90) +
      card(396, 316, 280, 'Read available', 'P-7 has 5 units', false, 90) +
      arrow('M324 360H394') +
      arrow('M536 406V428H360V452') +
      card(44, 454, 632, 'Check + calculate', '3 <= 5 → remaining = 5 − 3 = 2', true, 96) +
      card(
        44,
        654,
        632,
        'Write stock + movement',
        'Use a local database transaction for both writes',
        false,
        88,
      ) +
      arrow('M360 550V652') +
      text(24, 836, 'The rule lives in the procedure; rows supply data.', 18) +
      text(24, 872, 'Arrows show execution order within this request.', 17, true);
  return svg(
    'Transaction Script organizes rules by request',
    organizationDescription,
    compact ? 360 : 720,
    compact ? 1132 : 908,
    drawing,
  );
}
function outcomes(compact) {
  const state = (x, y, w, title, line1, line2, accent = false) =>
    rect(x, y, w, 144, accent) +
    text(x + 16, y + 30, title, 21) +
    text(x + 16, y + 70, line1, 17, true) +
    text(x + 16, y + 110, line2, 17);
  const drawing = compact
    ? text(24, 32, 'Same procedure,', 22) +
      text(24, 60, 'two transaction outcomes', 22) +
      text(24, 112, 'New movement I-1', 20) +
      card(24, 144, 312, '5 available', 'Request: 3 units', false, 90) +
      rect(24, 294, 312, 120) +
      text(40, 326, '5 → 2 (provisional)', 21) +
      text(40, 360, 'Insert I-1: 3 units', 17, true) +
      text(40, 392, 'COMMIT', 19) +
      card(24, 474, 312, '2 available', 'Stored movement I-1: 3 units', true, 90) +
      arrow('M180 234V292') +
      arrow('M180 414V472') +
      text(24, 660, 'Duplicate movement I-1', 20) +
      card(24, 696, 312, '2 available', 'Request: 1 unit', false, 90) +
      rect(24, 846, 312, 120) +
      text(40, 878, '2 → 1 (provisional)', 21) +
      text(40, 912, 'Insert I-1 fails', 17, true) +
      text(40, 944, 'ROLLBACK', 19) +
      card(24, 1026, 312, '2 available', 'I-1 still records 3 units', false, 90) +
      arrow('M180 786V844') +
      dashed('M180 966V1024') +
      text(24, 1180, 'A rejected issue takes no stock.', 18) +
      text(24, 1216, 'Dashed: failed insert and rollback.', 17, true)
    : text(24, 34, 'One procedure; commit or rollback', 24) +
      text(24, 84, 'Before', 18, true) +
      text(264, 84, 'Inside transaction', 18, true) +
      text(504, 84, 'After', 18, true) +
      state(24, 112, 200, '5 available', 'I-1: new ID', 'Request: 3 units') +
      state(264, 112, 200, '5 → 2', 'Insert I-1: 3 units', 'COMMIT') +
      state(504, 112, 192, '2 available', 'I-1: 3 units', 'Saved', true) +
      arrow('M224 184H262') +
      arrow('M464 184H502') +
      state(24, 352, 200, '2 available', 'I-1: reused ID', 'Request: 1 unit') +
      state(264, 352, 200, '2 → 1', 'Insert I-1 fails', 'ROLLBACK') +
      state(504, 352, 192, '2 available', 'I-1: 3 units', 'Unchanged') +
      arrow('M224 424H262') +
      dashed('M464 424H502') +
      text(24, 556, 'Provisional updates are not committed results.', 18) +
      text(24, 596, 'Dashed arrow: failed insert and rollback of the earlier update.', 17, true);
  return svg(
    'Stock and movement commit together or roll back',
    outcomesDescription,
    compact ? 360 : 720,
    compact ? 1256 : 632,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['transaction-script-organization', organization],
  ['transaction-script-outcomes', outcomes],
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
  'Built Transaction Script organization and outcomes figures with separate phone layouts.',
);
