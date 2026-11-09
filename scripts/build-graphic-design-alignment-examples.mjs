import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const text = (id, x, y, value, size = 22, weight = 400, fill = ink) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const poster = (after) =>
  [
    text('brand', 65, 104, 'YARD / SATURDAY REPAIR'),
    text('headline', 65, 205, 'Keep it going.', 48, 500),
    `<g data-element="deck" data-change="transform" transform="translate(${after ? 65 : 95} 260)">${text('deck-copy', 0, 0, 'Repair clothes and small objects.', 24)}</g>`,
    photo(65, 320, 480, 240),
    `<g data-element="practical-details" data-change="transform" transform="translate(${after ? 65 : 85} 625)">${text('date', 0, 0, 'Sat 14 Nov · 10:00–14:00', 26)}${text('entry', 0, 46, 'Free drop-in · Tools provided', 24)}</g>`,
    text('venue', 65, 736, 'Yard Studios · 8 Foundry Lane'),
    `<g data-element="web-address" data-change="transform" transform="translate(${after ? 65 : 95} 802)">${text('url', 0, 0, 'yard.example/repair', 24)}</g>`,
  ].join('');
const costs = (after) =>
  [
    text('brand', 65, 104, 'YARD / EVENT PLANNING'),
    text('headline', 65, 205, 'Open studio', 48, 500),
    text('subhead', 65, 255, 'Cost estimate · 14 November', 24),
    photo(65, 285, 480, 170),
    text('item-heading', 65, 500, 'ITEM', 18, 700),
    text('room-label', 65, 558, 'Room hire'),
    text('materials-label', 65, 614, 'Materials'),
    text('printing-label', 65, 670, 'Printing'),
    `<path data-element="total-rule" d="M65 704H545" stroke="${ink}" stroke-opacity="0.35"/>`,
    text('total-label', 65, 760, 'Total', 26, 700),
    `<g data-element="amount-column" data-change="transform text-anchor" transform="translate(${after ? 545 : 455} 0)" text-anchor="${after ? 'end' : 'middle'}">${text('cost-heading', 0, 500, 'COST (€)', 18, 700)}${text('room-cost', 0, 558, '120.00', 30)}${text('materials-cost', 0, 614, '45.00', 30)}${text('printing-cost', 0, 670, '8.00', 30)}${text('total-cost', 0, 760, '173.00', 30, 700)}</g>`,
    text('footer', 65, 820, 'Illustrative costs · All amounts in euros', 18),
  ].join('');
const card = (after) =>
  [
    text('brand', 158, 155, 'YARD / WORKSHOPS', 18),
    text('headline', 158, 215, 'Choose a session.', 32, 500),
    `<rect data-element="card-boundary" x="148" y="280" width="314" height="445" rx="6" fill="none" stroke="${ink}" stroke-opacity="0.25"/>`,
    photo(168, 300, 274, 165),
    `<g data-element="card-copy" data-change="transform" transform="translate(${after ? 168 : 148} 500)">${text('course-name', 0, 0, 'A first bowl', 28, 500)}${text('date', 0, 41, 'Sat 14 Nov · 10:00–12:00', 17)}${text('price', 0, 78, '€45 · Materials included', 18)}${text('capacity', 0, 112, '8 places · Book by 7 Nov', 17)}</g>`,
    `<rect data-element="booking-button" x="168" y="650" width="274" height="48" rx="4" fill="${ink}"/>`,
    text('booking-label', 229, 681, 'Reserve a place', 20, 500, '#fffdf6'),
    text('help', 158, 784, 'Questions? hello@yard.example', 15),
  ].join('');
const specifications = [
  {
    name: 'alignment-repair-poster',
    photo: 'core-message-repair-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    phone: false,
    draw: poster,
    title: 'Repair poster: share a useful left edge',
    before: 'BEFORE · Several left edges',
    after: 'AFTER · One shared left edge',
    description:
      'Only the horizontal positions of the deck, practical-details group and web address change: x95, x85 and x95 become x65. All text, typography, vertical positions, internal spacing, photograph/crop, paper and lighting remain fixed. Original fictional event.',
    footer:
      'Only three text groups move horizontally. Copy, vertical positions, photo and type stay fixed.',
  },
  {
    name: 'alignment-cost-sheet',
    photo: 'scale-workshop-photo-v2.jpg',
    stage: 'scale-print-stage-v2.jpg',
    phone: false,
    draw: costs,
    title: 'Cost estimate: align comparable amounts to one right edge',
    before: 'BEFORE · Amounts are centered',
    after: 'AFTER · Amounts share a right edge',
    description:
      'Only the amount-column horizontal anchor and text alignment change, from centered at x455 to right-aligned at x545. The numeric header follows the same rule. Every value, label, font, size, weight, row baseline, rule, photograph/crop, paper and lighting remains fixed. Invented cost data; amounts all have two decimal places.',
    footer:
      'Only numeric-column alignment changes. Values, formatting, rows, typography and photo stay fixed.',
  },
  {
    name: 'alignment-workshop-card',
    photo: 'audience-pottery-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    phone: true,
    draw: card,
    title: 'Workshop card: align copy with inset content, not the outer box',
    before: 'BEFORE · Copy follows box edge',
    after: 'AFTER · Copy follows content edge',
    description:
      'Only the intact four-line card-copy group moves horizontally from x148 to x168. It shares the existing image and button left edge, twenty units inside the unchanged card boundary. All copy, fonts, sizes, weights, vertical positions, image/crop, button, phone and lighting remain fixed. Original fictional static page.',
    footer:
      'Only the four-line copy group moves horizontally. Card, image, button and typography stay fixed.',
  },
];
for (const s of specifications) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${await embedded(s.stage)}"/><image id="photo" width="1536" height="1024" href="${await embedded(s.photo)}"/></defs>`;
  const metadata = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse teaching example. Selected generated photographs; precisely authored typography and layout. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 24, 500)}${text('after-label', 712, 44, s.after, 24, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 21)}</svg>`;
  const width = s.phone ? 480 : 660,
    x = s.phone ? -65 : 25,
    lx = s.phone ? 30 : 62;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="2070" viewBox="0 0 ${width} 2070" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="${width}" height="2070" fill="#e8e5dc"/>${text('before-label', lx, 44, s.before, 24, 500)}${group(false, x, 70)}${text('after-label', lx, 1064, s.after, 24, 500)}${group(true, x, 1090)}${text('comparison-label', lx, 2050, 'Fictional example · Generated photographs', s.phone ? 16 : 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three alignment comparisons and their stacked versions.');
