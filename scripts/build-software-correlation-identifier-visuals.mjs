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

const matchingDescription =
  'Economy and express quote requests for the same order O42 carry different correlation IDs, desk:C1 and desk:C2. A relay changes the express envelope message ID from desk:M2 to relay:M9 while preserving desk:C2. Replies have their own message IDs; the matcher uses correlation IDs to recover the economy or express context.';
const lifecycleDescription =
  'The matcher receives a reply for desk:C2. An untrusted or unexpected source does not consume its context. A valid reply from the expected carrier completes the express quote and removes desk:C2. A duplicate then has no pending match. Explicit cleanup removes abandoned desk:C3 so its later reply is also ignored.';
function matching(compact) {
  const d = compact
    ? text(24, 32, 'New envelope, same conversation', 21) +
      card(24, 104, 312, 'Two quotes for O42', 'desk:M1 / corr desk:C1', false, 184) +
      text(40, 198, 'desk:M2 / corr desk:C2', 17, true) +
      text(40, 234, 'C1 economy; C2 express', 17, true) +
      arrow('M180 288V374') +
      text(196, 338, 'follow express', 16, true) +
      card(24, 376, 312, 'Relay rewrites the envelope', 'message: relay:M9', true, 144) +
      text(40, 470, 'correlation: desk:C2', 17, true) +
      arrow('M180 520V606') +
      text(196, 570, 'replier', 17, true) +
      card(24, 608, 312, 'Reply carrier:R91', 'correlation: desk:C2', true, 144) +
      text(40, 702, 'US dollar cents: 1200', 17, true) +
      arrow('M180 752V838') +
      text(196, 802, 'lookup desk:C2', 16, true) +
      card(24, 840, 312, 'Saved context', 'O42 / express / 1200 cents', false, 128) +
      text(24, 1040, 'desk:C1 still means economy.', 18) +
      text(24, 1080, 'Order ID alone cannot match both.', 17, true)
    : text(24, 34, 'Envelope identity and conversation identity differ', 24) +
      card(24, 100, 312, 'Economy request', 'message: desk:M1', false, 144) +
      text(40, 194, 'correlation: desk:C1', 17, true) +
      text(40, 224, 'O42 / economy', 17, true) +
      card(384, 100, 312, 'Express request', 'message: desk:M2', false, 144) +
      text(400, 194, 'correlation: desk:C2', 17, true) +
      text(400, 224, 'O42 / express', 17, true) +
      arrow('M180 244V598') +
      arrow('M540 244V342') +
      card(384, 344, 312, 'Relay creates an envelope', 'message: relay:M9', true, 144) +
      text(400, 438, 'correlation: desk:C2', 17, true) +
      arrow('M540 488V598') +
      card(
        24,
        600,
        672,
        'Carrier handles each quote separately',
        'Echo the conversation value; assign each reply its own message ID.',
        false,
        100,
      ) +
      arrow('M360 700V748H180V818') +
      arrow('M360 748H540V818') +
      card(24, 820, 312, 'Reply carrier:R90', 'correlation: desk:C1', true, 144) +
      text(40, 914, 'Match O42 / economy', 17, true) +
      card(384, 820, 312, 'Reply carrier:R91', 'correlation: desk:C2', true, 144) +
      text(400, 914, 'Match O42 / express', 17, true) +
      text(24, 1032, 'Correlation recovers the quote context, regardless of reply order.', 18) +
      text(
        24,
        1072,
        'Both operations concern O42; that business ID cannot distinguish them.',
        17,
        true,
      );
  return svg(
    'Correlation Identifier: independent message identities',
    matchingDescription,
    compact ? 360 : 720,
    compact ? 1136 : 1120,
    d,
  );
}
function lifecycle(compact) {
  const d = compact
    ? text(24, 32, 'Match first; consume deliberately', 21) +
      text(24, 88, 'Reply correlation: desk:C2', 18) +
      card(24, 144, 312, 'Unexpected source', 'No completion is accepted.', false, 144) +
      text(40, 238, 'desk:C2 remains pending.', 17, true) +
      text(24, 368, 'A later valid reply', 19) +
      card(24, 416, 312, 'Expected source: carrier', 'Recover O42 / express.', true, 144) +
      text(40, 510, 'Remove pending desk:C2.', 17, true) +
      arrow('M180 560V646') +
      text(196, 610, 'complete once', 16, true) +
      card(24, 648, 312, 'Duplicate reply arrives', 'No pending desk:C2: ignore.', false, 112) +
      text(24, 856, 'Abandoned conversations', 19) +
      card(24, 904, 312, 'Owner forgets desk:C3', 'A later C3 reply is ignored.', false, 128) +
      text(24, 1112, 'Source comes from a trusted adapter.', 16) +
      text(24, 1152, 'The ID does not authenticate it.', 17, true) +
      text(24, 1240, 'No remote cancellation is implied.', 17)
    : text(24, 34, 'Lookup does not by itself authorize completion', 24) +
      card(
        24,
        100,
        672,
        'Reply correlation: desk:C2',
        'Pending context: carrier / O42 / express',
        false,
        112,
      ) +
      arrow('M360 212V270H180V338') +
      arrow('M360 270H540V338') +
      card(24, 340, 312, 'Unexpected source', 'Do not consume the context.', false, 144) +
      text(40, 434, 'A valid answer can still arrive.', 17, true) +
      card(384, 340, 312, 'Expected source: carrier', 'Accept the validated answer.', true, 144) +
      text(400, 434, 'Recover O42 / express.', 17, true) +
      arrow('M180 484V618') +
      arrow('M540 484V618') +
      card(24, 620, 312, 'Keep desk:C2 pending', 'Other contexts stay intact.', false, 96) +
      card(384, 620, 312, 'Remove pending desk:C2', 'Complete this context once.', true, 96) +
      arrow('M540 716V802') +
      card(384, 804, 312, 'Duplicate reply', 'No pending match: ignore.', false, 96) +
      text(24, 984, 'Explicit cleanup removes abandoned desk:C3; its later reply is ignored.', 17) +
      text(
        24,
        1024,
        'Source identity is supplied by a trusted adapter, not proved by the ID.',
        17,
        true,
      ) +
      text(24, 1064, 'Local matching does not cancel or deduplicate remote operations.', 17, true);
  return svg(
    'Correlation Identifier: pending-context lifecycle',
    lifecycleDescription,
    compact ? 360 : 720,
    compact ? 1296 : 1120,
    d,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['correlation-identifier-matching', matching],
  ['correlation-identifier-lifecycle', lifecycle],
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
console.log('Built two Correlation Identifier diagrams with separately composed phone variants.');
