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

const leafFixture = {
  lengthMm: 30,
  thicknessMm: 0.2,
  displacementMm: 0.3,
  drawingSpan: 220,
  displacementMagnification: 20,
};
const strain =
  (3 * leafFixture.thicknessMm * Math.abs(leafFixture.displacementMm)) / leafFixture.lengthMm ** 2;
const strainPercent = (100 * strain).toFixed(3);
function bearings(x, floor) {
  let b = rect(x, 230, 13, 14, 'hatch') + rect(x, 256, 13, 14, 'hatch');
  b += rect(x + 3, 270, 7, floor - 270, 'existing');
  return b;
}
function pumpGeometry(offset, magnetic) {
  let b = `<g transform="translate(0 ${offset})">`;
  b += rect(50, 150, 225, 200, 'existing') + rect(62, 162, 209, 176, 'paper');
  // Two process ports and an impeller are schematic; the drive-end boundary is the subject.
  b += rect(25, 242, 37, 16, 'paper') + rect(100, 115, 20, 47, 'paper');
  b += rect(135, 200, 10, 100, 'hatch') + rect(120, 239, 32, 22, 'paper');
  b += path('M121 239Q124 213 135 211M121 261Q124 287 135 289', 'line');
  b += bearings(190, 338) + bearings(430, 350) + bearings(475, 350);
  b += path('M420 350H510', 'line');
  if (!magnetic) {
    b += rect(275, 150, 12, 94, 'existing') + rect(275, 256, 12, 94, 'existing');
    b += rect(145, 244, 375, 12, 'paper');
    b += rect(287, 225, 8, 19, 'highlight') + rect(297, 230, 8, 14, 'hatch');
    b += rect(287, 256, 8, 19, 'highlight') + rect(297, 256, 8, 14, 'hatch');
    b += arrow('M360 223C385 208 407 240 381 265');
  } else {
    // Axial-face magnetic coupling: two independent shafts; the wall is continuous.
    b += rect(275, 150, 12, 200, 'highlight');
    b += rect(271, 150, 4, 14, 'hatch') + rect(271, 336, 4, 14, 'hatch');
    b += rect(145, 244, 95, 12, 'paper') + rect(330, 244, 190, 12, 'paper');
    b += rect(240, 190, 20, 120, 'existing') + rect(310, 190, 20, 120, 'existing');
    for (const y of [198, 278]) {
      b += rect(260, y, 8, 24, 'highlight') + rect(302, y, 8, 24, 'highlight');
      b += path(`M268 ${y + 12}H302`, 'ghost');
    }
    b += arrow('M205 204C221 190 233 216 222 231') + arrow('M350 223C375 208 397 240 371 265');
  }
  b += '</g>';
  return b;
}
function pump(mobile) {
  const d = mobile ? 45 : 0;
  let b = text(40, 42, 'Rotating shaft penetration');
  b += pumpGeometry(0, false);
  b += text(321, 102, 'Dynamic seal') + path('M355 113L299 221', 'leader');
  b += text(280, 402, 'Selected moving penetrations: 1', 'middle');
  b += text(40, 468 + d, 'No moving penetration');
  b += pumpGeometry(420 + d, true);
  b +=
    text(280, 528 + d, 'Stationary wall', 'middle') + path(`M281 ${538 + d}V${567 + d}`, 'leader');
  b += text(40, 811 + d, 'Wet rotor') + path(`M132 ${795 + d}L246 ${728 + d}`, 'leader');
  b += text(402, 811 + d, 'Drive rotor') + path(`M439 ${791 + d}L322 ${733 + d}`, 'leader');
  b += text(280, 861 + d, 'Selected moving penetrations: 0', 'middle');
  b += text(40, 907 + d, 'Curved arrows: rotation');
  b += text(40, 941 + d, 'Dashed marks: field coupling');
  return svg(
    'Remove the shaft crossing instead of sealing its motion',
    'Original matched longitudinal pump drive-end sections. Above, one continuous shaft crosses the process boundary through a dynamic seal. Below, an illustrative axial-face magnetic coupling uses independent wet and dry shafts and rotors on opposite sides of an uninterrupted stationary containment wall. Static wall joints and bearing supports remain. Curved arrows mean rotation; dashed marks denote the coupling relationship, not a computed magnetic field. Ports and the impeller are schematic; no pressure, torque, gap, or leakage performance is calculated.',
    980 + d,
    b,
    mobile,
  );
}

