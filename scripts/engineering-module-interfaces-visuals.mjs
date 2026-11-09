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
const ellipse = (x, y, rx, ry, c = 'existing') =>
  '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" class="' + c + '"/>';
const circle = (x, y, r, c = 'paper') =>
  '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" class="' + c + '"/>';
const svg = (title, desc, height, b, mobile) =>
  '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="' +
  height +
  '" viewBox="0 0 560 ' +
  height +
  '" role="img" aria-labelledby="title desc" data-engineering-style="light-editorial">\n<title id="title">' +
  esc(title) +
  '</title><desc id="desc">' +
  esc(desc) +
  '</desc>\n' +
  '<style>:root{color-scheme:only light;--paper:#ffffff;--ink:#252c28;--line:#a6aca3;--stone:#f1f2ef;--mint:#edf5f0;--green:#00855b}svg{background:var(--paper);color:var(--ink)}path,rect,ellipse,circle{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:butt}text{fill:var(--ink);font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:' +
  (mobile ? '21.777778' : '20.222222') +
  'px;font-weight:400}.paper{fill:#fff;stroke:var(--ink);stroke-width:1.3}.existing{fill:var(--stone);stroke:var(--line);stroke-width:1.1}.line{fill:none;stroke:var(--ink);stroke-width:1.3}.fine,.leader{fill:none;stroke:var(--line);stroke-width:1.1}.center{fill:none;stroke:var(--line);stroke-width:1;stroke-dasharray:8 4 2 4}.envelope{fill:var(--mint);fill-opacity:.45;stroke:var(--green);stroke-width:1.1;stroke-dasharray:5 4}.highlight{fill:var(--mint);stroke:var(--green);stroke-width:1.3}.accent{fill:none;stroke:var(--green);stroke-width:1.6}.point{fill:#fff;stroke:var(--green);stroke-width:1.5}.reference{fill:none;stroke:var(--ink);stroke-width:1.3;stroke-dasharray:5 3}.solid{fill:var(--ink);stroke:none}</style>\n<rect width="560" height="' +
  height +
  '" fill="#ffffff"/>\n' +
  b +
  '\n</svg>\n';

