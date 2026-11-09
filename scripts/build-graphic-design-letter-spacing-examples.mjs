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
const fontStyle = `<style>@font-face{font-family:PVTrackingSans;src:url(data:font/woff2;base64,${fontData}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#17352f';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, value, size = 20, extra = '') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVTrackingSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}" ${extra}>${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const image = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const specs = [
  {
    name: 'letter-spacing-capitals',
    source: 'explicit-tableware-photo.jpg',
    kind: 'tracking',
    size: 28,
    title: 'Product card: open a short capitals label',
    value: 'STONEWARE',
    x: 65,
    y: 440,
    before: 0,
    after: 2.24,
    beforeLabel: 'BEFORE · Default spacing in a caps label',
    afterLabel: 'AFTER · Modest tracking for this role',
    draw: () =>
      text('brand', 65, 104, 'FIELD / STUDIO TABLEWARE', 20) +
      photo(65, 155, 480, 220) +
      text('headline', 65, 520, 'Made by hand', 42) +
      text('detail-1', 65, 630, 'Stoneware mug · 320 ml', 23) +
      text('detail-2', 65, 668, 'Warm white glaze · £28', 23) +
      text('footer', 65, 820, 'field.example/tableware', 20),
    region: [45, 405, 340, 60],
    guide: '<path d="M65 410V475"/>',
    caption:
      'Only the capitals label tracking changes from 0 to +0.08 em. The font, size, weight, starting anchor, baseline and all unrelated elements remain fixed.',
  },
  {
    name: 'letter-spacing-headline',
    source: 'audience-workspace-photo.jpg',
    kind: 'tracking',
    size: 64,
    title: 'Studio poster: remove inherited wide tracking from a mixed-case title',
    value: 'Room to make',
    x: 65,
    y: 500,
    before: 5.12,
    after: 0,
    beforeLabel: 'BEFORE · Wide tracking inherited by title',
    afterLabel: 'AFTER · Default rhythm for these words',
    draw: () =>
      text('brand', 65, 104, 'COMMON / WORKING HERE', 20) +
      photo(65, 155, 480, 220) +
      text('detail-1', 65, 630, 'Shared desks for independent makers.', 23) +
      text('detail-2', 65, 668, 'Day passes from £18 · 09:00–18:00', 23) +
      text('footer', 65, 820, 'common.example/day-pass', 20),
    region: [45, 440, 510, 110],
    guide: '<path d="M65 450V535"/>',
    caption:
      'Only headline tracking changes from +0.08 em to 0. Wording, glyph sizes, default kerning, left anchor, baseline, imagery and other typography stay fixed.',
  },
  {
    name: 'letter-spacing-pair',
    source: 'core-message-coffee-photo.jpg',
    kind: 'pair',
    size: 72,
    title: 'Coffee card: repair one pair without tracking the whole name',
    value: 'Tonic',
    x: 65,
    y: 500,
    before: 0,
    beforeLabel: 'BEFORE · Pair adjustment unavailable',
    afterLabel: 'AFTER · Only the T–o interval changes',
    draw: () =>
      text('brand', 65, 104, 'TONIC / COFFEE ROASTERS', 20) +
      photo(65, 155, 480, 220) +
      text('detail-1', 65, 630, 'Cauca, Colombia · Washed', 23) +
      text('detail-2', 65, 668, 'Whole bean · 250 g · Medium roast', 23) +
      text('footer', 65, 820, 'tonic.example/coffee', 20),
    region: [45, 430, 350, 135],
    guide: '<path d="M65 445V540"/>',
    caption:
      'Only the T–o pair interval changes. Every letter after T moves by the same amount, preserving all following pair intervals. Typeface, size, weight, copy and imagery stay fixed.',
  },
];
const round = (n) => Math.round(n * 1000) / 1000;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const records = [];
try {
  await page.setContent(fontStyle);
  await page.evaluate(async () => {
    await document.fonts.load('72px PVTrackingSans');
    await document.fonts.ready;
  });
  for (const s of specs) {
    const metrics = await page.evaluate(
      ({ size, value }) => {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `400 ${size}px PVTrackingSans`;
        ctx.fontKerning = 'none';
        const unkerned = ctx.measureText('To').width;
        ctx.fontKerning = 'normal';
        const kerned = ctx.measureText('To').width;
        return {
          pairUnkerned: unkerned,
          pairKerned: kerned,
          defaultAdvance: ctx.measureText(value).width,
        };
      },
      { kind: s.kind, size: s.size, value: s.value },
    );
    if (s.kind === 'pair') s.after = round(metrics.pairKerned - metrics.pairUnkerned);
    const adjusted = (variant) =>
      s.kind === 'tracking'
        ? text('adjusted-text', s.x, s.y, s.value, s.size, `letter-spacing="${s[variant]}"`)
        : `<text data-element="adjusted-text" x="${s.x}" y="${s.y}" font-family="PVTrackingSans" font-size="${s.size}" font-weight="400" font-kerning="none" font-optical-sizing="none" fill="${ink}"><tspan data-element="pair-left">T</tspan><tspan data-element="pair-tail" dx="${s[variant]}">onic</tspan></text>`;
    const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await image('scale-print-stage-v2.jpg')}"/><image id="photo" width="1536" height="1024" href="${await image(s.source)}"/></defs>`;
    const description =
      s.caption +
      ' Close-ups repeat the exact artifact at a larger view scale with explanatory dashed guides. Fictional examples; photographs previously generated with AI, typography authored separately.';
    const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(description)}</desc>`;
    const artifact = (variant) =>
      `<use data-element="stage" href="#stage"/>${s.draw()}<g data-element="spacing-adjustment" data-change="${s.kind === 'tracking' ? 'letter-spacing' : 'pair-dx'}">${adjusted(variant)}</g>`;
    const group = (variant, x, y) =>
      `<g data-variant="${variant}" transform="translate(${x} ${y})">${artifact(variant)}</g>`;
    const label = (x, y, value, size = 20) =>
      `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="${ink}">${escape(value)}</text>`;
    const detail = (variant, x, y) =>
      `<svg overflow="hidden" data-detail="${variant}" x="${x}" y="${y + (300 - (580 * s.region[3]) / s.region[2]) / 2}" width="580" height="${(580 * s.region[3]) / s.region[2]}" viewBox="${s.region.join(' ')}"><g data-detail-artifact="${variant}">${artifact(variant)}</g><g data-guides="true" fill="none" stroke="#a24726" stroke-width="1" stroke-dasharray="4 3">${s.guide}</g></svg>`;
    const main = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1460" viewBox="0 0 1320 1460" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group('before', 30, 70)}${group('after', 680, 70)}${label(60, 1040, 'DETAIL · Same artwork enlarged; dashed guide is explanatory only')}${detail('before', 60, 1090)}${detail('after', 710, 1090)}${label(60, 1430, 'Only the designated character spacing changes. All other typography and imagery remain fixed.')}</svg>`;
    const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2850" viewBox="0 0 660 2850" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(60, 44, s.beforeLabel)}${group('before', 25, 70)}${label(40, 1025, 'DETAIL · Dashed guide is explanatory only', 18)}${detail('before', 40, 1050)}${label(60, 1394, s.afterLabel)}${group('after', 25, 1420)}${label(40, 2375, 'DETAIL · Same artwork enlarged', 18)}${detail('after', 40, 2400)}${label(40, 2820, 'Fictional example · Generated photographs', 20)}</svg>`;
    await writeFile(resolve(assets, s.name + '.svg'), main + '\n');
    await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
    records.push({
      name: s.name,
      source: s.source,
      kind: s.kind,
      value: s.value,
      size: s.size,
      x: s.x,
      y: s.y,
      before: s.before,
      after: s.after,
      metrics,
      detailRegion: s.region,
      dimensions: { wide: [1320, 1460], stacked: [660, 2850] },
    });
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-letter-spacing-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Native SVG tracking preserves default font kerning in the first two examples. The third holds automatic kerning disabled in both variants and restores only the T–o interval from the same font’s measured pair difference. Detail viewports repeat the same artifact with identical crop/scale and explanatory guides.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    records.map((s) => ({ name: s.name, before: s.before, after: s.after, size: s.size })),
    null,
    2,
  ),
);
