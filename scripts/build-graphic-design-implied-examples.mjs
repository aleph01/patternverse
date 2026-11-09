import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f',
  cream = '#fffdf6';
const pitcherBytes = await readFile(resolve(assets, 'figure-ground-pitcher-cutout.png'));
const pitcherWidth = pitcherBytes.readUInt32BE(16),
  pitcherHeight = pitcherBytes.readUInt32BE(20);
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (file) =>
  `data:image/${file.endsWith('.png') ? 'png' : 'jpeg'};base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const text = (id, x, y, value, size = 22, weight = 400, fill = ink) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}"${fill === null ? '' : ` fill="${fill}"`}>${escape(value)}</text>`;
const photo = (id, source, x, y, width, height, extra = '') =>
  `<svg data-element="${id}"${extra} x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#${source}"/></svg>`;
const line = (id, d, extra = '') =>
  '<path data-element="' +
  id +
  '" d="' +
  d +
  '" fill="none" stroke="' +
  ink +
  '" stroke-width="3" stroke-linecap="butt" stroke-linejoin="miter"' +
  extra +
  '/>';
const invitation = (after) =>
  [
    text('brand', 65, 104, 'YARD / SATURDAY WORKSHOPS'),
    text('headline', 65, 205, 'Make a clay bowl', 40, 500),
    photo('photograph', 'photo', 65, 250, 480, 230),
    line('frame-corners', 'M65 595V535H125M485 535H545V595M545 685V745H485M125 745H65V685'),
    line(
      'frame-middles',
      'M125 535H485M545 595V685M485 745H125M65 685V595',
      ' data-change="opacity" opacity="' + (after ? 0 : 1) + '"',
    ),
    text('offer', 95, 585, 'Saturday session · €45', 28, 500),
    text('date', 95, 625, '14 Nov · 10:00–12:00', 22),
    text('inclusion', 95, 665, 'Clay, tools and firing included.', 22),
    text('welcome', 95, 705, 'Beginners welcome · 8 places', 22),
    text('url', 65, 820, 'yard.example/clay-bowl', 20),
  ].join('');
const product = (after) =>
  [
    text('brand', 65, 104, 'FIELD / WEEKEND OBJECTS'),
    text('headline', 65, 205, 'Objects in the round.', 36, 500),
    '<rect data-element="product-ground" x="65" y="250" width="480" height="340" fill="#e7e3d8"/>',
    '<use data-element="ring-behind" data-change="opacity" href="#product-ring" opacity="' +
      (after ? 1 : 0) +
      '"/>',
    '<svg data-element="pitcher" x="85" y="260" width="440" height="320" viewBox="0 0 ' +
      pitcherWidth +
      ' ' +
      pitcherHeight +
      '" preserveAspectRatio="xMidYMid meet"><use href="#photo"/></svg>',
    '<use data-element="ring-in-front" data-change="opacity" href="#product-ring" opacity="' +
      (after ? 0 : 1) +
      '"/>',
    text('product-name', 65, 650, 'Loop pitcher', 28, 500),
    text('specification', 65, 695, 'Charcoal stoneware · 1 litre', 22),
    text('price', 65, 745, '€38 / pitcher', 24),
    text('url', 65, 830, 'field.example/pitcher', 18),
  ].join('');
const download = (after) =>
  [
    text('brand', 158, 155, 'YARD / PRINT DESK', 18),
    text('headline', 158, 215, 'Ready to print.', 32, 500),
    photo('photograph', 'photo', 138, 270, 334, 125),
    '<rect data-element="file-card" x="158" y="440" width="292" height="220" rx="8" fill="' +
      cream +
      '" stroke="' +
      ink +
      '" stroke-width="1" stroke-opacity="0.3"/>',
    text('file-name', 178, 480, 'Open-studio poster', 20, 500),
    text('file-specification', 178, 515, 'PDF · A3 · 2.4 MB', 18),
    line('file-lower-left', 'M178 588V612H194'),
    line('file-lower-right', 'M210 612H226V596'),
    line('file-top', after ? 'M198 550H210L226 566V580' : 'M198 550H226V580').replace(
      ' d=',
      ' data-change="d" d=',
    ),
    line(
      'file-fold',
      'M210 550V566H226',
      ' data-change="opacity" opacity="' + (after ? 1 : 0) + '"',
    ),
    '<rect data-element="download-button" x="240" y="560" width="190" height="44" rx="5" fill="' +
      ink +
      '"/>',
    text('download-label', 255, 588, 'Download PDF', 18, 400, cream),
    text('print-note', 158, 720, 'Print at 100% · No scaling', 18),
    text('url', 158, 785, 'yard.example/print', 16),
  ].join('');
