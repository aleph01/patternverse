import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVIntegrationSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, fontFile))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#2e4836',
  paper = '#fffdf6';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, copy, size = 22) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVIntegrationSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}">${escape(copy)}</text>`;
const embedded = async (file) =>
  `data:image/${file.endsWith('.png') ? 'png' : 'jpeg'};base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const photo = (id, ref, x, y, w, h, sw = 1536, sh = 1024, fit = 'meet') =>
  `<svg data-element="${id}" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${sw} ${sh}" preserveAspectRatio="xMidYMid ${fit}" overflow="hidden"><use href="#${ref}"/></svg>`;
const specs = [
  {
    name: 'integration-newsletter-captions',
    sources: [
      ['photo', 'meaning-handbuilding-photo.jpg', 1536, 1024],
      ['photo2', 'explicit-tableware-photo.jpg', 1536, 1024],
    ],
    title: 'Newsletter: attach each offer to its photograph',
    beforeLabel: 'BEFORE · Offers separated from photographs',
    afterLabel: 'AFTER · Each offer sits beside its image',
    description:
      'Only two caption-group transforms change: each rises300 units. Photographs, source bytes, image windows/crops, copy, type settings, introduction, footer, paper and lighting remain identical. The offers stay in their original left and right columns.',
    changes: [
      [
        { element: 'workshop-caption', attribute: 'transform', value: 'translate(65 660)' },
        { element: 'shop-caption', attribute: 'transform', value: 'translate(320 660)' },
      ],
      [
        { element: 'workshop-caption', attribute: 'transform', value: 'translate(65 360)' },
        { element: 'shop-caption', attribute: 'transform', value: 'translate(320 360)' },
      ],
    ],
    mask: [
      [65, 360, 225, 100],
      [320, 360, 225, 100],
      [65, 660, 225, 100],
      [320, 660, 225, 100],
    ],
    draw: (after) =>
      [
        text('brand', 65, 104, 'YARD / NOVEMBER NOTES', 20),
        text('headline', 65, 170, 'Two ways into clay', 43),
        photo('workshop-photo', 'photo', 65, 200, 225, 150),
        photo('shop-photo', 'photo2', 320, 200, 225, 150),
        `<g data-element="workshop-caption" data-change="transform" transform="translate(65 ${after ? 360 : 660})">${text('workshop-title', 0, 25, 'Handbuilding workshop', 21)}${text('workshop-price', 0, 56, 'Wed 18 Nov · £28', 20)}${text('workshop-includes', 0, 86, 'Clay, tools + firing included', 18)}</g>`,
        `<g data-element="shop-caption" data-change="transform" transform="translate(320 ${after ? 360 : 660})">${text('shop-title', 0, 25, 'Cup + saucer set', 21)}${text('shop-price', 0, 56, '£24 · Warm white', 20)}${text('shop-size', 0, 86, '320 ml cup · 14 cm saucer', 18)}</g>`,
        text('intro-0', 65, 530, 'Make something with us, or choose a finished piece.', 21),
        text('intro-1', 65, 564, 'Workshop bookings and shop orders are separate.', 21),
        text('url', 65, 820, 'yard.example/november', 20),
      ].join(''),
  },
  {
    name: 'integration-pitcher-labels',
    sources: [['photo', 'figure-ground-pitcher-cutout.png', 1312, 1199]],
    title: 'Product detail sheet: connect names to visible features',
    beforeLabel: 'BEFORE · Feature names remain a separate list',
    afterLabel: 'AFTER · Leaders identify the exact features',
    description:
      'Only feature-leaders opacity changes0→1. Two fixed elbow paths end at the pouring lip and loop-handle opening. Product source/alpha, placement, scale, captions, colors, typography, page geometry, paper and lighting remain identical. No claims about performance are introduced.',
    changes: [
      [{ element: 'feature-leaders', attribute: 'opacity', value: '0' }],
      [{ element: 'feature-leaders', attribute: 'opacity', value: '1' }],
    ],
    mask: [[100, 270, 400, 245]],
    draw: (after) =>
      [
        text('brand', 65, 104, 'FIELD / PRODUCT DETAILS', 20),
        text('headline', 65, 180, 'Two details to inspect', 40),
        text('lip-label', 65, 255, 'Pouring lip', 23),
        text('handle-label', 350, 255, 'Loop handle', 23),
        '<rect data-element="product-ground" x="65" y="300" width="480" height="390" fill="#e7e3d8"/>',
        photo('product-photo', 'photo', 110, 330, 390, 350, 1312, 1199),
        `<g data-element="feature-leaders" data-change="opacity" opacity="${after ? 1 : 0}" fill="none" stroke="${ink}" stroke-width="2"><path data-element="lip-leader" d="M115 274V359L172 374"/><path data-element="handle-leader" d="M410 274H490V477H443"/><circle cx="172" cy="374" r="3" fill="${ink}"/><circle cx="443" cy="477" r="3" fill="${ink}"/></g>`,
        text('specification', 65, 742, 'Charcoal stoneware · 1 litre · €38', 23),
        text('url', 65, 820, 'field.example/pitcher', 20),
      ].join(''),
  },
  {
    name: 'integration-maker-poster',
    sources: [['photo', 'guide-maker-portrait.jpg', 1024, 1536]],
    title: 'Studio poster: coordinate a title panel with the portrait',
    beforeLabel: 'BEFORE · The title panel covers the face',
    afterLabel: 'AFTER · Words and portrait keep their roles',
    description:
      'Only title-panel transform changes from translate(85 320) to translate(85 590). Panel size/fill, words, type sizes, source portrait/crop, all other positions, paper and lighting remain identical. The panel moves from the face to the lower apron area. The generated person is fictional.',
    changes: [
      [{ element: 'title-panel', attribute: 'transform', value: 'translate(85 320)' }],
      [{ element: 'title-panel', attribute: 'transform', value: 'translate(85 590)' }],
    ],
    mask: [
      [85, 320, 440, 155],
      [85, 590, 440, 155],
    ],
    draw: (after) =>
      [
        text('brand', 65, 104, 'YARD / STUDIO CONVERSATIONS', 20),
        photo('portrait-photo', 'photo', 65, 155, 480, 600, 1024, 1536, 'slice'),
        `<g data-element="title-panel" data-change="transform" transform="translate(85 ${after ? 590 : 320})"><rect data-element="panel-surface" width="440" height="155" fill="${paper}"/>${text('headline', 20, 53, 'Meet the maker', 40)}${text('subtitle', 20, 94, 'A studio conversation', 25)}${text('date', 20, 132, 'Thu 19 Nov · 19:00 · Free entry', 22)}</g>`,
        text('url', 65, 820, 'yard.example/conversations', 20),
      ].join(''),
  },
];
const records = [];
for (const s of specs) {
  const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await embedded('scale-print-stage-v2.jpg')}"/>${(await Promise.all(s.sources.map(async ([id, file, w, h]) => `<image id="${id}" width="${w}" height="${h}" href="${await embedded(file)}"/>`))).join('')}</defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)} Original fictional example. Reused generated photographic assets and native typography.</desc>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const label = (x, y, copy, size = 20) =>
    `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="${ink}">${escape(copy)}</text>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group(false, 30, 70)}${group(true, 680, 70)}${label(60, 1030, 'Only the declared text–image relationship changes. Photo bytes, crops, copy, type and presentation stay fixed.')}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(60, 44, s.beforeLabel)}${group(false, 25, 70)}${label(60, 1064, s.afterLabel)}${group(true, 25, 1090)}${label(60, 2050, 'Fictional example · Reused generated photography')}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
  records.push({
    name: s.name,
    sources: s.sources,
    stage: 'scale-print-stage-v2.jpg',
    dimensions: { wide: [1320, 1060], stacked: [660, 2070] },
    description: s.description,
    masks: s.mask,
    declaredChanges: s.changes,
  });
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-integration-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Only caption-group positions, feature-leader opacity or title-panel position changes. Photographic source bytes, crops, frames, native copy, font settings, palette, unrelated geometry and presentation remain identical. No raster editing or new image generation.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log('Built three text–image relationship comparisons and stacked views.');
