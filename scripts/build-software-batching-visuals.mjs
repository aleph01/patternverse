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
    'batching-cost',
    'Seven individual calls would each pay five milliseconds of fixed overhead plus one millisecond per item, totaling 42 milliseconds of modeled service work. The example emits four batches containing three, one, one, and two items, totaling 27 milliseconds under the same assumptions. Collection waiting is excluded.',
  ],
  [
    'batching-triggers',
    'The program emits a, bb, and c at 8 milliseconds because three items have accumulated. At 13 milliseconds it emits dddd before adding eee because seven bytes would exceed the six-byte limit. At 23 milliseconds eee reaches ten milliseconds of age. Closing at 26 milliseconds emits the remaining f and g.',
  ],
];
const groups = [
  ['a, bb, c', 3, 8],
  ['dddd', 1, 6],
  ['eee', 1, 6],
  ['f, g', 2, 7],
];
function cost(phone) {
  let d = text(
    24,
    36,
    phone ? 'Share the fixed cost' : 'Same seven items, fewer fixed costs',
    phone ? 22 : 24,
  );
  d += text(24, 78, 'Model: 5 ms per call + 1 ms per item.', phone ? 17 : 19, true);
  if (phone) {
    d += rect(24, 112, 312, 284) + text(40, 148, 'Seven individual calls', 21);
    for (const [i, label] of ['a', 'bb', 'c', 'dddd', 'eee', 'f', 'g'].entries()) {
      const x = 40 + (i % 4) * 72,
        y = 176 + Math.floor(i / 4) * 72;
      d +=
        rect(x, y, 56, 56, false, true) +
        text(x + 9, y + 24, label, 17) +
        text(x + 9, y + 46, '6 ms', 16, true);
    }
    d += text(40, 370, '7 × (5 + 1) = 42 ms', 23);
    d += rect(24, 432, 312, 500, true) + text(40, 468, 'Four grouped calls', 21);
    for (const [i, [label, count, service]] of groups.entries()) {
      const y = 496 + i * 98;
      d +=
        rect(40, y, 280, 76, false, true) +
        text(56, y + 29, label, 20) +
        text(
          56,
          y + 59,
          `${count} ${count === 1 ? 'item' : 'items'}: 5 + ${count} = ${service} ms`,
          18,
          true,
        );
    }
    d += text(40, 908, '8 + 6 + 6 + 7 = 27 ms', 22);
    d +=
      rect(24, 972, 312, 128) +
      text(40, 1008, 'Same 7 items; 3 fewer calls.', 19) +
      text(40, 1046, '15 ms less modeled service work.', 17, true) +
      text(40, 1080, 'Collection waiting is additional.', 17, true);
  } else {
    d += rect(24, 112, 232, 560) + text(40, 152, 'Individual calls', 22);
    for (const [i, label] of ['a', 'bb', 'c', 'dddd', 'eee', 'f', 'g'].entries()) {
      const y = 184 + i * 54;
      d += rect(40, y, 200, 44, false, true) + text(56, y + 29, `${label} → 6 ms`, 19);
    }
    d += text(40, 640, '7 × 6 = 42 ms', 23);
    d += rect(288, 112, 408, 560, true) + text(304, 152, 'The example’s four batches', 22);
    for (const [i, [label, count, service]] of groups.entries()) {
      const y = 184 + i * 104;
      d +=
        rect(304, y, 376, 88, false, true) +
        text(320, y + 34, label, 22) +
        text(
          320,
          y + 70,
          `${count} ${count === 1 ? 'item' : 'items'}: 5 + ${count} = ${service} ms`,
          19,
          true,
        );
    }
    d += text(304, 640, '8 + 6 + 6 + 7 = 27 ms', 23);
    d +=
      rect(24, 728, 672, 104) +
      text(40, 766, 'Saved fixed overhead: 3 calls × 5 ms = 15 ms', 22) +
      text(40, 808, 'Service work only; collection waiting is additional.', 19, true);
  }
  return svg('Share the fixed cost', figures[0][1], phone ? 360 : 720, phone ? 1136 : 872, d);
}
const events = [
  [
    8,
    'count',
    'a, bb, c / 4 bytes',
    'Third item arrives at 8 ms.',
    'Count reaches 3; 4 payload bytes.',
  ],
  [13, 'size', 'dddd / 4 bytes', '4 + 3 would exceed 6 bytes.', 'Emit dddd before admitting eee.'],
  [23, 'age', 'eee / 3 bytes', 'Oldest item arrived at 13 ms.', '13 + 10 = 23 ms; advance called.'],
  [
    26,
    'close',
    'f, g / 2 bytes',
    'f and g arrived at 24 and 25 ms.',
    'Close drains the partial group.',
  ],
];
function triggers(phone) {
  let d = text(
    24,
    36,
    phone ? 'Four causes, four emissions' : 'Four causes emit four bounded batches',
    phone ? 22 : 24,
  );
  d += text(
    24,
    78,
    phone
      ? 'Limits: 3 items / 6 bytes / 10 ms.'
      : 'Limits: 3 items / 6 payload bytes / 10 ms oldest-item age.',
    phone ? 17 : 19,
    true,
  );
  const step = phone ? 240 : 220,
    h = phone ? 176 : 156;
  for (const [i, [time, cause, label, note1, note2]] of events.entries()) {
    const y = 112 + i * step;
    d +=
      rect(24, y, phone ? 312 : 672, h, true) +
      text(40, y + 34, `${time} ms / ${cause}`, 22) +
      text(40, y + 78, label, phone ? 21 : 22);
    if (phone) d += text(40, y + 120, note1, 17, true) + text(40, y + 152, note2, 17, true);
    else d += text(328, y + 78, note1, 19, true) + text(328, y + 116, note2, 19, true);
    if (i < 3)
      d +=
        arrow(`M72 ${y + h}V${y + step - 4}`) +
        text(
          96,
          y + h + 38,
          ['Add dddd, then eee', 'Advance with no arrival', 'Add f, g; close'][i],
          phone ? 17 : 18,
          true,
        );
  }
  const note = 112 + 3 * step + h + 52;
  d +=
    text(24, note, 'Age needs a progress mechanism.', phone ? 18 : 21) +
    text(
      24,
      note + 34,
      phone
        ? 'Late advance means late emission.'
        : 'Late advance means late emission; sending adds more delay.',
      phone ? 17 : 19,
      true,
    );
  return svg('Four causes, four emissions', figures[1][1], phone ? 360 : 720, note + 76, d);
}
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
for (const [index, draw] of [cost, triggers].entries())
  for (const phone of [false, true]) {
    const relative = `software-engineering/${figures[index][0]}${phone ? '-mobile' : ''}.svg`;
    const source = draw(phone);
    await writeFile(resolve(assets, relative), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Two native SVG figures and separate phone layouts generated.');
