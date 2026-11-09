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
const poster = (after) =>
  [
    text('brand', 110, 104, 'YARD / OPEN STUDIO'),
    '<g data-element="headline" data-change="transform" transform="translate(' +
      (after ? 65 : 110) +
      ' 0)">' +
      text('headline-1', 0, 205, 'Open', 64, 500) +
      text('headline-2', 0, 285, 'studio.', 64, 500) +
      '</g>',
    photo('photograph', 'photo', 110, 350, 420, 250),
    text('date', 110, 690, 'Sat 14 Nov · 10:00–17:00', 26),
    text('venue', 110, 735, 'Yard Studio · Free entry', 22),
    text('url', 110, 830, 'yard.example/open-studio', 20),
  ].join('');
const study = (after) =>
  [
    text('brand', 65, 104, 'YARD / MATERIAL STUDIES'),
    text('headline', 65, 205, 'Work in progress', 40, 500),
    text('intro', 65, 245, 'Material studies / 01', 22),
    '<g data-element="image-module" data-change="transform" transform="translate(' +
      (after ? 191 : 65) +
      ' 300)">' +
      photo('photograph', 'photo', 0, 0, 228, 200) +
      text('caption', 0, 238, 'A bowl before firing.', 18) +
      '</g>',
    text('material-title', 65, 620, 'Material', 26, 500),
    text('process-title', 317, 620, 'Process', 26, 500),
    ...['Raw clay records touch.', 'Small marks remain as', 'the bowl takes shape.'].map((s, i) =>
      text('material-' + i, 65, 664 + i * 28, s, 18),
    ),
    ...['Shape the rim slowly.', 'Let each piece dry before', 'it reaches the kiln.'].map((s, i) =>
      text('process-' + i, 317, 664 + i * 28, s, 18),
    ),
    text('url', 65, 820, 'yard.example/material-studies', 20),
  ].join('');
const booking = (id, x, title, url, change = false) =>
  '<g data-element="' +
  id +
  '"' +
  (change ? ' data-change="transform"' : '') +
  ' transform="translate(' +
  x +
  ' 690)"><rect width="200" height="60" fill="' +
  ink +
  '" rx="2"/>' +
  text('booking-title', 14, 24, title, 18, 400, '#fffdf6') +
  text('booking-url', 14, 47, url, 16, 400, '#fffdf6') +
  '</g>';
const workshops = (after) =>
  [
    text('brand', 65, 104, 'YARD / WEEKEND WORKSHOPS'),
    text('headline', 65, 205, 'Weekend workshops', 38, 500),
    text('intro', 65, 253, 'Two sessions. Choose your starting point.', 22),
    '<rect data-element="clay-card" x="65" y="310" width="228" height="450" rx="4" fill="#f1eee5" stroke="' +
      ink +
      '" stroke-opacity="0.2"/>',
    '<rect data-element="print-card" x="317" y="310" width="228" height="450" rx="4" fill="#f1eee5" stroke="' +
      ink +
      '" stroke-opacity="0.2"/>',
    photo('guest-photograph', 'photo', 45, 330, 200, 140),
    photo('print-photograph', 'photo2', 331, 330, 200, 140),
    text('clay-title', 79, 530, 'Clay bowl', 30, 500),
    text('print-title', 331, 530, 'Print lab', 30, 500),
    text('clay-description', 79, 575, 'Guest session', 18),
    text('print-description', 331, 575, 'Paper and inks included.', 18),
    text('clay-date', 79, 620, 'Sat 14 Nov · 10:00', 18),
    text('print-date', 331, 620, 'Sun 15 Nov · 14:00', 18),
    text('clay-price', 79, 655, '€45 · 8 places', 22),
    text('print-price', 331, 655, '€30 · 10 places', 22),
    booking('clay-booking', after ? 79 : 45, 'Book clay bowl', 'yard.example/clay', true),
    booking('print-booking', 331, 'Book print lab', 'yard.example/print'),
    text('url', 65, 824, 'Beginners welcome · yard.example', 20),
  ].join('');
