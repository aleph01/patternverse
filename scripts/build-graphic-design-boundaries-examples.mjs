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
const outline = (id, x, y, width, height, extra = '') =>
  `<rect data-element="${id}" x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${ink}" stroke-width="2"${extra}/>`;
const sessions = (after) =>
  [
    text('brand', 65, 104, 'YARD / WEEKEND PROGRAMME'),
    photo('photograph', 'photo', 65, 160, 480, 220),
    text('headline', 65, 435, 'Saturday sessions', 38, 500),
    `<g data-element="session-regions" data-change="opacity" opacity="${after ? 1 : 0}">${outline('morning-region', 65, 465, 480, 135)}${outline('afternoon-region', 65, 625, 480, 135)}</g>`,
    text('morning-title', 85, 503, 'Clay bowl', 28, 500),
    text('morning-place', 365, 503, 'Studio 1', 22),
    text('morning-time', 85, 544, '10:00–12:00', 22),
    text('morning-price', 365, 544, '€45 / person', 20),
    text('morning-inclusion', 85, 582, 'Clay, tools and firing included.', 20),
    text('afternoon-title', 85, 663, 'Print a tote', 28, 500),
    text('afternoon-place', 365, 663, 'Studio 2', 22),
    text('afternoon-time', 85, 704, '14:00–16:00', 22),
    text('afternoon-price', 365, 704, '€35 / person', 20),
    text('afternoon-inclusion', 85, 742, 'One tote and all inks included.', 20),
    text('footer', 65, 820, '14 Nov · Book at yard.example/sessions', 20),
  ].join('');
const delivery = (after) =>
  [
    text('brand', 65, 104, 'FIELD / STUDIO TABLEWARE'),
    photo('photograph', 'photo', 65, 160, 480, 220),
    text('headline', 65, 435, 'Choose your set', 38, 500),
    `<rect data-element="left-region" data-change="height" x="65" y="465" width="225" height="${after ? 140 : 285}" fill="none" stroke="${ink}" stroke-width="2"/>`,
    outline('right-region', 320, 465, 225, 140),
    text('left-title', 85, 505, 'Mug set', 28, 500),
    text('right-title', 340, 505, 'Bowl set', 28, 500),
    text('left-price', 85, 545, '€24 / 2 pieces', 20),
    text('right-price', 340, 545, '€32 / 2 pieces', 20),
    text('left-material', 85, 581, 'Chalk stoneware', 20),
    text('right-material', 340, 581, 'Chalk stoneware', 20),
    text('shared-scope', 85, 655, 'Both sets:', 22, 500),
    text('delivery-charge', 85, 690, 'Delivery €6', 22),
    text('dispatch', 85, 725, 'Dispatch in 3 days', 20),
    text('footer', 65, 820, 'field.example/tableware', 20),
  ].join('');
const offers = (after) =>
  [
    text('brand', 65, 104, 'COMMON / DAY PASSES'),
    photo('photograph', 'photo', 65, 160, 480, 220),
    text('headline', 65, 435, 'Choose a workday', 38, 500),
    `<path data-element="offer-regions" data-change="d" d="${after ? 'M65 455H295V750H65ZM315 455H545V750H315Z' : [455, 515, 575, 635, 695].map((y) => `M65 ${y}H545V${y + 55}H65Z`).join('')}" fill="none" stroke="${ink}" stroke-width="2"/>`,
    text('desk-title', 85, 492, 'Desk', 28, 500),
    text('studio-title', 335, 492, 'Studio', 28, 500),
    text('desk-price', 85, 552, '€18 / day', 22),
    text('studio-price', 335, 552, '€30 / day', 22),
    text('desk-hours', 85, 612, '09:00–18:00', 22),
    text('studio-hours', 335, 612, '09:00–21:00', 22),
    text('desk-space', 85, 672, 'Shared room', 22),
    text('studio-space', 335, 672, 'Private room', 22),
    text('desk-action', 85, 732, 'Book desk →', 22, 500),
    text('studio-action', 335, 732, 'Book studio →', 22, 500),
    text('footer', 65, 820, 'Wi-Fi + coffee included · common.example', 20),
  ].join('');
const specs = [
  {
    name: 'boundaries-session-records',
    photo: 'form-open-studios-photo.jpg',
    draw: sessions,
    title: 'Session programme: one region for each complete record',
    before: 'BEFORE · Columns without containers',
    after: 'AFTER · One region per session',
    description:
      'Only the two session outline opacity values, in one shared group, change from 0 to 1. The session names, locations, times, prices and inclusions occupy identical positions. Copy, type, photo source/crop, paper and lighting remain fixed. Original fictional programme.',
    footer:
      'Only session outlines appear. All copy, positions, typography, photograph, crop and presentation stay fixed.',
  },
  {
    name: 'boundaries-shared-delivery',
    photo: 'explicit-tableware-photo.jpg',
    draw: delivery,
    title: 'Shared delivery terms: remove misleading offer-specific enclosure',
    before: 'BEFORE · Shared terms inside one offer',
    after: 'AFTER · Shared terms outside both',
    description:
      'Only the left offer outline height changes from 285 to 140 layout units. The right outline stays fixed. Both-set delivery and dispatch copy remain in their original positions, now outside both option regions. All typography, copy, photograph/crop, paper and lighting are identical. Original fictional supply sheet.',
    footer:
      'Only the left outline becomes shorter. Every word, position, type style, image and presentation stays fixed.',
  },
  {
    name: 'boundaries-offer-membership',
    photo: 'audience-workspace-photo.jpg',
    draw: offers,
    title: 'Day-pass offers: choose whether boundaries represent attributes or offers',
    before: 'BEFORE · A region for each attribute',
    after: 'AFTER · A region for each offer',
    description:
      'Only the boundary path changes: five horizontal attribute regions become two vertical offer regions. Every heading, price, access time, room type, booking label, image/crop, font, size, color, position, paper and lighting remains fixed. Original fictional print comparison; booking labels are not functioning controls.',
    footer:
      'Only the boundary path changes. Words, positions, typography, photograph, crop and presentation stay fixed.',
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
console.log('Built three common-region comparisons and their stacked versions.');
