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

const contractDescription =
  'Carrier schema 1 supplies event E901, parcel P42, gross_kg as the decimal string 1.250, and state R. Mapping carrier-a-v1/warehouse-v2 preserves event and parcel identity, converts kilograms to 1250 integer grams, and maps the documented carrier code R to ready_for_pickup. Warehouse schema 2 receives a newly constructed message with mapping provenance.';
const rejectionDescription =
  'A known carrier status R and weight 1.250 kilograms produce a complete output with 1250 grams. Unknown state X produces a TranslationError without output. Weight 1.2505 kilograms would require 1250.5 grams, which the target cannot represent; it is rejected instead of rounded. Original input stays unchanged, and error retention belongs to the caller.';
function contract(compact) {
  const d = compact
    ? text(24, 32, 'Translate units and meanings', 22) +
      card(24, 104, 312, 'Carrier schema 1', 'source: carrier-a', false, 208) +
      text(40, 198, 'E901 / parcel P42', 17, true) +
      text(40, 234, 'gross_kg: "1.250"', 18, true) +
      text(40, 270, 'state: R', 18, true) +
      arrow('M180 312V398') +
      text(196, 362, 'translate', 17, true) +
      card(24, 400, 312, 'Mapping: carrier-a-v1', 'Target: warehouse-v2', true, 208) +
      text(40, 494, '1.250 kg × 1000 = 1250 g', 17, true) +
      text(40, 530, 'R → ready_for_pickup', 17, true) +
      text(40, 566, 'Keep source and event identity.', 16, true) +
      arrow('M180 608V694') +
      card(24, 696, 312, 'Warehouse schema 2', 'source_system: carrier-a', false, 256) +
      text(40, 790, 'event_id: E901 / parcel_id: P42', 17, true) +
      text(40, 826, 'gross_mass_g: 1250', 18, true) +
      text(40, 862, 'pickup_state: ready_for_pickup', 17, true) +
      text(40, 910, 'Mapping version travels with output.', 15, true) +
      text(24, 1040, 'Gross mass means the same thing.', 17) +
      text(24, 1080, 'Whole grams only; no rounding.', 17, true)
    : text(24, 34, 'Translate a contract without inventing meaning', 24) +
      rect(24, 100, 672, 160) +
      text(40, 130, 'Carrier schema 1', 20) +
      text(40, 174, 'source: carrier-a / event: E901', 17, true) +
      text(40, 214, 'parcel: P42', 17, true) +
      text(400, 174, 'gross_kg: "1.250"', 19, true) +
      text(400, 214, 'state: R', 19, true) +
      arrow('M360 260V350') +
      text(376, 310, 'translate', 17, true) +
      rect(24, 352, 672, 208, true) +
      text(40, 384, 'Mapping: carrier-a-v1/warehouse-v2', 20) +
      text(40, 426, 'Identity: carrier-a / E901 / P42', 18, true) +
      text(40, 462, "Gross mass: Decimal('1.250') × 1000 = 1250 g", 18, true) +
      text(40, 498, 'Carrier state: R → ready_for_pickup; D → dispatched', 18, true) +
      text(40, 534, 'Reject unsupported code, precision, or mass range.', 17, true) +
      arrow('M360 560V654') +
      rect(24, 656, 672, 192) +
      text(40, 688, 'Warehouse schema 2', 20) +
      text(40, 730, 'source_system: carrier-a', 17, true) +
      text(40, 766, 'event_id: E901 / parcel_id: P42', 17, true) +
      text(400, 730, 'gross_mass_g: 1250', 18, true) +
      text(400, 766, 'pickup_state: ready_for_pickup', 17, true) +
      text(40, 814, 'mapping_version: carrier-a-v1/warehouse-v2', 17, true) +
      text(24, 928, 'Same gross mass. No rounding, enrichment, or reverse mapping is implied.', 17);
  return svg(
    'Message Translator: a directional parcel contract',
    contractDescription,
    compact ? 360 : 720,
    compact ? 1136 : 984,
    d,
  );
}
function rejection(compact) {
  const d = compact
    ? text(24, 32, 'Translate completely or report failure', 20) +
      card(24, 104, 312, 'Valid code and precision', '1.250 kg / state R', true, 144) +
      text(40, 198, '1250 g / ready_for_pickup', 17, true) +
      card(24, 336, 312, 'Unknown code', '1.250 kg / state X', false, 144) +
      text(40, 430, 'TranslationError; no target.', 17, true) +
      card(24, 568, 312, 'Unsupported precision', '1.2505 kg / state R', false, 176) +
      text(40, 662, '1250.5 g cannot fit whole grams.', 16, true) +
      text(40, 706, 'TranslationError; no target.', 17, true) +
      text(24, 832, 'Original input remains unchanged.', 17) +
      text(24, 876, 'No status guessing or rounding.', 17, true) +
      text(24, 940, 'Caller owns error retention.', 17, true)
    : text(24, 34, 'A parseable value can still be untranslatable', 24) +
      card(24, 104, 312, 'Valid code and precision', '1.250 kg / state R', false, 128) +
      arrow('M336 168H382') +
      card(384, 104, 312, 'Complete target', '1250 g / ready_for_pickup', true, 128) +
      card(24, 336, 312, 'Unknown source code', '1.250 kg / state X', false, 128) +
      arrow('M336 400H382') +
      card(384, 336, 312, 'TranslationError', 'Unknown carrier state', false, 128) +
      card(24, 568, 312, 'Unsupported precision', '1.2505 kg / state R', false, 128) +
      arrow('M336 632H382') +
      card(384, 568, 312, 'TranslationError', '1250.5 g is not whole grams.', false, 128) +
      text(24, 816, 'All checks pass before target construction.', 18) +
      text(24, 856, 'On error: no target returned; original input unchanged.', 18) +
      text(24, 896, 'Caller owns retention and investigation.', 17, true);
  return svg(
    'Message Translator: unsupported meaning and precision',
    rejectionDescription,
    compact ? 360 : 720,
    compact ? 984 : 952,
    d,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['message-translator-contract', contract],
  ['message-translator-rejection', rejection],
])
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`,
      content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[`software-engineering/${filename}`] = { width: +width, height: +height };
  }
const manifest = resolve(root, 'content/assets/manifest.json');
await writeFile(
  manifest,
  JSON.stringify({ ...JSON.parse(await readFile(manifest, 'utf8')), ...dimensions }, null, 2) +
    '\n',
);
console.log('Built two Message Translator diagrams with phone compositions.');