const specs = [
  {
    name: 'implied-workshop-frame',
    photo: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: invitation,
    title: 'Workshop invitation: retain a rectangle through its corners',
    before: 'BEFORE · The full perimeter is drawn',
    after: 'AFTER · Corners suggest the same field',
    description:
      'Only four middle edge segments become invisible, with their grouped path opacity changing from 1 to 0. The four corner fragments retain 60-unit arms and the same overall rectangle extent, x65 y535 width480 height210. All wording, type styles, positions, line thickness/color, photograph/crop, paper and lighting stay fixed. Original fictional invitation. The continuous outline is a valid alternative when a literal boundary is needed.',
    footer:
      'Only the middle edge segments disappear. Corners, scope, copy, type, photograph, crop and paper stay fixed.',
  },
  {
    name: 'implied-product-circle',
    photo: 'figure-ground-pitcher-cutout.png',
    stage: 'scale-print-stage-v2.jpg',
    draw: product,
    title: 'Product promotion: let a circle continue behind the pitcher',
    before: 'BEFORE · The circle crosses the object',
    after: 'AFTER · The circle continues behind it',
    description:
      'Only the circle’s layer assignment changes. Two identical instances share the same circle definition at cx370 cy420 radius145, stroke #b96a43 width4; their visibility switches so exactly one is visible, first above the product then below it. Circle geometry and color, identical transparent pitcher file and placement, ground, words, typography, paper and lighting stay fixed. Generated pitcher alpha causes subtle compositing at transparent pixels. Original fictional promotion.',
    footer:
      'Only the circle’s layer changes. Its geometry, the product file, backdrop, copy, type and paper stay fixed.',
  },
  {
    name: 'implied-print-file',
    photo: 'scale-workshop-photo-v2.jpg',
    stage: 'audience-phone-stage.jpg',
    draw: download,
    title: 'Print-download screen: restore a diagnostic folded-corner cue',
    before: 'BEFORE · Fragments suggest a plain frame',
    after: 'AFTER · A fold suggests a document',
    description:
      'Only the file icon’s upper-right path changes to a diagonal folded corner and an internal fold stroke becomes visible. Overall icon extent, remaining fragments, stroke width/color and large gaps remain fixed. Explicit filename, PDF label, A3 size, 2.4 MB value, Download PDF control, all text, photo/crop, phone and lighting are identical. Original fictional static download mockup; icon recognition has not been tested with users.',
    footer:
      'Only the icon’s upper corner and fold change. Labels, controls, dimensions, photo, phone and layout stay fixed.',
  },
];
for (const s of specs) {
  const stage = await embedded(s.stage);
  const defs = `<defs><image id="stage" width="610" height="915" href="${stage}"/>${(await Promise.all(['photo', 'photo2', 'photo3', 'photo4'].filter((key) => s[key]).map(async (key) => `<image id="${key}" width="${s[key].endsWith('.png') ? pitcherWidth : 1536}" height="${s[key].endsWith('.png') ? pitcherHeight : 1024}" href="${await embedded(s[key])}"/>`))).join('')}<circle id="product-ring" cx="370" cy="420" r="145" fill="none" stroke="#b96a43" stroke-width="4"/></defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example. Selected generated photographs; separately authored typography and layout. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${text('after-label', 712, 44, s.after, 23, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 21)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="660" height="2070" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 23, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three implied-form comparisons and their stacked versions.');
