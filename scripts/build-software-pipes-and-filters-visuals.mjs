import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets/software-engineering');
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 19, secondary = false) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${secondary ? '#626962' : '#252c28'}">${esc(value)}</text>`;
const rect = (x, y, width, height, accent = false, surface = false) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${surface ? '#fff' : accent ? '#edf5f0' : '#f1f2ef'}" stroke="${accent ? '#00855b' : '#a6aca3'}" stroke-width="1.2"/>`;
const arrow = (d) =>
  `<path d="${d}" fill="none" stroke="#00855b" stroke-width="1.5" marker-end="url(#arrow)"/>`;
const card = (x, y, width, title, detail, accent = false, height = 76, small = false) =>
  rect(x, y, width, height, accent) +
  text(x + 16, y + 29, title, small ? 18 : 20) +
  text(x + 16, y + 55, detail, small ? 16 : 17, true);

function svg(title, description, width, height, drawing) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}path,rect{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker><marker id="demand" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#626962" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}

const demandArrow = (d) =>
  `<path d="${d}" fill="none" stroke="#626962" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#demand)"/>`;
const stagesDescription =
  'CSV records become Celsius readings, are selected at a 25 °C threshold, converted to Fahrenheit pairs, and formatted as text. A reading of 25 °C becomes 77.0 F; 18 °C is omitted.';
const demandDescription =
  'Solid arrows carry data from the CSV source through the filter chain to the consumer. Dashed arrows carry requests for the next result upstream. The first result consumes the 18 °C and 25 °C records; the 30 °C record waits for another request.';

function stages(compact) {
  let drawing;
  if (compact) {
    drawing =
      text(24, 32, 'Transform the stream', 22) +
      text(24, 74, 'Input: loft,25.0', 19) +
      card(24, 110, 312, 'Parse', 'CSV → CelsiusReading', true) +
      arrow('M180 186V278') +
      text(196, 230, 'CelsiusReading', 16, true) +
      text(196, 252, 'loft · 25 °C', 17) +
      card(24, 280, 312, 'Select', 'Keep ≥25 °C', true) +
      arrow('M180 356V448') +
      text(196, 410, '25 °C retained', 17) +
      card(24, 450, 312, 'Convert', '°C → (sensor, °F)', true) +
      arrow('M180 526V618') +
      text(196, 580, '(loft, 77 °F)', 17) +
      card(24, 620, 312, 'Format', 'Pair → display string', true) +
      arrow('M180 696V768') +
      text(196, 742, 'string', 17, true) +
      card(24, 770, 312, 'loft: 77.0 F', 'One formatted string') +
      text(24, 894, '18 °C stops at Select.', 18) +
      text(24, 928, 'Arrows show data flow.', 17, true);
  } else {
    drawing =
      text(24, 34, 'Each stage owns one transformation', 24) +
      text(24, 90, 'Example input: loft,25.0', 20);
    const definitions = [
      ['Parse', 'CSV → °C', 'CelsiusReading', 'loft · 25 °C'],
      ['Select', 'Keep ≥25 °C', 'CelsiusReading', 'loft · 25 °C'],
      ['Convert', '°C → °F', '(sensor, °F)', 'loft · 77 °F'],
      ['Format', 'Value → text', 'string', 'loft: 77.0 F'],
    ];
    for (const [index, [title, detail, schema, value]] of definitions.entries()) {
      const x = 24 + index * 176;
      drawing +=
        card(x, 142, 144, title, detail, true, 100) +
        text(x, 276, schema, 16, true) +
        text(x, 310, value, 18);
      if (index < 3) drawing += arrow(`M${x + 144} 192H${x + 174}`);
    }
    drawing +=
      text(24, 368, '18 °C records stop at Select.', 18) +
      text(24, 402, 'Arrows show data flow. Filter order is part of the contract.', 17, true);
  }
  return svg(
    'Four filters connected by explicit stream contracts',
    stagesDescription,
    compact ? 360 : 720,
    compact ? 958 : 430,
    drawing,
  );
}

function demand(compact) {
  const drawing = compact
    ? text(24, 32, 'Demand pulls upstream;', 22) +
      text(24, 60, 'data moves downstream', 22) +
      card(44, 126, 272, 'CSV source', '18, 25, 30 °C') +
      card(44, 314, 272, 'Filter chain', 'Four generators') +
      card(44, 502, 272, 'Consumer', 'next() / print') +
      arrow('M244 202V312') +
      text(260, 260, 'CSV', 17) +
      demandArrow('M116 314V204') +
      text(50, 260, 'next()', 17) +
      arrow('M244 390V500') +
      text(260, 448, 'text', 17) +
      demandArrow('M116 502V392') +
      text(50, 448, 'next()', 17) +
      text(24, 632, 'First result consumes two records.', 17) +
      text(24, 664, '18 °C is dropped; 25 °C becomes 77 °F.', 17) +
      text(24, 708, '30 °C waits for the next request.', 17, true) +
      text(24, 764, 'Solid: data · dashed: demand', 17, true)
    : text(24, 34, 'Demand pulls upstream; data moves downstream', 24) +
      card(24, 190, 176, 'CSV source', '18, 25, 30 °C', false, 80) +
      card(272, 190, 176, 'Filter chain', 'Four generators', true, 80) +
      card(520, 190, 176, 'Consumer', 'next() / print', false, 80) +
      arrow('M200 236H270') +
      text(216, 224, 'CSV', 16) +
      arrow('M448 236H518') +
      text(474, 224, 'text', 16) +
      demandArrow('M320 190V92H112V188') +
      text(208, 80, 'next()', 17) +
      demandArrow('M608 190V130H400V188') +
      text(468, 118, 'next()', 17) +
      text(24, 316, 'First result: read 18 °C, then 25 °C.', 18) +
      text(24, 350, 'The 30 °C record waits for the next request.', 18) +
      text(24, 394, 'Solid: data · dashed: demand', 17, true);
  return svg(
    'Downstream data and upstream demand in the generator example',
    demandDescription,
    compact ? 360 : 720,
    compact ? 792 : 424,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['pipes-and-filters-stages', stages],
  ['pipes-and-filters-demand', demand],
]) {
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`;
    const content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[`software-engineering/${filename}`] = {
      width: Number(width),
      height: Number(height),
    };
  }
}
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await writeFile(manifestPath, JSON.stringify({ ...manifest, ...dimensions }, null, 2) + '\n');
console.log('Built Pipes and Filters stage and demand figures with separate phone layouts.');
