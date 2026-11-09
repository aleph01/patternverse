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
  resolve(root, 'content/patterns/data-consumer-driven-contract-tests.md'),
  'utf8',
);
const figures = [...article.matchAll(/!\[(.*?)\]\(\.\.\/assets\/(.*?)\.svg "/g)].map((m) => [
  m[2],
  m[1],
]);
if (figures.length !== 2) throw new Error('Expected two Consumer-Driven Contract Tests figures.');
function pairing(phone) {
  let d = text(
    24,
    36,
    phone ? 'Connect the two checks' : 'One agreement connects two independent checks',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 84, '1 Consumer test · reader-3', 19, true);
    d +=
      rect(24, 112, 312, 88) +
      text(40, 150, 'Real stock reader', 22) +
      text(40, 182, 'Makes request; interprets reply', 17, true);
    d += arrow('M72 200V256') + text(96, 234, 'GET /stock/S17', 18, true);
    d +=
      rect(24, 260, 312, 112) +
      text(40, 298, 'Controlled provider', 22) +
      text(40, 334, 'Example reply: 4 EA', 19) +
      text(40, 362, 'Reader assertion must pass', 17, true);
    d += arrow('M72 372V436') + text(96, 412, 'Publish tested agreement', 17, true);
    d +=
      rect(24, 440, 312, 208, true) +
      text(40, 478, 'Contract · reader-3', 22) +
      text(40, 514, 'GET /stock/S17 → 200', 18) +
      text(40, 548, 'available: integer · unit: EA', 17) +
      text(40, 582, 'Extra fields permitted', 18) +
      text(40, 618, 'Precondition: S17 exists', 18, true);
    d += arrow('M72 648V720') + text(96, 690, 'Read the same contract', 17, true);
    d += text(24, 758, '2 Provider verification', 19, true);
    d +=
      rect(24, 788, 312, 112) +
      text(40, 826, 'Verifier', 22) +
      text(40, 862, 'Arrange fresh S17 state', 18) +
      text(40, 890, 'Replay declared request', 17, true);
    d += arrow('M72 900V964') + text(96, 940, 'GET /stock/S17', 18, true);
    d +=
      rect(24, 968, 312, 112) +
      text(40, 1006, 'Candidate inventory API', 21) +
      text(40, 1042, 'Actual response: 7 EA', 19) +
      text(40, 1070, 'Real serialization path', 17, true);
    d += arrow('M72 1080V1144') + text(96, 1120, 'Compare actual response', 17, true);
    d +=
      rect(24, 1148, 312, 88, true) +
      text(40, 1186, 'Match required obligations', 20) +
      text(40, 1218, 'Integer quantity may vary', 18, true);
    d += text(24, 1284, 'No full system running together.', 18, true);
  } else {
    d += text(24, 94, '1 Consumer test · reader-3', 19, true);
    d +=
      rect(24, 132, 240, 144) +
      text(40, 174, 'Real stock reader', 22) +
      text(40, 214, 'Builds request', 19) +
      text(40, 254, 'Interprets 4 EA', 19, true);
    d +=
      rect(432, 132, 264, 144) +
      text(448, 174, 'Controlled provider', 22) +
      text(448, 214, 'Checks request', 19) +
      text(448, 254, 'Example reply: 4 EA', 19, true);
    d +=
      arrow('M264 196H432') +
      text(304, 180, 'request', 17, true) +
      arrow('M432 240H264') +
      text(316, 264, 'reply', 17, true);
    d +=
      arrow('M552 276V320H360V352') + text(40, 324, 'Publish after consumer assertions', 18, true);
    d +=
      rect(24, 356, 672, 148, true) +
      text(40, 394, 'Shared contract · reader-3', 22) +
      text(40, 430, 'GET /stock/S17 → 200 · available: integer · unit: EA', 19) +
      text(40, 466, 'Extra fields permitted · provider precondition: S17 exists', 18, true);
    d += arrow('M156 504V600') + text(180, 552, 'Read the same contract', 18, true);
    d += text(384, 582, '2 Provider verification', 19, true);
    d +=
      rect(24, 604, 264, 152) +
      text(40, 646, 'Verifier', 22) +
      text(40, 686, 'Arrange fresh S17 state', 18) +
      text(40, 726, 'Invoke + match response', 17, true);
    d +=
      rect(432, 604, 264, 152) +
      text(448, 646, 'Candidate API', 22) +
      text(448, 686, 'Actual response: 7 EA', 18) +
      text(448, 726, 'Real serialization path', 18, true);
    d +=
      arrow('M288 660H432') +
      text(316, 640, 'request', 17, true) +
      arrow('M432 708H288') +
      text(328, 738, 'reply', 17, true);
    d += text(
      24,
      812,
      'Seven can match four’s integer rule; the field name and EA remain required.',
      18,
    );
    d += text(24, 854, 'Neither application needs the other running alongside it.', 19, true);
  }
  return svg(
    'Consumer test and provider verification share one contract',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 1320 : 896,
    d,
  );
}
function evidence(phone) {
  let d = text(
    24,
    36,
    phone
      ? 'Match, then check versions'
      : 'Matching and release evidence answer different questions',
    phone ? 22 : 23,
  );
  const matching = [
    ['Original', 'available: 7 · unit: EA', 'compatible'],
    ['Unused field added', 'Same fields + zone: A3', 'compatible'],
    ['Required name changed', 'quantity replaces available', 'incompatible'],
  ];
  const versions = [
    ['reader-3 + provider-8', 'verified pass'],
    ['reader-3 + provider-9', 'verified fail'],
    ['reader-4 + provider-8', 'unknown'],
  ];
  if (phone) {
    d += text(24, 84, 'Runnable example: reader-3 contract', 18, true);
    matching.forEach(([name, detail, result], i) => {
      const y = 112 + i * 148;
      d +=
        rect(24, y, 312, 128, i < 2) +
        text(40, y + 34, name, 20) +
        text(40, y + 70, detail, 17, true) +
        text(40, y + 108, result, 21);
    });
    d += text(24, 602, 'Illustrative release evidence', 19, true);
    versions.forEach(([pair, result], i) => {
      const y = 632 + i * 136;
      d +=
        rect(24, y, 312, 112, i === 0) + text(40, y + 38, pair, 20) + text(40, y + 80, result, 21);
    });
    d +=
      text(24, 1082, 'Unknown is not a passing result.', 18) +
      text(24, 1122, 'Check versions that will coexist.', 18, true);
  } else {
    d += text(
      24,
      84,
      'Runnable example: one reader-3 contract, three provider variants.',
      19,
      true,
    );
    matching.forEach(([name, detail, result], i) => {
      const y = 116 + i * 116;
      d +=
        rect(24, y, 672, 96, i < 2) +
        text(40, y + 36, name, 21) +
        text(40, y + 76, detail, 18, true) +
        text(532, y + 58, result, 20);
    });
    d += text(24, 514, 'Illustrative release evidence · separate from the simulation', 19, true);
    d += text(40, 566, 'Application versions', 18, true) + text(488, 566, 'Verification', 18, true);
    versions.forEach(([pair, result], i) => {
      const y = 592 + i * 104;
      d +=
        rect(24, y, 672, 80, i === 0) + text(40, y + 48, pair, 21) + text(488, y + 48, result, 21);
    });
    d += text(24, 958, 'Unknown is not a pass; evaluate versions that will coexist.', 19);
  }
  return svg(
    'Response matching and version-specific compatibility evidence',
    figures[1][1],
    phone ? 360 : 720,
    phone ? 1160 : 1000,
    d,
  );
}
const manifestPath = resolve(assets, 'manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [i, draw] of [pairing, evidence].entries())
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
  'Canonical contract figure revised; second evidence figure and both phone layouts generated.',
);
