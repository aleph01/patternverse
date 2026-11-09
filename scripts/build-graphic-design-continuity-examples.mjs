import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const text = (id, x, y, value, size = 22, weight = 400, fill = ink) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}"${fill === null ? '' : ` fill="${fill}"`}>${escape(value)}</text>`;
const photo = (id, source, x, y, width, height, extra = '') =>
  `<svg data-element="${id}"${extra} x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#${source}"/></svg>`;
const stroke = (id, d, change = false, width = 3) =>
  '<path data-element="' +
  id +
  '"' +
  (change ? ' data-change="d"' : '') +
  ' d="' +
  d +
  '" fill="none" stroke="' +
  ink +
  '" stroke-width="' +
  width +
  '" stroke-linecap="round" stroke-linejoin="round"/>';
const poster = (after) =>
  [
    text('brand', 65, 104, 'YARD / OPEN STUDIO'),
    text('headline', 65, 205, 'Follow the making.', 38, 500),
    photo('photograph', 'photo', 65, 250, 480, 220),
    stroke('left-line', 'M65 700L215 650', false, 4),
    stroke('right-line', after ? 'M395 590L545 540' : 'M395 640L545 590', true, 4),
    '<rect data-element="title-field" x="215" y="550" width="180" height="160" fill="#fffdf6" stroke="' +
      ink +
      '" stroke-width="1"/>',
    text('panel-title-1', 235, 610, 'OPEN', 30, 500),
    text('panel-title-2', 235, 650, 'STUDIO', 30, 500),
    text('date', 65, 760, 'Sat 14 Nov · 10:00–17:00', 22),
    text('entry', 65, 795, 'Free entry · Yard Studio', 22),
    text('url', 65, 830, 'yard.example/open-studio', 18),
  ].join('');
const connections = (after) =>
  [
    text('brand', 65, 104, 'YARD / PLAN YOUR VISIT'),
    text('headline', 65, 205, 'Two ways to take part.', 36, 500),
    photo('photograph', 'photo', 65, 250, 480, 170),
    text('left-heading', 65, 482, 'ACTIVITY', 18, 500),
    text('right-heading', 435, 482, 'ENTRY', 18, 500),
    stroke(
      'bowl-route',
      after ? 'M185 550L425 700' : 'M185 550C235 550 255 625 305 625C355 625 375 700 425 700',
      true,
    ),
    stroke(
      'tour-route',
      after ? 'M185 700L425 550' : 'M185 700C235 700 255 625 305 625C355 625 375 550 425 550',
      true,
    ),
    ...[
      [185, 550],
      [185, 700],
      [425, 550],
      [425, 700],
    ].map(
      ([x, y], i) =>
        '<circle data-element="terminal-' +
        i +
        '" cx="' +
        x +
        '" cy="' +
        y +
        '" r="4" fill="' +
        ink +
        '"/>',
    ),
    text('bowl-label', 65, 557, 'Clay bowl', 22),
    text('tour-label', 65, 707, 'Open tour', 22),
    text('walk-label', 435, 557, 'Walk in', 22),
    text('book-label', 435, 707, 'Book', 22),
    text('crossing-note', 65, 780, 'Crossing lines do not join.', 20),
    text('url', 65, 830, 'yard.example/visit', 18),
  ].join('');
