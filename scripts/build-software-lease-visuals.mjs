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

const lifetimeDescription =
  "At authority time zero A acquires the partition for 3000 milliseconds. At 2000 milliseconds A renews, moving expiry to 5000. B is denied at 4999. At exactly 5000 A's grant is expired and B can acquire a new grant.";
const boundariesDescription =
  "A sends a renewal request but receives no reply. The authority may have renewed it, so A's local knowledge is uncertain. Separately, an expired grant can be replaced while A's process still runs. External writes need enforcement at their destination.";
function lifetime(phone) {
  let drawing = text(
    24,
    34,
    phone ? 'Grant, renew, expire' : 'One right, with an explicit expiry boundary',
    phone ? 22 : 24,
  );
  drawing += text(24, 70, 'Authority clock / integer milliseconds', phone ? 16 : 19, true);
  if (phone) {
    drawing += card(
      24,
      112,
      312,
      '0 ms / A acquires grant 1',
      'TTL 3000 / expires at 3000',
      true,
      144,
      true,
    );
    drawing += text(40, 222, 'Only one current acquisition.', 16, true);
    drawing += arrow('M180 256V318');
    drawing += card(
      24,
      320,
      312,
      '2000 ms / renewal accepted',
      'New deadline: 2000 + 3000',
      true,
      144,
      true,
    );
    drawing += text(40, 430, 'Expires at 5000, not 6000.', 17, true);
    drawing += arrow('M180 464V526');
    drawing += card(
      24,
      528,
      312,
      '4999 ms / B asks to acquire',
      'A is still current / B is denied',
      false,
      144,
      true,
    );
    drawing += text(40, 638, 'Time is strictly before expiry.', 16, true);
    drawing += arrow('M180 672V734');
    drawing += card(
      24,
      736,
      312,
      '5000 ms / A’s grant expired',
      'A cannot renew in this model.',
      false,
      144,
      true,
    );
    drawing += text(40, 846, 'B can acquire a new grant.', 17, true);
    drawing += text(24, 970, 'Arrows: successive authority operations.', 15, true);
    drawing += text(24, 1008, 'No client clock is modeled.', 16, true);
  } else {
    const stages = [
      [
        112,
        '0 ms',
        'A acquires grant 1',
        'TTL 3000 ms / deadline 3000 ms',
        'Exclusive claim for one partition.',
        true,
      ],
      [
        304,
        '2000 ms',
        'A’s renewal is accepted',
        'New deadline: 2000 + 3000 = 5000 ms',
        'Renew from acceptance time, not the old deadline.',
        true,
      ],
      [
        496,
        '4999 ms',
        'B attempts to acquire',
        'Denied: A’s grant is still current',
        'Validity requires authority time < deadline.',
        false,
      ],
      [
        688,
        '5000 ms',
        'A’s grant has expired',
        'A cannot renew; B can acquire a new grant',
        'Expiry is included in the invalid interval.',
        false,
      ],
    ];
    for (const [y, time, title, detail, note, accent] of stages) {
      drawing += rect(24, y, 144, 136, false, true) + text(40, y + 36, time, 21);
      drawing += card(208, y, 488, title, detail, accent, 136) + text(224, y + 108, note, 16, true);
      if (y < 688) drawing += arrow(`M96 ${y + 136}V${y + 190}`);
    }
    drawing += text(
      24,
      908,
      'Arrows: ordered operations on one authority clock, not network messages.',
      17,
      true,
    );
    drawing += text(
      24,
      948,
      'A’s renewed valid interval is [0, 5000) ms; expiry does not stop its process.',
      17,
      true,
    );
  }
  return svg('Lease lifetime', lifetimeDescription, phone ? 360 : 720, phone ? 1056 : 992, drawing);
}
function boundaries(phone) {
  let drawing = text(
    24,
    34,
    phone ? 'Three separate boundaries' : 'Authority, client knowledge, and external effects',
    phone ? 22 : 24,
  );
  if (phone) {
    drawing += card(
      24,
      112,
      312,
      'A sends a renewal request',
      'A does not receive a reply.',
      false,
      144,
      true,
    );
    drawing += text(40, 222, 'Sending is not confirmation.', 17, true);
    drawing += arrow('M180 256V318');
    drawing += card(
      24,
      320,
      312,
      'Authority may have renewed',
      'The reply could have been lost.',
      true,
      144,
      true,
    );
    drawing += text(40, 430, 'Timeout does not prove failure.', 16, true);
    drawing += arrow('M180 464V526');
    drawing += card(
      24,
      528,
      312,
      'A’s knowledge is uncertain',
      'No assumed permission extension.',
      false,
      144,
      true,
    );
    drawing += text(40, 638, 'Follow the service’s recovery rules.', 15, true);
    drawing += rect(24, 752, 312, 152) + text(40, 786, 'Even after authority expiry…', 19);
    drawing += text(40, 830, 'A may still run or send delayed I/O.', 16, true);
    drawing += text(40, 872, 'A replacement may already exist.', 16, true);
    drawing += card(
      24,
      984,
      312,
      'External destination',
      'Must reject obsolete authority.',
      true,
      144,
      true,
    );
    drawing += text(40, 1094, 'A local lease check is insufficient.', 16, true);
    drawing += text(24, 1210, 'Arrows: renewal uncertainty trace.', 16, true);
    drawing += text(24, 1250, 'Lower panels: separate responsibilities.', 15, true);
  } else {
    drawing += card(24, 112, 296, 'Client A', 'Sends renewal; awaits reply.', false, 144);
    drawing += text(40, 222, 'No reply is received.', 18, true);
    drawing += card(400, 112, 296, 'Authority', 'May commit the renewal.', true, 144);
    drawing += text(416, 222, 'Reply can be lost or delayed.', 17, true);
    drawing += arrow('M320 164H398');
    drawing += text(324, 146, 'request', 15, true);
    drawing += rect(24, 352, 672, 144) + text(40, 386, 'Client knowledge: outcome unknown', 22);
    drawing += text(40, 430, 'A timeout does not prove the renewal was rejected.', 19, true);
    drawing += text(40, 470, 'Do not extend permission just because a request was sent.', 18, true);
    drawing += arrow('M172 256V350');
    drawing += rect(24, 592, 672, 144) + text(40, 626, 'Authority expiry is a separate event', 22);
    drawing += text(40, 670, 'After expiry a replacement can acquire the right.', 19, true);
    drawing += text(
      40,
      710,
      'A may still execute code and its delayed I/O may still arrive.',
      18,
      true,
    );
    drawing += card(
      24,
      832,
      672,
      'External destination: enforce authority where effects occur',
      'Use fencing or an equivalent atomic mechanism for obsolete writers.',
      true,
      144,
    );
    drawing += text(40, 942, 'Lease expiry does not cancel an independent write.', 18, true);
    drawing += text(
      24,
      1058,
      'Arrows: renewal request and client uncertainty, not a clock protocol.',
      17,
      true,
    );
  }
  return svg(
    'Lease knowledge and effect boundaries',
    boundariesDescription,
    phone ? 360 : 720,
    phone ? 1296 : 1104,
    drawing,
  );
}
const files = [
  ['lease-lifetime.svg', lifetime(false), 720, 992],
  ['lease-lifetime-mobile.svg', lifetime(true), 360, 1056],
  ['lease-boundaries.svg', boundaries(false), 720, 1104],
  ['lease-boundaries-mobile.svg', boundaries(true), 360, 1296],
];
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [file, drawing, width, height] of files) {
  await writeFile(resolve(assets, 'software-engineering', file), drawing);
  manifest['software-engineering/' + file] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Built four editable Lease SVG variants.');
