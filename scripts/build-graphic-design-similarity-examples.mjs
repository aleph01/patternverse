import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f',
  terracotta = '#92442f',
  cream = '#f4f1e7';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const text = (id, x, y, value, size = 22, weight = 400, fill = ink) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}"${fill === null ? '' : ` fill="${fill}"`}>${escape(value)}</text>`;
const photo = (id, source, x, y, width, height, extra = '') =>
  `<svg data-element="${id}"${extra} x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#${source}"/></svg>`;
const program = (after) =>
  [
    text('brand', 65, 104, 'YARD / SATURDAY 14 NOV'),
    text('headline', 65, 205, 'Make time. Take a tour.', 36, 500),
    photo('photograph', 'photo', 65, 250, 480, 150),
    ...[
      ['10:00 / Clay bowl', '€45 · 2 hours', 'WORKSHOP'],
      ['11:00 / Studio tour', 'Free · 45 minutes', 'TOUR'],
      ['13:00 / Print lab', '€30 · 2 hours', 'WORKSHOP'],
      ['16:00 / Studio tour', 'Free · 45 minutes', 'TOUR'],
    ].flatMap(([title, detail, category], i) => {
      const tour = after ? category === 'TOUR' : i > 1;
      const mark = i === 1 || i === 2 ? ' data-change="fill rx"' : '';
      return [
        text('session-' + i, 65, 455 + i * 105, title, 25, 500),
        text('detail-' + i, 65, 484 + i * 105, detail, 18),
        '<rect data-element="badge-' +
          i +
          '"' +
          mark +
          ' x="413" y="' +
          (431 + i * 105) +
          '" width="132" height="32" rx="' +
          (tour ? 2 : 16) +
          '" fill="' +
          (tour ? terracotta : ink) +
          '"/>',
        text('category-' + i, 425, 453 + i * 105, category, 15, 500, cream),
      ];
    }),
  ].join('');
const prices = (after) =>
  [
    text('brand', 65, 104, 'FIELD / WEEKEND OBJECTS'),
    text('headline', 65, 205, 'Objects for slow weekends.', 34, 500),
    photo('photograph-1', 'photo', 65, 270, 200, 160),
    photo('photograph-2', 'photo2', 345, 270, 200, 160),
    text('product-1', 65, 480, 'Stoneware set', 28, 500),
    text('product-2', 345, 480, 'Drawing kit', 28, 500),
    text('spec-1', 65, 520, 'Chalk glaze · 280 ml', 18),
    text('spec-2', 345, 520, 'Paper + pencils', 18),
    text('price-1', 65, 575, '€24 / set', 26, 400),
    text('price-2', 345, 575, '€18 / kit', 26, 400).replace(
      'font-family="Arial, Helvetica, sans-serif"',
      'data-change="font-family font-style" font-style="' +
        (after ? 'normal' : 'italic') +
        '" font-family="' +
        (after ? 'Arial, Helvetica, sans-serif' : 'Georgia, Times New Roman, serif') +
        '"',
    ),
    text('note', 65, 750, 'Two objects · Sold separately', 22),
    text('url', 65, 820, 'field.example/objects', 20),
  ].join('');
const booking = (after) =>
  [
    text('brand', 158, 155, 'YARD / BOOKING', 18),
    text('headline', 158, 215, 'Clay bowl', 36, 500),
    text('subhead', 158, 257, 'Saturday session', 24),
    photo('photograph', 'photo', 138, 290, 334, 130),
    text('date', 158, 465, '14 Nov · 10:00–12:00', 20),
    text('inclusion', 158, 500, '€45 · Materials included', 20),
    '<rect data-element="status-surface" data-change="opacity" x="158" y="545" width="292" height="44" rx="5" fill="' +
      ink +
      '" opacity="' +
      (after ? 0 : 1) +
      '"/>',
    text('status', 178, 573, '8 places available', 18, 400, after ? ink : cream).replace(
      ' x=',
      ' data-change="fill" x=',
    ),
    '<rect data-element="book-surface" x="158" y="615" width="292" height="44" rx="5" fill="' +
      ink +
      '"/>',
    text('book', 178, 643, 'Book a place', 18, 400, cream),
    '<rect data-element="access-surface" x="158" y="685" width="292" height="44" rx="5" fill="' +
      ink +
      '"/>',
    text('access', 178, 713, 'Ask about access', 18, 400, cream),
    text('url', 158, 785, 'yard.example/workshops', 16),
  ].join('');
const specs = [
  {
    name: 'similarity-studio-program',
    photo: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: program,
    title: 'Studio program: match the repeated category, not adjacent rows',
    before: 'BEFORE · Styles follow adjacent pairs',
    after: 'AFTER · Styles follow the categories',
    description:
      'Only badge 1 and badge 2 fill and corner-radius attributes change. The 11:00 tour changes from green pill to terracotta square-cornered badge, and the 13:00 workshop changes in the opposite direction. Workshops now share green pills and tours share terracotta rectangles. Explicit WORKSHOP and TOUR text is present in both. All wording, type, dimensions, positions, photograph/crop, paper and lighting stay fixed. Original fictional program.',
    footer:
      'Only two badge fills and corner radii change. Labels, type, positions, photograph and presentation stay fixed.',
  },
  {
    name: 'similarity-product-prices',
    photo: 'explicit-tableware-photo.jpg',
    photo2: 'scale-workshop-photo-v2.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: prices,
    title: 'Product sheet: give equivalent price fields a shared type treatment',
    before: 'BEFORE · Price fields use different type',
    after: 'AFTER · Price fields share a type role',
    description:
      'Only the drawing-kit price changes font-family from Georgia to Arial and font-style from italic to normal. Both prices remain at font-size26 and weight400, on the same fixed baseline and anchors. All copy, other typography, product positions, image bytes/crops, colors, paper and lighting stay fixed. Original fictional products with illustrative generated photographs.',
    footer:
      'Only the second price family and style change. Sizes, weights, anchors, words, photos and crops stay fixed.',
  },
  {
    name: 'similarity-booking-controls',
    photo: 'audience-pottery-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    draw: booking,
    title: 'Booking screen: reserve shared button styling for actual actions',
    before: 'BEFORE · Status resembles an action',
    after: 'AFTER · Actions retain button styling',
    description:
      'Only the noninteractive availability background opacity changes from 1 to 0 and its text fill from cream to dark green. The two action surfaces and labels are unchanged. All wording, type styles/sizes, positions, spacing, photograph/crop, phone and lighting stay fixed. Availability remains static information in both versions; Book a place and Ask about access are intended actions. Original fictional static mockup, not a working interface.',
    footer:
      'Only the status surface visibility and text fill change. Copy, controls, positions, photo and phone stay fixed.',
  },
];
for (const s of specs) {
  const stage = await embedded(s.stage);
  const defs = `<defs><image id="stage" width="610" height="915" href="${stage}"/>${(await Promise.all(['photo', 'photo2', 'photo3', 'photo4'].filter((key) => s[key]).map(async (key) => `<image id="${key}" width="1536" height="1024" href="${await embedded(s[key])}"/>`))).join('')}</defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example. Selected generated photographs; separately authored typography and layout. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${text('after-label', 712, 44, s.after, 23, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 21)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="660" height="2070" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 23, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three similarity comparisons and their stacked versions.');
