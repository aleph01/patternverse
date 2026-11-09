import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f',
  paper = '#fffdf6',
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
    text('headline-1', 65, 205, 'After', 64, 500),
    text('headline-2', 65, 284, 'hours.', 64, 500),
    text('description', 65, 327, 'Art, sound and late openings'),
    photo('photograph', 'photo', after ? 285 : 65, 360, 260, 265, ' data-change="x"'),
    text('date', 65, 690, 'Sat 14 Nov · 18:00–23:00', 26),
    text('venue', 65, 736, 'Riverside Glasshouse'),
    text('price', 65, 780, 'Entry €12 · Students €8'),
    text('url', 65, 828, 'cityarts.example/nightgarden', 20),
  ].join('');
const courses = [
  {
    id: 'clay',
    source: 'photo',
    title: 'Clay bowl',
    description: 'Hand-build a bowl.',
    inclusion: 'Materials included.',
    date: 'Sat 14 Nov · 10:00',
    price: '€45 · 8 places',
  },
  {
    id: 'print',
    source: 'photo2',
    title: 'Print lab',
    description: 'Explore relief print.',
    inclusion: 'Paper and inks included.',
    date: 'Sun 15 Nov · 14:00',
    price: '€30 · 10 places',
  },
];
const workshops = (after) =>
  [
    text('brand', 65, 104, 'YARD / WEEKEND WORKSHOPS'),
    text('headline', 65, 205, 'Make something.', 42, 500),
    text('description', 65, 253, 'Two sessions. Find your starting point.'),
    ...courses.map((course, i) => {
      const change = i === 0;
      return `<g data-element="${course.id}-panel" transform="translate(${65 + i * 252} 310)"><rect data-element="panel-surface"${change ? ' data-change="fill"' : ''} x="0" y="0" width="228" height="450" rx="4" fill="${change && !after ? ink : panel}" stroke="${ink}" stroke-opacity="0.2"/>${photo('course-photograph', course.source, 14, 14, 200, 134)}<g data-element="panel-copy"${change ? ' data-change="fill"' : ''} fill="${change && !after ? paper : ink}">${text('course-title', 14, 189, course.title, 30, 500, null)}${text('course-description', 14, 227, course.description, 18, 400, null)}${text('course-inclusion', 14, 255, course.inclusion, 18, 400, null)}${text('course-date', 14, 310, course.date, 18, 400, null)}${text('course-price', 14, 350, course.price, 20, 400, null)}${text('course-welcome', 14, 414, 'Beginners welcome', 18, 400, null)}</g></g>`;
    }),
    text('booking', 65, 824, 'Book at yard.example/workshops'),
  ].join('');
const study = (after) =>
  [
    text('brand', 65, 104, 'YARD / MATERIAL STUDIES'),
    text('headline', 65, 205, 'Clay, in the making.', 40, 500),
    photo('photograph', 'photo', 65, 285, 280, 260),
    `<g data-element="study-identifier" data-change="font-weight" font-weight="${after ? 700 : 400}">${['CLAY', 'STUDY', '01'].map((word, i) => `<text data-element="identifier-${i}" x="385" y="${365 + 43 * i}" font-family="Arial, Helvetica, sans-serif" font-size="32" fill="${ink}">${word}</text>`).join('')}</g>`,
    text('caption-1', 385, 505, 'Tableware', 18),
    text('caption-2', 385, 535, 'in progress', 18),
    text('edition', 385, 575, 'Autumn 2026', 16),
    text('footer-heading', 65, 700, 'Work in progress', 30, 500),
    text('footer-copy', 65, 744, 'An open look at materials and process.'),
    text('url', 65, 814, 'yard.example/material-studies', 20),
  ].join('');
const specs = [
  {
    name: 'balance-evening-invitation',
    photo: 'scale-greenhouse-photo-v2.jpg',
    draw: invitation,
    title: 'Invitation: distribute existing visual mass',
    before: 'BEFORE · Weight gathers on the left',
    after: 'AFTER · Photo provides a counterpoint',
    description:
      'Only the fixed-size greenhouse photograph moves horizontally from x65 to x285. Its y360 position, 260 by 265 frame, crop, image bytes and all text, fonts, sizes, weights, colors, positions, paper and lighting remain unchanged. Original fictional event; the proposed balance is an editorial judgment, not a measured viewer response.',
    footer:
      'Only the photo moves horizontally. Its size/crop, every word and all typography stay fixed.',
  },
  {
    name: 'balance-peer-workshops',
    photo: 'audience-pottery-photo.jpg',
    photo2: 'scale-workshop-photo-v2.jpg',
    draw: workshops,
    title: 'Peer workshops: reduce the weight of an unnecessary dark panel',
    before: 'BEFORE · Equal boxes, unequal weight',
    after: 'AFTER · Lighter treatment for peers',
    description:
      'Only the left card background changes from dark green to pale ivory and its text from ivory to dark green. The right card is untouched. Card geometry, complete copy, typography, positions, photographs/crops, paper and lighting stay fixed. Original fictional peer workshops, with no intended featured course.',
    footer:
      'Only the left panel and its text colors change. Geometry, photographs and typography stay fixed.',
  },
  {
    name: 'balance-material-study',
    photo: 'explicit-tableware-photo.jpg',
    draw: study,
    title: 'Material study: strengthen a compact typographic counterweight',
    before: 'BEFORE · Compact identifier recedes',
    after: 'AFTER · Dark type counters pale image',
    description:
      'Only the CLAY STUDY 01 identifier changes from font-weight 400 to 700. Font family, 32-unit size, copy, positions/baselines, line breaks, color, photograph/crop, paper and lighting remain fixed. The compact dark identifier offers an asymmetric counterweight to a larger pale photograph; no numerical equality of visual weight is claimed.',
    footer:
      'Only the identifier font weight changes. Size, anchors, line breaks, image and other type stay fixed.',
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
console.log('Built three visual-weight comparisons and their stacked versions.');
