import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets/software-engineering');
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 19, secondary = false) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${secondary ? '#626962' : '#252c28'}">${esc(value)}</text>`;
const rect = (x, y, width, height, accent = false, surface = false) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${surface ? '#fff' : accent ? '#edf5f0' : '#f1f2ef'}" stroke="${accent ? '#00855b' : '#a6aca3'}" stroke-width="1.2"/>`;
const arrow = (d) =>
  `<path d="${d}" fill="none" stroke="#00855b" stroke-width="1.5" marker-end="url(#arrow)"/>`;
const card = (x, y, width, title, detail, accent = false, height = 76, small = false) =>
  rect(x, y, width, height, accent) +
  text(x + 16, y + 29, title, small ? 18 : 20) +
  text(x + 16, y + 55, detail, small ? 16 : 17, true);

function svg(title, description, width, height, drawing) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}path,rect{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker><marker id="wiring" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#626962" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}

const rolesDescription =
  'User input reaches a controller, which translates reserve or cancel into a model operation. The model owns reservation state and capacity rules. After the operation, the composition code takes one snapshot and passes it to two views: a reserved-seat summary and a free-seat display. The controller does not format either view.';
const updateDescription =
  'Two displays first render the same snapshot with two reserved seats out of three and one free seat. A request to reserve two more is rejected by the model before state changes. A fresh snapshot still contains two reserved seats, and both displays remain consistent.';
function roles(compact) {
  const d = compact
    ? text(24, 32, 'Three roles,', 22) +
      text(24, 60, 'one state owner', 22) +
      card(24, 104, 312, 'User action', 'reserve; digit text: 2', false, 88) +
      card(24, 280, 312, 'Controller: input', 'Parse count; choose operation.', false, 144) +
      text(40, 390, 'No view formatting.', 17, true) +
      arrow('M180 192V278') +
      card(24, 528, 312, 'Model: state + rules', '0 ≤ reserved ≤ capacity', true, 144) +
      text(40, 638, 'Only valid changes mutate.', 17, true) +
      arrow('M180 424V526') +
      text(196, 478, 'invoke operation', 17, true) +
      card(
        24,
        768,
        312,
        'Composition: one snapshot',
        'Explicit refresh after action.',
        false,
        124,
      ) +
      arrow('M180 672V766') +
      text(196, 724, 'snapshot result', 17, true) +
      text(24, 974, 'Views', 18) +
      rect(8, 1000, 344, 280, false, true) +
      arrow('M180 892V998') +
      text(196, 948, 'render', 17, true) +
      card(24, 1032, 312, 'Summary view', 'Reserved: 2/3', false, 88) +
      card(24, 1160, 312, 'Availability view', 'Free: 1', false, 88) +
      text(24, 1336, 'Both read the same snapshot.', 18)
    : text(24, 34, 'Separate input, rules, and representation', 24) +
      card(24, 84, 672, 'User action', 'reserve; digit text: 2', false, 88) +
      card(24, 248, 312, 'Controller: interpret input', 'ASCII digits → seat count', false, 124) +
      text(40, 350, 'Choose reserve or cancel.', 17, true) +
      card(384, 248, 312, 'Model: state + rules', '0 ≤ reserved ≤ capacity', true, 124) +
      text(400, 350, 'Only valid changes mutate.', 17, true) +
      arrow('M180 172V246') +
      arrow('M336 310H382') +
      text(340, 288, 'call', 16, true) +
      card(
        24,
        492,
        672,
        'Composition: capture one model snapshot',
        'Caller explicitly refreshes both views after the action.',
        false,
        112,
      ) +
      arrow('M540 372V490') +
      text(556, 434, 'snapshot result', 17, true) +
      card(24, 732, 312, 'View: summary', 'Reserved: 2/3', false, 112) +
      card(384, 732, 312, 'View: availability', 'Free: 1', false, 112) +
      arrow('M180 604V730') +
      arrow('M540 604V730') +
      text(196, 670, 'same snapshot', 17, true) +
      text(556, 670, 'same snapshot', 17, true) +
      text(24, 924, 'Views format data; they do not choose the next command.', 18);
  return svg(
    'MVC separates interaction, model behavior, and presentation',
    rolesDescription,
    compact ? 360 : 720,
    compact ? 1384 : 968,
    d,
  );
}
function update(compact) {
  const d = compact
    ? text(24, 32, 'Reject before mutation;', 22) +
      text(24, 60, 'render the resulting state', 22) +
      card(24, 104, 312, 'Current model state', '2 reserved; capacity 3', false, 100) +
      card(24, 304, 312, 'Next input: reserve 2', 'Controller parses the count.', false, 100) +
      arrow('M180 204V302') +
      text(196, 258, 'next action', 17, true) +
      card(24, 512, 312, 'Model rejects command', '2 + 2 > 3', true, 116) +
      text(40, 602, 'State remains 2/3.', 17, true) +
      arrow('M180 404V510') +
      text(196, 462, 'reserve(2)', 17, true) +
      card(24, 736, 312, 'Take a fresh snapshot', 'Still 2 reserved out of 3.', false, 116) +
      arrow('M180 628V734') +
      text(196, 688, 'unchanged state', 17, true) +
      text(24, 942, 'Views', 18) +
      rect(8, 960, 344, 280, false, true) +
      arrow('M180 852V958') +
      text(196, 912, 'render', 17, true) +
      card(24, 992, 312, 'Summary view', 'Reserved: 2/3', false, 88) +
      card(24, 1120, 312, 'Availability view', 'Free: 1', false, 88) +
      text(24, 1296, 'Reject before mutation.', 18) +
      text(24, 1332, 'Both views remain consistent.', 17, true)
    : text(24, 34, 'A rejected command leaves one consistent state', 24) +
      card(24, 84, 672, 'Current model state', '2 reserved seats; capacity 3', false, 88) +
      card(24, 260, 312, 'Request: reserve 2', 'Parse count; call model.', false, 100) +
      card(384, 260, 312, 'Model rejects', '2 + 2 > 3; no mutation.', true, 100) +
      arrow('M180 172V258') +
      text(196, 220, 'next action', 17, true) +
      arrow('M336 310H382') +
      card(
        24,
        488,
        672,
        'Take another snapshot: still 2 out of 3',
        'The earlier snapshot also remains 2 out of 3.',
        false,
        100,
      ) +
      arrow('M540 360V486') +
      text(556, 426, 'unchanged state', 17, true) +
      card(24, 716, 312, 'Summary view', 'Reserved: 2/3', false, 100) +
      card(384, 716, 312, 'Availability view', 'Free: 1', false, 100) +
      arrow('M180 588V714') +
      arrow('M540 588V714') +
      text(24, 884, 'Render from state; do not repair counters in the views.', 17, true);
  return svg(
    'One rejected input preserves the state seen by both views',
    updateDescription,
    compact ? 360 : 720,
    compact ? 1376 : 928,
    d,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['model-view-controller-roles', roles],
  ['model-view-controller-update', update],
])
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`,
      content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[`software-engineering/${filename}`] = { width: +width, height: +height };
  }
const p = resolve(root, 'content/assets/manifest.json');
await writeFile(
  p,
  JSON.stringify({ ...JSON.parse(await readFile(p, 'utf8')), ...dimensions }, null, 2) + '\n',
);
console.log('Built MVC roles and update figures with separate phone layouts.');
