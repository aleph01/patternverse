import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f',
  paper = '#fffdf6';
const fonts = {
  PVDistinctBody: 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2',
  PVDistinctTitle: 'docs/pattern-packages/graphic-design-typeface-fonts/reading-display.woff2',
};
const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const fontStyle =
  '<style>' +
  (
    await Promise.all(
      Object.entries(fonts).map(
        async ([name, file]) =>
          `@font-face{font-family:${name};src:url(data:font/woff2;base64,${(await readFile(resolve(root, file))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}`,
      ),
    )
  ).join('') +
  '</style>';
const type = (id, x, y, value, size = 22, title = false) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="${title ? 'PVDistinctTitle' : 'PVDistinctBody'}" font-size="${size}" font-weight="400" fill="${ink}" font-kerning="normal" font-optical-sizing="none">${esc(value)}</text>`;
const surface = (h) =>
  `<rect x="34" y="15" width="548" height="${h - 24}" fill="#d8d4ca"/><rect data-element="surface" x="31" y="12" width="548" height="${h - 24}" fill="${paper}" stroke="#d2cec4"/>`;
const cue = (id, ref, x, y, size, changed = false) =>
  `<svg data-element="${id}-window" x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 64 64"><use data-element="${id}"${changed ? ' data-change="href"' : ''} href="#${ref}"/></svg>`;
const photo = (id, ref, x, y, w, h) =>
  `<svg data-element="${id}-window" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use data-element="${id}" href="#${ref}"/></svg>`;
const rule = (y) => `<path d="M65 ${y}H545" stroke="#d2cec4"/>`;
const markDefs = `<g id="paired" fill="none" stroke="${ink}" stroke-width="4"><rect x="5" y="5" width="34" height="34"/><rect x="25" y="25" width="34" height="34"/></g><g id="corners" fill="${ink}"><path d="M4 4H40V16H16V40H4Z M60 60H24V48H48V24H60Z"/></g><g id="engraved" fill="none" stroke="${ink}" stroke-width="0.65">${Array.from(
  { length: 6 },
  (_, i) => {
    const d = i * 1.6;
    return `<path d="M${4 + d} 40V${4 + d}H40 M${60 - d} 24V${60 - d}H24"/>`;
  },
).join(
  '',
)}</g><g id="shield" fill="${ink}" fill-rule="evenodd"><path d="M32 4L58 14V32C58 46 46 56 32 62C18 56 6 46 6 32V14ZM19 31L27 39L45 21L50 26L27 49L14 36Z"/></g>`;

