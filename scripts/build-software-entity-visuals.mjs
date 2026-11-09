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

const continuityDescription =
  'Equipment studio / 42 is registered with label Camera, renamed Camera B, and reconstructed as another object from a serialized record. The identity stays studio / 42 across all three representations.';
const comparisonDescription =
  'Three comparisons distinguish identity from state: studio / 42 with Camera B and studio / 42 with Camera C identify the same entity; studio / 42 and studio / 43 with identical labels identify different entities; rental / 42 is different from studio / 42 because the catalog scope differs.';
function incarnation(x, y, width, title, label, instance) {
  return (
    rect(x, y, width, 180) +
    text(x + 16, y + 32, title, 20) +
    rect(x + 20, y + 52, width - 40, 54, true) +
    text(x + 36, y + 86, 'studio / 42', 20) +
    text(x + 20, y + 140, label, 19) +
    text(x + 20, y + 168, instance, 17, true)
  );
}
function continuity(compact) {
  const drawing = compact
    ? text(24, 32, 'Identity continues through', 22) +
      text(24, 60, 'changes and reconstruction', 22) +
      incarnation(24, 112, 312, '1 · Register', 'Camera', 'Python object A') +
      arrow('M180 292V350') +
      incarnation(24, 352, 312, '2 · Rename', 'Camera B', 'Python object A') +
      arrow('M180 532V590') +
      incarnation(24, 592, 312, '3 · Reload from JSON', 'Camera B', 'Python object B') +
      text(24, 830, 'The complete key is preserved.', 18) +
      text(24, 870, 'Reload creates a different object,', 17, true) +
      text(24, 896, 'representing the same equipment.', 17, true)
    : text(24, 34, 'Identity continues through changes and reconstruction', 24) +
      incarnation(24, 112, 200, '1 · Register', 'Camera', 'Python object A') +
      incarnation(260, 112, 200, '2 · Rename', 'Camera B', 'Python object A') +
      incarnation(496, 112, 200, '3 · Reload', 'Camera B', 'Python object B') +
      arrow('M224 202H258') +
      arrow('M460 202H494') +
      text(24, 358, 'Same EquipmentId; labels and runtime instances can differ.', 19) +
      text(24, 400, 'Reload reuses the serialized catalog and number.', 18) +
      text(
        24,
        438,
        'The key identifies equipment, not a particular snapshot of its state.',
        17,
        true,
      );
  return svg(
    'Continuing equipment identity across changes and representations',
    continuityDescription,
    compact ? 360 : 720,
    compact ? 932 : 480,
    drawing,
  );
}
function comparison(compact) {
  const drawing = compact
    ? text(24, 32, 'Compare Equipment identity', 22) +
      text(24, 60, 'separately from its state', 22) +
      text(24, 112, '1 · Same identity', 21) +
      rect(24, 132, 312, 150, true) +
      text(40, 168, 'studio / 42 · Camera B', 19) +
      text(40, 204, 'studio / 42 · Camera C', 19) +
      text(40, 256, 'Equal identity; different state.', 17) +
      text(24, 350, '2 · Different number', 21) +
      rect(24, 370, 312, 150) +
      text(40, 406, 'studio / 42 · Camera B', 19) +
      text(40, 442, 'studio / 43 · Camera B', 19) +
      text(40, 494, 'Same label; different entities.', 17) +
      text(24, 588, '3 · Different catalog', 21) +
      rect(24, 608, 312, 150) +
      text(40, 644, 'studio / 42 · Camera B', 19) +
      text(40, 680, 'rental / 42 · Camera B', 19) +
      text(40, 732, 'Same number; different scope.', 17) +
      text(24, 820, 'Equal identity does not mean', 18) +
      text(24, 850, 'equal or current state.', 18)
    : text(24, 34, 'Compare Equipment identity separately from state', 24) +
      text(24, 92, '1 · Matching identity can accompany different state', 20) +
      card(24, 112, 284, 'studio / 42', 'Camera B', true, 104) +
      card(412, 112, 284, 'studio / 42', 'Camera C', true, 104) +
      text(350, 176, '=', 28) +
      text(24, 254, 'Same entity; the two objects are independent.', 18) +
      text(24, 318, '2 · Matching labels do not establish identity', 20) +
      card(24, 338, 284, 'studio / 42', 'Camera B', false, 104) +
      card(412, 338, 284, 'studio / 43', 'Camera B', false, 104) +
      text(350, 402, '≠', 28) +
      text(24, 480, 'Different assigned numbers.', 18) +
      text(24, 544, '3 · The catalog scopes the number', 20) +
      card(24, 564, 284, 'studio / 42', 'Camera B', false, 104) +
      card(412, 564, 284, 'rental / 42', 'Camera B', false, 104) +
      text(350, 628, '≠', 28) +
      text(24, 706, 'Different catalogs, even with the same number.', 18);
  return svg(
    'Identity equality, attribute equality, and identifier scope',
    comparisonDescription,
    compact ? 360 : 720,
    compact ? 888 : 746,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['entity-continuity', continuity],
  ['entity-comparison', comparison],
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
console.log('Built Entity continuity and comparison figures with separate phone layouts.');
