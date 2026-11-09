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
const text = (id, x, y, value, size = 20, weight = 400) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${ink}">${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const module = (id, lines, phone = false) =>
  `<g data-unit="${id}">${text(id + '-heading', 0, 0, lines[0], phone ? 16 : 22, 500)}${text(id + '-line-1', 0, 31, lines[1], phone ? 17 : 20)}${text(id + '-line-2', 0, 60, lines[2], phone ? 17 : 20)}</g>`;
const sequence = (order, units, phone = false) =>
  `<g data-intervention="sequence">${order.map((id, i) => module(id, units[id], phone).replace('<g data-unit=', `<g transform="translate(${phone ? 158 : 65} ${phone ? 452 + i * 102 : 552 + i * 99})" data-unit=`)).join('')}</g>`;
const eventUnits = {
  book: ['BOOK YOUR PLACE', 'Book by 10 June', 'gardenclub.example/supper'],
  evening: ['THE EVENING', 'Shared supper · €12 per person', 'Greenhouse courtyard · 4 Park Lane'],
  visit: ['DATE & ARRANGEMENTS', 'Fri 14 June · 18:00–20:00', 'Bring a bowl and spoon'],
};
const event = (after) =>
  [
    text('brand', 158, 155, 'GARDEN CLUB / SUMMER TABLE', 18),
    text('headline-1', 158, 215, 'Garden', 36, 500),
    text('headline-2', 158, 260, 'supper.', 36, 500),
    photo(138, 300, 334, 125),
    sequence(after ? ['evening', 'visit', 'book'] : ['book', 'evening', 'visit'], eventUnits, true),
    text('footer', 158, 782, 'Outdoor tables · Indoors if wet', 16),
  ].join('');
const handoffUnits = {
  approve: ['Approve proof', 'Check the emailed proof.', 'Reply to approve before printing.'],
  export: [
    'Export artwork',
    'Save a PDF of the final design.',
    'Use your order number as its name.',
  ],
  upload: ['Upload file', 'Open the link in your order email.', 'Upload the PDF for this order.'],
};
const handoff = (after) =>
  [
    text('brand', 65, 104, 'YARD PRINT / FIRST ORDER', 22),
    text('headline-1', 65, 207, 'Artwork', 54, 500),
    text('headline-2', 65, 284, 'handoff.', 54, 500),
    photo(31, 333, 548, 200),
    sequence(
      after ? ['export', 'upload', 'approve'] : ['approve', 'export', 'upload'],
      handoffUnits,
    ),
  ].join('');
const reportUnits = {
  method: [
    'HOW WE COUNTED',
    'Checkout log · Two calendar months',
    'Renewals excluded · Counts are loans',
  ],
  finding: ['WHAT CHANGED', '120 loans in April → 156 in May', '30% more loans · Not unique users'],
  limits: [
    'LIMITS OF THE FINDING',
    'Cause of increase not established.',
    'No comparison branch was tracked.',
  ],
};
const report = (after) =>
  [
    text('brand', 65, 104, 'RIVER LIBRARY / LAPTOP LOANS', 22),
    text('headline-1', 65, 207, 'Service', 54, 500),
    text('headline-2', 65, 284, 'review.', 54, 500),
    photo(31, 333, 548, 200),
    sequence(
      after ? ['finding', 'method', 'limits'] : ['method', 'finding', 'limits'],
      reportUnits,
    ),
  ].join('');
const specifications = [
  {
    name: 'sequence-informed-invitation',
    photo: 'chunk-garden-supper-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    phone: true,
    title: 'Invitation: context before the booking request',
    before: 'BEFORE · Booking request first',
    after: 'AFTER · Context before booking',
    draw: event,
    description:
      'Only the vertical order of three intact content units changes. Evening details and date/arrangements precede the booking request. All words, units, type styles, left anchors, photographs/crops, phone, colors, lighting and footer remain identical. Fictional static invitation.',
    footer: 'Only intact content units change order. Every word and style remains.',
  },
  {
    name: 'sequence-artwork-handoff',
    photo: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    phone: false,
    title: 'Artwork handoff: dependencies before dependent actions',
    before: 'BEFORE · Alphabetical reference',
    after: 'AFTER · Workflow order',
    draw: handoff,
    description:
      'Only the vertical order of three intact units changes: Approve proof, Export artwork, Upload file becomes Export artwork, Upload file, Approve proof. Copy, units, internal spacing, typography, left anchors, photograph/crop, paper, palette and lighting remain identical. Fictional service procedure.',
    footer: 'Only unit order changes. Export → upload → approve the emailed proof.',
  },
  {
    name: 'sequence-service-review',
    photo: 'core-message-library-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    phone: false,
    title: 'Service review: finding before method, with limitations retained',
    before: 'BEFORE · Method before finding',
    after: 'AFTER · Finding before method',
    draw: report,
    description:
      'Only the first two intact units exchange vertical positions: What changed moves before How we counted. The limits unit stays in the same place. All facts, headings, units, internal spacing, typography, photograph/crop, paper, colors and lighting remain identical. Fictional descriptive data: 120 to 156 loans, a 30 percent increase, with no causal claim.',
    footer: 'Finding and method exchange positions. The limitations stay visible and fixed.',
  },
];
for (const s of specifications) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${await embedded(s.stage)}"/><image id="photo" width="1536" height="1024" href="${await embedded(s.photo)}"/></defs>`;
  const metadata = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example; reused generated photographic artwork. ${escape(s.description)}</metadata>`;
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
console.log('Built three order-only comparisons and stacked mobile variants.');
