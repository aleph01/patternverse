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
const article = await readFile(resolve(root, 'content/patterns/valet-key.md'), 'utf8');
const figures = [
  ...article.matchAll(/!\[(.*?)\]\(\.\.\/assets\/software-engineering\/(.*?)\.svg "/g),
].map((m) => [m[2], m[1]]);
if (figures.length !== 2) throw new Error('Expected two Valet Key figures.');
function delegation(phone) {
  let d = text(
    24,
    36,
    phone ? 'Authorize, then transfer direct' : 'Authorize the grant; transfer bytes directly',
    phone ? 22 : 24,
  );
  d += text(
    24,
    78,
    phone
      ? 'Application handles the grant.'
      : 'The application handles permission, not the archive stream.',
    phone ? 18 : 19,
    true,
  );
  if (phone) {
    d +=
      rect(24, 112, 312, 104) +
      text(40, 152, 'Client', 22) +
      text(40, 192, 'Request export E7', 18);
    d += arrow('M72 216V268') + text(96, 250, '1 Request grant', 17, true);
    d +=
      rect(24, 272, 312, 192, true) +
      text(40, 312, 'Application issuer', 22) +
      text(40, 352, 'Authenticate + authorize', 18) +
      text(40, 388, 'Grant: GET / exports/E7.zip', 17) +
      text(40, 428, 'Valid: 100 ≤ time < 160', 17, true);
    d += arrow('M72 464V532') + text(96, 508, '2 Return scoped grant', 17, true);
    d +=
      rect(24, 536, 312, 112) +
      text(40, 576, 'Client holds grant', 22) +
      text(40, 616, 'Broad credentials stay private', 17, true);
    d +=
      arrow('M72 648V732') +
      text(96, 686, '3 Direct GET to storage', 17, true) +
      text(96, 716, 'Grant accompanies request', 17, true);
    d +=
      rect(24, 736, 312, 192, true, true) +
      text(40, 776, 'Storage enforces grant', 22) +
      text(40, 816, 'Exact resource + GET + time', 17) +
      text(40, 856, 'Allow → archive bytes', 18) +
      text(40, 898, 'Other request → deny', 17, true);
    d += arrow('M72 928V1004') + text(96, 974, '4 Direct response', 17, true);
    d +=
      rect(24, 1008, 312, 112) +
      text(40, 1048, 'Client receives bytes', 22) +
      text(40, 1088, 'Application did not relay them', 17, true);
    d +=
      text(24, 1164, 'Possession is authority to use it.', 17) +
      text(24, 1204, 'Protect the bearer grant.', 18, true);
  } else {
    d +=
      rect(24, 112, 248, 224) +
      text(40, 152, 'Client', 23) +
      text(40, 196, 'Authenticated at issuer', 18) +
      text(40, 236, 'Receives scoped grant', 18) +
      text(40, 282, 'No account-wide key', 18, true) +
      text(40, 316, 'No standing storage access', 17, true);
    d +=
      rect(448, 112, 248, 224, true) +
      text(464, 152, 'Application issuer', 22) +
      text(464, 196, 'Authorize export E7', 18) +
      text(464, 236, 'Issue GET grant', 19) +
      text(464, 282, '100 ≤ time < 160', 18, true) +
      text(464, 316, 'Keep broad authority', 17, true);
    d +=
      arrow('M276 196H444') +
      text(292, 176, '1 Request', 17, true) +
      arrow('M444 276H276') +
      text(292, 256, '2 Grant', 17, true);
    d +=
      arrow('M112 336V540') +
      text(84, 440, '3', 20) +
      arrow('M216 540V340') +
      text(232, 468, '4', 20);
    d +=
      text(320, 400, '3 Direct GET + grant', 20) +
      text(320, 436, 'Key: exports/E7.zip', 18, true) +
      text(320, 472, '4 Archive bytes to client', 19) +
      text(320, 508, 'Application is off the byte path', 17, true);
    d +=
      rect(24, 544, 672, 208, false, true) +
      text(40, 584, 'Storage enforcement', 23) +
      text(40, 628, 'Validate grant: resource / method / time', 20) +
      text(40, 674, 'Serve only authorized object bytes.', 19) +
      text(40, 720, 'Broad storage credentials stay with trusted services.', 18, true);
    d +=
      text(24, 798, 'Issuance path: application authorizes a narrow delegation.', 19) +
      text(24, 840, 'Data path: client ↔ storage; no application relay.', 19, true) +
      text(24, 882, 'Bearer grant: protect it wherever it travels.', 18, true);
  }
  return svg(
    'Narrow grant and direct resource access',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 1240 : 912,
    d,
  );
}
function scope(phone) {
  let d = text(
    24,
    36,
    phone ? 'Scope and expiry are enforced' : 'One resource, one verb, one validity window',
    phone ? 22 : 24,
  );
  d += text(
    24,
    78,
    phone
      ? 'Grant issued at virtual second 100.'
      : 'Scope: GET exports/E7.zip; valid while 100 ≤ time < 160.',
    phone ? 17 : 19,
    true,
  );
  const rows = [
    ['Download', 'GET / E7', 100, 'archive E7', true],
    ['Other object', 'GET / E8', 100, 'denied', false],
    ['Wrong verb', 'PUT / E7', 100, 'denied', false],
    ['Reuse', 'GET / E7', 100, 'archive E7', true],
    ['Before expiry', 'GET / E7', 159, 'archive E7', true],
    ['At expiry', 'GET / E7', 160, 'denied', false],
  ];
  if (phone) {
    rows.forEach(([name, request, time, result, allow], i) => {
      const y = 112 + i * 196;
      d +=
        rect(24, y, 312, 168, allow) +
        text(40, y + 34, name, 20) +
        text(40, y + 66, request, 18, true) +
        text(40, y + 104, 'Time: ' + time + ' s', 18) +
        text(40, y + 142, 'Result: ' + result, 18);
    });
    d +=
      text(24, 1312, 'Reuse is allowed within the window.', 17) +
      text(24, 1352, 'Expiry blocks a new read.', 18, true);
  } else {
    d +=
      text(40, 132, 'Request', 19, true) +
      text(376, 132, 'Time', 19, true) +
      text(552, 132, 'Result', 19, true);
    rows.forEach(([name, request, time, result, allow], i) => {
      const y = 160 + i * 128;
      d +=
        rect(24, y, 672, 108, allow) +
        text(40, y + 38, name, 21) +
        text(40, y + 78, request, 18, true) +
        text(376, y + 62, time + ' s', 20) +
        text(552, y + 62, result, 20);
    });
    d +=
      text(24, 964, 'Repeated GET is allowed; this is not a one-use token.', 19) +
      text(24, 1012, 'Expiry gates new requests, not bytes already delivered.', 18, true);
  }
  return svg(
    'Resource, operation and time restrictions',
    figures[1][1],
    phone ? 360 : 720,
    phone ? 1392 : 1056,
    d,
  );
}
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
for (const [index, draw] of [delegation, scope].entries())
  for (const phone of [false, true]) {
    const relative = `software-engineering/${figures[index][0]}${phone ? '-mobile' : ''}.svg`;
    const source = draw(phone);
    await writeFile(resolve(assets, relative), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Two Valet Key figures and separate phone layouts generated.');
