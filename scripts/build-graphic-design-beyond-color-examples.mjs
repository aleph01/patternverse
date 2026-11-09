import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fontFile = 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2';
const fontStyle = `<style>@font-face{font-family:PVBeyondColorSans;src:url(data:font/woff2;base64,${(await readFile(resolve(root, fontFile))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}</style>`;
const ink = '#2e4836',
  paper = '#fffdf6',
  green = '#2f6f52',
  amber = '#946016',
  red = '#9d3f3d',
  blue = '#2d649a',
  orange = '#954e2b';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (id, x, y, copy, size = 22, fill = ink, extra = '') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="PVBeyondColorSans" font-size="${size}" font-weight="400" font-kerning="normal" font-optical-sizing="none" fill="${fill}" ${extra}>${escape(copy)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const image = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const sessions = [
  {
    title: 'Handbuilding',
    detail: 'Wed 18 Nov · 18:30 · Capacity 12',
    status: 'Open',
    color: green,
  },
  {
    title: 'Wheel basics',
    detail: 'Thu 19 Nov · 18:30 · Capacity 6',
    status: 'Waitlist',
    color: amber,
  },
  { title: 'Glazing', detail: 'Sat 21 Nov · 10:00 · Capacity 10', status: 'Full', color: red },
];
const schedule = (after) =>
  [
    text('brand', 65, 104, 'YARD / CLAY WORKSHOPS', 20),
    photo(65, 155, 480, 170),
    text('headline', 65, 388, 'Find your session', 44),
    ...sessions.flatMap((s, i) => {
      const x = 75 + i * 160;
      return [
        `<circle data-element="legend-dot-${i}" cx="${x}" cy="430" r="7" fill="${s.color}"/>`,
        text('legend-label-' + i, x + 18, 437, s.status, 20),
      ];
    }),
    ...sessions.flatMap((s, i) => {
      const y = 501 + i * 112;
      return [
        text('session-' + i, 65, y, s.title, 28),
        text('details-' + i, 65, y + 38, s.detail, 21),
        `<circle data-element="status-dot-${i}" cx="433" cy="${y - 8}" r="8" fill="${s.color}"/>`,
        text(
          'status-label-' + i,
          451,
          y,
          s.status,
          20,
          ink,
          `data-change="opacity" opacity="${after ? 1 : 0}"`,
        ),
        `<path data-element="row-rule-${i}" d="M65 ${y + 63}H545" fill="none" stroke="#c5c9c3" stroke-width="1"/>`,
      ];
    }),
    text('footer', 65, 844, 'Times and booking at yard.example/clay', 20),
  ].join('');
const months = ['Feb', 'Mar', 'Apr', 'May'],
  actual = [42, 56, 64, 76],
  plan = [50, 58, 66, 74];
const points = (values) =>
  values.map((v, i) => `${110 + i * 130} ${730 - (v - 40) * 4.2}`).join('L');
const report = (after) =>
  [
    text('brand', 65, 104, 'YARD / ACTIVITY REVIEW', 20),
    photo(65, 155, 480, 170),
    text('headline', 65, 391, 'Workshop bookings', 40),
    text('subtitle', 65, 431, 'Actual and plan · Sessions · 2026', 22),
    `<path data-element="actual-key" d="M65 473H109" stroke="${blue}" stroke-width="3" fill="none"/>`,
    text('actual-key-label', 120, 480, 'Actual', 20),
    `<path data-element="plan-key" data-change="stroke-dasharray" d="M280 473H324" stroke="${orange}" stroke-width="3" stroke-dasharray="${after ? '10 7' : 'none'}" fill="none"/>`,
    text('plan-key-label', 335, 480, 'Plan', 20),
    ...[40, 60, 80].flatMap((v) => {
      const y = 730 - (v - 40) * 4.2;
      return [
        `<path data-element="grid-${v}" d="M110 ${y}H500" fill="none" stroke="#c5c9c3" stroke-width="1"/>`,
        text('axis-' + v, 93, y + 7, v, 18, ink, 'text-anchor="end"'),
      ];
    }),
    `<path data-element="actual-line" d="M${points(actual)}" fill="none" stroke="${blue}" stroke-width="3" stroke-linejoin="round"/>`,
    `<path data-element="plan-line" data-change="stroke-dasharray" d="M${points(plan)}" fill="none" stroke="${orange}" stroke-width="3" stroke-linejoin="round" stroke-dasharray="${after ? '10 7' : 'none'}"/>`,
    ...months.map((m, i) =>
      text('month-' + i, 110 + i * 130, 770, m, 21, ink, 'text-anchor="middle"'),
    ),
    text('actual-values', 65, 812, 'Actual 42 · 56 · 64 · 76', 20),
    text('plan-values', 65, 842, 'Plan 50 · 58 · 66 · 74', 20),
  ].join('');
const form = (after) =>
  [
    `<rect data-element="screen" x="138" y="79" width="334" height="736" rx="42" fill="${paper}"/>`,
    text('brand', 158, 132, 'COMMON / DAY PASS', 18),
    photo(158, 166, 294, 110),
    text('headline', 158, 326, 'Your details', 34),
    text('notice', 158, 368, 'Check your details', 22, red),
    text('name-label', 158, 412, 'Name', 20),
    `<rect data-element="name-input" x="158" y="430" width="294" height="44" rx="3" fill="${paper}" stroke="${ink}" stroke-width="1.5"/>`,
    text('name-value', 174, 459, 'Alex Morgan', 20),
    text('email-label', 158, 516, 'Email address', 20),
    `<rect data-element="email-input" x="158" y="535" width="294" height="44" rx="3" fill="${paper}" stroke="${red}" stroke-width="2"/>`,
    text(
      'error-description',
      158,
      614,
      'Email address is missing.',
      20,
      red,
      `data-change="opacity" opacity="${after ? 1 : 0}"`,
    ),
    text(
      'error-instruction',
      158,
      644,
      'Enter it to receive your pass.',
      20,
      ink,
      `data-change="opacity" opacity="${after ? 1 : 0}"`,
    ),
    `<rect data-element="button" x="158" y="706" width="294" height="50" rx="4" fill="${ink}"/>`,
    text('button-label', 178, 739, 'Continue →', 22, paper),
    text('footer', 158, 792, 'Day pass · £18', 18),
  ].join('');
const specs = [
  {
    name: 'beyond-color-session-status',
    source: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: schedule,
    title: 'Workshop availability: add status words at the point of use',
    beforeLabel: 'BEFORE · Dots require matching a color key',
    afterLabel: 'AFTER · Each session names its status',
    description:
      'Only three local status labels become visible. Existing colored dots, legend, dates, times, capacities, fonts, geometry and photograph remain fixed. Open, Waitlist and Full name the status without hue matching.',
  },
  {
    name: 'beyond-color-actual-plan',
    source: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    draw: report,
    title: 'Activity report: reinforce planned bookings with a matching dash pattern',
    beforeLabel: 'BEFORE · Two solid lines differ by hue',
    afterLabel: 'AFTER · Plan is dashed in chart and key',
    description:
      'Only two stroke-dasharray attributes change: the Plan series and its legend sample. All colors, stroke widths, path geometry, axes, months, values and photograph remain fixed. Actual stays solid and Plan becomes dashed.',
  },
  {
    name: 'beyond-color-email-error',
    source: 'audience-workspace-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    phone: true,
    draw: form,
    title: 'Booking form: name an empty-field error and explain the repair',
    beforeLabel: 'BEFORE · Red identifies the problem field',
    afterLabel: 'AFTER · Nearby words explain what is wrong',
    description:
      'Only two inline error lines become visible. Email remains empty and retains its red outline; generic notice, name, input geometry, button, price, photo and phone remain fixed. Fictional static form, not an implemented accessible interface.',
  },
];
const records = [];
for (const s of specs) {
  const defs = `<defs>${fontStyle}<image id="stage" width="610" height="915" href="${await image(s.stage)}"/><image id="photo" width="1536" height="1024" href="${await image(s.source)}"/></defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)} Fictional example. Generated photographs reused unchanged; typography composed separately.</desc>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const label = (x, y, value, size = 20) =>
    `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="${ink}">${escape(value)}</text>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 44, s.beforeLabel)}${label(712, 44, s.afterLabel)}${group(false, 30, 70)}${group(true, 680, 70)}${label(60, 1030, 'Keep the palette. Only declared labels or line patterns change; other content and presentation stay fixed.')}</svg>`;
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
      Array.from(
        s.draw(after).matchAll(/<[^>]+data-change="(opacity|stroke-dasharray)"[^>]*>/g),
      ).map(([tag, attribute]) => ({
        element: tag.match(/data-element="([^"]+)"/)[1],
        attribute,
        value: tag.match(new RegExp('\\s' + attribute + '="([^"]+)"'))[1],
      })),
    ),
  });
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-beyond-color-layouts.json'),
  JSON.stringify(
    {
      font: fontFile,
      method:
        'Three controlled comparisons retain color coding and add an independent visible carrier. Only local status labels, Plan line/key dash patterns or inline error text change. Existing typography, copy, geometry and photo sources remain fixed.',
      colors: { ink, paper, green, amber, red, blue, orange },
      sessions,
      chart: {
        months,
        actual,
        plan,
        axisMinimum: 40,
        axisMaximum: 80,
        scale: 4.2,
        baseline: 730,
        x: [110, 240, 370, 500],
        afterDash: '10 7',
      },
      form: {
        name: 'Alex Morgan',
        email: '',
        price: 18,
        errorDescription: 'Email address is missing.',
        errorInstruction: 'Enter it to receive your pass.',
      },
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log('Built three palette-preserving comparisons and three stacked views.');
