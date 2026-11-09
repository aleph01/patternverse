import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const text = (id, x, y, value, size = 22, weight = 400, fill = ink) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}"${fill === null ? '' : ` fill="${fill}"`}>${escape(value)}</text>`;
const photo = (id, source, x, y, width, height, extra = '') =>
  `<svg data-element="${id}"${extra} x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#${source}"/></svg>`;
const fontsDirectory = resolve(root, 'docs/pattern-packages/graphic-design-typeface-fonts');
const fontFiles = {
  PVReadingDisplay: 'reading-display.woff2',
  PVReadingText: 'reading-text.woff2',
  PVGeometric: 'geometric.woff2',
  PVEvent: 'event.woff2',
  PVCode: 'code.woff2',
};
const fontStyle =
  '<style>' +
  (
    await Promise.all(
      Object.entries(fontFiles).map(
        async ([family, file]) =>
          `@font-face{font-family:${family};src:url(data:font/woff2;base64,${(await readFile(resolve(fontsDirectory, file))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}`,
      ),
    )
  ).join('') +
  '</style>';
const inheritedText = (...args) =>
  text(...args).replace(' font-family="Arial, Helvetica, sans-serif"', '');
const typeGroup = (after, beforeFamily, afterFamily, content) =>
  `<g data-element="selected-type" data-change="font-family" font-family="${after ? afterFamily : beforeFamily}" font-kerning="normal" font-optical-sizing="none">${content}</g>`;
const reading = (after) =>
  [
    text('brand', 65, 104, 'YARD / STUDIO JOURNAL'),
    photo('photograph', 'photo', 65, 160, 480, 220),
    text('headline', 65, 435, 'A day at the wheel', 38, 500),
    text('byline', 65, 478, 'Studio notes · November', 22),
    typeGroup(
      after,
      'PVReadingDisplay',
      'PVReadingText',
      [
        ['On Friday, the studio opens its doors.', 535],
        ['Visitors can meet the makers and see', 569],
        ['the bowls, cups and small objects on', 603],
        ['the benches where they were made.', 637],
        ['Every piece begins with a drawing.', 691],
        ['Some ideas become a finished object;', 725],
        ['others stay in the sketchbook until', 759],
        ['there is time to try them again.', 793],
      ]
        .map(([copy, y], i) => inheritedText('body-' + i, 65, y, copy, 24))
        .join(''),
    ),
    text('footer', 65, 830, 'yard.example/journal · 07', 20),
  ].join('');
const tone = (after) =>
  [
    text('brand', 65, 104, 'YARD / AT THE GARDEN TABLE'),
    photo('photograph', 'photo', 65, 160, 480, 350),
    typeGroup(
      after,
      'PVGeometric',
      'PVEvent',
      inheritedText('headline', 65, 584, 'Garden supper', 54),
    ),
    text('description', 65, 630, 'An evening around one shared table.', 22),
    text('date', 65, 687, 'Sat 21 Nov · 18:30', 24),
    text('offer', 65, 730, 'Three courses · €38 per person', 22),
    text('deadline', 65, 775, 'Book by 18 Nov', 22),
    text('footer', 65, 820, 'yard.example/garden-supper', 20),
  ].join('');
const code = (after) =>
  [
    text('brand', 65, 104, 'YARD / POTTERY COLLECTION'),
    photo('photograph', 'photo', 65, 160, 480, 230),
    text('headline', 65, 435, 'Your bowl is ready', 38, 500),
    text('intro', 65, 480, 'Show this reference at the desk.', 22),
    text('label', 65, 545, 'COLLECTION REFERENCE', 20),
    typeGroup(after, 'PVGeometric', 'PVCode', inheritedText('reference', 65, 618, 'Il1O0-27', 48)),
    text('date', 65, 677, 'Sat 28 Nov · 10:00–16:00', 24),
    text('place', 65, 722, 'Yard Studio · Collection desk', 22),
    text('retention', 65, 767, 'Keep this slip until collection.', 22),
    text('footer', 65, 820, 'yard.example/collection', 20),
  ].join('');
const specs = [
  {
    name: 'typeface-reading-cut',
    photo: 'audience-pottery-photo.jpg',
    draw: reading,
    title: 'Editorial copy: choose an optical design for text reading',
    before: 'BEFORE · Display cut in body copy',
    after: 'AFTER · Text cut in body copy',
    description:
      'Only the body-copy font-family changes between embedded Source Serif 4 static instances: weight 400 optical size 60 and weight 400 optical size 12. Nominal font size 24, line breaks, baselines, leading, copy, other typography, photo/crop, paper and lighting are fixed. Natural letter widths and stroke structure change with the optical design. Fictional journal.',
    footer:
      'Only the body’s optical cut changes. Nominal sizes, baselines, copy, imagery and presentation stay fixed.',
  },
  {
    name: 'typeface-event-tone',
    photo: 'chunk-garden-supper-photo.jpg',
    draw: tone,
    title: 'Supper invitation: choose a headline voice for the brief',
    before: 'BEFORE · A restrained geometric voice',
    after: 'AFTER · A softer expressive voice',
    description:
      'Only the headline font-family changes from Jost Regular to a Fraunces instance at weight 400, optical size 72, softness 50 and wonk 1. Nominal headline size 54, baseline, anchor, copy, tracking, other typography, photo/crop, colors, paper and lighting remain fixed. Apparent size, texture and width can change as inherent font characteristics. Fictional invitation; the tone judgment is editorial.',
    footer:
      'Only the headline face changes. Nominal size, baseline, words, photo/crop and presentation stay fixed.',
  },
  {
    name: 'typeface-reference-code',
    photo: 'audience-pottery-photo.jpg',
    draw: code,
    title: 'Collection reference: prioritize distinction between similar characters',
    before: 'BEFORE · A geometric code treatment',
    after: 'AFTER · More distinct code characters',
    description:
      'Only the reference font-family changes from Jost Regular to Atkinson Hyperlegible Mono Regular, both weight 400 at nominal font size 48. The exact reference Il1O0-27, baseline, anchor, surrounding copy, other typography, photo/crop, colors, paper and lighting remain fixed. The new character widths and identifying strokes are inherent to the selected face. Fictional collection slip.',
    footer:
      'Only the code face changes. Characters, nominal size, baseline, imagery and presentation stay fixed.',
  },
];
const stage = await embedded('scale-print-stage-v2.jpg');
for (const s of specs) {
  const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${stage}"/>${(await Promise.all(['photo', 'photo2', 'photo3', 'photo4'].filter((key) => s[key]).map(async (key) => `<image id="${key}" width="1536" height="1024" href="${await embedded(s[key])}"/>`))).join('')}</defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example. Selected generated photographs; separately authored print design. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${text('after-label', 712, 44, s.after, 23, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 21)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="660" height="2070" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 23, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three typeface-context comparisons and their stacked versions.');
