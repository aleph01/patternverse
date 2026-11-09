import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f',
  panel = '#f4f1e8';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (name) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, name))).toString('base64')}`;
const text = (
  id,
  x,
  y,
  value,
  size = 22,
  weight = 400,
  fill = ink,
  family = 'Arial, Helvetica, sans-serif',
  extra = '',
) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const poster = (after) =>
  [
    text('brand', 65, 104, 'GARDEN CLUB / SUMMER TABLE', 22),
    text('headline-1', 65, 207, 'Garden', 54, 500),
    text('headline-2', 65, 284, 'evening.', 54, 500),
    photo(31, 333, 548, 200),
    `<rect data-element="details-panel" x="55" y="560" width="500" height="255" fill="${panel}"/>`,
    ...[
      ['date', 600, 'Fri 14 June · 18:00–20:00'],
      ['venue', 660, 'Greenhouse courtyard · 4 Park Lane'],
      ['cost', 720, '€12 per person · Book by 10 June'],
      ['booking', 780, 'gardenclub.example/supper'],
    ].map(([id, y, copy]) =>
      text(
        id,
        65,
        y,
        copy,
        22,
        400,
        after ? ink : '#929f96',
        undefined,
        ' data-intervention="text-paint"',
      ),
    ),
  ].join('');
const series = {
  morning: { label: 'Morning', color: '#3c6b5a', values: [12, 28, 24, 36] },
  evening: { label: 'Evening', color: '#597550', values: [28, 16, 32, 24] },
};
const chart = (after) =>
  [
    text('brand', 65, 104, 'YARD / SESSION BOOKINGS', 22),
    text('headline-1', 65, 207, 'Morning &', 44, 500),
    text('headline-2', 65, 284, 'evening.', 44, 500),
    photo(31, 333, 548, 150),
    `<rect data-element="chart-panel" x="45" y="490" width="520" height="355" fill="${panel}"/>`,
    text('units', 65, 514, 'Booked places · 2026', 18),
    ...Object.entries(series).map(([id, s], i) => {
      const marker = id === 'evening' ? ' data-intervention="series-pattern"' : '';
      const dash = id === 'evening' ? ` stroke-dasharray="${after ? '10 7' : 'none'}"` : '';
      const lx = 65 + i * 275;
      const line = s.values
        .map((v, j) => `${j ? 'L' : 'M'}${110 + j * 140} ${740 - v * 3.875}`)
        .join('');
      return `<g data-series="${id}" data-values="${s.values.join(',')}"><path data-element="${id}-legend" d="M${lx} 540H${lx + 48}" fill="none" stroke="${s.color}" stroke-width="4"${dash}${marker}/>${text(id + '-label', lx + 60, 547, s.label, 20)}<path data-element="${id}-line" d="${line}" fill="none" stroke="${s.color}" stroke-width="4"${dash}${marker}/></g>`;
    }),
    ...[0, 20, 40].map((v) => {
      const y = 740 - v * 3.875;
      return `<path d="M95 ${y}H530" fill="none" stroke="${ink}" stroke-opacity="0.16"/>${text('tick-' + v, v === 0 ? 65 : 53, y + 7, String(v), 18)}`;
    }),
    ...['Feb', 'Mar', 'Apr', 'May'].map((m, i) => text('month-' + i, 94 + i * 140, 780, m, 18)),
    text('morning-values', 65, 814, 'Morning · 12 / 28 / 24 / 36', 17),
    text('evening-values', 65, 841, 'Evening · 28 / 16 / 32 / 24', 17),
  ].join('');
const response = [
  '“A repaired jacket carries its',
  'history with it. The patch becomes',
  'part of the garment, not a flaw.”',
];
const interview = (after) =>
  [
    text('brand', 65, 104, 'YARD JOURNAL / CONVERSATIONS', 22),
    text('headline-1', 65, 207, 'Repairing', 44, 500),
    text('headline-2', 65, 284, 'the everyday.', 44, 500),
    photo(31, 333, 548, 200),
    text('question-role', 65, 570, 'QUESTION', 18, 500),
    text('question', 65, 605, 'Why repair an everyday jacket?', 22),
    text('response-role', 65, 652, 'MAKER’S RESPONSE', 18, 500),
    ...response.map((line, i) =>
      text(
        'response-' + i,
        65,
        695 + i * 31,
        line,
        22,
        400,
        ink,
        after ? 'Georgia, Times New Roman, serif' : 'Arial, Helvetica, sans-serif',
        ` font-style="${after ? 'italic' : 'normal'}" data-intervention="type-role"`,
      ),
    ),
    text('attribution', 65, 810, 'Sam Rivers · Fictional repair volunteer', 18),
  ].join('');
const specifications = [
  {
    name: 'contrast-evening-details',
    photo: 'chunk-garden-supper-photo.jpg',
    title: 'Invitation: distinguish practical text from its background',
    before: 'BEFORE · Pale practical details',
    after: 'AFTER · Darker practical details',
    draw: poster,
    description:
      'Only four practical text fills change from #929f96 to #17352f on the identical solid #f4f1e8 panel. Specified-color contrast changes from 2.44:1 to 11.72:1. All copy, font sizes/weights, anchors, baselines, panel, photographs/crops, paper, other colors and lighting remain fixed. Fictional print invitation; not a full accessibility assessment.',
    footer: 'Only four text fills change. Specified-color ratio: 2.44:1 → 11.72:1.',
  },
  {
    name: 'contrast-session-series',
    photo: 'audience-pottery-photo.jpg',
    title: 'Booking report: distinguish two peer series with line pattern',
    before: 'BEFORE · Similar hues only',
    after: 'AFTER · Solid and dashed',
    draw: chart,
    description:
      'Only the Evening plot stroke and matching legend sample gain a 10 7 dash pattern. Every data point, path position, stroke width, hue, value, label, font, gridline, photograph/crop, paper and lighting stays fixed. Two equal-status fictional booking series remain directly named in the legend and listed numerically beneath the chart.',
    footer: 'Only Evening and its legend sample gain dashes. Colors and data stay fixed.',
  },
  {
    name: 'contrast-interview-voices',
    photo: 'core-message-repair-photo.jpg',
    title: 'Editorial interview: distinguish two voices through type treatment',
    before: 'BEFORE · One type treatment',
    after: 'AFTER · Response in serif italic',
    draw: interview,
    description:
      'Only three response lines change font-family from Arial to Georgia and font-style from normal to italic. All words, role labels, attribution, sizes, weights, line breaks, baselines, anchors, colors, photograph/crop, paper and lighting remain identical. Original fictional interview, not a quotation from a real person.',
    footer: 'Only response family and style change. Sizes, words and line breaks stay fixed.',
  },
];
const stage = await embedded('scale-print-stage-v2.jpg');
for (const s of specifications) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${stage}"/><image id="photo" width="1536" height="1024" href="${await embedded(s.photo)}"/></defs>`;
  const metadata = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example; shared generated photographic artwork. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 24, 500)}${text('after-label', 712, 44, s.after, 24, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 22)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="660" height="2070" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 24, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 24, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three deliberate-contrast comparisons and stacked mobile variants.');
