// Reproducible native SVG layouts. Photographic pixels are embedded unchanged;
// crops, overlays and the explicitly labelled expressive edit stay editable.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {
  cameraPlan,
  editorialModification,
  photographyEditorialStyle,
} from './photography-editorial-style.mjs';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets');
const directory = resolve(assets, 'photography');
const dimensions = JSON.parse(await readFile(resolve(assets, 'manifest.json'), 'utf8'));
const derived = [];
const provenancePath = resolve(root, 'docs/pattern-packages/photography-provenance.json');
const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const data = new Map();
const photo = async (name, crop, x, y, w, h, filter = '') => {
  const file = `photography/${name}.webp`;
  if (!data.has(name)) {
    data.set(name, (await readFile(resolve(assets, file))).toString('base64'));
  }
  const size = dimensions[file];
  const view = crop ?? [0, 0, size.width, size.height];
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${view.join(' ')}" preserveAspectRatio="xMidYMid meet"><use href="#photo-${name}"${filter ? ` filter="url(#${filter})"` : ''}/></svg>`;
};
const label = (x, y, text) => `<text x="${x}" y="${y}" font-size="22">${escape(text)}</text>`;
const line = (a, b, c, d) =>
  `<path d="M${a} ${b} L${c} ${d}" fill="none" stroke="#00855b" stroke-width="1.8"/>`;
const box = (x, y, w, text) =>
  `<rect x="${x}" y="${y - 27}" width="${w}" height="38" fill="white" stroke="#a6aca3" stroke-width="1.1"/>${label(x + 10, y, text)}`;
const svg = async (name, height, title, body, sources = []) => {
  const resources = [
    ...new Set([...body.matchAll(/href="#photo-([a-z0-9-]+)"/g)].map((match) => match[1])),
  ];
  const definitions = resources
    .map((key) => {
      const size = dimensions[`photography/${key}.webp`];
      return `<image id="photo-${key}" width="${size.width}" height="${size.height}" href="data:image/webp;base64,${data.get(key)}"/>`;
    })
    .join('');
  const rights = provenance.assets.find((a) => a.file === `photography/${name}.svg`);
  rights.modifications =
    rights.modifications.split(' Light editorial presentation:')[0] + ' ' + editorialModification;
  const metadata = {
    creator: rights.creator,
    attribution: rights.attribution,
    license: rights.license,
    license_url: rights.license_url,
    modifications: rights.modifications,
    sources: sources.map((key) => {
      const source = provenance.assets.find((a) => a.file === `photography/${key}.webp`);
      return {
        file: source.file,
        creator: source.creator,
        source_url: source.source_url,
        license: source.license,
        license_url: source.license_url,
        rights: source.rights,
      };
    }),
  };
  const result = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${height}" viewBox="0 0 720 ${height}" role="img" aria-labelledby="title desc" data-photography-style="light-editorial"><title id="title">${escape(title)}</title><desc id="desc">${escape(title)}. Explanatory labels are editable SVG text. Photograph provenance appears in the article caption and collection records.</desc><metadata>${escape(JSON.stringify(metadata))}</metadata>${photographyEditorialStyle}<defs>${definitions}</defs><rect width="720" height="${height}" fill="white"/><g fill="#252c28">${body}</g></svg>\n`;
  await writeFile(resolve(directory, `${name}.svg`), result);
  dimensions[`photography/${name}.svg`] = { width: 720, height };
  derived.push({ file: `photography/${name}.svg`, sources, method: title });
};

await svg(
  'negative-space-comparison',
  310,
  'Wide and closer crops give space different roles',
  (await photo('negative-space-source', null, 0, 0, 350, 250)) +
    (await photo('negative-space-source', [900, 390, 636, 634], 370, 0, 350, 250)) +
    label(15, 285, 'Wide: open space') +
    label(385, 285, 'Closer: object emphasis'),
  ['negative-space-source'],
);

const grid = (x) =>
  [1, 2]
    .map(
      (n) =>
        `<path d="M${x + (n * 350) / 3} 0 V250 M${x} ${(n * 250) / 3} H${x + 350}" stroke="white" stroke-width="2" opacity=".8"/>`,
    )
    .join('');
