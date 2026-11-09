import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PATTERNVERSE_PLAYWRIGHT_PATH || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const regularFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const displayFile = 'docs/pattern-packages/graphic-design-pairing-fonts/SourceSans3[wght].ttf';
const regular = (await readFile(resolve(root, regularFile))).toString('base64');
const display = (await readFile(resolve(root, displayFile))).toString('base64');
const fontStyle = `<style>@font-face{font-family:PVTypeImageText;src:url(data:font/woff2;base64,${regular}) format('woff2');font-weight:400;font-style:normal;}@font-face{font-family:PVTypeImageDisplay;src:url(data:font/ttf;base64,${display}) format('truetype');font-weight:200 900;font-style:normal;}</style>`;
const ink = '#17352f';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, value, size = 20) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVTypeImageText" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}">${escape(value)}</text>`;
const displayText = (id, x, y, value, size = 132, extra = '') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVTypeImageDisplay" font-size="${size}" font-weight="800" style="font-variation-settings:'wght' 800;font-optical-sizing:none" ${extra}>${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const image = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const specs = [
  {
    name: 'type-image-rise',
    source: 'audience-workspace-photo.jpg',
    kind: 'placement',
    word: 'RISE',
    title: 'Morning sessions: make the word rise through its arrangement',
    beforeLabel: 'BEFORE · A conventional horizontal title',
    afterLabel: 'AFTER · The word rises across the page',
    draw: () =>
      text('brand', 65, 104, 'COMMON / MORNING STUDIO', 20) +
      photo(65, 155, 480, 220) +
      text('plain-title', 65, 675, 'RISE · Morning studio sessions', 26) +
      text('detail', 65, 720, 'Weekdays · 08:00–11:00 · Day pass £18', 22) +
      text('footer', 65, 820, 'common.example/mornings', 20),
    changed: (s) =>
      ['R', 'I', 'S', 'E']
        .map((c, i) =>
          displayText(
            'letter-' + i,
            s.xs[i],
            590,
            c,
            124,
            `fill="${ink}" data-change="transform" transform="translate(0 ${s.variant === 'after' ? -i * 36 : 0})"`,
          ),
        )
        .join(''),
    caption:
      'Only the last three letter baselines move upward in 36-unit steps. Letter sizes, weights, horizontal positions, copy, photography and supporting information remain fixed.',
  },
  {
    name: 'type-image-clay',
    source: 'audience-pottery-photo.jpg',
    kind: 'fill',
    word: 'CLAY',
    title: 'Workshop card: use letterforms as windows onto the material photograph',
    beforeLabel: 'BEFORE · Solid title beside the photograph',
    afterLabel: 'AFTER · The photograph fills the letters',
    draw: () =>
      text('brand', 65, 104, 'YARD / MATERIAL SESSIONS', 20) +
      photo(65, 155, 480, 220) +
      text('plain-title', 65, 675, 'CLAY · A hand-building workshop', 26) +
      text('detail', 65, 720, 'Saturday 14 November · 10:00–13:00', 22) +
      text('detail-2', 65, 755, 'All materials included · £24', 22) +
      text('footer', 65, 820, 'yard.example/clay', 20),
    changed: (s) =>
      displayText(
        'word',
        65,
        590,
        'CLAY',
        156,
        `data-change="fill" fill="${s.variant === 'after' ? 'url(#material-fill)' : ink}"`,
      ),
    caption:
      'Only the CLAY lettering fill changes from solid ink to a fixed photographic pattern. Its outlines, position, size, weight, the separate banner photo/crop and all supporting copy remain unchanged.',
  },
  {
    name: 'type-image-mug',
    source: 'explicit-tableware-photo.jpg',
    kind: 'substitution',
    word: 'MUG',
    title: 'Tableware card: retain the letter before adding a mug cue',
    beforeLabel: 'BEFORE · A cup symbol substitutes for U',
    afterLabel: 'AFTER · U stays readable with a handle',
    draw: () =>
      text('brand', 65, 104, 'FIELD / STUDIO TABLEWARE', 20) +
      photo(65, 155, 480, 220) +
      displayText('letter-m', 65, 590, 'M', 132, `fill="${ink}"`) +
      displayText('letter-g', 370, 590, 'G', 132, `fill="${ink}"`) +
      `<path data-element="handle" d="M290 522H296C315 522 315 550 296 550H290" fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>` +
      text('plain-title', 65, 675, 'MUG · Stoneware tableware', 26) +
      text('detail', 65, 720, 'Warm white glaze · 320 ml · £28', 22) +
      text('footer', 65, 820, 'field.example/tableware', 20),
    changed: (s) =>
      displayText(
        'letter-u',
        210,
        590,
        'U',
        132,
        `fill="${ink}" data-change="opacity" opacity="${s.variant === 'after' ? 1 : 0}"`,
      ) +
      `<path data-element="cup-body" data-change="opacity" opacity="${s.variant === 'after' ? 0 : 1}" d="M218 505H294V561Q294 590 266 590H246Q218 590 218 561Z" fill="${ink}"/>`,
    caption:
      'Only the middle body changes: the cup silhouette disappears and the native U becomes visible. M, G, handle, sizes, positions, photography, literal MUG label and product information stay fixed.',
  },
];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const records = [];
try {
  await page.setContent(fontStyle);
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 24px PVTypeImageText'),
      document.fonts.load('800 124px PVTypeImageDisplay'),
    ]);
    await document.fonts.ready;
  });
  const rise = specs[0];
  rise.xs = await page.evaluate(() => {
    const c = document.createElement('canvas').getContext('2d');
    c.font = '800 124px PVTypeImageDisplay';
    c.fontKerning = 'none';
    let x = 65;
    return ['R', 'I', 'S', 'E'].map((letter) => {
      const at = x;
      x += c.measureText(letter).width + 14;
      return Math.round(at * 1000) / 1000;
    });
  });
  for (const s of specs) {
    let defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await image('scale-print-stage-v2.jpg')}"/><image id="photo" width="1536" height="1024" href="${await image(s.source)}"/>`;
    if (s.kind === 'fill')
      defs += `<pattern id="material-fill" patternUnits="userSpaceOnUse" x="65" y="455" width="480" height="160"><svg data-element="material-crop" x="0" y="0" width="480" height="160" viewBox="400 350 1000 400" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg></pattern>`;
    defs += '</defs>';
    const description =
      s.caption +
      ' Original fictional design. Photographs previously generated with AI and reused unchanged; expressive typography composed separately with a fixed variable-font weight.';
    const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(description)}</desc>`;
    const group = (variant, x, y) =>
      `<g data-variant="${variant}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw()}<g data-element="expressive-type" data-word="${s.word}" role="img" aria-label="${s.word}">${s.changed({ ...s, variant })}</g></g>`;
    const label = (x, y, value, size = 20) =>
      `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="${ink}">${escape(value)}</text>`;
    const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group('before', 30, 70)}${group('after', 680, 70)}${label(60, 1030, 'Only the declared expressive intervention changes. Essential information stays readable and fixed.')}</svg>`;
    const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(60, 44, s.beforeLabel)}${group('before', 25, 70)}${label(60, 1064, s.afterLabel)}${group('after', 25, 1090)}${label(60, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
    await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
    await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
    records.push({
      name: s.name,
      source: s.source,
      kind: s.kind,
      word: s.word,
      ...(s.xs
        ? {
            xPositions: s.xs,
            beforeBaselines: [590, 590, 590, 590],
            afterBaselines: [590, 554, 518, 482],
          }
        : {}),
      dimensions: { wide: [1320, 1060], stacked: [660, 2070] },
    });
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-type-image-layouts.json'),
  JSON.stringify(
    {
      fonts: { regular: regularFile, display: displayFile, displayWeight: 800 },
      method:
        'Native SVG expressive transformations with one predeclared intervention per specimen: baseline placement, photographic glyph fill, and restoration of a recognizable glyph in place of a symbol. All other nodes and image source bytes remain fixed.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(records, null, 2));