const data = [
  { week: 'W1', value: 12 },
  { week: 'W2', value: 18 },
  { week: 'W3', value: null },
  { week: 'W4', value: 24 },
  { week: 'W5', value: 20 },
];
const chart = (after) =>
  [
    text('brand', 65, 104, 'YARD / PROGRAM REPORT'),
    text('headline', 65, 205, 'Workshop bookings.', 38, 500),
    photo('photograph', 'photo', 65, 250, 480, 140),
    text('chart-title', 65, 455, 'Booked workshop places', 26, 500),
    text('units', 65, 488, 'Weekly count · Autumn program', 18),
    ...[0, 10, 20, 30].flatMap((value) => [
      '<path data-element="grid-' +
        value +
        '" d="M95 ' +
        (710 - value * 6) +
        'H535" fill="none" stroke="' +
        ink +
        '" stroke-opacity="0.15"/>',
      text('tick-' + value, 65, 717 - value * 6, value, 18),
    ]),
    stroke('booking-series', 'M110 638L210 602M410 566L510 590'),
    stroke('missing-bridge', 'M210 602L410 566').replace(
      ' d=',
      ' data-change="opacity" opacity="' + (after ? 0 : 1) + '" d=',
    ),
    ...data.flatMap(({ week, value }, i) => [
      ...(value === null
        ? []
        : [
            '<circle data-element="point-' +
              i +
              '" cx="' +
              (110 + i * 100) +
              '" cy="' +
              (710 - value * 6) +
              '" r="5" fill="' +
              ink +
              '"/>',
          ]),
      text('week-' + i, 98 + i * 100, 750, week, 18),
      text('value-' + i, 98 + i * 100, 785, value === null ? '—' : value, 20),
    ]),
    text('missing-note', 65, 830, 'W3 was not recorded.', 20),
  ].join('');
const specs = [
  {
    name: 'continuity-open-studio',
    photo: 'form-open-studios-photo.jpg',
    draw: poster,
    title: 'Open-studio poster: continue a diagonal behind a title field',
    before: 'BEFORE · The two strokes are offset',
    after: 'AFTER · One implied diagonal',
    description:
      'Only the right stroke path changes, moving both of its endpoints 50 layout units upward from (395,640)/(545,590) to (395,590)/(545,540). It now lies on the left stroke’s extended diagonal, behind the fixed opaque title field. Stroke width, color, copy, type, photo/crop, panel, all other positions, paper and lighting stay fixed. Original fictional poster. The motif does not depict a literal route through the studio.',
    footer:
      'Only the right stroke moves upward. Its width and color, title field, type, photo and presentation stay fixed.',
  },
  {
    name: 'continuity-visit-connections',
    photo: 'audience-pottery-photo.jpg',
    draw: connections,
    title: 'Visit options: distinguish two continuations at a crossing',
    before: 'BEFORE · The paths touch tangentially',
    after: 'AFTER · Paths cross with clear directions',
    description:
      'Only the two connector path geometries change. Both retain their exact endpoints: Clay bowl at (185,550) connects to Book at (425,700), and Open tour at (185,700) connects to Walk in at (425,550). Before, both are horizontal at the central contact (305,625), creating an ambiguous tangent touch. After, each is a straight diagonal through the same crossing. Labels, terminal dots, note, copy, strokes, photo/crop, all other positions, paper and lighting remain identical. Fictional conceptual options diagram, not a floor plan.',
    footer:
      'Only the two connector geometries change. Endpoints, labels, widths, colors, photograph and paper stay fixed.',
  },
  {
    name: 'continuity-booking-gap',
    photo: 'form-open-studios-photo.jpg',
    draw: chart,
    title: 'Program report: keep an unrecorded interval visible',
    before: 'BEFORE · A line bridges missing W3',
    after: 'AFTER · The missing interval stays open',
    description:
      'Only the W2-to-W4 bridge opacity changes from 1 to 0. The two observed-interval subpaths remain identical. The weekly data remain 12,18,not-recorded,24,20. Observed points, coordinates, axes, ticks, gridlines, words, values, explicit W3 note, stroke style, photo/crop, paper and lighting stay fixed. No value is invented or replaced with zero. Original fictional report.',
    footer:
      'Only the bridge across W3 disappears. Recorded values, points, labels, photo, crop and presentation stay fixed.',
  },
];
const stage = await embedded('scale-print-stage-v2.jpg');
for (const s of specs) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${stage}"/>${(await Promise.all(['photo', 'photo2', 'photo3', 'photo4'].filter((key) => s[key]).map(async (key) => `<image id="${key}" width="1536" height="1024" href="${await embedded(s[key])}"/>`))).join('')}</defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example. Selected generated photographs; separately authored print design. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${text('after-label', 712, 44, s.after, 23, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 21)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="660" height="2070" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 23, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three continuity comparisons and their stacked versions.');
