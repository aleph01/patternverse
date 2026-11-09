import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f',
  paper = '#fffdf6';
const fonts = {
  PVLanguageBody: 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2',
  PVLanguageTitle: 'docs/pattern-packages/graphic-design-typeface-fonts/reading-display.woff2',
};
const fontStyle =
  '<style>' +
  (
    await Promise.all(
      Object.entries(fonts).map(
        async ([family, file]) =>
          `@font-face{font-family:${family};src:url(data:font/woff2;base64,${(await readFile(resolve(root, file))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}`,
      ),
    )
  ).join('') +
  '</style>';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, value, size = 22) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-size="${size}" font-weight="400" fill="${ink}">${escape(value)}</text>`;
const role = (id, family, content, change = false) =>
  `<g data-element="${id}"${change ? ' data-change="font-family"' : ''} font-family="${family}" font-kerning="normal" font-optical-sizing="none">${content}</g>`;
const body = (id, x, y, value, size = 22) =>
  role(id + '-type', 'PVLanguageBody', text(id, x, y, value, size));
const photo = (id, ref, x, y, w, h, changed = false) =>
  `<svg data-element="${id}-window" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid meet"><use data-element="${id}"${changed ? ' data-change="href"' : ''} href="#${ref}"/></svg>`;
const surface = (h) =>
  `<rect x="34" y="15" width="548" height="${h - 24}" fill="#d8d4ca"/><rect data-element="surface" x="31" y="12" width="548" height="${h - 24}" fill="${paper}" stroke="#d2cec4"/>`;
const motif = (id, x, y, opacity = 1, changed = false) =>
  `<g data-element="${id}"${changed ? ' data-change="opacity"' : ''} opacity="${opacity}" transform="translate(${x} ${y})" fill="${ink}"><rect width="12" height="12"/><rect x="19" width="12" height="12" fill="none" stroke="${ink}" stroke-width="2"/></g>`;