function flangeFace(x, y) {
  let b = circle(x, y, 48, 'existing') + circle(x, y, 25, 'paper');
  for (const [dx, dy] of [
    [0, -35],
    [35, 0],
    [0, 35],
    [-35, 0],
  ])
    b += circle(x + dx, y + dy, 5, 'paper');
  return b;
}
function valve(mobile) {
  let b = text(40, 35, 'Retained pipe') + path('M129 42V172L106 205', 'leader');
  b += rect(205, 112, 150, 228, 'envelope') + text(280, 91, 'Reserved envelope', 'middle');
  b += rect(32, 239, 70, 32) + rect(458, 239, 70, 32);
  b += ellipse(100, 255, 12, 48, 'paper') + ellipse(460, 255, 12, 48, 'paper');
  b += ellipse(155, 255, 4, 42, 'highlight') + ellipse(405, 255, 4, 42, 'highlight');
  b += path('M210 234H240L251 217H309L320 234H350V276H320L309 293H251L240 276H210Z', 'existing');
  b +=
    rect(275, 174, 10, 43, 'paper') +
    rect(249, 149, 62, 25, 'paper') +
    path('M240 149H339', 'line');
  b += ellipse(210, 255, 12, 48, 'paper') + ellipse(350, 255, 12, 48, 'paper');
  for (const x of [100, 210, 350, 460]) {
    b += ellipse(x, 222, 3, 5, 'paper') + ellipse(x, 288, 3, 5, 'paper');
  }
  b += path('M24 255H536', 'center');
  b += text(421, 347, 'Axis') + path('M462 338H494V265', 'leader');
  b += text(395, 173, 'Gasket') + path('M416 182V198L406 212', 'leader');
  b += path('M210 311V380M350 311V380M210 374H350M210 367V381M350 367V381', 'fine');
  b += text(280, 405, '200 mm face-to-face', 'middle');
  if (mobile) {
    b += flangeFace(280, 498) + text(280, 574, 'Project mating pattern F1', 'middle');
    b +=
      text(280, 629, 'Installed gap', 'middle') + text(280, 665, '200 + 2 + 2 = 204 mm', 'middle');
    b += text(280, 715, '2 mm per compressed gasket', 'middle');
  } else {
    b += flangeFace(120, 505) + text(120, 584, 'Pattern F1', 'middle');
    b += text(240, 478, 'Installed gap') + text(240, 514, '200 + 2 + 2 = 204 mm');
    b += text(240, 556, '2 mm per gasket');
    b += text(40, 632, 'Project fixture; exploded gaps not to scale');
  }
  return svg(
    'Preserve the complete valve-station boundary',
    'An exploded station retains its pipe ends and shows gasket positions, matching mating faces, a common flow axis, and a reserved envelope for the valve and actuator. A separate face view identifies an illustrative four-hole project pattern. The nominal valve length is 200 mm, and two nominal 2 mm compressed gaskets require a 204 mm installed gap. This is not a standard flange drawing or pressure-equipment specification.',
    mobile ? 750 : 660,
    b,
    mobile,
  );
}
function head(x, variant) {
  let b = '';
  if (variant === 'A') {
    b += rect(x - 36, 160, 72, 110) + ellipse(x, 270, 36, 12) + ellipse(x, 160, 36, 12, 'paper');
    b += path('M' + (x - 21) + ' 197h42v40h-42zM' + (x - 12) + ' 217h24', 'fine');
  } else {
    b += path(
      'M' +
        (x - 45) +
        ' 184L' +
        (x - 28) +
        ' 151H' +
        (x + 28) +
        'L' +
        (x + 45) +
        ' 184V251L' +
        (x + 28) +
        ' 276H' +
        (x - 28) +
        'L' +
        (x - 45) +
        ' 251Z',
      'existing',
    );
    b +=
      circle(x, 215, 24, 'paper') +
      path('M' + (x - 16) + ' 212h32M' + (x - 16) + ' 218h32', 'fine');
  }
  b += rect(x - 50, 278, 100, 18, 'paper');
  for (const dx of [-35, 35]) b += circle(x + dx, 287, 4, 'paper');
  b += rect(x - 10, 296, 20, 26, 'paper') + rect(x - 10, 143, 20, 17, 'paper');
  b += circle(x, 125, 22, 'paper');
  for (const [dx, dy] of [
    [-7, -7],
    [7, -7],
    [-7, 7],
    [7, 7],
  ])
    b += circle(x + dx, 125 + dy, 2.5, 'solid');
  return b;
}
function connector(x, y) {
  let b = circle(x, y, 55, 'paper') + circle(x, y, 43, 'existing');
  b += path('M' + (x - 7) + ' ' + (y - 53) + 'v9h14v-9', 'line');
  for (const [dx, dy] of [
    [-19, -19],
    [19, -19],
    [-19, 19],
    [19, 19],
  ])
    b += circle(x + dx, y + dy, 4, 'paper');
  b +=
    text(x - 34, y - 20, '1', 'middle') +
    text(x + 34, y - 20, '2', 'middle') +
    text(x - 34, y + 27, '3', 'middle') +
    text(x + 34, y + 27, '4', 'middle');
  return b;
}
function sensor(mobile) {
  let b = text(135, 42, 'Head A', 'middle') + text(425, 42, 'Head B', 'middle');
  b += rect(70, 90, 130, 243, 'envelope') + rect(360, 90, 130, 243, 'envelope');
  b += head(135, 'A') + head(425, 'B');
  b += text(280, 369, 'Same mount and connector', 'middle');
  if (mobile) {
    b += connector(280, 469);
    b += text(90, 583, '1   Nominal +24 V DC') + text(90, 618, '2   Return');
    b += text(90, 653, '3   Sourced 4–20 mA') + text(90, 688, '4   Reserved; no connection');
    b +=
      text(280, 757, '4–20 mA = 0–100 kPa', 'middle') + text(280, 791, 'Gauge pressure', 'middle');
  } else {
    b += connector(125, 470);
    b += text(240, 420, '1   Nominal +24 V DC') + text(240, 455, '2   Return');
    b += text(240, 490, '3   Sourced 4–20 mA') + text(240, 525, '4   Reserved');
    b += text(125, 570, 'Project face', 'middle');
    b += text(40, 626, 'Both heads: 0–100 kPa gauge');
  }
  return svg(
    'Different heads preserve one connection contract',
    'Two schematic sensor heads with different constructions have matching mounting faces, envelopes, and connectors. A larger project-only connector face identifies supply, return, sourced current output, and a reserved unconnected contact. Both approved heads use the same 0 to 100 kPa gauge-pressure range represented by 4 to 20 mA. The contact layout is not an industry wiring standard.',
    mobile ? 825 : 655,
    b,
    mobile,
  );
}
function mapping(mobile) {
  const left = 88,
    right = 480,
    top = mobile ? 180 : 175,
    bottom = mobile ? 505 : 485;
  const px = (i) => left + ((i - 4) / 16) * (right - left);
  const py = (p) => bottom - (p / 1000) * (bottom - top);
  const current = 12,
    reported = ((current - 4) / 16) * 100,
    actual = ((current - 4) / 16) * 1000;
  let b = text(40, 35, 'Same current, different meaning');
  b += path('M40 74h20', 'accent') + text(70, 81, 'Head C: 0–1000 kPa');
  b += path('M40 109h20', 'reference') + text(70, 116, 'Receiver: 0–100 kPa');
  b += text(40, top - 30, 'kPa gauge');
  b += path('M' + left + ' ' + top + 'V' + bottom + 'H' + right, 'line');
  for (const p of [0, 500, 1000]) {
    const y = py(p);
    b +=
      path('M' + (left - 5) + ' ' + y + 'H' + right, 'fine') +
      text(left - 13, y + 6, String(p), 'end');
  }
  for (const i of [4, 12, 20]) {
    const x = px(i);
    b += path('M' + x + ' ' + bottom + 'v6', 'line') + text(x, bottom + 32, String(i), 'middle');
  }
  b += path('M' + left + ' ' + bottom + 'L' + right + ' ' + py(1000), 'accent');
  b += path('M' + left + ' ' + bottom + 'L' + right + ' ' + py(100), 'reference');
  b += path('M' + px(current) + ' ' + top + 'V' + bottom, 'center');
  b += circle(px(current), py(actual), 5, 'point') + circle(px(current), py(reported), 5, 'paper');
  b +=
    path('M' + (px(current) + 5) + ' ' + py(actual) + 'L309 ' + (py(actual) + 28), 'leader') +
    text(315, py(actual) + 36, actual + ' kPa');
  b +=
    path('M' + (px(current) + 5) + ' ' + py(reported) + 'L309 ' + (py(reported) - 20), 'leader') +
    text(315, py(reported) - 25, reported + ' kPa');
  b += text(284, bottom + 72, 'Current (mA)', 'middle');
  b += text(40, bottom + 119, '12 mA lies within both current ranges');
  return svg(
    'A valid current can carry the wrong pressure meaning',
    'Two linear teaching mappings share a current axis from 4 to 20 mA and a pressure axis from 0 to 1000 kPa gauge. At 12 mA, Head C represents 500 kPa but the unchanged receiver reports 50 kPa. The solid green and dashed ink lines distinguish the two mappings without relying on color. No measurement noise, device accuracy, or fault-detection performance is modeled.',
    mobile ? 660 : 640,
    b,
    mobile,
  );
}
const drawings = [
  ['module-interfaces-valve', valve, 660, 750],
  ['module-interfaces-sensor-heads', sensor, 655, 825],
  ['module-interfaces-signal-meaning', mapping, 640, 660],
];
for (const [name, draw] of drawings) {
  for (const mobile of [false, true])
    await writeFile(output + name + (mobile ? '-mobile' : '') + '.svg', draw(mobile));
}
const manifestPath = fileURLToPath(new URL('../content/assets/manifest.json', import.meta.url));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
for (const [name, , desktop, phone] of drawings) {
  manifest['engineering/' + name + '.svg'] = { width: 560, height: desktop };
  manifest['engineering/' + name + '-mobile.svg'] = { width: 560, height: phone };
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Wrote 3 module-interface figures, 3 phone companions, and their dimensions.');