await svg(
  'thirds-comparison',
  310,
  'Thirds and centered placement in crops of one source',
  (await photo('negative-space-source', [1066, 458, 400, 286], 0, 0, 350, 250)) +
    grid(0) +
    (await photo('negative-space-source', [1136, 458, 400, 286], 370, 0, 350, 250)) +
    label(15, 285, 'Off-center, more sea') +
    label(385, 285, 'Centered, steady anchor'),
  ['negative-space-source'],
);

await svg(
  'crop-comparison',
  390,
  'Three intentions from one photograph',
  (await photo('negative-space-source', null, 0, 0, 230, 300)) +
    (await photo('negative-space-source', [900, 390, 636, 634], 245, 0, 230, 300)) +
    (await photo('negative-space-source', [1080, 30, 456, 994], 490, 0, 230, 300)) +
    label(10, 340, 'Wide') +
    label(255, 340, 'Closer') +
    label(500, 340, 'Tall'),
  ['negative-space-source'],
);

await svg(
  'leading-lines-overlay',
  720,
  'Selected receding edges connect foreground and doorway',
  (await photo('composition-corridor', [0, 0, 880, 887], 0, 0, 720, 720)) +
    line(20, 690, 370, 405) +
    line(690, 690, 420, 405) +
    line(650, 100, 420, 375) +
    box(15, 40, 330, 'Edges suggest a connection'),
  ['composition-corridor'],
);

await svg(
  'layers-overlay',
  720,
  'Near architecture, a middle-distance person, and a far doorway',
  (await photo('composition-corridor', [893, 0, 881, 887], 0, 0, 720, 720)) +
    line(110, 100, 90, 470) +
    line(570, 180, 530, 430) +
    line(350, 90, 390, 350) +
    box(10, 65, 210, 'Near: column') +
    box(465, 145, 245, 'Middle: figure') +
    box(260, 45, 250, 'Far: doorway'),
  ['composition-corridor'],
);

await svg(
  'edges-overlay',
  480,
  'Two fragments interrupt the intended quiet composition',
  (await photo('check-the-edges-source', null, 0, 0, 720, 480)) +
    line(190, 365, 110, 425) +
    line(570, 65, 700, 30) +
    box(10, 350, 240, 'Railing fragment') +
    box(420, 75, 230, 'Bright fragment'),
  ['check-the-edges-source'],
);
await svg(
  'edges-revised',
  420,
  'A revised crop removes fragments and gives up some context',
  await photo('check-the-edges-source', [400, 150, 970, 530], 0, 0, 720, 390),
  ['check-the-edges-source'],
);

await svg(
  'camera-position',
  420,
  'Camera position changes overlaps in a plan view',
  `<path d="M80 70 H640" class="line"/><circle cx="360" cy="210" r="22" class="subject"/>` +
    `<path d="M145 320 L360 210 L610 70 M535 320 L360 210 L155 70" class="route"/>` +
    cameraPlan(145, 330) +
    cameraPlan(535, 330) +
    label(80, 45, 'Distant background') +
    box(290, 170, 170, 'Near subject') +
    label(95, 395, 'Camera A') +
    label(485, 395, 'Camera B'),
);

let lightBody = '';
for (let i = 0; i < 3; i++) {
  const x = i * 240 + 120;
  lightBody += label(i * 240 + 20, 40, ['Front light', 'Side light', 'Backlight'][i]);
  lightBody += `<circle cx="${x}" cy="190" r="25" class="subject"/>` + cameraPlan(x, 310);
  const sx = i === 1 ? x - 90 : x;
  const sy = i === 0 ? 275 : i === 1 ? 190 : 90;
  lightBody += `${line(sx, sy, x, 190)}<circle cx="${sx}" cy="${sy}" r="17" class="source"/>`;
}
await svg(
  'light-direction',
  400,
  'Plan view: light, subject, camera',
  lightBody +
    '<circle cx="30" cy="380" r="9" class="source"/>' +
    label(48, 387, 'Light source') +
    '<circle cx="280" cy="380" r="9" class="subject"/>' +
    label(298, 387, 'Subject') +
    cameraPlan(520, 369) +
    label(552, 387, 'Camera'),
);

