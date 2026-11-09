import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const text = (id, x, y, value, size = 22, weight = 400, fill = ink) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}"${fill === null ? '' : ` fill="${fill}"`}>${escape(value)}</text>`;
const photo = (id, source, x, y, width, height, extra = '') =>
  `<svg data-element="${id}"${extra} x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#${source}"/></svg>`;
const offer = (after) =>
  [
    text('brand', 65, 104, 'YARD / WEEKEND WORKSHOP'),
    text('headline', 65, 205, 'Make a clay bowl', 40, 500),
    photo('photograph', 'photo', 65, 255, 480, 230),
    '<rect data-element="offer-frame" data-change="height" x="65" y="535" width="480" height="' +
      (after ? 205 : 105) +
      '" rx="4" fill="none" stroke="' +
      ink +
      '" stroke-width="2"/>',
    text('offer-title', 85, 575, 'Saturday session · €45', 28, 500),
    text('offer-date', 85, 615, '14 Nov · 10:00–12:00', 22),
    text('offer-inclusion', 85, 665, 'Clay, tools and firing included.', 22),
    text('offer-collection', 85, 705, 'Collect your bowl after firing.', 22),
    text('welcome', 65, 785, 'Beginners welcome · 8 places', 22),
    text('url', 65, 830, 'yard.example/clay-bowl', 20),
  ].join('');
const poster = (after) =>
  [
    text('brand', 65, 104, 'YARD / OPEN STUDIO SATURDAY'),
    photo('photograph', 'photo', 65, 160, 480, 600),
    '<rect data-element="text-field" data-change="opacity" x="85" y="450" width="440" height="225" rx="2" fill="#fffdf6" opacity="' +
      (after ? 1 : 0) +
      '"/>',
    text('headline', 105, 515, 'Open studio', 42, 500),
    text('description', 105, 557, 'Meet the makers.', 26),
    text('date', 105, 613, 'Sat 14 Nov · 10:00–17:00', 20),
    text('entry', 105, 649, 'Free entry · Yard Studio', 20),
    text('url', 65, 820, 'yard.example/open-studio', 20),
  ].join('');
const product = (after) =>
  [
    text('brand', 65, 104, 'FIELD / OBJECTS FOR EVERY DAY'),
    photo('photograph', 'photo', 65, 160, 480, 270),
    '<rect data-element="outer-frame" x="65" y="490" width="480" height="270" rx="4" fill="none" stroke="' +
      ink +
      '" stroke-width="2" stroke-opacity="0.6"/>',
    ...[555, 603, 651, 699].map(
      (y, i) =>
        '<rect data-element="inner-frame-' +
        i +
        '" data-change="stroke-opacity" x="80" y="' +
        y +
        '" width="450" height="' +
        (i === 3 ? 46 : 48) +
        '" fill="none" stroke="' +
        ink +
        '" stroke-width="1" stroke-opacity="' +
        (after ? 0 : 0.35) +
        '"/>',
    ),
    text('product-title', 96, 535, 'Everyday stoneware', 30, 500),
    text('product-spec', 96, 586, 'Mug + saucer · Chalk glaze', 22),
    text('product-price', 96, 634, '€24 / set · 280 ml', 22),
    text('product-care', 96, 682, 'Dishwasher safe', 22),
    text('product-variation', 96, 730, 'Natural glaze variation', 20),
    text('url', 65, 820, 'field.example/tableware', 20),
  ].join('');
const specs = [
  {
    name: 'frame-workshop-offer',
    photo: 'audience-pottery-photo.jpg',
    draw: offer,
    title: 'Workshop offer: include the information the frame should hold',
    before: 'BEFORE · The frame stops at the date',
    after: 'AFTER · Price and inclusions together',
    description:
      'Only the offer outline height changes from 105 to 205 layout units. Its top, width, stroke and corner radius stay fixed. The larger outline includes the materials/firing and collection lines as well as date and price. All words, type styles, positions, photo/crop, paper and lighting are identical. Original fictional workshop.',
    footer:
      'Only the outline height changes. Every word, position, type style, photograph, crop and presentation stays fixed.',
  },
  {
    name: 'frame-open-studio',
    photo: 'form-open-studios-photo.jpg',
    draw: poster,
    title: 'Open-studio poster: create a defined field for text',
    before: 'BEFORE · Text sits across image detail',
    after: 'AFTER · A quiet field behind the text',
    description:
      'Only the existing ivory text-field opacity changes from 0 to 1. Its x85 y450 width440 height225 geometry stays fixed. The complete source photograph, frame/crop, text colors, words, fonts, sizes, weights and positions, paper and lighting remain identical. The opaque panel covers part of the image without replacing or recropping it. Original fictional poster.',
    footer:
      'Only the panel opacity changes. Text, image source/crop, geometry, colors, typography and presentation stay fixed.',
  },
  {
    name: 'frame-product-details',
    photo: 'explicit-tableware-photo.jpg',
    draw: product,
    title: 'Product details: keep the frame at the meaningful level',
    before: 'BEFORE · Every detail has its own box',
    after: 'AFTER · One boundary for one product',
    description:
      'Only four inner rectangle stroke-opacity values change from 0.35 to 0. Their geometry remains present but invisible. The outer product frame, all text, copy, positions, typography, photo/crop, paper and lighting stay fixed. Original fictional static product sheet, not editable fields.',
    footer:
      'Only four inner strokes disappear. The outer frame, copy, type, spacing, photograph and presentation stay fixed.',
  },
];
const stage = await embedded('scale-print-stage-v2.jpg');
for (const s of specs) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${stage}"/>${(await Promise.all(['photo', 'photo2', 'photo3', 'photo4'].filter((key) => s[key]).map(async (key) => `<image id="${key}" width="1536" height="1024" href="${await embedded(s[key])}"/>`))).join('')}</defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example. Selected generated photographs; separately authored print design. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${text('after-label', 712, 44, s.after, 23, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 21)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="660" height="2070" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 23, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three framing comparisons and their stacked versions.');
