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
const fontStyle = `<style>@font-face{font-family:PVBreakSans;src:url(data:font/woff2;base64,${fontData}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#17352f';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, value, size = 20, family = 'PVBreakSans') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}">${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const specs = [
  {
    name: 'breaks-phrase-poster',
    source: 'form-open-studios-photo.jpg',
    title: 'Workshop poster: break at a useful phrase boundary',
    copy: 'Make room for new ideas',
    x: 65,
    y: 480,
    size: 64,
    measure: 480,
    leading: 72,
    before: ['Make room for', 'new ideas'],
    after: ['Make room', 'for new ideas'],
    beforeLabel: 'BEFORE · A preposition ends the first line',
    afterLabel: 'AFTER · The phrase stays together',
    draw: () =>
      text('brand', 65, 104, 'YARD / OPEN WORKSHOPS', 20) +
      photo(65, 155, 480, 220) +
      text('detail-1', 65, 660, 'Clay and print · All materials included', 23) +
      text('detail-2', 65, 700, 'Saturday 14 November · 10:00–13:00', 23) +
      text('detail-3', 65, 740, '8 Mill Lane · £24 · Book online', 23) +
      text('footer', 65, 820, 'yard.example/workshops', 20),
    caption:
      'Only word allocation across the same two headline lines changes. Typeface, size, weight, leading, first baseline, anchor, image and all other elements stay fixed.',
  },
  {
    name: 'breaks-value-unit',
    source: 'explicit-tableware-photo.jpg',
    title: 'Product card: keep a value with its unit',
    copy: 'Each mug holds 320 ml. Dishwasher safe.',
    x: 65,
    y: 535,
    size: 28,
    measure: 300,
    leading: 40,
    before: ['Each mug holds 320', 'ml. Dishwasher safe.'],
    after: ['Each mug holds', '320 ml. Dishwasher safe.'],
    beforeLabel: 'BEFORE · Similar lengths split value/unit',
    afterLabel: 'AFTER · Keep 320 ml on the same line',
    draw: () =>
      text('brand', 65, 104, 'FIELD / STUDIO TABLEWARE', 20) +
      photo(65, 155, 480, 220) +
      text('headline', 65, 435, 'Made by hand', 36) +
      text('detail-1', 65, 680, 'Warm white glaze · £28', 23) +
      text('footer', 65, 820, 'field.example/tableware', 20),
    caption:
      'Only the two-line specification break changes. All words and spaces are preserved; 320 and ml now share a line. Font, size, leading, column width, image and other positions stay fixed.',
  },
  {
    name: 'breaks-paragraph-ending',
    source: 'audience-workspace-photo.jpg',
    title: 'Visitor guide: recompose a short final line',
    copy: 'The studio gives independent makers a place to work, meet and share ideas. Each day pass includes a desk, Wi-Fi and coffee. Choose a day before you arrive, then bring your booking reference.',
    x: 65,
    y: 500,
    size: 22,
    measure: 460,
    leading: 31,
    beforeLabel: 'BEFORE · One word ends the paragraph',
    afterLabel: 'AFTER · A useful phrase closes the block',
    draw: () =>
      text('brand', 65, 104, 'COMMON / WORKING HERE', 20) +
      photo(65, 155, 480, 220) +
      text('headline', 65, 435, 'Before you arrive', 36) +
      text('footer', 65, 820, 'common.example/day-pass · Visitor guide', 18),
    caption:
      'Only the final word allocation changes. The last line becomes your booking reference. Words, font, size, leading, width, anchor, first baseline, photograph and all unrelated elements stay fixed.',
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
    await document.fonts.load('22px PVBreakSans');
    await document.fonts.ready;
  });
  for (const s of specs) {
    if (!s.before) {
      s.before = await page.evaluate(
        ({ copy, measure, size }) => {
          const ctx = document.createElement('canvas').getContext('2d');
          ctx.font = `400 ${size}px PVBreakSans`;
          ctx.fontKerning = 'normal';
          const lines = [];
          let line = '';
          for (const word of copy.split(' ')) {
            const next = line ? line + ' ' + word : word;
            if (line && ctx.measureText(next).width > measure) {
              lines.push(line);
              line = word;
            } else line = next;
          }
          if (line) lines.push(line);
          return lines;
        },
        { copy: s.copy, measure: s.measure, size: s.size },
      );
      if (s.before.at(-1) !== 'reference.' || !s.before.at(-2).endsWith('your booking'))
        throw new Error('Ending specimen no longer matches intended natural wrap');
      s.after = [...s.before];
      s.after[s.after.length - 2] = s.after.at(-2).slice(0, -' your booking'.length);
      s.after[s.after.length - 1] = 'your booking reference.';
    }
    const widths = await page.evaluate(
      ({ before, after, size }) => {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `400 ${size}px PVBreakSans`;
        ctx.fontKerning = 'normal';
        return {
          before: before.map((t) => ctx.measureText(t).width),
          after: after.map((t) => ctx.measureText(t).width),
        };
      },
      { before: s.before, after: s.after, size: s.size },
    );
    for (const variant of ['before', 'after']) {
      if (s[variant].join(' ') !== s.copy) throw new Error('Copy changed in ' + s.name);
      if (widths[variant].some((w) => w > s.measure))
        throw new Error('Line exceeds fixed measure in ' + s.name);
    }
    const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await image('scale-print-stage-v2.jpg')}"/><image id="photo" width="1536" height="1024" href="${await image(s.source)}"/></defs>`;
    const description =
      s.caption +
      ' Fictional commissioned-style design. Photographs generated previously with AI, reused unchanged; typography composed separately.';
    const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(description)}</desc>`;
    const group = (variant, x, y) =>
      `<g data-variant="${variant}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw()}<text data-element="adjusted-text" data-change="reflow" data-copy="${escape(s.copy)}" aria-label="${escape(s.copy)}" data-leading="${s.leading}" data-measure="${s.measure}" x="${s.x}" y="${s.y}" font-family="PVBreakSans" font-size="${s.size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}">${s[variant].map((line, i) => `<tspan data-element="line-${i}" x="${s.x}" y="${s.y + i * s.leading}">${escape(line + (i < s[variant].length - 1 ? ' ' : ''))}</tspan>`).join('')}</text></g>`;
    const label = (id, x, y, copy, size = 20) =>
      text(id, x, y, copy, size, 'Arial, Helvetica, sans-serif');
    const main = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label('before-label', 62, 44, s.beforeLabel)}${label('after-label', 712, 44, s.afterLabel)}${group('before', 30, 70)}${group('after', 680, 70)}${label('caption', 60, 1030, 'Only line breaks change. Copy, type, leading, width, images and presentation stay fixed.')}</svg>`;
    const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label('before-label', 60, 44, s.beforeLabel)}${group('before', 25, 70)}${label('after-label', 60, 1064, s.afterLabel)}${group('after', 25, 1090)}${label('caption', 60, 2050, 'Fictional example · Generated photographs')}</svg>`;
    await writeFile(resolve(assets, s.name + '.svg'), main + '\n');
    await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
    records.push({
      name: s.name,
      source: s.source,
      copy: s.copy,
      before: s.before,
      after: s.after,
      widths,
      x: s.x,
      y: s.y,
      size: s.size,
      measure: s.measure,
      leading: s.leading,
      dimensions: { wide: [1320, 1060], stacked: [660, 2070] },
    });
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-line-breaks-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Exact fixed-font lines with only word allocation changed. Both variants preserve all logical text, column width, font metrics, tracking/kerning, baseline interval, first baseline and starting edge. The final example begins with measured greedy wrapping and moves two words from the penultimate line to the last.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    records.map((s) => ({ name: s.name, before: s.before, after: s.after, widths: s.widths })),
    null,
    2,
  ),
);
