import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../content/assets/engineering/', import.meta.url));
await mkdir(output, { recursive: true });
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, s, a = 'start') =>
  '<text x="' + x + '" y="' + y + '" text-anchor="' + a + '">' + esc(s) + '</text>';
const path = (d, c = 'line') => '<path d="' + d + '" class="' + c + '"/>';
const rect = (x, y, w, h, c = 'existing', r = 0) =>
  '<rect x="' +
  x +
  '" y="' +
  y +
  '" width="' +
  w +
  '" height="' +
  h +
  '" rx="' +
  r +
  '" class="' +
  c +
  '"/>';
const ellipse = (x, y, rx, ry, c = 'paper') =>
  '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" class="' + c + '"/>';
const arrow = (d) => '<path d="' + d + '" class="action" marker-end="url(#arrow)"/>';
const polygon = (pts, c = 'existing') =>
  '<polygon points="' + pts.map((p) => p.join(',')).join(' ') + '" class="' + c + '"/>';
function svg(title, desc, height, b, mobile) {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="' +
    height +
    '" viewBox="0 0 560 ' +
    height +
    '" role="img" aria-labelledby="title desc" data-engineering-style="light-editorial">\n<title id="title">' +
    esc(title) +
    '</title><desc id="desc">' +
    esc(desc) +
    '</desc>\n' +
    '<style>:root{color-scheme:only light;--paper:#ffffff;--ink:#252c28;--line:#a6aca3;--stone:#f1f2ef;--mint:#edf5f0;--green:#00855b}svg{background:#fff;color:var(--ink)}path,rect,ellipse,polygon{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:butt}text{fill:var(--ink);font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:' +
    (mobile ? '21.777778' : '20.222222') +
    'px;font-weight:400}.paper{fill:#fff;stroke:var(--ink);stroke-width:1.3}.existing{fill:var(--stone);stroke:var(--line);stroke-width:1.1}.line{fill:none;stroke:var(--ink);stroke-width:1.3}.heavy{fill:none;stroke:var(--ink);stroke-width:1.8}.fine,.leader{fill:none;stroke:var(--line);stroke-width:1.1}.ghost{fill:none;stroke:var(--line);stroke-width:1.1;stroke-dasharray:5 4}.center{fill:none;stroke:var(--line);stroke-width:1;stroke-dasharray:8 4 2 4}.highlight{fill:var(--mint);stroke:var(--green);stroke-width:1.3}.accent{fill:none;stroke:var(--green);stroke-width:1.6}.action{fill:none;stroke:var(--green);stroke-width:1.5}.hatch{fill:url(#hatch);stroke:var(--ink);stroke-width:1.1}</style>\n' +
    '<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#00855b" stroke-width="1.3"/></marker><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-2 2L2 -2M0 7L7 0M5 9L9 5" stroke="#a6aca3" stroke-width=".7"/></pattern></defs>\n<rect width="560" height="' +
    height +
    '" fill="#fff"/>\n' +
    b +
    '\n</svg>\n'
  );
}
const P = (u, v, z = 0) => [70 + u * 100 + v * 45, 260 + v * 45 - u * 8 - z];
const panel = (u, v, z, c) =>
  polygon(
    [
      P(u + 0.06, v + 0.06, z),
      P(u + 0.94, v + 0.06, z),
      P(u + 0.94, v + 0.94, z),
      P(u + 0.06, v + 0.94, z),
    ],
    c,
  );
