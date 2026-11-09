import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVValueSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, fontFile))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
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

const ink = hsl(140, 0.22, 0.23),
  paper = '#fffdf6';
const cinemaPanel = hsl(210, 0.25, 0.18),
  cinemaBefore = hsl(210, 0.25, 0.4),
  cinemaAfter = hsl(210, 0.25, 0.88);
const controlBefore = hsl(140, 0.15, 0.78),
  controlAfter = hsl(140, 0.15, 0.38);
const mastheadBefore = ink,
  mastheadAfter = hsl(140, 0.22, 0.9),
  mastheadTextBefore = hsl(140, 0.22, 0.96),
  mastheadTextAfter = ink;
const contrast = (a, b) => {
  const ys = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (ys[0] + 0.05) / (ys[1] + 0.05);
};
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, value, size = 22, fill = ink, changed = false, extra = '') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVValueSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${fill}"${changed ? ' data-change="fill"' : ''} ${extra}>${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const image = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;

const cinema = (after) =>
  [
    text('brand', 65, 104, 'YARD / AFTER DARK', 20),
    photo(65, 155, 480, 240),
    text('headline', 65, 466, 'Courtyard cinema', 46),
    `<rect data-element="details-panel" x="65" y="515" width="480" height="220" fill="${cinemaPanel}"/>`,
    ...[
      'A Quiet Street · 92 min',
      'Fri 20 Nov · Doors 18:30 · Film 19:00',
      'Courtyard seats · £8 · Book ahead',
      'yard.example/cinema',
    ].map((copy, i) =>
      text(
        'detail-' + i,
        85,
        560 + i * 43,
        copy,
        i === 0 ? 24 : 22,
        after ? cinemaAfter : cinemaBefore,
        true,
      ),
    ),
    text('footer', 65, 820, 'Outdoor screening · Bring a warm layer', 20),
  ].join('');
const checkbox = (after) =>
  [
    `<rect data-element="screen" x="138" y="79" width="334" height="736" rx="42" fill="${paper}"/>`,
    text('brand', 158, 132, 'COMMON / DAY PASS', 18),
    photo(158, 166, 294, 125),
    text('headline', 158, 343, 'Your booking', 34),
    text('day-pass', 158, 389, 'Day pass · £18', 22),
    text('date', 158, 427, 'Thursday 19 November', 22),
    text('section', 158, 490, 'Add to your booking', 24),
    `<rect data-element="guest-checkbox" data-change="stroke" x="158" y="528" width="24" height="24" fill="${paper}" stroke="${after ? controlAfter : controlBefore}" stroke-width="2"/>`,
    text('guest-label', 198, 548, 'Bring a guest · £8', 22),
    text('guest-detail', 198, 581, 'Guest name needed next.', 20),
    `<rect data-element="button" x="158" y="654" width="294" height="50" rx="4" fill="${ink}"/>`,
    text('button-label', 178, 687, 'Continue →', 22, paper),
    text('total', 158, 760, 'Total today: £18', 22),
    text('footer', 158, 792, 'Guest option is not selected.', 18),
  ].join('');
const report = (after) =>
  [
    `<rect data-element="masthead" data-change="fill" x="65" y="86" width="480" height="80" fill="${after ? mastheadAfter : mastheadBefore}"/>`,
    text(
      'masthead-label',
      85,
      135,
      'YARD / YEAR IN REVIEW',
      22,
      after ? mastheadTextAfter : mastheadTextBefore,
      true,
    ),
    photo(65, 205, 480, 220),
    text('headline', 65, 491, 'Room to make', 44),
    text('total', 65, 615, '238', 88),
    text('total-label', 65, 660, 'Workshop bookings', 28),
    text('monthly-values', 65, 711, 'Feb 42 · Mar 56 · Apr 64 · May 76', 22),
    text('scope', 65, 756, 'Total bookings, not unique visitors.', 20),
    text('footer', 65, 820, 'yard.example/review · 2026', 20),
  ].join('');
