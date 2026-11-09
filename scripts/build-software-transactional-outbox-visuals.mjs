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

const atomicDescription =
  'One source database transaction inserts order O42 and outbox event E901 together. A rollback preserves neither. After commit, a relay reads the pending event and publishes it to a separate broker; broker acceptance is outside the source transaction.';
const retryDescription =
  'E901 is pending after the order commits. A broker accepts it, but acknowledgment is lost, so the source still says pending. After restart the relay sends the same E901, gets acknowledgment, and marks it dispatched. The broker test log contains two acceptances; the order remains a single row.';
function atomic(phone) {
  const drawing = phone
    ? text(24, 34, 'Commit change and intent', 22) +
      rect(24, 112, 312, 480, true) +
      text(40, 146, 'One source transaction', 20) +
      card(40, 176, 280, 'Order O42', '7000 euro cents / EUR 70', false, 128) +
      text(56, 276, 'Business state', 17, true) +
      card(40, 352, 280, 'Outbox E901', 'OrderPlaced / O42 / version 1', false, 128, true) +
      text(56, 452, 'Captured payload / pending', 16, true) +
      text(40, 548, 'Commit both or neither.', 18) +
      arrow('M180 592V686') +
      card(
        24,
        688,
        312,
        'Relay reads committed intent',
        'One worker in this example',
        false,
        128,
        true,
      ) +
      text(40, 790, 'Publish E901 and saved payload', 16, true) +
      arrow('M180 816V910') +
      text(196, 870, 'send', 17, true) +
      card(24, 912, 312, 'Separate broker', 'Acceptance outside source commit', true, 128, true) +
      text(40, 1010, 'Consumers progress separately.', 16, true) +
      text(24, 1130, 'Arrows: read after commit, then send.', 16, true)
    : text(24, 34, 'Commit the order and publication intent', 24) +
      rect(24, 112, 672, 280, true) +
      text(40, 148, 'One source database transaction', 20) +
      card(48, 176, 288, 'Order O42', '7000 euro cents / EUR 70', false, 128) +
      text(64, 276, 'Business state', 17, true) +
      card(384, 176, 288, 'Outbox E901', 'OrderPlaced / O42 / version 1', false, 128, true) +
      text(400, 276, 'Captured payload / pending', 16, true) +
      text(40, 358, 'Commit both; rollback preserves neither.', 19) +
      arrow('M360 392V480') +
      card(
        24,
        482,
        672,
        'Relay reads committed outbox records',
        'Publish E901 with the payload captured during the order transaction.',
        false,
        128,
      ) +
      text(40, 580, 'Delivery does not repeat the order transaction.', 18, true) +
      arrow('M360 610V698') +
      text(376, 660, 'send', 17, true) +
      card(
        24,
        700,
        672,
        'Separate broker',
        'Broker acceptance is outside the source transaction.',
        true,
        128,
      ) +
      text(40, 798, 'Consumer completion is another milestone.', 18, true) +
      text(24, 902, 'Arrows: read committed intent, then attempt publication.', 18, true);
  return svg(
    'One local atomic boundary, later delivery',
    atomicDescription,
    phone ? 360 : 720,
    phone ? 1176 : 944,
    drawing,
  );
}
function retry(phone) {
  const drawing = phone
    ? text(24, 34, 'Acceptance can repeat', 22) +
      card(24, 112, 312, 'Source: E901 pending', 'O42 already committed once', false, 112) +
      arrow('M180 224V286') +
      text(196, 266, 'send E901', 16, true) +
      card(24, 288, 312, 'Broker accepts E901', 'Acceptance log: E901', true, 128) +
      text(40, 390, 'Acknowledgment is lost.', 17, true) +
      arrow('M180 416V478') +
      card(
        24,
        480,
        312,
        'Restart: E901 still pending',
        'No dispatch success was recorded.',
        false,
        128,
        true,
      ) +
      text(40, 582, 'Retry the same ID and payload.', 16, true) +
      arrow('M180 608V670') +
      text(196, 650, 'send E901', 16, true) +
      card(
        24,
        672,
        312,
        'Broker accepts E901 again',
        'Acceptance log: E901, E901',
        true,
        128,
        true,
      ) +
      text(40, 774, 'Acknowledgment returns.', 17, true) +
      arrow('M180 800V862') +
      card(24, 864, 312, 'Source marks dispatched', 'Order count: 1 / pending: 0', false, 128) +
      text(24, 1090, 'Arrows: send, retry, then record success.', 15, true) +
      text(24, 1126, 'Receiving effects need repeat protection.', 15, true)
    : text(24, 34, 'The repeat window is after broker acceptance', 24) +
      card(24, 112, 312, 'Source: E901 pending', 'One committed order O42', false, 160) +
      text(40, 238, 'No publication yet', 18, true) +
      arrow('M336 192H382') +
      card(384, 112, 312, 'Broker accepts E901', 'Acceptance log: E901', true, 160) +
      text(400, 238, 'Acknowledgment is lost.', 17, true) +
      arrow('M540 272V366H180V430') +
      text(196, 402, 'restart / source still pending', 17, true) +
      card(24, 432, 312, 'Relay retries E901', 'Same saved ID and payload', false, 160) +
      text(40, 558, 'Order transaction is not repeated.', 16, true) +
      arrow('M336 512H382') +
      card(
        384,
        432,
        312,
        'Broker accepts E901 again',
        'Acceptance log: E901, E901',
        true,
        160,
        true,
      ) +
      text(400, 558, 'Acknowledgment returns.', 17, true) +
      arrow('M540 592V670') +
      card(
        24,
        672,
        672,
        'Source records dispatch success',
        'One order remains; no pending event. Two broker acceptances.',
        false,
        144,
      ) +
      text(40, 784, 'Dispatched means broker acceptance, not consumer completion.', 18, true) +
      text(24, 906, 'Arrows: publication, restart/retry, and recording dispatch.', 18, true) +
      text(24, 942, 'Consumer-side repeat protection remains necessary.', 18, true);
  return svg(
    'Lost acknowledgment leaves publication retryable',
    retryDescription,
    phone ? 360 : 720,
    phone ? 1176 : 984,
    drawing,
  );
}
const outputs = [
  ['data-engineering/transactional-outbox.svg', atomic(false)],
  ['data-engineering/transactional-outbox-mobile.svg', atomic(true)],
  ['software-engineering/transactional-outbox-retry.svg', retry(false)],
  ['software-engineering/transactional-outbox-retry-mobile.svg', retry(true)],
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
console.log('Rebuilt original Transactional Outbox diagram and three responsive assets.');
