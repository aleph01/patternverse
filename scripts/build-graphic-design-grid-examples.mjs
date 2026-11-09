import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design'),
  ink = '#17352f';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const text = (id, x, y, value, size = 22, weight = 400, fill = ink, extra = '') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${escape(value)}</text>`;
const photo = (id, source, x, y, width, height) =>
  `<svg data-element="${id}" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#${source}"/></svg>`;
const sessions = [
  ['Drawing demo', '10:00–10:45', 'Studio 1'],
  ['Clay demo', '11:00–11:45', 'Studio 2'],
  ['Print demo', '13:00–13:45', 'Studio 1'],
  ['Repair demo', '14:00–14:45', 'Studio 2'],
];
const program = (after) =>
  [
    text('brand', 65, 104, 'YARD / OPEN STUDIO'),
    text('headline', 65, 190, 'Saturday at Yard', 40, 500),
    text('date', 65, 235, '14 November · Free entry'),
    photo('photograph', 'photo', 65, 260, 480, 170),
    ...sessions.map((lines, i) => {
      const before = [
          [65, 485],
          [315, 505],
          [79, 645],
          [315, 665],
        ],
        afterPositions = [
          [65, 485],
          [317, 485],
          [65, 650],
          [317, 650],
        ];
      const [x, y] = (after ? afterPositions : before)[i];
      return `<g data-element="session-${i + 1}"${i ? ' data-change="transform"' : ''} transform="translate(${x} ${y})"><rect x="0" y="0" width="228" height="140" rx="3" fill="none" stroke="${ink}" stroke-opacity="0.2"/>${text('session-' + i + '-title', 14, 33, lines[0], 21, 500)}${text('session-' + i + '-time', 14, 72, lines[1], 19)}${text('session-' + i + '-room', 14, 109, lines[2], 18)}</g>`;
    }),
    text('footer', 65, 835, 'yard.example/program · All welcome', 18),
  ].join('');
const storyCopy =
  'A worn jacket can stay useful. Our repair table offers fabric patches, thread and patient help. Bring one clean garment and a question.';
const storyLines = {
  before: [
    'A worn',
    'jacket can',
    'stay useful.',
    'Our repair',
    'table offers',
    'fabric',
    'patches,',
    'thread and',
    'patient help.',
    'Bring one',
    'clean',
    'garment and',
    'a question.',
  ],
  after: [
    'A worn jacket can stay useful. Our repair',
    'table offers fabric patches, thread and',
    'patient help. Bring one clean garment',
    'and a question.',
  ],
};
const editorial = (after) =>
  [
    text('brand', 65, 104, 'REPAIR NOTES / FIELD GUIDE'),
    text('headline', 65, 205, 'Make it last.', 48, 500),
    photo('photograph', 'photo', 65, 260, 480, 190),
    `<svg data-element="story-frame" overflow="visible" data-change="story-wrap" data-span="${after ? 3 : 1}" x="65" y="480" width="${after ? 354 : 102}" height="304" aria-label="${storyCopy}">${storyLines[after ? 'after' : 'before'].map((line, i) => text('story-line-' + i, 0, 20 + i * 22, line, 18)).join('')}</svg>`,
    `<g data-element="aside" transform="translate(443 500)">${text('aside-title-1', 0, 0, 'BRING', 18, 700)}${text('aside-title-2', 0, 26, 'ALONG', 18, 700)}${['1 clean', 'garment', 'Matching', 'fabric', 'Questions'].map((line, i) => text('aside-' + i, 0, [68, 90, 134, 156, 200][i], line, 18)).join('')}</g>`,
    text('footer', 65, 835, 'Free repair table · Sat 14 Nov · 10:00–14:00', 20),
  ].join('');
