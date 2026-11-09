import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design');
const fixtures = JSON.parse(
  await readFile(
    resolve(root, 'docs/pattern-packages/graphic-design-template-fixtures.json'),
    'utf8',
  ),
);
const ink = '#17352f',
  paper = '#fffdf6';
const fonts = {
  PVTemplateBody: 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2',
  PVTemplateTitle: 'docs/pattern-packages/graphic-design-typeface-fonts/reading-display.woff2',
};
const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const fontStyle =
  '<style>' +
  (
    await Promise.all(
      Object.entries(fonts).map(
        async ([name, file]) =>
          `@font-face{font-family:${name};src:url(data:font/woff2;base64,${(await readFile(resolve(root, file))).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}`,
      ),
    )
  ).join('') +
  '</style>';
const type = (id, x, y, value, size = 22, title = false) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="${title ? 'PVTemplateTitle' : 'PVTemplateBody'}" font-size="${size}" font-weight="400" fill="${ink}" font-kerning="normal" font-optical-sizing="none">${esc(value)}</text>`;
const change = (attr, enabled) => (enabled ? ` data-change="${attr}"` : '');
const surface = (id, h, changed = false) =>
  `<rect data-element="${id}-shadow"${change('height', changed)} x="34" y="15" width="548" height="${h - 24}" fill="#d8d4ca"/><rect data-element="surface"${change('height', changed)} x="31" y="12" width="548" height="${h - 24}" fill="${paper}" stroke="#d2cec4"/>`;
const photo = (id, ref, x, y, w, h) =>
  `<svg data-element="${id}-window" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use data-element="${id}" href="#${ref}"/></svg>`;
const cue = (id) =>
  `<path data-element="${id}-signature" transform="translate(511 42) scale(.5)" fill="${ink}" d="M4 4H40V16H16V40H4Z M60 60H24V48H48V24H60Z"/>`;
export function validateFixture(kind, f) {
  if (
    kind === 'notice' &&
    (!Array.isArray(f.titleLines) ||
      f.titleLines.length < 1 ||
      f.titleLines.length > 3 ||
      f.titleLines.some((s) => !s.trim()))
  )
    throw new Error('Notice title requires one to three approved lines; review other inputs.');
  if (kind === 'offer' && f.kind === 'reduced' && !f.conditionLines?.length)
    throw new Error('Reduced offer requires supplied eligibility text.');
  if (
    kind === 'offer' &&
    (f.conditionLines?.length > 2 || f.conditionLines?.some((s) => !s.trim()))
  )
    throw new Error('Offer conditions require review.');
  if (
    kind === 'review' &&
    (!f.workshops ||
      !f.places ||
      !f.reference ||
      !f.noteLines?.length ||
      f.noteLines.length > 3 ||
      f.noteLines.some((s) => !s.trim()))
  )
    throw new Error('Review requires current data, reference and one to three note lines.');
}
function notice(f, after) {
  validateFixture('notice', f);
  const expanded = f.titleLines.length > 2,
    delta = after ? Math.max(0, f.titleLines.length - 2) * 44 : 0;
  return (
    surface(f.id, 720) +
    type(f.id + '-brand', 65, 63, 'COMMON / MAKING TOGETHER', 20) +
    cue(f.id) +
    `<svg data-element="${f.id}-title-window"${change('height', expanded)} x="65" y="94" width="480" height="${88 + delta}" overflow="hidden">${f.titleLines.map((line, i) => type(f.id + '-title-' + i, 0, 34 + i * 44, line, 38, true)).join('')}</svg>` +
    `<g data-element="${f.id}-flow"${change('transform', expanded)} transform="translate(0 ${delta})">` +
    photo(f.id + '-photo', 'clay', 65, 192, 480, 240) +
    type(f.id + '-date', 65, 478, f.date, 24) +
    type(f.id + '-price', 65, 520, f.price, 24) +
    type(f.id + '-venue', 65, 562, f.venue, 22) +
    type(f.id + '-url', 65, 641, f.url, 20) +
    '</g>'
  );
}
function offer(f, after) {
  validateFixture('offer', f);
  const conditional = f.conditionLines.length > 0;
  return (
    surface(f.id, 480) +
    type(f.id + '-brand', 65, 63, 'COMMON / MAKING TOGETHER', 20) +
    cue(f.id) +
    type(f.id + '-title', 65, 123, 'Clay bowl', 38, true) +
    photo(f.id + '-photo', 'clay', 65, 156, 180, 120) +
    type(f.id + '-date', 270, 184, 'Sat 14 Nov', 24) +
    type(f.id + '-time', 270, 224, '10:00–12:00', 22) +
    type(f.id + '-price', 65, 324, f.price, 28) +
    `<g data-element="${f.id}-conditions"${change('transform', conditional)} transform="translate(0 ${after && conditional ? -72 : 0})">${f.conditionLines.map((line, i) => type(f.id + '-condition-' + i, 65, 434 + i * 22, line, 20)).join('')}</g>` +
    `<g data-element="${f.id}-action"${change('transform', conditional)} transform="translate(0 ${after && conditional ? 72 : 0})">${type(f.id + '-url', 65, 365, 'Book · common.example/clay', 20)}</g>`
  );
}
function review(f, after) {
  validateFixture('review', f);
  const absent = !f.image,
    delta = after && absent ? -220 : 0,
    extended = f.noteLines.length > 1;
  return (
    surface(f.id, 650 + delta, absent) +
    type(f.id + '-brand', 65, 63, 'COMMON / STUDIO REVIEW', 20) +
    cue(f.id) +
    type(f.id + '-title', 65, 126, f.title, 38, true) +
    `<g data-element="${f.id}-image"${change('opacity', absent)} opacity="${after && absent ? 0 : 1}">${photo(f.id + '-photo', f.image || 'studio', 65, 156, 480, 200)}</g>` +
    `<g data-element="${f.id}-flow"${change('transform', absent)} transform="translate(0 ${delta})">${type(f.id + '-workshop-label', 65, 415, 'Workshops held', 24)}${type(f.id + '-workshop-value', 420, 415, f.workshops, 28)}${type(f.id + '-places-label', 65, 458, 'Places filled', 24)}${type(f.id + '-places-value', 420, 458, f.places, 28)}<svg data-element="${f.id}-note-window"${change('height', extended)} x="63" y="489" width="482" height="${after && extended ? 94 : 34}" overflow="hidden">${f.noteLines.map((line, i) => type(f.id + '-note-' + i, 2, 24 + i * 28, line, 22)).join('')}</svg>${type(f.id + '-reference', 65, 610, f.reference, 20)}</g>`
  );
}
const specs = [
  {
    name: 'template-variable-titles',
    title: 'A notice template accommodates short and long titles',
    before: 'BEFORE · A copied two-line title frame',
    after: 'AFTER · Defined title capacity + flow',
    description:
      'The short-title notice remains unchanged. In the long-title notice only the title viewport height and the image/details group translation change. All supplied words, font families, sizes, weights, local title baselines, image bytes/crop, colors and paper remain fixed. The before viewport clips the third line; after reveals it and moves subsequent content 44 units. Approved input line breaks are supplied; this is not an automatic line-breaking engine.',
    sources: [['clay', 'audience-pottery-photo.jpg']],
    artifacts: fixtures.notices.map((f) => ({ ...f, height: 720 })),
    draw: notice,
    masks: { 'short-notice': [], 'long-notice': [[60, 180, 490, 515]] },
  },
  {
    name: 'template-conditional-offers',
    title: 'A conditional offer keeps eligibility next to its price',
    before: 'BEFORE · A condition falls to the foot',
    after: 'AFTER · A required condition joins the price',
    description:
      'The standard-price notice remains unchanged. In the reduced-price notice only the supplied condition group and booking-address group translations change. Price, condition wording, date, photograph/crop, type, sizes, colors and surface remain fixed. The reduced-price input requires actual supplied eligibility; the template does not infer or invent it.',
    sources: [['clay', 'audience-pottery-photo.jpg']],
    artifacts: fixtures.offers.map((f) => ({ ...f, height: 480 })),
    draw: offer,
    masks: { 'standard-offer': [], 'reduced-offer': [[60, 339, 490, 125]] },
  },
  {
    name: 'template-missing-image-and-notes',
    title: 'A recurring review handles an absent image and a longer data note',
    before: 'BEFORE · Last month’s image + clipped note',
    after: 'AFTER · Explicit image-absent variant',
    description:
      'The October review remains unchanged. November has no supplied photograph: before shows an inherited October image, after hides it, moves the data/note/reference group up 220 units and reduces both card-surface heights by 220 units. Its note viewport grows from one to three lines. All current values and note words, fonts, sizes, anchors within groups and colors remain fixed; October photographic bytes/crop are unchanged. No new image or data is invented. Paper/card height changes are required by this auto-height digital-card variant.',
    sources: [['studio', 'form-open-studios-photo.jpg']],
    artifacts: fixtures.reviews.map((f) => ({
      ...f,
      height: 650,
      afterHeight: f.image ? 650 : 430,
    })),
    draw: review,
    masks: { 'october-review': [], 'november-review': [[30, 150, 555, 492]] },
  },
];
const records = [];
for (const s of specs) {
  const defs = `<defs>${fontStyle}${(await Promise.all(s.sources.map(async ([id, file]) => `<image id="${id}" width="1536" height="1024" href="data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}"/>`))).join('')}</defs>`;
  const label = (x, y, v) =>
    `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="20" fill="${ink}">${esc(v)}</text>`;
  const art = (f, a, x, y) =>
    `<g data-artifact="${f.id}" transform="translate(${x} ${y})">${s.draw(f, a)}</g>`;
  let wy = 102,
    my = 100;
  const wp = [],
    mp = [];
  for (const f of s.artifacts) {
    wp.push({ y: wy, labelY: wy - 10 });
    mp.push({ beforeY: my, afterY: my + f.height + 58 });
    wy += f.height + 64;
    my += f.height + (f.afterHeight ?? f.height) + 154;
  }
  const wh = wy + 20,
    mh = my + 10;
  const meta = `<title id="title">${esc(s.title)}</title><desc id="description">${esc(s.description)} Original fictional Common programme. Existing AI-generated photographs; native typography and layout composed separately.</desc>`;
  const wrap = (v, c) => `<g data-variant="${v}">${c}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="${wh}" viewBox="0 0 1320 ${wh}" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${label(62, 40, s.before)}${label(712, 40, s.after)}${wp.map((p, i) => label(62, p.labelY, s.artifacts[i].label) + label(712, p.labelY, s.artifacts[i].label)).join('')}${wrap('before', wp.map((p, i) => art(s.artifacts[i], false, 30, p.y)).join(''))}${wrap('after', wp.map((p, i) => art(s.artifacts[i], true, 680, p.y)).join(''))}${label(60, wh - 16, 'Fictional content · One reusable rule set per example.')}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="${mh}" viewBox="0 0 660 ${mh}" role="img" aria-labelledby="title description">${meta}${defs}<rect width="100%" height="100%" fill="#e8e5dc"/>${mp.map((p, i) => label(60, p.beforeY - 20, 'BEFORE · ' + s.artifacts[i].label) + label(60, p.afterY - 20, 'AFTER · ' + s.artifacts[i].label)).join('')}${wrap('before', mp.map((p, i) => art(s.artifacts[i], false, 25, p.beforeY)).join(''))}${wrap('after', mp.map((p, i) => art(s.artifacts[i], true, 25, p.afterY)).join(''))}${label(60, mh - 16, 'Fictional programme · Before/after paired by input')}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
  records.push({
    name: s.name,
    title: s.title,
    description: s.description,
    sources: s.sources.map(([id, file]) => ({ id, file, width: 1536, height: 1024 })),
    dimensions: { wide: [1320, wh], stacked: [660, mh] },
    artifacts: s.artifacts.map((f) => ({
      id: f.id,
      label: f.label,
      width: 610,
      height: f.height,
      afterHeight: f.afterHeight ?? f.height,
      masks: s.masks[f.id],
    })),
    presentation:
      'Wide: before set beside after set. Narrow: before/after interleaved by input. Native artifact content and geometry remain identical between the two presentations.',
  });
}
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-template-layouts.json'),
  JSON.stringify(
    {
      fonts,
      fixtures: 'docs/pattern-packages/graphic-design-template-fixtures.json',
      method:
        'Three data-driven renderers, each shown with two content inputs. Only declared viewport, flow, optional-image and auto-height properties change within before/after pairs. Unchanged ordinary inputs serve as controls.',
      examples: records,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Built three reusable-template comparisons with six content inputs and interleaved narrow views.',
);
