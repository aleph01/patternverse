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
const article = await readFile(resolve(root, 'content/patterns/blue-green-deployment.md'), 'utf8');
const figures = [...article.matchAll(/!\[(.*?)\]\(\.\.\/assets\/(.*?)\.svg "/g)].map((m) => [
  m[2],
  m[1],
]);
if (figures.length !== 2) throw new Error('Expected two Blue-Green Deployment figures.');
function cutover(phone) {
  let d = text(
    24,
    36,
    phone ? 'Switch new traffic, drain old' : 'Switch the destination of new traffic',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 76, 'Application environments only', 18, true);
    d += rect(24, 108, 312, 300, false, true) + text(40, 146, 'Before: blue serves', 22);
    d +=
      rect(40, 172, 280, 64) +
      text(56, 212, 'Router', 22) +
      arrow('M72 236V264') +
      text(96, 256, 'New requests', 17, true);
    d +=
      rect(40, 268, 280, 80, true) +
      text(56, 302, 'Blue v1', 22) +
      text(56, 332, 'Live application', 17, true) +
      text(40, 384, 'Green v2: checks only', 18, true);
    d += rect(24, 444, 312, 300, false, true) + text(40, 482, 'After: green serves', 22);
    d +=
      rect(40, 508, 280, 64) +
      text(56, 548, 'Router', 22) +
      arrow('M72 572V600') +
      text(96, 592, 'New requests', 17, true);
    d +=
      rect(40, 604, 280, 80, true) +
      text(56, 638, 'Green v2', 22) +
      text(56, 668, 'Live application', 17, true) +
      text(40, 720, 'Blue v1: drain old work', 18, true);
    d +=
      rect(24, 784, 312, 140) +
      text(40, 822, 'Shared data · schema 1', 22) +
      text(40, 862, 'Both versions remain compatible.', 16) +
      text(40, 902, 'No data-copy switch modeled.', 17, true);
    d +=
      text(24, 974, 'Arrows route new requests.', 18) +
      text(24, 1014, 'Old work keeps its owner.', 18, true);
  } else {
    d += text(24, 80, 'Environment names are labels; the accent marks the active route.', 18, true);
    d +=
      rect(24, 108, 672, 220, false, true) +
      text(40, 144, 'Before cutover · new requests → blue', 22);
    d += rect(40, 172, 160, 72) + text(56, 216, 'Router', 22);
    d +=
      rect(264, 172, 184, 72, true) +
      text(280, 204, 'Blue v1', 22) +
      text(280, 232, 'Serving', 17, true);
    d +=
      rect(496, 172, 184, 72) +
      text(512, 204, 'Green v2', 22) +
      text(512, 232, 'Candidate checks', 16, true) +
      arrow('M200 208H260');
    d += text(40, 296, 'Green is validated without normal user traffic.', 18, true);
    d +=
      rect(24, 360, 672, 236, false, true) +
      text(40, 396, 'After cutover · new requests → green', 22);
    d += rect(40, 432, 160, 72) + text(56, 476, 'Router', 22);
    d +=
      rect(264, 432, 184, 72) +
      text(280, 464, 'Blue v1', 22) +
      text(280, 492, 'Drain old work', 17, true);
    d +=
      rect(496, 432, 184, 72, true) +
      text(512, 464, 'Green v2', 22) +
      text(512, 492, 'Serving', 17, true);
    d += arrow('M200 468H232V416H588V428');
    d += text(40, 556, 'Blue keeps admitted requests; new requests go to green.', 18, true);
    d +=
      rect(24, 636, 672, 104) +
      text(40, 674, 'Shared data store · schema 1', 22) +
      text(40, 714, 'Both versions must understand the current schema and values.', 18);
    d += text(
      24,
      788,
      'Arrows route new requests; old work stays with its admitting environment.',
      17,
    );
  }
  return svg(
    'Two application environments and request ownership across cutover',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 1052 : 828,
    d,
  );
}
function recovery(phone) {
  let d = text(
    24,
    36,
    phone ? 'Check the return path' : 'Check the return path against current state',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 76, 'Recovery gate · not data restoration', 17, true);
    d +=
      rect(24, 108, 312, 200) +
      text(40, 146, 'Retained blue eligible?', 22) +
      text(40, 188, 'Ready for current load', 19) +
      text(40, 226, 'Current data is compatible', 18) +
      text(40, 268, 'Checks are evidence, not proof.', 16, true);
    d += arrow('M72 308V364') + text(96, 344, 'Choose from evidence', 17, true);
    d += rect(24, 368, 312, 360, false, true);
    d +=
      rect(40, 392, 280, 120, true) +
      text(56, 430, 'Yes: return new traffic', 19) +
      text(56, 468, 'Drain green work', 18) +
      text(56, 496, 'Keep completed effects', 17, true);
    d += text(56, 552, 'OR', 20, true);
    d +=
      rect(40, 580, 280, 120) +
      text(56, 618, 'No: hold the return', 20) +
      text(56, 656, 'Use planned recovery', 18) +
      text(56, 684, 'Old code alone is insufficient', 16, true);
    d +=
      rect(24, 776, 312, 140) +
      text(40, 814, 'Effects are not undone', 21) +
      text(40, 854, 'Orders, messages, external calls', 17) +
      text(40, 894, 'need their own recovery rules.', 17, true);
    d +=
      text(24, 966, 'Close the return window before', 18) +
      text(24, 1004, 'incompatible changes or retirement.', 17, true);
  } else {
    d += text(24, 80, 'Switching back changes future routing, not committed effects.', 18, true);
    d +=
      rect(24, 112, 672, 160) +
      text(40, 150, 'Retained blue eligible?', 22) +
      text(40, 190, 'Ready and provisioned for current load', 19) +
      text(40, 230, 'Compatible with current data and contracts', 19) +
      text(40, 256, 'Illustrative code checks readiness + declared schema support.', 17, true);
    d +=
      arrow('M180 272V344') +
      arrow('M540 272V344') +
      text(40, 316, 'Yes', 18, true) +
      text(400, 316, 'No', 18, true);
    d +=
      rect(24, 348, 312, 144, true) +
      text(40, 386, 'Route new traffic back', 20) +
      text(40, 426, 'Drain green work', 19) +
      text(40, 468, 'Preserve completed transactions', 16, true);
    d +=
      rect(384, 348, 312, 144) +
      text(400, 386, 'Hold the return', 22) +
      text(400, 426, 'Use planned recovery', 19) +
      text(400, 468, 'Retained code alone is insufficient', 16, true);
    d +=
      rect(24, 540, 672, 104) +
      text(40, 580, 'Neither outcome reverses committed effects.', 21) +
      text(
        40,
        622,
        'Recover orders, messages, and external actions through explicit procedures.',
        18,
      );
    d += text(24, 692, 'Close the return window before incompatible changes and retirement.', 18);
  }
  return svg(
    'Return eligibility depends on current environment and state',
    figures[1][1],
    phone ? 360 : 720,
    phone ? 1044 : 732,
    d,
  );
}
const manifestPath = resolve(assets, 'manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [i, draw] of [cutover, recovery].entries())
  for (const phone of [false, true]) {
    const relative = figures[i][0] + (phone ? '-mobile' : '') + '.svg',
      source = draw(phone);
    await mkdir(resolve(assets, relative, '..'), { recursive: true });
    await writeFile(resolve(assets, relative), source);
    const [, w, h] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: +w, height: +h };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Cutover ownership and recovery-gate figures generated with distinct phone layouts.');
