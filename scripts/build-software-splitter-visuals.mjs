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

const partsDescription =
  'Order event E901 for O42 contains L1 with two BOOK units and L2 with one MUG unit. Splitter creates two immutable child messages, retaining parent E901 and order O42. Each child has its own line ID and one-based position within a two-part sequence.';
const boundariesDescription =
  'A bounded input is fully validated before two children are returned. An invalid second line instead raises SplitError and returns no children. Later publication is a separate boundary: child L1 can be accepted while sending L2 fails, leaving a partial delivery that requires recovery.';
function parts(compact) {
  const drawing = compact
    ? text(24, 34, 'One parent, distinct children', 23) +
      card(24, 112, 312, 'Order event E901', 'Order: O42', false, 200) +
      text(40, 212, 'L1: BOOK / 2 units', 18, true) +
      text(40, 256, 'L2: MUG / 1 unit', 18, true) +
      arrow('M180 312V398') +
      text(196, 362, 'extract', 17, true) +
      card(48, 400, 288, 'Splitter', 'Validate all, then construct.', true, 100) +
      arrow('M48 450H12V670H46') +
      arrow('M12 670V990H46') +
      card(48, 560, 288, 'Child L1', 'Key: (E901, L1)', false, 232) +
      text(64, 658, 'Order: O42 / SKU: BOOK', 17, true) +
      text(64, 702, 'Quantity: 2 units', 18, true) +
      text(64, 750, 'Position: 1 / size: 2', 17, true) +
      card(48, 880, 288, 'Child L2', 'Key: (E901, L2)', false, 232) +
      text(64, 978, 'Order: O42 / SKU: MUG', 17, true) +
      text(64, 1022, 'Quantity: 1 unit', 18, true) +
      text(64, 1070, 'Position: 2 / size: 2', 17, true) +
      text(24, 1184, 'Arrows: create child messages.', 17) +
      text(24, 1228, 'Position does not order completion.', 16, true)
    : text(24, 34, 'One composite input becomes distinct work', 24) +
      rect(24, 112, 672, 176) +
      text(40, 144, 'Order event E901 / order O42', 21) +
      text(40, 196, 'L1: BOOK / 2 units', 19, true) +
      text(400, 196, 'L2: MUG / 1 unit', 19, true) +
      text(40, 250, 'Each line has its own identity, even when SKUs repeat.', 18, true) +
      arrow('M360 288V382') +
      text(376, 340, 'extract', 17, true) +
      card(224, 384, 272, 'Splitter', 'Validate all, then construct.', true, 100) +
      arrow('M360 484V560H180V638') +
      arrow('M360 560H540V638') +
      card(24, 640, 312, 'Child L1', 'Key: (E901, L1)', false, 208) +
      text(40, 738, 'Order: O42 / SKU: BOOK', 18, true) +
      text(40, 778, 'Quantity: 2 units', 18, true) +
      text(40, 822, 'Position: 1 / size: 2', 18, true) +
      card(384, 640, 312, 'Child L2', 'Key: (E901, L2)', false, 208) +
      text(400, 738, 'Order: O42 / SKU: MUG', 18, true) +
      text(400, 778, 'Quantity: 1 unit', 18, true) +
      text(400, 822, 'Position: 2 / size: 2', 18, true) +
      text(24, 936, 'Arrows: create child messages; they do not represent worker completion.', 18) +
      text(
        24,
        980,
        'Key = immutable parent event + line identity, not sequence position.',
        18,
        true,
      );
  return svg(
    'Splitter: child identity and parent context',
    partsDescription,
    compact ? 360 : 720,
    compact ? 1280 : 1032,
    drawing,
  );
}
function boundaries(compact) {
  const drawing = compact
    ? text(24, 34, 'Construction is not delivery', 23) +
      rect(24, 104, 312, 504, true, true) +
      text(40, 140, 'Inside split_order', 21) +
      card(40, 184, 280, 'All lines valid', 'Return 2 immutable children.', true, 112) +
      card(40, 352, 280, 'Second line: 0 units', 'SplitError; no children returned.', false, 144) +
      text(56, 458, 'First line cannot escape early.', 16, true) +
      text(40, 560, 'No publication happens here.', 18, true) +
      rect(24, 704, 312, 416, false, true) +
      text(40, 742, 'Later: caller publishes', 21) +
      card(40, 792, 280, 'L1: broker accepts', 'L2: send fails', false, 112) +
      text(40, 968, 'Partial delivery needs recovery.', 17) +
      text(40, 1012, 'Replay can repeat child L1.', 17, true) +
      text(40, 1060, 'Stable keys enable deduplication;', 16, true) +
      text(40, 1088, 'they do not perform it.', 16, true) +
      text(24, 1192, 'No atomic publication is promised.', 17)
    : text(24, 34, 'A local return value is not an atomic publication', 24) +
      rect(24, 104, 672, 408, true, true) +
      text(40, 140, 'Inside split_order: validate before returning', 22) +
      card(40, 184, 264, 'All lines valid', 'L1: 2 units / L2: 1 unit', false, 112) +
      arrow('M304 240H398') +
      card(400, 184, 280, 'Return 2 children', 'Immutable local values', true, 112) +
      card(40, 352, 264, 'Invalid second line', 'L1: 2 units / L2: 0 units', false, 112) +
      arrow('M304 408H398') +
      card(400, 352, 280, 'Raise SplitError', 'No children returned', false, 112) +
      rect(24, 608, 672, 304, false, true) +
      text(40, 648, 'Later: caller publishes the valid children', 22) +
      card(40, 688, 280, 'Child L1', 'Broker accepts', true, 100) +
      card(376, 688, 304, 'Child L2', 'Send fails', false, 100) +
      text(40, 844, 'Partial delivery needs recovery. A replay can repeat L1.', 19) +
      text(40, 884, 'Stable keys support deduplication; they do not perform it.', 18, true) +
      text(
        24,
        996,
        'Local validation cannot roll back a broker acceptance or a business effect.',
        18,
      );
  return svg(
    'Splitter: validation and publication boundaries',
    boundariesDescription,
    compact ? 360 : 720,
    compact ? 1248 : 1048,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['splitter-parts', parts],
  ['splitter-boundaries', boundaries],
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
console.log('Built two Splitter diagrams with separate phone compositions.');
