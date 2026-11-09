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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}path,rect{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker><marker id="wiring" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#626962" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}

const wire = (d) =>
  `<path d="${d}" fill="none" stroke="#626962" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#wiring)"/>`;
const assemblyDescription =
  'Startup code chooses a price source and supplies it to QuoteService. Once assembled, QuoteService calls the supplied source through unit_price rather than constructing or looking up a provider.';
const lifetimeDescription =
  'The application opens a database connection, builds SqlitePrices and QuoteService, uses the service while the connection is open, and closes the connection when its owning scope ends. The consumer borrows the collaborator and cannot safely keep using it afterward.';
function assembly(compact) {
  const drawing = compact
    ? text(24, 32, 'Assemble separately,', 22) +
      text(24, 60, 'then use the collaborator', 22) +
      card(24, 112, 312, 'main.py · composition root', 'Chooses concrete providers', false, 76) +
      wire('M180 188V276') +
      text(198, 236, '1 · create', 17, true) +
      card(44, 278, 272, 'Price provider', 'SQLite or memory', true, 76) +
      wire('M24 150H12V496H42') +
      text(44, 406, '2 · supply provider', 17, true) +
      card(44, 458, 272, 'QuoteService(prices)', 'Stores the supplied reference', false, 76) +
      arrow('M316 496H332V316H318') +
      text(44, 590, '3 · later call: unit_price(sku)', 18) +
      text(24, 660, 'Dashed: startup wiring', 17, true) +
      text(24, 692, 'Solid: operational call', 17, true) +
      text(24, 740, 'No provider lookup in QuoteService.', 17)
    : text(24, 34, 'Assemble separately, then use the collaborator', 24) +
      card(
        150,
        100,
        420,
        'main.py · composition root',
        'Chooses and constructs the concrete graph',
        false,
        80,
      ) +
      wire('M500 180V298') +
      text(520, 238, '1 · create', 17, true) +
      wire('M220 180V298') +
      text(42, 238, '2 · supply provider', 17, true) +
      card(24, 300, 270, 'QuoteService(prices)', 'Stores the reference', false, 80) +
      card(426, 300, 270, 'Price provider', 'SQLite or memory', true, 80) +
      arrow('M294 340H424') +
      text(308, 300, '3 · later call', 16) +
      text(310, 324, 'unit_price', 16) +
      text(24, 438, 'Dashed: startup construction and supply', 17, true) +
      text(24, 470, 'Solid: operational call through the price-source contract', 17, true);
  return svg(
    'External assembly and later collaborator use',
    assemblyDescription,
    compact ? 360 : 720,
    compact ? 778 : 512,
    drawing,
  );
}
function lifetime(compact) {
  const drawing = compact
    ? text(24, 32, 'The application owns', 22) +
      text(24, 60, 'the connection lifetime', 22) +
      rect(24, 104, 312, 614, false, true) +
      text(40, 138, 'Owning scope in main.py', 20) +
      card(44, 166, 272, '1 · Open connection', 'Application acquires it', false, 76) +
      arrow('M180 242V284') +
      card(44, 286, 272, '2 · Build collaborators', 'Adapter borrows connection', true, 76) +
      arrow('M180 362V404') +
      card(44, 406, 272, '3 · Calculate quotes', 'Connection is still open', true, 76) +
      arrow('M180 482V524') +
      card(44, 526, 272, '4 · Close on scope exit', 'Also when an error escapes', false, 76) +
      text(44, 652, 'Use finishes before close.', 18) +
      text(40, 690, 'No ownership transfer to consumer.', 16, true) +
      text(24, 770, 'After exit: database access fails.', 18) +
      text(24, 804, 'An injected reference can outlive', 17, true) +
      text(24, 830, 'the resource it refers to.', 17, true)
    : text(24, 34, 'Borrow a resource within its owner’s lifetime', 24) +
      rect(24, 102, 672, 370, false, true) +
      text(44, 140, 'Owning scope in main.py', 21) +
      card(44, 186, 184, '1 · Open', 'Connection', false, 76) +
      card(268, 186, 184, '2 · Build', 'Adapter + service', true, 76) +
      card(492, 186, 184, '3 · Use', 'Calculate quote', true, 76) +
      arrow('M228 224H266') +
      arrow('M452 224H490') +
      arrow('M584 262V310H362V338') +
      card(268, 340, 184, '4 · Close', 'Scope exit', false, 76) +
      text(
        44,
        450,
        'The consumer borrows. The application closes, including on errors.',
        17,
        true,
      ) +
      text(24, 528, 'After scope exit, the retained reference points to a closed connection.', 18) +
      text(
        24,
        562,
        'Injection supplies a collaborator; it does not keep the resource alive.',
        17,
        true,
      );
  return svg(
    'Connection ownership around injected collaborators',
    lifetimeDescription,
    compact ? 360 : 720,
    compact ? 868 : 604,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['dependency-injection-assembly', assembly],
  ['dependency-injection-lifetime', lifetime],
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
console.log(
  'Built Dependency Injection assembly and ownership figures with separate phone layouts.',
);
