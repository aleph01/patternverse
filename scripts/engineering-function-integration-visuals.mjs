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

const fixture = { cableDiameterMm: 6, throatMm: 5, unitsPerMm: 14 };
const cableRadius = (fixture.cableDiameterMm * fixture.unitsPerMm) / 2;
const tipLeft = 280 - (fixture.throatMm * fixture.unitsPerMm) / 2;
const tipRight = 280 + (fixture.throatMm * fixture.unitsPerMm) / 2;
const cableSection = (cls = 'paper') =>
  circle(280, 248, cableRadius, cls) + circle(280, 248, cableRadius - 8, 'fine');
const enclosureFloor = () => path('M45 328H515V310H305V290H255V310H45Z', 'existing');
function integralWall() {
  return path(
    `M45 328H515V310H350V210Q350 180 325 180L${tipRight} 190V195H325Q335 195 335 210V310H305V290H255V310H225V210Q225 195 235 195H${tipLeft}V190L235 180Q210 180 210 210V310H45Z`,
    'highlight',
  );
}
function screw(x, top) {
  return (
    rect(x - 10, top, 20, 8, 'paper') +
    path(`M${x - 3} ${top + 8}v33h6v-33M${x - 7} ${top + 4}h14`, 'line')
  );
}
function clip(mobile) {
  const d = mobile ? 35 : 0;
  let b = text(40, 42, 'Separate clamp');
  b += '<g transform="translate(0 -65)">';
  b += enclosureFloor() + cableSection();
  b += path(
    'M180 310V296H211V240A69 69 0 0 1 349 240V296H380V310H334V240A54 54 0 0 0 226 240V310Z',
    'existing',
  );
  b += screw(195, 285) + screw(365, 285) + '</g>';
  b += text(435, 157, 'Cable', 'middle') + path('M435 170L322 183', 'leader');
  b += text(40, 296, 'Enclosure wall') + path('M108 273V257', 'leader');
  b += text(280, 337, 'Enclosure + clamp + 2 screws', 'middle');
  b += text(280, 369, '4 pieces in selected subassembly', 'middle');
  b += text(40, 424 + d, 'Integral retaining arms');
  b += `<g transform="translate(0 ${350 + d})" data-cable-diameter-mm="${fixture.cableDiameterMm}" data-throat-mm="${fixture.throatMm}" data-units-per-mm="${fixture.unitsPerMm}">`;
  b += integralWall() + cableSection() + '</g>';
  b += text(280, 485 + d, 'Throat 5 mm', 'middle');
  b += path(
    `M${tipLeft} ${545 + d}V${505 + d}M${tipRight} ${545 + d}V${505 + d}M${tipLeft - 6} ${515 + d}H${tipRight + 6}M${tipLeft} ${509 + d}v12M${tipRight} ${509 + d}v12`,
    'fine',
  );
  b +=
    text(40, 600 + d, 'Cable Ø6 mm') +
    path(`M176 ${595 + d}L${280 - cableRadius} ${598 + d}`, 'leader');
  b += text(280, 729 + d, '1 piece: enclosure with retaining feature', 'middle');
  b += text(40, 780 + d, 'Matched sections · nominal teaching geometry');
  return svg(
    'An enclosure wall can also retain the cable',
    'Matched original sections retain the same nominal 6 mm cable and enclosure wall position. A separate clamp and two screws are replaced by two retaining arms continuous with the molded wall. The nominal throat is 5 mm wide: a rigid circular cable needs at least 1 mm additional width to pass, or 0.5 mm per arm under symmetric motion. The selected part inventory is four pieces versus one, excluding the cable. No strain, force, tolerance, or lifetime rating is calculated.',
    820 + d,
    b,
    mobile,
  );
}

