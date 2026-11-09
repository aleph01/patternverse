import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f';
const background = '#e8e5dc';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (name) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, name))).toString('base64')}`;
const text = (id, x, y, value, size, adapt = '', weight = 400) =>
  `<text data-element="${id}"${adapt ? ` data-adapt="${adapt}"` : ''} x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${ink}">${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;

const pottery = (after) =>
  [
    text('brand', 65, 104, 'CLAY ROOM / BEGINNER WORKSHOP', 22),
    text('headline-1', 65, 207, after ? 'Make your' : 'Coils, slabs', 64, 'text', 500),
    text('headline-2', 65, 284, after ? 'first clay pot.' : 'and scoring.', 64, 'text', 500),
    photo(31, 333, 548, 235),
    text(
      'description-1',
      65,
      623,
      after ? 'Build with coils or flat pieces.' : 'Handbuilding with coils and slabs.',
      24,
      'text',
    ),
    text(
      'description-2',
      65,
      657,
      after ? 'Learn how to join the pieces.' : 'Slip-and-score joining.',
      24,
      'text',
    ),
    text('date', 65, 719, 'SAT 18 MAY · 14:00–16:00', 26),
    text('price', 65, 763, '€28 · Clay and tools included', 24),
    text('condition', 65, 807, 'No experience needed · Firing included', 22),
    text('booking', 65, 839, 'Book: clayroom.example/workshops', 18),
  ].join('');

const museum = (after) =>
  [
    text('brand', 65, 104, 'MUSEUM / ARRIVAL', 22),
    text('headline-1', 65, 207, 'Visitor', 56, '', 500),
    text('headline-2', 65, 284, 'information.', 56, '', 500),
    photo(31, 320, 548, 210),
    text(
      'directions-1',
      65,
      625,
      after ? 'Tickets & information' : 'Tickets and information are at',
      after ? 38 : 24,
      'text font-size y',
    ),
    text(
      'directions-2',
      65,
      665,
      after ? 'Ground-floor desk' : 'the ground-floor desk. The collection',
      after ? 28 : 24,
      'text font-size y',
    ),
    text(
      'directions-3',
      65,
      after ? 735 : 705,
      after ? 'Collection upstairs' : 'is upstairs. Lift access is beside',
      after ? 38 : 24,
      'text font-size y',
    ),
    text(
      'directions-4',
      65,
      after ? 785 : 745,
      after ? 'Lift beside the desk' : 'the desk.',
      after ? 28 : 24,
      'text font-size y',
    ),
  ].join('');

const dayPass = (after) =>
  [
    text('brand', 158, 155, 'WORKROOM / BOOK A DAY', 18),
    text('headline-1', 158, 215, 'Workroom', 36, '', 500),
    text('headline-2', 158, 260, 'day passes.', 36, '', 500),
    photo(138, 300, 334, 125),
    text('primary-1', 158, 475, after ? 'Day pass €18' : '24 desks · 2 floors', 22, 'text'),
    text('primary-2', 158, 515, after ? 'Mon–Fri · 09:00–18:00' : '3 meeting rooms', 22, 'text'),
    text('primary-3', 158, 555, after ? 'Desk and Wi-Fi included' : 'Wi-Fi included', 22, 'text'),
    text(
      'secondary-1',
      158,
      610,
      after ? '24 desks · 2 floors' : 'Day pass €18 · Mon–Fri',
      18,
      'text',
    ),
    text(
      'secondary-2',
      158,
      640,
      after ? '3 meeting rooms' : '09:00–18:00 · Desk included',
      18,
      'text',
    ),
    text('secondary-3', 158, 670, 'Meeting rooms booked separately', 18),
    '<rect data-element="button" x="158" y="710" width="292" height="44" rx="5" fill="#17352f"/>',
    '<text data-element="button-label" x="177" y="738" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#f4f1e7">Check available desks</text>',
    text('url', 158, 785, 'workroom.example', 16),
  ].join('');

const specifications = [
  {
    name: 'audience-pottery-poster',
    photo: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    title: 'Pottery workshop: make the invitation understandable to a novice',
    description:
      'Before: Coils, slabs / and scoring. After: Make your / first clay pot. Two supporting lines also explain the techniques in everyday language. Only four text nodes change. All photography, crop, typography, layout, event facts, colors, paper and lighting are identical.',
    before: 'BEFORE · Insider vocabulary',
    after: 'AFTER · A beginner can enter',
    footer:
      'Only invitation and explanation words change. All event facts and visual treatment stay fixed.',
    draw: pottery,
  },
  {
    name: 'audience-museum-sign',
    photo: 'audience-museum-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    title: 'Museum arrival: adapt directions to a glance at an entrance',
    description:
      'The same ticket desk, upstairs collection and lift information changes from a small paragraph to two separated groups with larger labels. Only four direction text nodes, their type sizes and baselines change. Title, photograph, crop, paper, colors and all other styling remain identical. This is not a validated accessible wayfinding system.',
    before: 'BEFORE · Reading a paragraph',
    after: 'AFTER · Finding the next step',
    footer:
      'Directions are regrouped and enlarged. Title, facts, photo, crop, colors and presentation stay fixed.',
    draw: museum,
  },
  {
    name: 'audience-day-pass-phone',
    photo: 'audience-workspace-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    title: 'Coworking day pass: prioritize the visitor’s booking decision',
    description:
      'Before: capacity and meeting-room counts lead. After: day-pass price, opening hours, desk and Wi-Fi inclusion lead. The same facts remain; only five text nodes change to redistribute information. Meeting rooms are booked separately in both. Image, crop, phone, typography, sizes, positions, button, colors and lighting are identical. Fictional static mockup.',
    before: 'BEFORE · Premises facts lead',
    after: 'AFTER · Day-pass details lead',
    footer:
      'Only fact placement in five text nodes changes. All facts and visual treatment stay fixed.',
    draw: dayPass,
  },
];

for (const s of specifications) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${await embedded(s.stage)}"/><image id="photo" width="1536" height="1024" href="${await embedded(s.photo)}"/></defs>`;
  const metadata = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse teaching example. Photographic illustrations are generated and identical image bytes are reused within the pair. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const full = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="1320" height="1060" fill="${background}"/>${text('before-label', 62, 44, s.before, 24, '', 500)}${text('after-label', 712, 44, s.after, 24, '', 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 22)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="660" height="2070" fill="${background}"/>${text('before-label', 62, 44, s.before, 24, '', 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 24, '', 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, `${s.name}.svg`), `${full}\n`);
  await writeFile(resolve(assets, `${s.name}-mobile.svg`), `${mobile}\n`);
}
console.log('Built three audience adaptations and identical-content stacked mobile versions.');