function chute(mobile) {
  let b = text(328, 40, 'Renewable panel') + path('M411 49V133L353 184', 'leader');
  b += polygon([P(0, 0, 100), P(3, 0, 100), P(3, 0), P(0, 0)], 'existing');
  b += polygon([P(3, 0, 100), P(3, 2, 100), P(3, 2), P(3, 0)], 'existing');
  b += polygon([P(0, 0), P(3, 0), P(3, 2), P(0, 2)], 'paper');
  b += polygon([P(0, 2), P(3, 2), P(3, 2, -12), P(0, 2, -12)], 'existing');
  for (let u = 0; u < 3; u++)
    for (let v = 0; v < 2; v++) b += panel(u, v, 8, u === 1 && v === 1 ? 'ghost' : 'existing');
  for (const [u, v] of [
    [1.2, 1.2],
    [1.8, 1.8],
  ]) {
    const [x, y] = P(u, v, 8),
      [, yy] = P(u, v, 128);
    b += path('M' + x + ' ' + y + 'V' + yy, 'ghost');
  }
  b += panel(1, 1, 128, 'highlight');
  for (const [u, v] of [
    [1.2, 1.2],
    [1.8, 1.2],
    [1.8, 1.8],
    [1.2, 1.8],
  ]) {
    const [x, y] = P(u, v, 128);
    b += ellipse(x, y, 4, 2.5, 'paper');
  }
  b += arrow('M288 285V218');
  b += path('M159 355L102 389H40', 'leader') + text(40, 417, 'Retained structural shell');
  const d = mobile ? 35 : 0;
  b += text(40, 471 + d, 'Section at a fastener');
  b += rect(292, 457 + d, 196, 14, 'highlight') + rect(292, 474 + d, 196, 14);
  b += polygon(
    [
      [383, 457 + d],
      [397, 457 + d],
      [393, 464 + d],
      [387, 464 + d],
    ],
    'paper',
  );
  b += path('M387 ' + (464 + d) + 'v45h6v-45', 'line') + rect(382, 493 + d, 16, 10, 'paper');
  b += text(292, 440 + d, 'Liner') + path('M320 ' + (446 + d) + 'V' + (455 + d), 'leader');
  b +=
    path('M488 ' + (482 + d) + 'H522V' + (530 + d), 'leader') + text(522, 555 + d, 'Shell', 'end');
  b +=
    path('M390 ' + (510 + d) + 'V' + (547 + d), 'leader') +
    text(390, 582 + d, 'Accessible nut', 'middle');
  b += text(40, 631 + d, 'One panel renews; the shell remains');
  return svg(
    'Place the wear boundary in a renewable chute liner',
    'An original axonometric chute fragment shows six liner positions and a retained shell. One green panel is lifted clear of its seat and fastening points. The arrow means removal. A separate schematic section shows the liner, supporting shell, and an accessible retaining nut. Panel sizing, fastening detail, and capacity are not specified.',
    mobile ? 705 : 670,
    b,
    mobile,
  );
}
function sleeve(mobile) {
  let b = text(40, 35, 'Stationary packing') + path('M208 44V124L247 183', 'leader');
  b += rect(205, 148, 157, 32) + rect(205, 302, 157, 32);
  b += path('M205 148V201M362 148V201M205 282V334M362 282V334', 'line');
  b += rect(40, 225, 480, 32, 'existing');
  b += rect(175, 208, 190, 17, 'highlight') + rect(175, 257, 190, 17, 'highlight');
  for (const x of [226, 253, 280]) {
    b += rect(x, 185, 21, 23, 'hatch') + rect(x, 274, 21, 23, 'hatch');
  }
  b += rect(366, 218, 13, 48, 'paper') + path('M370 222v40M375 222v40', 'fine');
  b += path('M25 241H535', 'center');
  b += text(395, 87, 'Wear surface') + path('M448 98V196L296 208', 'leader');
  b += text(40, 369, 'Shaft and sleeve rotate together');
  const d = mobile ? 45 : 0;
  b += text(40, 424 + d, 'Separated component view');
  b += rect(45, 475 + d, 249, 25, 'existing') + path('M45 ' + (487.5 + d) + 'H520', 'center');
  b += rect(351, 457 + d, 144, 61, 'highlight') + ellipse(495, 487.5 + d, 10, 30.5, 'highlight');
  b += ellipse(351, 487.5 + d, 10, 30.5, 'highlight') + ellipse(351, 487.5 + d, 5, 12.5, 'paper');
  b += path('M351 ' + (475 + d) + 'H491M351 ' + (500 + d) + 'H491', 'fine');
  b += text(45, 558 + d, 'Retained shaft') + text(430, 558 + d, 'Renewable sleeve', 'middle');
  b += text(40, 618 + d, 'Fits, seals and retention require design');
  return svg(
    'Put the packing-contact surface on a separate sleeve',
    'A schematic longitudinal section shows stationary packing rings around a green sleeve fitted to a retained shaft. The shaft and sleeve rotate together. A lower separated view identifies the renewable sleeve and the retained core; it does not specify a removal sequence. Retention, sealing, fits, and full pump geometry are application-specific.',
    mobile ? 710 : 665,
    b,
    mobile,
  );
}
const insertWidth = 180,
  scale = 0.6;
