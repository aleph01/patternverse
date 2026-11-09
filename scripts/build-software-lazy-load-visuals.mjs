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

const accessDescription =
  'A document is first loaded with its title and an unloaded body marker. Reading the title performs no body query. The first body access selects and stores the body; later accesses return the stored value without another query. A document whose body is never accessed performs no body query.';
const lifecycleDescription =
  'An unloaded document attempts a body read. Success stores the value and releases the callback; failure propagates while the body remains unloaded. After the reader closes, unloaded access is rejected before SQL, while an already-loaded body remains readable from memory.';
function access(compact) {
  const drawing = compact
    ? text(24, 32, 'Load less now;', 22) +
      text(24, 60, 'read the body on demand', 22) +
      card(24, 104, 312, '1. Load ID and title', 'Body = UNLOADED', false, 116) +
      text(40, 194, 'Keep the loader.', 17, true) +
      card(24, 304, 312, 'Read title: no body query', 'Stop here if enough.', false, 100) +
      arrow('M180 220V302') +
      card(24, 536, 312, '2. First body access', 'SELECT by captured ID', true, 100) +
      arrow('M180 404V534') +
      text(196, 470, 'Only if requested', 17, true) +
      card(24, 736, 312, 'Store successful result', 'Text, empty text, or NULL', true, 116) +
      arrow('M180 636V734') +
      card(24, 952, 312, '3. Later body reads', 'Use stored value; no SELECT', false, 100) +
      arrow('M180 852V950') +
      text(24, 1112, 'Unused body: zero body SELECTs.', 18) +
      text(24, 1152, 'Cache is per Document instance.', 17, true)
    : text(24, 34, 'Load less now; read the body only on demand', 24) +
      card(
        24,
        84,
        672,
        '1. Load header: ID and title',
        'Body = UNLOADED; keep the loader.',
        false,
        88,
      ) +
      card(24, 248, 312, 'Read title', 'No body SELECT', false, 112) +
      arrow('M180 172V246') +
      card(384, 248, 312, '2. First body access', 'SELECT by captured ID', true, 112) +
      arrow('M540 172V246') +
      card(24, 448, 312, 'Never read the body?', 'No body SELECT ever.', false, 112) +
      card(384, 448, 312, 'Store successful result', 'Text, empty text, or NULL', true, 112) +
      arrow('M540 360V446') +
      card(384, 648, 312, '3. Later body reads', 'Use stored value; no SELECT', false, 112) +
      arrow('M540 560V646') +
      text(24, 830, 'Deferral avoids work only when the body stays unused.', 18);
  return svg(
    'Lazy loading defers the body read until first access',
    accessDescription,
    compact ? 360 : 720,
    compact ? 1192 : 872,
    drawing,
  );
}
function lifecycle(compact) {
  const drawing = compact
    ? text(24, 32, 'A failed read', 22) +
      text(24, 60, 'leaves the body unloaded', 22) +
      card(24, 104, 312, 'Unloaded: attempt read', 'Needs an active reader.', false, 100) +
      text(24, 248, 'Outcomes', 18) +
      rect(8, 264, 344, 408, false, true) +
      arrow('M180 204V262') +
      card(24, 296, 312, 'Success: store the body', 'Release the callback.', true, 144) +
      text(40, 404, 'Later access uses memory.', 17, true) +
      card(24, 488, 312, 'Failure: propagate error', 'Keep UNLOADED and loader.', false, 144) +
      text(40, 596, 'Next access may try again.', 17, true) +
      card(24, 720, 312, 'Reader exits', 'No new body lookups.', false, 100) +
      arrow('M180 672V718') +
      text(24, 884, 'After exit', 18) +
      rect(8, 900, 344, 336, false, true) +
      arrow('M180 820V898') +
      card(24, 936, 312, 'Loaded before exit', 'Memory value stays readable.', true, 100) +
      card(24, 1092, 312, 'Unloaded at exit', 'Read rejected before SQL.', false, 100)
    : text(24, 34, 'Failure and reader exit do not mean loaded', 24) +
      card(
        24,
        84,
        672,
        'Unloaded body: attempt read',
        'Requires an active reader and usable connection.',
        false,
        88,
      ) +
      card(24, 288, 312, 'Success', 'Store body; release callback.', true, 140) +
      text(40, 392, 'Later reads use memory.', 17, true) +
      arrow('M180 172V286') +
      text(196, 230, 'success', 17, true) +
      card(384, 288, 312, 'Read fails', 'Propagate the error.', false, 140) +
      text(400, 392, 'Keep UNLOADED and loader.', 17, true) +
      arrow('M540 172V286') +
      text(556, 230, 'failure', 17, true) +
      card(24, 528, 672, 'Reader exits', 'No new body lookups allowed.', false, 88) +
      arrow('M180 428V526') +
      arrow('M540 428V526') +
      card(24, 704, 312, 'Previously loaded', 'Body readable; no SQL.', true, 104) +
      arrow('M180 616V702') +
      card(384, 704, 312, 'Still unloaded', 'Read rejected before SQL.', false, 104) +
      arrow('M540 616V702');
  return svg(
    'Deferred access has explicit failure and lifetime policies',
    lifecycleDescription,
    compact ? 360 : 720,
    compact ? 1272 : 848,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['lazy-load-access', access],
  ['lazy-load-lifecycle', lifecycle],
])
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
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await writeFile(manifestPath, JSON.stringify({ ...manifest, ...dimensions }, null, 2) + '\n');
console.log('Built Lazy Load access and lifecycle figures with separate phone layouts.');
