import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVImageMeaningSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, fontFile))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#2e4836';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, copy, size = 22) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVImageMeaningSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}">${escape(copy)}</text>`;
const image = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const specs = [
  {
    name: 'image-meaning-handbuilding',
    beforeSource: 'explicit-tableware-photo.jpg',
    afterSource: 'meaning-handbuilding-photo.jpg',
    title: 'Workshop invitation: choose a view of the activity rather than a finished product',
    beforeLabel: 'BEFORE · Finished ceramics set the scene',
    afterLabel: 'AFTER · Hands show the advertised activity',
    description:
      'Only the selected image source changes: finished glazed cup and saucer become hands building an unfinished clay bowl. Identical full 3:2 image window, copy, font settings, colors, positions, paper and lighting.',
    copy: [
      ['brand', 65, 104, 'YARD / EVENING WORKSHOPS', 20],
      ['headline', 65, 541, 'Clay after work', 48],
      ['purpose', 65, 595, 'Make a small bowl by hand.', 28],
      ['date', 65, 646, 'Wed 18 Nov · 18:30–20:30', 23],
      ['conditions', 65, 689, '£28 · Clay, tools and firing included', 23],
      ['action', 65, 736, 'yard.example/clay', 23],
      ['footer', 65, 820, 'Illustrative image · No experience needed', 20],
    ],
  },
  {
    name: 'image-meaning-enclosed-room',
    beforeSource: 'audience-workspace-photo.jpg',
    afterSource: 'meaning-enclosed-room-photo.jpg',
    title: 'Room booking card: select imagery that shows the relevant spatial feature',
    beforeLabel: 'BEFORE · A shared workspace looks inviting',
    afterLabel: 'AFTER · An enclosed room matches the offer',
    description:
      'Only the selected image source changes: an open shared workspace becomes an enclosed two-chair room with a closed door. Identical full 3:2 image window, service copy, typography, positioning, colors and presentation. Illustrative fictional property, not evidence of a real room or sound isolation.',
    copy: [
      ['brand', 65, 104, 'COMMON / ROOMS', 20],
      ['headline', 65, 541, 'Room for two', 48],
      ['purpose', 65, 595, 'Book an enclosed room.', 28],
      ['price', 65, 646, 'Up to 2 people · £12 per hour', 23],
      ['hours', 65, 689, 'Mon–Fri · 09:00–18:00', 23],
      ['action', 65, 736, 'common.example/rooms', 23],
      ['footer', 65, 820, 'Illustrative image · Check availability', 20],
    ],
  },
  {
    name: 'image-meaning-seed-library',
    beforeSource: 'core-message-library-photo.jpg',
    afterSource: 'form-seed-packing-photo.jpg',
    title: 'Seed-library newsletter: choose the subject rather than a generic venue association',
    beforeLabel: 'BEFORE · Bookshelves suggest the venue',
    afterLabel: 'AFTER · Seeds and packets explain the subject',
    description:
      'Only the selected image source changes: a book-library interior becomes seeds and blank seed envelopes on a potting bench. Identical full 3:2 window, article title, copy, font settings, positions, colors and paper presentation. Both images are explicitly illustrative.',
    copy: [
      ['brand', 65, 104, 'YARD / NEIGHBORHOOD NOTES', 20],
      ['headline', 65, 541, 'Inside the seed library', 42],
      ['purpose', 65, 593, 'Seeds to share, not books to borrow.', 25],
      ['body-0', 65, 641, 'Take a packet. Grow a few plants.', 23],
      ['body-1', 65, 681, 'Save spare seed for the next season.', 23],
      ['scope', 65, 722, 'Available varieties change through the year.', 21],
      ['action', 65, 767, 'yard.example/seeds', 21],
      ['footer', 65, 820, 'Illustrative image · Ask the library team', 20],
    ],
  },
];
const records = [];
for (const s of specs) {
  const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await image('scale-print-stage-v2.jpg')}"/><image id="photo-before" width="1536" height="1024" href="${await image(s.beforeSource)}"/><image id="photo-after" width="1536" height="1024" href="${await image(s.afterSource)}"/></defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)} Fictional example. Generated photographic artwork; native typography composed separately.</desc>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/><svg data-element="image-window" x="65" y="155" width="480" height="320" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid meet"><use data-element="selected-photo" data-change="href" href="#photo-${after ? 'after' : 'before'}"/></svg>${s.copy.map((args) => text(...args)).join('')}</g>`;
  const label = (x, y, copy, size = 20) =>
    `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="${ink}">${escape(copy)}</text>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group(false, 30, 70)}${group(true, 680, 70)}${label(60, 1030, 'Only image selection changes. Copy, image frame, type, layout, paper and lighting remain fixed.')}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(60, 44, s.beforeLabel)}${group(false, 25, 70)}${label(60, 1064, s.afterLabel)}${group(true, 25, 1090)}${label(60, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
  records.push({
    name: s.name,
    beforeSource: s.beforeSource,
    afterSource: s.afterSource,
    stage: 'scale-print-stage-v2.jpg',
    dimensions: { wide: [1320, 1060], stacked: [660, 2070] },
    imageWindow: {
      x: 65,
      y: 155,
      width: 480,
      height: 320,
      viewBox: '0 0 1536 1024',
      preserveAspectRatio: 'xMidYMid meet',
    },
    description: s.description,
    copy: s.copy,
    declaredChanges: [
      [{ element: 'selected-photo', attribute: 'href', value: '#photo-before' }],
      [{ element: 'selected-photo', attribute: 'href', value: '#photo-after' }],
    ],
  });
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-image-meaning-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'One selected-photo href changes in each pair. Both complete 3:2 sources use the same full-image 480×320 frame with meet fitting. All other artifact DOM, words, font settings, colors, positioning, source paper and lighting are identical. Selection necessarily changes subject and image-internal appearance; these are editorial demonstrations, not isolated reader-performance experiments.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log('Built three image-selection comparisons and stacked views.');
