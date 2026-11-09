import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVComplementSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, fontFile))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
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
const sameLuminance = (hue, target) => {
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (luminance(hsl(hue, 0.44, mid)) < luminance(target)) lo = mid;
    else hi = mid;
  }
  return hsl(hue, 0.44, (lo + hi) / 2);
};

const ink = hsl(210, 0.6, 0.2),
  blue = hsl(210, 0.6, 0.42);
const badgeBlue = hsl(210, 0.6, 0.7),
  badgeOrange = sameLuminance(30, badgeBlue);
const categoryBefore = sameLuminance(230, blue),
  categoryOrange = sameLuminance(30, blue);
const productOrange = hsl(30, 0.82, 0.57);
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
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVComplementSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${fill}"${changed ? ' data-change="fill"' : ''} ${extra}>${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const image = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;

const poster = (after) =>
  [
    text('brand', 65, 104, 'YARD / AUTUMN OPEN STUDIO', 20),
    photo(65, 155, 480, 220),
    text('title-1', 65, 462, 'Meet the', 58, blue),
    text('title-2', 65, 527, 'makers', 58, blue),
    text('event', 65, 582, 'Open studios · Saturday 14 November', 23),
    text('time-place', 65, 625, '11:00–17:00 · 18 Mill Lane', 22),
    `<rect data-element="entry-badge" data-change="fill" x="65" y="666" width="190" height="58" rx="4" fill="${after ? badgeOrange : badgeBlue}"/>`,
    text('entry-label', 85, 705, 'Free entry', 28),
    `<path data-element="rule" d="M65 762H545" stroke="${blue}" stroke-width="4"/>`,
    text('footer', 65, 820, 'yard.example/open-studios', 20),
  ].join('');
const values = [
  [42, 28],
  [48, 36],
];
const report = (after) =>
  [
    text('brand', 65, 104, 'YARD / STUDIO REVIEW', 20),
    photo(65, 155, 480, 145),
    text('headline', 65, 359, 'Sessions by studio', 42),
    text('unit', 65, 400, 'Completed sessions · 2026', 22),
    ...['March', 'April']
      .map((month, panel) => {
        const y = panel ? 595 : 447;
        return (
          text('month-' + panel, 65, y, month, 24) +
          ['Riverside', 'Hill']
            .map((site, i) => {
              const by = y + 18 + i * 44;
              return (
                text('site-' + panel + '-' + i, 65, by + 21, site, 22) +
                `<rect data-element="bar-${panel}-${i}"${i === 1 ? ' data-change="fill"' : ''} x="200" y="${by}" width="${values[panel][i] * 6}" height="26" fill="${i === 0 ? blue : after ? categoryOrange : categoryBefore}"/>` +
                text(
                  'value-' + panel + '-' + i,
                  537,
                  by + 21,
                  String(values[panel][i]),
                  22,
                  ink,
                  false,
                  'text-anchor="end"',
                )
              );
            })
            .join('') +
          `<path data-element="axis-${panel}" d="M200 ${y + 104}H500" fill="none" stroke="${ink}" stroke-opacity="0.3"/>` +
          text('zero-' + panel, 200, y + 129, '0', 18) +
          text('max-' + panel, 500, y + 129, '50 sessions', 18, ink, false, 'text-anchor="end"')
        );
      })
      .join(''),
    text('scale-note', 65, 768, 'Same unit and scale in both months.', 20),
    text('footer', 65, 820, 'yard.example/review · 05', 20),
  ].join('');
const product = (after) =>
  [
    text('brand', 65, 104, 'FIELD / EVERYDAY OBJECTS', 20),
    photo(65, 155, 480, 250),
    text('headline', 65, 470, 'Studio stoneware', 38),
    `<rect data-element="product-panel" data-change="fill" x="65" y="515" width="480" height="205" fill="${after ? ink : blue}"/>`,
    text('product-name', 85, 571, 'Everyday mug', 38, productOrange),
    text('specification', 85, 622, 'Warm white glaze · 320 ml', 22, productOrange),
    text('price-date', 85, 670, '£28 · Available from 14 November', 22, productOrange),
    text('footer', 65, 820, 'field.example/tableware', 20),
  ].join('');
const specs = [
  {
    name: 'complement-entry-accent',
    source: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: poster,
    title: 'Poster: give the entry badge a complementary accent',
    beforeLabel: 'BEFORE · The accent repeats the blue hue',
    afterLabel: 'AFTER · Orange contrasts with blue',
    description:
      'Only the Free entry badge fill changes from pale blue to an orange at approximately the same relative luminance. Main blue HSL hue210 and orange hue30 form the complementary relation. Copy, badge area, type, imagery and presentation stay fixed.',
  },
  {
    name: 'complement-studio-categories',
    source: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: report,
    title: 'Report: distinguish peer categories with an opposing hue',
    beforeLabel: 'BEFORE · Two neighboring blue hues',
    afterLabel: 'AFTER · Blue and orange, equal roles',
    description:
      'Only the two Hill bar fills change from neighboring blue hue230 to orange hue30 opposite Riverside hue210. Relative luminance is approximately matched across all bar colors. Values42/28 and48/36, direct labels, geometry and presentation remain fixed.',
  },
  {
    name: 'complement-product-legibility',
    source: 'explicit-tableware-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: product,
    title: 'Product card: keep complementary hues and repair tonal contrast',
    beforeLabel: 'BEFORE · Opposite hues, weak text contrast',
    afterLabel: 'AFTER · A darker blue supports the orange',
    description:
      'Only the product-panel background darkens from HSL210/60/42 to210/60/20. Orange product text remains HSL30/82/57. Hue relation and nominal blue saturation remain unchanged. Every word, type setting, position, photo/crop and print presentation stays fixed.',
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
  resolve(root, 'docs/pattern-packages/graphic-design-complement-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Declared fill-only changes distinguish complementary hue from value contrast. Hue angles use the digital HSL wheel. Hue replacements approximately match relative luminance; the final example intentionally changes only panel lightness at nominal fixed hue/saturation.',
      colors: { ink, blue, badgeBlue, badgeOrange, categoryBefore, categoryOrange, productOrange },
      hslInputs: { blue: [210, 0.6, 0.42], ink: [210, 0.6, 0.2], productOrange: [30, 0.82, 0.57] },
      relativeLuminance: {
        ink: luminance(ink),
        blue: luminance(blue),
        badgeBlue: luminance(badgeBlue),
        badgeOrange: luminance(badgeOrange),
        categoryBefore: luminance(categoryBefore),
        categoryOrange: luminance(categoryOrange),
      },
      textContrast: {
        productBefore: contrast(productOrange, blue),
        productAfter: contrast(productOrange, ink),
        badgeBefore: contrast(ink, badgeBlue),
        badgeAfter: contrast(ink, badgeOrange),
      },
      values,
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    ink,
    blue,
    badgeBlue,
    badgeOrange,
    categoryBefore,
    categoryOrange,
    productOrange,
    productBefore: contrast(productOrange, blue),
    productAfter: contrast(productOrange, ink),
  }),
);
