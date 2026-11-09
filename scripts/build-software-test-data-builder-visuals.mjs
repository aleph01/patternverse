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
const article = await readFile(resolve(root, 'content/patterns/test-data-builder.md'), 'utf8');
const figures = [
  ...article.matchAll(/!\[(.*?)\]\(\.\.\/assets\/software-engineering\/(.*?)\.svg "/g),
].map((m) => [m[2], m[1]]);
if (figures.length !== 2) throw new Error('Expected two Test Data Builder figures.');
function scenario(phone) {
  let d = text(
    24,
    36,
    phone
      ? 'State the important difference'
      : 'Defaults provide context; overrides explain the test',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 82, 'A reusable recipe; real input objects.', 18, true);
    d +=
      rect(24, 112, 312, 160) +
      text(40, 150, 'Default OrderBuilder', 22) +
      text(40, 188, 'Customer C7 · US', 19) +
      text(40, 222, 'Standard delivery · notes empty', 18, true) +
      text(40, 254, 'Subtotal: 1000 cents', 18, true);
    d += arrow('M72 272V328') + text(96, 308, 'Choose test inputs', 18, true);
    d +=
      rect(24, 332, 312, 144, true) +
      text(40, 370, 'Below the threshold', 22) +
      text(40, 408, 'with_subtotal(4999)', 20) +
      text(40, 446, 'build() → real Order', 18, true);
    d += arrow('M72 476V532') + text(96, 512, 'delivery_fee(order)', 18, true);
    d +=
      rect(24, 536, 312, 88, true) +
      text(40, 574, 'Expected fee: 500 cents', 21) +
      text(40, 606, 'Assertion belongs to the test', 17, true);
    d += text(24, 682, 'Reuse the unchanged recipe', 19, true);
    d +=
      rect(24, 712, 312, 144, true) +
      text(40, 750, 'At the threshold', 22) +
      text(40, 788, 'with_subtotal(5000)', 20) +
      text(40, 826, 'build() → another real Order', 17, true);
    d += arrow('M72 856V912') + text(96, 892, 'delivery_fee(order)', 18, true);
    d +=
      rect(24, 916, 312, 88, true) +
      text(40, 954, 'Expected fee: 0 cents', 21) +
      text(40, 986, 'Assertion belongs to the test', 17, true);
    d +=
      text(24, 1052, 'Same real delivery rule in both tests.', 18) +
      text(24, 1092, 'The builder supplies no expected fee.', 17, true);
  } else {
    d += text(24, 84, 'A reusable recipe supplies context, not the expected answer.', 19, true);
    d +=
      rect(24, 120, 672, 108) +
      text(40, 162, 'Default OrderBuilder', 22) +
      text(
        40,
        204,
        'Customer C7 · US · standard delivery · notes empty · subtotal 1000 cents',
        18,
        true,
      );
    d += arrow('M180 228V316') + text(40, 278, 'Choose inputs', 18, true) + arrow('M540 228V316');
    d +=
      rect(24, 320, 312, 108, true) +
      text(40, 362, 'Below the threshold', 22) +
      text(40, 404, 'with_subtotal(4999)', 20);
    d +=
      rect(384, 320, 312, 108, true) +
      text(400, 362, 'At the threshold', 22) +
      text(400, 404, 'with_subtotal(5000)', 20);
    d +=
      arrow('M180 428V500') +
      text(204, 472, 'build()', 18, true) +
      arrow('M540 428V500') +
      text(564, 472, 'build()', 18, true);
    d +=
      rect(24, 504, 312, 100) +
      text(40, 546, 'Real Order A', 22) +
      text(40, 584, 'Subtotal: 4999 cents', 19, true);
    d +=
      rect(384, 504, 312, 100) +
      text(400, 546, 'Real Order B', 22) +
      text(400, 584, 'Subtotal: 5000 cents', 19, true);
    d +=
      arrow('M180 604V676') +
      text(40, 650, 'delivery_fee', 18, true) +
      arrow('M540 604V676') +
      text(400, 650, 'delivery_fee', 18, true);
    d +=
      rect(24, 680, 312, 108, true) +
      text(40, 722, 'Fee: 500 cents', 22) +
      text(40, 764, 'Test asserts this result', 18, true);
    d +=
      rect(384, 680, 312, 108, true) +
      text(400, 722, 'Fee: 0 cents', 22) +
      text(400, 764, 'Test asserts this result', 18, true);
    d += text(24, 840, 'Same real delivery rule; separate real inputs; explicit boundary.', 19);
  }
  return svg(
    'Visible scenario overrides and real test inputs',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 1128 : 880,
    d,
  );
}
function isolation(phone) {
  let d = text(
    24,
    36,
    phone ? 'Reuse recipes, isolate results' : 'Reusing a recipe must not share mutable results',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 82, 'Immutable builder state: notes = ()', 18, true);
    d +=
      rect(24, 112, 312, 88) +
      text(40, 148, 'Base recipe', 22) +
      text(40, 180, 'Standard delivery · notes ()', 18, true);
    d += arrow('M72 200V256') + text(96, 236, 'build() twice', 18, true);
    d +=
      rect(24, 260, 312, 108) +
      text(40, 298, 'Order A · list A', 22) +
      text(40, 338, "After append: ['fragile']", 18);
    d +=
      rect(24, 400, 312, 108) +
      text(40, 438, 'Order B · list B', 22) +
      text(40, 478, 'Still empty: []', 18);
    d += text(24, 556, 'A and B own separate notes lists.', 18, true);
    d += text(24, 622, 'Configuration is separate too', 19, true);
    d +=
      rect(24, 652, 312, 88) +
      text(40, 688, 'Base recipe unchanged', 21) +
      text(40, 720, 'express = False', 19, true);
    d += arrow('M72 740V800') + text(96, 776, 'with_express()', 19, true);
    d +=
      rect(24, 804, 312, 108, true) +
      text(40, 842, 'New variant recipe', 22) +
      text(40, 882, 'express = True', 19);
    d +=
      text(24, 964, 'Fresh lists protect mutable notes.', 18) +
      text(24, 1004, 'Fixed O17 is not a unique ID.', 18, true);
  } else {
    d += text(
      24,
      84,
      'Immutable builder configuration and fresh child lists solve different problems.',
      18,
      true,
    );
    d +=
      rect(24, 120, 672, 104) +
      text(40, 160, 'Base OrderBuilder', 22) +
      text(40, 200, 'Standard delivery · notes = () · fixed fixture ID O17', 19, true);
    d +=
      arrow('M180 224V312') +
      text(40, 272, 'build()', 18, true) +
      arrow('M540 224V312') +
      text(564, 272, 'build()', 18, true);
    d +=
      rect(24, 316, 312, 136) +
      text(40, 358, 'Order A · list A', 22) +
      text(40, 398, 'append("fragile")', 19) +
      text(40, 432, "notes = ['fragile']", 19);
    d +=
      rect(384, 316, 312, 136) +
      text(400, 358, 'Order B · list B', 22) +
      text(400, 398, 'No append here', 19, true) +
      text(400, 432, 'notes = []', 19);
    d += text(24, 500, 'A and B are separate objects with separate notes lists.', 19, true);
    d += text(24, 570, 'Configuration reuse', 19, true);
    d +=
      rect(24, 604, 264, 108) +
      text(40, 646, 'Base recipe', 22) +
      text(40, 688, 'express = False', 19, true);
    d += arrow('M288 660H432') + text(306, 638, 'derive', 18, true);
    d +=
      rect(432, 604, 264, 108, true) +
      text(448, 646, 'New variant recipe', 22) +
      text(448, 688, 'express = True', 19);
    d += text(24, 760, 'with_express() creates the variant; the base stays standard.', 19);
    d += text(
      24,
      808,
      'Fresh objects do not make fixed IDs unique or orders thread-safe.',
      18,
      true,
    );
  }
  return svg(
    'Builder reuse and independent mutable children',
    figures[1][1],
    phone ? 360 : 720,
    phone ? 1040 : 848,
    d,
  );
}
const file = resolve(assets, 'manifest.json'),
  manifest = JSON.parse(await readFile(file, 'utf8'));
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
for (const [i, draw] of [scenario, isolation].entries())
  for (const phone of [false, true]) {
    const relative = `software-engineering/${figures[i][0]}${phone ? '-mobile' : ''}.svg`,
      source = draw(phone);
    await writeFile(resolve(assets, relative), source);
    const [, w, h] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: +w, height: +h };
  }
await writeFile(file, JSON.stringify(manifest, null, 2) + '\n');
console.log('Two editable Test Data Builder figures and separate phone layouts generated.');
