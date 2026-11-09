import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets');
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

const joinDescription =
  'An API Composer receives order IDs O42, O43, and O44. It calls Orders once, derives distinct customer IDs C2 and C7, calls Customers once, and joins returned rows by customer ID. The three cards retain requested order; O42 and O44 reuse the same C7 result.';
const requiredDescription =
  'Orders returns O42, O43, and O44 with customer references C7, C2, and C7. Customers returns C2 but omits required C7. The composer rejects the whole result as incomplete; it does not silently drop O42 and O44 or invent a customer label.';
function join(phone) {
  const drawing = phone
    ? text(24, 34, 'Read APIs, then join by identity', 22) +
      card(24, 112, 312, 'Requested order IDs', 'O42 / O43 / O44', false, 96) +
      arrow('M180 208V270') +
      card(24, 272, 312, '1 / Read Orders API', 'Returns O43, O44, O42', true, 144) +
      text(40, 380, 'Each row includes customer_id.', 16, true) +
      arrow('M180 416V478') +
      card(
        24,
        480,
        312,
        'Composer derives distinct IDs',
        'Customer batch: C2, C7',
        false,
        112,
        true,
      ) +
      arrow('M180 592V654') +
      card(
        24,
        656,
        312,
        '2 / Read Customers API',
        'Returns C7 / Mira, then C2 / Sol',
        true,
        144,
        true,
      ) +
      text(40, 764, 'Owner-local revisions: 11 and 3', 16, true) +
      arrow('M180 800V862') +
      card(24, 864, 312, '3 / Join by customer_id', 'Keep requested order:', false, 224) +
      text(40, 964, 'O42 → Mira / 7000 euro cents', 16, true) +
      text(40, 1004, 'O43 → Sol / 2500 euro cents', 16, true) +
      text(40, 1044, 'O44 → Mira / 900 euro cents', 16, true) +
      text(24, 1192, 'Arrows: dependent reads and local join.', 15, true) +
      text(24, 1228, 'One customer response serves two cards.', 15, true)
    : text(24, 34, 'Compose through owner APIs, not private tables', 24) +
      rect(24, 112, 264, 464) +
      text(40, 146, 'API Composer', 22) +
      text(40, 180, 'O42 / O43 / O44', 18, true) +
      text(40, 282, 'Read requested orders.', 17, true) +
      text(40, 342, 'Deduplicate customer IDs,', 16, true) +
      text(40, 380, 'then fetch those customers.', 16, true) +
      text(40, 546, 'Join by customer_id.', 18) +
      card(456, 112, 240, 'Orders API', 'Order rows + references', true, 176, true) +
      text(472, 248, 'Owns order data', 17, true) +
      arrow('M288 192H454') +
      text(306, 174, '1 / order IDs', 16, true) +
      arrow('M456 240H290') +
      text(306, 222, 'order rows', 16, true) +
      card(456, 400, 240, 'Customers API', 'Labels + revisions', true, 176, true) +
      text(472, 536, 'Owns customer data', 17, true) +
      arrow('M288 460H454') +
      text(306, 442, '2 / C2, C7', 16, true) +
      arrow('M456 508H290') +
      text(306, 490, 'customer rows', 16, true) +
      arrow('M156 576V702') +
      text(172, 654, '3 / local identity join', 17, true) +
      card(
        24,
        704,
        672,
        'Cards in requested order',
        'O42 → Mira / 7000 euro cents / revisions (4, 11)',
        false,
        176,
      ) +
      text(40, 810, 'O43 → Sol / 2500 euro cents / revisions (1, 3)', 17, true) +
      text(40, 850, 'O44 → Mira / 900 euro cents / revisions (2, 11)', 17, true) +
      text(24, 966, 'Arrows: API requests, returned rows, and the composed result.', 18, true);
  return svg(
    'Dependent owner API reads and an identity join',
    joinDescription,
    phone ? 360 : 720,
    phone ? 1272 : 1008,
    drawing,
  );
}
function required(phone) {
  const drawing = phone
    ? text(24, 34, 'Missing required data fails visibly', 21) +
      card(
        24,
        112,
        312,
        'Orders returns all 3 rows',
        'O42 → C7 / O43 → C2 / O44 → C7',
        false,
        128,
        true,
      ) +
      text(40, 214, 'Required customers: C2 and C7', 16, true) +
      arrow('M180 240V302') +
      card(
        24,
        304,
        312,
        'Customers returns C2 only',
        'C7 is missing from the response.',
        false,
        128,
        true,
      ) +
      text(40, 406, 'No substitute label is invented.', 16, true) +
      arrow('M180 432V494') +
      card(
        24,
        496,
        312,
        'Check exact identity coverage',
        'Expected {C2, C7} ≠ actual {C2}',
        true,
        128,
        true,
      ) +
      text(40, 598, 'Missing required identity', 17, true) +
      arrow('M180 624V686') +
      card(24, 688, 312, 'CompositionError', 'Return no cards from this query.', false, 128, true) +
      text(40, 790, 'No silent inner-join row loss.', 16, true) +
      text(24, 920, 'Arrows: required read, check, and failure.', 15, true) +
      text(24, 956, 'A partial product needs another contract.', 15, true)
    : text(24, 34, 'Require a complete answer or expose failure', 24) +
      card(
        24,
        112,
        312,
        'Orders returns all 3 rows',
        'O42 → C7 / O43 → C2 / O44 → C7',
        false,
        176,
        true,
      ) +
      text(40, 252, 'Required: C2 and C7', 18, true) +
      card(384, 112, 312, 'Customers returns C2 only', 'C7 is absent.', false, 176) +
      text(400, 252, 'No replacement label', 18, true) +
      arrow('M180 288V366H300V430') +
      arrow('M540 288V366H420V430') +
      card(
        24,
        432,
        672,
        'Composer checks exact identity coverage',
        'Expected {C2, C7} ≠ actual {C2}',
        true,
        160,
      ) +
      text(40, 552, 'Raise CompositionError: Missing required identity', 19, true) +
      arrow('M360 592V670') +
      card(
        24,
        672,
        672,
        'No cards returned from this query',
        'Do not silently drop O42 and O44 or invent a customer label.',
        false,
        128,
      ) +
      text(40, 770, 'This example requires both APIs and every requested identity.', 18, true) +
      text(24, 900, 'Arrows: owner responses, completeness check, and failure outcome.', 17, true) +
      text(24, 940, 'Optional data requires an explicit partial-response policy.', 18, true);
  return svg(
    'Required identity coverage rejects an incomplete join',
    requiredDescription,
    phone ? 360 : 720,
    phone ? 1000 : 984,
    drawing,
  );
}
const outputs = [
  ['software-engineering/api-composition-join.svg', join(false)],
  ['software-engineering/api-composition-join-mobile.svg', join(true)],
  ['software-engineering/api-composition-required.svg', required(false)],
  ['software-engineering/api-composition-required-mobile.svg', required(true)],
];
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [path, source] of outputs) {
  await mkdir(resolve(assets, path, '..'), { recursive: true });
  await writeFile(resolve(assets, path), source);
  const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
  manifest[path] = { width: Number(width), height: Number(height) };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Built four native API Composition SVG variants.');
