import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f',
  panel = '#f1eee5';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const text = (id, x, y, value, size = 22, weight = 400, fill = ink) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}"${fill === null ? '' : ` fill="${fill}"`}>${escape(value)}</text>`;
const photo = (id, source, x, y, width, height, extra = '') =>
  `<svg data-element="${id}"${extra} x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#${source}"/></svg>`;
const program = (after) =>
  [
    text('brand', 65, 104, 'YARD / OPEN STUDIO SATURDAY'),
    photo('photograph', 'photo', 65, 150, 480, 180),
    text('headline', 65, 385, 'A day of making', 38, 500),
    ...[
      {
        id: 'clay',
        y: 450,
        title: '10:00 / Clay bowl',
        line: 'Hand-build a small bowl.',
        detail: '€45 · Materials included',
      },
      {
        id: 'print',
        y: after ? 570 : 550,
        title: '14:00 / Print lab',
        line: 'Explore relief printing.',
        detail: '€30 · Paper and inks included',
      },
      {
        id: 'tour',
        y: after ? 690 : 705,
        title: '16:00 / Studio tour',
        line: 'Meet the resident makers.',
        detail: 'Free · No booking needed',
      },
    ].map(
      (r, i) =>
        '<g data-element="' +
        r.id +
        '-row"' +
        (i ? ' data-change="transform"' : '') +
        ' transform="translate(65 ' +
        r.y +
        ')">' +
        text('row-title', 0, 0, r.title, 26, 500) +
        text('row-description', 0, 32, r.line, 20) +
        text('row-detail', 0, 60, r.detail, 20) +
        '</g>',
    ),
    text('url', 65, 820, 'yard.example/open-studio', 20),
  ].join('');
const cards = (after) =>
  [
    text('brand', 65, 104, 'YARD / WEEKEND WORKSHOPS'),
    text('headline', 65, 205, 'Make something.', 42, 500),
    text('description', 65, 253, 'Two sessions. Find your starting point.'),
    ...[
      {
        id: 'clay',
        source: 'photo',
        title: 'Clay bowl',
        line: 'Hand-build a bowl.',
        detail: 'Materials included.',
        date: 'Sat 14 Nov · 10:00',
        price: '€45 · 8 places',
      },
      {
        id: 'print',
        source: 'photo2',
        title: 'Print lab',
        line: 'Explore relief print.',
        detail: 'Paper and inks included.',
        date: 'Sun 15 Nov · 14:00',
        price: '€30 · 10 places',
      },
    ].map(
      (r, i) =>
        '<g data-element="' +
        r.id +
        '-card" transform="translate(' +
        (65 + i * 252) +
        ' 310)"><rect data-element="card-surface" width="228" height="450" rx="4" fill="' +
        panel +
        '" stroke="' +
        ink +
        '" stroke-opacity="0.2"/>' +
        photo('card-photograph', r.source, 14, 14, 200, 134) +
        '<g data-element="' +
        r.id +
        '-copy" data-change="transform" transform="translate(' +
        (after ? '14 195' : i ? '8 211' : '28 195') +
        ')">' +
        [
          text('card-title', 0, 0, r.title, 30, 500),
          text('card-line', 0, 38, r.line, 18),
          text('card-detail', 0, 66, r.detail, 18),
          text('card-date', 0, 121, r.date, 18),
          text('card-price', 0, 161, r.price, 20),
          text('card-welcome', 0, 219, 'Beginners welcome', 18),
        ].join('') +
        '</g></g>',
    ),
    text('url', 65, 824, 'Book at yard.example/workshops', 20),
  ].join('');
const editorial = (after) =>
  [
    text('brand', 65, 104, 'YARD / NOTES FROM THE STUDIO'),
    photo('photograph', 'photo', 65, 150, 480, 180),
    text('headline', 65, 385, 'Inside the workshop', 38, 500),
    text('section-one-title', 65, 435, 'Start with the material', 26, 500),
    '<g data-element="section-one-body" data-change="transform" transform="translate(65 ' +
      (after ? 467 : 455) +
      ')">' +
      text('one-line-1', 0, 0, 'Raw clay changes with touch.') +
      text('one-line-2', 0, 30, 'Begin with one simple form.') +
      '</g>',
    text('section-two-title-1', 65, 590, 'Leave room', 26, 500),
    text('section-two-title-2', 65, 622, 'for the process', 26, 500),
    '<g data-element="section-two-body" data-change="transform" transform="translate(65 ' +
      (after ? 654 : 686) +
      ')">' +
      text('two-line-1', 0, 0, 'Drying takes time. Let each piece') +
      text('two-line-2', 0, 30, 'rest before the next stage.') +
      '</g>',
    text('url', 65, 820, 'yard.example/studio-notes', 20),
  ].join('');
const specs = [
  {
    name: 'spacing-open-studio-program',
    photo: 'form-open-studios-photo.jpg',
    draw: program,
    title: 'Program: repeat the interval between peer entries',
    before: 'BEFORE · Uneven intervals for peers',
    after: 'AFTER · One repeatable row interval',
    description:
      'Only the Print lab and Studio tour row groups move vertically. Their title baselines change from 550 and 705 to 570 and 690; the first stays at 450. Equal-height entries repeat at 120-unit baseline intervals. All words, internal spacing, type styles, image frame/crop, paper and lighting stay fixed. Original fictional program.',
    footer:
      'Only two complete rows move vertically. Their copy, internal spacing, type and photograph stay fixed.',
  },
  {
    name: 'spacing-workshop-cards',
    photo: 'audience-pottery-photo.jpg',
    photo2: 'scale-workshop-photo-v2.jpg',
    draw: cards,
    title: 'Peer cards: reuse a local spacing recipe',
    before: 'BEFORE · Copy placement drifts',
    after: 'AFTER · A shared inset and offset',
    description:
      'Only the two complete card-copy group transforms change. Left copy moves from x28 y195 to x14 y195, and right copy from x8 y211 to x14 y195, measured relative to each fixed card. Card geometry, photos/crops, typography, wording, internal line spacing, paper and lighting remain fixed. Original fictional workshops.',
    footer:
      'Only the two copy groups move. Cards, photos, copy, type styles and internal line spacing stay fixed.',
  },
  {
    name: 'spacing-studio-notes',
    photo: 'audience-pottery-photo.jpg',
    draw: editorial,
    title: 'Editorial page: repeat the gap after the final heading line',
    before: 'BEFORE · Two unrelated heading gaps',
    after: 'AFTER · One rule after each heading',
    description:
      'Only the two body-copy groups move vertically. The one-line heading-to-body baseline interval changes from 20 to 32 units, and the two-line heading final-baseline-to-body interval from 64 to 32. Headings, line breaks, body line spacing, copy, typography, photograph/crop, paper and lighting remain fixed. Original fictional editorial page.',
    footer:
      'Only the body groups move. The gap follows the final heading line; every style and line break stays fixed.',
  },
];
const stage = await embedded('scale-print-stage-v2.jpg');
for (const s of specs) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${stage}"/><image id="photo" width="1536" height="1024" href="${await embedded(s.photo)}"/>${s.photo2 ? `<image id="photo2" width="1536" height="1024" href="${await embedded(s.photo2)}"/>` : ''}</defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example. Selected generated photographs; separately authored print design. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${text('after-label', 712, 44, s.after, 23, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 21)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="660" height="2070" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 23, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three consistent-spacing comparisons and their stacked versions.');
