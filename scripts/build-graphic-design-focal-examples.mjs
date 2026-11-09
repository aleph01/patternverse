import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f',
  paperWhite = '#fffdf6';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (name) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, name))).toString('base64')}`;
const text = (id, x, y, value, size = 22, weight = 400, fill = ink, extra = '') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const poster = (after) =>
  [
    text('brand', 65, 104, 'YARD / SATURDAY PROGRAM', 22),
    text(
      'lead',
      65,
      190,
      'Open studios',
      50,
      after ? 700 : 400,
      ink,
      ' data-intervention="weight"',
    ),
    text('talks', 65, 257, 'Talks & tours', 50),
    text('shop', 65, 324, 'Shop & café', 50),
    photo(31, 353, 548, 205),
    text('date', 65, 630, 'Sat 18 May · 11:00–17:00', 24),
    text('venue', 65, 680, 'Yard Studios · 8 Mill Lane', 24),
    text('admission', 65, 740, 'Free entry · All ages welcome', 22),
    text('url', 65, 800, 'yard.example/open', 22),
  ].join('');
const price = (after) =>
  [
    text('brand', 65, 104, 'YARD / STUDIO SHOP', 22),
    text('headline-1', 65, 207, 'Stoneware mug', 32, 500),
    text('headline-2', 65, 260, 'Small-batch studio pottery', 24),
    photo(31, 300, 548, 240),
    text('material', 65, 580, 'Handmade stoneware', 22),
    text('glaze', 65, 625, 'Warm ivory glaze', 22),
    text('capacity', 65, 670, 'Capacity · 300 ml', 22),
    `<g data-intervention="isolation" transform="translate(${after ? 360 : 65} 725)">${text('price', 0, 0, '€24', 32, 500)}${text('scope', 0, 44, 'Price is for mug only.', 18)}${text('exclusion', 0, 80, 'Saucer sold separately.', 18)}</g>`,
  ].join('');
const button = (id, y, label, after, secondary = false) => {
  const change = secondary ? ' data-intervention="secondary-paint"' : '';
  return `<g data-action="${id}"><rect data-element="${id}-surface" x="158" y="${y}" width="294" height="48" rx="4" fill="${after && secondary ? 'none' : ink}" stroke="${ink}" stroke-width="2"${change}/>${text(id + '-label', 178, y + 30, label, 18, 500, after && secondary ? ink : paperWhite, change)}</g>`;
};
const booking = (after) =>
  [
    text('brand', 158, 155, 'YARD / BOOKING CONFIRMED', 18),
    text('headline-1', 158, 215, "You're", 36, 500),
    text('headline-2', 158, 260, 'booked.', 36, 500),
    photo(138, 300, 334, 125),
    text('activity', 158, 465, 'Clay workshop · Sat 18 May', 18),
    text('time-place', 158, 497, '10:00–12:00 · Yard Studios', 18),
    button('ticket', 550, 'Download ticket', after),
    button('calendar', 620, 'Add to calendar', after, true),
    button('directions', 690, 'Get directions', after, true),
    text('contact', 158, 782, 'Help: hello@yard.example', 16),
  ].join('');
const specifications = [
  {
    name: 'focal-open-studios',
    photo: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    phone: false,
    title: 'Open-studio poster: give the event identity a leading role',
    before: 'BEFORE · Three equal headlines',
    after: 'AFTER · Event identity leads',
    draw: poster,
    description:
      'Only Open studios changes font weight, from 400 to 700. All font sizes, other weights, text, baselines, left anchors, photographs/crops, paper, colors and lighting remain identical. No scale change. Fictional poster.',
    footer: 'Only Open studios changes weight: 400 → 700. Every font size stays fixed.',
  },
  {
    name: 'focal-pottery-price',
    photo: 'explicit-tableware-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    phone: false,
    title: 'Pottery card: isolate the pricing unit within practical details',
    before: 'BEFORE · One information column',
    after: 'AFTER · Pricing unit isolated',
    draw: price,
    description:
      'Only the complete three-line pricing unit moves horizontally, from x65 to x360, preserving its baseline, words, scope, exclusion, internal spacing, fonts, sizes, weights and colors. All other elements and photographic presentation remain fixed. Local focal-point proposal, not a claim about first fixation. Fictional product card.',
    footer: 'Only the intact pricing unit moves sideways. Its scope and exclusion travel with it.',
  },
  {
    name: 'focal-booking-action',
    photo: 'audience-pottery-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    phone: true,
    title: 'Booking summary: reserve the filled treatment for the ticket action',
    before: 'BEFORE · Three filled actions',
    after: 'AFTER · One action leads',
    draw: booking,
    description:
      'Only the fill and label colors of Add to calendar and Get directions change to outlined treatments. Download ticket remains identical. All outlines, labels, font sizes/weights, dimensions, positions, photography/crop, phone, colors elsewhere and lighting stay fixed. Static fictional UI; no interaction is implemented.',
    footer: 'Only two secondary fills and label colors change. The ticket action stays identical.',
  },
];
for (const s of specifications) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${await embedded(s.stage)}"/><image id="photo" width="1536" height="1024" href="${await embedded(s.photo)}"/></defs>`;
  const metadata = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example; shared generated photographic artwork. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 24, 500)}${text('after-label', 712, 44, s.after, 24, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 22)}</svg>`;
  const mobileWidth = s.phone ? 480 : 660,
    mobileX = s.phone ? -65 : 25,
    labelX = s.phone ? 30 : 62;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="${mobileWidth}" height="2070" viewBox="0 0 ${mobileWidth} 2070" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="${mobileWidth}" height="2070" fill="#e8e5dc"/>${text('before-label', labelX, 44, s.before, 24, 500)}${group(false, mobileX, 70)}${text('after-label', labelX, 1064, s.after, 24, 500)}${group(true, mobileX, 1090)}${text('comparison-label', labelX, 2050, 'Fictional example · Generated photographs', s.phone ? 16 : 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three controlled focal-point comparisons and mobile variants.');
