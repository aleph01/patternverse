import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVSilhouetteSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, fontFile))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#2e4836',
  ground = '#e7e3d8';
const matrix = `0 0 0 0 ${46 / 255} 0 0 0 0 ${72 / 255} 0 0 0 0 ${54 / 255} 0 0 0 1 0`;
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, copy, size = 22) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVSilhouetteSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}">${escape(copy)}</text>`;
const embedded = async (file) =>
  `data:image/${file.endsWith('.png') ? 'png' : 'jpeg'};base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const specs = [
  {
    name: 'silhouette-pitcher-shelf',
    source: 'figure-ground-pitcher-cutout.png',
    sourceDimensions: [1312, 1199],
    frame: [65, 220, 480, 320],
    title: 'Shelf guide: replace finish detail with a silhouette category cue',
    beforeLabel: 'BEFORE · One finish stands for the category',
    afterLabel: 'AFTER · Shape carries the category cue',
    beforeFilter: 'none',
    afterFilter: 'url(#silhouette-tone)',
    beforeGround: ground,
    afterGround: ground,
    change: {
      element: 'object-tone',
      attribute: 'filter',
      values: ['none', 'url(#silhouette-tone)'],
    },
    description:
      'Only object-tone filter changes none→silhouette-tone. The native SVG color matrix sets RGB to a constant ink color and leaves source alpha unchanged. Same photographic cutout, silhouette boundary, handle opening, image fitting/placement and frame; no tracing, redraw, raster edit or scale change. All copy, typography, backdrop and paper/light remain identical. Soft source-edge/shadow alpha is retained.',
    copy: [
      ['brand', 65, 104, 'FIELD / SHARED STUDIO', 20],
      ['headline', 65, 170, 'Pitchers', 46],
      ['instruction', 65, 608, 'Return clean pitchers here.', 28],
      ['condition', 65, 656, 'All finishes · Shelf 03', 23],
      ['purpose', 65, 704, 'Category cue · Check the written label', 21],
      ['url', 65, 820, 'field.example/studio', 20],
    ],
  },
  {
    name: 'silhouette-shears-ground',
    source: 'silhouette-shears-cutout.png',
    sourceDimensions: [1536, 1024],
    frame: [65, 220, 480, 320],
    title: 'Tool return card: give the silhouette a dependable ground',
    beforeLabel: 'BEFORE · Dark shape on a similar ground',
    afterLabel: 'AFTER · The lighter ground reveals the gaps',
    beforeFilter: 'url(#silhouette-tone)',
    afterFilter: 'url(#silhouette-tone)',
    beforeGround: '#687464',
    afterGround: ground,
    change: { element: 'object-ground', attribute: 'fill', values: ['#687464', ground] },
    description:
      'Only object-ground fill changes #687464→#e7e3d8. The identical generated open-shears PNG and constant-RGB alpha-preserving silhouette filter remain fixed. Blade/handle separation, fitting, orientation, size, placement, copy, typography and paper/light are identical. No moving parts, new silhouette geometry or recolored text. Source transparency including antialiased edges is retained.',
    copy: [
      ['brand', 65, 104, 'COMMON / TOOL RETURN', 20],
      ['headline', 65, 170, 'Pruning shears', 46],
      ['instruction', 65, 608, 'Return after cleaning.', 28],
      ['condition', 65, 656, 'Tool rack · Hook 04', 23],
      ['purpose', 65, 704, 'Match the shape and the written label.', 21],
      ['url', 65, 820, 'common.example/tool-library', 20],
    ],
  },
  {
    name: 'silhouette-maker-detail',
    source: 'silhouette-maker-cutout.png',
    sourceDimensions: [1145, 1374],
    frame: [65, 210, 480, 390],
    title:
      'Speaker poster: restore internal detail when a silhouette loses the intended information',
    beforeLabel: 'BEFORE · Facial detail disappears',
    afterLabel: 'AFTER · The portrait restores facial detail',
    beforeFilter: 'url(#silhouette-tone)',
    afterFilter: 'none',
    beforeGround: ground,
    afterGround: ground,
    change: {
      element: 'object-tone',
      attribute: 'filter',
      values: ['url(#silhouette-tone)', 'none'],
    },
    description:
      'Only object-tone filter changes silhouette-tone→none. The identical generated fictional maker cutout, alpha, outline, pose, image frame/fitting, position and all text/type/paper/light stay fixed. Original source color and internal detail return; no reshoot, new identity, pose change, retouching or crop change. This is an intentional exception to silhouette use.',
    copy: [
      ['brand', 65, 104, 'YARD / STUDIO CONVERSATIONS', 20],
      ['headline', 65, 170, 'Meet the maker', 44],
      ['speaker', 65, 660, 'With Ari Vale · Ceramic maker', 26],
      ['event', 65, 704, 'Thu 19 Nov · 19:00 · Free entry', 23],
      ['url', 65, 820, 'yard.example/conversations', 20],
    ],
  },
];
const records = [];
for (const s of specs) {
  const [sw, sh] = s.sourceDimensions,
    [fx, fy, fw, fh] = s.frame;
  const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await embedded('scale-print-stage-v2.jpg')}"/><image id="photo" width="${sw}" height="${sh}" href="${await embedded(s.source)}"/><clipPath id="image-clip"><rect x="${fx}" y="${fy}" width="${fw}" height="${fh}"/></clipPath><filter id="silhouette-tone" filterUnits="userSpaceOnUse" x="${fx}" y="${fy}" width="${fw}" height="${fh}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${matrix}"/></filter></defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)} Original fictional example. Generated photographic sources; native silhouette composition and typography.</desc>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/><rect data-element="object-ground"${s.change.element === 'object-ground' ? ' data-change="fill"' : ''} x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="${after ? s.afterGround : s.beforeGround}"/><g clip-path="url(#image-clip)"><g data-element="object-tone"${s.change.element === 'object-tone' ? ' data-change="filter"' : ''} filter="${after ? s.afterFilter : s.beforeFilter}"><svg data-element="image-window" x="${fx}" y="${fy}" width="${fw}" height="${fh}" viewBox="0 0 ${sw} ${sh}" preserveAspectRatio="xMidYMid meet"><use data-element="selected-photo" href="#photo"/></svg></g></g>${s.copy.map((args) => text(...args)).join('')}</g>`;
  const label = (x, y, copy, size = 20) =>
    `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="${ink}">${escape(copy)}</text>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group(false, 30, 70)}${group(true, 680, 70)}${label(60, 1030, 'Only the declared silhouette treatment or ground changes. Source, outline, scale, copy and presentation stay fixed.')}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(60, 44, s.beforeLabel)}${group(false, 25, 70)}${label(60, 1064, s.afterLabel)}${group(true, 25, 1090)}${label(60, 2050, 'Fictional examples · Generated cutouts + native silhouette')}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
  records.push({
    name: s.name,
    source: s.source,
    sourceDimensions: s.sourceDimensions,
    stage: 'scale-print-stage-v2.jpg',
    dimensions: { wide: [1320, 1060], stacked: [660, 2070] },
    frame: s.frame,
    description: s.description,
    copy: s.copy,
    declaredChanges: s.change.values.map((value) => [
      { element: s.change.element, attribute: s.change.attribute, value },
    ]),
    filters: [s.beforeFilter, s.afterFilter],
    grounds: [s.beforeGround, s.afterGround],
  });
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-silhouette-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      ink,
      ground,
      matrix,
      method:
        'Native SVG constant-RGB silhouette matrix preserves the input alpha channel. First pair applies it to an unchanged pitcher cutout; second preserves the shears silhouette while changing only its ground; third removes it to restore a portrait when internal detail matters. Every source, alpha, image fitting, pose, scale, placement, copy, typography and presentation stays fixed within each pair. No raster editing, automatic tracing or regenerated comparison variants.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log('Built three silhouette decisions and stacked views from fixed photographic cutouts.');
