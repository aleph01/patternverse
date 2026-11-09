import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f',
  panel = '#f1eee5';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const text = (id, x, y, value, size = 22, weight = 400, fill = ink) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}"${fill === null ? '' : ` fill="${fill}"`}>${escape(value)}</text>`;
const photo = (id, source, x, y, width, height, extra = '') =>
  `<svg data-element="${id}"${extra} x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#${source}"/></svg>`;
const invitation = (after) =>
  [
    text('brand', 65, 104, 'CITY ARTS / NIGHT GARDEN'),
    text('headline-1', 65, 210, 'After', 64, 500),
    text('headline-2', 65, 280, 'hours.', 64, 500),
    text('description', 65, 320, 'Art, sound and late openings'),
    photo('photograph', 'photo', 65, after ? 420 : 340, 480, 230, ' data-change="y"'),
    text('date', 65, 720, 'Sat 14 Nov · 18:00–23:00', 26),
    text('venue', 65, 764, 'Riverside Glasshouse · Entry €12'),
    text('url', 65, 820, 'cityarts.example/nightgarden', 20),
  ].join('');
const workshop = (after) =>
  [
    text('brand', 65, 104, 'YARD / WEEKEND WORKSHOP'),
    photo('photograph', 'photo', 65, 150, 480, 180),
    text('headline', 65, 385, 'Open studio: print lab', 34, 500),
    text('bring', 65, after ? 440 : 425, 'BRING', 20, 700).replace(' x=', ' data-change="y" x='),
    text('bring-1', 65, 475, 'An apron or clothes you can mark.'),
    text('bring-2', 65, 505, 'Paper, inks and tools are provided.'),
    text('access', 65, after ? 565 : 550, 'GETTING HERE', 20, 700).replace(
      ' x=',
      ' data-change="y" x=',
    ),
    text('access-1', 65, 600, 'Yard Studio · 18 Mill Lane'),
    text('access-2', 65, 630, 'Step-free entrance via the courtyard.'),
    text('book', 65, after ? 690 : 675, 'BOOK', 20, 700).replace(' x=', ' data-change="y" x='),
    text('book-1', 65, 725, 'Sun 15 Nov · 14:00–16:00 · €30'),
    text('book-2', 65, 755, '10 places · Beginners welcome'),
    text('url', 65, 820, 'yard.example/print-lab', 20),
  ].join('');
const product = (after) =>
  [
    text('brand', 65, 104, 'FIELD / OBJECTS FOR EVERY DAY'),
    photo('photograph', 'photo', 65, 160, 480, 270),
    '<rect data-element="product-panel" x="65" y="500" width="480" height="260" rx="4" fill="' +
      panel +
      '" stroke="' +
      ink +
      '" stroke-opacity="0.25"/>',
    '<g data-element="panel-copy" data-change="transform" transform="translate(' +
      (after ? '22 22' : '0 0') +
      ')">' +
      [
        text('product-title', 75, 535, 'Everyday stoneware', 30, 500),
        text('product-spec', 75, 577, 'Mug + saucer · Chalk glaze', 22),
        text('product-price', 75, 622, '€24 / set', 30, 500),
        text('product-care', 75, 667, 'Dishwasher safe · 280 ml', 20),
        text('product-note', 75, 710, 'Small glaze variations are natural.', 20),
      ].join('') +
      '</g>',
    text('url', 65, 820, 'field.example/tableware', 20),
  ].join('');
const specs = [
  {
    name: 'space-evening-invitation',
    photo: 'scale-greenhouse-photo-v2.jpg',
    draw: invitation,
    title: 'Invitation: reallocate space around the message',
    before: 'BEFORE · Photo crowds the message',
    after: 'AFTER · A deliberate pause',
    description:
      'Only the greenhouse photograph moves down by 80 layout units, from y340 to y420. Its 480 by 230 frame, crop and image bytes stay fixed. All copy, typography, colors, text positions, paper and lighting remain identical. Space is transferred from below the photograph to above it, not created by deleting content. Original fictional event.',
    footer:
      'Only the photograph moves down. Every word, type style, image crop and frame size stays fixed.',
  },
  {
    name: 'space-workshop-details',
    photo: 'form-open-studios-photo.jpg',
    draw: workshop,
    title: 'Workshop sheet: make gaps express relationships',
    before: 'BEFORE · Headings float between groups',
    after: 'AFTER · Gaps distinguish the groups',
    description:
      'Only BRING, GETTING HERE and BOOK move down by 15 layout units each. The gap from each heading baseline to the following first line changes from 50 to 35 units; gaps from a preceding body line to the next heading grow from 45 to 60 units. All content, type, body-line positions, photograph/crop, paper and lighting remain fixed. Original fictional workshop.',
    footer:
      'Only the three section headings move down by 15 units. All body lines and the photograph stay fixed.',
  },
  {
    name: 'space-product-card',
    photo: 'explicit-tableware-photo.jpg',
    draw: product,
    title: 'Product card: distribute space inside a boundary',
    before: 'BEFORE · Copy hugs the top-left edge',
    after: 'AFTER · Room inside the same card',
    description:
      'Only the complete copy group inside the product panel translates 22 layout units right and 22 down. Panel geometry, every word, type style, internal line spacing, photograph/crop, page, paper and lighting stay identical. The left inset grows from 10 to 32 units while excess room at the right and bottom is reduced. Original fictional product.',
    footer:
      'Only the card copy moves right and down. The panel, type, line breaks and photograph stay fixed.',
  },
];
const stage = await embedded('scale-print-stage-v2.jpg');
for (const s of specs) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${stage}"/><image id="photo" width="1536" height="1024" href="${await embedded(s.photo)}"/>${s.photo2 ? `<image id="photo2" width="1536" height="1024" href="${await embedded(s.photo2)}"/>` : ''}</defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example. Selected generated photographs; separately authored print design. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${text('after-label', 712, 44, s.after, 23, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 21)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="660" height="2070" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 23, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three negative-space comparisons and their stacked versions.');
