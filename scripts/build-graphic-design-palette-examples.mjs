import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVPaletteSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, fontFile))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#17352f',
  blue = '#225c91',
  terra = '#9e3e25';
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const luminance = (hex) =>
  rgb(hex)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
const hsl = (h, s, l) => {
  const a = s * Math.min(l, 1 - l);
  return (
    '#' +
    [0, 8, 4]
      .map((n) => {
        const k = (n + h / 30) % 12;
        return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
};
// Match relative luminance so these hue substitutions do not also repair faint text.
const sameLuminance = (hue, target) => {
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (luminance(hsl(hue, 0.44, mid)) < luminance(target)) lo = mid;
    else hi = mid;
  }
  return hsl(hue, 0.44, (lo + hi) / 2);
};
const darkHues = [210, 285, 65, 350].map((h) => sameLuminance(h, ink));
const barHues = [blue, ...[285, 15, 80].map((h) => sameLuminance(h, blue))];
const buttonBefore = sameLuminance(15, blue);
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, value, size = 22, fill = ink, changed = false, extra = '') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVPaletteSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${fill}"${changed ? ' data-change="fill"' : ''} ${extra}>${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const image = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const poster = (after) =>
  [
    text('brand', 65, 104, 'YARD / NOVEMBER PROGRAMME', 20),
    photo(65, 155, 480, 220),
    text('title-1', 65, 462, 'Open', 68, terra),
    text('title-2', 65, 535, 'studios', 68, terra),
    text(
      'invitation',
      65,
      605,
      'Meet the makers. See the process.',
      26,
      after ? ink : darkHues[0],
      true,
    ),
    text(
      'date',
      65,
      660,
      'Saturday 14 November · 11:00–17:00',
      22,
      after ? ink : darkHues[1],
      true,
    ),
    text(
      'entry',
      65,
      700,
      'Free entry · Demonstrations all day',
      22,
      after ? ink : darkHues[2],
      true,
    ),
    text('address', 65, 740, '18 Mill Lane · Riverside', 22, after ? ink : darkHues[3], true),
    text('footer', 65, 820, 'yard.example/open-studios', 20),
  ].join('');
const values = [42, 56, 48, 64],
  months = ['Feb', 'Mar', 'Apr', 'May'];
const report = (after) =>
  [
    text('brand', 65, 104, 'YARD / STUDIO REVIEW', 20),
    photo(65, 155, 480, 170),
    text('headline', 65, 401, 'Studio bookings', 48),
    text('scope', 65, 446, 'Monthly total · February–May 2026', 22),
    '<path data-element="chart-rules" d="M100 505H545M100 625H545M100 745H545" stroke="#17352f" stroke-opacity="0.18" fill="none"/>',
    ...[80, 40, 0].map((v, i) => text('tick-' + i, 65, 512 + i * 120, String(v), 18)),
    ...values.map(
      (v, i) =>
        `<rect data-element="bar-${i}" data-change="fill" x="${119 + i * 108}" y="${745 - v * 3}" width="64" height="${v * 3}" fill="${after ? blue : barHues[i]}"/>` +
        text(
          'value-' + i,
          151 + i * 108,
          733 - v * 3,
          String(v),
          22,
          ink,
          false,
          'text-anchor="middle"',
        ) +
        text('month-' + i, 151 + i * 108, 781, months[i], 22, ink, false, 'text-anchor="middle"'),
    ),
    text('footer', 65, 835, 'Bookings, not unique visitors · 03', 20),
  ].join('');
const phone = (after) =>
  [
    '<rect data-element="screen" x="138" y="79" width="334" height="736" rx="42" fill="#fffdf6"/>',
    text(
      'brand',
      158,
      132,
      'COMMON / YOUR BOOKINGS',
      18,
      after ? blue : sameLuminance(285, blue),
      true,
    ),
    photo(158, 166, 294, 125),
    text('headline', 158, 347, 'Your next visit', 34, after ? ink : darkHues[3], true),
    text('section', 158, 390, 'DAY PASS', 18, after ? ink : darkHues[2], true),
    text('booking-title', 158, 436, 'Thursday 19 November', 24, after ? ink : darkHues[0], true),
    '<rect data-element="confirmed-background" x="158" y="457" width="154" height="35" rx="4" fill="#dceadc"/>',
    text('confirmed-label', 171, 481, '✓ Confirmed', 20),
    text('hours', 158, 536, '09:00–18:00 · £18 paid', 22),
    '<rect data-element="warning-background" x="158" y="565" width="294" height="83" rx="4" fill="#f6e6b6"/>',
    text('warning-title', 171, 594, '! Action needed', 21),
    text('warning-detail', 171, 625, 'Add your guest’s name.', 20),
    `<rect data-element="button" data-change="fill" x="158" y="682" width="294" height="52" rx="4" fill="${after ? blue : buttonBefore}"/>`,
    text('button-label', 178, 716, 'Manage booking →', 22, '#fffdf6'),
    text('reference', 158, 785, 'Booking reference: CM-1842', 20),
  ].join('');
const specs = [
  {
    name: 'palette-open-studios',
    source: 'audience-pottery-photo.jpg',
    draw: poster,
    stage: 'scale-print-stage-v2.jpg',
    title: 'Poster: consolidate one-off text colors',
    beforeLabel: 'BEFORE · Six assigned ink colors',
    afterLabel: 'AFTER · Two inks, clear responsibilities',
    description:
      'Only four supporting text fills change to existing dark green. Title terracotta and all other design attributes stay fixed. Six assigned ink colors become two; photographs and paper colors are excluded from this count.',
  },
  {
    name: 'palette-monthly-report',
    source: 'form-open-studios-photo.jpg',
    draw: report,
    stage: 'scale-print-stage-v2.jpg',
    title: 'Report: one quantity does not need four bar hues',
    beforeLabel: 'BEFORE · A different hue for every month',
    afterLabel: 'AFTER · One hue for the same measure',
    description:
      'Only three of four bar fills change to the existing blue. Every value, bar position, height, width, label, axis and other element remains fixed. Four series-fill hues become one. Values are 42, 56, 48 and 64 bookings.',
  },
  {
    name: 'palette-booking-screen',
    source: 'audience-workspace-photo.jpg',
    draw: phone,
    stage: 'audience-phone-stage.jpg',
    phone: true,
    title: 'Booking page: reduce decorative colors and preserve state cues',
    beforeLabel: 'BEFORE · Ordinary UI colors multiply',
    afterLabel: 'AFTER · Brand colors plus useful states',
    description:
      'Only four ordinary text fills and the main button fill change. Dark green and blue form the ordinary UI ink set. Green Confirmed and yellow Action needed surfaces, their explicit labels, photo, content and device remain fixed. Static fictional interface mockup.',
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
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group(false, 30, 70)}${group(true, 680, 70)}${label(60, 1030, 'Only assigned fills change. Copy, geometry, imagery, crops and photographic presentation stay fixed.')}</svg>`;
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
const colorRecord = { ink, blue, terra, darkHues, barHues, buttonBefore };
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-palette-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Fill-only consolidation. Source images, typography and geometry fixed. Replacement hues approximately match relative luminance to keep the intervention distinct from repairing weak text/background contrast.',
      colors: colorRecord,
      luminances: Object.fromEntries(
        Object.entries(colorRecord).flatMap(([k, v]) =>
          Array.isArray(v)
            ? v.map((c, i) => [k + i, { hex: c, value: luminance(c) }])
            : [[k, { hex: v, value: luminance(v) }]],
        ),
      ),
      values,
      months,
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(colorRecord));
