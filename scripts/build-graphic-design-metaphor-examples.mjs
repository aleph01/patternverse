import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVMetaphorSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, fontFile))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#2e4836',
  ground = '#e7e3d8';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, copy, size = 22, change = '') =>
  `<text data-element="${id}"${change ? ` data-change="${change}"` : ''} x="${x}" y="${y}" font-family="PVMetaphorSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}">${escape(copy)}</text>`;
const source = async (id, file) => {
  const b = await readFile(resolve(assets, file));
  return {
    id,
    file,
    width: b.readUInt32BE(16),
    height: b.readUInt32BE(20),
    url: 'data:image/png;base64,' + b.toString('base64'),
  };
};
const photo = (id, ref, x = 65, y = 220, w = 480, h = 320, sw = 1536, sh = 1024) =>
  `<svg data-element="${id}" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${sw} ${sh}" preserveAspectRatio="xMidYMid meet" overflow="hidden"><use href="#${ref}"/></svg>`;
const specs = [
  {
    name: 'metaphor-book-growth',
    sources: [
      ['book', 'metaphor-book-photo.png'],
      ['seedling', 'metaphor-seedling-cutout.png'],
    ],
    title: 'Library invitation: make the growth comparison visible',
    beforeLabel: 'BEFORE · A book identifies the topic',
    afterLabel: 'AFTER · A seedling makes growth visible',
    description:
      'Only seedling-cue opacity changes0→1. The identical book photograph and fixed source window stay untouched; a separately generated transparent seedling appears at fixed x217/y221/166.667×200, with its stem ending at the book gutter. Copy, typography, all other geometry, palette, paper and presentation remain fixed. This is an explicitly fictional photographic composite, not a documented plant growing in a real book.',
    change: { element: 'seedling-cue', attribute: 'opacity', values: ['0', '1'] },
    masks: [[217, 221, 167, 200]],
    copy: [
      ['brand', 65, 104, 'COMMON / LIBRARY EVENINGS', 20],
      ['headline', 65, 170, 'Ideas take root', 46],
      ['purpose', 65, 608, 'Reading + discussion evenings', 27],
      ['date', 65, 655, 'Tue 17 Nov · 18:30 · Free entry', 23],
      ['action', 65, 704, 'Bring a book and a question.', 23],
      ['url', 65, 820, 'common.example/library', 20],
    ],
    draw: (after) =>
      photo('book-window', 'book') +
      `<g data-element="seedling-cue" data-change="opacity" opacity="${after ? 1 : 0}">${photo('seedling-window', 'seedling', 217, 221, 166.667, 200, 1145, 1374)}</g>`,
  },
  {
    name: 'metaphor-cord-anchor',
    sources: [['photo', 'metaphor-cord-photo.png']],
    title: 'Workshop invitation: anchor a cord metaphor to project planning',
    beforeLabel: 'BEFORE · The pictured subject is ambiguous',
    afterLabel: 'AFTER · One line names the intended subject',
    description:
      'Only anchor-copy textContent changes from Make room for something new. to Plan the next steps of your project. The tangled-to-straight cord photograph, source bytes/crop, image box, all other copy, font family/size/weight/color/anchors, paper and lighting remain identical. New wording supplies the intended target of the comparison without changing its photographic source.',
    change: {
      element: 'anchor-copy',
      attribute: 'textContent',
      values: ['Make room for something new.', 'Plan the next steps of your project.'],
    },
    masks: [[65, 575, 480, 50]],
    copy: [
      ['brand', 65, 104, 'YARD / EVENING SESSIONS', 20],
      ['headline', 65, 170, 'Find your thread', 46],
      ['anchor-copy', 65, 608, 'Make room for something new.', 24],
      ['date', 65, 655, 'Thu 26 Nov · 18:30–20:30 · £18', 23],
      ['action', 65, 704, 'Bring one unfinished idea.', 23],
      ['url', 65, 820, 'yard.example/thread', 20],
    ],
    draw: () => photo('image-window', 'photo'),
  },
  {
    name: 'metaphor-peer-bridge',
    sources: [
      ['ladder', 'metaphor-ladder-cutout.png'],
      ['bridge', 'metaphor-bridge-cutout.png'],
    ],
    title: 'Peer learning invitation: replace ascent with connection',
    beforeLabel: 'BEFORE · A ladder suggests upward levels',
    afterLabel: 'AFTER · A bridge suggests connection',
    description:
      'Only metaphor-object href changes#ladder→#bridge inside the fixed480×320 frame and unchanged1536×1024 source coordinate system. Two separately generated pale-wood model cutouts deliberately change the pictured source object and its geometry. All wording, native type, frame, fitting rule, neutral ground, layout, paper and presentation stay identical. Object-specific geometry/texture/lighting differ as part of source selection; no claim of an identical object or reshoot.',
    change: { element: 'metaphor-object', attribute: 'href', values: ['#ladder', '#bridge'] },
    masks: [[65, 220, 480, 320]],
    copy: [
      ['brand', 65, 104, 'COMMON / SHARED PRACTICE', 20],
      ['headline', 65, 170, 'Learn together', 46],
      ['purpose', 65, 608, 'Peer skill-sharing circle', 27],
      ['action', 65, 655, 'Bring a question; share a method.', 23],
      ['date', 65, 704, 'Wed 25 Nov · 18:30 · Free entry', 23],
      ['url', 65, 820, 'common.example/peer-circle', 20],
    ],
    draw: (after) =>
      `<svg data-element="image-window" x="65" y="220" width="480" height="320" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid meet" overflow="hidden"><use data-element="metaphor-object" data-change="href" href="#${after ? 'bridge' : 'ladder'}"/></svg>`,
  },
];
const records = [];
for (const s of specs) {
  const sources = await Promise.all(s.sources.map((args) => source(...args)));
  const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="data:image/jpeg;base64,${(await readFile(resolve(assets, 'scale-print-stage-v2.jpg'))).toString('base64')}"/>${sources.map((p) => `<image id="${p.id}" width="${p.width}" height="${p.height}" href="${p.url}"/>`).join('')}<clipPath id="image-clip"><rect x="65" y="220" width="480" height="320"/></clipPath></defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)} Original fictional example. Generated photographic artwork and separately authored typography.</desc>`;
  const copy = (after) =>
    s.copy
      .map((args) => {
        const a = [...args];
        if (s.change.attribute === 'textContent' && a[0] === s.change.element) {
          a[3] = s.change.values[after ? 1 : 0];
          return text(...a, 'textContent');
        }
        return text(...a);
      })
      .join('');
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/><rect data-element="image-ground" x="65" y="220" width="480" height="320" fill="${ground}"/><g clip-path="url(#image-clip)">${s.draw(after)}</g>${copy(after)}</g>`;
  const label = (x, y, copy, size = 20) =>
    `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="${ink}">${escape(copy)}</text>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group(false, 30, 70)}${group(true, 680, 70)}${label(60, 1030, 'Only the declared metaphor cue, wording or source changes. Type, layout, frame and presentation stay fixed.')}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(60, 44, s.beforeLabel)}${group(false, 25, 70)}${label(60, 1064, s.afterLabel)}${group(true, 25, 1090)}${label(60, 2050, 'Fictional examples · Generated photos + native layout')}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
  records.push({
    name: s.name,
    sources: sources.map(({ id, file, width, height }) => ({ id, file, width, height })),
    stage: 'scale-print-stage-v2.jpg',
    dimensions: { wide: [1320, 1060], stacked: [660, 2070] },
    frame: [65, 220, 480, 320],
    description: s.description,
    masks: s.masks,
    copy: s.copy,
    declaredChanges: s.change.values.map((value) => [
      { element: s.change.element, attribute: s.change.attribute, value },
    ]),
  });
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-metaphor-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Each comparison changes one declared cue: seedling visibility over an unchanged book; one explanatory text node beside an unchanged cord photo; or the selected ladder/bridge source object within the same frame. Surrounding typography, layout, copy except the declared anchor line, paper and presentation remain fixed. The third case intentionally changes source-object geometry/material appearance; other cases reuse identical photographic bytes/crops.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log('Built three metaphor comparisons and stacked views from photographic artwork.');
