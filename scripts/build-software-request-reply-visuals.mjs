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

const correlationDescription =
  'The desk sends inventory requests desk:1 and desk:2 with the return address desk.replies. The inventory service sends replies to that inbox, copying each request ID into its reply correlation ID. Reply desk:2 arrives before desk:1; the desk selects the matching pending context by ID rather than arrival order.';
const deadlineDescription =
  'A pending request has a local deadline of 500 milliseconds. A valid reply received at 499 milliseconds completes that request. If the request is still pending at 500 milliseconds, expiration removes its context. A later reply is ignored. The remote service can still have completed the work; local expiration is not remote cancellation.';
const guide = (x, y1, y2) =>
  `<path d="M${x} ${y1}V${y2}" fill="none" stroke="#a6aca3" stroke-width="1" stroke-dasharray="4 6"/>`;
function correlation(compact) {
  const drawing = compact
    ? text(24, 32, 'Match replies to requests', 22) +
      card(24, 104, 312, 'Checkout desk', 'inbox: desk.replies', false, 96) +
      arrow('M180 200V278') +
      text(196, 248, 'send', 17, true) +
      card(24, 280, 312, 'Two requests', 'IDs desk:1 and desk:2', true, 144) +
      text(40, 374, 'reply_to: desk.replies', 17, true) +
      arrow('M180 424V502') +
      text(196, 474, 'handle', 17, true) +
      card(24, 504, 312, 'Inventory service', 'Look up book and shoe units.', false, 96) +
      arrow('M180 600V678') +
      text(196, 650, 'reply', 17, true) +
      card(
        24,
        680,
        312,
        'Replies reach desk.replies',
        'desk:2 → 8 units arrives first.',
        true,
        144,
      ) +
      text(40, 774, 'desk:1 → 3 units arrives later.', 17, true) +
      arrow('M180 824V910') +
      text(196, 874, 'match by ID', 17, true) +
      card(24, 912, 312, 'Resume matching contexts', 'desk:2 completes first.', true, 160) +
      text(40, 1006, 'desk:1 completes later.', 17, true) +
      text(40, 1042, 'Arrival order is not identity.', 17, true) +
      text(24, 1144, 'Address selects the inbox.', 18) +
      text(24, 1184, 'ID selects the pending request.', 18)
    : text(24, 34, 'Reply identity is independent of arrival order', 24) +
      guide(164, 192, 900) +
      guide(556, 192, 900) +
      card(24, 88, 280, 'Checkout desk', 'inbox: desk.replies', false, 104) +
      card(416, 88, 280, 'Inventory service', 'Queries book and shoe stock.', false, 104) +
      text(214, 234, 'request desk:1 / book', 18) +
      text(214, 258, 'reply_to: desk.replies', 17, true) +
      arrow('M164 280H556') +
      text(214, 356, 'request desk:2 / shoe', 18) +
      text(214, 380, 'reply_to: desk.replies', 17, true) +
      arrow('M164 402H556') +
      text(214, 516, 'reply desk:2 / 8 units', 18) +
      text(214, 540, 'correlation = desk:2', 17, true) +
      arrow('M556 562H164') +
      card(24, 594, 280, 'Complete desk:2', 'desk:1 remains pending.', true, 80) +
      text(214, 724, 'reply desk:1 / 3 units', 18) +
      text(214, 748, 'correlation = desk:1', 17, true) +
      arrow('M556 770H164') +
      card(24, 802, 280, 'Complete desk:1', 'The later reply matches by ID.', true, 80) +
      text(24, 948, 'Time moves down; solid arrows carry messages.', 18) +
      text(
        24,
        990,
        'A reply address routes the message. Its ID identifies the conversation.',
        17,
        true,
      );
  return svg(
    'Request-Reply: correlation and return address',
    correlationDescription,
    compact ? 360 : 720,
    compact ? 1232 : 1040,
    drawing,
  );
}
function deadline(compact) {
  const drawing = compact
    ? text(24, 32, 'A timeout ends local waiting', 22) +
      card(24, 104, 312, 'Pending desk:3', 'Local deadline: 500 ms', false, 96) +
      text(24, 272, 'Alternative A: before deadline', 19) +
      card(24, 320, 312, 'Valid reply at 499 ms', 'Accept 3 units; remove waiter.', true, 112) +
      text(24, 500, 'Alternative B: deadline reached', 19) +
      card(24, 548, 312, 'Still pending at 500 ms', 'Expire and remove waiter.', true, 112) +
      arrow('M180 660V750') +
      text(196, 712, 'then', 17, true) +
      card(24, 752, 312, 'Reply arrives at 501 ms', 'No pending match: ignore.', false, 112) +
      text(24, 944, 'The server may have finished.', 18) +
      text(24, 988, 'No cancellation was sent.', 17, true) +
      text(24, 1080, 'At 500 ms, accept also times out.', 17) +
      text(24, 1120, 'Boundary rule: now ≥ deadline.', 17, true)
    : text(24, 34, 'A deadline releases a waiter, not remote work', 24) +
      card(
        24,
        100,
        672,
        'Pending desk:3',
        'Local deadline: 500 ms. Alternative outcomes from the same state.',
        false,
        112,
      ) +
      arrow('M360 212V266H180V338') +
      arrow('M360 266H540V338') +
      text(24, 306, 'Before deadline', 18) +
      text(384, 306, 'Deadline reached', 18) +
      card(24, 340, 312, 'Valid reply at 499 ms', 'Accept the result: 3 units.', true, 168) +
      text(40, 450, 'Remove pending desk:3.', 17, true) +
      card(384, 340, 312, 'Still pending at 500 ms', 'Expire the waiting context.', true, 168) +
      text(400, 450, 'Remove pending desk:3.', 17, true) +
      arrow('M180 508V678') +
      text(40, 592, 'local completion', 17, true) +
      arrow('M540 508V678') +
      text(400, 580, 'reply arrives', 17, true) +
      text(400, 608, 'at 501 ms', 17, true) +
      card(24, 680, 312, 'Completed once', 'A duplicate has no waiter.', false, 112) +
      card(384, 680, 312, 'Late reply ignored', 'No pending match remains.', false, 112) +
      text(24, 884, 'At exactly 500 ms, accept also returns a timeout.', 18) +
      text(24, 928, 'The remote operation may already have succeeded.', 18) +
      text(24, 968, 'No cancellation, rollback, or retry is implied.', 17, true);
  return svg(
    'Request-Reply: deadline and late answer',
    deadlineDescription,
    compact ? 360 : 720,
    compact ? 1168 : 1024,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['request-reply-correlation', correlation],
  ['request-reply-deadline', deadline],
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
console.log('Built two Request-Reply diagrams with separately composed phone variants.');
