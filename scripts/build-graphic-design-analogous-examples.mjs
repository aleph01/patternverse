import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVAnalogousSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, fontFile))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const luminance = (hex) =>
  rgb(hex)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
const hsl = (h, s, l) => {
  const a = s * Math.min(l, 1 - l);
  return (
    '#' +
    [0, 8, 4]
      .map((n) => {
        const k = (n + h / 30) % 12;
        return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
};
// Match relative luminance so these hue substitutions do not also repair faint text.
const sameLuminance = (hue, target, saturation = 0.44) => {
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (luminance(hsl(hue, saturation, mid)) < luminance(target)) lo = mid;
    else hi = mid;
  }
  return hsl(hue, saturation, (lo + hi) / 2);
};

const ink = '#20332f';
const coolBase = hsl(190, 0.45, 0.77);
const programmeBefore = [30, 190, 280].map((h) => sameLuminance(h, coolBase, 0.45));
const programmeAfter = [170, 190, 210].map((h) => sameLuminance(h, coolBase, 0.45));
const warmBase = hsl(35, 0.5, 0.72);
const coffeeBefore = [34, 35, 36].map((h) => sameLuminance(h, warmBase, 0.5));
const coffeeAfter = [15, 35, 55].map((h) => sameLuminance(h, warmBase, 0.5));
const supperPanel = hsl(80, 0.35, 0.9),
  supperInk = hsl(110, 0.3, 0.25),
  supperBefore = hsl(140, 0.3, 0.62),
  supperAfter = hsl(140, 0.3, 0.22);
const contrast = (a, b) => {
  const ys = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (ys[0] + 0.05) / (ys[1] + 0.05);
};
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, value, size = 22, fill = ink, changed = false, extra = '') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVAnalogousSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${fill}"${changed ? ' data-change="fill"' : ''} ${extra}>${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const image = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;

const programme = (after) =>
  [
    text('brand', 65, 104, 'YARD / WEEKEND WORKSHOPS', 20),
    photo(65, 155, 480, 180),
    text('headline', 65, 405, 'Make something', 50),
    text('date', 65, 450, 'Saturday 14 November', 22),
    ...['Clay bowl', 'Print a tote', 'Bookbinding']
      .map((name, i) => {
        const y = 490 + i * 85;
        return (
          `<rect data-element="session-${i}" data-change="fill" x="65" y="${y}" width="480" height="65" rx="3" fill="${(after ? programmeAfter : programmeBefore)[i]}"/>` +
          text('name-' + i, 85, y + 42, name, 26) +
          text('time-price-' + i, 355, y + 42, ['10:00 · £24', '13:00 · £18', '15:00 · £22'][i], 22)
        );
      })
      .join(''),
    text('footer', 65, 820, 'yard.example/weekend · Materials included', 20),
  ].join('');
const coffee = (after) =>
  [
    text('brand', 65, 104, 'FOLD / COFFEE COLLECTION', 20),
    photo(65, 155, 480, 180),
    text('headline', 65, 405, 'Three daily brews', 46),
    text('date', 65, 450, 'Whole beans · Roasted 12 November', 22),
    ...['House', 'Orchard', 'Night']
      .map((name, i) => {
        const y = 490 + i * 95;
        return (
          `<rect data-element="blend-${i}" data-change="fill" x="65" y="${y}" width="480" height="78" rx="3" fill="${(after ? coffeeAfter : coffeeBefore)[i]}"/>` +
          text('name-' + i, 85, y + 30, name, 26) +
          text(
            'flavor-' + i,
            85,
            y + 59,
            ['Cocoa & nut', 'Apple & honey', 'Caramel & spice'][i],
            20,
          ) +
          text(
            'weight-price-' + i,
            400,
            y + 45,
            ['250 g · £9', '250 g · £11', '250 g · £10'][i],
            20,
          )
        );
      })
      .join(''),
    text('footer', 65, 820, 'fold.example/coffee · Roasted locally', 20),
  ].join('');
const supper = (after) =>
  [
    text('brand', 65, 104, 'GARDEN / TABLE FOR TWELVE', 20, supperInk),
    photo(65, 155, 480, 240),
    text('headline', 65, 466, 'Courtyard supper', 46, supperInk),
    `<rect data-element="details-panel" x="65" y="515" width="480" height="220" fill="${supperPanel}"/>`,
    ...[
      'Friday 20 November · 19:00',
      'Courtyard table · 12 places',
      '£28 per person · Booking required',
      'garden.example/supper',
    ].map((copy, i) =>
      text(
        'detail-' + i,
        85,
        560 + i * 43,
        copy,
        i === 3 ? 22 : 24,
        after ? supperAfter : supperBefore,
        true,
      ),
    ),
    text('footer', 65, 820, 'Seasonal menu · Vegetarian options', 20, supperInk),
  ].join('');
const specs = [
  {
    name: 'analogous-workshop-family',
    source: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: programme,
    title: 'Programme: bring three session colors into one neighboring hue family',
    beforeLabel: 'BEFORE · Three separate hue directions',
    afterLabel: 'AFTER · Teal, cyan and blue form a family',
    description:
      'Only two session surface colors change; the central cyan remains fixed. Three widely separated HSL hues30/190/280 become neighboring170/190/210. Saturation and relative luminance are approximately held. Three surfaces remain three; all labels, prices, type, geometry and photography stay fixed.',
  },
  {
    name: 'analogous-coffee-variation',
    source: 'core-message-coffee-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: coffee,
    title: 'Coffee range: widen the local hue arc without losing the shared family',
    beforeLabel: 'BEFORE · Variants nearly repeat one hue',
    afterLabel: 'AFTER · Related hues allow more variation',
    description:
      'Only House and Night surface fills change. The hue span widens from HSL34/35/36 to15/35/55 while the central blend color remains fixed. Approximate relative luminance and saturation remain stable. Three shades remain three. All names, tasting notes, weights, prices and photographs stay fixed.',
  },
  {
    name: 'analogous-supper-legibility',
    source: 'chunk-garden-supper-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: supper,
    title: 'Invitation: preserve neighboring hues and strengthen practical text contrast',
    beforeLabel: 'BEFORE · Related hues, faint details',
    afterLabel: 'AFTER · Related hues, stronger tonal separation',
    description:
      'Only four practical text fills darken at nominal HSL hue140 and saturation30%; lightness62% becomes22%. The pale yellow-green panel at hue80 and olive title at110 remain fixed. Words, font sizes, positions, photograph and presentation stay identical.',
  },
];
const records = [];
for (const s of specs) {
  const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await image(s.stage)}"/><image id="photo" width="1536" height="1024" href="${await image(s.source)}"/></defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)} Fictional example. Generated photographs reused unchanged. Typography and graphics composed separately.</desc>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const label = (x, y, value, size = 20) =>
    `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="${ink}">${escape(value)}</text>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group(false, 30, 70)}${group(true, 680, 70)}${label(60, 1030, 'Only declared colors change. Copy, typography, geometry, imagery and photographic presentation stay fixed.')}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(60, 44, s.beforeLabel)}${group(false, 25, 70)}${label(60, 1064, s.afterLabel)}${group(true, 25, 1090)}${label(60, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
  records.push({
    name: s.name,
    source: s.source,
    stage: s.stage,
    phone: !!s.phone,
    dimensions: { wide: [1320, 1060], stacked: [660, 2070] },
    description: s.description,
    declaredFills: [false, true].map((after) =>
      Array.from(s.draw(after).matchAll(/<[^>]+data-change="fill"[^>]*>/g)).map(([tag]) => ({
        element: tag.match(/data-element="([^"]+)"/)[1],
        fill: tag.match(/\sfill="([^"]+)"/)[1],
      })),
    ),
  });
}

await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-analogous-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Declared fill-only changes within three controlled photographic examples. The first two preserve color count and approximately match saturation/relative luminance while changing hue span; the third retains hue/saturation and intentionally changes only text lightness.',
      model:
        'Digital HSL. Local hue arcs are specimen choices, not universal definitions or equal perceptual steps.',
      colors: {
        ink,
        programmeBefore,
        programmeAfter,
        coffeeBefore,
        coffeeAfter,
        supperPanel,
        supperInk,
        supperBefore,
        supperAfter,
      },
      nominalHues: {
        programmeBefore: [30, 190, 280],
        programmeAfter: [170, 190, 210],
        coffeeBefore: [34, 35, 36],
        coffeeAfter: [15, 35, 55],
        supper: [80, 110, 140],
      },
      supperHsl: { before: [140, 0.3, 0.62], after: [140, 0.3, 0.22] },
      textContrast: {
        supperBefore: contrast(supperBefore, supperPanel),
        supperAfter: contrast(supperAfter, supperPanel),
      },
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    programmeBefore,
    programmeAfter,
    coffeeBefore,
    coffeeAfter,
    supperPanel,
    supperBefore,
    supperAfter,
    contrastBefore: contrast(supperBefore, supperPanel),
    contrastAfter: contrast(supperAfter, supperPanel),
  }),
);
