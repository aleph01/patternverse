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
    'gatekeeper-boundary',
    'Public clients reach a limited-privilege gatekeeper, which screens requests and forwards only the fixed label-preview operation over an authenticated internal channel. A separate private service owns authorization and order access. Only that service reaches the order store; the gatekeeper has no storage credentials or direct storage route.',
  ],
  [
    'gatekeeper-decisions',
    'Five requests divide into three outcomes: a two-copy preview for Alice’s O100 order is admitted and allowed; an extra owner field and boolean copy count are rejected before forwarding; four copies and another owner’s order pass admission but are denied by the private service.',
  ],
];
function boundary(phone) {
  let d = text(
    24,
    36,
    phone ? 'Screen at the edge' : 'Screen at the edge, keep authority private',
    phone ? 23 : 24,
  );
  d += text(
    24,
    78,
    phone
      ? 'Keep authority in a private service.'
      : 'Separate public exposure from business and storage privileges.',
    phone ? 17 : 19,
    true,
  );
  if (phone) {
    d +=
      rect(24, 112, 312, 112) +
      text(40, 148, 'Public client', 22) +
      text(40, 184, 'Untrusted request bytes', 18) +
      text(40, 214, 'No direct back-end route', 17, true);
    d += arrow('M72 224V284') + text(96, 260, 'Public request', 18, true);
    d +=
      rect(24, 288, 312, 236, true) +
      text(40, 328, 'Gatekeeper', 23) +
      text(40, 368, 'Limited-privilege identity', 18) +
      text(40, 402, 'Bound and validate input', 18) +
      text(40, 436, 'Build fixed preview request', 18) +
      text(40, 474, 'No order-store credentials', 17, true) +
      text(40, 508, 'Separate runtime', 17, true);
    d +=
      arrow('M72 524V600') +
      text(96, 554, 'Fixed preview contract', 17, true) +
      text(96, 584, 'Authenticated service hop', 17, true);
    d +=
      rect(24, 604, 312, 296, true, true) +
      text(40, 644, 'Private LabelService', 22) +
      text(40, 688, 'Verified user context', 18) +
      text(40, 722, 'Current owner + quota', 18) +
      text(40, 756, 'Creates preview response', 18) +
      text(40, 802, 'Internal endpoint only', 17, true) +
      text(40, 836, 'Separate identity / runtime', 17, true) +
      text(40, 874, 'Order-access authority', 18);
    d += arrow('M72 900V956') + text(96, 934, 'Service-only access', 17, true);
    d +=
      rect(24, 960, 312, 120) +
      text(40, 1000, 'Orders', 22) +
      text(40, 1042, 'Credentials stay private.', 18);
    d +=
      text(24, 1124, 'Ingress cannot read orders directly.', 17) +
      text(24, 1158, 'Enforce this in deployment.', 18, true);
  } else {
    d +=
      rect(24, 112, 672, 96) +
      text(40, 150, 'Public client', 23) +
      text(40, 190, 'Untrusted request bytes · no direct back-end route', 19, true);
    d += arrow('M72 208V256') + text(96, 240, 'Public request', 18, true);
    d +=
      rect(24, 260, 672, 216, true) +
      text(40, 302, 'Gatekeeper · limited-privilege identity', 23) +
      text(40, 350, 'Bound and validate input; build the fixed preview request.', 19) +
      text(40, 396, 'No order-store credentials', 21) +
      text(40, 444, 'Separate runtime from the private service', 19, true);
    d +=
      arrow('M72 476V548') +
      text(96, 518, 'Fixed preview contract · authenticated service hop', 19, true);
    d +=
      rect(24, 552, 672, 236, true, true) +
      text(40, 594, 'Private LabelService', 23) +
      text(40, 640, 'Verified user context + current owner + business quota', 19) +
      text(40, 684, 'Creates preview response; owns order-access authority.', 19) +
      text(40, 732, 'Internal endpoint only', 20) +
      text(40, 768, 'Separate identity / runtime', 18, true);
    d += arrow('M72 788V860') + text(96, 830, 'Service identity accesses orders', 19, true);
    d +=
      rect(24, 864, 672, 96) +
      text(40, 904, 'Orders', 23) +
      text(40, 944, 'Storage credentials remain with the private tier.', 19, true);
    d += text(24, 1010, 'No ingress-to-store route; enforce the boundary in deployment.', 19);
  }
  return svg(
    'Exposure and privilege are separate',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 1184 : 1040,
    d,
  );
}
function decisions(phone) {
  let d = text(
    24,
    36,
    phone ? 'Admission ≠ authorization' : 'Admission and authorization answer different questions',
    phone ? 22 : 24,
  );
  d += text(
    24,
    78,
    phone
      ? 'Five label-preview requests.'
      : 'A well-formed request can still be denied by the private service.',
    phone ? 18 : 19,
    true,
  );
  const rows = [
    ['Allowed preview', 'O100 · copies 2', 'Admitted', 'O100 x2', true],
    ['Extra owner field', 'owner: alice', 'Rejected', 'Not called', false],
    ['Boolean count', 'copies: true', 'Rejected', 'Not called', false],
    ['Over business quota', 'O100 · copies 4', 'Admitted', 'Denied', true],
    ['Other owner’s order', 'O200 · copies 1', 'Admitted', 'Denied', true],
  ];
  if (phone) {
    rows.forEach(([name, detail, admission, service], i) => {
      const y = 112 + i * 196;
      d +=
        rect(24, y, 312, 168, admission === 'Admitted') +
        text(40, y + 34, name, 20) +
        text(40, y + 66, detail, 18, true) +
        text(40, y + 104, 'Admission: ' + admission.toLowerCase(), 18) +
        text(40, y + 142, 'Service: ' + service, 18);
    });
    d += text(24, 1120, 'Rejected → no forwarding.', 20);
  } else {
    d +=
      text(40, 132, 'Request', 19, true) +
      text(376, 132, 'Admission', 19, true) +
      text(552, 132, 'Service result', 19, true);
    rows.forEach(([name, detail, admission, service, forwarded], i) => {
      const y = 160 + i * 128;
      d +=
        rect(24, y, 672, 108, false, true) +
        text(40, y + 38, name, 21) +
        text(40, y + 78, detail, 18, true) +
        arrow('M340 ' + (y + 56) + 'H364') +
        text(376, y + 62, admission, 20) +
        text(552, y + 62, service, 20);
      if (forwarded) d += arrow('M516 ' + (y + 56) + 'H544');
    });
    d += text(24, 834, 'Rejected input never reaches the private service.', 20);
  }
  return svg(
    'Admission is not business authorization',
    figures[1][1],
    phone ? 360 : 720,
    phone ? 1144 : 880,
    d,
  );
}
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
for (const [index, draw] of [boundary, decisions].entries())
  for (const phone of [false, true]) {
    const relative = `software-engineering/${figures[index][0]}${phone ? '-mobile' : ''}.svg`;
    const source = draw(phone);
    await writeFile(resolve(assets, relative), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Two Gatekeeper figures and separate phone layouts generated.');
