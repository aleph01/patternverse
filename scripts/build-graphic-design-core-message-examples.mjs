import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f';
const background = '#e8e5dc';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (name) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, name))).toString('base64')}`;
const text = (id, x, y, value, size, weight = 400, message = false) =>
  `<text data-element="${id}"${message ? ' data-message="headline"' : ''} x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${ink}">${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;

const repair = (after) =>
  [
    text('brand', 65, 104, 'RIVER STREET / REPAIR CAFÉ', 22),
    text('headline-1', 65, 207, after ? 'Free repair' : 'Better', 64, 500, true),
    text('headline-2', 65, 284, after ? 'help, Saturday.' : 'together.', 64, 500, true),
    photo(31, 333, 548, 235),
    text('description-1', 65, 623, 'Free volunteer help with clothes, bikes', 24),
    text('description-2', 65, 657, 'and small electrical items.', 24),
    text('date', 65, 719, 'SAT 18 MAY · 10:00–13:00', 26),
    text('location', 65, 763, 'River Street Hall · No booking', 24),
    text('condition', 65, 807, 'Volunteer help · Repairs not guaranteed', 22),
  ].join('');

const coffee = (after) =>
  [
    text('brand', 125, 255, 'NORTH ROAST / COFFEE', 20),
    text('headline-1', 125, 340, after ? 'Decaf.' : 'Small batch.', 44, 500, true),
    text('headline-2', 125, 395, after ? 'Whole bean.' : 'Big character.', 44, 500, true),
    photo(112, 425, 386, 140),
    text('tasting-note', 125, 615, 'Chocolate & toasted nuts.', 20),
    text('roast-and-weight', 125, 649, 'Medium roast · 250 g', 20),
    text('classification', 125, 704, 'DECAFFEINATED · WHOLE BEAN', 18),
    text('url', 125, 740, 'northroast.example', 18),
  ].join('');

const library = (after) =>
  [
    text('brand', 65, 104, 'DIGITAL HELP / APRIL REVIEW', 22),
    text('headline-1', 65, 207, after ? '30% of visits' : 'Help desk', 46, 500, true),
    text('headline-2', 65, 284, after ? 'repeat an issue.' : 'in numbers.', 46, 500, true),
    photo(31, 320, 548, 210),
    text('total', 65, 622, '240', 62, 500),
    text('total-label', 65, 663, 'Total help-desk visits', 24),
    text('repeat', 65, 747, '72', 62, 500),
    text('repeat-label', 65, 788, 'Repeat visits for the same issue', 24),
    text('definition', 65, 830, 'Repeat = same issue, another visit.', 20),
  ].join('');

const specifications = [
  {
    name: 'core-message-repair-poster',
    photo: 'core-message-repair-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    title: 'Repair event: replace a broad theme with a particular invitation',
    description:
      'Before: Better / together. After: Free repair / help, Saturday. Only the two headline text nodes change. Sizes, styles, locations, photographs, practical details, paper and lighting remain identical.',
    before: 'BEFORE · A broad theme',
    after: 'AFTER · A particular invitation',
    draw: repair,
  },
  {
    name: 'core-message-coffee-package',
    photo: 'core-message-coffee-photo.jpg',
    stage: 'core-message-coffee-package-stage.jpg',
    title: 'Coffee package: prioritize the product distinction',
    description:
      'Before: Small batch. / Big character. After: Decaf. / Whole bean. Only headline wording changes. All product facts, photographs, crop, packaging, type sizes, weights, alignment and light are identical. Fictional teaching mockup, not a complete production label.',
    before: 'BEFORE · General brand promise',
    after: 'AFTER · Product identity',
    draw: coffee,
  },
  {
    name: 'core-message-library-report',
    photo: 'core-message-library-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    title: 'Service review: move from topic to supported finding',
    description:
      'Before: Help desk / in numbers. After: 30% of visits / repeat an issue. Only headline words change. The same 240 total visits, 72 repeat visits, definitions, photograph, sizes, layout and light remain. The invented counts describe visits, not people, and do not establish causes.',
    before: 'BEFORE · A topic label',
    after: 'AFTER · A bounded finding',
    draw: library,
  },
];

for (const s of specifications) {
  const stage = await embedded(s.stage);
  const picture = await embedded(s.photo);
  const defs = `<defs><image id="stage" width="610" height="915" href="${stage}"/><image id="photo" width="1536" height="1024" href="${picture}"/></defs>`;
  const metadata = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original Patternverse example with fictional content and generated photographic illustrations. Both variants reuse identical photographic image bytes. Only the headline text changes; styles and all other elements are fixed.</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const full = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="1320" height="1060" fill="${background}"/>${text('before-label', 62, 44, s.before, 24, 500)}${text('after-label', 712, 44, s.after, 24, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, 'Only headline words change. All photography, facts, type sizes and layout stay fixed.', 23)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="660" height="2070" fill="${background}"/>${text('before-label', 62, 44, s.before, 24, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 24, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Only headline words change.', 22)}</svg>`;
  await writeFile(resolve(assets, `${s.name}.svg`), `${full}\n`);
  await writeFile(resolve(assets, `${s.name}-mobile.svg`), `${mobile}\n`);
}

console.log('Built three message-only photographic comparisons and stacked mobile versions.');
