import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVAbstractionSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, fontFile))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#2e4836',
  ground = '#e7e3d8';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, copy, size = 22) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVAbstractionSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}">${escape(copy)}</text>`;
const embedded = async (file) =>
  `data:image/${file.endsWith('.png') ? 'png' : 'jpeg'};base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const pitcher = `<svg data-element="pitcher-model" x="65" y="220" width="480" height="320" viewBox="0 0 1312 1199" preserveAspectRatio="xMidYMid meet"><path data-feature="loop-handle" d="M870 220C1160 160 1320 290 1280 565C1250 790 1110 960 960 940L900 865C1080 870 1180 710 1190 530C1200 340 1060 300 890 295Z" fill="#303330"/><path data-feature="pitcher-body-lip" d="M160 170Q350 190 470 120Q640 72 870 120L900 250Q880 340 920 450Q1010 600 980 840Q960 1100 820 1130H430Q250 1120 210 870Q180 700 240 500L300 330Z" fill="#303330"/><path data-feature="rim" d="M180 172Q480 220 878 137" fill="none" stroke="${ground}" stroke-width="14" stroke-linecap="round"/><path data-feature="base" d="M400 1092H825" fill="none" stroke="${ground}" stroke-width="10" stroke-linecap="round"/></svg>`;
const room = `<g data-element="room-model" transform="translate(65 220)" fill="none" stroke="${ink}" stroke-width="4" stroke-linejoin="round"><path data-feature="room-boundary" d="M410 170V30H70V290H410V245"/><path data-feature="window" d="M70 100V190M64 100V190M76 100V190"/><path data-feature="door" d="M410 170V245M398 207H410"/><rect data-feature="table" x="160" y="110" width="160" height="100" rx="3" fill="#d8ccb6"/><g data-feature="chair"><rect x="210" y="60" width="60" height="36" rx="5" fill="#b9c2b2"/><path d="M210 67H270"/></g><g data-feature="chair"><rect x="100" y="142" width="38" height="60" rx="5" fill="#b9c2b2"/><path d="M107 142V202"/></g><g stroke="none">${text('window-label', 85, 90, 'Window', 20)}${text('door-label', 344, 225, 'Door', 20)}</g></g>`;
const seedPositions = Array.from({ length: 10 }, (_, i) => [
  72 + (i % 2) * 25,
  100 + Math.floor(i / 2) * 23,
]);
const seeds = `<g data-element="packing-model" transform="translate(65 220)" fill="none" stroke="${ink}" stroke-width="3" stroke-linejoin="round"><g data-feature="ten-seeds">${seedPositions.map(([x, y], i) => `<ellipse data-seed="${i + 1}" cx="${x}" cy="${y}" rx="8" ry="5" transform="rotate(-25 ${x} ${y})" fill="#b8aa91"/>`).join('')}</g><g data-feature="envelope"><path d="M210 105H285V220H210Z" fill="#d8ccb6"/><path d="M210 105L247 136L285 105M224 163H270M224 178H260"/></g><g data-feature="return-tray"><path d="M348 140H432L445 215H335Z" fill="#d8ccb6"/><path d="M348 140L358 194H421L432 140M335 215L358 194M445 215L421 194"/></g><path data-feature="arrow-one" d="M130 165H185M175 155L185 165L175 175"/><path data-feature="arrow-two" d="M295 165H325M315 155L325 165L315 175"/></g>`;
const specs = [
  {
    name: 'abstraction-pitcher-category',
    source: 'figure-ground-pitcher-cutout.png',
    sourceDimensions: [1312, 1199],
    fit: 'meet',
    title: 'Category guide: preserve the pitcher features without photographic surface detail',
    beforeLabel: 'BEFORE · Photograph used as a category cue',
    afterLabel: 'AFTER · A drawing keeps defining features',
    description:
      'Only the representation inside the fixed480×320 frame changes from an existing photographic cutout to an original native drawing. The drawing retains the lip, body, handle opening, rim and base while omitting material texture and shadow. It is an editorial interpretation, not an exact tracing. Copy, typography, frame, surrounding colors, layout, paper and lighting stay fixed.',
    drawing: pitcher,
    copy: [
      ['brand', 65, 104, 'FIELD / TABLEWARE GUIDE', 20],
      ['headline', 65, 170, 'Pitchers', 46],
      ['meaning', 65, 608, 'Recognize the form.', 28],
      ['feature', 65, 656, 'Pouring lip · Body · Loop handle', 23],
      ['purpose', 65, 704, 'Category cue, not a product specification', 21],
      ['url', 65, 820, 'field.example/tableware', 20],
    ],
  },
  {
    name: 'abstraction-room-arrangement',
    source: 'meaning-enclosed-room-photo.jpg',
    sourceDimensions: [1536, 1024],
    fit: 'meet',
    title: 'Room card: replace furnishing appearance with a conceptual arrangement',
    beforeLabel: 'BEFORE · Furnishings shown in perspective',
    afterLabel: 'AFTER · A plan isolates the arrangement',
    description:
      'Only the representation inside the fixed480×320 frame changes from an existing generated room photograph to an original conceptual plan. The plan retains one table, exactly two chairs, a left window and right door; it omits decor and surface appearance. It is not measured, a route map or an accessibility clearance plan. All copy, type, frame, surroundings, paper and lighting stay fixed.',
    drawing: room,
    copy: [
      ['brand', 65, 104, 'COMMON / ROOM GUIDE', 20],
      ['headline', 65, 170, 'Room for two', 46],
      ['meaning', 65, 608, '2 chairs · 1 table · Door on right', 25],
      ['qualification', 65, 655, 'Concept arrangement · Not to scale', 22],
      ['offer', 65, 704, 'Up to 2 people · £12 per hour', 23],
      ['url', 65, 820, 'common.example/rooms', 20],
    ],
  },
  {
    name: 'abstraction-seed-packing',
    source: 'form-seed-packing-photo.jpg',
    sourceDimensions: [1536, 1024],
    fit: 'meet',
    title: 'Volunteer card: replace a still life with a task sequence',
    beforeLabel: 'BEFORE · All materials share one scene',
    afterLabel: 'AFTER · The task becomes a sequence',
    description:
      'Only the representation inside the fixed480×320 frame changes from a generated seed-packing still life to an original schematic sequence. Exactly ten seed marks, one labeled-envelope symbol and one tray symbol are joined by two directional arrows. Fixed external text supplies count, action and order. Original photo remains unchanged in the before layer; no photographic editing. All copy, fonts, frame, surrounding layout, paper and lighting stay fixed.',
    drawing: seeds,
    copy: [
      ['brand', 65, 104, 'COMMON / SEED LIBRARY', 20],
      ['headline', 65, 170, 'Pack a seed envelope', 42],
      ['step-1', 65, 608, '1  Count 10 seeds.', 25],
      ['step-2', 65, 655, '2  Label envelope: name + year.', 25],
      ['step-3', 65, 704, '3  Place in the return tray.', 25],
      ['url', 65, 820, 'common.example/seed-library', 20],
    ],
  },
];
const records = [];
for (const s of specs) {
  const [sw, sh] = s.sourceDimensions;
  const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await embedded('scale-print-stage-v2.jpg')}"/><image id="photo" width="${sw}" height="${sh}" href="${await embedded(s.source)}"/><clipPath id="representation-clip"><rect x="65" y="220" width="480" height="320"/></clipPath></defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)} Fictional example. Generated photograph and original native abstraction; typography composed separately.</desc>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/><rect data-element="representation-ground" x="65" y="220" width="480" height="320" fill="${ground}"/><g clip-path="url(#representation-clip)"><g data-element="photographic-representation" data-change="opacity" opacity="${after ? 0 : 1}"><svg data-element="image-window" x="65" y="220" width="480" height="320" viewBox="0 0 ${sw} ${sh}" preserveAspectRatio="xMidYMid ${s.fit}"><use href="#photo"/></svg></g><g data-element="abstract-representation" data-change="opacity" opacity="${after ? 1 : 0}">${s.drawing}</g></g>${s.copy.map((args) => text(...args)).join('')}</g>`;
  const label = (x, y, copy, size = 20) =>
    `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="${ink}">${escape(copy)}</text>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group(false, 30, 70)}${group(true, 680, 70)}${label(60, 1030, 'Only the representation inside the fixed frame changes. Copy, type, layout, paper and lighting stay fixed.')}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(60, 44, s.beforeLabel)}${group(false, 25, 70)}${label(60, 1064, s.afterLabel)}${group(true, 25, 1090)}${label(60, 2050, 'Fictional examples · Generated photos + native diagrams')}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
  records.push({
    name: s.name,
    source: s.source,
    sourceDimensions: s.sourceDimensions,
    stage: 'scale-print-stage-v2.jpg',
    dimensions: { wide: [1320, 1060], stacked: [660, 2070] },
    frame: [65, 220, 480, 320],
    description: s.description,
    copy: s.copy,
    declaredChanges: [false, true].map((after) => [
      { element: 'photographic-representation', attribute: 'opacity', value: after ? '0' : '1' },
      { element: 'abstract-representation', attribute: 'opacity', value: after ? '1' : '0' },
    ]),
  });
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-abstraction-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Two clipped representation layers exchange opacity1/0→0/1 inside a fixed480×320 frame. The photo file and its fitting remain unchanged; native models deliberately change representation, detail, viewpoint or relationships as required. All external copy, type settings, frame bounds, colors, layout and presentation are identical. No raster editing or new image generation.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log('Built three photographic-to-native abstraction comparisons and stacked views.');