const specs = [
  {
    name: 'break-grid-open-studio',
    photo: 'form-open-studios-photo.jpg',
    draw: poster,
    title: 'Open-studio poster: make a title an exception to the content margin',
    before: 'BEFORE · The headline shares the margin',
    after: 'AFTER · The headline steps outside it',
    description:
      'Only the complete headline group moves left by 45 layout units, from x110 to x65. The declared content edge at x110 remains established by brand, photo and practical information. All words, font sizes/weights, baselines, line breaks, image frame/crop, paper and lighting stay fixed. Original fictional expressive poster; the contained version remains a valid alternative.',
    footer:
      'Only the headline moves left. Type sizes, weights, baselines, words, photo, crop and other positions stay fixed.',
  },
  {
    name: 'break-grid-material-study',
    photo: 'audience-pottery-photo.jpg',
    draw: study,
    title: 'Material study: let a complete image module bridge a gutter',
    before: 'BEFORE · The image belongs to one track',
    after: 'AFTER · One module bridges the gutter',
    description:
      'Only the complete photograph-and-caption module moves horizontally from x65 to x191. The declared grid has 228-unit columns starting at x65 and x317 with a 24-unit gutter. The one-column-width module now crosses that gutter instead of starting on a track. Its size, crop, image bytes, caption relation, all copy, typography, body columns, paper and lighting remain fixed. Original fictional editorial page.',
    footer:
      'Only the image and attached caption move. Their size/crop, type, body columns and presentation stay fixed.',
  },
  {
    name: 'break-grid-workshop-booking',
    photo: 'audience-pottery-photo.jpg',
    photo2: 'scale-workshop-photo-v2.jpg',
    draw: workshops,
    title: 'Workshop cards: keep the expressive exception and restore the booking inset',
    before: 'BEFORE · Photo and booking both protrude',
    after: 'AFTER · Keep only the photo exception',
    description:
      'Only the complete left booking band moves right by 34 units, from x45 to x79. It regains the 14-unit card inset used by the right booking band. The left guest-session photo retains its intentional 20-unit protrusion beyond the card edge at x65 in both versions. Every word, type style, band dimension, other position, image source/crop, paper and lighting stays fixed. Original fictional printed workshop sheet.',
    footer:
      'Only the left booking band moves right. The photo outset, all words, type, dimensions and other positions stay fixed.',
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
console.log('Built three deliberate-grid-break comparisons and their stacked versions.');

const diagramText = (x, y, value, size = 22) =>
  `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" fill="${ink}">${escape(value)}</text>`;
const track = (y, x, width, label) =>
  `<rect x="65" y="${y}" width="228" height="90" fill="#e0e5de"/><rect x="317" y="${y}" width="228" height="90" fill="#e0e5de"/>${[65, 293, 317, 545].map((g) => `<path d="M${g} ${y}v90" stroke="${ink}" stroke-opacity="0.4" stroke-dasharray="4 4"/>`).join('')}<rect x="${x}" y="${y + 16}" width="${width}" height="58" fill="${ink}"/><text x="${x + 16}" y="${y + 52}" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#fffdf6">${escape(label)}</text>`;
const diagram = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="660" viewBox="0 0 660 660" role="img" aria-labelledby="title description"><title id="title">A span is not automatically a grid break</title><desc id="description">One declared two-column grid has tracks 228 units wide at x65 and x317, separated by 24 units. A module on a track and an allowed two-column span follow the system. A 228-unit module at x191 departs from the stated track-start rule. This last placement could become an allowed variant in a different grid.</desc><rect width="660" height="660" fill="#f7f5ee"/>${diagramText(40, 45, 'A span is not automatically a grid break', 26)}${diagramText(40, 77, 'An exception depends on the layout’s stated rules.', 18)}${diagramText(65, 120, '1 / One-column module: follows the grid', 20)}${track(140, 65, 228, 'One track')}${diagramText(65, 300, '2 / Allowed two-column span: still the grid', 20)}${track(320, 65, 480, 'Two-track span')}${diagramText(65, 480, '3 / Offset module: outside this rule', 20)}${track(500, 191, 228, 'Offset module')}${diagramText(65, 630, 'Original explanatory diagram · Not a performance test', 17)}</svg>`;
await writeFile(resolve(assets, 'break-grid-anatomy.svg'), diagram + '\n');
