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
  resolve(root, 'content/patterns/externalized-authorization.md'),
  'utf8',
);
const figures = [
  ...article.matchAll(/!\[(.*?)\]\(\.\.\/assets\/software-engineering\/(.*?)\.svg "/g),
].map((m) => [m[2], m[1]]);
if (figures.length !== 2) throw new Error('Expected two Externalized Authorization figures.');
function boundary(phone) {
  let d = text(
    24,
    36,
    phone ? 'Separate decision and action' : 'Move decisions; enforce at the operation',
    phone ? 22 : 24,
  );
  d += text(
    24,
    78,
    phone
      ? 'The handler still guards the read.'
      : 'One read request crosses a policy decision interface.',
    phone ? 18 : 19,
    true,
  );
  if (phone) {
    d +=
      rect(24, 112, 312, 176) +
      text(40, 152, '1 Handler / PEP', 22) +
      text(40, 192, 'Authenticated subject', 18) +
      text(40, 226, 'Trusted report tenant', 18) +
      text(40, 264, 'Build exact read query', 18, true);
    d +=
      arrow('M72 288V368') +
      text(96, 326, 'Decision request', 18, true) +
      text(96, 356, 'subject/action/resource', 17, true);
    d +=
      rect(24, 372, 312, 184, true) +
      text(40, 412, '2 Policy engine / PDP', 21) +
      text(40, 452, 'Rules + policy data', 18) +
      text(40, 488, 'Evaluate current query', 18) +
      text(40, 528, 'Return allow or deny', 18, true);
    d +=
      arrow('M72 556V644') +
      text(96, 594, 'Decision + obligations', 17, true) +
      text(96, 624, '+ policy version', 17, true);
    d +=
      rect(24, 648, 312, 264, true, true) +
      text(40, 688, '3 Same handler / PEP', 21) +
      text(40, 730, 'Require Boolean true', 18) +
      text(40, 768, 'Match the exact query', 18) +
      text(40, 806, 'Require usable response', 18) +
      text(40, 844, 'Reject unsupported obligations', 17) +
      text(40, 882, 'Deny or failure → no read', 17, true);
    d +=
      arrow('M72 912V992') +
      text(96, 950, 'Only usable permission', 17, true) +
      text(96, 980, 'reaches body retrieval', 17, true);
    d +=
      rect(24, 996, 312, 152) +
      text(40, 1036, '4 Protected report body', 21) +
      text(40, 1078, 'Only the handler reads it.', 18) +
      text(40, 1116, 'No direct PDP body access', 17, true);
    d +=
      text(24, 1192, 'Decision policy can run locally,', 17) +
      text(24, 1226, 'in a sidecar, or remotely.', 18) +
      text(24, 1266, 'These are ownership boundaries.', 17, true);
  } else {
    d +=
      rect(24, 112, 672, 136) +
      text(40, 152, '1 Handler / PEP', 23) +
      text(40, 194, 'Authenticated subject + trusted resource metadata', 19) +
      text(40, 230, 'Build (subject, action, resource, tenant)', 19, true);
    d +=
      arrow('M72 248V316') + text(96, 290, 'Decision request: exact operation + context', 19, true);
    d +=
      rect(24, 320, 672, 152, true) +
      text(40, 360, '2 Policy engine / PDP', 23) +
      text(40, 404, 'Evaluate rules + policy data; decide access', 19) +
      text(40, 444, 'Policy ownership is separate from business processing.', 19, true);
    d +=
      arrow('M72 472V548') +
      text(96, 514, 'Decision response + policy version + obligations', 19, true);
    d +=
      rect(24, 552, 672, 200, true, true) +
      text(40, 592, '3 Same handler / PEP', 23) +
      text(40, 632, 'Require Boolean true and matching query', 19) +
      text(40, 672, 'Reject unusable replies and unsupported obligations', 19) +
      text(40, 720, 'Deny or failure → no protected-body read', 19, true);
    d +=
      arrow('M72 752V828') +
      text(96, 798, 'Only explicit, usable permission reaches the body', 19, true);
    d +=
      rect(24, 832, 672, 112) +
      text(40, 874, '4 Protected report body', 23) +
      text(40, 920, 'PDP decides; the handler performs the read.', 19, true);
    d +=
      text(24, 992, 'Errors and unsupported obligations cause no body read.', 19) +
      text(24, 1032, 'A local engine, sidecar, or remote service can fill the PDP role.', 18, true);
  }
  return svg(
    'Decisions outside business logic, enforcement at the resource',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 1296 : 1064,
    d,
  );
}
function decisions(phone) {
  let d = text(
    24,
    36,
    phone ? 'Require a usable permit' : 'Only usable, explicit permission releases a body',
    phone ? 22 : 24,
  );
  d += text(
    24,
    78,
    phone
      ? 'Same handler, four evaluations.'
      : 'The handler distinguishes denial from an unavailable decision.',
    phone ? 18 : 19,
    true,
  );
  const rows = [
    ['Own tenant', 'alice / R1', 'P1 · allow', 'Yes', true],
    ['Other tenant', 'alice / R2', 'P1 · deny', 'No', false],
    ['After revocation', 'alice / R1', 'P2 · deny', 'No', false],
    ['Engine offline', 'alice / R1', 'Unavailable', 'No', false],
  ];
  if (phone) {
    rows.forEach(([name, detail, evaluation, read, allowed], i) => {
      const y = 112 + i * 196;
      d +=
        rect(24, y, 312, 168, allowed) +
        text(40, y + 34, name, 20) +
        text(40, y + 66, detail, 18, true) +
        text(40, y + 104, 'Evaluation: ' + evaluation, 18) +
        text(40, y + 142, 'Body read: ' + read.toLowerCase(), 18);
    });
    d +=
      text(24, 920, 'Unsupported obligations?', 20) +
      text(24, 958, 'An allow still cannot release data.', 17) +
      text(24, 1000, 'Failure and denial stay distinct.', 17, true);
  } else {
    d +=
      text(40, 132, 'Read request', 19, true) +
      text(376, 132, 'Evaluation', 19, true) +
      text(552, 132, 'Body read', 19, true);
    rows.forEach(([name, detail, evaluation, read, allowed], i) => {
      const y = 160 + i * 128;
      d +=
        rect(24, y, 672, 108, false, true) +
        text(40, y + 38, name, 21) +
        text(40, y + 78, detail, 18, true) +
        arrow('M340 ' + (y + 56) + 'H364') +
        text(376, y + 62, evaluation, 20) +
        text(552, y + 62, read, 20);
      if (allowed) d += arrow('M516 ' + (y + 56) + 'H544');
    });
    d +=
      text(24, 708, 'A permit with unsupported obligations also blocks the read.', 19) +
      text(24, 752, 'Policy version labels do not prove fleet-wide freshness.', 19, true);
  }
  return svg(
    'Policy outcomes and protected-body reads',
    figures[1][1],
    phone ? 360 : 720,
    phone ? 1032 : 792,
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
console.log('Two Externalized Authorization figures and separate phone layouts generated.');
