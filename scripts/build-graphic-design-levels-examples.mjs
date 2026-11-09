import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f',
  muted = '#56665c';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (name) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, name))).toString('base64')}`;
const text = (id, x, y, value, size = 22, weight = 400, fill = ink, extra = '') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const course = (after) =>
  [
    text('brand', 65, 104, 'YARD / AUTUMN WORKSHOPS', 22),
    ...[
      ['title-1', 207, 'Clay'],
      ['title-2', 284, 'workshop.'],
    ].map(([id, y, copy]) =>
      text(
        id,
        65,
        y,
        copy,
        after ? 64 : 30,
        400,
        ink,
        ' data-level="lead" data-intervention="size"',
      ),
    ),
    photo(31, 333, 548, 200),
    ...[
      ['date', 590, 'Sat 14 Nov · 10:00–12:00'],
      ['cost', 650, '€24 · Book by 7 Nov'],
      ['venue', 710, 'Yard Studios · 8 Mill Lane'],
    ].map(([id, y, copy]) => text(id, 65, y, copy, 30, 400, ink, ' data-level="practical"')),
    ...[
      ['series', 780, 'Autumn program · Session 3'],
      ['host', 830, 'Hosted by Yard Makers'],
    ].map(([id, y, copy]) =>
      text(
        id,
        65,
        y,
        copy,
        after ? 22 : 30,
        400,
        ink,
        ' data-level="reference" data-intervention="size"',
      ),
    ),
  ].join('');
const records = [
  {
    id: 'clay',
    name: 'Clay workshop',
    date: 'Sat 14 Nov · 10:00',
    reference: 'Reference · YD1042',
  },
  {
    id: 'print',
    name: 'Print workshop',
    date: 'Sun 15 Nov · 14:00',
    reference: 'Reference · YD1186',
  },
];
const booking = (after) =>
  [
    text('brand', 158, 155, 'YARD / CONFIRMED SESSIONS', 18),
    text('headline-1', 158, 215, 'Your', 36, 500),
    text('headline-2', 158, 260, 'bookings.', 36, 500),
    photo(138, 300, 334, 125),
    ...records.map((r, i) => {
      const top = 450 + i * 170,
        drift = i === 1 && !after,
        change = i === 1 ? ' data-intervention="role-style"' : '';
      return `<g data-record="${r.id}"><rect data-element="${r.id}-boundary" x="148" y="${top}" width="314" height="140" rx="5" fill="none" stroke="${ink}" stroke-opacity="0.35"/>${text(r.id + '-name', 158, top + 30, r.name, 20, drift ? 400 : 700, drift ? muted : ink, ` data-role="name"${change}`)}${text(r.id + '-date', 158, top + 69, r.date, 20, drift ? 700 : 400, ink, ` data-role="date"${change}`)}${text(r.id + '-reference', 158, top + 107, r.reference, 20, drift ? 700 : 400, drift ? ink : muted, ` data-role="reference"${change}`)}</g>`;
    }),
    text('help', 158, 782, 'Changes: hello@yard.example', 16),
  ].join('');
const pass = (after) =>
  [
    text('brand', 65, 104, 'YARD / SHARED WORKSPACE', 22),
    text('headline-1', 65, 207, 'Day', 54, 500),
    text('headline-2', 65, 284, 'pass.', 54, 500),
    photo(31, 333, 548, 200),
    text('price', 65, 595, '€18', 44, 700),
    '<rect data-element="terms-panel" x="55" y="610" width="500" height="178" fill="#f4f1e8"/>',
    text(
      'condition',
      65,
      650,
      'Weekdays only · 09:00–17:00',
      22,
      after ? 700 : 400,
      after ? ink : '#929f96',
      ' data-intervention="priority-style"',
    ),
    text('amenities', 65, 710, 'Wi-Fi · Shared desk · Tea & coffee', 22),
    text(
      'slogan',
      65,
      770,
      'A fresh place for fresh ideas.',
      22,
      after ? 400 : 700,
      after ? muted : ink,
      ' data-intervention="priority-style"',
    ),
    text('booking', 65, 830, 'yard.example/daypass', 20),
  ].join('');
const specifications = [
  {
    name: 'levels-clay-course',
    photo: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    phone: false,
    title: 'Course notice: assign lead, practical and reference levels',
    before: 'BEFORE · One size for all roles',
    after: 'AFTER · Three content levels',
    draw: course,
    description:
      'Only designated font sizes change. Seven main text lines start at 30. Two title lines become 64, three practical lines stay 30, and two program-reference lines become 22. Every word, family, weight, color, anchor, baseline, photograph/crop, paper and lighting remains fixed. Fictional workshop notice; sizes express role, not a universal ratio.',
    footer: 'Only sizes change: title 30 → 64; practical 30; references 30 → 22.',
  },
  {
    name: 'levels-booking-roles',
    photo: 'form-open-studios-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    phone: true,
    title: 'Booking records: give repeated roles consistent treatments',
    before: 'BEFORE · Roles change by card',
    after: 'AFTER · Roles stay consistent',
    draw: booking,
    description:
      'Only three text nodes in the Print workshop card change weight and fill to match equivalent roles in the Clay workshop card. Names become bold dark, dates regular dark, and references regular muted. All font sizes remain 20. Every value, position, card boundary, photo/crop, header, phone and lighting remains identical. Static fictional summary.',
    footer: 'Only second-card weights and tones change. Both records keep every value.',
  },
  {
    name: 'levels-day-pass-terms',
    photo: 'audience-workspace-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    phone: false,
    title: 'Day-pass offer: rank restrictions above promotional atmosphere',
    before: 'BEFORE · Slogan outranks terms',
    after: 'AFTER · Terms receive priority',
    draw: pass,
    description:
      'Only the condition and slogan change weight and text fill. Weekdays only and opening hours become bold dark; the slogan becomes regular muted. Font sizes, words, price, amenities, booking address, positions, fixed panel, photograph/crop, paper and lighting stay identical. Fictional offer; specified muted color remains above 4.5:1 on the solid panel, not a full accessibility assessment.',
    footer: 'Only condition and slogan weights/tones change. All sizes and copy stay fixed.',
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
console.log('Built three controlled importance-level comparisons and mobile variants.');
