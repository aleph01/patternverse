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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}path,rect{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}

const boundaryDescription =
  'Console and test drivers enter the same reservation operation. The application calls its own stock port, which can be served by a SQLite adapter or an in-memory substitute selected at startup.';
const dependencyDescription =
  'Runtime calls go from the application to a SQLite adapter through the stock port. The source import goes in the opposite direction: adapters.py imports definitions from application.py, while application.py imports no adapters.';

function boundary(compact) {
  const drawing = compact
    ? text(24, 32, 'Application inside,', 22) +
      text(24, 60, 'adapters outside', 22) +
      text(24, 100, 'Outside: drivers', 18, true) +
      card(24, 120, 144, 'Console', 'Parse text', false, 76, true) +
      card(192, 120, 144, 'Test driver', 'Call directly', false, 76, true) +
      rect(24, 260, 312, 320, true, true) +
      text(40, 296, 'Application', 21) +
      card(44, 328, 272, 'reserve', 'Incoming port', true) +
      card(44, 480, 272, 'StockPort.take', 'Outgoing port', true) +
      arrow('M96 196V228H12V366H42') +
      arrow('M264 196V228H348V366H318') +
      arrow('M180 404V478') +
      text(196, 450, 'Calls stock', 17) +
      arrow('M180 556V600H12V730H42') +
      arrow('M12 730V850H42') +
      text(24, 646, 'Select one storage adapter', 20) +
      card(44, 692, 272, 'SQLite adapter', 'Conditional update') +
      card(44, 812, 272, 'Memory substitute', 'Sequential test model') +
      text(24, 924, 'Same application in both runs.', 18, true)
    : text(24, 34, 'One application, different adapters', 24) +
      text(24, 90, 'Outside: drivers', 18, true) +
      text(520, 90, 'Outside: storage', 18, true) +
      card(24, 132, 172, 'Console', 'Parse text') +
      card(24, 300, 172, 'Test driver', 'Call directly') +
      rect(244, 106, 232, 334, true, true) +
      text(260, 138, 'Application', 21) +
      card(260, 164, 200, 'reserve', 'Incoming port', true) +
      card(260, 304, 200, 'StockPort.take', 'Outgoing port', true) +
      arrow('M196 170H258') +
      arrow('M196 338H220V202H258') +
      arrow('M360 240V302') +
      text(374, 278, 'Calls', 17) +
      card(520, 244, 176, 'SQLite adapter', 'Real SQL', false, 76, true) +
      card(520, 364, 176, 'Memory', 'Test substitute', false, 76, true) +
      arrow('M460 340H492V282H518') +
      arrow('M492 340V402H518') +
      text(24, 478, 'Same operation for both drivers.', 17, true) +
      text(396, 478, 'One storage adapter per run.', 17, true) +
      text(24, 516, 'Arrows: possible runtime calls.', 17);
  return svg(
    'Application-owned ports and replaceable adapters',
    boundaryDescription,
    compact ? 360 : 720,
    compact ? 950 : 542,
    drawing,
  );
}

function dependencies(compact) {
  const drawing = compact
    ? text(24, 32, 'Calls and imports', 22) +
      text(24, 60, 'are different relationships', 22) +
      text(24, 108, 'At runtime', 21) +
      card(24, 132, 312, 'ReserveStock', 'Calls StockPort.take', true) +
      arrow('M180 208V270') +
      text(196, 248, 'calls', 17) +
      card(24, 272, 312, 'SQLiteStock', 'Executes SQL') +
      text(24, 414, 'In source code', 21) +
      card(24, 438, 312, 'adapters.py', 'Imports app definitions') +
      arrow('M180 514V576') +
      text(196, 554, 'imports', 17) +
      card(24, 578, 312, 'application.py', 'Operation · port · error', true) +
      text(24, 710, 'application.py imports no adapter.', 17, true)
    : text(24, 34, 'Calls and imports point different ways', 24) +
      text(24, 86, 'Runtime: application calls the adapter', 21) +
      card(24, 118, 272, 'ReserveStock', 'Calls StockPort.take', true, 100) +
      card(424, 118, 272, 'SQLiteStock', 'Executes SQL', false, 100) +
      arrow('M296 168H422') +
      text(340, 150, 'call', 17) +
      text(24, 278, 'Source: adapters depend on the application', 21) +
      card(24, 310, 272, 'application.py', 'Operation · port · error', true, 100) +
      card(424, 310, 272, 'adapters.py', 'Imports app definitions', false, 100) +
      arrow('M424 360H298') +
      text(330, 342, 'import', 17) +
      text(24, 450, 'The core never imports its storage adapter.', 17, true);
  return svg(
    'Runtime calls versus source dependencies',
    dependencyDescription,
    compact ? 360 : 720,
    compact ? 752 : 478,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['ports-and-adapters-boundary', boundary],
  ['ports-and-adapters-dependencies', dependencies],
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
console.log('Built the Ports and Adapters boundary and dependency figures with phone layouts.');
