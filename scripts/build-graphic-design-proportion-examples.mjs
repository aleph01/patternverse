import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f',
  panel = '#f1eee5';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const text = (id, x, y, value, size = 22, weight = 400, fill = ink) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}"${fill === null ? '' : ` fill="${fill}"`}>${escape(value)}</text>`;
const photo = (id, source, x, y, width, height, extra = '') =>
  `<svg data-element="${id}"${extra} x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#${source}"/></svg>`;
const guide = (after) =>
  [
    text('brand', 65, 104, 'YARD / WORKSHOP GUIDE'),
    text('headline', 65, 205, 'Start with clay.', 42, 500),
    photo('photograph', 'photo', 65, 250, 480, 210),
    '<rect data-element="instruction-panel" data-change="width" x="65" y="500" width="' +
      (after ? 304 : 228) +
      '" height="260" rx="4" fill="' +
      panel +
      '"/>',
    text('instruction-title', 77, 535, 'Your first bowl', 24, 500),
    '<g data-element="instruction-copy" data-change="line-wrap" transform="translate(77 575)" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="400" fill="' +
      ink +
      '">' +
      (after
        ? [
            'Press a thumb into the clay.',
            'Turn the bowl as you pinch the',
            'walls. Keep the rim even.',
            'Smooth with a damp sponge.',
            'Let it dry slowly.',
          ]
        : [
            'Press a thumb into the',
            'clay. Turn the bowl as',
            'you pinch the walls.',
            'Keep the rim even.',
            'Smooth with a damp',
            'sponge. Let it dry slowly.',
          ]
      )
        .map((s, i) => '<text x="0" y="' + i * 24 + '">' + escape(s) + '</text>')
        .join('') +
      '</g>',
    '<g data-element="facts-panel" data-change="transform" transform="translate(' +
      (after ? 393 : 317) +
      ' 500)"><rect data-element="facts-surface" data-change="width" width="' +
      (after ? 152 : 228) +
      '" height="260" rx="4" fill="' +
      panel +
      '"/>' +
      text('facts-title', 12, 35, 'Session', 22, 500) +
      text('facts-date', 12, 75, 'Sat 14 Nov', 18) +
      text('facts-duration', 12, 115, '2 hours', 18) +
      text('facts-level', 12, 155, 'Beginners', 18) +
      text('facts-price', 12, 195, '€45', 22, 500) +
      '</g>',
    text('url', 65, 820, 'yard.example/clay-bowl', 20),
  ].join('');
const poster = (after) =>
  [
    text('brand', 65, 104, 'CITY ARTS / NIGHT GARDEN', 20),
    text('headline', 65, 205, 'Night Garden', after ? 45 : 40, 500).replace(
      ' x=',
      ' data-change="font-size" x=',
    ),
    text('subhead', 65, 265, 'Art after hours', after ? 30 : 36, 500).replace(
      ' x=',
      ' data-change="font-size" x=',
    ),
    photo('photograph', 'photo', 65, 320, 480, 280),
    text('date', 65, 680, 'Sat 14 Nov · 18:00–23:00', 20),
    text('venue', 65, 720, 'Riverside Glasshouse', 20),
    text('price', 65, 760, 'Entry €12 · Students €8', 20),
    text('url', 65, 820, 'cityarts.example/nightgarden', 20),
  ].join('');
const editorial = (after) =>
  [
    text('brand', 65, 104, 'YARD / MATERIAL STUDIES'),
    photo('photograph', 'photo', 65, 160, 480, 250),
    ...[
      'Study 04 / Chalk-glazed stoneware',
      'Hand-built in the Yard studio.',
      'Natural variation is part of the finish.',
    ].map((s, i) =>
      text('caption-' + i, 65, 445 + i * (after ? 24 : 32), s, 16).replace(
        ' x=',
        i ? ' data-change="y" x=' : ' x=',
      ),
    ),
    text('headline', 65, 590, 'Working with variation', 30, 500),
    ...[
      'Clay records the pressure of a hand.',
      'A rim can stay slightly uneven and',
      'still hold its shape. Look for a wall',
      'that feels steady from base to lip.',
    ].map((s, i) =>
      text('body-' + i, 65, 640 + i * (after ? 30 : 24), s, 20).replace(
        ' x=',
        i ? ' data-change="y" x=' : ' x=',
      ),
    ),
    text('url', 65, 820, 'yard.example/material-studies', 20),
  ].join('');
const specs = [
  {
    name: 'proportion-workshop-guide',
    photo: 'audience-pottery-photo.jpg',
    draw: guide,
    title: 'Workshop guide: allocate width in relation to the content',
    before: 'BEFORE · Equal shares, unequal needs',
    after: 'AFTER · A two-to-one allocation',
    description:
      'The two panel widths change from 228:228 to 304:152, excluding the unchanged 24-unit gutter. The facts panel moves right by 76 units, and instruction text reflows in its wider panel. All words, fonts, sizes, weights, leading, image frame/crop, colors, paper and lighting remain fixed. This is space allocation, not a type-size change. Original fictional guide.',
    footer:
      'Only panel allocation, facts position and instruction wrapping change. All copy, type and imagery stay fixed.',
  },
  {
    name: 'proportion-night-garden',
    photo: 'scale-greenhouse-photo-v2.jpg',
    draw: poster,
    title: 'Event poster: relate three type sizes to a readable base',
    before: 'BEFORE · Nearly equal display sizes',
    after: 'AFTER · Related steps of one-and-a-half',
    description:
      'Only the title and subtitle font-size attributes change: 40 to 45 and 36 to 30 layout units. The 20-unit information text remains fixed, giving a 20, 30, 45 progression with adjacent ratio 1.5. Copy, line breaks, fonts, weights, baselines, alignment, image/crop, paper and lighting are identical. Original fictional event; no ratio-specific preference or performance result is claimed.',
    footer:
      'Only title and subtitle font sizes change. Copy, weights, anchors, image, crop, paper and lighting stay fixed.',
  },
  {
    name: 'proportion-material-study',
    photo: 'explicit-tableware-photo.jpg',
    draw: editorial,
    title: 'Material study: relate line spacing to type size',
    before: 'BEFORE · Two unrelated density choices',
    after: 'AFTER · Leading relates to type size',
    description:
      'Only later text baselines inside the caption and body blocks change. Caption type stays 16 with leading changing from 32 to 24; body stays 20 with leading changing from 24 to 30. Both revised baseline intervals are 1.5 times the type size. First baselines, every word, line break, type style, photograph/crop, paper and lighting remain fixed. Original fictional editorial example; the multiplier is contextual.',
    footer:
      'Only subsequent line baselines change. First baselines, font sizes, line breaks, image and styling stay fixed.',
  },
];
const stage = await embedded('scale-print-stage-v2.jpg');
for (const s of specs) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${stage}"/><image id="photo" width="1536" height="1024" href="${await embedded(s.photo)}"/>${s.photo2 ? `<image id="photo2" width="1536" height="1024" href="${await embedded(s.photo2)}"/>` : ''}</defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example. Selected generated photographs; separately authored print design. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${text('after-label', 712, 44, s.after, 23, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 21)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="660" height="2070" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 23, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three proportional-relationship comparisons and their stacked versions.');
