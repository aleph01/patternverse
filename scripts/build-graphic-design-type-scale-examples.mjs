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
const fontFile = resolve(
  root,
  'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2',
);
const fontStyle = `<style>@font-face{font-family:PVScaleSans;src:url(data:font/woff2;base64,${(await readFile(fontFile)).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const sizeText = (after, id, role, x, y, value, beforeSize, afterSize) =>
  text(id, x, y, value, after ? afterSize : beforeSize)
    .replace('Arial, Helvetica, sans-serif', 'PVScaleSans')
    .replace(
      '<text ',
      `<text data-role="${role}" font-optical-sizing="none"${beforeSize === afterSize ? '' : ' data-change="font-size"'} `,
    );
const programme = (after) =>
  [
    sizeText(after, 'brand', 'meta', 65, 104, 'YARD / WEEKEND PROGRAMME', 20, 20),
    photo('photograph', 'photo', 65, 160, 480, 220),
    sizeText(after, 'headline', 'title', 65, 435, 'Saturday sessions', 42, 40),
    sizeText(after, 'morning-title', 'section', 65, 503, 'Clay bowl', 30, 28),
    sizeText(after, 'morning-place', 'meta', 365, 503, 'Studio 1', 21, 20),
    sizeText(after, 'morning-time', 'body', 65, 544, '10:00–12:00', 23, 22),
    sizeText(after, 'morning-price', 'body', 365, 544, '€45 / person', 24, 22),
    sizeText(
      after,
      'morning-inclusion',
      'meta',
      65,
      582,
      'Clay, tools and firing included.',
      21,
      20,
    ),
    sizeText(after, 'afternoon-title', 'section', 65, 663, 'Print a tote', 26, 28),
    sizeText(after, 'afternoon-place', 'meta', 365, 663, 'Studio 2', 19, 20),
    sizeText(after, 'afternoon-time', 'body', 65, 704, '14:00–16:00', 21, 22),
    sizeText(after, 'afternoon-price', 'body', 365, 704, '€35 / person', 23, 22),
    sizeText(
      after,
      'afternoon-inclusion',
      'meta',
      65,
      742,
      'One tote and all inks included.',
      19,
      20,
    ),
    sizeText(after, 'footer', 'meta', 65, 820, '14 Nov · Book at yard.example/sessions', 20, 20),
  ].join('');
const report = (after) =>
  [
    sizeText(after, 'brand', 'meta', 65, 104, 'YARD / YEAR IN REVIEW', 20, 20),
    photo('photograph', 'photo', 65, 160, 480, 220),
    sizeText(after, 'headline', 'title', 65, 435, 'A year of making', 31, 40),
    sizeText(after, 'period', 'meta', 65, 478, 'Studio review · 2026', 20, 20),
    sizeText(after, 'workshops-title', 'section', 65, 535, 'Workshops', 30, 28),
    sizeText(
      after,
      'workshops-detail-1',
      'body',
      65,
      579,
      'Makers led 24 sessions this year.',
      22,
      22,
    ),
    sizeText(
      after,
      'workshops-detail-2',
      'body',
      65,
      613,
      'Beginners filled 180 workshop places.',
      22,
      22,
    ),
    sizeText(after, 'open-title', 'section', 65, 685, 'Open studios', 29, 28),
    sizeText(
      after,
      'open-detail-1',
      'body',
      65,
      729,
      'Six open days welcomed 420 visitors.',
      22,
      22,
    ),
    sizeText(
      after,
      'open-detail-2',
      'body',
      65,
      763,
      'Prints and pottery shared one space.',
      22,
      22,
    ),
    sizeText(after, 'footer', 'meta', 65, 820, 'yard.example/review · 03', 20, 20),
  ].join('');
const phone = (after) =>
  [
    '<rect data-element="screen" x="138" y="79" width="334" height="736" rx="42" fill="#fffdf6"/>',
    sizeText(after, 'brand', 'meta', 158, 132, 'COMMON / DAY PASSES', 20, 20),
    sizeText(after, 'headline', 'title', 158, 250, 'Book a day', 52, 36),
    sizeText(after, 'price', 'body', 158, 315, 'Day pass · €18', 22, 22),
    photo('photograph', 'photo', 158, 365, 294, 140),
    sizeText(after, 'included-title', 'section', 158, 550, 'What’s included', 30, 24),
    sizeText(after, 'included-body', 'body', 158, 592, 'Desk, Wi-Fi and coffee.', 22, 22),
    sizeText(after, 'hours', 'body', 158, 628, '09:00–18:00', 22, 22),
    '<rect data-element="button" x="158" y="666" width="294" height="52" rx="4" fill="none" stroke="#17352f" stroke-width="2"/>',
    sizeText(after, 'button-label', 'body', 182, 700, 'Choose a day →', 22, 22),
    sizeText(after, 'terms-line-1', 'meta', 158, 766, 'Cancellation until 18:00', 20, 20),
    sizeText(after, 'terms-line-2', 'meta', 158, 795, 'on the previous day.', 20, 20),
  ].join('');
const specs = [
  {
    name: 'type-scale-repeated-roles',
    photo: 'audience-pottery-photo.jpg',
    draw: programme,
    title: 'Programme: consolidate recurring roles into four size steps',
    before: 'BEFORE · Eight sizes drift by item',
    after: 'AFTER · Four sizes assigned by role',
    description:
      'Only eleven declared font-size attributes change. Eight distinct sizes become four role sizes: title40, section28, body22, meta20 in artwork layout units. Equivalent activity names, times/prices and metadata receive equal sizes. Exact copy, Source Sans 3 Regular font file and optical design, requested weight400, baselines, anchors, line breaks, alignment, image bytes/crop, colors, paper and lighting stay fixed. Fictional programme.',
    footer:
      'Only declared font sizes change. Copy, font, weight, baselines, photo/crop, paper and lighting stay fixed.',
  },
  {
    name: 'type-scale-distinct-levels',
    photo: 'form-open-studios-photo.jpg',
    draw: report,
    title: 'Review page: separate page and section levels with a reusable scale',
    before: 'BEFORE · Three headings nearly equal',
    after: 'AFTER · Page and section roles separate',
    description:
      'Only three font-size attributes change: page title31 to40, section headings30 and29 to28. Body22 and metadata20 are untouched. The same four-step print scale used in the programme becomes title40/section28/body22/meta20. Exact words, fixed embedded Source Sans 3 Regular, weight400, anchors/baselines, line breaks, photo bytes/crop, colors, paper and lighting remain identical. Fictional review and values.',
    footer:
      'Only three heading sizes change. Body copy, metadata, fonts, positions, imagery and presentation stay fixed.',
  },
  {
    name: 'type-scale-phone-roles',
    phone: true,
    photo: 'audience-workspace-photo.jpg',
    draw: phone,
    title: 'Phone page: adapt larger roles while retaining body and metadata sizes',
    before: 'BEFORE · A display-heavy role set',
    after: 'AFTER · A compact task-page scale',
    description:
      'Only two font-size attributes change: the title52 to36, and section heading30 to24. Body22 and metadata20 remain identical, including the button label and cancellation terms. These are artwork layout units, not CSS recommendations. Source Sans 3 Regular font/weight400 and optical design, text, fixed line breaks, baselines, anchors, alignment, photograph bytes/crop, button, screen, device and lighting remain fixed. Fictional static booking mockup, not an implemented interface.',
    footer:
      'Only title and section sizes change. Body/metadata, copy, anchors, font, image, device and lighting stay fixed.',
  },
];
const printStage = await embedded('scale-print-stage-v2.jpg');
const phoneStage = await embedded('audience-phone-stage.jpg');
for (const s of specs) {
  const stage = s.phone ? phoneStage : printStage;
  const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${stage}"/>${(await Promise.all(['photo', 'photo2', 'photo3', 'photo4'].filter((key) => s[key]).map(async (key) => `<image id="${key}" width="1536" height="1024" href="${await embedded(s[key])}"/>`))).join('')}</defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example. Selected generated photographs; separately authored print design. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${text('after-label', 712, 44, s.after, 23, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 21)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="660" height="2070" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 23, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three type-scale comparisons and their stacked versions.');
