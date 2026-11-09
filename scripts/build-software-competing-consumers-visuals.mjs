import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets');
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 19, secondary = false) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${secondary ? '#626962' : '#252c28'}">${esc(value)}</text>`;
const rect = (x, y, width, height, accent = false, white = false) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${white ? '#fff' : accent ? '#edf5f0' : '#f1f2ef'}" stroke="${accent ? '#00855b' : '#a6aca3'}" stroke-width="1.2"/>`;
const arrow = (d) =>
  `<path d="${d}" fill="none" stroke="#00855b" stroke-width="1.5" marker-end="url(#arrow)"/>`;
function svg(title, description, width, height, drawing) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}rect,path{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}
const figures = [
  [
    'competing-consumers-sharing',
    'One thumbnail work queue contains jobs J1, J2, and J3. Consumer A receives J1 while consumer B receives J2. J3 remains ready until a consumer requests more work. These workers divide one logical stream; they do not each receive every job.',
  ],
  [
    'competing-consumers-redelivery',
    'J1 is first delivered to A with token 1. Explicit disconnection retires that delivery and returns J1 to the ready queue. B receives J1 with token 4; a token-1 acknowledgment is rejected and token 4 can be acknowledged. The previous attempt’s business effect remains unknown.',
  ],
];
function sharing(phone) {
  let d = text(
    24,
    36,
    phone ? 'One stream, two workers' : 'One shared stream, two active consumers',
    phone ? 22 : 24,
  );
  d += text(24, 78, 'Snapshot after two receives.', phone ? 17 : 19, true);
  if (phone) {
    d +=
      rect(24, 112, 312, 112) +
      text(40, 148, 'Shared work queue', 21) +
      text(40, 184, 'J3 remains ready', 20) +
      text(40, 210, 'J1 and J2 have been delivered.', 17, true);
    d += arrow('M72 224V336') + text(96, 286, 'J1 / token 1 → A', 18);
    d +=
      rect(24, 340, 312, 124, true) +
      text(40, 376, 'Consumer A', 22) +
      text(40, 414, 'Holds J1 / token 1', 20) +
      text(40, 446, 'Thumbnail handler', 17, true);
    d += arrow('M312 224V242H348V598H338') + text(40, 506, 'J2 / token 2 → B', 18);
    d +=
      rect(24, 536, 312, 124, true) +
      text(40, 572, 'Consumer B', 22) +
      text(40, 610, 'Holds J2 / token 2', 20) +
      text(40, 642, 'Thumbnail handler', 17, true);
    d +=
      rect(24, 708, 312, 172) +
      text(40, 744, 'One recipient per delivery.', 19) +
      text(40, 784, 'B can acknowledge J2, then', 17, true) +
      text(40, 814, 'receive J3 while A holds J1.', 17, true) +
      text(40, 854, 'Equal work shares are not promised.', 16, true);
  } else {
    d +=
      rect(200, 112, 320, 112) +
      text(216, 148, 'Shared work queue', 22) +
      text(216, 184, 'J3 remains ready', 20) +
      text(216, 212, 'J1 and J2 have been delivered.', 17, true);
    d += arrow('M240 224V264H180V348') + text(24, 310, 'J1 / token 1 → A', 20);
    d += arrow('M480 224V264H540V348') + text(384, 310, 'J2 / token 2 → B', 20);
    for (const [x, name, job, token] of [
      [24, 'A', 'J1', 1],
      [384, 'B', 'J2', 2],
    ])
      d +=
        rect(x, 352, 312, 144, true) +
        text(x + 16, 392, `Consumer ${name}`, 22) +
        text(x + 16, 436, `Holds ${job} / token ${token}`, 21) +
        text(x + 16, 478, 'Thumbnail handler', 18, true);
    d +=
      rect(24, 552, 672, 148) +
      text(40, 592, 'One recipient per delivery.', 23) +
      text(40, 636, 'B can acknowledge J2, then receive J3 while A holds J1.', 20, true) +
      text(40, 676, 'Equal work shares are not promised.', 19, true);
  }
  return svg(
    'One shared stream, two active consumers',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 920 : 744,
    d,
  );
}
const states = [
  ['A holds J1', 'Delivery token 1', 'Unacknowledged; effect unknown'],
  ['J1 becomes ready again', 'Token 1 is retired', 'The logical job identity stays J1'],
  ['B holds J1', 'New delivery token 4', 'J2 and J3 were acknowledged first'],
];
function redelivery(phone) {
  let d = text(
    24,
    36,
    phone ? 'Same job, new delivery' : 'Redeliver the job, replace the delivery token',
    phone ? 22 : 24,
  );
  d += text(24, 78, 'Explicit connection loss in the model.', phone ? 17 : 19, true);
  const step = phone ? 208 : 176,
    h = phone ? 144 : 112,
    w = phone ? 312 : 672;
  for (const [i, row] of states.entries()) {
    const y = 112 + i * step;
    d +=
      rect(24, y, w, h, i === 2) +
      text(40, y + 34, `${i + 1}. ${row[0]}`, phone ? 20 : 22) +
      text(40, y + (phone ? 76 : 70), row[1], phone ? 20 : 21) +
      text(40, y + (phone ? 116 : 100), row[2], phone ? 16 : 18, true);
    if (i < 2)
      d +=
        arrow(`M${phone ? 72 : 360} ${y + h}V${y + step - 4}`) +
        text(
          phone ? 96 : 384,
          y + h + 38,
          i === 0 ? 'Disconnect A' : 'Receive at B',
          phone ? 17 : 18,
          true,
        );
  }
  const y = 112 + 3 * step;
  d +=
    arrow(`M${phone ? 72 : 360} ${112 + 2 * step + h}V${y - 4}`) +
    text(phone ? 96 : 384, 112 + 2 * step + h + 38, 'Validate token', phone ? 17 : 18, true);
  d +=
    rect(24, y, w, phone ? 180 : 164, true) +
    text(40, y + 34, '4. Acknowledge current delivery', phone ? 18 : 22) +
    text(40, y + 78, 'Old token 1: rejected', phone ? 20 : 21) +
    text(40, y + 120, 'Current token 4: accepted', phone ? 20 : 21);
  d +=
    text(
      24,
      y + (phone ? 226 : 210),
      'Delivery state is not business proof.',
      phone ? 17 : 19,
      true,
    ) +
    text(
      24,
      y + (phone ? 260 : 244),
      'Duplicate effects need a separate contract.',
      phone ? 16 : 19,
      true,
    );
  return svg(
    'Same job, new delivery',
    figures[1][1],
    phone ? 360 : 720,
    y + (phone ? 304 : 288),
    d,
  );
}
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
for (const [index, draw] of [sharing, redelivery].entries())
  for (const phone of [false, true]) {
    const relative = `software-engineering/${figures[index][0]}${phone ? '-mobile' : ''}.svg`;
    const source = draw(phone);
    await writeFile(resolve(assets, relative), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Two native SVG figures and separate phone layouts generated.');
