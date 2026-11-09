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
const fontStyle = `<style>@font-face{font-family:PVLeadingSans;src:url(data:font/woff2;base64,${fontData}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#17352f';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, value, size = 20, family = 'PVLeadingSans') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}">${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const specs = [
  {
    name: 'leading-journal',
    source: 'audience-workspace-photo.jpg',
    title: 'Journal: open up crowded running text',
    copy: 'The studio opens its doors to independent makers each morning. Shared tables give small projects room to grow, while quiet corners offer a place to plan. Members bring their own tools and leave the benches ready for the next person. It is a working space shaped by the people who use it.',
    x: 65,
    y: 500,
    size: 22,
    measure: 480,
    before: 23,
    after: 33,
    beforeLabel: 'BEFORE · A dense reading texture',
    afterLabel: 'AFTER · More separation between lines',
    draw: () =>
      text('brand', 65, 104, 'COMMON / JOURNAL', 20) +
      photo(65, 155, 480, 220) +
      text('headline', 65, 435, 'Room to make things', 36) +
      text('footer', 65, 820, 'common.example/journal · 04', 20),
    caption:
      'Only baseline spacing changes from 23 to 33 units at size 22. All words, line breaks, font, first baseline, images and presentation remain fixed.',
  },
  {
    name: 'leading-care-card',
    source: 'explicit-tableware-photo.jpg',
    title: 'Care card: bring loosely scattered prose together',
    copy: 'Wash with warm water and a soft cloth. Dry before storing the mug. Avoid sudden changes in temperature, and keep it away from direct heat. Keep this care note for future reference.',
    x: 65,
    y: 520,
    size: 22,
    measure: 480,
    before: 48,
    after: 33,
    beforeLabel: 'BEFORE · Prose spread into separate strips',
    afterLabel: 'AFTER · A more cohesive paragraph',
    draw: () =>
      text('brand', 65, 104, 'FIELD / STUDIO TABLEWARE', 20) +
      photo(65, 155, 480, 220) +
      text('headline', 65, 435, 'Looking after your mug', 36) +
      text('footer', 65, 820, 'field.example/tableware · Care note', 20),
    caption:
      'Only baseline spacing changes from 48 to 33 units at size 22. The paragraph keeps every word, line break and its starting position.',
  },
  {
    name: 'leading-workshop-poster',
    source: 'form-open-studios-photo.jpg',
    title: 'Workshop poster: give a short headline its own spacing',
    lines: ['Make something', 'with your hands.'],
    x: 65,
    y: 470,
    size: 52,
    measure: 480,
    before: 91,
    after: 58,
    beforeLabel: 'BEFORE · A prose-like interval in the title',
    afterLabel: 'AFTER · Two lines read as one title',
    draw: () =>
      text('brand', 65, 104, 'YARD / OPEN WORKSHOPS', 20) +
      photo(65, 155, 480, 235) +
      text('detail-1', 65, 650, 'Clay and print · All materials included', 23) +
      text('detail-2', 65, 682, 'Saturday 14 November · 10:00–13:00', 23) +
      text('detail-3', 65, 714, 'Yard Studio · 8 Mill Lane · £24', 23) +
      text('footer', 65, 820, 'Book: yard.example/workshops', 20),
    caption:
      'Only the headline baseline interval changes from 91 to 58 units at size 52. The first line, wording, breaks, supporting copy and imagery remain fixed.',
  },
];
const image = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const records = [];
try {
  await page.setContent(fontStyle);
  await page.evaluate(async () => {
    await document.fonts.load('22px PVLeadingSans');
    await document.fonts.ready;
  });
  for (const s of specs) {
    const metrics = await page.evaluate(
      ({ copy, lines, measure, size }) => {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `400 ${size}px PVLeadingSans`;
        ctx.fontKerning = 'normal';
        if (!lines) {
          lines = [];
          let line = '';
          for (const word of copy.split(' ')) {
            const next = line ? line + ' ' + word : word;
            if (line && ctx.measureText(next).width > measure) {
              lines.push(line);
              line = word;
            } else line = next;
          }
          if (line) lines.push(line);
        }
        return { lines, pixelWidths: lines.map((line) => ctx.measureText(line).width) };
      },
      { copy: s.copy, lines: s.lines, measure: s.measure, size: s.size },
    );
    s.lines = metrics.lines;
    s.copy = s.copy || s.lines.join(' ');
    const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await image('scale-print-stage-v2.jpg')}"/><image id="photo" width="1536" height="1024" href="${await image(s.source)}"/></defs>`;
    const description =
      s.caption +
      ' Fictional commissioned-style design. Photographs generated previously with AI, reused unchanged; typography composed separately.';
    const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(description)}</desc>`;
    const group = (variant, x, y) =>
      `<g data-variant="${variant}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw()}<text data-element="adjusted-text" data-change="data-leading tspan-y" data-copy="${escape(s.copy)}" aria-label="${escape(s.copy)}" data-leading="${s[variant]}" data-measure="${s.measure}" x="${s.x}" y="${s.y}" font-family="PVLeadingSans" font-size="${s.size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}">${s.lines.map((line, i) => `<tspan data-element="line-${i}" x="${s.x}" y="${s.y + i * s[variant]}">${escape(line + (i < s.lines.length - 1 ? ' ' : ''))}</tspan>`).join('')}</text></g>`;
    const label = (id, x, y, copy, size = 20) =>
      text(id, x, y, copy, size, 'Arial, Helvetica, sans-serif');
    const main = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label('before-label', 62, 44, s.beforeLabel)}${label('after-label', 712, 44, s.afterLabel)}${group('before', 30, 70)}${group('after', 680, 70)}${label('caption', 60, 1030, 'Only designated baseline spacing changes. Type, copy, breaks, images and presentation stay fixed.')}</svg>`;
    const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label('before-label', 60, 44, s.beforeLabel)}${group('before', 25, 70)}${label('after-label', 60, 1064, s.afterLabel)}${group('after', 25, 1090)}${label('caption', 60, 2050, 'Fictional example · Generated photographs')}</svg>`;
    await writeFile(resolve(assets, s.name + '.svg'), main + '\n');
    await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
    records.push({
      name: s.name,
      source: s.source,
      copy: s.copy,
      lines: s.lines,
      pixelWidths: metrics.pixelWidths,
      x: s.x,
      y: s.y,
      size: s.size,
      measure: s.measure,
      before: s.before,
      after: s.after,
      dimensions: { wide: [1320, 1060], stacked: [660, 2070] },
    });
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-leading-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Exact-font whole-word wrapping computed once and preserved in both variants. Only the declared baseline interval and consequent tspan y coordinates vary; first baseline fixed.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    records.map((s) => ({
      name: s.name,
      lines: s.lines,
      before: s.before,
      after: s.after,
      lastBaselines: [s.y + (s.lines.length - 1) * s.before, s.y + (s.lines.length - 1) * s.after],
    })),
    null,
    2,
  ),
);