function leafShape(x0, y0, span, displacementPx) {
  const pts = [];
  for (let i = 0; i <= 100; i++) {
    const u = i / 100;
    const y = y0 + displacementPx * (3 * u * u - 2 * u * u * u);
    pts.push(`${i ? 'L' : 'M'}${(x0 + span * u).toFixed(3)} ${y.toFixed(3)}`);
  }
  return pts.join('');
}
function guide(mobile) {
  const d = mobile ? 50 : 0;
  let b = text(40, 42, 'Pinned guide');
  b += rect(145, 110, 35, 190, 'hatch') + rect(400, 110, 45, 190, 'existing');
  for (const y of [155, 245]) {
    b += rect(175, y - 5, 230, 10, 'paper');
    for (const x of [180, 400]) b += circle(x, y, 8) + circle(x, y, 2, 'existing');
  }
  b += text(40, 341, 'Rubbing pin contacts require lubrication');
  b += text(40, 418 + d, 'Flexure guide');
  const top = 535 + d,
    lower = 625 + d,
    x0 = 180,
    span = leafFixture.drawingSpan;
  const deltaPx =
    (span / leafFixture.lengthMm) *
    leafFixture.displacementMm *
    leafFixture.displacementMagnification;
  b += rect(145, 500 + d, 35, 190, 'hatch') + rect(400, 500 + d, 45, 190, 'ghost');
  b += path(`M180 ${top}H400M180 ${lower}H400`, 'ghost');
  b += rect(400, 500 + d + deltaPx, 45, 190, 'existing');
  for (const y of [top, lower])
    b += `<path data-leaf-length-mm="${leafFixture.lengthMm}" data-leaf-thickness-mm="${leafFixture.thicknessMm}" data-displacement-mm="${leafFixture.displacementMm}" data-magnification="${leafFixture.displacementMagnification}" data-origin-y="${y}" d="${leafShape(x0, y, span, deltaPx)}" class="accent"/>`;
  b += path(
    `M180 ${487 + d}V${462 + d}M400 ${487 + d}V${462 + d}M174 ${472 + d}H406M180 ${466 + d}v12M400 ${466 + d}v12`,
    'fine',
  );
  b += text(290, 456 + d, 'L = 30 mm', 'middle');
  b += `<path d="M480 ${550 + d}V${615 + d}" class="action" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`;
  b += text(40, 764 + d, 'Leaf thickness t = 0.20 mm');
  b += text(40, 801 + d, 'Shown δ = +0.30 mm (deflection ×20)');
  b += text(40, 838 + d, `Peak nominal bending strain: ${strainPercent}%`);
  b += text(40, 879 + d, 'Arrow: guided motion · thickness exaggerated');
  return svg(
    'Guidance remains while lubricated pivots disappear',
    'A schematic pinned parallel-link guide is compared with a two-leaf compliant guide. Fixed blocks are hatched and moving blocks are neutral gray. Dashed lines show the neutral flexure pose; solid curves evaluate the cubic small-deflection fixed-guided shape at positive 0.30 mm displacement, with 30 mm length and 0.20 mm thickness. Displacement is magnified twenty times and line thickness is exaggerated. Both leaves experience the same 0.020 percent peak nominal bending strain in this model. A double arrow shows guided displacement, not applied force. No material, fatigue life, payload rating, or parasitic-motion performance is established.',
    920 + d,
    b,
    mobile,
  );
}

function pinJoint(offset) {
  let b = `<g transform="translate(0 ${offset})">`;
  b += rect(259, 247, 42, 35, 'existing') + path('M235 283H325', 'line');
  b +=
    circle(280, 220, 35, 'existing') +
    rect(280, 209, 155, 22, 'paper') +
    circle(280, 220, 14) +
    circle(280, 220, 3, 'existing');
  b += path('M280 170V185', 'line') + rect(275, 165, 10, 5, 'paper');
  return b + '</g>';
}
function task(mobile) {
  const d = mobile ? 40 : 0;
  let b = text(40, 42, 'Different technician, same job');
  b += pinJoint(0);
  b += path('M118 126H166V153H118ZM166 131L209 148L202 157L166 146M121 126V116H146V126', 'line');
  b += arrow('M215 151Q252 139 278 164');
  b += text(280, 326, 'Joint lubrication still required', 'middle');
  b += text(40, 405 + d, 'Automatic supply, same job');
  b += pinJoint(340 + d);
  b += rect(120, 456 + d, 65, 58, 'paper') + rect(132, 514 + d, 41, 22, 'existing');
  b += path(`M185 ${487 + d}H280V${499 + d}`, 'line') + arrow(`M280 ${497 + d}V${504 + d}`);
  b += text(280, 666 + d, 'Joint lubrication still required', 'middle');
  b += text(40, 744 + d, 'Remove the rubbing contact');
  b += rect(140, 803 + d, 25, 91, 'hatch') + rect(400, 823 + d, 30, 91, 'existing');
  for (const y of [822 + d, 875 + d]) b += path(leafShape(165, y, 235, 20), 'accent');
  b += text(280, 956 + d, 'Flexure: no pin contact to lubricate', 'middle');
  b += text(40, 1000 + d, 'Arrows: lubricant delivery');
  return svg(
    'Changing task ownership leaves the physical need intact',
    'Three original mechanism details distinguish reassignment from elimination. First, another technician can deliver oil to the same retained pin joint; second, an automatic supply connects to the same oil port and retains the lubrication job. The final detail uses elastic leaves instead of the rubbing pin interface, eliminating that particular contact-lubrication need. Arrows in the first two details mean lubricant delivery. Contacts, fluid need, and duty are held fixed between those first two arrangements. No quantity, interval, reliability, or total maintenance saving is predicted.',
    1040 + d,
    b,
    mobile,
  );
}
const drawings = [
  ['eliminate-task-magnetic-pump', pump, 980, 1025],
  ['eliminate-task-flexure-guide', guide, 920, 970],
  ['eliminate-task-task-boundary', task, 1040, 1080],
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
console.log('Wrote three supporting-task figures, three phone companions, and asset dimensions.');
