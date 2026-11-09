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

const thermalFixture = {
  ambientC: 35,
  deviceW: 12,
  otherChassisW: 8,
  junctionCaseKPerW: 1.5,
  interfaceKPerW: 0.5,
  sinkAmbientKPerW: 3,
  qualifiedChassisKPerW: 2,
  poorChassisKPerW: 4,
  junctionCriterionC: 110,
};
function thermalResult(chassisKPerW) {
  const f = thermalFixture;
  const localKPerW = f.junctionCaseKPerW + f.interfaceKPerW;
  const combinedW = f.deviceW + f.otherChassisW;
  const beforeJunctionC = f.ambientC + f.deviceW * (localKPerW + f.sinkAmbientKPerW);
  const beforeChassisC = f.ambientC + f.otherChassisW * chassisKPerW;
  const afterChassisC = f.ambientC + combinedW * chassisKPerW;
  return {
    localKPerW,
    combinedW,
    beforeJunctionC,
    beforeChassisC,
    afterChassisC,
    afterJunctionC: afterChassisC + f.deviceW * localKPerW,
  };
}
const qualified = thermalResult(thermalFixture.qualifiedChassisKPerW);
const poor = thermalResult(thermalFixture.poorChassisKPerW);

function thermalHardware(offset, transferred) {
  let b = `<g transform="translate(0 ${offset})">`;
  b += path('M50 100H68V280H490V100H508V298H50Z', transferred ? 'highlight' : 'existing');
  b += rect(110, 230, 48, 35, 'paper') + rect(124, 265, 20, 15, 'highlight');
  b += arrow('M134 265V330');
  if (!transferred) {
    b += rect(275, 180, 40, 40, 'paper') + rect(315, 180, 5, 40, 'highlight');
    b += rect(320, 145, 12, 110, 'existing');
    for (const y of [145, 165, 185, 205, 225, 245]) b += rect(332, y, 65, 7, 'existing');
    b += path('M284 220V240H264M306 220V245H295', 'line');
    b += arrow('M289 200H319') + arrow('M348 200H446');
  } else {
    b += rect(445, 180, 40, 40, 'paper') + rect(485, 180, 5, 40, 'highlight');
    b += path('M454 220V240H434M476 220V245H465', 'line');
    b += arrow('M461 200H538');
  }
  b += '</g>';
  b += text(134, 253 + offset, '8 W', 'middle');
  b += text(transferred ? 440 : 271, 264 + offset, '12 W');
  if (!transferred)
    b += text(340, 115 + offset, 'Sink') + path(`M358 ${122 + offset}V${141 + offset}`, 'leader');
  return b;
}
function thermal(mobile) {
  const d = mobile ? 50 : 0;
  let b = text(40, 42, 'Before: dedicated sink') + text(368, 42, 'Ambient 35°C');
  b += thermalHardware(0, false);
  b += text(323, 340, 'Chassis: 2 K/W');
  b +=
    text(40, 376, `Junction ${qualified.beforeJunctionC}°C`) +
    text(323, 376, `Chassis ${qualified.beforeChassisC}°C`);
  b += text(40, 447 + d, 'After: chassis receives heat');
  b += thermalHardware(400 + d, true);
  b += text(323, 740 + d, 'Chassis: 2 K/W');
  b +=
    text(40, 776 + d, `Junction ${qualified.afterJunctionC}°C`) +
    text(323, 776 + d, `Chassis ${qualified.afterChassisC}°C`);
  b += text(40, 832 + d, 'Arrows: heat flow · schematic sections');
  return svg(
    'An existing chassis takes over the dedicated heat sink’s job',
    'Two original open-chassis sections retain 12 W device dissipation, 8 W other chassis heating, and 35 degrees Celsius ambient. Before transfer, the separate finned sink carries device heat through its own modeled ambient path; the chassis carries 8 W. Afterward, the device is mounted thermally to the existing chassis and the sink is removed. The chassis now carries 20 W. With declared 2 K/W local device-and-interface resistance, 3 K/W separate sink resistance, and 2 K/W effective chassis resistance, junction temperatures are 95 and 99 degrees Celsius and chassis temperatures 51 and 75. These are lumped model outputs, not simulated temperature fields or measured product values.',
    865 + d,
    b,
    mobile,
  );
}

