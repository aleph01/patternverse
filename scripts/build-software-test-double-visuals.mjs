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
const article = await readFile(resolve(root, 'content/patterns/test-double.md'), 'utf8');
const figures = [
  ...article.matchAll(/!\[(.*?)\]\(\.\.\/assets\/software-engineering\/(.*?)\.svg "/g),
].map((m) => [m[2], m[1]]);
if (figures.length !== 2) throw new Error('Expected two Test Double figures.');
function boundary(phone) {
  let d = text(
    24,
    36,
    phone ? 'Control the collaborator' : 'Keep checkout real; replace its collaborator',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 82, 'Production wiring', 19, true);
    d +=
      rect(24, 112, 312, 88) +
      text(40, 148, 'Real checkout', 21) +
      text(40, 180, 'Application decision', 18, true);
    d += arrow('M72 200V256') + text(96, 234, 'charge(order, cents)', 18, true);
    d +=
      rect(24, 260, 312, 104) +
      text(40, 300, 'Production gateway', 21) +
      text(40, 338, 'Adapter + provider I/O', 18, true);
    d += text(24, 420, 'Focused test wiring', 19, true);
    d +=
      rect(24, 448, 312, 116, true) +
      text(40, 486, 'Test setup', 21) +
      text(40, 520, 'Prepare reply or exception', 18) +
      text(40, 550, 'Supply a fresh double', 18, true);
    d += arrow('M72 564V620') + text(96, 600, 'Exercise the subject', 18, true);
    d +=
      rect(24, 624, 312, 88) +
      text(40, 660, 'Real checkout', 21) +
      text(40, 692, 'Same decision code', 18, true);
    d += arrow('M72 712V768') + text(96, 748, 'charge(order, cents)', 18, true);
    d +=
      rect(24, 772, 312, 116, true) +
      text(40, 810, 'Gateway double', 21) +
      text(40, 846, 'Return reply / raise error', 18) +
      text(40, 876, 'Record calls', 18, true);
    d += arrow('M72 888V952') + text(96, 928, 'Observe after execution', 17, true);
    d +=
      rect(24, 956, 312, 128, true) +
      text(40, 994, 'Test assertions', 21) +
      text(40, 1030, 'Check checkout result', 18) +
      text(40, 1064, 'Inspect the recorded call', 18);
    d +=
      text(24, 1132, 'No provider contact in this test.', 18, true) +
      text(24, 1168, 'Real adapter needs separate tests.', 18, true);
  } else {
    d += text(24, 102, 'Production wiring', 19, true);
    d +=
      rect(24, 132, 240, 108) +
      text(40, 174, 'Real checkout', 22) +
      text(40, 214, 'Application decision', 18, true);
    d += arrow('M264 188H432') + text(296, 170, 'charge', 18, true);
    d +=
      rect(432, 132, 264, 108) +
      text(448, 174, 'Production gateway', 22) +
      text(448, 214, 'Adapter + provider I/O', 18, true);
    d += text(24, 312, 'Focused test wiring', 19, true);
    d +=
      rect(24, 344, 672, 104, true) +
      text(40, 386, 'Test setup', 22) +
      text(40, 426, 'Prepare reply or exception; supply a fresh gateway double.', 19);
    d += arrow('M552 448V520') + text(338, 494, 'Install + configure', 18, true);
    d +=
      rect(24, 524, 240, 108) +
      text(40, 566, 'Real checkout', 22) +
      text(40, 606, 'Same decision code', 18, true);
    d += arrow('M264 580H432') + text(296, 562, 'charge', 18, true);
    d +=
      rect(432, 524, 264, 108, true) +
      text(448, 562, 'Gateway double', 22) +
      text(448, 594, 'Reply / exception', 18) +
      text(448, 622, 'Record calls', 17, true);
    d += arrow('M144 632V716') + text(40, 682, 'Result', 18, true);
    d += arrow('M552 632V716') + text(574, 682, 'Calls', 18, true);
    d +=
      rect(24, 720, 672, 104, true) +
      text(40, 762, 'Test assertions', 22) +
      text(40, 802, 'Check checkout result and inspect the recorded call.', 19);
    d += text(24, 876, 'No provider contact here. Verify the real adapter separately.', 19, true);
  }
  return svg(
    'Controlled collaborator, real checkout',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 1200 : 912,
    d,
  );
}
function scenarios(phone) {
  let d = text(
    24,
    36,
    phone ? 'Four controlled scenarios' : 'One real checkout, four controlled scenarios',
    phone ? 22 : 24,
  );
  const rows = [
    ['Approval', 'Return r-17', 'accepted:r-17', '1 charge call'],
    ['Refusal', 'Raise Declined', 'declined', '1 charge call'],
    ['Zero cents', 'No reply needed', 'ValueError', '0 charge calls'],
    ['Lost reply', 'Raise TimeoutError', 'TimeoutError', '1 charge call'],
  ];
  if (phone) {
    d += text(24, 82, 'Fresh gateway double for each test.', 18, true);
    rows.forEach(([name, input, result, calls], i) => {
      const y = 116 + i * 236;
      d +=
        rect(24, y, 312, 208, i !== 2) +
        text(40, y + 36, name, 22) +
        text(40, y + 72, input, 18, true) +
        text(40, y + 112, 'Checkout outcome', 17, true) +
        text(40, y + 148, result, 21) +
        text(40, y + 184, calls, 18);
    });
    d +=
      text(24, 1106, 'Timeout does not mean refusal.', 18) +
      text(24, 1144, 'Provider outcome stays unknown.', 18, true);
  } else {
    d += text(24, 84, 'Test amount: 2500 USD cents, except the zero boundary.', 19, true);
    d +=
      text(40, 136, 'Double behavior', 18, true) +
      text(352, 136, 'Checkout outcome', 18, true) +
      text(568, 136, 'Interaction', 18, true);
    rows.forEach(([name, input, result, calls], i) => {
      const y = 164 + i * 148;
      d +=
        rect(24, y, 672, 128, i !== 2) +
        text(40, y + 40, name, 22) +
        text(40, y + 88, input, 18, true) +
        text(352, y + 72, result, 20) +
        text(568, y + 72, calls, 17);
    });
    d +=
      text(24, 806, 'Timeout does not establish whether the provider charged.', 19) +
      text(24, 848, 'A passing double-based test cannot prove provider behavior.', 18, true);
  }
  return svg(
    'Checkout test scenarios and observable outcomes',
    figures[1][1],
    phone ? 360 : 720,
    phone ? 1180 : 888,
    d,
  );
}
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
for (const [i, draw] of [boundary, scenarios].entries())
  for (const phone of [false, true]) {
    const relative = `software-engineering/${figures[i][0]}${phone ? '-mobile' : ''}.svg`;
    const source = draw(phone);
    await writeFile(resolve(assets, relative), source);
    const [, w, h] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: +w, height: +h };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Two editable Test Double figures and separate phone compositions generated.');
