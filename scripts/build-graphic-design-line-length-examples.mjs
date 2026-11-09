import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Use an available authoring Playwright runtime; no project dependency is added.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PATTERNVERSE_PLAYWRIGHT_PATH || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontData = (await readFile(resolve(root, fontFile))).toString('base64');
const fontStyle = `<style>@font-face{font-family:PVMeasureSans;src:url(data:font/woff2;base64,${fontData}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#17352f';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, value, size = 20, family = 'PVMeasureSans') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}">${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const guideCopy =
  'The studio gives independent makers a place to work, meet and share ideas. Each day pass includes a desk, Wi-Fi and coffee, with access from 09:00 to 18:00. Choose a day before you arrive and bring your booking reference to the welcome desk. If you need a quiet room, ask the team about availability before booking.';
const careCopy =
  'Wash with warm water and a soft cloth. Dry before storing. Avoid sudden changes in temperature. Keep this care note for future reference.';
const reportCopy =
  'This year, 24 workshops offered 180 places across clay and print sessions. The table records places offered, not unique visitors. Some people attended more than one session. Figures cover January to December 2026.';
const specs = [
  {
    name: 'line-length-visitor-guide',
    landscape: true,
    source: 'audience-workspace-photo.jpg',
    copy: guideCopy,
    x: 95,
    y: 340,
    size: 20,
    leading: 28,
    before: 725,
    after: 480,
    title: 'Visitor guide: shorten an expansive prose measure',
    beforeLabel: 'BEFORE · Prose follows the full page width',
    afterLabel: 'AFTER · A narrower reading column',
    draw: () =>
      text('brand', 95, 85, 'COMMON / WORKING HERE', 20) +
      photo(95, 120, 725, 125) +
      text('headline', 95, 290, 'A day in the studio', 36) +
      text('footer', 95, 550, 'common.example/day-pass · Visitor guide', 18),
    caption:
      'Only the prose measure changes, 725 to 480 layout units, with natural reflow. All copy, font, size, leading, first baseline, photo/crop, paper and lighting stay fixed.',
  },
  {
    name: 'line-length-care-note',
    landscape: false,
    source: 'explicit-tableware-photo.jpg',
    copy: careCopy,
    x: 65,
    y: 535,
    size: 22,
    leading: 30,
    before: 180,
    after: 390,
    title: 'Care note: widen a column that fragments ordinary prose',
    beforeLabel: 'BEFORE · A narrow grid span for prose',
    afterLabel: 'AFTER · More words per line',
    draw: () =>
      text('brand', 65, 104, 'FIELD / STUDIO TABLEWARE', 20) +
      photo(65, 160, 480, 220) +
      text('headline', 65, 435, 'Looking after your mug', 36) +
      text('subheading', 65, 478, 'Care note · Keep for reference', 22) +
      text('footer', 65, 820, 'field.example/tableware', 20),
    caption:
      'Only the prose measure changes, 180 to 390 layout units, with natural reflow. The left edge, first baseline, copy, type, size, leading, photo/crop and presentation stay fixed.',
  },
  {
    name: 'line-length-report-scope',
    landscape: true,
    source: 'form-open-studios-photo.jpg',
    copy: reportCopy,
    x: 95,
    y: 255,
    size: 20,
    leading: 28,
    before: 725,
    after: 480,
    title: 'Report: constrain prose independently of the wider table',
    beforeLabel: 'BEFORE · Summary inherits the table width',
    afterLabel: 'AFTER · Prose capped; table stays wide',
    draw: () =>
      text('brand', 95, 85, 'YARD / 2026', 20) +
      photo(605, 70, 215, 140) +
      text('headline', 95, 165, 'Workshop review', 38) +
      '<g data-element="table">' +
      text('table-label-1', 95, 415, 'Programme', 20) +
      text('table-label-2', 415, 415, 'Sessions', 20) +
      text('table-label-3', 615, 415, 'Places', 20) +
      '<path data-element="table-rule" d="M95 428H820" fill="none" stroke="' +
      ink +
      '" stroke-width="1"/>' +
      text('row-1-label', 95, 465, 'Clay', 22) +
      text('row-1-sessions', 415, 465, '12', 22) +
      text('row-1-places', 615, 465, '84', 22) +
      text('row-2-label', 95, 505, 'Print', 22) +
      text('row-2-sessions', 415, 505, '12', 22) +
      text('row-2-places', 615, 505, '96', 22) +
      '</g>' +
      text('footer', 95, 550, 'yard.example/review · Places offered', 18),
    caption:
      'Only the summary measure changes, 725 to 480 layout units, with natural reflow. Table geometry, all numbers, photo/crop, font, size, leading, first baseline and presentation stay fixed.',
  },
];
const image = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const measurements = [];
try {
  await page.setContent(fontStyle);
  await page.evaluate(async () => {
    await document.fonts.load('20px PVMeasureSans');
    await document.fonts.ready;
  });
  for (const s of specs) {
    s.wraps = {};
    for (const variant of ['before', 'after']) {
      s.wraps[variant] = await page.evaluate(
        ({ copy, width, size }) => {
          const ctx = document.createElement('canvas').getContext('2d');
          ctx.font = `400 ${size}px PVMeasureSans`;
          ctx.fontKerning = 'normal';
          const words = copy.split(' '),
            lines = [];
          let line = '';
          for (const word of words) {
            const next = line ? line + ' ' + word : word;
            if (line && ctx.measureText(next).width > width) {
              lines.push(line);
              line = word;
            } else line = next;
          }
          if (line) lines.push(line);
          return {
            lines,
            pixelWidths: lines.map((line) => ctx.measureText(line).width),
            characters: lines.map((line) => line.length),
          };
        },
        { copy: s.copy, width: s[variant], size: s.size },
      );
    }
    const stage = await image('scale-print-stage-v2.jpg');
    const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${stage}"/><image id="photo" width="1536" height="1024" href="${await image(s.source)}"/></defs>`;
    const description =
      s.caption +
      ' Original fictional design, generated photographs and separately authored typography. Line wrapping is measured with the exact embedded font.';
    const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(description)}</desc><metadata>${escape(description)}</metadata>`;
    const group = (variant, x, y) =>
      `<g data-variant="${variant}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"${s.landscape ? ' transform="translate(0 610) rotate(-90)"' : ''}/>${s.draw()}<g data-element="reading-column" data-change="data-measure reflow" data-measure="${s[variant]}"><text data-element="body" data-copy="${escape(s.copy)}" aria-label="${escape(s.copy)}" x="${s.x}" y="${s.y}" data-leading="${s.leading}" font-family="PVMeasureSans" font-size="${s.size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}">${s.wraps[variant].lines.map((line, i) => `<tspan data-element="line-${i}" x="${s.x}" y="${s.y + i * s.leading}">${escape(line + (i < s.wraps[variant].lines.length - 1 ? ' ' : ''))}</tspan>`).join('')}</text></g></g>`;
    const wide = s.landscape
      ? {
          width: 1920,
          height: 760,
          left: [25, 70],
          right: [980, 70],
          labels: [60, 1015],
          footerY: 730,
        }
      : {
          width: 1320,
          height: 1060,
          left: [30, 70],
          right: [680, 70],
          labels: [62, 712],
          footerY: 1030,
        };
    const stacked = s.landscape
      ? { width: 960, height: 1470, top: [25, 70], bottom: [25, 790], label2: 764, footerY: 1440 }
      : {
          width: 660,
          height: 2070,
          top: [25, 70],
          bottom: [25, 1090],
          label2: 1064,
          footerY: 2050,
        };
    const label = (id, x, y, copy, size = 22) =>
      text(id, x, y, copy, size, 'Arial, Helvetica, sans-serif');
    const wideSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${wide.width}" height="${wide.height}" viewBox="0 0 ${wide.width} ${wide.height}" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label('before-label', wide.labels[0], 44, s.beforeLabel)}${label('after-label', wide.labels[1], 44, s.afterLabel)}${group('before', ...wide.left)}${group('after', ...wide.right)}${label('caption', 60, wide.footerY, 'Only measure and resulting wrapping change. Copy, type, leading, images and presentation stay fixed.', 20)}</svg>`;
    const mobileSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${stacked.width}" height="${stacked.height}" viewBox="0 0 ${stacked.width} ${stacked.height}" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label('before-label', 60, 44, s.beforeLabel)}${group('before', ...stacked.top)}${label('after-label', 60, stacked.label2, s.afterLabel)}${group('after', ...stacked.bottom)}${label('caption', 60, stacked.footerY, 'Fictional example · Generated photographs', 22)}</svg>`;
    await writeFile(resolve(assets, s.name + '.svg'), (s.landscape ? mobileSvg : wideSvg) + '\n');
    await writeFile(resolve(assets, s.name + '-mobile.svg'), mobileSvg + '\n');
    measurements.push({
      name: s.name,
      landscape: s.landscape,
      copy: s.copy,
      x: s.x,
      y: s.y,
      size: s.size,
      leading: s.leading,
      before: { measure: s.before, ...s.wraps.before },
      after: { measure: s.after, ...s.wraps.after },
      dimensions: {
        wide: s.landscape ? [stacked.width, stacked.height] : [wide.width, wide.height],
        stacked: [stacked.width, stacked.height],
      },
    });
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-line-length-wraps.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Greedy whole-word wrapping measured by Chromium canvas with the exact embedded static font, kerning normal, no hyphenation; text, font size and baseline interval fixed.',
      examples: measurements,
    },
    null,
    2,
  ) + '\n',
);
console.log('Built three measure-only comparisons with exact-font wrapping and stacked views.');
console.log(
  JSON.stringify(
    measurements.map((s) => ({
      name: s.name,
      beforeLines: s.before.lines.length,
      afterLines: s.after.lines.length,
      beforeCharacters: s.before.characters,
      afterCharacters: s.after.characters,
    })),
  ),
);
