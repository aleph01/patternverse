import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (name) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, name))).toString('base64')}`;
const text = (id, x, y, value, size = 24, explicit = '', weight = 400, fill = ink) =>
  `<text data-element="${id}"${explicit ? ` data-explicit="${explicit}"` : ''} x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;

const hire = (after) =>
  [
    text('brand', 158, 155, 'CLAY ROOM / SPACE HIRE', 18),
    text('headline-1', 158, 215, 'Hire the', 36, '', 500),
    text('headline-2', 158, 260, 'studio.', 36, '', 500),
    photo(138, 300, 334, 125),
    text('request-label', 158, 468, 'YOUR REQUEST', 18),
    text('date', 158, 510, 'Sat 18 May · 14:00–16:00', 20),
    text('event', 158, 550, 'Clay workshop · 8 people', 20),
    text('name', 158, 605, 'Name: Alex Morgan', 18),
    text('email', 158, 640, 'Email: alex@example.com', 18),
    after ? text('consequence', 158, 682, 'Booking is confirmed separately.', 16, 'add') : '',
    '<rect data-element="button" x="158" y="710" width="292" height="44" rx="5" fill="#17352f"/>',
    text(
      'button-label',
      177,
      738,
      after ? 'Send hire enquiry' : 'Continue',
      18,
      'replace',
      400,
      '#f4f1e7',
    ),
    text('response-time', 158, 782, 'We reply within 2 working days.', 16),
  ].join('');

const completion = (after) =>
  [
    text('brand', 65, 104, 'CLAY ROOM / SPRING PROGRAMME', 22),
    text('headline-1', 65, 207, 'Course', 54, '', 500),
    text('headline-2', 65, 284, 'completion.', 54, '', 500),
    photo(31, 320, 548, 210),
    text('figure', 65, 622, '68%', 72, '', 500),
    text('definition', 65, 667, after ? 'Attended all 4 sessions' : 'Completion', 24, 'replace'),
    after ? text('denominator', 65, 716, '68 of 100 enrolled participants', 24, 'add') : '',
    text('cohort', 65, 775, 'Spring 2026 · Four-session course', 22),
    text('limitation', 65, 819, 'No assessment or skill rating recorded', 18),
  ].join('');

const tableware = (after) =>
  [
    text('brand', 65, 104, 'CLAY ROOM / TABLEWARE', 22),
    text('headline-1', 65, 207, 'Breakfast', 54, '', 500),
    text('headline-2', 65, 284, 'stoneware.', 54, '', 500),
    photo(31, 333, 548, 235),
    text('price', 65, 634, '€24', 48, '', 500),
    after ? text('inclusion', 65, 689, 'Price is for the mug only.', 24, 'add') : '',
    after ? text('exclusion', 65, 726, 'Saucer sold separately.', 24, 'add') : '',
    text('material', 65, 778, 'Handmade stoneware', 22),
    text('url', 65, 827, 'Shop: clayroom.example/tableware', 18),
  ].join('');

const specifications = [
  {
    name: 'explicit-hire-enquiry',
    photo: 'form-open-studios-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    title: 'Hire enquiry: state the immediate result of the action',
    before: 'BEFORE · A generic next step',
    after: 'AFTER · The action is named',
    draw: hire,
    description:
      'Only Continue changes to Send hire enquiry, with the added line Booking is confirmed separately. Request details, response time, button geometry, typography, positions, image/crop, phone, palette and lighting stay fixed. Static fictional mockup, not a working enquiry form.',
    footer: 'Only the button words and one consequence line change. All other elements stay fixed.',
  },
  {
    name: 'explicit-completion-report',
    photo: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    title: 'Completion report: define the measure and its denominator',
    before: 'BEFORE · A broad metric label',
    after: 'AFTER · A defined measure',
    draw: completion,
    description:
      'Completion changes to Attended all 4 sessions, and 68 of 100 enrolled participants is added. The 68% figure, title, cohort, limitation, photography/crop, paper, typography and positions remain identical. Invented attendance data does not measure learning or explain non-completion.',
    footer: 'Only the definition label changes and a denominator is added. The same 68% remains.',
  },
  {
    name: 'explicit-tableware-card',
    photo: 'explicit-tableware-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    title: 'Tableware product card: make the price scope explicit',
    before: 'BEFORE · Inclusion is inferred',
    after: 'AFTER · Inclusion is stated',
    draw: tableware,
    description:
      'Only two lines are added: Price is for the mug only and Saucer sold separately. The €24 price, title, material, address, shared mug-and-saucer photograph/crop, typography, positions, colors, paper and light stay identical. Fictional product card.',
    footer:
      'Only two price-scope lines are added. Price, photograph, crop and visual treatment stay fixed.',
  },
];

for (const s of specifications) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${await embedded(s.stage)}"/><image id="photo" width="1536" height="1024" href="${await embedded(s.photo)}"/></defs>`;
  const metadata = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse teaching example with generated photographic artwork. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 24, '', 500)}${text('after-label', 712, 44, s.after, 24, '', 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 22)}</svg>`;
  const phone = s.name === 'explicit-hire-enquiry';
  const mobileWidth = phone ? 480 : 660;
  const mobileX = phone ? -65 : 25;
  const labelX = phone ? 30 : 62;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="${mobileWidth}" height="2070" viewBox="0 0 ${mobileWidth} 2070" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="${mobileWidth}" height="2070" fill="#e8e5dc"/>${text('before-label', labelX, 44, s.before, 24, '', 500)}${group(false, mobileX, 70)}${text('after-label', labelX, 1064, s.after, 24, '', 500)}${group(true, mobileX, 1090)}${text('comparison-label', labelX, 2050, 'Fictional example · Generated photographs', phone ? 16 : 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three meaning-explicit photographic comparisons and mobile versions.');
