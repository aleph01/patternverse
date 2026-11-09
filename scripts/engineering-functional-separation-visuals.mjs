import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../content/assets/engineering/', import.meta.url));
await mkdir(output, { recursive: true });
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, s, a = 'start') =>
  `<text x="${x}" y="${y}" text-anchor="${a}">${esc(s)}</text>`;
const path = (d, c = 'line') => `<path d="${d}" class="${c}"/>`;
const rect = (x, y, w, h, c = 'existing') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${c}"/>`;
const circle = (x, y, r, c = 'paper') => `<circle cx="${x}" cy="${y}" r="${r}" class="${c}"/>`;
const arrow = (d) => `<path d="${d}" class="action" marker-end="url(#arrow)"/>`;
function svg(title, desc, h, body, mobile) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="${h}" viewBox="0 0 560 ${h}" role="img" aria-labelledby="title desc" data-engineering-style="light-editorial">
<title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc>
<style>:root{color-scheme:only light;--ink:#252c28;--line:#a6aca3;--stone:#f1f2ef;--mint:#edf5f0;--green:#00855b}svg{background:#fff;color:var(--ink)}path,rect,circle{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:butt}text{fill:var(--ink);font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:${mobile ? '21.777778' : '20.222222'}px;font-weight:400}.paper{fill:#fff;stroke:var(--ink);stroke-width:1.3}.existing{fill:var(--stone);stroke:var(--line);stroke-width:1.1}.line{fill:none;stroke:var(--ink);stroke-width:1.3}.fine,.leader{fill:none;stroke:var(--line);stroke-width:1.1}.ghost{fill:none;stroke:var(--line);stroke-width:1.1;stroke-dasharray:5 4}.highlight{fill:var(--mint);stroke:var(--green);stroke-width:1.3}.accent{fill:none;stroke:var(--green);stroke-width:1.6}.action{fill:none;stroke:var(--green);stroke-width:1.5}.slow{fill:none;stroke:var(--ink);stroke-width:1.6;stroke-dasharray:7 4}.hatch{fill:url(#hatch);stroke:var(--ink);stroke-width:1.1}</style>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#00855b" stroke-width="1.3"/></marker><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-2 2L2 -2M0 7L7 0M5 9L9 5" stroke="#a6aca3" stroke-width=".7"/></pattern></defs>
<rect width="560" height="${h}" fill="#fff"/>
${body}
</svg>\n`;
}

function pump(mobile) {
  const d = mobile ? 35 : 0;
  let b = text(45, 42, 'Fluid handling') + text(355, 42, 'Bearing') + text(355, 72, 'lubrication');
  b += path(`M109 54V${155 + d}`, 'leader') + path(`M424 84V${190 + d}`, 'leader');
  b += text(255, 117 + d, 'Shaft seal', 'middle') + path(`M255 ${128 + d}V${229 + d}`, 'leader');
  // Longitudinal cutaway: the casing wall and bearing housing are distinct.
  b += `<g transform="translate(0 ${d})">`;
  b += path(
    'M48 236H82Q82 175 142 175H160V122H198V175Q241 187 253 222V303Q242 350 192 353H142Q82 350 82 286H48Z',
    'existing',
  );
  b += path(
    'M48 247H94Q95 188 145 188H171V122H187V187Q228 196 240 227V299Q225 338 190 339H145Q96 337 94 275H48Z',
    'highlight',
  );
  // Impeller is schematic: hub, back plate, and two vanes visible in section.
  b += rect(174, 216, 11, 92, 'hatch') + rect(146, 251, 39, 24, 'paper');
  b += path('M148 251Q151 229 174 224M148 275Q151 297 174 300', 'line');
  b += rect(185, 257, 343, 12, 'paper');
  // The process seal is at the casing penetration, not the bearing enclosure.
  b += rect(239, 235, 8, 22, 'highlight') + rect(249, 239, 9, 18, 'hatch');
  b += rect(239, 269, 8, 22, 'highlight') + rect(249, 269, 9, 18, 'hatch');
  b += path('M261 232H277V294H261', 'line');
  b += rect(326, 201, 192, 128, 'existing') + rect(338, 216, 168, 99, 'paper');
  b += rect(339, 299, 166, 15, 'highlight');
  for (const x of [355, 469]) {
    b += rect(x, 229, 23, 28, 'hatch') + rect(x, 269, 23, 28, 'hatch');
    b += circle(x + 11.5, 243, 5) + circle(x + 11.5, 283, 5);
  }
  // Restore the continuous shaft over the interior housing fill.
  b += rect(278, 257, 250, 12, 'paper');
  for (const x of [329, 510]) b += path(`M${x} 249V257M${x} 269V277`, 'line');
  b += path('M348 329V350H386V329M456 329V350H494V329M319 351H528', 'line');
  b += arrow('M26 261H122') + arrow('M129 228Q131 206 178 203V137');
  b += '</g>';
  b += text(40, 419 + d, 'Impeller') + path(`M91 ${395 + d}L167 ${302 + d}`, 'leader');
  b += text(474, 419 + d, 'Shaft', 'middle') + path(`M474 ${395 + d}V${272 + d}`, 'leader');
  b += text(280, 479 + d, 'Separate housings; continuous shaft', 'middle');
  b += text(280, 515 + d, 'Intervening space is shown schematically', 'middle');
  b += arrow(`M42 ${561 + d}H85`) + text(100, 568 + d, 'Arrows: process-fluid flow');
  b += text(40, 609 + d, 'Section · not to scale');
  return svg(
    'Different jobs occupy different pump regions',
    'An original longitudinal schematic separates a wetted impeller chamber, a shaft seal at the casing penetration, an intervening space, and a lubricated bearing housing. The shaft continues through all regions. Two housing seals, bearing supports, and an oil region are shown schematically. Green arrows show process-fluid flow; no leakage performance is calculated.',
    640 + d,
    b,
    mobile,
  );
}

function reference(y) {
  let b = rect(85, y, 185, 11, 'paper');
  b += path(`M97 ${y + 11}l-10 22h20ZM248 ${y + 11}l-10 16h20Z`, 'line');
  b += circle(244, y + 31, 3) + circle(252, y + 31, 3);
  b += path(`M70 ${y + 36}H295`, 'fine');
  b += rect(272, y - 7, 16, 24, 'existing');
  return b;
}
function powerStage(x, y) {
  let b = rect(x, y, 58, 65, 'highlight');
  for (const dx of [10, 20, 30, 40, 50]) b += path(`M${x + dx} ${y + 8}V${y + 38}`, 'line');
  b += circle(x + 15, y + 52, 3) + circle(x + 43, y + 52, 3);
  return b;
}
function thermal(mobile) {
  const d = mobile ? 60 : 0;
  let b = text(40, 42, 'Power stage inside');
  b += rect(40, 85, 320, 220, 'paper') + reference(225) + powerStage(291, 155);
  b += text(60, 129, 'Measurement') + text(60, 157, 'enclosure');
  b += text(60, 292, 'Reference · same geometry');
  b += path('M288 233H318V220', 'line');
  b += arrow('M302 151Q270 183 201 216') + arrow('M331 151V105');
  b += text(385, 185, 'Power') + text(385, 215, 'stage') + path('M378 200H349', 'leader');
  const y = 435 + d;
  b += text(40, y - 43, 'Power stage outside');
  b += rect(40, y, 320, 220, 'paper') + reference(y + 140);
  b += text(60, y + 44, 'Measurement') + text(60, y + 72, 'enclosure');
  b += text(60, y + 207, 'Reference · same geometry');
  b += rect(434, y + 48, 89, 105, 'existing') + powerStage(449, y + 68);
  b += path(`M288 ${y + 148}H404V${y + 130}H449`, 'line');
  b += arrow(`M477 ${y + 43}V${y - 8}`);
  b += text(414, y - 21, 'Heat out', 'middle');
  b += text(415, y + 201, 'Cable', 'middle') + path(`M415 ${y + 177}L405 ${y + 148}`, 'leader');
  b += text(40, y + 275, 'Arrows: qualitative heat paths');
  b += text(40, y + 311, 'Matched schematic sections · not to scale');
  return svg(
    'Move the heat-generating job outside the reference enclosure',
    'Two sections retain the same measurement enclosure, reference bar, supports, and sensing head. The top power stage is inside; arrows indicate potential heat paths toward the reference and enclosure. Below, the same stage sits in a separate cabinet with an external heat-rejection path and a cable to the head. No temperature field or heat-flux calculation is depicted.',
    780 + d,
    b,
    mobile,
  );
}

function cable(mobile) {
  const d = mobile ? 35 : 0;
  let b = text(40, 42, 'Passive sensor–cable model');
  b +=
    text(80, 95, 'Sensor', 'middle') +
    text(210, 109, '100 kΩ', 'middle') +
    text(459, 109, 'Receiver', 'middle');
  b += circle(80, 190, 24) + path('M73 181H87M80 174V188M73 201H87', 'line');
  b +=
    path('M80 166V150H160M260 150H477M80 214V285H477', 'line') + rect(160, 142, 100, 16, 'paper');
  b += circle(477, 150, 4) + circle(477, 285, 4) + circle(363, 150, 2, 'existing');
  b += path('M363 150V220M343 220H383M343 232H383M363 232V285', 'line');
  b += text(402, 213, 'Cable') + text(402, 244, 'capacitance');
  b += text(280, 333, 'Assume 100 pF per metre', 'middle');
  const top = 465 + d,
    left = 85,
    width = 410,
    height = 200;
  b += path(`M40 ${378 + d}H70`, 'accent') + text(85, 385 + d, '2 m · 46 μs to 90%');
  b += path(`M40 ${413 + d}H70`, 'slow') + text(85, 420 + d, '20 m · 461 μs to 90%');
  b += text(85, top - 15, 'Received fraction of step');
  b += path(`M${left} ${top}V${top + height}H${left + width}`, 'line');
  b += path(`M${left} ${top + 20}H${left + width}`, 'ghost');
  for (const [v, label] of [
    [0, '0'],
    [0.5, '0.5'],
    [1, '1'],
  ]) {
    const y = top + (1 - v) * height;
    b += path(`M${left - 5} ${y}H${left}`, 'fine');
    b += text(left - 13, y + (v === 1 ? -3 : 6), label, 'end');
  }
  for (const t of [0, 500, 1000]) {
    const x = left + (t / 1000) * width;
    b += path(`M${x} ${top + height}v6`, 'fine') + text(x, top + height + 32, t, 'middle');
  }
  for (const [metres, cls] of [
    [2, 'accent'],
    [20, 'slow'],
  ]) {
    const capacitance = metres * 100e-12;
    const tauSeconds = 100e3 * capacitance;
    const points = [];
    for (let t = 0; t <= 1000; t += 2) {
      const fraction = 1 - Math.exp(-(t * 1e-6) / tauSeconds);
      points.push(
        `${t === 0 ? 'M' : 'L'}${(left + (t / 1000) * width).toFixed(3)} ${(top + (1 - fraction) * height).toFixed(3)}`,
      );
    }
    b += `<path data-cable-metres="${metres}" data-tau-seconds="${tauSeconds}" d="${points.join('')}" class="${cls}"/>`;
    const t90 = Math.log(10) * tauSeconds * 1e6;
    b += circle(left + (t90 / 1000) * width, top + 20, 3, 'paper');
  }
  b += text(280, top + height + 73, 'Time after step (μs)', 'middle');
  return svg(
    'Longer cable slows a high-impedance passive signal',
    'A 100 kilo-ohm source resistance drives a high-input-resistance receiver with cable capacitance lumped from signal to return. Assumed capacitance is 100 picofarads per metre. Computed 2 metre and 20 metre step responses have time constants 20 and 200 microseconds. Solid and dashed curves reach 90 percent at 46.05 and 460.52 microseconds. The plot is a passive settling model, not a noise, transmission-line, or active-driver stability simulation.',
    760 + d,
    b,
    mobile,
  );
}

const drawings = [
  ['functional-separation-pump', pump, 640, 675],
  ['functional-separation-thermal-layout', thermal, 780, 840],
  ['functional-separation-cable', cable, 760, 795],
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
console.log(
  'Wrote three functional-separation figures, three phone companions, and asset dimensions.',
);
