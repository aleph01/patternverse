import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets/data-engineering');
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

const fanoutDescription =
  'OrderPlaced messages E901 and E902 fan out to fulfillment, analytics, and notifications subscriptions. Each subscription receives both messages as independent logical deliveries. Two fulfillment workers take a different message each from their shared fulfillment queue; they divide that workload rather than each receiving the full stream. Publisher acceptance does not mean subscriber work has completed.';
const deliveryDescription =
  'Notifications has two pending messages and a capacity of two. A third publication is rejected before any queue changes, even though fulfillment has space. After notifications is unsubscribed and its backlog discarded, a later publication targets only fulfillment and analytics. This is the simulation’s chosen capacity policy, not a universal broker guarantee.';
function fanout(compact) {
  const d = compact
    ? text(24, 32, 'Fan out by independent interest', 22) +
      card(24, 104, 312, 'Order publisher', 'E901 / O42 and E902 / O43', false, 96) +
      arrow('M180 200V286') +
      text(196, 252, 'publish', 17, true) +
      card(24, 288, 312, 'Topic: orders', 'Route to matching subscriptions.', true, 112) +
      text(24, 464, 'Each subscription gets both.', 18) +
      card(24, 520, 312, 'Fulfillment subscription', 'E901, E902', false, 112) +
      card(24, 704, 312, 'Analytics subscription', 'E901, E902', false, 112) +
      card(24, 888, 312, 'Notifications subscription', 'E901, E902', false, 112) +
      arrow('M24 344H12V576H22') +
      arrow('M12 576V760H22') +
      arrow('M12 760V944H22') +
      text(24, 1104, 'Fulfillment workers share work', 20) +
      card(24, 1168, 312, 'Two workers, one subscription', 'Worker A takes E901.', true, 176) +
      text(40, 1278, 'Worker B takes E902.', 17, true) +
      text(40, 1314, 'One take removes one message.', 16, true) +
      arrow('M336 576H348V1256H338') +
      text(24, 1424, 'Other interests keep their copies.', 18)
    : text(24, 34, 'Independent subscriptions fan out; workers share', 24) +
      card(
        24,
        84,
        672,
        'Order publisher',
        'Publish E901 / O42 and E902 / O43 to orders.',
        false,
        96,
      ) +
      arrow('M360 180V278') +
      text(376, 236, 'publish', 17, true) +
      card(
        24,
        280,
        672,
        'Topic: orders',
        'One logical delivery per matching subscription and publication',
        true,
        112,
      ) +
      text(24, 430, 'Independent interests', 18) +
      arrow('M360 392V452H128V518') +
      arrow('M360 452V518') +
      arrow('M360 452H592V518') +
      card(24, 520, 208, 'Fulfillment', 'E901, E902', false, 144, true) +
      card(256, 520, 208, 'Analytics', 'E901, E902', false, 144, true) +
      card(488, 520, 208, 'Notifications', 'E901, E902', false, 144, true) +
      arrow('M128 664V728H180V822') +
      arrow('M128 728H540V822') +
      card(24, 824, 312, 'Fulfillment worker A', 'Takes E901 from that queue.', true, 112) +
      card(384, 824, 312, 'Fulfillment worker B', 'Takes E902 from that queue.', true, 112) +
      text(24, 992, 'Only the fulfillment workers divide the fulfillment stream.', 18) +
      text(
        24,
        1032,
        'Analytics and notifications still own their independent deliveries.',
        17,
        true,
      );
  return svg(
    'Fan-out interests and shared workers are separate delivery boundaries',
    fanoutDescription,
    compact ? 360 : 720,
    compact ? 1488 : 1080,
    d,
  );
}
function delivery(compact) {
  const d = compact
    ? text(24, 32, 'Capacity and deletion are policies', 22) +
      card(
        24,
        104,
        312,
        'Capacity: 2 pending per queue',
        'Fulfillment 0/2; analytics 1/2',
        false,
        144,
      ) +
      text(40, 214, 'Notifications 2/2: full.', 17, true) +
      arrow('M180 248V334') +
      text(196, 294, 'publish E903', 17, true) +
      card(24, 336, 312, 'Full queue: reject publication', 'No target queue changes.', true, 144) +
      text(40, 446, 'There is no partial enqueue.', 17, true) +
      arrow('M180 480V566') +
      text(196, 532, 'unsubscribe', 17, true) +
      card(24, 568, 312, 'Delete notifications', 'Discard pending E901 and E902.', false, 144) +
      arrow('M180 712V798') +
      text(196, 764, 'retry E903', 17, true) +
      card(24, 800, 312, 'Two remaining targets', 'Fulfillment 1/2', true, 176) +
      text(40, 910, 'Analytics 2/2; return count: 2', 17, true) +
      text(24, 1040, 'Publish counts enqueues.', 18) +
      text(24, 1080, 'Pending work was not processed.', 17, true) +
      text(24, 1144, 'This policy can block publishing.', 18) +
      text(24, 1184, 'No crash-atomic fan-out is claimed.', 17, true)
    : text(24, 34, 'A bounded fan-out policy makes backpressure visible', 24) +
      card(
        24,
        100,
        672,
        'Before publication E903: capacity 2 per queue',
        'Fulfillment 0/2; analytics 1/2; notifications 2/2: full',
        false,
        112,
      ) +
      arrow('M360 212V326') +
      text(376, 270, 'preflight', 17, true) +
      card(
        24,
        328,
        672,
        'Notifications is full: reject before enqueue',
        'All target queues are checked first.',
        true,
        144,
      ) +
      text(40, 438, 'Queue sizes remain 0/2, 1/2, and 2/2.', 17, true) +
      arrow('M360 472V582') +
      text(376, 526, 'unsubscribe notifications', 17, true) +
      card(
        24,
        584,
        672,
        'Delete the notifications subscription',
        'Its pending E901 and E902 are discarded.',
        false,
        112,
      ) +
      arrow('M360 696V806') +
      text(376, 750, 'publish E903 again', 17, true) +
      card(
        24,
        808,
        672,
        'Two targets now receive E903',
        'Fulfillment 1/2; analytics 2/2; returned enqueue count: 2',
        true,
        144,
      ) +
      text(40, 918, 'This does not mean their consumers finished.', 17, true) +
      text(24, 1010, 'Sequential queue-full rejection is not crash-atomic delivery.', 18);
  return svg(
    'The example rejects full-subscription fan-out and explicitly drops deleted backlog',
    deliveryDescription,
    compact ? 360 : 720,
    compact ? 1232 : 1056,
    d,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['publish-subscribe-distribution', fanout],
  ['publish-subscribe-delivery', delivery],
])
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`,
      content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[`data-engineering/${filename}`] = { width: +width, height: +height };
  }
const p = resolve(root, 'content/assets/manifest.json');
await writeFile(
  p,
  JSON.stringify({ ...JSON.parse(await readFile(p, 'utf8')), ...dimensions }, null, 2) + '\n',
);
console.log(
  'Rebuilt the canonical pub/sub figure and added capacity figures with phone compositions.',
);
