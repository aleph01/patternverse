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
const gaze = (after) =>
  [
    text('brand', 65, 104, 'YARD / OPEN STUDIO'),
    text('headline', 65, 208, 'Clay, up close.', 48, 500),
    text('subhead', 65, 255, 'Meet the maker behind the work.'),
    `<svg data-element="portrait-frame" x="55" y="300" width="245" height="367.5" viewBox="0 0 1024 1536"><use data-element="portrait-orientation" data-change="transform" href="#photo" transform="${after ? 'matrix(1 0 0 1 0 0)' : 'matrix(-1 0 0 1 1024 0)'}"/></svg>`,
    text('invitation-1', 335, 408, 'See clay', 28, 500),
    text('invitation-2', 335, 448, 'take shape.', 28, 500),
    text('date', 335, 510, 'Sat 14 Nov'),
    text('time', 335, 548, '11:00–16:00'),
    text('entry', 335, 606, 'Free entry'),
    text('venue', 65, 752, 'Yard Studios · 8 Foundry Lane'),
    text('url', 65, 804, 'yard.example/openstudio'),
  ].join('');
const detail = (after) => {
  const path = after ? 'M90 687V670Q90 660 105 650L234 506' : 'M90 687V665';
  return [
    text('brand', 65, 104, 'REPAIR NOTES / CLOSE LOOK'),
    text('headline', 65, 208, 'A repair worth seeing.', 40, 500),
    text('subhead', 65, 255, 'Keep the mend visible.'),
    photo(31, 285, 548, 365.333333),
    `<g data-element="leader" fill="none" stroke-linecap="round" stroke-linejoin="round"><path data-element="leader-halo" data-change="d" d="${path}" stroke="#fffdf6" stroke-width="6"/><path data-element="leader-line" data-change="d" d="${path}" stroke="${ink}" stroke-width="2"/><circle data-element="leader-end" data-change="cx cy" cx="${after ? 234 : 90}" cy="${after ? 506 : 665}" r="4" fill="${ink}" stroke="#fffdf6" stroke-width="2"/></g>`,
    text('caption-title', 65, 727, 'Visible repair', 30, 500),
    text('caption-1', 65, 765, 'Light stitches outline the cloth patch.'),
    text('caption-2', 65, 802, 'The mend remains part of the jacket.'),
    text('footer', 65, 841, 'Workshop journal · Autumn 2026', 16),
  ].join('');
};
const action = (after) =>
  [
    text('brand', 158, 155, 'YARD / CLAY WORKSHOP', 17),
    text('headline', 158, 215, 'A first bowl.', 36, 500),
    photo(138, 260, 334, 150),
    text('description', 158, 455, 'Hand-build a small bowl.', 19),
    text('inclusions', 158, 488, 'Materials and firing included.', 18),
    text('date', 158, 535, 'Sat 14 Nov · 10:00–12:00', 18),
    text('price', 158, 568, '€45 per person · 8 places', 18),
    `<g data-element="booking-arrow" fill="none" stroke="${ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path data-element="arrow-shaft" data-change="d" d="${after ? 'M158 608H305V674' : 'M158 608H420'}"/><path data-element="arrow-head" data-change="d" d="${after ? 'M297 666L305 674L313 666' : 'M412 600L420 608L412 616'}"/></g>`,
    `<rect data-element="booking-button" x="158" y="696" width="294" height="48" rx="4" fill="${ink}"/>`,
    text('booking-label', 229, 727, 'Reserve a place', 20, 500, '#fffdf6'),
    text('help', 158, 785, 'Questions? hello@yard.example', 15),
  ].join('');
const specifications = [
  {
    name: 'guide-maker-gaze',
    photo: 'guide-maker-portrait.jpg',
    stage: 'scale-print-stage-v2.jpg',
    portrait: true,
    phone: false,
    draw: gaze,
    title: 'Open studio: orient a portrait toward the invitation',
    before: 'BEFORE · Gaze leaves the page',
    after: 'AFTER · Gaze faces the invitation',
    description:
      'Only the photograph is reflected horizontally within its unchanged portrait frame. Identical source bytes, crop extent, text, typography, positions, colors, paper and lighting are reused. The fictional artist faces the invitation in the revision; no observed gaze path or response improvement is claimed.',
    footer:
      'Only portrait orientation changes. All copy, framing, typography and presentation stay fixed.',
  },
  {
    name: 'guide-repair-detail',
    photo: 'core-message-repair-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    phone: false,
    draw: detail,
    title: 'Repair journal: connect the caption with the photographed patch',
    before: 'BEFORE · Rule stops in the margin',
    after: 'AFTER · Leader reaches the patch',
    description:
      'Only the path and endpoint of an existing caption leader change. It extends from the caption margin to the visible patch in the same unaltered photograph. Wording, caption position, font sizes, colors, crop, paper and lighting stay fixed. The leader is an authored overlay, not a photographed mark.',
    footer: 'Only the leader route and endpoint change. Photo, caption, type and paper stay fixed.',
  },
  {
    name: 'guide-booking-arrow',
    photo: 'audience-pottery-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    phone: true,
    draw: action,
    title: 'Workshop booking: give an arrow a useful destination',
    before: 'BEFORE · Arrow points into space',
    after: 'AFTER · Arrow leads to booking',
    description:
      'Only the two path geometries of the arrow change. The revised arrow bends down and ends above the existing Reserve a place button. The button, complete copy, prices, fonts, positions, photo/crop, phone and lighting stay identical. Fictional static layout, not a working booking interface.',
    footer:
      'Only the arrow route changes. Copy, button, imagery, typography and positions stay fixed.',
  },
];
for (const s of specifications) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${await embedded(s.stage)}"/><image id="photo" width="${s.portrait ? 1024 : 1536}" height="${s.portrait ? 1536 : 1024}" href="${await embedded(s.photo)}"/></defs>`;
  const metadata = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse teaching example. Generated photographic artwork, authored typography and cues. ${escape(s.description)}</metadata>`;
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
console.log('Built three directional-cue comparisons and their stacked versions.');
