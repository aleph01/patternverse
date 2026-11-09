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
const text = (id, x, y, value, size = 24, weight = 400, anchor = 'start') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${ink}">${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const removable = (after, id, children) =>
  after ? '' : `<g data-remove="${id}">${children.join('')}</g>`;

const cinema = (after) =>
  [
    text('brand', 65, 104, 'RIVER YARD / SUMMER CINEMA', 22),
    text('headline-1', 65, 207, 'Free courtyard', 64, 500),
    text('headline-2', 65, 284, 'cinema.', 64, 500),
    photo(31, 333, 548, 235),
    removable(after, 'repeated-admission', [
      '<circle cx="485" cy="402" r="50" fill="#f4f1e7" stroke="#17352f" stroke-width="1.5"/>',
      text('badge-1', 485, 396, 'FREE', 22, 500, 'middle'),
      text('badge-2', 485, 423, 'ENTRY', 22, 500, 'middle'),
    ]),
    text('date', 65, 623, 'FRI 21 JUN · Gates 20:30'),
    text('time', 65, 660, 'Film starts 21:30 · Bring a chair'),
    text('venue', 65, 714, '8 Mill Yard · No booking', 26),
    text('condition', 65, 760, 'Outdoor event · Cancelled in rain', 22),
    text('url', 65, 819, 'Programme: riveryard.example', 18),
  ].join('');

const coffee = (after) =>
  [
    removable(after, 'ornamental-border', [
      '<rect x="118" y="225" width="374" height="530" fill="none" stroke="#17352f" stroke-width="1.5"/>',
    ]),
    text('brand', 125, 255, 'NORTH ROAST / COFFEE', 20),
    text('headline-1', 125, 340, 'Decaf.', 44, 500),
    text('headline-2', 125, 395, 'Whole bean.', 44, 500),
    removable(after, 'care-seal', [
      '<circle cx="438" cy="314" r="46" fill="#f4f1e7" stroke="#17352f" stroke-width="1.3"/>',
      '<circle cx="438" cy="314" r="39" fill="none" stroke="#17352f" stroke-width="0.8" stroke-dasharray="2 3"/>',
      text('seal-1', 438, 310, 'ROASTED', 14, 500, 'middle'),
      text('seal-2', 438, 331, 'WITH CARE', 14, 500, 'middle'),
    ]),
    photo(112, 425, 386, 140),
    text('tasting-note', 125, 615, 'Chocolate & toasted nuts.', 20),
    text('roast-weight', 125, 649, 'Medium roast · 250 g', 20),
    text('qualification', 125, 704, 'Decaffeinated, not caffeine-free.', 18),
    text('url', 125, 740, 'northroast.example', 18),
  ].join('');

const dispatch = (after) =>
  [
    text('brand', 65, 104, 'MILL STORE / MAY OPERATIONS', 22),
    text('headline-1', 65, 207, 'Order dispatch', 54, 500),
    text('headline-2', 65, 284, 'May snapshot.', 54, 500),
    photo(31, 320, 548, 210),
    text('total', 65, 603, '184 / 200', 54, 500),
    text('total-label', 65, 644, 'Orders dispatched within 2 working days', 24),
    text('exception', 65, 680, '16 orders exceeded 2 working days', 22),
    text('definition', 65, 716, 'Clock starts at payment · May orders', 18),
    removable(after, 'off-task-update', [
      text('update-title', 65, 750, 'COMMUNITY UPDATE', 18),
      text('followers', 65, 790, '12', 36, 500),
      text('followers-label', 65, 826, 'New followers', 18),
      text('posts', 355, 790, '8', 36, 500),
      text('posts-label', 355, 826, 'Social posts', 18),
    ]),
  ].join('');

const specifications = [
  {
    name: 'remove-cinema-poster',
    photo: 'remove-courtyard-cinema-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    title: 'Cinema poster: remove a repeated admission badge',
    before: 'BEFORE · Admission repeated',
    after: 'AFTER · One clear statement',
    draw: cinema,
    description:
      'Only the circular FREE ENTRY badge is deleted. Free remains in the headline. Every retained word, size, position, photograph/crop, paper, palette and lighting is identical. The underlying photo is revealed, not regenerated.',
    footer: 'Only the repeated FREE ENTRY badge is removed. All retained elements stay fixed.',
  },
  {
    name: 'remove-coffee-package',
    photo: 'core-message-coffee-photo.jpg',
    stage: 'core-message-coffee-package-stage.jpg',
    title: 'Coffee package: remove an ornamental seal and border',
    before: 'BEFORE · Seal and frame',
    after: 'AFTER · Product information leads',
    draw: coffee,
    description:
      'Only the ROASTED WITH CARE seal and fine rectangular border are deleted. Product identity, tasting note, roast, weight, qualification, photograph/crop, typography, positions, label, pouch and light stay identical. Fictional front-label teaching mockup, not a complete production package.',
    footer:
      'Only the care seal and border are removed. All product information and photography stay fixed.',
  },
  {
    name: 'remove-dispatch-report',
    photo: 'scale-delivery-photo-v2.jpg',
    stage: 'scale-print-stage-v2.jpg',
    title: 'Dispatch report: remove metrics that belong to another review',
    before: 'BEFORE · Mixed reporting jobs',
    after: 'AFTER · Dispatch scope preserved',
    draw: dispatch,
    description:
      'Only the COMMUNITY UPDATE block with 12 new followers and 8 social posts is deleted. The same 184 of 200 orders within two working days, 16 exceptions and timing definition remain. All retained typography, positions, photography/crop, paper, colors and light stay fixed. Counts are invented and do not establish causes.',
    footer:
      'Only the community-update block is removed. Dispatch counts and qualifications remain fixed.',
  },
];

for (const s of specifications) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${await embedded(s.stage)}"/><image id="photo" width="1536" height="1024" href="${await embedded(s.photo)}"/></defs>`;
  const metadata = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse teaching example with shared generated photographic artwork. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 24, 500)}${text('after-label', 712, 44, s.after, 24, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 22)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="660" height="2070" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 24, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 24, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three deletion-only photographic comparisons and stacked mobile versions.');