function accessView(cx, top, opening, blocked) {
  const half = 110,
    bottom = top + 165,
    slot = opening * scale,
    insert = insertWidth * scale;
  let b = path(
    'M' + (cx - half) + ' ' + bottom + 'V' + top + 'H' + (cx + half) + 'V' + bottom,
    'line',
  );
  b += path(
    'M' +
      (cx - half) +
      ' ' +
      bottom +
      'H' +
      (cx - slot / 2) +
      'M' +
      (cx + slot / 2) +
      ' ' +
      bottom +
      'H' +
      (cx + half),
    'heavy',
  );
  b += path(
    'M' +
      (cx - insert / 2) +
      ' ' +
      (top + 25) +
      'V' +
      (bottom + 10) +
      'M' +
      (cx + insert / 2) +
      ' ' +
      (top + 25) +
      'V' +
      (bottom + 10),
    'fine',
  );
  if (blocked) {
    b += rect(cx - insert / 2, bottom - 70, insert, 70, 'highlight');
    b += arrow('M' + cx + ' ' + (top + 15) + 'V' + (bottom - 78));
    for (const x of [cx - 46, cx + 46])
      b += path(
        'M' + (x - 5) + ' ' + (bottom - 5) + 'l10 10M' + (x - 5) + ' ' + (bottom + 5) + 'l10 -10',
        'heavy',
      );
  } else {
    b += rect(cx - insert / 2, top + 50, insert, 70, 'ghost');
    b += arrow('M' + cx + ' ' + (top + 127) + 'V' + (bottom + 25));
    b += rect(cx - insert / 2, bottom + 38, insert, 70, 'highlight');
  }
  return b;
}
function access(mobile) {
  const top = mobile ? 163 : 145,
    bottom = top + 165;
  let b = text(280, 38, 'Same rigid 180 mm insert', 'middle');
  b += text(150, 99, 'Trapped', 'middle') + text(410, 99, 'Clear route', 'middle');
  b += accessView(150, top, 120, true) + accessView(410, top, 220, false);
  b += text(150, bottom + 148, 'Opening', 'middle') + text(410, bottom + 148, 'Opening', 'middle');
  b += text(150, bottom + 180, '120 mm', 'middle') + text(410, bottom + 180, '220 mm', 'middle');
  b += text(280, bottom + 238, 'Guides prevent rotation', 'middle');
  b += text(280, bottom + 273, '40 mm total clearance at right', 'middle');
  return svg(
    'A renewable insert needs a complete extraction route',
    'Two matched schematic plans retain a rigid 180 mm-wide insert and guides that require straight withdrawal. A 120 mm opening blocks its shoulders, marked by crosses. With a 220 mm opening the same insert is shown displaced along the withdrawal path, leaving 40 mm total nominal width clearance. No structural capacity or handling allowance is calculated.',
    mobile ? 640 : 620,
    b,
    mobile,
  );
}
const drawings = [
  ['wear-units-chute-liners', chute, 670, 705],
  ['wear-units-shaft-sleeve', sleeve, 665, 710],
  ['wear-units-removal-route', access, 620, 640],
];
for (const [name, draw] of drawings)
  for (const mobile of [false, true])
    await writeFile(output + name + (mobile ? '-mobile' : '') + '.svg', draw(mobile));
const manifestPath = fileURLToPath(new URL('../content/assets/manifest.json', import.meta.url));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
for (const [name, , desktop, phone] of drawings) {
  manifest['engineering/' + name + '.svg'] = { width: 560, height: desktop };
  manifest['engineering/' + name + '-mobile.svg'] = { width: 560, height: phone };
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Wrote three wear-unit figures, three phone companions, and asset dimensions.');