const sessions = [
  {
    id: 'clay',
    brand: 'COMMON',
    title: 'Clay bowl',
    date: 'Sat 14 Nov · €45',
    place: 'Yard Studios',
    photo: 'clay',
  },
  {
    id: 'gather',
    brand: 'GATHER',
    title: 'Handbuilt cup',
    date: 'Sun 15 Nov · €40',
    place: 'Canal Workshop',
    photo: 'clay',
  },
  {
    id: 'coffee',
    brand: 'COMMON',
    title: 'Coffee tasting',
    date: 'Sat 28 Nov · €18',
    place: 'Yard Studios',
    photo: 'coffee',
  },
];
function directory(after) {
  return (
    surface(850) +
    type('directory-brand', 65, 63, 'YARD / LOCAL WORKSHOPS', 20) +
    type('directory-title', 65, 123, 'November sessions', 38, true) +
    sessions
      .map((s, i) => {
        const y = 155 + i * 210;
        return (
          type(s.id + '-issuer', 65, y + 28, s.brand, 22) +
          cue(
            s.id + '-cue',
            after && s.brand === 'COMMON' ? 'corners' : 'paired',
            505,
            y + 5,
            32,
            s.brand === 'COMMON',
          ) +
          photo(s.id + '-photo', s.photo, 65, y + 55, 160, 106.667) +
          type(s.id + '-title', 250, y + 80, s.title, 32, true) +
          type(s.id + '-date', 250, y + 121, s.date, 22) +
          type(s.id + '-place', 250, y + 156, s.place, 20) +
          (i < 2 ? rule(y + 186) : '')
        );
      })
      .join('') +
    type('directory-url', 65, 815, 'Details + booking · yard.example', 20)
  );
}
function booking(after) {
  return (
    surface(390) +
    cue('booking-cue', after ? 'corners' : 'engraved', 65, 42, 24, true) +
    type('booking-brand', 104, 62, 'COMMON / MAKING TOGETHER', 20) +
    type('booking-title', 65, 121, 'You’re booked', 38, true) +
    photo('booking-photo', 'clay', 65, 150, 180, 120) +
    type('booking-session', 270, 180, 'Clay bowl', 32, true) +
    type('booking-date', 270, 218, 'Sat 14 Nov', 22) +
    type('booking-time', 270, 252, '10:00–12:00', 22) +
    type('booking-price', 65, 313, '€45 · Clay, tools + firing', 22) +
    type('booking-reference', 65, 355, 'YD1042 · Yard Studios', 20)
  );
}
function proof(after) {
  return (
    surface(230) +
    type('proof-title', 65, 52, 'MARK PRODUCTION PROOF', 20) +
    cue('proof-small-cue', after ? 'corners' : 'engraved', 90, 104, 24, true) +
    cue('proof-large-cue', after ? 'corners' : 'engraved', 260, 74, 96, true) +
    type('proof-small-label', 65, 165, '24 px at 1×', 18) +
    type('proof-large-label', 242, 202, 'Detail at 4×', 18)
  );
}
function membership(after) {
  return (
    surface(620) +
    type('membership-brand', 65, 72, 'COMMON / MEMBERS', 22) +
    cue('membership-cue', after ? 'corners' : 'shield', 493, 43, 48, true) +
    type('membership-title-1', 65, 146, 'Make room for', 46, true) +
    type('membership-title-2', 65, 198, 'making.', 46, true) +
    photo('membership-photo', 'studio', 65, 230, 480, 220) +
    type('membership-offer', 65, 501, 'Open studio · Shared tools', 24) +
    type('membership-price', 65, 543, 'From €24/month · See terms', 22) +
    type('membership-url', 65, 586, 'common.example/members', 20)
  );
}
const specs = [
  {
    name: 'distinctive-comparison-set',
    title: 'Compare identity cues among nearby workshop providers',
    before: 'BEFORE · Similar issuer cues',
    after: 'AFTER · One candidate cue changes',
    sources: [
      ['clay', 'audience-pottery-photo.jpg'],
      ['coffee', 'core-message-coffee-photo.jpg'],
    ],
    description:
      'Only the two Common issuer-mark hrefs change from paired outline squares to offset solid corners. The Gather mark remains paired squares. The complete listing, all text, fonts, sizes, anchors, colors, image bytes/crops, rules and surfaces remain fixed. This is a bounded comparison with one fictional alternative, not evidence of market-wide uniqueness or audience recognition.',
    artifacts: [{ id: 'directory', label: 'SHARED WORKSHOP LISTING', height: 850 }],
    draw: (_, a) => directory(a),
    masks: {
      directory: [
        [504, 159, 34, 34],
        [504, 579, 34, 34],
      ],
    },
  },
  {
    name: 'distinctive-small-size',
    title: 'Preserve the identifying silhouette at small size',
    before: 'BEFORE · Fine engraved rails',
    after: 'AFTER · Solid opposing corners',
    sources: [['clay', 'audience-pottery-photo.jpg']],
    description:
      'Only three selected cue hrefs change from engraved rails to solid corner bands: one 24-unit mark in the confirmation, plus 24-unit and 96-unit production-proof renderings. Bounding boxes, placements, paper, copy, fonts, photos/crops and all other attributes stay fixed. The enlarged detail is explanatory, not the intended viewing size. Pixel labels refer to 1x source rendering; responsive display can scale the artwork.',
    artifacts: [
      { id: 'booking', label: 'BOOKING CONFIRMATION', height: 390 },
      { id: 'proof', label: 'EXPLANATORY PRODUCTION PROOF', height: 230 },
    ],
    draw: (f, a) => (f.id === 'booking' ? booking(a) : proof(a)),
    masks: {
      booking: [[64, 41, 26, 26]],
      proof: [
        [89, 103, 26, 26],
        [259, 73, 98, 98],
      ],
    },
  },
  {
    name: 'distinctive-unintended-meaning',
    title: 'Separate an identity cue from a possible verification signal',
    before: 'BEFORE · A shield-and-check cue',
    after: 'AFTER · Another identity candidate',
    sources: [['studio', 'form-open-studios-photo.jpg']],
    description:
      'Only one selected issuer-mark href changes from a fictional shield-and-check design to offset corners. The offer, price, URL, typography, placements, image bytes/crop, colors and surface remain identical. Verification or protection is a possible unintended reading, not an observed audience response. The new mark is not claimed to be unique, learned or legally cleared.',
    artifacts: [{ id: 'membership', label: 'STUDIO MEMBERSHIP ANNOUNCEMENT', height: 620 }],
    draw: (_, a) => membership(a),
    masks: { membership: [[492, 42, 50, 50]] },
  },
];
const records = [];
for (const s of specs) {
  const defs = `<defs>${fontStyle}${markDefs}${(await Promise.all(s.sources.map(async ([id, file]) => `<image id="${id}" width="1536" height="1024" href="data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}"/>`))).join('')}</defs>`;
  const label = (x, y, v) =>
    `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="20" fill="${ink}">${esc(v)}</text>`;
  const art = (f, a, x, y) =>
    `<g data-artifact="${f.id}" transform="translate(${x} ${y})">${s.draw(f, a)}</g>`;
  let wy = 102,
    my = 100;
  const wp = [],
    mp = [];
  for (const f of s.artifacts) {
    wp.push({ y: wy, labelY: wy - 10 });
    mp.push({ beforeY: my, afterY: my + f.height + 58 });
    wy += f.height + 64;
    my += 2 * (f.height + 58) + 38;
  }
  const wh = wy + 20,
    mh = my + 10;
  const meta = `<title id="title">${esc(s.title)}</title><desc id="description">${esc(s.description)} Fictional original artwork, reused AI-generated photographs and separately composed native typography.</desc>`;
  const wrap = (v, c) => `<g data-variant="${v}">${c}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="${wh}" viewBox="0 0 1320 ${wh}" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 40, s.before)}${label(712, 40, s.after)}${wp.map((p, i) => label(62, p.labelY, s.artifacts[i].label) + label(712, p.labelY, s.artifacts[i].label)).join('')}${wrap('before', wp.map((p, i) => art(s.artifacts[i], false, 30, p.y)).join(''))}${wrap('after', wp.map((p, i) => art(s.artifacts[i], true, 680, p.y)).join(''))}${label(60, wh - 16, 'Fictional identities · Only selected cue artwork changes.')}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="${mh}" viewBox="0 0 660 ${mh}" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${mp.map((p, i) => label(60, p.beforeY - 20, 'BEFORE · ' + s.artifacts[i].label) + label(60, p.afterY - 20, 'AFTER · ' + s.artifacts[i].label)).join('')}${wrap('before', mp.map((p, i) => art(s.artifacts[i], false, 25, p.beforeY)).join(''))}${wrap('after', mp.map((p, i) => art(s.artifacts[i], true, 25, p.afterY)).join(''))}${label(60, mh - 16, 'Fictional identities · Before/after paired by artifact')}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
  records.push({
    name: s.name,
    title: s.title,
    sources: s.sources.map(([id, file]) => ({ id, file, width: 1536, height: 1024 })),
    description: s.description,
    dimensions: { wide: [1320, wh], stacked: [660, mh] },
    artifacts: s.artifacts.map((f) => ({ ...f, width: 610, masks: s.masks[f.id] })),
    presentation:
      'Wide: before set beside after set. Narrow: before/after interleaved by artifact. Native artifact content and geometry are preserved.',
  });
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-distinctive-layouts.json'),
  JSON.stringify(
    {
      fonts,
      method:
        'Only declared cue hrefs change. Identical source photographs, copy, type, scale, anchors, surface and presentation within each pair. Original native identity candidates; no audience recognition results.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log('Built three distinctive-cue comparisons and three interleaved narrow views.');
