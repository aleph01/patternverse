import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f',
  ground = '#fffdf6';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, value, size = 22, change = '') =>
  `<text data-element="${id}"${change ? ` data-change="${change}"` : ''} x="${x}" y="${y}" font-family="PVSymbolSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${ink}">${escape(value)}</text>`;
const photo = (x, y, w, h) =>
  `<svg data-element="image-window" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice" overflow="hidden"><use href="#photo"/></svg>`;
const icon = (id, ref, x, y, size, change = '') =>
  `<svg data-element="${id}-window" x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 96 96" overflow="visible"><use data-element="${id}"${change ? ` data-change="${change}"` : ''} href="#${ref}"/></svg>`;
const icons = `<g id="rosette" fill="none" stroke="${ink}" stroke-width="5" stroke-linejoin="round"><path d="M48 9L58 24L76 20L72 38L87 48L72 58L76 76L58 72L48 87L38 72L20 76L24 58L9 48L24 38L20 20L38 24Z"/><circle cx="48" cy="48" r="13"/></g><g id="information" fill="${ink}"><circle cx="48" cy="48" r="39" fill="none" stroke="${ink}" stroke-width="5"/><circle cx="48" cy="29" r="5"/><path d="M43 42H53V70H43Z"/></g><g id="upload" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 65V81H81V65M48 63V15M28 35L48 15L68 35"/></g><g id="download" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 65V81H81V65M48 15V63M28 43L48 63L68 43"/></g><g id="headphones" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 61V44A32 32 0 0 1 80 44V61"/><rect x="12" y="48" width="15" height="31" rx="5"/><rect x="69" y="48" width="15" height="31" rx="5"/></g>`;
const specs = [
  {
    name: 'symbols-information',
    photo: 'audience-museum-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    title: 'Visitor guide: replace a brand ornament with an information cue',
    before: 'BEFORE · A brand mark carries the service',
    after: 'AFTER · A familiar information cue',
    description:
      'Only service-symbol href changes from the original rosette ornament to an original drawing of a conventional circled lowercase i. The80×80 icon window, text labels, image bytes/crop, all other native typography, paper and presentation remain fixed. Neither symbol is copied from a certified sign system. Fictional visitor guide.',
    frame: [65, 180, 480, 240],
    masks: [[65, 450, 80, 80]],
    change: { element: 'service-symbol', attribute: 'href', values: ['#rosette', '#information'] },
    copy: [
      ['brand', 65, 104, 'COMMON / VISITOR GUIDE', 20],
      ['headline', 65, 158, 'Welcome to Common', 44],
      ['service-label', 170, 482, 'Visitor information', 30],
      ['service-detail', 170, 520, 'Ask at the entrance desk.', 23],
      ['hours', 65, 625, 'Open Tue–Sun · 10:00–17:00', 25],
      ['address', 65, 673, '18 Market Lane · Free entry', 23],
      ['footer', 65, 820, 'common.example/visit', 20],
    ],
    draw: (after) =>
      photo(65, 180, 480, 240) +
      icon('service-symbol', after ? 'information' : 'rosette', 65, 450, 80, 'href'),
  },
  {
    name: 'symbols-download',
    phone: true,
    photo: 'form-open-studios-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    title: 'Publication page: match the symbol to the action',
    before: 'BEFORE · Upload arrow, download label',
    after: 'AFTER · Symbol and action agree',
    description:
      'Only action-symbol href changes from an upward upload arrow to a downward download arrow. The32×32 icon window, receiving-tray geometry, Download PDF label, button, metadata, fixed photo/crop, all font settings, screen, device and lighting remain identical. Original native SVG symbols; fictional static interface mockup, not an implemented download.',
    frame: [158, 285, 294, 196],
    masks: [[174, 635, 32, 32]],
    change: { element: 'action-symbol', attribute: 'href', values: ['#upload', '#download'] },
    copy: [
      ['brand', 158, 132, 'COMMON / PUBLICATIONS', 18],
      ['headline', 158, 205, 'Studio review', 36],
      ['year', 158, 250, '2026', 36],
      ['purpose', 158, 533, 'Workshops + open studios', 20],
      ['format', 158, 573, 'PDF · 8 pages · 1.2 MB', 20],
      ['button-label', 224, 660, 'Download PDF', 22],
      ['footer', 158, 754, 'common.example/review', 18],
    ],
    draw: (after) =>
      `<rect data-element="screen" x="138" y="79" width="334" height="736" rx="42" fill="${ground}"/>` +
      photo(158, 285, 294, 196) +
      `<rect data-element="button" x="158" y="618" width="294" height="66" rx="6" fill="none" stroke="${ink}" stroke-width="2"/>` +
      icon('action-symbol', after ? 'download' : 'upload', 174, 635, 32, 'href'),
  },
  {
    name: 'symbols-audio-label',
    photo: 'core-message-library-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    title: 'Collection leaflet: identify the service behind a recognizable object',
    before: 'BEFORE · Headphones, unspecified service',
    after: 'AFTER · A label identifies the service',
    description:
      'Only audio-label opacity changes0→1 to show Audio guide. The headphone symbol, photo bytes/crop, icon window, all other copy and font settings, reserved label space, layout, paper and lighting stay fixed. The label is part of the explanatory intervention; no other information is deleted. Original pictogram and fictional collection leaflet.',
    frame: [65, 205, 480, 240],
    masks: [[180, 475, 250, 50]],
    change: { element: 'audio-label', attribute: 'opacity', values: ['0', '1'] },
    copy: [
      ['brand', 65, 104, 'COMMON / THE COLLECTION', 20],
      ['headline', 65, 170, 'Explore the collection', 43],
      ['audio-label', 185, 515, 'Audio guide', 32],
      ['detail', 65, 625, 'Ask at the desk · Free to borrow', 25],
      ['hours', 65, 673, 'Available Tue–Sun · 10:00–16:30', 23],
      ['footer', 65, 820, 'common.example/collection', 20],
    ],
    draw: () => photo(65, 205, 480, 240) + icon('audio-symbol', 'headphones', 65, 475, 80),
  },
];
const font = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVSymbolSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, font))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const records = [];
for (const s of specs) {
  const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="data:image/jpeg;base64,${(await readFile(resolve(assets, s.stage))).toString('base64')}"/><image id="photo" width="1536" height="1024" href="data:image/jpeg;base64,${(await readFile(resolve(assets, s.photo))).toString('base64')}"/>${icons}</defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)} Existing AI-generated photographic artwork reused unchanged; separate native typography and symbols.</desc>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}${s.copy
      .map((args) => {
        let t = text(...args);
        if (args[0] === s.change.element && s.change.attribute === 'opacity')
          t = t.replace('<text ', `<text data-change="opacity" opacity="${after ? 1 : 0}" `);
        return t;
      })
      .join('')}</g>`;
  const label = (x, y, copy) =>
    `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="20" fill="${ink}">${escape(copy)}</text>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.before)}${label(712, 44, s.after)}${group(false, 30, 70)}${group(true, 680, 70)}${label(60, 1030, 'Only the declared symbol selection or label visibility changes. Imagery, typography and presentation stay fixed.')}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(60, 44, s.before)}${group(false, 25, 70)}${label(60, 1064, s.after)}${group(true, 25, 1090)}${label(60, 2050, 'Fictional examples · Generated photos + native symbols')}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
  records.push({
    name: s.name,
    sources: [{ id: 'photo', file: s.photo, width: 1536, height: 1024 }],
    stage: s.stage,
    phone: !!s.phone,
    dimensions: { wide: [1320, 1060], stacked: [660, 2070] },
    frame: s.frame,
    description: s.description,
    masks: s.masks,
    copy: s.copy,
    declaredChanges: s.change.values.map((value) => [
      { element: s.change.element, attribute: s.change.attribute, value },
    ]),
  });
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-symbol-layouts.json'),
  JSON.stringify(
    {
      font,
      method:
        'Original native vector symbols and unchanged embedded photographic sources; only two selected symbol hrefs and one label opacity change. No photographic regeneration, retouching, font scale, crop, position, color or unrelated copy changes.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log('Built three symbol comparisons and three stacked views.');
