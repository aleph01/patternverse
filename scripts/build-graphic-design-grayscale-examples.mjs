import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVGrayscaleSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, fontFile))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const weights = [0.2126, 0.7152, 0.0722];
const luminance = (hex) =>
  [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((a, c, i) => a + c * weights[i], 0);
const contrast = (a, b) => {
  const ys = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (ys[0] + 0.05) / (ys[1] + 0.05);
};
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
const matchLuminance = (h, s, target) => {
  let low = 0,
    high = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    if (luminance(hsl(h, s, mid)) < target) low = mid;
    else high = mid;
  }
  return [hsl(h, s, low), hsl(h, s, high)].sort(
    (a, b) => Math.abs(luminance(a) - target) - Math.abs(luminance(b) - target),
  )[0];
};
const ink = '#2e4836',
  paper = '#fffdf6',
  detailBefore = '#9aaabd',
  detailAfter = '#334d6b';
const studioA = matchLuminance(210, 0.55, 0.12),
  studioB = matchLuminance(20, 0.55, luminance(studioA));
const link = matchLuminance(210, 0.65, luminance(ink));
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, copy, size = 22, fill = ink, extra = '') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVGrayscaleSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${fill}" ${extra}>${escape(copy)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const image = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const workshop = (after) =>
  [
    text('brand', 65, 104, 'YARD / EVENING WORKSHOPS', 20),
    photo(65, 155, 480, 250),
    text('headline', 65, 478, 'Clay after work', 48),
    `<rect data-element="details-panel" x="65" y="515" width="480" height="220" fill="${paper}"/>`,
    ...[
      'Wednesday 18 November · 18:30–20:30',
      '£28 · Clay, tools and firing included',
      'Beginners welcome · 12 places',
      'yard.example/clay',
    ].map((s, i) =>
      text(
        'detail-' + i,
        65,
        555 + i * 48,
        s,
        23,
        after ? detailAfter : detailBefore,
        'data-change="fill"',
      ),
    ),
    text('footer', 65, 820, 'Make a small bowl in one evening.', 20),
  ].join('');
const series = [
  [42, 56, 64],
  [38, 48, 60],
];
const chart = (after) =>
  [
    text('brand', 65, 104, 'YARD / STUDIO REVIEW', 20),
    photo(65, 155, 480, 190),
    text('headline', 65, 404, 'Studio bookings', 42),
    text('subtitle', 65, 441, 'Sessions booked · February–April 2026', 22),
    `<rect data-element="legend-a" x="65" y="469" width="16" height="16" fill="${studioA}"/>`,
    text('legend-a-label', 92, 484, 'Studio A', 20),
    `<rect data-element="legend-b" x="255" y="469" width="16" height="16" fill="${studioB}"/>`,
    text('legend-b-label', 282, 484, 'Studio B', 20),
    `<path data-element="baseline" d="M65 710H545" fill="none" stroke="${ink}" stroke-width="1"/>`,
    ...['Feb', 'Mar', 'Apr'].flatMap((month, i) => {
      const start = 82 + i * 160;
      return [0, 1]
        .flatMap((j) => {
          const value = series[j][i],
            x = start + j * 56,
            height = value * 2.7;
          return [
            `<rect data-element="bar-${j}-${i}" x="${x}" y="${710 - height}" width="42" height="${height}" fill="${j ? studioB : studioA}"/>`,
            text(
              'value-' + j + '-' + i,
              x + 21,
              698 - height,
              value,
              20,
              ink,
              'text-anchor="middle"',
            ),
            text(
              'studio-' + j + '-' + i,
              x + 21,
              740,
              j ? 'B' : 'A',
              20,
              ink,
              `text-anchor="middle" data-change="opacity" opacity="${after ? 1 : 0}"`,
            ),
          ];
        })
        .concat(text('month-' + i, start + 49, 779, month, 22, ink, 'text-anchor="middle"'));
    }),
    text('footer', 65, 820, 'Bookings, not unique visitors · yard.example/review', 20),
  ].join('');
const booking = (after) =>
  [
    `<rect data-element="screen" x="138" y="79" width="334" height="736" rx="42" fill="${paper}"/>`,
    text('brand', 158, 132, 'COMMON / DAY PASS', 18),
    photo(158, 166, 294, 125),
    text('headline', 158, 343, 'Your booking', 34),
    text('day-pass', 158, 393, 'Day pass · £18', 22),
    text('date', 158, 438, 'Thu 19 Nov ·', 20),
    text('change-date', 270, 438, 'Change date', 20, link),
    `<path data-element="link-underline" data-change="opacity" opacity="${after ? 1 : 0}" d="M270 443H369" fill="none" stroke="${link}" stroke-width="1.5"/>`,
    text('access', 158, 510, 'Access from 09:00 to 18:00.', 20),
    text('included', 158, 545, 'Wi-Fi and tea included.', 20),
    `<rect data-element="button" x="158" y="654" width="294" height="50" rx="4" fill="${ink}"/>`,
    text('button-label', 178, 687, 'Confirm booking →', 22, paper),
    text('total', 158, 760, 'Total today: £18', 22),
    text('footer', 158, 792, 'common.example/day-pass', 18),
  ].join('');