const workshops = [
  {
    id: 'clay',
    title: 'Clay bowl',
    date: '14 Nov · 10:00',
    price: '€45 · 8 places',
    inclusion: 'Materials and firing included',
    narrow: ['Materials and', 'firing included'],
    source: 'photo',
  },
  {
    id: 'print',
    title: 'Print lab',
    date: '15 Nov · 14:00',
    price: '€30 · 10 places',
    inclusion: 'Paper and inks included',
    narrow: ['Paper and inks', 'included'],
    source: 'photo2',
  },
];
const workshopCard = (course, index, after) => {
  const width = after ? 294 : 137,
    imageHeight = width / 2,
    x = after ? 158 : 158 + 157 * index,
    y = after ? 190 + 305 * index : 190;
  const lines = after ? [course.inclusion] : course.narrow,
    extra = (lines.length - 1) * 20,
    buttonY = imageHeight + 108 + extra;
  return `<g data-element="course-${course.id}" data-change="responsive-card" data-track="${after ? 1 : index + 1}" transform="translate(${x} ${y})">${photo('course-image', course.source, 0, 0, width, imageHeight)}${text('course-title', 0, imageHeight + 25, course.title, 20, 500)}${text('course-date', 0, imageHeight + 49, course.date, 17)}${text('course-price', 0, imageHeight + 71, course.price, 16)}<g data-element="course-inclusion">${lines.map((line, i) => text('inclusion-' + i, 0, imageHeight + 93 + 20 * i, line, 16)).join('')}</g><rect data-element="course-button" x="0" y="${buttonY}" width="${width}" height="32" rx="3" fill="${ink}"/>${text('course-action', width / 2, buttonY + 22, 'View session', 17, 500, '#fffdf6', ' text-anchor="middle"')}</g>`;
};
const responsive = (after) =>
  [
    text('brand', 158, 155, 'YARD / WORKSHOPS', 18),
    ...workshops.map((course, index) => workshopCard(course, index, after)),
  ].join('');
const specs = [
  {
    name: 'grid-studio-program',
    photo: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    phone: false,
    draw: program,
    title: 'Program: coordinate repeated modules on shared tracks',
    before: 'BEFORE · Cards placed individually',
    after: 'AFTER · Shared columns and rows',
    description:
      'Only three complete session cards move. Four fixed-width cards now occupy two equal two-track spans, with a 24-unit gutter, inside a 480-unit live area. Header, full-width photo/crop, card contents/sizes/styles and footer remain fixed. The underlying four tracks are each 102 units wide. Original fictional program.',
    footer: 'Only three intact cards move. Their contents, sizes, typography and photo stay fixed.',
  },
  {
    name: 'grid-editorial-spans',
    photo: 'core-message-repair-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    phone: false,
    draw: editorial,
    title: 'Editorial: let a paragraph span enough columns',
    before: 'BEFORE · Paragraph in one track',
    after: 'AFTER · Paragraph spans three',
    description:
      'Only the main paragraph frame changes from one 102-unit track to three tracks plus two gutters, 354 units, and its words rewrap. The exact text, font, size, weight, leading, frame origin/height, sidebar, photo/crop, heading and presentation remain fixed. Four base tracks and 24-unit gutters serve different content spans. Original fictional editorial page.',
    footer:
      'Only paragraph span and consequent line wrapping change. Copy, type and image stay fixed.',
  },
  {
    name: 'grid-responsive-workshops',
    photo: 'audience-pottery-photo.jpg',
    photo2: 'scale-workshop-photo-v2.jpg',
    stage: 'audience-phone-stage.jpg',
    phone: true,
    draw: responsive,
    title: 'Narrow workshops: replace two cramped columns with one',
    before: 'BEFORE · Two narrow columns',
    after: 'AFTER · One usable column',
    description:
      'At the same phone presentation, two 137-unit columns plus a 20-unit gutter become one 294-unit column. Course positions, image/button widths and image heights, text placement and inclusion line wrapping follow the changed grid. Both photos retain identical source bytes, centered crops and 2:1 frames. Words, fonts, sizes, weights, colors, course order, phone and lighting remain fixed. Original fictional static page; a separate HTML fixture demonstrates the breakpoint policy.',
    footer:
      'Only the narrow grid and resulting geometry/wrapping change. Copy, type and crops stay fixed.',
  },
];
for (const s of specs) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${await embedded(s.stage)}"/><image id="photo" width="1536" height="1024" href="${await embedded(s.photo)}"/>${s.photo2 ? `<image id="photo2" width="1536" height="1024" href="${await embedded(s.photo2)}"/>` : ''}</defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse teaching example. Generated photographic artwork, separately authored layout. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 24, 500)}${text('after-label', 712, 44, s.after, 24, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 21)}</svg>`;
  const width = s.phone ? 480 : 660,
    x = s.phone ? -65 : 25,
    lx = s.phone ? 30 : 62;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="2070" viewBox="0 0 ${width} 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="${width}" height="2070" fill="#e8e5dc"/>${text('before-label', lx, 44, s.before, 24, 500)}${group(false, x, 70)}${text('after-label', lx, 1064, s.after, 24, 500)}${group(true, x, 1090)}${text('comparison-label', lx, 2050, 'Fictional example · Generated photographs', s.phone ? 16 : 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
