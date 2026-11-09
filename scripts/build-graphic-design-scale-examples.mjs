import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f';
const surface = '#e8e5dc';

const escape = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const embedded = async (name) =>
  `data:image/jpeg;base64,${(await readFile(resolve(directory, name))).toString('base64')}`;

const text = (id, x, y, value, size, weight = 400, scalable = false) =>
  `<text data-element="${id}"${scalable ? ' data-scale="font-size"' : ''} x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${ink}">${escape(value)}</text>`;

const photograph = (y, height) =>
  `<svg data-element="photograph" x="31" y="${y}" width="548" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;

const rosette = (diameter) => {
  const points = Array.from({ length: 32 }, (_, i) => {
    const angle = (Math.PI * i) / 16 - Math.PI / 2;
    const radius = i % 2 === 0 ? 1 : 0.76;
    return `${(Math.cos(angle) * radius).toFixed(6)},${(Math.sin(angle) * radius).toFixed(6)}`;
  }).join(' ');
  return `<g data-element="rosette-anchor" transform="translate(305 465)"><g data-element="rosette" data-scale="transform" transform="scale(${diameter / 2})"><polygon points="${points}" fill="${ink}"/><circle r="0.28" fill="#f5f2ea"/></g></g>`;
};

const event = (after) =>
  [
    text('series', 65, 104, 'CITY ARTS / EVENING SERIES', 22),
    text('title-night', 65, 207, 'NIGHT', after ? 76 : 32, 500, true),
    text('title-garden', 65, 284, 'GARDEN', after ? 76 : 32, 500, true),
    text('description', 65, 327, 'Art, sound and late openings', after ? 24 : 32, 400, true),
    photograph(352, 225),
    text('date', 65, 640, 'SAT 18 MAY · 18:00–23:00', after ? 36 : 32, 400, true),
    text('venue', 65, 693, 'Riverside Glasshouse', after ? 24 : 32, 400, true),
    text('price', 65, 735, 'Entry €12 · Students €8', after ? 24 : 32, 400, true),
    text('url', 65, 803, 'cityarts.example / nightgarden', after ? 24 : 32, 400, true),
  ].join('');

const workshop = (after) =>
  [
    text('series', 65, 104, 'FIELD NOTES / WEEKEND WORKSHOP', 22),
    photograph(152, 188),
    rosette(after ? 88 : 220),
    text('title-first', 65, 620, 'Make room', after ? 64 : 32, 500, true),
    text('title-second', 65, 690, 'for ideas.', after ? 64 : 32, 500, true),
    text('description', 65, 746, 'A practical creative-thinking workshop', 24),
    text('date', 65, 802, 'Sunday 9 June · 10:00 · Book a place', 24),
  ].join('');

const report = (after) =>
  [
    text('series', 65, 104, 'DELIVERY REVIEW / Q2', 22),
    photograph(152, 178),
    text('on-time-value', 65, 458, '78%', after ? 104 : 64, 500, true),
    text('on-time-label', 65, 500, 'Projects delivered on time', 24),
    text('late-value', 65, 623, '12', after ? 48 : 64, 500, true),
    text('late-label', 65, 665, 'Projects delivered late', 24),
    text('delay-value', 65, 785, '9 days', after ? 48 : 64, 500, true),
    text('delay-label', 65, 827, 'Median delay for late projects', 24),
  ].join('');

const stage = await embedded('scale-print-stage-v2.jpg');
const specifications = [
  {
    name: 'scale-event-poster-photographic',
    source: 'scale-greenhouse-photo-v2.jpg',
    title: 'Event poster: establish importance through scale',
    description:
      'The same printed event poster, greenhouse photograph, crop, paper, lighting, typography, wording and positions appear twice. Only the specified font sizes change: title 32 to 76, date 32 to 36, and details 32 to 24.',
    before: 'BEFORE · Equal-sized main information',
    after: 'AFTER · Event, date, then details',
    draw: event,
  },
  {
    name: 'scale-workshop-promotion-photographic',
    source: 'scale-workshop-photo-v2.jpg',
    title: 'Workshop promotion: put the message ahead of decoration',
    description:
      'The same printed promotion and studio photograph appear twice. Copy, image crop, colors, text baselines, weights, spacing and lighting remain identical. Only the rosette diameter changes from 220 to 88 and headline size from 32 to 64.',
    before: 'BEFORE · Decoration dominates',
    after: 'AFTER · The message leads',
    draw: workshop,
  },
  {
    name: 'scale-report-metrics-photographic',
    source: 'scale-delivery-photo-v2.jpg',
    title: 'Report: lead with the finding, retain the context',
    description:
      'The same report page, distribution-center photograph and illustrative metrics appear twice. Only the value font sizes change: 78% from 64 to 104, and 12 and 9 days from 64 to 48. Labels, positions, images, colors, type weights and lighting remain identical.',
    before: 'BEFORE · Three competing headlines',
    after: 'AFTER · Lead finding, then context',
    draw: report,
  },
];

for (const specification of specifications) {
  const photo = await embedded(specification.source);
  const definitions = `<defs><image id="stage" width="610" height="915" href="${stage}"/><image id="photo" width="1536" height="1024" href="${photo}"/></defs>`;
  const heading = `<title id="title">${escape(specification.title)}</title><desc id="description">${escape(specification.description)}</desc><metadata>Original Patternverse teaching example. Photographic sources generated with the built-in image_gen tool; fictional events, businesses and report data. Both variants reuse identical image bytes. SVG composition and type are authored deterministically; only elements marked data-scale differ.</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="paper-and-lighting" href="#stage"/>${specification.draw(after)}</g>`;
  const full = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${heading}${definitions}<rect width="1320" height="1060" fill="${surface}"/>${text('before-label', 62, 44, specification.before, 24, 500)}${text('after-label', 712, 44, specification.after, 24, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('invariant-label', 62, 1030, 'Same imagery, copy, crop, color, position and lighting. Only scale changes.', 23)}</svg>`;
  const compact = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${heading}${definitions}<rect width="660" height="2070" fill="${surface}"/>${text('before-label', 62, 44, specification.before, 24, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, specification.after, 24, 500)}${group(true, 25, 1090)}${text('invariant-label', 62, 2050, 'Identical artwork. Only scale changes.', 22)}</svg>`;
  await writeFile(resolve(directory, `${specification.name}.svg`), `${full}\n`);
  await writeFile(resolve(directory, `${specification.name}-mobile.svg`), `${compact}\n`);
}

console.log('Built three photographic comparisons and their stacked mobile versions.');
