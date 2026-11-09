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

const lookupDescription =
  'The first lookup of contact 1 misses the scoped map, selects its row, constructs a Contact, and registers its reference. A later lookup finds that entry and returns the same Contact object without selecting or constructing again.';
const scopeDescription =
  'The current scope holds a Contact named Ada Lovelace while the database row has been changed to Augusta. A map hit retains the local object. Closing the scope clears the registry; a new scope selects the row and constructs a different Contact named Augusta in this example.';
function lookup(compact) {
  const drawing = compact
    ? text(24, 32, 'Look up identity before', 22) +
      text(24, 60, 'constructing another object', 22) +
      rect(8, 84, 344, 812, true, true) +
      card(24, 112, 280, '1. get(1): map miss', 'SELECT, then construct', false, 100) +
      arrow('M164 212V302') +
      text(180, 264, 'register', 17, true) +
      card(24, 304, 280, 'Contact, ID 1', 'one stored reference', true, 100) +
      arrow('M164 404V502') +
      text(180, 460, 'refers to', 17, true) +
      card(24, 504, 280, 'One Contact object', 'name: Ada', true, 116) +
      card(24, 756, 280, '2. get(1): map hit', 'reuse; no SELECT', false, 100) +
      arrow('M304 806H336V354H306') +
      text(308, 700, 'hit', 15, true) +
      text(24, 952, 'Both paths receive this object.', 18) +
      text(24, 988, 'Within this scope only.', 17, true)
    : text(24, 34, 'Look up identity before constructing an object', 24) +
      rect(24, 84, 672, 632, true, true) +
      text(44, 116, 'One operation; one Contact scope', 18, true) +
      card(44, 152, 280, '1. get(1): map miss', 'SELECT, then construct', false, 100) +
      arrow('M184 252V334') +
      text(200, 298, 'register', 17, true) +
      card(44, 336, 280, 'Contact, ID 1', 'one stored reference', true, 100) +
      card(400, 324, 276, 'One Contact object', 'name: Ada', true, 124) +
      arrow('M324 386H398') +
      text(338, 366, 'ref', 17, true) +
      card(44, 560, 280, '2. get(1): map hit', 'reuse; no SELECT', false, 100) +
      arrow('M184 560V438') +
      text(200, 504, 'lookup', 17, true) +
      text(400, 540, 'Same reference returned', 18) +
      text(400, 574, 'No second object created', 17, true) +
      text(24, 772, 'Both paths receive the same live object within this scope.', 18);
  return svg(
    'Two lookups share one object through an Identity Map',
    lookupDescription,
    compact ? 360 : 720,
    compact ? 1032 : 816,
    drawing,
  );
}
function scope(compact) {
  const drawing = compact
    ? text(24, 32, 'Same local object', 22) +
      text(24, 60, 'does not mean fresh data', 22) +
      card(24, 104, 312, 'Current scope: Contact 1', 'name: Ada Lovelace', false, 128) +
      text(40, 206, 'Map hit retains local edits.', 17, true) +
      card(24, 288, 312, 'Stored row: Contact 1', 'name: Augusta', false, 128) +
      text(40, 390, 'Changed by direct SQL.', 17, true) +
      card(24, 504, 312, 'Close the current scope', 'Clear the map; end reuse.', true, 116) +
      text(40, 592, 'Old references may still exist.', 17, true) +
      card(24, 784, 312, 'New scope: get(1)', 'SELECT → new Contact', true, 160) +
      text(40, 902, 'name: Augusta', 20) +
      arrow('M180 620V782') +
      text(24, 1004, 'The new scope loads again.', 18) +
      text(24, 1044, 'Observed row still depends', 17, true) +
      text(24, 1072, 'on database isolation.', 17, true)
    : text(24, 34, 'One local object does not guarantee fresh data', 24) +
      card(24, 104, 312, 'Current scope: Contact 1', 'name: Ada Lovelace', false, 160) +
      text(40, 214, 'Map hit retains local edits.', 17, true) +
      card(384, 104, 312, 'Stored row: Contact 1', 'name: Augusta', false, 160) +
      text(400, 214, 'Changed by direct SQL.', 17, true) +
      card(
        24,
        360,
        672,
        'Close the current scope',
        'Clear the map; old references may still exist.',
        true,
        104,
      ) +
      arrow('M180 264V358') +
      card(
        24,
        576,
        672,
        'New scope: get(1) selects and constructs again',
        'New Contact object; name: Augusta',
        true,
        124,
      ) +
      arrow('M360 464V574') +
      text(24, 764, 'The observed row still depends on database isolation.', 18) +
      text(24, 800, 'A map hit, refresh, and a new scope have different policies.', 17, true);
  return svg(
    'Identity reuse ends at the scope boundary',
    scopeDescription,
    compact ? 360 : 720,
    compact ? 1120 : 840,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['identity-map-lookup', lookup],
  ['identity-map-scope', scope],
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
console.log('Built Identity Map lookup and scope figures with separate phone layouts.');