await svg(
  'apparent-source-size',
  380,
  'The same source subtends a larger angle nearby',
  label(15, 40, 'Near: larger angle') +
    label(375, 40, 'Far: smaller angle') +
    `<path d="M40 100 L200 190 L40 280 M390 100 L690 190 L390 280" class="fine"/><path d="M40 100 V280 M390 100 V280" stroke="#00855b" stroke-width="2.4"/><circle cx="200" cy="190" r="15" class="subject"/><circle cx="690" cy="190" r="15" class="subject"/>` +
    label(15, 335, 'Equal physical source size; different distance'),
);

await svg(
  'motion-comparison',
  295,
  'Real waterfall frames: 1/800 second and 1 second',
  (await photo('motion-short', null, 25, 15, 300, 200)) +
    (await photo('motion-long', null, 395, 15, 300, 200)) +
    label(25, 260, '1/800 s: distinct shapes') +
    label(395, 260, '1 s: continuous flow'),
  ['motion-short', 'motion-long'],
);

let waiting = '';
for (const [i, name] of ['wait-before', 'wait-during', 'wait-after'].entries()) {
  waiting += await photo(name, null, 0, i * 450, 720, 405);
  waiting += label(
    15,
    i * 450 + 435,
    [
      '4 s — before central passage',
      '5 s — a distinct central figure',
      '6 s — after central passage',
    ][i],
  );
}
await svg('wait-sequence', 1350, 'One fixed frame, three successive video moments', waiting, [
  'wait-before',
  'wait-during',
  'wait-after',
]);

await svg(
  'portrait-activity-comparison',
  345,
  'A seated moment and active conversation from one documented visit',
  (await photo('ford-visit-contact-sheet', [160, 480, 310, 220], 0, 0, 350, 270)) +
    (await photo('ford-visit-contact-sheet', [1060, 480, 310, 220], 370, 0, 350, 270)) +
    label(15, 310, 'Seated portrait moment') +
    label(385, 310, 'Conversational gesture'),
  ['ford-visit-contact-sheet'],
);

const editFilter = `<defs><filter id="edit" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="gamma" amplitude="1" exponent=".92" offset="0"/><feFuncG type="gamma" amplitude="1" exponent=".92" offset="0"/><feFuncB type="gamma" amplitude="1" exponent=".92" offset="0"/></feComponentTransfer><feColorMatrix type="saturate" values=".9"/></filter></defs>`;
await svg(
  'edit-comparison',
  300,
  'One real source frame before and after an expressive tonal edit',
  editFilter +
    (await photo('exposure-comparison', [640, 0, 640, 426], 0, 0, 350, 240)) +
    (await photo('exposure-comparison', [640, 0, 640, 426], 370, 0, 350, 240, 'edit')) +
    label(15, 275, 'Source frame') +
    label(385, 275, 'Gentle midtone lift'),
  ['exposure-comparison'],
);

const story = [
  [160, 160, 310, 220, 'Setting'],
  [770, 190, 310, 220, 'Activity'],
  [1160, 570, 160, 125, 'Detail crop'],
  [475, 1380, 310, 220, 'Departure'],
];
let storyBody = '';
for (const [i, [x, y, w, h, text]] of story.entries()) {
  const dx = (i % 2) * 370;
  const dy = Math.floor(i / 2) * 310;
  storyBody += await photo('ford-visit-contact-sheet', [x, y, w, h], dx, dy, 350, 260);
  storyBody += label(dx + 15, dy + 295, text);
}
await svg(
  'story-sequence',
  630,
  'Setting, activity, detail, and departure from a real archival visit',
  storyBody,
  ['ford-visit-contact-sheet'],
);

await writeFile(resolve(assets, 'manifest.json'), `${JSON.stringify(dimensions, null, 2)}\n`);
await writeFile(
  resolve(root, 'docs/pattern-packages/photography-derived-visuals.json'),
  `${JSON.stringify(derived, null, 2)}\n`,
);
for (const record of provenance.assets) {
  record.sha256 = createHash('sha256')
    .update(await readFile(resolve(assets, record.file)))
    .digest('hex');
}
await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);
console.log(
  `Wrote ${derived.length} native photographic comparisons, overlays, and setup diagrams.`,
);

// Keep the additional examples and mobile companions in the regeneration path.
await import('./build-photography-examples.mjs');
