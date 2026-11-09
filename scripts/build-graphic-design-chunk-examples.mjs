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
const text = (id, x, y, value, size = 24, weight = 400, family = 'Arial, Helvetica, sans-serif') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${ink}">${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const body = (content) => `<g data-intervention="grouping">${content.join('')}</g>`;
const supperFacts = [
  'Fri 14 June · 18:00–20:00',
  'Greenhouse courtyard · 4 Park Lane',
  '€12 per person · Book by 10 June',
  'gardenclub.example/supper',
  'Bring a bowl and spoon',
  'Outdoor tables · Indoors if wet',
];

const supper = (after) =>
  [
    text('brand', 65, 104, 'GARDEN CLUB / SUMMER TABLE', 22),
    text('headline-1', 65, 207, 'Garden', 54, 500),
    text('headline-2', 65, 284, 'supper.', 54, 500),
    photo(31, 333, 548, 200),
    body(
      after
        ? [
            '<g data-chunk="when-where">' +
              text('heading-1', 65, 567, 'WHEN & WHERE', 18, 500) +
              text('fact-0', 65, 599, supperFacts[0], 22) +
              text('fact-1', 65, 629, supperFacts[1], 22) +
              '</g>',
            '<g data-chunk="cost-booking">' +
              text('heading-2', 65, 672, 'COST & BOOKING', 18, 500) +
              text('fact-2', 65, 704, supperFacts[2], 22) +
              text('fact-3', 65, 734, supperFacts[3], 22) +
              '</g>',
            '<g data-chunk="on-day">' +
              text('heading-3', 65, 777, 'ON THE DAY', 18, 500) +
              text('fact-4', 65, 809, supperFacts[4], 22) +
              text('fact-5', 65, 839, supperFacts[5], 22) +
              '</g>',
          ]
        : supperFacts.map((fact, i) => text('fact-' + i, 65, 580 + i * 44, fact, 22)),
    ),
  ].join('');

const bookings = [
  { id: 'clay', name: 'Clay workshop', date: 'Sat 18 May · 10:00', places: '1 place' },
  { id: 'print', name: 'Print workshop', date: 'Sun 19 May · 14:00', places: '2 places' },
];
const bookingScreen = (after) =>
  [
    text('brand', 158, 155, 'YARD / CONFIRMED SESSIONS', 18),
    text('headline-1', 158, 215, 'Your', 36, 500),
    text('headline-2', 158, 260, 'bookings.', 36, 500),
    photo(138, 300, 334, 125),
    body(
      after
        ? bookings.map((booking, i) => {
            const top = 470 + i * 145;
            return `<g data-record="${booking.id}"><rect data-boundary="record" x="148" y="${top}" width="314" height="108" rx="5" fill="none" stroke="${ink}" stroke-opacity="0.35"/>${text(booking.id + '-name', 158, top + 25, booking.name, 20, 500)}${text(booking.id + '-date', 158, top + 57, booking.date, 18)}${text(booking.id + '-places', 158, top + 89, booking.places, 18)}</g>`;
          })
        : [
            text('field-activities', 158, 462, 'ACTIVITIES', 16, 500),
            ...bookings.map((booking, i) =>
              text(booking.id + '-name', 158, 494 + i * 32, booking.name, 20, 500),
            ),
            text('field-dates', 158, 565, 'DATES', 16, 500),
            ...bookings.map((booking, i) =>
              text(booking.id + '-date', 158, 597 + i * 32, booking.date, 18),
            ),
            text('field-places', 158, 668, 'PLACES', 16, 500),
            ...bookings.map((booking, i) =>
              text(booking.id + '-places', 158, 700 + i * 32, booking.places, 18),
            ),
          ],
    ),
    text('contact', 158, 782, 'Changes: hello@yard.example', 16),
  ].join('');

const collection = (after) =>
  [
    text('brand', 65, 104, 'RIVER POST / COLLECTION', 22),
    text('headline-1', 65, 207, 'Collect your', 54, 500),
    text('headline-2', 65, 284, 'parcel.', 54, 500),
    photo(31, 333, 548, 200),
    text('reference-label', 65, 580, 'COLLECTION REFERENCE', 18, 500),
    `<g data-intervention="identifier">${text('reference', 65, 635, after ? 'BX73 1906 4285' : 'BX7319064285', 38, 400, "'Courier New', monospace")}</g>`,
    text('location', 65, 697, 'River Street counter · 8 Mill Yard', 22),
    text('hours', 65, 739, 'Mon–Fri · 09:00–18:00', 22),
    text('instruction', 65, 785, 'Quote this reference at the counter.', 20),
    text('support', 65, 831, 'Help: riverpost.example/collect', 18),
  ].join('');

const specifications = [
  {
    name: 'chunk-supper-invitation',
    photo: 'chunk-garden-supper-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    title: 'Supper invitation: group practical details by reader questions',
    before: 'BEFORE · An undivided fact list',
    after: 'AFTER · Three useful entry points',
    draw: supper,
    description:
      'The same six fact strings, order, font sizes, weights and left anchors remain. Only fact baselines change and three semantic headings are added. Branding, headline, photograph/crop, paper, palette and lighting are identical. Fictional invitation.',
    footer: 'All six facts remain. Only grouping headings and related vertical spacing change.',
  },
  {
    name: 'chunk-booking-records',
    photo: 'form-open-studios-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    title: 'Booking summary: keep each record together',
    before: 'BEFORE · Grouped by field type',
    after: 'AFTER · Grouped by booking',
    draw: bookingScreen,
    description:
      'The same activity, date and place values retain their wording, fonts, weights and left anchors. Only the body grouping changes: field-type headings are replaced by two complete booking units with boundaries. Header, photograph/crop, contact details, phone, palette and lighting remain identical. Static fictional summary.',
    footer: 'All booking values remain. Field groups become two complete records.',
  },
  {
    name: 'chunk-collection-reference',
    photo: 'scale-delivery-photo-v2.jpg',
    stage: 'scale-print-stage-v2.jpg',
    title: 'Collection reference: segment a string without changing its identity',
    before: 'BEFORE · An unbroken reference',
    after: 'AFTER · Readable display groups',
    draw: collection,
    description:
      'Only two display spaces are inserted: BX7319064285 becomes BX73 1906 4285. Removing spaces yields the identical canonical code. Font, size, weight, anchor, baseline, instructions, photograph/crop, paper, palette and lighting stay fixed. Fictional collection notice, not a machine-readable label.',
    footer:
      'Only two display spaces are added. The reference characters and all other elements stay fixed.',
  },
];

for (const s of specifications) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${await embedded(s.stage)}"/><image id="photo" width="1536" height="1024" href="${await embedded(s.photo)}"/></defs>`;
  const metadata = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse teaching example with shared generated photographic artwork. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 24, 500)}${text('after-label', 712, 44, s.after, 24, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 22)}</svg>`;
  const phone = s.name === 'chunk-booking-records';
  const mobileWidth = phone ? 480 : 660,
    mobileX = phone ? -65 : 25,
    labelX = phone ? 30 : 62;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="${mobileWidth}" height="2070" viewBox="0 0 ${mobileWidth} 2070" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="${mobileWidth}" height="2070" fill="#e8e5dc"/>${text('before-label', labelX, 44, s.before, 24, 500)}${group(false, mobileX, 70)}${text('after-label', labelX, 1064, s.after, 24, 500)}${group(true, mobileX, 1090)}${text('comparison-label', labelX, 2050, 'Fictional example · Generated photographs', phone ? 16 : 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three controlled chunking comparisons and mobile versions.');
