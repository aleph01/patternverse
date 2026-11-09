import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PATTERNVERSE_PLAYWRIGHT_PATH || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontData = (await readFile(resolve(root, fontFile))).toString('base64');
const fontStyle = `<style>@font-face{font-family:PVOpticalSans;src:url(data:font/woff2;base64,${fontData}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#17352f';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, value, size = 20, extra = '') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVOpticalSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}" ${extra}>${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const image = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const specs = [
  {
    name: 'optical-quotation',
    source: 'audience-workspace-photo.jpg',
    kind: 'quote',
    size: 44,
    title: 'Journal quotation: hang the opening mark',
    beforeLabel: 'BEFORE · Opening mark occupies the column',
    afterLabel: 'AFTER · Words share the column edge',
    draw: () =>
      text('brand', 65, 104, 'COMMON / JOURNAL', 20) +
      photo(65, 155, 480, 220) +
      text('headline', 65, 435, 'What members value', 32) +
      text('quote-line-2', 65, 556, 'space to think,', 44) +
      text('quote-line-3', 65, 612, 'people to meet.”', 44) +
      text('attribution', 65, 690, 'A fictional member’s view', 22) +
      text('footer', 65, 820, 'common.example/journal · 05', 20),
    adjusted: () => text('quote-line-1', 65, 500, '“Room to make,', 44),
    region: [35, 460, 420, 180],
    guide: '<path d="M65 450V630"/>',
    caption:
      'Only the first quotation line shifts left. Font, wording, line breaks, baselines, photo/crop and presentation remain fixed.',
  },
  {
    name: 'optical-invitation',
    source: 'form-open-studios-photo.jpg',
    kind: 'period',
    size: 76,
    title: 'Open-studio invitation: center the words with a light terminal period',
    beforeLabel: 'BEFORE · Whole advance width centered',
    afterLabel: 'AFTER · Words lead the visual centering',
    draw: () =>
      text('brand', 305, 104, 'YARD / OPEN STUDIO', 20, 'text-anchor="middle"') +
      photo(65, 155, 480, 220) +
      text('detail-1', 305, 650, 'Meet the makers · Browse new work', 23, 'text-anchor="middle"') +
      text('detail-2', 305, 688, 'Friday 20 November · 18:00–21:00', 23, 'text-anchor="middle"') +
      text('detail-3', 305, 726, '8 Mill Lane · Free entry', 23, 'text-anchor="middle"') +
      text('footer', 305, 820, 'yard.example/open-studio', 20, 'text-anchor="middle"'),
    adjusted: () => text('headline', 305, 500, 'Come in.', 76, 'text-anchor="middle"'),
    region: [105, 410, 400, 155],
    guide: '<path d="M305 420V550"/>',
    caption:
      'Only the headline shifts right. The terminal period stays attached; all letter spacing, fonts, sizes, copy and imagery remain fixed.',
  },
  {
    name: 'optical-shop-label',
    source: 'explicit-tableware-photo.jpg',
    kind: 'capitals',
    size: 72,
    title: 'Shop placard: center the visible capitals within a label',
    beforeLabel: 'BEFORE · A lowercase reference centers caps',
    afterLabel: 'AFTER · Visible capitals guide placement',
    draw: () =>
      text('brand', 65, 104, 'FIELD / STUDIO TABLEWARE', 20) +
      photo(65, 155, 480, 220) +
      text('headline', 65, 435, 'Studio shop', 36) +
      '<rect data-element="label-frame" x="175" y="486" width="260" height="108" rx="10" fill="none" stroke="' +
      ink +
      '" stroke-width="2"/>' +
      text('detail-1', 305, 680, 'Friday–Sunday · 11:00–17:00', 23, 'text-anchor="middle"') +
      text('detail-2', 305, 720, 'Mugs, bowls and small editions', 22, 'text-anchor="middle"') +
      text('footer', 65, 820, 'field.example/shop', 20),
    adjusted: (s) => text('label', 305, s.baseline, 'OPEN', 72, 'text-anchor="middle"'),
    region: [150, 470, 310, 140],
    guide: '<path d="M155 540H455"/>',
    caption:
      'Only OPEN shifts down. Its letters, size, weight, outline frame, photo/crop and all other positions remain fixed.',
  },
];
const round = (n) => Math.round(n * 1000) / 1000;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const records = [];
try {
  await page.setContent(fontStyle);
  await page.evaluate(async () => {
    await document.fonts.load('72px PVOpticalSans');
    await document.fonts.ready;
  });
  for (const s of specs) {
    const metrics = await page.evaluate(
      ({ kind, size }) => {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `400 ${size}px PVOpticalSans`;
        ctx.fontKerning = 'normal';
        const measure = (t) => {
          const m = ctx.measureText(t);
          return {
            width: m.width,
            left: m.actualBoundingBoxLeft,
            right: m.actualBoundingBoxRight,
            ascent: m.actualBoundingBoxAscent,
            descent: m.actualBoundingBoxDescent,
          };
        };
        if (kind === 'quote') return { mark: measure('“') };
        if (kind === 'period') return { whole: measure('Come in.'), words: measure('Come in') };
        return { caps: measure('OPEN'), lowercase: measure('x') };
      },
      { kind: s.kind, size: s.size },
    );
    s.before = [0, 0];
    if (s.kind === 'quote') s.after = [round(-metrics.mark.width), 0];
    if (s.kind === 'period') s.after = [round((metrics.whole.width - metrics.words.width) / 2), 0];
    if (s.kind === 'capitals') {
      s.baseline = round(540 + metrics.lowercase.ascent / 2);
      s.after = [
        0,
        round((metrics.caps.ascent - metrics.caps.descent) / 2 - metrics.lowercase.ascent / 2),
      ];
    }
    const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await image('scale-print-stage-v2.jpg')}"/><image id="photo" width="1536" height="1024" href="${await image(s.source)}"/></defs>`;
    const description =
      s.caption +
      ' Close-ups repeat the exact artifact at a larger view scale with explanatory dashed guides. Fictional examples; photographs previously generated with AI, typography authored separately.';
    const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(description)}</desc>`;
    const artifact = (variant) =>
      `<use data-element="stage" href="#stage"/>${s.draw()}<g data-element="optical-adjustment" data-change="transform" transform="translate(${s[variant][0]} ${s[variant][1]})">${s.adjusted(s)}</g>`;
    const group = (variant, x, y) =>
      `<g data-variant="${variant}" transform="translate(${x} ${y})">${artifact(variant)}</g>`;
    const label = (x, y, value, size = 20) =>
      `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="${ink}">${escape(value)}</text>`;
    const detail = (variant, x, y) =>
      `<svg data-detail="${variant}" x="${x}" y="${y}" width="580" height="300" viewBox="${s.region.join(' ')}"><g data-detail-artifact="${variant}">${artifact(variant)}</g><g data-guides="true" fill="none" stroke="#a24726" stroke-width="1" stroke-dasharray="4 3">${s.guide}</g></svg>`;
    const main = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1460" viewBox="0 0 1320 1460" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group('before', 30, 70)}${group('after', 680, 70)}${label(60, 1040, 'DETAIL · Same artwork enlarged; dashed guide is explanatory only')}${detail('before', 60, 1090)}${detail('after', 710, 1090)}${label(60, 1430, 'Only the designated optical offset changes. Photographs and all other typography remain fixed.')}</svg>`;
    const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2850" viewBox="0 0 660 2850" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(60, 44, s.beforeLabel)}${group('before', 25, 70)}${label(40, 1025, 'DETAIL · Dashed guide is explanatory only', 18)}${detail('before', 40, 1050)}${label(60, 1394, s.afterLabel)}${group('after', 25, 1420)}${label(40, 2375, 'DETAIL · Same artwork enlarged', 18)}${detail('after', 40, 2400)}${label(40, 2820, 'Fictional example · Generated photographs', 20)}</svg>`;
    await writeFile(resolve(assets, s.name + '.svg'), main + '\n');
    await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
    records.push({
      name: s.name,
      source: s.source,
      kind: s.kind,
      size: s.size,
      before: s.before,
      after: s.after,
      ...(s.baseline ? { baseline: s.baseline } : {}),
      metrics,
      detailRegion: s.region,
      dimensions: { wide: [1320, 1460], stacked: [660, 2850] },
    });
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-optical-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Exact fixed-font metrics supply starting offsets; editorial review judges visible relationships. Only one declared translation changes per artifact. Detail viewports repeat the same artifact with identical crop/scale and explanatory guides.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    records.map((s) => ({ name: s.name, offset: s.after, baseline: s.baseline })),
    null,
    2,
  ),
);
