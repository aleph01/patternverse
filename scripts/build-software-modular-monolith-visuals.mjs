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
const boundariesDescription =
  'One application release contains Customers and Tickets modules. Startup code composes their public APIs. Tickets calls the Customers API locally, while each module keeps its own records behind that interface.';
const replicasDescription =
  'A router sends each request to one of two replicas of the same application release. Each replica contains both Customers and Tickets; the modules remain part of the same deployment unit.';

function boundaries(compact) {
  const drawing = compact
    ? text(24, 32, 'One deployment;', 22) +
      text(24, 60, 'explicit module boundaries', 22) +
      rect(24, 104, 312, 762, false, true) +
      text(40, 134, 'One application release', 19) +
      card(44, 152, 272, 'main.py', 'Startup composition') +
      rect(44, 294, 272, 222, false, true) +
      text(60, 326, 'Tickets', 21) +
      card(64, 344, 232, 'Tickets API', 'open · get', true, 64) +
      card(64, 430, 232, 'Ticket state', 'Owned by Tickets', false, 64) +
      rect(44, 612, 272, 222, false, true) +
      text(60, 644, 'Customers', 21) +
      card(64, 662, 232, 'Customers API', 'active_customer', true, 64) +
      card(64, 748, 232, 'Customer store', '_store.py · private', false, 64) +
      wire('M268 228V342') +
      wire('M316 190H328V694H298') +
      arrow('M64 376H36V694H62') +
      text(60, 566, 'local call', 18) +
      text(24, 914, 'Dashed: startup wiring', 17, true) +
      text(24, 946, 'Solid: local call through an API', 17, true)
    : text(24, 34, 'Module boundaries inside one application', 24) +
      rect(24, 100, 672, 430, false, true) +
      text(40, 136, 'One release · one process per replica', 21) +
      card(44, 178, 632, 'main.py · composition root', 'Build Customers and Tickets', false, 72) +
      text(44, 294, 'Tickets', 21) +
      text(412, 294, 'Customers', 21) +
      rect(44, 314, 264, 184, false, true) +
      rect(412, 314, 264, 184, false, true) +
      card(64, 334, 224, 'Tickets API', 'open · get', true, 60) +
      card(432, 334, 224, 'Customers API', 'active_customer', true, 60) +
      card(64, 414, 224, 'Ticket state', 'Private to Tickets', false, 62) +
      card(432, 414, 224, 'Customer store', '_store.py · private', false, 62) +
      wire('M176 250V332') +
      wire('M544 250V332') +
      arrow('M288 364H430') +
      text(316, 344, 'local call', 17) +
      text(24, 580, 'Public interfaces cross module boundaries; records do not.', 17, true);
  return svg(
    'Public interfaces and owned state inside one application release',
    boundariesDescription,
    compact ? 360 : 720,
    compact ? 974 : 610,
    drawing,
  );
}

function replica(x, y, width, title, compact) {
  const inset = 20;
  return (
    rect(x, y, width, compact ? 200 : 244, false, true) +
    text(x + 16, y + 34, title, 20) +
    rect(x + inset, y + (compact ? 62 : 66), width - 2 * inset, compact ? 48 : 60) +
    text(x + inset + 16, y + (compact ? 92 : 102), 'Customers', 19) +
    rect(x + inset, y + (compact ? 132 : 150), width - 2 * inset, compact ? 48 : 60, true) +
    text(x + inset + 16, y + (compact ? 162 : 186), 'Tickets', 19)
  );
}

function replicas(compact) {
  const drawing = compact
    ? text(24, 32, 'Scale the application', 22) +
      text(24, 60, 'as one deployment unit', 22) +
      text(24, 108, 'Same release: Customers + Tickets', 17, true) +
      card(24, 150, 312, 'Route each request', 'Choose one replica') +
      replica(44, 318, 272, 'Replica 1 · release A', true) +
      replica(44, 630, 272, 'Replica 2 · release A', true) +
      arrow('M24 188H12V418H42') +
      arrow('M12 418V730H42') +
      text(24, 884, 'Each replica includes both modules.', 17) +
      text(24, 916, 'Memory-only data is instance-local.', 17, true)
    : text(24, 34, 'One release, multiple runtime replicas', 24) +
      card(240, 98, 240, 'Route each request', 'Choose one replica') +
      arrow('M360 174V208H174V258') +
      arrow('M360 208H546V258') +
      replica(24, 260, 300, 'Replica 1 · release A', false) +
      replica(396, 260, 300, 'Replica 2 · release A', false) +
      text(24, 554, 'Replicas contain the complete application.', 18) +
      text(24, 586, 'Storage and concurrency still need explicit design.', 17, true);
  return svg(
    'Scaling the application with complete runtime replicas',
    replicasDescription,
    compact ? 360 : 720,
    compact ? 946 : 614,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['modular-monolith-boundaries', boundaries],
  ['modular-monolith-replicas', replicas],
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
console.log('Built Modular Monolith boundary and replica figures with separate phone layouts.');
