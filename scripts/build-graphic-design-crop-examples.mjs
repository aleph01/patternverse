import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVCropSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, fontFile))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#2e4836';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, copy, size = 22) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVCropSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}">${escape(copy)}</text>`;
const image = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const specs = [
  {
    name: 'crop-handbuilding-action',
    source: 'meaning-handbuilding-photo.jpg',
    frame: [65, 155, 480, 320],
    before: [0, 0, 1536, 1024],
    after: [400, 130, 1080, 720],
    title: 'Workshop invitation: tighten the source window around the making action',
    beforeLabel: 'BEFORE · A broad view of the workbench',
    afterLabel: 'AFTER · Hands and bowl occupy more of the frame',
    description:
      'Only the image-window viewBox changes from the full1536×1024 source to x400/y130/1080×720. The same source photograph, fixed480×320 frame, typography, copy, colors, paper and presentation remain identical. Source inset marks before dashed and after solid.',
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
    name: 'crop-tableware-edge',
    source: 'explicit-tableware-photo.jpg',
    frame: [105, 145, 400, 400],
    before: [128, 0, 1024, 1024],
    after: [400, 0, 1024, 1024],
    title: 'Product card: shift an equal-size crop to preserve the product outline',
    beforeLabel: 'BEFORE · The square crop clips the handle',
    afterLabel: 'AFTER · Shift the window; keep the same scale',
    description:
      'Only the image-window viewBox x coordinate changes128→400. Both windows are1024×1024 at y0. Same square400×400 frame, source photo, product copy, font settings, colors and paper. No zoom, retouching or new image. Source inset marks before dashed and after solid.',
    copy: [
      ['brand', 65, 104, 'YARD / TABLEWARE', 20],
      ['headline', 65, 607, 'Cup + saucer', 44],
      ['purpose', 65, 653, 'Sold as a two-piece set.', 25],
      ['dimensions', 65, 696, '320 ml cup · 14 cm saucer', 23],
      ['price', 65, 737, '£24 · Stoneware · Warm white', 23],
      ['action', 65, 778, 'yard.example/tableware', 21],
      ['footer', 65, 826, 'Illustrative product image', 18],
    ],
  },
  {
    name: 'crop-room-context',
    source: 'meaning-enclosed-room-photo.jpg',
    frame: [65, 155, 480, 320],
    before: [200, 100, 960, 640],
    after: [0, 0, 1536, 1024],
    title: 'Room booking card: widen the view to restore the enclosure cue',
    beforeLabel: 'BEFORE · A tight crop omits the door',
    afterLabel: 'AFTER · A wider crop restores useful context',
    description:
      'Only the image-window viewBox changes from x200/y100/960×640 to full1536×1024 source. Same480×320 frame, source photograph, copy, typography, colors, paper and lighting. Widening restores the closed door and more room context; it does not establish acoustic privacy. Source inset marks before dashed and after solid.',
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
];
const records = [];
for (const s of specs) {
  const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await image('scale-print-stage-v2.jpg')}"/><image id="photo" width="1536" height="1024" href="${await image(s.source)}"/></defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)} Fictional example. Reused generated photograph; native typography and crop windows.</desc>`;
  const [fx, fy, fw, fh] = s.frame;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/><svg data-element="image-window" data-change="viewBox" x="${fx}" y="${fy}" width="${fw}" height="${fh}" viewBox="${(after ? s.after : s.before).join(' ')}" preserveAspectRatio="xMidYMid meet" overflow="hidden"><use data-element="selected-photo" href="#photo"/></svg>${s.copy.map((args) => text(...args)).join('')}</g>`;
  const label = (x, y, copy, size = 20) =>
    `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="${ink}">${escape(copy)}</text>`;
  const guide = (x, y) =>
    `<g data-element="source-guide" transform="translate(${x} ${y})"><use href="#photo" transform="scale(${360 / 1536})"/>${[s.before, s.after].map((crop, i) => `<rect data-crop-guide="${i ? 'after' : 'before'}" x="${(crop[0] * 360) / 1536}" y="${(crop[1] * 360) / 1536}" width="${(crop[2] * 360) / 1536}" height="${(crop[3] * 360) / 1536}" fill="none" stroke="${i ? '#076447' : '#2359a0'}" stroke-width="3"${i ? '' : ' stroke-dasharray="8 5"'}/>`).join('')}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1420" viewBox="0 0 1320 1420" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group(false, 30, 70)}${group(true, 680, 70)}${label(60, 1030, 'Only the source window changes. Photo bytes, image frame, type, copy, layout and presentation stay fixed.')}${label(60, 1095, 'SOURCE VIEW · Crop boundaries, outside the printed design')}${guide(60, 1130)}${label(465, 1180, 'Dashed blue boundary: before')}${label(465, 1230, 'Solid green boundary: after')}${label(465, 1290, 'Source photograph stays unchanged.')}${label(60, 1400, 'Fictional examples · Reused generated photographs')}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2480" viewBox="0 0 660 2480" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(60, 44, s.beforeLabel)}${group(false, 25, 70)}${label(60, 1064, s.afterLabel)}${group(true, 25, 1090)}${label(60, 2065, 'SOURCE · Dashed: before · Solid: after', 20)}${guide(150, 2100)}${label(60, 2400, 'Same source · Only the crop window changes', 20)}${label(60, 2450, 'Fictional example · Generated photograph', 20)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
  records.push({
    name: s.name,
    source: s.source,
    stage: 'scale-print-stage-v2.jpg',
    dimensions: { wide: [1320, 1420], stacked: [660, 2480] },
    sourceDimensions: [1536, 1024],
    frame: s.frame,
    before: s.before,
    after: s.after,
    description: s.description,
    copy: s.copy,
    declaredChanges: [s.before, s.after].map((crop) => [
      { element: 'image-window', attribute: 'viewBox', value: crop.join(' ') },
    ]),
    guide: { width: 360, height: 240, scale: 360 / 1536, beforeDash: '8 5', afterDash: 'none' },
  });
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-crop-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Only image-window viewBox changes in each fixed artifact. The same embedded1536×1024 source is fitted uniformly to a fixed frame; crop/frame aspect ratios match exactly. Native copy, font settings, colors, paper and presentation are identical. Source insets show exact dashed-before and solid-after boundaries outside the printed artifacts. No raster editing, stretching, rotation, color correction or new generation.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log('Built three crop-only comparisons, source insets and stacked views.');
