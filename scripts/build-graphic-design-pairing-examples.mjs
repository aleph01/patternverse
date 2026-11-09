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
const fontFiles = {
  PVReadingDisplay: 'docs/pattern-packages/graphic-design-typeface-fonts/reading-display.woff2',
  PVGeometric: 'docs/pattern-packages/graphic-design-typeface-fonts/geometric.woff2',
  PVEvent: 'docs/pattern-packages/graphic-design-typeface-fonts/event.woff2',
  PVPairingSans: 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2',
  PVPairingScript: 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-script.woff2',
};
const fontStyle =
  '<style>' +
  (
    await Promise.all(
      Object.entries(fontFiles).map(
        async ([family, file]) =>
          `@font-face{font-family:${family};src:url(data:font/woff2;base64,${(await readFile(resolve(root, file))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}`,
      ),
    )
  ).join('') +
  '</style>';
const inheritedText = (...args) =>
  text(...args).replace(' font-family="Arial, Helvetica, sans-serif"', '');
const fixedText = (family, ...args) =>
  text(...args).replace('Arial, Helvetica, sans-serif', family);
const typeGroup = (id, family, content, changed = false) =>
  `<g data-element="${id}"${changed ? ' data-change="font-family"' : ''} font-family="${family}" font-kerning="normal" font-optical-sizing="none">${content}</g>`;
const invitation = (after) =>
  [
    photo('photograph', 'photo', 65, 160, 480, 300),
    fixedText('PVEvent', 'headline', 65, 535, 'Open studio', 52),
    typeGroup(
      'supporting-type',
      after ? 'PVGeometric' : 'PVPairingScript',
      [
        inheritedText('brand', 65, 104, 'YARD / WINTER OPEN STUDIO'),
        inheritedText('description', 65, 584, 'Meet the makers behind the work.', 26),
        inheritedText('date', 65, 645, 'Sat 14 Nov · 10:00–17:00', 24),
        inheritedText('entry', 65, 690, 'Free entry · Yard Studio', 24),
        inheritedText('activities', 65, 735, 'Ceramics, prints and studio tours', 22),
        inheritedText('footer', 65, 820, 'yard.example/open-studio', 20),
      ].join(''),
      true,
    ),
  ].join('');
const journal = (after) =>
  [
    fixedText('PVPairingSans', 'brand', 65, 104, 'FIELD / NOTES ON EVERYDAY OBJECTS'),
    photo('photograph', 'photo', 65, 160, 480, 220),
    typeGroup(
      'headline-type',
      after ? 'PVReadingDisplay' : 'PVGeometric',
      inheritedText('headline', 65, 435, 'Objects for daily use', 40),
      true,
    ),
    fixedText('PVPairingSans', 'byline', 65, 478, 'Collection notes · November', 22),
    ...[
      ['These cups are made for the everyday:', 535],
      ['a morning coffee, a shared table,', 568],
      ['the quiet pause between two jobs.', 601],
      ['Each piece is shaped in small batches.', 655],
      ['You can see the whole collection in', 688],
      ['the studio, including bowls, plates', 721],
      ['and a changing selection of glazes.', 754],
    ].map(([copy, y], i) => fixedText('PVPairingSans', 'body-' + i, 65, y, copy, 24)),
    fixedText('PVPairingSans', 'footer', 65, 820, 'field.example/journal · 08', 20),
  ].join('');
const programme = (after) =>
  [
    fixedText('PVGeometric', 'brand', 65, 104, 'YARD / WEEKEND PROGRAMME'),
    photo('photograph', 'photo', 65, 160, 480, 220),
    fixedText('PVGeometric', 'headline', 65, 435, 'Saturday sessions', 38),
    fixedText('PVEvent', 'morning-title', 65, 503, 'Clay bowl', 30),
    fixedText('PVGeometric', 'morning-place', 365, 503, 'Studio 1', 22),
    fixedText('PVGeometric', 'morning-time', 65, 544, '10:00–12:00', 22),
    fixedText('PVGeometric', 'morning-price', 365, 544, '€45 / person', 20),
    fixedText('PVGeometric', 'morning-inclusion', 65, 582, 'Clay, tools and firing included.', 20),
    typeGroup(
      'afternoon-title-type',
      after ? 'PVEvent' : 'PVGeometric',
      inheritedText('afternoon-title', 65, 663, 'Print a tote', 30),
      true,
    ),
    typeGroup(
      'afternoon-details-type',
      after ? 'PVGeometric' : 'PVEvent',
      [
        inheritedText('afternoon-place', 365, 663, 'Studio 2', 22),
        inheritedText('afternoon-time', 65, 704, '14:00–16:00', 22),
        inheritedText('afternoon-price', 365, 704, '€35 / person', 20),
        inheritedText('afternoon-inclusion', 65, 742, 'One tote and all inks included.', 20),
      ].join(''),
      true,
    ),
    fixedText('PVGeometric', 'footer', 65, 820, '14 Nov · Book at yard.example/sessions', 20),
  ].join('');
const specs = [
  {
    name: 'pairing-supporting-voice',
    photo: 'form-open-studios-photo.jpg',
    draw: invitation,
    title: 'Invitation: give an expressive title a supporting partner',
    before: 'BEFORE · Two expressive display voices',
    after: 'AFTER · Display + supporting sans',
    description:
      'Only the supporting-text group font-family changes from Pacifico Regular to Jost Regular. The Fraunces headline remains fixed. The supporting group includes brand line, description, date, entry, activities and address, retaining all copy, nominal sizes, weights, baselines, anchors and tracking. Photo bytes/crop, colors, paper and lighting are identical. Fictional invitation; the cooperation judgment is editorial.',
    footer:
      'Only the supporting face changes. Title, copy, nominal sizes, baselines, photo/crop and presentation stay fixed.',
  },
  {
    name: 'pairing-distinct-roles',
    photo: 'explicit-tableware-photo.jpg',
    draw: journal,
    title: 'Journal: make the second face earn a distinct role',
    before: 'BEFORE · Two relatively similar sans faces',
    after: 'AFTER · Serif title + steady sans text',
    description:
      'Only the headline font-family changes from Jost Regular to Source Serif 4 Display at weight 400 optical size 60. All other text remains Source Sans 3 Regular. Nominal headline size 40, words, baseline, anchor, body line breaks, other sizes and weights, spacing, photo bytes/crop, colors, paper and lighting remain fixed. The Source families are documented companions; the choice remains contextual. Fictional editorial page.',
    footer:
      'Only the title face changes. Supporting text, words, sizes, positions, photograph and presentation stay fixed.',
  },
  {
    name: 'pairing-consistent-assignments',
    photo: 'audience-pottery-photo.jpg',
    draw: programme,
    title: 'Programme: keep the same two faces assigned to equivalent roles',
    before: 'BEFORE · The pair swaps jobs',
    after: 'AFTER · The pair keeps its jobs',
    description:
      'Only the second session title and details groups change font-family: its title switches Jost to Fraunces, its room/time/price/inclusion switch Fraunces to Jost. The first session is untouched. The same two fonts remain in use. Copy, requested weights, nominal sizes, line breaks, baselines, anchors, spacing, photo bytes/crop, colors, paper and lighting remain fixed. Fictional programme.',
    footer:
      'Only two font assignments change. The first session, copy, sizes, positions, imagery and presentation stay fixed.',
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
console.log('Built three typeface-pairing comparisons and their stacked versions.');