const anatomy = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="430" viewBox="0 0 600 430" role="img" aria-labelledby="title description"><title id="title">Four tracks, flexible spans</title><desc id="description">A 480-unit live area contains four 102-unit tracks and three 24-unit gutters. A full-width region spans all four tracks, two modules each span two tracks, and a main region spans three tracks beside a one-track aside. The guides are explanatory and do not print on the finished examples.</desc><rect width="600" height="430" fill="#fffdf6"/>${text('diagram-title', 30, 40, 'Four tracks, flexible spans', 25, 500)}${[60, 186, 312, 438].map((x, i) => `<rect x="${x}" y="70" width="102" height="290" fill="#05ce78" fill-opacity="0.09"/>${text('track-' + i, x + 46, 91, String(i + 1), 16)}`).join('')}<g fill="none" stroke="${ink}" stroke-width="2"><path d="M60 110H540V150H60ZM60 180H288V235H60ZM312 180H540V235H312ZM60 265H414V335H60ZM438 265H540V335H438Z"/></g>${text('span-four', 245, 136, '4 tracks', 18)}${text('span-two-a', 135, 214, '2 tracks', 18)}${text('span-two-b', 387, 214, '2 tracks', 18)}${text('span-three', 200, 305, '3 tracks', 18)}${text('span-one', 480, 305, '1', 18)}${text('diagram-formula', 30, 391, '4 × 102 + 3 × 24 = 480 units', 20)}${text('diagram-note', 30, 417, 'Guides explain the structure; they are not printed rules.', 17)}</svg>`;
await writeFile(resolve(assets, 'grid-anatomy.svg'), anatomy + '\n');
const photos = {
  photo: await embedded('audience-pottery-photo.jpg'),
  photo2: await embedded('scale-workshop-photo-v2.jpg'),
};
const section = (variant) =>
  `<section class="${variant}" data-variant="${variant}"><h2>${variant === 'before' ? 'Before: two columns remain at every width' : 'After: one column below 600 pixels'}</h2><div class="courses">${workshops.map((c) => `<article data-course="${c.id}"><img alt="Generated ${c.id === 'clay' ? 'pottery' : 'studio-table'} photograph" src="${photos[c.source]}"/><h3>${c.title}</h3><p>${c.date}</p><p>${c.price}</p><p>${c.inclusion}</p><a href="#study-note">View session</a></article>`).join('')}</div></section>`;
const fixture = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Grid breakpoint layout study</title><style>*{box-sizing:border-box}body{margin:0;background:#e8e5dc;color:#17352f;font-family:Arial,Helvetica,sans-serif}main{max-width:960px;margin:auto;padding:20px}h1{font-size:26px}h2{font-size:21px}section{background:#fffdf6;padding:20px;margin:24px 0}.courses{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}article{min-width:0}img{display:block;width:100%;aspect-ratio:2/1;object-fit:cover;object-position:center}h3{font-size:20px;font-weight:500;margin:20px 0 14px}article p{font-size:17px;line-height:1.4;margin:10px 0}article a{display:block;text-align:center;background:#17352f;color:#fffdf6;font-size:17px;padding:10px;text-decoration:none;margin-top:16px}@media(max-width:600px){main{padding:16px}section{padding:16px}.after .courses{grid-template-columns:1fr}}</style></head><body><main><h1>Grid breakpoint layout study</h1><p id="study-note">Fictional layout study. Links return to this note; no booking service is implemented. The same content and type styles use two columns at wide widths. Only the revised narrow rule switches to one column. This study tests that policy, not pixel equivalence to the phone illustration.</p>${section('before')}${section('after')}</main></body></html>\n`;
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-grid-responsive-proof.html'),
  fixture,
);
console.log(
  'Built three grid comparisons, stacked variants, an anatomy diagram and a responsive study.',
);
