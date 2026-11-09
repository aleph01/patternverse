import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../content/assets/engineering/', import.meta.url));
await mkdir(output, { recursive: true });
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, anchor = 'start', cls = '') =>
  '<text x="' +
  x +
  '" y="' +
  y +
  '" text-anchor="' +
  anchor +
  '" class="' +
  cls +
  '">' +
  escape(value) +
  '</text>';
const path = (d, cls = 'line') => '<path d="' + d + '" class="' + cls + '"/>';
const rect = (x, y, w, h, cls = 'existing', r = 0) =>
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
  cls +
  '"/>';
const ellipse = (cx, cy, rx, ry, cls = 'existing') =>
  '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" class="' + cls + '"/>';
const arrow = (d) => '<path d="' + d + '" class="action" marker-end="url(#arrow)"/>';
const dot = (x, y) => '<circle cx="' + x + '" cy="' + y + '" r="3" class="solid"/>';
function svg(title, desc, height, body, mobile = false) {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="' +
    height +
    '" viewBox="0 0 560 ' +
    height +
    '" role="img" aria-labelledby="title desc" data-engineering-style="light-editorial">\n<title id="title">' +
    escape(title) +
    '</title>\n<desc id="desc">' +
    escape(desc) +
    '</desc>\n' +
    '<style>:root{color-scheme:only light;--paper:#ffffff;--ink:#252c28;--line:#a6aca3;--stone:#f1f2ef;--mint:#edf5f0;--green:#00855b}svg{background:var(--paper);color:var(--ink)}path,rect,circle,ellipse,line{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:butt}text{fill:var(--ink);font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:' +
    (mobile ? '21.777778' : '20.222222') +
    'px;font-weight:400}.paper{fill:var(--paper);stroke:var(--ink);stroke-width:1.3}.existing{fill:var(--stone);stroke:var(--line);stroke-width:1.1}.line{fill:none;stroke:var(--ink);stroke-width:1.3}.heavy{fill:none;stroke:var(--ink);stroke-width:1.8}.fine,.leader{fill:none;stroke:var(--line);stroke-width:1.1}.ghost{fill:none;stroke:var(--line);stroke-width:1.1;stroke-dasharray:5 4}.highlight{fill:var(--mint);stroke:var(--green);stroke-width:1.3}.accent{fill:var(--green);stroke:var(--green);stroke-width:1.1}.action{fill:none;stroke:var(--green);stroke-width:1.5}.solid{fill:var(--ink);stroke:none}.gasket{fill:none;stroke:var(--green);stroke-width:2.6}.center{fill:none;stroke:var(--line);stroke-width:1;stroke-dasharray:8 4 2 4}</style>\n' +
    '<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#00855b" stroke-width="1.3"/></marker></defs>\n<rect width="560" height="' +
    height +
    '" fill="#ffffff"/>\n' +
    body +
    '\n</svg>\n'
  );
}
function cartridge(x, y, selected = false) {
  const cls = selected ? 'highlight' : 'existing';
  let b =
    rect(x - 16, y, 32, 126, cls) +
    ellipse(x, y + 126, 16, 6, cls) +
    ellipse(x, y, 16, 6, selected ? 'accent' : 'paper');
  for (let dx = -9; dx <= 9; dx += 6)
    b += path('M' + (x + dx) + ' ' + (y + 7) + 'v110', selected ? 'action' : 'fine');
  return b;
}
function filter(mobile) {
  const dy = mobile ? 35 : 0;
  let b = text(40, 35, 'Cover removed') + path('M126 42V59H155', 'leader');
  b +=
    ellipse(180, 90, 135, 22, 'existing') +
    ellipse(180, 84, 135, 22, 'paper') +
    path('M162 64V49H198V64', 'line');
  b += text(365, 35, 'Clear lift path') + path('M410 48V120', 'leader');
  b += path('M130 ' + (272 + dy) + 'V448Q130 477 280 477Q430 477 430 448V' + (272 + dy), 'paper');
  b += ellipse(280, 272 + dy, 150, 28, 'paper');
  b += rect(100, 335, 30, 27) + rect(430, 380, 30, 27);
  b += path('M155 464V492H197V473M364 473V492H405V464', 'line');
  for (const x of [180, 242, 304]) b += cartridge(x, 294 + dy);
  b += rect(350, 294 + dy, 32, 126, 'ghost') + ellipse(366, 294 + dy, 16, 6, 'ghost');
  b += cartridge(366, 139 + dy, true);
  b += arrow('M410 ' + (365 + dy) + 'V' + (151 + dy));
  b += path('M145 ' + (300 + dy) + 'V444Q280 472 415 444V' + (300 + dy), 'ghost');
  b += path('M130 424H26V501', 'leader') + text(40, 520, 'Retained housing');
  b += text(40, mobile ? 570 : 555, '1 cartridge exchanged; 3 remain');
  b += text(40, mobile ? 605 : 585, 'Shared housing out of service');
  return svg(
    'Choose the cartridge as the replacement unit',
    'An opened cutaway housing retains three cartridges. A green fourth cartridge is lifted along its axis into clear space above. The cover is displaced to the left. The arrow shows extraction, not gas flow. This is an isolated, depressurized service state; geometry is schematic.',
    mobile ? 640 : 615,
    b,
    mobile,
  );
}
function conveyor(selected = false) {
  const c = selected ? 'highlight' : 'existing';
  let b = rect(0, 0, 140, 64, c, 8) + rect(10, 10, 120, 42, 'paper', 17);
  b +=
    ellipse(25, 31, 10, 20, selected ? 'highlight' : 'existing') +
    ellipse(115, 31, 10, 20, selected ? 'highlight' : 'existing');
  b += path('M25 11H115M25 51H115', 'fine');
  for (const x of [7, 120]) b += rect(x, -8, 13, 8, 'paper') + rect(x, 64, 13, 8, 'paper');
  b += rect(105, 68, 24, 20, c, 3) + rect(129, 73, 9, 10, 'paper');
  return b;
}
function conveyorFigure(mobile) {
  let b = '';
  if (!mobile) {
    b += text(40, 40, 'Three service sections');
    b +=
      path('M40 78H520M40 72V84M520 72V84', 'fine') + text(280, 67, 'Nominal 9 m route', 'middle');
    b += '<g transform="translate(40 150)">' + conveyor() + '</g>';
    b += '<g transform="translate(380 150)">' + conveyor() + '</g>';
    b += rect(210, 150, 140, 64, 'ghost', 8);
    b += path('M195 149V110H365V149', 'leader') + text(280, 102, 'Two product transfers', 'middle');
    b += text(110, 268, 'Section 1', 'middle') + text(450, 268, 'Section 3', 'middle');
    b += arrow('M280 233V350') + text(310, 316, 'Removal');
    b += '<g transform="translate(210 380)">' + conveyor(true) + '</g>';
    b += text(280, 495, 'Section 2: own belt and drive', 'middle');
    b += text(40, 545, 'Outer sections retain their supports');
  } else {
    b += text(40, 38, 'Three service sections');
    b += '<g transform="translate(210 82) rotate(90)">' + conveyor() + '</g>';
    b += '<g transform="translate(210 418) rotate(90)">' + conveyor() + '</g>';
    b += rect(146, 250, 64, 140, 'ghost', 8);
    b += '<g transform="translate(424 250) rotate(90)">' + conveyor(true) + '</g>';
    b += path('M112 82V558M106 82H118M106 558H118', 'fine');
    b += text(42, 294, '9 m') + text(42, 325, 'route');
    b += text(260, 131, 'Section 1') + text(260, 481, 'Section 3');
    b += arrow('M231 320H343') + text(286, 298, 'Removal', 'middle');
    b += text(392, 226, 'Section 2', 'middle');
    b += text(40, 610, 'One belt and drive per section');
    b += text(40, 647, 'Nominal dimensions; line stopped');
  }
  return svg(
    'Divide the conveyor around a complete service task',
    'A straight nine-metre illustrative route has three nominal three-metre service sections. The middle section is moved into a side aisle with its own belt and drive. The outer sections remain supported. Two transfer boundaries require coordination. The only arrow shows removal direction.',
    mobile ? 675 : 575,
    b,
    mobile,
  );
}
function vessel(y, segmented) {
  let b = rect(62, y, 432, 74, 'paper', 37);
  b += path('M52 ' + (y + 37) + 'H507', 'center');
  if (segmented) {
    for (const x of [175, 278, 381]) {
      b += rect(x - 12, y - 10, 10, 94) + rect(x + 2, y - 10, 10, 94);
      b += path('M' + x + ' ' + (y - 9) + 'V' + (y + 83), 'gasket');
      for (const yy of [y + 6, y + 60]) b += path('M' + (x - 18) + ' ' + yy + 'h36', 'line');
    }
  }
  return b;
}
function vesselFigure(mobile) {
  const dy = mobile ? 25 : 0;
  let b = text(40, 38, 'Continuous shell') + vessel(67, false);
  b += text(40, 208 + dy, 'Four shell sections') + vessel(237 + dy, true);
  b += text(280, 356 + dy, '3 added circumferential joints', 'middle');
  b += path('M381 ' + (326 + dy) + 'H520V' + (382 + dy) + 'H342L327 ' + (400 + dy), 'leader');
  b +=
    rect(276, 400 + dy, 22, 100) +
    rect(305, 400 + dy, 22, 100) +
    path('M301.5 ' + (400 + dy) + 'v100', 'gasket');
  for (const y of [419 + dy, 480 + dy]) {
    b += path('M248 ' + (y + 6) + 'H355', 'heavy');
    b += rect(247, y, 12, 12, 'paper') + rect(342, y, 12, 12, 'paper');
  }
  b += text(40, 432 + dy, 'Clamping bolts') + path('M192 ' + (426 + dy) + 'H240', 'leader');
  b +=
    text(400, 480 + dy, 'Gasket') +
    path('M392 ' + (474 + dy) + 'L334 ' + (452 + dy) + 'H305', 'leader');
  b += text(40, 548 + dy, 'Joint detail is schematic');
  return svg(
    'More divisions also mean more interfaces',
    'A continuous vessel shell and a four-section alternative show the same required process envelope. Three additional flange pairs are highlighted in the divided shell. A magnified schematic joint identifies the gasket and clamping bolts. Existing closures and nozzles are omitted from both comparisons; no pressure rating is calculated.',
    mobile ? 610 : 580,
    b,
    mobile,
  );
}
for (const [name, draw] of [
  ['segmentation-filter-bank', filter],
  ['segmentation-conveyor', conveyorFigure],
  ['segmentation-vessel-joints', vesselFigure],
]) {
  for (const mobile of [false, true]) {
    await writeFile(output + name + (mobile ? '-mobile' : '') + '.svg', draw(mobile));
  }
}
const manifestPath = fileURLToPath(new URL('../content/assets/manifest.json', import.meta.url));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
for (const [name, desktopHeight, phoneHeight] of [
  ['segmentation-filter-bank', 615, 640],
  ['segmentation-conveyor', 575, 675],
  ['segmentation-vessel-joints', 580, 610],
]) {
  manifest['engineering/' + name + '.svg'] = { width: 560, height: desktopHeight };
  manifest['engineering/' + name + '-mobile.svg'] = { width: 560, height: phoneHeight };
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Wrote 3 original Engineering diagrams, 3 phone companions, and their asset dimensions.',
);
