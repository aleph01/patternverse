import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVBackgroundSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, fontFile))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#2e4836',
  paper = '#fffdf6';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, copy, size = 22, fill = ink) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVBackgroundSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${fill}">${escape(copy)}</text>`;
const embedded = async (file) =>
  `data:image/${file.endsWith('.png') ? 'png' : 'jpeg'};base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const photo = (x, y, w, h, sw = 1536, sh = 1024, fit = 'slice') =>
  `<svg data-element="image-window" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${sw} ${sh}" preserveAspectRatio="xMidYMid ${fit}" overflow="hidden"><use data-element="selected-photo" href="#photo"/></svg>`;
const specs = [
  {
    name: 'background-studio-invitation',
    source: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    sourceDimensions: [1536, 1024],
    change: 'text-backing',
    values: ['0', '1'],
    mask: [85, 490, 440, 230],
    title: 'Studio invitation: protect lettering with a local opaque backing',
    beforeLabel: 'BEFORE · Lettering crosses studio detail',
    afterLabel: 'AFTER · A local backing protects the text',
    description:
      'Only text-backing opacity changes 0→1. The cream rectangle stays at x85/y490/440×230. The source photograph, crop, native copy, typography, all coordinates, paper and lighting remain identical. The rest of the photograph remains untreated.',
    draw: (after) =>
      [
        text('brand', 65, 104, 'YARD / OPEN EVENING', 20),
        photo(65, 155, 480, 600),
        `<rect data-element="text-backing" data-change="opacity" x="85" y="490" width="440" height="230" fill="${paper}" opacity="${after ? 1 : 0}"/>`,
        text('headline', 105, 542, 'Open studio', 40),
        text('invitation', 105, 588, 'Meet the makers.', 25),
        text('date', 105, 636, 'Sat 14 Nov · 17:00–20:00', 22),
        text('entry', 105, 680, 'Free entry · Yard Studio', 22),
        text('url', 65, 820, 'yard.example/open-evening', 20),
      ].join(''),
  },
  {
    name: 'background-pitcher-texture',
    source: 'figure-ground-pitcher-cutout.png',
    stage: 'scale-print-stage-v2.jpg',
    sourceDimensions: [1312, 1199],
    change: 'backdrop-pattern',
    values: ['0.65', '0.1'],
    mask: [65, 250, 480, 350],
    title: 'Product sheet: reduce decorative texture without altering the object',
    beforeLabel: 'BEFORE · Strong waves behind the pitcher',
    afterLabel: 'AFTER · The same pattern recedes',
    description:
      'Only backdrop-pattern opacity changes 0.65→0.1 on a fixed #e7e3d8 field. The same native wave pattern and identical RGBA pitcher cutout stay in place. Source bytes, alpha, object scale, copy, font settings, paper and lighting remain identical. This is a photographic cutout on a designed backdrop, not a retouched scene.',
    draw: (after) =>
      [
        text('brand', 65, 104, 'FIELD / OBJECTS FOR EVERY DAY', 20),
        text('headline', 65, 202, 'Loop pitcher', 44),
        '<rect data-element="product-ground" x="65" y="250" width="480" height="350" fill="#e7e3d8"/>',
        `<rect data-element="backdrop-pattern" data-change="opacity" x="65" y="250" width="480" height="350" fill="url(#waves)" opacity="${after ? 0.1 : 0.65}"/>`,
        photo(95, 270, 420, 310, 1312, 1199, 'meet'),
        text('specification', 65, 660, 'Charcoal stoneware · 1 litre', 23),
        text('price', 65, 706, '€38 / pitcher', 28),
        text('description', 65, 754, 'Hand-finished surface', 22),
        text('url', 65, 820, 'field.example/pitcher', 20),
      ].join(''),
  },
  {
    name: 'background-booking-surface',
    source: 'audience-workspace-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    sourceDimensions: [1536, 1024],
    change: 'booking-surface',
    values: ['0.66', '1'],
    mask: [150, 405, 310, 280],
    phone: true,
    title: 'Booking card: make a translucent information surface opaque',
    beforeLabel: 'BEFORE · Desk details show through the card',
    afterLabel: 'AFTER · Facts sit on an opaque surface',
    description:
      'Only booking-surface opacity changes 0.66→1. The cream rectangle stays at x150/y405/310×280. Photograph bytes/crop, all text, button, spacing, phone stage and lighting stay fixed. The photograph remains visible above and around the surface. This is a static fictional booking page.',
    draw: (after) =>
      [
        text('brand', 158, 150, 'COMMON / DAY PASSES', 18),
        text('headline', 158, 203, 'A desk for a day', 30),
        photo(138, 225, 334, 490),
        `<rect data-element="booking-surface" data-change="opacity" x="150" y="405" width="310" height="280" rx="10" fill="${paper}" opacity="${after ? 1 : 0.66}"/>`,
        text('card-title', 174, 450, 'Day pass', 27),
        text('date', 174, 494, 'Monday 16 Nov', 22),
        text('hours', 174, 536, '09:00–18:00', 21),
        text('price', 174, 576, '€18 per person', 21),
        '<rect data-element="booking-button" x="174" y="605" width="262" height="44" rx="5" fill="' +
          ink +
          '"/>',
        text('button-label', 194, 634, 'Continue to booking', 20, paper),
        text('footer', 158, 768, 'Check availability before travel.', 18),
      ].join(''),
  },
];
const records = [];
for (const s of specs) {
  const [sw, sh] = s.sourceDimensions;
  const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await embedded(s.stage)}"/><image id="photo" width="${sw}" height="${sh}" href="${await embedded(s.source)}"/><pattern id="waves" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M-12 0C12 0 12 24 36 24S60 48 84 48M-12-24C12-24 12 0 36 0S60 24 84 24M-12 24C12 24 12 48 36 48S60 72 84 72" fill="none" stroke="#527465" stroke-width="2"/></pattern></defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)} Fictional example. Reused generated photographic assets and native composition.</desc>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const label = (x, y, copy, size = 20) =>
    `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="${ink}">${escape(copy)}</text>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group(false, 30, 70)}${group(true, 680, 70)}${label(60, 1030, 'Only the declared background opacity changes. Foreground content, type, image crop and presentation stay fixed.')}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(60, 44, s.beforeLabel)}${group(false, 25, 70)}${label(60, 1064, s.afterLabel)}${group(true, 25, 1090)}${label(60, 2050, 'Fictional example · Reused generated photography')}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
  records.push({
    name: s.name,
    source: s.source,
    stage: s.stage,
    sourceDimensions: s.sourceDimensions,
    dimensions: { wide: [1320, 1060], stacked: [660, 2070] },
    description: s.description,
    mask: s.mask,
    declaredChanges: s.values.map((value) => [{ element: s.change, attribute: 'opacity', value }]),
  });
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-background-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Native SVG backing, pattern and surface opacity changes only. Reused photograph/cutout and presentation sources remain unchanged. No photographic editing, blurring, new generation, crop or foreground changes.',
      colors: {
        foreground: ink,
        opaqueSurface: paper,
        productGround: '#e7e3d8',
        waveStroke: '#527465',
      },
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log('Built three background-only comparisons and stacked views.');
