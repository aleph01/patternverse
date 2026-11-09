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
    'reference-monitor-boundary',
    'Interactive reads and export requests both enter one logical enforcement boundary. The mechanism uses authenticated subject identity, requested operation, trusted object metadata, and current policy. Only an allowed operation reaches the report store; a denial returns no report. The store has no direct caller access within the declared boundary.',
  ],
  [
    'reference-monitor-revocation',
    'Under policy version 1, Alice’s read of tenant A report R1 is allowed. A serialized revocation installs version 2; Alice’s next read is denied. An unavailable policy state at version 3 denies the auditor’s otherwise permitted export. An earlier returned copy of A totals is not recalled.',
  ],
];
function boundary(phone) {
  let d = text(
    24,
    36,
    phone ? 'Mediate every access path' : 'Every protected access crosses the boundary',
    phone ? 22 : 24,
  );
  d += text(24, 78, 'Declared scope: report bodies.', phone ? 17 : 19, true);
  if (phone) {
    d +=
      rect(24, 112, 312, 112) +
      text(40, 148, 'Read / Export paths', 22) +
      text(40, 184, 'Trusted subject identity', 18) +
      text(40, 214, 'Requested action + object', 18, true);
    d += arrow('M180 224V284') + text(204, 262, 'mediate', 17, true);
    d +=
      rect(24, 288, 312, 624, true, true) +
      text(40, 328, 'Enforcement boundary', 21) +
      text(40, 364, 'Caller has no direct store access', 17, true);
    d +=
      rect(40, 392, 280, 108) +
      text(56, 428, 'Policy + tenant metadata', 20) +
      text(56, 470, 'Current trusted facts', 18, true);
    d += arrow('M180 500V548') + text(204, 532, 'evaluate', 17, true);
    d +=
      rect(40, 552, 280, 128, true) +
      text(56, 590, 'Access validation', 22) +
      text(56, 628, 'subject / action / exact object', 17) +
      text(56, 664, 'Explicit permit required', 18, true);
    d += arrow('M180 680V732') + text(204, 716, 'allow', 17, true);
    d +=
      rect(40, 736, 280, 104) +
      text(56, 774, 'Report bodies', 22) +
      text(56, 816, 'Read only after permit', 18, true);
    d += text(40, 880, 'No permit → no body read', 19);
    d +=
      rect(24, 952, 312, 136) +
      text(40, 990, 'Complete mediation', 20) +
      text(40, 1030, 'Protected enforcement', 20) +
      text(40, 1070, 'Analyzable mechanism', 20);
  } else {
    d +=
      rect(24, 272, 672, 552, true, true) +
      text(40, 310, 'Enforcement boundary', 24) +
      text(40, 350, 'Subjects cannot directly access the store.', 19, true);
    for (const [x, title, request] of [
      [24, 'Read route', 'alice / read / R1'],
      [488, 'Export route', 'auditor / export / R1'],
    ])
      d +=
        rect(x, 112, 208, 96) + text(x + 16, 148, title, 22) + text(x + 16, 188, request, 18, true);
    d += arrow('M128 208V244H420V364') + arrow('M592 208V244H560V364');
    d +=
      rect(48, 368, 248, 144) +
      text(64, 408, 'Policy + metadata', 22) +
      text(64, 452, 'Current policy version', 18) +
      text(64, 492, 'Trusted object tenant', 18, true);
    d += arrow('M300 444H344') + text(304, 428, 'facts', 17, true);
    d +=
      rect(348, 368, 324, 144, true) +
      text(364, 408, 'Access validation', 22) +
      text(364, 452, 'subject / action / object', 19) +
      text(364, 492, 'Explicit permit required', 19, true);
    d += arrow('M510 512V576') + text(534, 554, 'allow operation', 18, true);
    d +=
      rect(48, 580, 624, 112) +
      text(64, 620, 'Report bodies', 23) +
      text(64, 664, 'R1: A totals', 21) +
      text(384, 664, 'R2: B totals', 21);
    d +=
      text(48, 746, 'Denied request: no body-store read.', 22) +
      text(48, 790, 'No caller credentials bypass this declared boundary.', 19, true);
    for (const [x, a, b] of [
      [24, 'Complete', 'mediation'],
      [256, 'Protected', 'enforcement'],
      [488, 'Analyzable', 'mechanism'],
    ])
      d += rect(x, 876, 208, 96) + text(x + 16, 912, a, 21) + text(x + 16, 950, b, 21);
  }
  return svg(
    'Mediate every protected access',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 1120 : 1008,
    d,
  );
}
const requests = [
  ['alice / read R1', 'A totals'],
  ['auditor / export R1', 'A totals'],
  ['alice / export R1', 'denied'],
  ['alice / read R2', 'denied'],
];
function revocation(phone) {
  let d = text(
    24,
    36,
    phone ? 'Current policy, every access' : 'Revocation orders later accesses',
    phone ? 22 : 24,
  );
  d += text(24, 78, 'Policy versions identify state.', phone ? 17 : 19, true);
  if (phone) {
    d += rect(24, 112, 312, 264, true) + text(40, 148, 'P1 / policy available', 21);
    for (const [i, [request, result]] of requests.entries())
      d += text(40, 194 + i * 44, `${request}: ${result}`, request.startsWith('auditor') ? 17 : 18);
    d += arrow('M72 376V436') + text(96, 414, 'Revoke under lock', 17, true);
    d +=
      rect(24, 440, 312, 168, true) +
      text(40, 478, 'P2 / alice read revoked', 20) +
      text(40, 522, 'alice / read R1: denied', 18) +
      text(40, 568, 'Old copy remains with caller', 17, true);
    d += arrow('M72 608V668') + text(96, 646, 'Policy unavailable', 17, true);
    d +=
      rect(24, 672, 312, 152, true) +
      text(40, 710, 'P3 / policy unavailable', 20) +
      text(40, 752, 'auditor / export R1: denied', 17) +
      text(40, 796, 'No permissive fallback', 18, true);
    d +=
      text(24, 880, 'Each request uses current policy.', 18) +
      text(24, 918, 'Earlier data cannot be recalled.', 17, true);
  } else {
    d += rect(24, 112, 672, 224, true) + text(40, 150, 'P1 / policy available', 23);
    for (const [i, [request, result]] of requests.entries())
      d += text(40, 194 + i * 34, `${request}: ${result}`, 21);
    d += arrow('M72 336V412') + text(96, 382, 'Revoke under lock', 19, true);
    d +=
      rect(24, 416, 672, 160, true) +
      text(40, 454, 'P2 / alice read revoked', 23) +
      text(40, 504, 'alice / read R1: denied', 21) +
      text(40, 548, 'Earlier returned A totals remains with the caller.', 19, true);
    d += arrow('M72 576V652') + text(96, 622, 'Policy unavailable', 19, true);
    d +=
      rect(24, 656, 672, 160, true) +
      text(40, 694, 'P3 / policy unavailable', 23) +
      text(40, 744, 'auditor / export R1: denied', 21) +
      text(40, 788, 'No permissive fallback.', 19, true);
    d +=
      text(24, 872, 'Revocation governs later accesses.', 22) +
      text(24, 914, 'Information already returned cannot be recalled.', 19, true);
  }
  return svg(
    'Current policy on every access',
    figures[1][1],
    phone ? 360 : 720,
    phone ? 968 : 960,
    d,
  );
}
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
for (const [index, draw] of [boundary, revocation].entries())
  for (const phone of [false, true]) {
    const relative = `software-engineering/${figures[index][0]}${phone ? '-mobile' : ''}.svg`;
    const source = draw(phone);
    await writeFile(resolve(assets, relative), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Two native SVG figures and separate phone layouts generated.');