function meteringPump(offset) {
  let b = `<g transform="translate(0 ${offset})">`;
  // Pump cross-section: plunger, spring return, supply reservoir and outlet boundary.
  b += rect(330, 190, 90, 60, 'existing') + rect(340, 198, 72, 44, 'paper');
  b += rect(350, 200, 8, 40, 'hatch') + path('M330 220H350', 'line');
  b += path('M358 220H365L369 211L377 229L385 211L393 229L401 211L405 220H412', 'line');
  b += path('M370 115V155H410V115M370 127H410M390 155V190M420 205H505', 'line');
  b += circle(390, 175, 3) + path('M385 169L390 173L395 169', 'fine');
  b += circle(450, 205, 3) + path('M444 200L448 205L444 210', 'fine');
  b += '</g>';
  b += text(367, 102 + offset, 'Reservoir');
  b += text(434, 168 + offset, 'Oil circuit');
  b += text(347, 312 + offset, 'Pump retained');
  return b;
}
function shaft(offset, withEccentric) {
  let b = `<g transform="translate(0 ${offset})">`;
  b += path(`M55 216H${withEccentric ? 220 : 165}M55 224H${withEccentric ? 220 : 165}`, 'line');
  b += circle(110, 220, 36, 'existing') + circle(110, 220, 7);
  b += path('M110 184V213M74 220H103M110 227V256M117 220H146', 'fine');
  b += arrow('M69 246A48 48 0 1 1 148 190');
  if (withEccentric) {
    b += circle(233, 220, 30, 'highlight') + circle(220, 220, 4);
    b += circle(267, 220, 4) + path('M271 220H350', 'line');
  } else {
    b += rect(220, 195, 75, 50, 'paper') + rect(227, 202, 15, 36, 'existing');
    b += path('M242 220H350', 'line');
  }
  b += `<path d="M302 271H338" class="action" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`;
  b += '</g>';
  return b;
}
function lubrication(mobile) {
  const d = mobile ? 50 : 0;
  let b = text(40, 42, 'Separate pump actuator');
  b += shaft(0, false) + meteringPump(0);
  b += text(40, 102, 'Machine shaft') + path('M107 113V170', 'leader');
  b += text(214, 169, 'Actuator');
  b += text(40, 418 + d, 'Existing shaft supplies the drive');
  b += shaft(380 + d, true) + meteringPump(380 + d);
  b += text(40, 482 + d, 'Machine shaft') + path(`M107 ${493 + d}V${550 + d}`, 'leader');
  b += text(40, 734 + d, 'Eccentric + follower') + path(`M211 ${720 + d}L234 ${633 + d}`, 'leader');
  b += text(40, 787 + d, 'Arrows: rotary or reciprocating drive motion');
  b += text(40, 827 + d, 'No machine motion → no pumping strokes');
  return svg(
    'Machine motion replaces the auxiliary actuator',
    'Matched original mechanism schematics retain the main machine shaft, plunger pump with spring return, reservoir, and lubrication circuit. Above, a separate linear actuator strokes the pump while the existing shaft remains disconnected from it. Below, an eccentric on the existing shaft contacts a roller follower linked to the same plunger, replacing the dedicated actuator. Arrows show rotary and reciprocating drive motion; lines at the reservoir and outlet are fluid connections without flow arrows. The mechanism is shown at one schematic phase, not as a kinematic or pressure simulation. Stroke volume, drive load, and pump capacity are not inferred from the drawing.',
    865 + d,
    b,
    mobile,
  );
}

function rejection(mobile) {
  const d = mobile ? 25 : 0;
  let b = text(40, 42, 'The receiver still has to reject heat');
  b += `<g transform="translate(0 ${d})" data-device-w="${thermalFixture.deviceW}" data-other-w="${thermalFixture.otherChassisW}" data-chassis-k-per-w="${thermalFixture.poorChassisKPerW}">`;
  b += arrow('M280 100V143') + circle(280, 150, 4);
  b += path('M280 154V190M280 245V336', 'line') + rect(265, 190, 30, 55, 'existing');
  b += circle(280, 340, 4) + arrow('M470 340H287');
  b += path('M280 344V400M280 455V516', 'line') + rect(265, 400, 30, 55, 'highlight');
  b += arrow('M230 382V480') + circle(280, 520, 4);
  b += '</g>';
  b += text(40, 158 + d, `Junction ${poor.afterJunctionC}°C`);
  b += text(320, 122 + d, 'Device 12 W');
  b += text(325, 214 + d, 'Device + mount') + text(325, 242 + d, `${poor.localKPerW} K/W`);
  b += text(40, 348 + d, `Chassis ${poor.afterChassisC}°C`);
  b += text(412, 296 + d, 'Other heat') + text(412, 326 + d, '8 W');
  b += text(325, 421 + d, 'Chassis to air') + text(325, 449 + d, '4 K/W');
  b += text(110, 435 + d, `${poor.combinedW} W`);
  b += text(40, 528 + d, 'Ambient 35°C');
  b += text(40, 595 + d, `Before removal: junction ${poor.beforeJunctionC}°C`);
  b += text(40, 636 + d, `After: ${poor.afterJunctionC}°C exceeds 110°C target`);
  return svg(
    'Good contact cannot cure inadequate heat rejection',
    'Calculated thermal network after transfer onto a poor 4 K/W chassis. Device heat of 12 W passes through a 2 K/W junction-and-interface path before joining 8 W at the chassis. The total 20 W crosses the chassis-to-ambient path to 35 degrees Celsius surroundings. Chassis and junction temperatures calculate to 115 and 139 degrees Celsius. With the same poor chassis before transfer, the independent 3 K/W sink kept the junction at 95 degrees Celsius. The declared 110 degree criterion is a teaching target, not a device rating. Rectangles denote lumped thermal resistances; arrows denote heat flow. No thermal capacitance or transient physics is modeled.',
    680 + d,
    b,
    mobile,
  );
}
const drawings = [
  ['function-transfer-thermal-paths', thermal, 865, 915],
  ['function-transfer-lubrication-drive', lubrication, 865, 915],
  ['function-transfer-rejection-limit', rejection, 680, 705],
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
console.log('Wrote three function-transfer figures, three phone companions, and asset dimensions.');
