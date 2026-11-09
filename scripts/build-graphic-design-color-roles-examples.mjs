import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVRolesSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, fontFile))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#17352f',
  blue = '#225c91',
  terra = '#9e3e25',
  ready = '#dceadc',
  attention = '#f6e6b6';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, value, size = 22, fill = ink, changed = false, extra = '') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVRolesSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${fill}"${changed ? ' data-change="fill"' : ''} ${extra}>${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const image = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;

const actions = (after) =>
  [
    '<rect data-element="screen" x="138" y="79" width="334" height="736" rx="42" fill="#fffdf6"/>',
    text('brand', 158, 132, 'COMMON / BOOK A SPACE', 18),
    photo(158, 166, 294, 125),
    text('headline', 158, 337, 'Find a space', 34),
    text('desk-title', 158, 382, 'Day desk', 24),
    text('desk-price', 158, 418, '£18 · 09:00–18:00', 20, after ? ink : blue, true),
    '<rect data-element="desk-button" x="158" y="438" width="294" height="50" rx="4" fill="#225c91"/>',
    text('desk-button-label', 177, 471, 'Book a desk →', 22, '#fffdf6'),
    text('room-title', 158, 554, 'Meeting room', 24),
    text('room-price', 158, 590, '£24 / hour · Seats 4', 20),
    `<rect data-element="room-button" data-change="fill" x="158" y="610" width="294" height="50" rx="4" fill="${after ? blue : ink}"/>`,
    text('room-button-label', 177, 643, 'Reserve a room →', 22, '#fffdf6'),
    text('terms', 158, 754, 'Prices include Wi-Fi.', 20),
    text('footer', 158, 787, 'common.example/spaces', 18),
  ].join('');
const values = [
  [42, 28],
  [48, 36],
];
const report = (after) =>
  [
    text('brand', 65, 104, 'YARD / STUDIO REVIEW', 20),
    photo(65, 155, 480, 145),
    text('headline', 65, 359, 'Sessions by studio', 42),
    text('unit', 65, 400, 'Completed sessions · 2026', 22),
    ...['March', 'April']
      .map((month, panel) => {
        const y = panel ? 595 : 447;
        return (
          text('month-' + panel, 65, y, month, 24) +
          ['Riverside', 'Hill']
            .map((site, i) => {
              const barY = y + 18 + i * 44;
              const fill = panel === 1 && !after ? [terra, blue][i] : [blue, terra][i];
              return (
                text('site-' + panel + '-' + i, 65, barY + 21, site, 22) +
                `<rect data-element="bar-${panel}-${i}"${panel === 1 ? ' data-change="fill"' : ''} x="200" y="${barY}" width="${values[panel][i] * 6}" height="26" fill="${fill}"/>` +
                text(
                  'value-' + panel + '-' + i,
                  537,
                  barY + 21,
                  String(values[panel][i]),
                  22,
                  ink,
                  false,
                  'text-anchor="end"',
                )
              );
            })
            .join('') +
          `<path data-element="axis-${panel}" d="M200 ${y + 104}H500" fill="none" stroke="#17352f" stroke-opacity="0.3"/>` +
          text('zero-' + panel, 200, y + 129, '0', 18) +
          text('max-' + panel, 500, y + 129, '50 sessions', 18, ink, false, 'text-anchor="end"')
        );
      })
      .join(''),
    text('scale-note', 65, 768, 'Same unit and scale in both months.', 20),
    text('footer', 65, 820, 'yard.example/review · 04', 20),
  ].join('');