function pump(mobile) {
  const d = mobile ? 40 : 0;
  const casting =
    'M160 230A120 120 0 1 1 400 230A120 120 0 0 1 363 315L390 390Q397 410 420 410H445V435H115V410H140Q163 410 170 390L197 315A120 120 0 0 1 160 230Z';
  let b = text(40, 42, 'Containment and support');
  b += `<g transform="translate(0 ${d})">`;
  b += rect(70, 435, 420, 28, 'existing');
  b += path(casting, 'existing');
  b +=
    '<path d="M197 315Q280 365 363 315L390 390Q397 410 420 410H445V435H115V410H140Q163 410 170 390Z" fill="#edf5f0"/>';
  b += path(casting, 'line') + circle(280, 230, 96, 'paper');
  b += screw(145, 404) + screw(415, 404);
  b += path('M60 464H500', 'line');
  b += arrow('M205 315Q188 361 184 409') + arrow('M355 315Q372 361 376 409');
  b += '</g>';
  b += text(30, 100 + d, 'Pressure wall') + path(`M133 ${109 + d}L194 ${147 + d}`, 'leader');
  b += text(280, 224 + d, 'Fluid cavity', 'middle');
  b += text(414, 298 + d, 'One casting') + path(`M414 ${307 + d}L369 ${347 + d}`, 'leader');
  b += text(40, 525 + d, 'Supporting foot') + path(`M123 ${500 + d}L154 ${432 + d}`, 'leader');
  b += text(357, 525 + d, 'Base fasteners') + path(`M420 ${501 + d}V${455 + d}`, 'leader');
  b += arrow(`M40 ${578 + d}H85`) + text(100, 585 + d, 'Arrows: load-transfer paths');
  b += text(40, 629 + d, 'Section · not to scale');
  return svg(
    'The pump casting also carries its mounting role',
    'Original schematic section of a hollow pump casing whose lower wall continues into an integral supporting foot. The cavity is bounded by a pressure wall. Two arrows trace qualitative load-transfer paths through the same casting to its foot; two base fasteners remain. Green fill identifies the supporting region, not a separate part or calculated stress. No bracket-to-housing joint remains in this teaching arrangement. It is not a reconstruction or rating of a commercial pump.',
    665 + d,
    b,
    mobile,
  );
}

function renewedEnclosure() {
  // The upper left lip is schematically worn; the faint path shows its former outline.
  let b = path(
    'M50 140H68V300H210V210Q210 180 224 181L230 188L224 193L229 199L225 210V300H255V290H305V300H335V210Q335 195 325 195H315V190L325 180Q350 180 350 210V300H492V140H510V320H50Z',
    'highlight',
  );
  b += path('M224 181H235L245 190V195H235L229 199', 'ghost');
  return b;
}
function soundEnclosure() {
  return path('M50 140H68V300H185V315H375V300H492V140H510V320H50Z', 'existing');
}
function retainingInsert() {
  let b = path(
    'M185 315V300H210V210Q210 180 235 180L245 190V195H235Q225 195 225 210V300H255V290H305V300H335V210Q335 195 325 195H315V190L325 180Q350 180 350 210V300H375V315Z',
    'highlight',
  );
  b += rect(192, 300, 6, 15, 'paper') + rect(362, 300, 6, 15, 'paper');
  return b;
}
function renewal(mobile) {
  const d = mobile ? 60 : 0;
  let b = text(40, 42, 'Renew whole enclosure');
  b += renewedEnclosure();
  b += text(357, 105, 'Worn lip') + path('M392 118L235 185', 'leader');
  b += text(280, 371, 'No local repair in this service scenario', 'middle');
  b += text(40, 439 + d, 'Renew retaining insert');
  // Same enclosure envelope below, with the service insert withdrawn above it.
  b += `<g transform="translate(0 ${500 + d})">` + soundEnclosure();
  b += rect(192, 315, 6, 5, 'paper') + rect(362, 315, 6, 5, 'paper');
  b += '</g>';
  b += `<g transform="translate(0 ${300 + d})">` + retainingInsert() + '</g>';
  b += path(`M195 ${615 + d}V${815 + d}M365 ${615 + d}V${815 + d}`, 'ghost');
  b += arrow(`M280 ${760 + d}V${635 + d}`);
  b += text(40, 875 + d, 'Green: renewed element');
  b += text(40, 911 + d, 'Arrow: withdrawal after release');
  return svg(
    'Integration changes which unit must be renewed',
    'Two original schematic enclosure sections compare renewal scope for a locally worn retaining lip. In the upper case the whole enclosure is the renewed element because the assumed service policy offers no local repair. The previous lip outline is dashed and wear is exaggerated. Below, the sound enclosure remains while a separate retaining insert is withdrawn after release; empty fastener passages and dashed mounting axes indicate its retained seat. The insert is shown displaced vertically. Green identifies the renewed unit. No wear rate, cycle life, or service-time result is calculated.',
    950 + d,
    b,
    mobile,
  );
}

const drawings = [
  ['function-integration-cable-clip', clip, 820, 855],
  ['function-integration-pump-support', pump, 665, 705],
  ['function-integration-renewal', renewal, 950, 1010],
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
  'Wrote three function-integration figures, three phone companions, and asset dimensions.',
);