const formats = [
  { id: 'poster', label: 'POSTER', height: 700 },
  { id: 'ticket', label: 'ADMISSION TICKET', height: 260 },
  { id: 'reminder', label: 'EMAIL REMINDER', height: 360 },
];
function eventArtifact(format, after, caseId) {
  const f = format.id,
    typing = caseId === 'roles' && f !== 'poster',
    titleFamily = typing && !after ? 'PVLanguageBody' : 'PVLanguageTitle',
    factsFamily = typing && !after ? 'PVLanguageTitle' : 'PVLanguageBody';
  const title = (x, y, size) =>
    role(f + '-title', titleFamily, text(f + '-name', x, y, 'Clay bowl', size), typing);
  const facts = (content) => role(f + '-facts', factsFamily, content, typing);
  let content = surface(format.height);
  if (f === 'poster')
    content +=
      body('poster-brand', 65, 62, 'COMMON / MAKING TOGETHER', 20) +
      title(65, 132, 46) +
      photo('poster-photo', 'clay', 65, 164, 480, 270) +
      facts(
        text('poster-date', 65, 493, 'Sat 14 Nov · 10:00–12:00', 24) +
          text('poster-price', 65, 535, '€45 · Clay, tools + firing', 24) +
          text('poster-address', 65, 577, 'Yard Studios · 8 Mill Lane', 22),
      ) +
      body('poster-url', 65, 635, 'common.example/clay', 20);
  if (f === 'ticket')
    content +=
      body('ticket-brand', 65, 44, 'COMMON / MAKING TOGETHER', 18) +
      title(65, 94, 38) +
      facts(
        text('ticket-date', 65, 139, 'Sat 14 Nov · 10:00–12:00', 24) +
          text('ticket-price', 65, 180, '€45 · Admission for one', 22) +
          text('ticket-reference', 65, 222, 'YD1042 · Yard Studios', 20),
      );
  if (f === 'reminder')
    content +=
      body('reminder-brand', 65, 44, 'COMMON / BOOKING REMINDER', 18) +
      title(65, 94, 38) +
      photo('reminder-photo', 'clay', 65, 121, 180, 120) +
      facts(
        text('reminder-context', 270, 151, 'Tomorrow', 22) +
          text('reminder-time', 270, 189, '10:00–12:00', 24) +
          text('reminder-detail', 65, 284, 'Bring an apron. Tools are ready.', 22),
      ) +
      body('reminder-url', 65, 329, 'common.example/clay', 20);
  if (caseId === 'motifs') {
    content += motif(f + '-signature', 510, f === 'poster' ? 47 : 29);
    const extra =
      f === 'poster'
        ? [
            [510, 477],
            [510, 519],
          ]
        : f === 'ticket'
          ? [[510, 164]]
          : [[510, 269]];
    extra.forEach(([x, y], i) => {
      content += motif(f + '-extra-' + i, x, y, after ? 0 : 1, true);
    });
  }
  return content;
}
const sessions = [
  {
    id: 'clay-card',
    label: 'CLAY BOWL',
    title: 'Clay bowl',
    date: 'Sat 14 Nov',
    price: '€45 · Materials',
    source: 'clay',
  },
  {
    id: 'seed-card',
    label: 'SEED PACKING',
    title: 'Seed packing',
    date: 'Sat 21 Nov',
    price: 'Free · Volunteer',
    source: 'seeds',
  },
  {
    id: 'coffee-card',
    label: 'COFFEE TASTING',
    title: 'Coffee tasting',
    date: 'Sat 28 Nov',
    price: '€18 · Tasting',
    source: 'coffee',
  },
];
function sessionArtifact(s, after) {
  return (
    surface(360) +
    body(s.id + '-brand', 65, 58, 'COMMON / SATURDAY SESSIONS', 18) +
    role(s.id + '-title', 'PVLanguageTitle', text(s.id + '-name', 65, 110, s.title, 38)) +
    photo(s.id + '-photo', after ? s.source : 'studio', 65, 140, 220, 146.667, true) +
    body(s.id + '-date', 320, 166, s.date, 24) +
    body(s.id + '-time', 320, 205, '10:00–12:00', 22) +
    body(s.id + '-price', 320, 245, s.price, 22) +
    body(s.id + '-action', 65, 322, 'Reserve · common.example/sessions', 20) +
    motif(s.id + '-signature', 510, 43)
  );
}
const specs = [
  {
    name: 'language-cross-format-roles',
    title: 'Shared type roles across a poster, ticket and reminder',
    before: 'BEFORE · The type roles drift by format',
    after: 'AFTER · Shared roles; different layouts',
    description:
      'Only four font-family attributes change: title/facts groups in the ticket and reminder. The poster establishes Source Serif4 Display for event titles and Source Sans3 Regular for facts; the other formats adopt those same roles. Nominal sizes, weights, text, positions, individual layouts, colors and embedded photographs/fitting remain identical. Intrinsic glyph drawing and text widths change with the declared face. Original fictional flat-artwork set, not implemented email or printed evidence.',
    sources: [['clay', 'audience-pottery-photo.jpg']],
    artifacts: formats,
    draw: (f, a) => eventArtifact(f, a, 'roles'),
    masks: {
      poster: [],
      ticket: [
        [60, 55, 490, 55],
        [60, 110, 490, 125],
      ],
      reminder: [
        [60, 55, 490, 55],
        [265, 122, 280, 80],
        [60, 254, 490, 45],
      ],
    },
  },
  {
    name: 'language-motif-function',
    title: 'Repeat a programme motif with one stable job',
    before: 'BEFORE · Repetition suggests mixed jobs',
    after: 'AFTER · The motif signs the programme',
    description:
      'Only four redundant motif-group opacity attributes change1→0. One paired-square signature beside the brand line remains in each artifact. Two poster marks beside facts, one ticket mark beside price and one reminder mark beside preparation text disappear. All text, font settings, positions, image source/crops, surfaces and retained signatures remain identical. The marker is an original fictional programme motif, not a learned service symbol or a tested identity asset.',
    sources: [['clay', 'audience-pottery-photo.jpg']],
    artifacts: formats,
    draw: (f, a) => eventArtifact(f, a, 'motifs'),
    masks: {
      poster: [
        [508, 475, 35, 16],
        [508, 517, 35, 16],
      ],
      ticket: [[508, 162, 35, 16]],
      reminder: [[508, 267, 35, 16]],
    },
  },
  {
    name: 'language-controlled-image-variation',
    title: 'Allow content-specific imagery inside stable session-card rules',
    before: 'BEFORE · One generic picture everywhere',
    after: 'AFTER · Images vary within shared rules',
    description:
      'Only three selected-photo href attributes change from one generic studio image to clay, seed-packing and coffee images. These existing generated photographs deliberately differ in subject and photographic content. Every card retains its own copy, Source Serif4 title/Source Sans3 facts, font sizes/weights/anchors, fixed220×146.667 full-image fitting, arrangement, paired-square signature, colors and surface. No claim that image selection isolates semantic effects or that object crops/content remain identical. Fictional flat-artwork programme cards.',
    sources: [
      ['studio', 'form-open-studios-photo.jpg'],
      ['clay', 'audience-pottery-photo.jpg'],
      ['seeds', 'form-seed-packing-photo.jpg'],
      ['coffee', 'core-message-coffee-photo.jpg'],
    ],
    artifacts: sessions.map((s) => ({ ...s, height: 360 })),
    draw: sessionArtifact,
    masks: Object.fromEntries(sessions.map((s) => [s.id, [[65, 140, 220, 147]]])),
  },
];
const records = [];
for (const s of specs) {
  const defs = `<defs>${fontStyle}${(await Promise.all(s.sources.map(async ([id, file]) => `<image id="${id}" width="1536" height="1024" href="data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}"/>`))).join('')}</defs>`;
  const label = (x, y, value) =>
    `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="20" fill="${ink}">${escape(value)}</text>`;
  const art = (f, a, x, y) =>
    `<g data-artifact="${f.id}" transform="translate(${x} ${y})">${s.draw(f, a)}</g>`;
  let wideY = 102,
    mobileY = 100;
  const widePositions = [],
    mobilePositions = [];
  for (const f of s.artifacts) {
    widePositions.push({ id: f.id, y: wideY, labelY: wideY - 10 });
    mobilePositions.push({ id: f.id, beforeY: mobileY, afterY: mobileY + f.height + 58 });
    wideY += f.height + 64;
    mobileY += 2 * (f.height + 58) + 38;
  }
  const wideHeight = wideY + 20,
    mobileHeight = mobileY + 10;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)} Existing AI-generated photographic artwork; native type and layout composed separately.</desc>`;
  const wrapper = (variant, content) => `<g data-variant="${variant}">${content}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="${wideHeight}" viewBox="0 0 1320 ${wideHeight}" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 40, s.before)}${label(712, 40, s.after)}${widePositions.map((p, i) => label(62, p.labelY, s.artifacts[i].label) + label(712, p.labelY, s.artifacts[i].label)).join('')}${wrapper('before', widePositions.map((p, i) => art(s.artifacts[i], false, 30, p.y)).join(''))}${wrapper('after', widePositions.map((p, i) => art(s.artifacts[i], true, 680, p.y)).join(''))}${label(60, wideHeight - 16, 'Fictional programme · Only declared role, motif or image selection changes.')}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="${mobileHeight}" viewBox="0 0 660 ${mobileHeight}" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${mobilePositions.map((p, i) => label(60, p.beforeY - 20, 'BEFORE · ' + s.artifacts[i].label) + label(60, p.afterY - 20, 'AFTER · ' + s.artifacts[i].label)).join('')}${wrapper('before', mobilePositions.map((p, i) => art(s.artifacts[i], false, 25, p.beforeY)).join(''))}${wrapper('after', mobilePositions.map((p, i) => art(s.artifacts[i], true, 25, p.afterY)).join(''))}${label(60, mobileHeight - 16, 'Fictional programme · Paired views of each artifact')}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
  records.push({
    name: s.name,
    title: s.title,
    sources: s.sources.map(([id, file]) => ({ id, file, width: 1536, height: 1024 })),
    description: s.description,
    dimensions: { wide: [1320, wideHeight], stacked: [660, mobileHeight] },
    artifacts: s.artifacts.map((f) => ({
      id: f.id,
      label: f.label,
      width: 610,
      height: f.height,
      masks: s.masks[f.id],
    })),
    presentation:
      'Wide: all before artifacts beside all after artifacts. Narrow: before/after interleaved by artifact; each artifact’s entire native content and geometry are preserved.',
  });
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-language-layouts.json'),
  JSON.stringify(
    {
      fonts,
      method:
        'Controlled native artwork sets. Every artifact is preserved between the wide and interleaved narrow presentations. Only four font roles, four extra-motif opacities or three selected image hrefs change within the respective comparison.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log('Built three cross-artifact comparisons and their interleaved narrow versions.');