const orders = (after) =>
  [
    text('brand', 65, 104, 'FIELD / ORDER DESK', 20),
    photo(65, 155, 480, 170),
    text('headline', 65, 390, 'Orders to check', 44),
    text('order-1', 65, 437, 'F-2041 · 1 mug', 24),
    '<rect data-element="ready-background" x="65" y="454" width="350" height="40" rx="4" fill="#dceadc"/>',
    text('ready-label', 80, 482, '✓ Ready to dispatch', 22),
    text('order-2', 65, 552, 'F-2042 · 2 mugs', 24),
    `<rect data-element="payment-background" data-change="fill" x="65" y="569" width="350" height="40" rx="4" fill="${after ? attention : ready}"/>`,
    text('payment-label', 80, 597, '! Payment outstanding', 22),
    text('order-3', 65, 667, 'F-2043 · 1 bowl', 24),
    '<rect data-element="address-background" x="65" y="684" width="350" height="40" rx="4" fill="#f6e6b6"/>',
    text('address-label', 80, 712, '! Address missing', 22),
    text('footer', 65, 820, 'Staff summary · 19 November 2026', 20),
  ].join('');
const specs = [
  {
    name: 'color-roles-primary-actions',
    source: 'audience-workspace-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    phone: true,
    draw: actions,
    title: 'Booking page: keep blue attached to the booking action',
    beforeLabel: 'BEFORE · Blue price, mixed button colors',
    afterLabel: 'AFTER · Blue booking actions, green facts',
    description:
      'Only the desk-price text and room-button fill change. Blue is assigned to both booking actions; the price returns to dark green. The same two ordinary ink colors remain. Copy, font, sizes, positions, photography, device and lighting stay fixed.',
  },
  {
    name: 'color-roles-studio-report',
    source: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: report,
    title: 'Report: retain each studio’s color across months',
    beforeLabel: 'BEFORE · Site colors reverse in April',
    afterLabel: 'AFTER · Each site keeps its color',
    description:
      'Only two April bar fills swap: Riverside becomes blue and Hill terracotta, matching March. All four values, direct site labels, common scale, bar geometry, type and photography remain identical. Palette unchanged. Fictional data: March42/28, April48/36.',
  },
  {
    name: 'color-roles-order-status',
    source: 'explicit-tableware-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: orders,
    title: 'Order summary: assign attention color to every unresolved order',
    beforeLabel: 'BEFORE · Unpaid order has ready color',
    afterLabel: 'AFTER · Yellow marks both unresolved states',
    description:
      'Only the payment-outstanding badge background changes from existing pale green to existing pale yellow. Ready to dispatch remains green; Address missing remains yellow. All explicit words, symbols, positions, typography and photographic artwork stay fixed. Palette unchanged.',
  },
];
const records = [];
for (const s of specs) {
  const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await image(s.stage)}"/><image id="photo" width="1536" height="1024" href="${await image(s.source)}"/></defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)} Fictional example. Generated photographs reused unchanged. Typography and graphics composed separately.</desc>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const label = (x, y, value, size = 20) =>
    `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="${ink}">${escape(value)}</text>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group(false, 30, 70)}${group(true, 680, 70)}${label(60, 1030, 'Only role assignments change. Palette, copy, typography, geometry and photographic presentation stay fixed.')}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(60, 44, s.beforeLabel)}${group(false, 25, 70)}${label(60, 1064, s.afterLabel)}${group(true, 25, 1090)}${label(60, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
  records.push({
    name: s.name,
    source: s.source,
    stage: s.stage,
    phone: !!s.phone,
    dimensions: { wide: [1320, 1060], stacked: [660, 2070] },
    description: s.description,
    declaredFills: [false, true].map((after) =>
      Array.from(s.draw(after).matchAll(/<[^>]+data-change="fill"[^>]*>/g)).map(([tag]) => ({
        element: tag.match(/data-element="([^"]+)"/)[1],
        fill: tag.match(/\sfill="([^"]+)"/)[1],
      })),
    ),
  });
}

await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-color-roles-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Fill-only role reassignment within each unchanged palette. Copy, font, sizes, weights, positions, photographs/crops and print/device presentation remain fixed.',
      colors: { ink, blue, terra, ready, attention },
      values,
      roleMappings: {
        actions: { bookingAction: blue, ordinaryInformation: ink },
        studios: { Riverside: blue, Hill: terra },
        orders: { ready, needsAttention: attention },
      },
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log('Created three controlled pairs and their stacked views.');
