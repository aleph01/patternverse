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
    'request-coalescing-sharing',
    'Callers A, B, and C use the same complete price-read key and join one active loader. The loader produces 1200 USD cents, which can satisfy each still-waiting caller. A different key starts separate work. The registry tracks active work rather than retained price values.',
  ],
  [
    'request-coalescing-lifecycle',
    'A, B, and C initially await one price load. B cancels only its wait. The load continues and A and C receive 1200 cents. Completion retires flight 1. A later caller starts flight 2, increasing the loader count from one to two.',
  ],
];
function sharing(phone) {
  let d = text(
    24,
    36,
    phone ? 'Share one active price read' : 'Equivalent reads share active work',
    phone ? 22 : 24,
  );
  d += text(24, 78, 'Scope: one coalescer instance.', phone ? 17 : 19, true);
  if (phone) {
    d +=
      rect(24, 112, 312, 120) +
      text(40, 148, 'Callers A / B / C', 22) +
      text(40, 184, 'All request key K', 20) +
      text(40, 216, 'Equivalent authorized price reads', 17, true);
    d += arrow('M180 232V292') + text(204, 270, 'join K', 17, true);
    d +=
      rect(24, 296, 312, 176, true) +
      text(40, 334, 'Flight K → task 1', 22) +
      text(40, 376, 'tenant-A / SKU-7', 19) +
      text(40, 414, 'USD / price version 3', 19) +
      text(40, 452, 'Caller waits remain separate.', 17, true);
    d +=
      arrow('M96 472V532') +
      text(112, 512, 'start', 17, true) +
      arrow('M300 536V476') +
      text(212, 512, 'result', 17, true);
    d +=
      rect(24, 536, 312, 128, true) +
      text(40, 574, 'One price loader', 22) +
      text(40, 616, '1200 USD cents', 22) +
      text(40, 648, 'One execution for matching keys', 17, true);
    d +=
      rect(24, 712, 312, 168) +
      text(40, 748, 'Result shared with waiting callers.', 18) +
      text(40, 792, 'Different key → separate work.', 17, true) +
      text(40, 834, 'Retire completed flights.', 19) +
      text(40, 864, 'No completed-price cache here.', 17, true);
  } else {
    for (const [x, name] of [
      [24, 'A'],
      [256, 'B'],
      [488, 'C'],
    ])
      d +=
        rect(x, 112, 208, 88) +
        text(x + 16, 148, `Caller ${name}`, 22) +
        text(x + 16, 184, 'Same key K', 18, true);
    d +=
      arrow('M128 200V248H320V284') +
      arrow('M360 200V284') +
      arrow('M592 200V248H400V284') +
      text(24, 258, 'join K', 18, true);
    d +=
      rect(24, 288, 672, 144, true) +
      text(40, 328, 'Flight registry / K → task 1', 23) +
      text(40, 372, 'K = tenant-A / SKU-7 / USD / price version 3', 21) +
      text(40, 412, 'Caller waits remain separate.', 19, true);
    d +=
      arrow('M240 432V492') +
      text(264, 470, 'start once', 19, true) +
      arrow('M600 496V436') +
      text(420, 470, 'shared outcome', 18, true);
    d +=
      rect(24, 496, 672, 112, true) +
      text(40, 536, 'Price loader / one active execution', 23) +
      text(40, 580, 'Produces 1200 USD cents', 21);
    d +=
      rect(24, 652, 672, 124) +
      text(40, 690, 'Same result available to A, B, C while waiting.', 22) +
      text(40, 734, 'Different key → separate flight. Retire completed flights.', 19, true);
  }
  return svg(
    'Equivalent reads share active work',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 920 : 816,
    d,
  );
}
const phases = [
  ['Three callers join flight 1', 'A, B, C await the same task', 'Underlying loads: 1'],
  ['B cancels its wait', 'A and C remain attached', 'Flight 1 continues'],
  ['Flight 1 completes', 'A and C receive 1200 cents', 'Retire flight 1'],
  ['Later call starts flight 2', 'No completed-price cache', 'Underlying loads: 2'],
];
function lifecycle(phone) {
  let d = text(
    24,
    36,
    phone ? 'Own the work; separate waits' : 'One departing caller does not cancel shared work',
    phone ? 22 : 24,
  );
  d += text(
    24,
    78,
    phone ? 'Event-controlled execution.' : 'The program’s event-controlled execution.',
    phone ? 17 : 19,
    true,
  );
  const step = phone ? 224 : 208,
    h = phone ? 160 : 144;
  for (const [i, row] of phases.entries()) {
    const y = 112 + i * step;
    d +=
      rect(24, y, phone ? 312 : 672, h, true) +
      text(40, y + 34, `${i + 1}. ${row[0]}`, phone ? 19 : 22) +
      text(40, y + (phone ? 82 : 80), row[1], phone ? 18 : 21) +
      text(40, y + (phone ? 126 : 124), row[2], phone ? 18 : 19, true);
    if (i < 3)
      d +=
        arrow(`M72 ${y + h}V${y + step - 4}`) +
        text(
          96,
          y + h + 38,
          ['Cancel B’s wait', 'Complete loader', 'New call after completion'][i],
          phone ? 17 : 18,
          true,
        );
  }
  const note = 112 + 3 * step + h + 52;
  d +=
    text(24, note, 'Wait cancellation is local.', phone ? 19 : 21) +
    text(
      24,
      note + 34,
      phone
        ? 'Shared work needs its own deadline.'
        : 'Shared work needs its own deadline and shutdown policy.',
      phone ? 17 : 19,
      true,
    );
  return svg('Own the work; separate the waits', figures[1][1], phone ? 360 : 720, note + 76, d);
}
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
for (const [index, draw] of [sharing, lifecycle].entries())
  for (const phone of [false, true]) {
    const relative = `software-engineering/${figures[index][0]}${phone ? '-mobile' : ''}.svg`;
    const source = draw(phone);
    await writeFile(resolve(assets, relative), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Two native SVG figures and separate phone layouts generated.');
