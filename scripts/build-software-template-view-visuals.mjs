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

const renderDescription =
  'A trusted HTML template contains name, availability, and units markers. A separate preparation step supplies raw display strings from application data. The renderer escapes those values for HTML text and substitutes them into the template, producing one HTML fragment. Template structure and request-specific data remain separate inputs.';
const boundaryDescription =
  'A product name containing an ampersand and angle brackets is encoded as HTML character references. The browser displays the original name as text rather than creating an extra element. Separately, omitting the required availability field raises a missing-field error before the buffered renderer returns HTML.';
function render(compact) {
  const d = compact
    ? text(24, 32, 'Structure and data meet', 22) +
      text(24, 60, 'at the rendering boundary', 22) +
      card(24, 104, 312, 'Trusted product.html', '<h1>${name}</h1>', false, 144) +
      text(40, 214, 'Also: availability and units.', 17, true) +
      card(24, 328, 312, 'Prepared context', 'name: A&B <Lab>', false, 176) +
      text(40, 414, 'availability: In stock', 17, true) +
      text(40, 450, 'units: 3', 17, true) +
      text(24, 568, 'Two inputs; one render operation.', 18) +
      card(24, 656, 312, 'Renderer', 'Escape values; substitute slots.', true, 144) +
      text(40, 766, 'All slots are HTML text here.', 17, true) +
      arrow('M24 176H12V712H22') +
      arrow('M336 416H348V712H338') +
      arrow('M180 800V926') +
      text(196, 864, 'HTML source', 17, true) +
      card(24, 928, 312, 'HTML fragment', '<h1>A&amp;B &lt;Lab&gt;</h1>', false, 112) +
      text(24, 1096, 'New escaped mapping per call.', 18)
    : text(24, 34, 'Trusted structure plus request-specific values', 24) +
      card(24, 100, 312, 'Trusted product.html', '<h1>${name}</h1>', false, 176) +
      text(40, 208, 'Also: availability and units.', 17, true) +
      card(384, 100, 312, 'Prepared context', 'name: A&B <Lab>', false, 176) +
      text(400, 208, 'availability: In stock', 17, true) +
      text(400, 244, 'units: 3', 17, true) +
      arrow('M180 276V398') +
      text(196, 340, 'structure', 17, true) +
      arrow('M540 276V398') +
      text(556, 340, 'raw values', 17, true) +
      card(
        24,
        400,
        672,
        'Renderer: encode values and substitute text slots',
        'The template supplies markup; values never supply markup.',
        true,
        144,
      ) +
      text(40, 510, 'All dynamic slots in this example are HTML text.', 17, true) +
      arrow('M360 544V670') +
      text(376, 610, 'render', 17, true) +
      card(24, 672, 672, 'Buffered HTML fragment', '<h1>A&amp;B &lt;Lab&gt;</h1>', false, 112) +
      text(24, 864, 'Reusable template; fresh escaped mapping for each rendering call.', 18);
  return svg(
    'Template structure and presentation data are separate render inputs',
    renderDescription,
    compact ? 360 : 720,
    compact ? 1144 : 912,
    d,
  );
}
function boundary(compact) {
  const d = compact
    ? text(24, 32, 'Keep values as text;', 22) +
      text(24, 60, 'check required fields', 22) +
      card(24, 104, 312, 'Raw name value', 'A&B <Lab>', false, 104) +
      arrow('M180 208V326') +
      text(196, 270, 'encode + render', 17, true) +
      card(24, 328, 312, 'HTML source', '<h1>A&amp;B &lt;Lab&gt;</h1>', true, 112) +
      arrow('M180 440V558') +
      text(196, 502, 'parse HTML', 17, true) +
      card(24, 560, 312, 'Browser heading text', 'A&B <Lab>', false, 144) +
      text(40, 674, 'No extra Lab element is created.', 16, true) +
      text(24, 808, 'Separate contract failure', 19) +
      card(24, 864, 312, 'Missing availability', 'KeyError before HTML returns.', true, 144) +
      text(40, 978, 'Zero units is valid data.', 17, true) +
      text(24, 1072, 'Text encoding is context-specific.', 18)
    : text(24, 34, 'Text interpretation and field contracts are distinct', 24) +
      card(24, 100, 672, 'Raw product name', 'A&B <Lab>', false, 104) +
      arrow('M360 204V310') +
      text(376, 264, 'encode + render', 17, true) +
      card(24, 312, 672, 'Encoded HTML source', '<h1>A&amp;B &lt;Lab&gt;</h1>', true, 112) +
      arrow('M360 424V534') +
      text(376, 484, 'parse HTML', 17, true) +
      card(
        24,
        536,
        672,
        'Browser heading text',
        'A&B <Lab>; no extra Lab element is created.',
        false,
        112,
      ) +
      text(24, 748, 'Separate contract failure', 20) +
      card(
        24,
        800,
        672,
        'Missing required availability',
        'KeyError before this buffered renderer returns HTML.',
        true,
        112,
      ) +
      text(
        24,
        968,
        'A zero units value is valid; an absent required field is a contract failure.',
        18,
      );
  return svg(
    'HTML text encoding and missing-field failure have separate meanings',
    boundaryDescription,
    compact ? 360 : 720,
    compact ? 1120 : 1016,
    d,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['template-view-render', render],
  ['template-view-boundary', boundary],
])
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`,
      content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[`software-engineering/${filename}`] = { width: +width, height: +height };
  }
const p = resolve(root, 'content/assets/manifest.json');
await writeFile(
  p,
  JSON.stringify({ ...JSON.parse(await readFile(p, 'utf8')), ...dimensions }, null, 2) + '\n',
);
console.log('Built Template View rendering and output-boundary diagrams with phone compositions.');
