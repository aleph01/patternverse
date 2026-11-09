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
const caption = (after) =>
  [
    text('brand', 65, 104, 'YARD / MATERIAL STUDIES'),
    text('headline', 65, 205, 'From clay to table', 38, 500),
    photo('photograph-1', 'photo', 65, 240, 480, 180),
    text('caption-1', 65, after ? 450 : 495, '01 / Bowl before firing', 18).replace(
      ' x=',
      ' data-change="y" x=',
    ),
    photo('photograph-2', 'photo2', 65, 540, 480, 180),
    text('caption-2', 65, 750, '02 / Finished stoneware', 18),
    text('url', 65, 820, 'yard.example/material-studies', 20),
  ].join('');
const schedule = (after) =>
  [
    text('brand', 65, 104, 'YARD / SATURDAY 14 NOV'),
    text('headline', 65, 205, 'A day of making', 38, 500),
    photo('photograph', 'photo', 65, 250, 480, 150),
    ...[
      ['10:00 / Clay bowl', '€45 · Tools and firing included'],
      ['13:00 / Print lab', '€30 · Paper and inks included'],
      ['16:00 / Studio tour', 'Free · No booking needed'],
    ].flatMap(([title, detail], i) => [
      text('session-' + i, 65, 455 + i * 140, title, 28, 500),
      text('detail-' + i, 65, (after ? 485 : 525) + i * 140, detail, 20).replace(
        ' x=',
        ' data-change="y" x=',
      ),
    ]),
  ].join('');
const product = (after) =>
  [
    text('brand', 65, 104, 'FIELD / WEEKEND OBJECTS'),
    text('headline', 65, 205, 'Choose your next ritual.', 36, 500),
    photo('photograph-1', 'photo', 65, 270, 200, 160),
    photo('photograph-2', 'photo2', 345, 270, 200, 160),
    text('product-1', 65, 480, 'Stoneware set', 28, 500),
    text('product-2', 345, 480, 'Drawing kit', 28, 500),
    text('spec-1', 65, 520, 'Chalk glaze · 280 ml', 18),
    text('spec-2', 345, 520, 'Paper + pencils', 18),
    ...[
      ['€24 / set', after ? '65 560' : '245 590'],
      ['€18 / kit', after ? '345 560' : '245 630'],
    ].map(
      ([value, position], i) =>
        '<g data-element="price-' +
        i +
        '" data-change="transform" transform="translate(' +
        position +
        ')">' +
        text('price-copy-' + i, 0, 0, value, 22, 500) +
        '</g>',
    ),
    text('note', 65, 750, 'Two objects · Sold separately', 22),
    text('url', 65, 820, 'field.example/objects', 20),
  ].join('');
const specs = [
  {
    name: 'proximity-material-captions',
    photo: 'audience-pottery-photo.jpg',
    photo2: 'explicit-tableware-photo.jpg',
    draw: caption,
    title: 'Material study: attach the caption to its own photograph',
    before: 'BEFORE · Caption drifts toward image 2',
    after: 'AFTER · Caption belongs with image 1',
    description:
      'Only the first caption baseline moves from y495 to y450, closer to the bottom of its own image at y420 and farther from the second image beginning at y540. The numbered wording, all other positions, typography, photographs/crops, colors, paper and lighting remain identical. Original fictional material study; photographs are generated illustrations, not documentation of the same bowl.',
    footer:
      'Only caption 1 moves upward. Words, image crops, typography, other positions, paper and lighting stay fixed.',
  },
  {
    name: 'proximity-studio-schedule',
    photo: 'form-open-studios-photo.jpg',
    draw: schedule,
    title: 'Studio schedule: give each session its own detail line',
    before: 'BEFORE · Details sit between sessions',
    after: 'AFTER · Details attach to each session',
    description:
      'Only three detail-line baselines move 40 layout units upward, from y525,665,805 to y485,625,765. Title baselines remain at y455,595,735. This makes title-to-detail intervals shorter than detail-to-next-title intervals. All text, titles, type styles, colors, photograph/crop, paper and lighting stay fixed. Original fictional schedule.',
    footer:
      'Only the three detail lines move upward. Titles, words, type, photograph, crop and presentation stay fixed.',
  },
  {
    name: 'proximity-product-prices',
    photo: 'explicit-tableware-photo.jpg',
    photo2: 'scale-workshop-photo-v2.jpg',
    draw: product,
    title: 'Product sheet: place each price with its own product',
    before: 'BEFORE · Prices form a separate cluster',
    after: 'AFTER · Prices sit with their products',
    description:
      'Only two price-group translations change: €24 / set moves from (245,590) to (65,560), and €18 / kit from (245,630) to (345,560). Product names, specifications, all other positions, words, typography, photographs/crops, colors, paper and lighting are identical. Original fictional products; selected generated photographs are illustrative.',
    footer:
      'Only the two prices move. Product photos, crops, names, specifications, typography and presentation stay fixed.',
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
console.log('Built three proximity comparisons and their stacked versions.');
