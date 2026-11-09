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
const article = await readFile(
  resolve(root, 'content/patterns/ml-canary-rollout-with-rollback.md'),
  'utf8',
);
const figures = [...article.matchAll(/!\[(.*?)\]\(\.\.\/assets\/(.*?)\.svg "/g)].map((m) => [
  m[2],
  m[1],
]);
if (figures.length !== 2) throw new Error('Expected two Canary Release figures.');
function gate(phone) {
  let d = text(
    24,
    36,
    phone ? 'Evaluate, then change exposure' : 'Evaluate the release, then change exposure',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 80, 'Example: a 10% candidate stage', 18, true);
    d +=
      rect(24, 108, 312, 164) +
      text(40, 146, 'Router · 100 requests', 22) +
      text(40, 188, 'Incumbent: 90 requests', 19) +
      text(40, 226, 'Candidate: 10 requests', 19) +
      text(40, 258, 'Both return real responses', 16, true);
    d += arrow('M72 272V328') + text(96, 308, 'Separate release metrics', 17, true);
    d +=
      rect(24, 332, 312, 164, true) +
      text(40, 370, 'Evidence gate', 22) +
      text(40, 410, 'Serving health + outcomes', 18) +
      text(40, 448, 'Enough reliable observation', 18) +
      text(40, 480, 'No evidence is not a pass.', 16, true);
    d += arrow('M72 496V552') + text(96, 532, 'Choose next allocation', 18, true);
    d += rect(24, 556, 312, 424, false, true);
    d +=
      rect(40, 580, 280, 96) +
      text(56, 618, 'Pass: advance / promote', 20) +
      text(56, 656, 'Next planned stage', 17, true);
    d +=
      rect(40, 708, 280, 96) +
      text(56, 746, 'Uncertain: hold', 20) +
      text(56, 784, 'Bound observation time', 17, true);
    d +=
      rect(40, 836, 280, 120, true) +
      text(56, 874, 'Breach: restore', 22) +
      text(56, 914, 'Future candidate share → 0%', 17) +
      text(56, 944, 'Prior effects remain', 16, true);
    d +=
      text(24, 1028, 'Incumbent must remain ready', 18) +
      text(24, 1066, 'and compatible with current data.', 18, true);
  } else {
    d += text(24, 80, 'Example: a 10% candidate stage · real user responses', 18, true);
    d +=
      rect(24, 112, 672, 80) +
      text(40, 150, 'Router · stable assignment for this stage', 22) +
      text(40, 180, '100 requests: 10 candidate, 90 incumbent', 18);
    d +=
      arrow('M180 192V264') +
      arrow('M540 192V264') +
      text(40, 236, '90 requests', 18, true) +
      text(400, 236, '10 requests', 18, true);
    d +=
      rect(24, 268, 312, 104) +
      text(40, 306, 'Incumbent', 22) +
      text(40, 346, 'Serves remaining real work', 18, true);
    d +=
      rect(384, 268, 312, 104, true) +
      text(400, 306, 'Candidate', 22) +
      text(400, 346, 'Serves limited real work', 18, true);
    d +=
      arrow('M180 372V444') +
      arrow('M540 372V444') +
      text(230, 416, 'Separate release metrics', 18, true);
    d +=
      rect(24, 448, 672, 128, true) +
      text(40, 486, 'Evidence gate · predefined policy', 22) +
      text(40, 526, 'Serving health + outcomes + enough trustworthy observation', 18) +
      text(40, 560, 'No evidence is not a passing result.', 17, true);
    d += arrow('M128 576V648') + arrow('M360 576V648') + arrow('M592 576V648');
    d +=
      rect(24, 652, 208, 128) +
      text(40, 690, 'Advance / promote', 18) +
      text(40, 732, 'Next planned stage', 17) +
      text(40, 764, 'Retain recovery option', 16, true);
    d +=
      rect(256, 652, 208, 128) +
      text(272, 690, 'Hold', 22) +
      text(272, 732, 'Keep current share', 17) +
      text(272, 764, 'Bound the observation', 16, true);
    d +=
      rect(488, 652, 208, 128, true) +
      text(504, 690, 'Restore', 22) +
      text(504, 732, 'Future share → 0%', 17) +
      text(504, 764, 'Prior effects remain', 16, true);
    d += text(24, 832, 'Restoration requires a healthy, compatible incumbent with capacity.', 18);
  }
  return svg(
    'Limited serving exposure and three evidence-gated outcomes',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 1104 : 872,
    d,
  );
}
function exposure(phone) {
  let d = text(
    24,
    36,
    phone ? 'Separate the release metrics' : 'A healthy average can hide a bad release',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 80, 'Window 2 · 100 requests · 25% stage', 17, true);
    d +=
      rect(24, 108, 312, 128) +
      text(40, 146, 'Endpoint aggregate', 22) +
      text(40, 186, '5/100 failures = 5%', 22) +
      text(40, 220, '3 candidate + 2 incumbent', 16, true);
    d +=
      rect(24, 268, 312, 140, true) +
      text(40, 306, 'Candidate alone', 22) +
      text(40, 346, '3/25 failures = 12%', 22) +
      text(40, 384, 'Breaches 5% failure limit', 17, true);
    d += arrow('M72 408V464') + text(96, 444, 'Reject this stage', 17, true);
    d +=
      rect(24, 468, 312, 176, true) +
      text(40, 506, 'Restore future share to 0%', 20) +
      text(40, 548, '10 + 25 = 35 candidate requests', 18) +
      text(40, 586, 'already served across 2 windows', 18) +
      text(40, 624, '200 total; 3 candidate failures', 17, true);
    d +=
      rect(24, 692, 312, 176) +
      text(40, 730, 'One extra lag window', 22) +
      text(40, 770, '35 + 25 = 60 candidate requests', 18) +
      text(40, 810, '3 + 3 = 6 candidate failures', 18) +
      text(40, 848, 'Prior effects remain.', 17, true);
    d +=
      text(24, 918, 'Complete quality labels:', 18) +
      text(24, 956, '1 wrong / 22 successful responses.', 17, true);
  } else {
    d += text(24, 80, 'Fictional window 2: 100 requests, candidate share 25%', 18, true);
    d +=
      rect(24, 112, 312, 144) +
      text(40, 150, 'Endpoint aggregate', 22) +
      text(40, 194, '5/100 failures = 5%', 22) +
      text(40, 234, '3 candidate + 2 incumbent', 17, true);
    d +=
      rect(384, 112, 312, 144, true) +
      text(400, 150, 'Candidate alone', 22) +
      text(400, 194, '3/25 failures = 12%', 22) +
      text(400, 234, 'Breaches 5% failure limit', 17, true);
    d += arrow('M540 256V328') + text(400, 300, 'Reject this stage', 17, true);
    d +=
      rect(24, 332, 672, 128, true) +
      text(40, 370, 'Decision: restore future candidate share to 0%', 22) +
      text(40, 412, 'Window 1: 10 candidate + window 2: 25 candidate = 35 served', 19) +
      text(40, 444, '200 total requests; 3 candidate serving failures already occurred.', 18, true);
    d +=
      rect(24, 500, 672, 128) +
      text(40, 538, 'One extra rollback-lag window', 22) +
      text(40, 578, '35 + 25 = 60 candidate requests; 3 + 3 = 6 candidate failures.', 19) +
      text(40, 612, 'Lag extends exposure; it does not approve another expansion.', 17, true);
    d += text(
      24,
      680,
      'Complete labels: 1 wrong prediction / 22 successful candidate responses.',
      18,
    );
  }
  return svg(
    'Version-attributed failure rates and exposure before recovery',
    figures[1][1],
    phone ? 360 : 720,
    phone ? 996 : 720,
    d,
  );
}
const manifestPath = resolve(assets, 'manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [i, draw] of [gate, exposure].entries())
  for (const phone of [false, true]) {
    const relative = figures[i][0] + (phone ? '-mobile' : '') + '.svg',
      source = draw(phone);
    await mkdir(resolve(assets, relative, '..'), { recursive: true });
    await writeFile(resolve(assets, relative), source);
    const [, w, h] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: +w, height: +h };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Canary evidence-gate and per-release exposure figures generated; prior ML assets untouched.',
);