const specs = [
  {
    name: 'grayscale-workshop-details',
    source: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: workshop,
    title: 'Workshop invitation: grayscale reveals faint practical details',
    description:
      'Only four detail text fills darken. Typography, copy, geometry and photographs stay fixed. The grayscale original/revision use one identical linear-light luminance-weighted preview.',
  },
  {
    name: 'grayscale-studio-categories',
    source: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: chart,
    title: 'Studio report: retain colored bars and add direct category letters',
    description:
      'Only six A/B identifiers become visible below existing bars. Blue and orange bar fills, heights, numbers, legend, months, copy and photography stay fixed. Both hues have nearly identical relative luminance.',
  },
  {
    name: 'grayscale-booking-link',
    source: 'audience-workspace-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    phone: true,
    draw: booking,
    title: 'Booking review: an underline preserves a link cue without recoloring',
    description:
      'Only one underline becomes visible under Change date. Text, foreground colors, positions, photography and device stay fixed. Link and body colors have approximately matched relative luminance. Static fictional form.',
  },
];
const matrix = [...Array(3)].flatMap(() => [...weights, 0, 0]).concat([0, 0, 0, 1, 0]);
const records = [];
for (const s of specs) {
  const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await image(s.stage)}"/><image id="photo" width="1536" height="1024" href="${await image(s.source)}"/><filter id="grayscale-check" x="0" y="0" width="100%" height="100%" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${matrix.join(' ')}"/></filter></defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)} Color before/after above; corresponding grayscale checks below. Fictional examples, reused generated photographs.</desc>`;
  const group = (after, gray, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" data-view="${gray ? 'grayscale' : 'color'}" transform="translate(${x} ${y})"${gray ? ' filter="url(#grayscale-check)"' : ''}><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const label = (x, y, value) =>
    `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="20" fill="${ink}">${escape(value)}</text>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="2100" viewBox="0 0 1320 2100" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, 'BEFORE · Color original')}${label(712, 44, 'AFTER · Color revision')}${group(false, false, 30, 70)}${group(true, false, 680, 70)}${label(62, 1064, 'BEFORE · Fixed grayscale check')}${label(712, 1064, 'AFTER · Same grayscale check')}${group(false, true, 30, 1090)}${group(true, true, 680, 1090)}${label(60, 2050, 'Read color and grayscale together. Only the declared repair changes between before and after.')}${label(60, 2082, 'Fictional examples · Generated photographs · Grayscale is a diagnostic preview')}</svg>`;
  const order = [
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ];
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="4140" viewBox="0 0 660 4140" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${order.map(([after, gray], i) => label(60, 44 + i * 1020, `${after ? 'AFTER' : 'BEFORE'} · ${gray ? 'Fixed grayscale check' : 'Color design'}`) + group(after, gray, 25, 70 + i * 1020)).join('')}${label(60, 4115, 'Fictional example · Generated photographs')}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
  records.push({
    name: s.name,
    source: s.source,
    stage: s.stage,
    phone: !!s.phone,
    description: s.description,
    dimensions: { wide: [1320, 2100], stacked: [660, 4140] },
    declaredChanges: [false, true].map((after) =>
      Array.from(s.draw(after).matchAll(/<[^>]+data-change="(fill|opacity)"[^>]*>/g)).map(
        ([tag, attribute]) => ({
          element: tag.match(/data-element="([^"]+)"/)[1],
          attribute,
          value: tag.match(new RegExp('\\s' + attribute + '="([^"]+)"'))[1],
        }),
      ),
    ),
  });
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-grayscale-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Color originals and revisions plus matched grayscale checks. One fixed linearRGB matrix maps each linear-light channel to0.2126R+0.7152G+0.0722B without changing alpha. The same filter covers each complete artifact; it is not a color-vision simulation or print proof.',
      grayscale: { space: 'linearRGB', weights, matrix },
      colors: { ink, paper, detailBefore, detailAfter, studioA, studioB, link },
      luminances: Object.fromEntries(
        Object.entries({ ink, studioA, studioB, link }).map(([k, v]) => [k, luminance(v)]),
      ),
      contrastRatios: {
        detailsBefore: contrast(detailBefore, paper),
        detailsAfter: contrast(detailAfter, paper),
        linkBody: contrast(link, ink),
        linkSurface: contrast(link, paper),
      },
      studioBookings: { months: ['Feb', 'Mar', 'Apr'], A: series[0], B: series[1] },
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    studioA,
    studioB,
    link,
    detailsBefore: contrast(detailBefore, paper),
    detailsAfter: contrast(detailAfter, paper),
    linkBody: contrast(link, ink),
    linkSurface: contrast(link, paper),
  }),
);
