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
const poster = (after) =>
  [
    text('brand', 65, 104, 'YARD / OPEN EVENING'),
    photo('photograph', 'photo', 65, 160, 480, 600),
    '<rect data-element="photo-shade" data-change="opacity" x="65" y="160" width="480" height="600" fill="url(#photo-shade-gradient)" opacity="' +
      (after ? 1 : 0) +
      '"/>',
    text('headline', 95, 525, 'Open studio', 44, 500, cream),
    text('invitation', 95, 565, 'Meet the makers.', 26, 400, cream),
    text('date', 95, 650, 'Sat 14 Nov · 17:00–20:00', 20, 400, cream),
    text('entry', 95, 690, 'Free entry · Yard Studio', 20, 400, cream),
    text('url', 65, 820, 'yard.example/open-evening', 20),
  ].join('');
const product = (after) =>
  [
    text('brand', 65, 104, 'FIELD / OBJECTS FOR EVERY DAY'),
    text('headline', 65, 205, 'Loop pitcher.', 40, 500),
    '<rect data-element="product-ground" data-change="fill" x="65" y="250" width="480" height="340" fill="' +
      (after ? '#e7e3d8' : '#292b2b') +
      '"/>',
    '<svg data-element="pitcher" x="85" y="260" width="440" height="320" viewBox="0 0 ' +
      pitcherWidth +
      ' ' +
      pitcherHeight +
      '" preserveAspectRatio="xMidYMid meet"><use href="#photo"/></svg>',
    text('specification', 65, 660, 'Charcoal stoneware · 1 litre', 22),
    text('price', 65, 710, '€38 / pitcher', 28, 500),
    text('description', 65, 760, 'Hand-finished surface', 20),
    text('url', 65, 830, 'field.example/pitcher', 18),
  ].join('');
const dialog = (after) =>
  [
    text('brand', 158, 155, 'WORKROOM / DAY PASSES', 18),
    text('headline', 158, 215, 'Book a day.', 32, 500),
    photo('photograph', 'photo', 138, 270, 334, 130),
    text('page-price', 158, 450, 'Day pass €18', 22),
    text('page-hours', 158, 490, 'Mon–Fri · 09:00–18:00', 18),
    '<rect data-element="page-button" x="158" y="700" width="292" height="44" rx="5" fill="' +
      ink +
      '"/>',
    text('page-button-label', 177, 738, 'Choose a date', 18, 400, cream),
    '<rect data-element="page-dimmer" data-change="opacity" x="138" y="79" width="334" height="736" fill="#000000" clip-path="url(#screen-clip)" opacity="' +
      (after ? 0.48 : 0) +
      '"/>',
    '<rect data-element="dialog-surface" x="150" y="430" width="310" height="250" rx="12" fill="' +
      cream +
      '"/>',
    text('dialog-title', 174, 480, 'Confirm your date', 24, 500),
    text('dialog-date', 174, 525, 'Monday 16 Nov', 20),
    '<rect data-element="continue-button" x="174" y="565" width="262" height="44" rx="5" fill="' +
      ink +
      '"/>',
    text('continue-label', 194, 593, 'Continue', 18, 400, cream),
    text('cancel', 174, 650, 'Cancel', 18),
  ].join('');
const specs = [
  {
    name: 'figure-ground-open-evening',
    photo: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: poster,
    title: 'Open-evening poster: give lettering a dependable photographic ground',
    before: 'BEFORE · Light type crosses photo detail',
    after: 'AFTER · The ground recedes beneath type',
    description:
      'Only the gradient overlay opacity changes from 0 to 1. The overlay is transparent at the photograph’s top and reaches black at 0.76 opacity from 38 percent of its height downward; all four light text lines lie within that darker region. Typography, words, sizes, positions, photograph data/crop, paper and lighting remain identical. The overlay intentionally darkens the ground but does not replace or recrop the source photo. Original fictional poster.',
    footer:
      'Only a gradient shade appears. Text, photograph source/crop, positions, paper and lighting stay fixed.',
  },
  {
    name: 'figure-ground-loop-pitcher',
    photo: 'figure-ground-pitcher-cutout.png',
    stage: 'scale-print-stage-v2.jpg',
    draw: product,
    title: 'Product sheet: distinguish a dark pitcher from its backdrop',
    before: 'BEFORE · Dark object on a similar ground',
    after: 'AFTER · A lighter ground reveals the edge',
    description:
      'Only the product-ground fill changes from #292b2b to #e7e3d8. The identical generated transparent PNG, including any baked soft shadow and the transparent loop-handle opening, is reused at the same position, extent and fitting rule. All copy, typography, colors outside the backdrop, paper and lighting stay fixed. Original fictional product; a composited photographic cutout rather than two separate photographs.',
    footer:
      'Only the backdrop fill changes. The same cutout file, transparency, size, placement, type and paper remain.',
  },
  {
    name: 'figure-ground-date-dialog',
    photo: 'audience-workspace-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    draw: dialog,
    title: 'Date dialog: distinguish the foreground task from the page behind',
    before: 'BEFORE · Page and dialog compete',
    after: 'AFTER · The page recedes behind the dialog',
    description:
      'Only a screen-clipped black page-dimmer opacity changes from 0 to 0.48. It remains below the identical opaque dialog and above the identical underlying page. Dialog surface, text and controls, page content, positions, photograph/crop, phone and lighting stay fixed. Original fictional static mockup of an intended modal dialog; background inertness and keyboard focus are not implemented or demonstrated by the image.',
    footer:
      'Only the dimmer opacity changes behind the dialog. All foreground content, geometry, image and phone stay fixed.',
  },
];
for (const s of specs) {
  const stage = await embedded(s.stage);
  const defs = `<defs><image id="stage" width="610" height="915" href="${stage}"/>${(await Promise.all(['photo', 'photo2', 'photo3', 'photo4'].filter((key) => s[key]).map(async (key) => `<image id="${key}" width="${s[key].endsWith('.png') ? pitcherWidth : 1536}" height="${s[key].endsWith('.png') ? pitcherHeight : 1024}" href="${await embedded(s[key])}"/>`))).join('')}<linearGradient id="photo-shade-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000000" stop-opacity="0"/><stop offset="0.38" stop-color="#000000" stop-opacity="0.76"/><stop offset="1" stop-color="#000000" stop-opacity="0.76"/></linearGradient><clipPath id="screen-clip"><rect x="138" y="79" width="334" height="736" rx="42"/></clipPath></defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example. Selected generated photographs; separately authored typography and layout. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${text('after-label', 712, 44, s.after, 23, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 21)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="660" height="2070" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 23, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three figure-ground comparisons and their stacked versions.');