const specs = [
  {
    name: 'value-cinema-details',
    source: 'remove-courtyard-cinema-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: cinema,
    title: 'Cinema invitation: lighten necessary text against a fixed dark panel',
    beforeLabel: 'BEFORE · Mid-value text on dark blue',
    afterLabel: 'AFTER · Light text separates from the panel',
    description:
      'Only four practical text fills lighten at nominal HSL hue210/saturation25. Panel, words, fonts, sizes, geometry and photograph/crop stay fixed. Specified text/background ratios are recorded separately from any print or reader-performance claim.',
  },
  {
    name: 'value-guest-checkbox',
    source: 'audience-workspace-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    phone: true,
    draw: checkbox,
    title: 'Booking form: strengthen the outline that identifies an empty checkbox',
    beforeLabel: 'BEFORE · A faint empty checkbox boundary',
    afterLabel: 'AFTER · The same boundary is darker',
    description:
      'Only the checkbox stroke darkens at nominal HSL hue140/saturation15. Its 24-unit square, 2-unit stroke width, empty state, adjacent label, surface color, other controls, photo and phone stay fixed. Static fictional form, not an implemented interface.',
  },
  {
    name: 'value-report-masthead',
    source: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: report,
    title: 'Review page: reduce a large dark masthead field while preserving its readable label',
    beforeLabel: 'BEFORE · A large dark masthead field',
    afterLabel: 'AFTER · A lighter field, a readable label',
    description:
      'Only two fills change: masthead background lightens and its label switches from near-white to existing dark green. Text contrast remains strong. Main subject, 238 total, monthly counts42/56/64/76, fonts, sizes, positions and photograph stay fixed.',
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
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group(false, 30, 70)}${group(true, 680, 70)}${label(60, 1030, 'Only declared colors change. Copy, typography, geometry, imagery and photographic presentation stay fixed.')}</svg>`;
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
    declaredChanges: [false, true].map((after) =>
      Array.from(s.draw(after).matchAll(/<[^>]+data-change="(fill|stroke)"[^>]*>/g)).map(
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
  resolve(root, 'docs/pattern-packages/graphic-design-value-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Declared color-only changes isolate value contrast: four text lightness changes, one empty-checkbox stroke lightness change and a two-fill masthead treatment. Hue/saturation inputs stay fixed within each role; all geometry, typography and photographic sources remain identical.',
      colors: {
        ink,
        paper,
        cinemaPanel,
        cinemaBefore,
        cinemaAfter,
        controlBefore,
        controlAfter,
        mastheadBefore,
        mastheadAfter,
        mastheadTextBefore,
        mastheadTextAfter,
      },
      hslInputs: {
        cinemaPanel: [210, 0.25, 0.18],
        cinemaBefore: [210, 0.25, 0.4],
        cinemaAfter: [210, 0.25, 0.88],
        controlBefore: [140, 0.15, 0.78],
        controlAfter: [140, 0.15, 0.38],
        mastheadBefore: [140, 0.22, 0.23],
        mastheadAfter: [140, 0.22, 0.9],
        mastheadTextBefore: [140, 0.22, 0.96],
        mastheadTextAfter: [140, 0.22, 0.23],
      },
      contrastRatios: {
        cinemaBefore: contrast(cinemaBefore, cinemaPanel),
        cinemaAfter: contrast(cinemaAfter, cinemaPanel),
        controlBefore: contrast(controlBefore, paper),
        controlAfter: contrast(controlAfter, paper),
        mastheadBefore: contrast(mastheadTextBefore, mastheadBefore),
        mastheadAfter: contrast(mastheadTextAfter, mastheadAfter),
      },
      monthlyBookings: [42, 56, 64, 76],
      total: 238,
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    cinemaBefore: contrast(cinemaBefore, cinemaPanel),
    cinemaAfter: contrast(cinemaAfter, cinemaPanel),
    controlBefore: contrast(controlBefore, paper),
    controlAfter: contrast(controlAfter, paper),
    mastheadBefore: contrast(mastheadTextBefore, mastheadBefore),
    mastheadAfter: contrast(mastheadTextAfter, mastheadAfter),
  }),
);
