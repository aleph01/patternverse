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
const text = (id, x, y, value, size = 24, weight = 400) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${ink}">${escape(value)}</text>`;
const photo = (height = 200) =>
  `<svg data-element="photograph" x="31" y="333" width="548" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const form = (children) => `<g data-intervention="body-form">${children.join('')}</g>`;

const instructionSentences = [
  'Write the variety and harvest year on each envelope.',
  'Add 20 dry seeds to each envelope.',
  'Fold the flap twice and place the envelope in the collection tray.',
];
const seedPacking = (after) =>
  [
    text('brand', 65, 104, 'GREENHOUSE / VOLUNTEER BENCH', 22),
    text('headline-1', 65, 207, 'Prepare seed', 54, 500),
    text('headline-2', 65, 284, 'envelopes.', 54, 500),
    photo(),
    after
      ? form([
          text('number-1', 65, 596, '1', 32, 500),
          `<g data-step="1" aria-label="${instructionSentences[0]}">${text('step-1a', 110, 596, 'Write the variety and')}${text('step-1b', 110, 628, 'harvest year on each envelope.')}</g>`,
          text('number-2', 65, 684, '2', 32, 500),
          `<g data-step="2" aria-label="${instructionSentences[1]}">${text('step-2a', 110, 684, 'Add 20 dry seeds')}${text('step-2b', 110, 716, 'to each envelope.')}</g>`,
          text('number-3', 65, 772, '3', 32, 500),
          `<g data-step="3" aria-label="${instructionSentences[2]}">${text('step-3a', 110, 772, 'Fold the flap twice and place')}${text('step-3b', 110, 804, 'the envelope in the collection tray.')}</g>`,
        ])
      : form([
          text('paragraph-1', 65, 596, 'Write the variety and harvest year'),
          text('paragraph-2', 65, 630, 'on each envelope. Add 20 dry seeds'),
          text('paragraph-3', 65, 664, 'to each envelope. Fold the flap'),
          text('paragraph-4', 65, 698, 'twice and place the envelope'),
          text('paragraph-5', 65, 732, 'in the collection tray.'),
        ]),
    text('condition', 65, 840, 'Dry seeds only · Ask the coordinator if unsure', 18),
  ].join('');

const passRows = [
  { label: 'Price', day: '€18', five: '€75' },
  { label: 'Visits', day: '1', five: '5' },
  { label: 'Valid for', day: 'Booked day', five: '30 days' },
];
const passComparison = (after) =>
  [
    text('brand', 65, 104, 'WORKROOM / DESK PASSES', 22),
    text('headline-1', 65, 207, 'Choose your', 54, 500),
    text('headline-2', 65, 284, 'desk pass.', 54, 500),
    photo(),
    after
      ? form([
          text('header-label', 65, 586, 'Pass', 22, 500),
          text('header-day', 245, 586, 'Day pass', 22, 500),
          text('header-five', 410, 586, 'Five-visit', 22, 500),
          ...passRows.flatMap((row, i) => {
            const y = 646 + i * 55;
            return [
              `<g data-row="${i}">${text('label-' + i, 65, y, row.label)}${text('day-' + i, 245, y, row.day)}${text('five-' + i, 410, y, row.five)}</g>`,
              `<path d="M65 ${y + 18}H545" fill="none" stroke="${ink}" stroke-opacity="0.25"/>`,
            ];
          }),
        ])
      : form([
          text('paragraph-1', 65, 595, 'Day pass: €18 for 1 visit.'),
          text('paragraph-2', 65, 629, 'Valid on the booked day.'),
          text('paragraph-3', 65, 707, 'Five-visit pass: €75 for 5 visits.'),
          text('paragraph-4', 65, 741, 'Valid for 30 days.'),
        ]),
    text('validity-condition', 65, 795, '30-day period starts with first visit', 18),
    text('hours', 65, 819, 'Weekdays · 09:00–18:00', 20),
    text('conditions', 65, 842, 'Desk and Wi-Fi included · Rooms separate', 18),
  ].join('');

const contactUrl = 'yardstudios.example';
const openStudios = (after) =>
  [
    text('brand', 65, 104, 'YARD STUDIOS / OPEN WEEKEND', 22),
    text('headline-1', 65, 207, 'Meet the', 64, 500),
    text('headline-2', 65, 284, 'makers.', 64, 500),
    photo(205),
    text('date', 65, 583, 'SAT 18 MAY · 11:00–17:00', 26),
    text('location', 65, 620, '12 Yard Lane · Free entry'),
    text('contact-label', 65, 670, 'Details & studio list'),
    after
      ? form([
          '<path data-cut-guide="top" d="M31 695H579" stroke="#17352f" stroke-opacity="0.45" stroke-dasharray="3 5"/>',
          ...Array.from({ length: 5 }, (_, i) => {
            const left = 31 + (548 * i) / 5;
            return `<g data-tab="${i + 1}" transform="translate(${left + 61} 705) rotate(90)">${text('tab-event-' + i, 0, 0, 'Open studios · 18 May', 14)}${text('tab-url-' + i, 0, 23, contactUrl, 16)}</g>`;
          }),
          ...Array.from(
            { length: 4 },
            (_, i) =>
              `<path data-cut-guide="vertical" d="M${31 + (548 * (i + 1)) / 5} 700V853" fill="none" stroke="#17352f" stroke-opacity="0.45" stroke-dasharray="3 5"/>`,
          ),
        ])
      : form([text('contact-url', 65, 755, contactUrl, 26)]),
  ].join('');

const specifications = [
  {
    name: 'form-seed-procedure',
    photo: 'form-seed-packing-photo.jpg',
    title: 'Doing: continuous instructions become a numbered procedure',
    before: 'BEFORE · Read through',
    after: 'AFTER · Follow and resume',
    draw: seedPacking,
    description:
      'Only the body-form group changes. The exact instruction words and order are preserved, regrouped into three numbered steps at the same body type size. Branding, title, photo/crop, conditions, colors, paper and lighting stay fixed.',
    footer: 'Same instructions and order; numbered steps replace the continuous paragraph.',
  },
  {
    name: 'form-pass-comparison',
    photo: 'audience-workspace-photo.jpg',
    title: 'Comparing: separate descriptions become an aligned comparison table',
    before: 'BEFORE · Separate descriptions',
    after: 'AFTER · Compare by attribute',
    draw: passComparison,
    description:
      'Only the body-form group changes from two descriptions to a labeled three-column table. The same pass prices, visit counts and validity remain. Branding, headline, photograph/crop, hours, conditions, palette, paper and lighting are identical.',
    footer:
      'The same pass facts become aligned rows. Shared conditions and photographic treatment stay fixed.',
  },
  {
    name: 'form-open-studios-tabs',
    photo: 'form-open-studios-photo.jpg',
    title: 'Keeping: one address becomes repeatable take-away tabs',
    before: 'BEFORE · Read the address here',
    after: 'AFTER · Take the address away',
    draw: openStudios,
    description:
      'Only the contact-form group changes: one horizontal address becomes five repeated vertical tabs, each repeating the same address and event/date, with printed cut guides. All content above the contact region, photograph/crop, paper, palette and lighting stay fixed. The mockup shows the tab artwork before cutting, not a physically tested tear-off object.',
    footer: 'Only the contact band changes: repeated self-contained tabs and printed cut guides.',
  },
];

for (const s of specifications) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${await embedded('scale-print-stage-v2.jpg')}"/><image id="photo" width="1536" height="1024" href="${await embedded(s.photo)}"/></defs>`;
  const metadata = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example with generated photographic artwork. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 24, 500)}${text('after-label', 712, 44, s.after, 24, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 22)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="660" height="2070" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 24, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 24, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three purpose-specific form transformations and mobile versions.');
