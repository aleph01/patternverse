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

const cycleDescription =
  'A user or service adapter supplies an event to the state owner. A controlled update produces a new UI state, which the view reads to render query, loading, results, and error consistently. The view sends subsequent interaction events back through the same entry path instead of directly changing shared state. Service work is outside the pure update in this example.';
const staleDescription =
  'Search ca becomes request 1, then search cat becomes request 2. A successful completion for request 2 installs cat results and ends loading. Request 1 then completes, but its identifier is stale, so the update returns the existing state and the cat results remain visible.';
function cycle(compact) {
  const d = compact
    ? text(24, 32, 'Explicit events, owned state', 22) +
      card(24, 104, 312, 'Events', 'Search / Loaded / Failed', false, 96) +
      arrow('M180 200V286') +
      text(196, 252, 'event', 17, true) +
      card(24, 288, 312, 'State owner / update', 'Old state + event → new state', true, 144) +
      text(40, 398, 'Replace the owned state.', 17, true) +
      arrow('M180 432V518') +
      text(196, 484, 'next state', 17, true) +
      card(24, 520, 312, 'UI state', 'query; ID; loading; results; error', false, 144) +
      text(40, 630, 'Read-only snapshot here.', 17, true) +
      arrow('M180 664V750') +
      text(196, 716, 'render', 17, true) +
      card(24, 752, 312, 'View', 'Read state; report interaction.', false, 112) +
      arrow('M24 808H12V152H22') +
      text(24, 984, 'Outside the pure update', 20) +
      card(24, 1040, 312, 'Effect adapter', 'Nonempty Search starts work.', false, 176) +
      text(40, 1150, 'Send Loaded or Failed events.', 17, true) +
      arrow('M336 1128H348V152H338') +
      text(24, 1288, 'Owner starts work after Search.', 18) +
      text(24, 1328, 'Rendering never starts requests.', 17, true)
    : text(24, 34, 'Events return to the owner; state drives the view', 24) +
      card(
        24,
        100,
        672,
        'Events from interaction or service completion',
        'Search / Loaded / Failed',
        false,
        96,
      ) +
      arrow('M180 196V310') +
      text(196, 252, 'event', 17, true) +
      card(24, 312, 312, 'State owner', 'update(previous, event)', true, 144) +
      text(40, 424, 'Publish returned state.', 17, true) +
      card(384, 312, 312, 'Effect adapter', 'Service work outside update', false, 144) +
      text(400, 424, 'Nonempty Search only.', 17, true) +
      arrow('M336 384H382') +
      text(338, 366, 'start', 16, true) +
      arrow('M696 384H708V148H698') +
      arrow('M180 456V590') +
      text(196, 522, 'next state', 17, true) +
      card(
        24,
        592,
        672,
        'UI state: query, request ID, loading, results, error',
        'Read-only snapshot in this example',
        false,
        112,
      ) +
      arrow('M360 704V822') +
      text(376, 764, 'render', 17, true) +
      card(24, 824, 672, 'View', 'Format current state; send interaction events.', false, 112) +
      arrow('M24 880H12V148H22') +
      text(24, 1000, 'Only the state owner replaces the feature state.', 18) +
      text(24, 1040, 'The view and service callbacks send events instead.', 17, true);
  return svg(
    'One controlled state transition path with explicit feedback events',
    cycleDescription,
    compact ? 360 : 720,
    compact ? 1376 : 1080,
    d,
  );
}
function stale(compact) {
  const d = compact
    ? text(24, 32, 'Keep the latest search intent', 22) +
      card(24, 104, 312, 'Current search: cat', 'Request 2; loading true', false, 112) +
      arrow('M180 216V326') +
      text(196, 270, 'Loaded(2)', 17, true) +
      card(24, 328, 312, 'Matching result accepted', 'cat, caterpillar', true, 144) +
      text(40, 438, 'Loading becomes false.', 17, true) +
      arrow('M180 472V558') +
      text(196, 522, 'later event', 17, true) +
      card(24, 560, 312, 'Older response: Loaded(1)', 'car, cart', false, 112) +
      arrow('M180 672V758') +
      text(196, 724, 'guard check', 17, true) +
      card(24, 760, 312, 'Stale completion ignored', '1 ≠ 2; no state transition.', true, 112) +
      arrow('M180 872V958') +
      text(196, 924, 'same state', 17, true) +
      card(24, 960, 312, 'View still shows cat', 'cat, caterpillar', false, 144) +
      text(40, 1074, 'Loading remains false.', 17, true) +
      text(24, 1168, 'Old work was not cancelled.', 18) +
      text(24, 1208, 'Only its state change is rejected.', 17, true)
    : text(24, 34, 'Request identity makes the ordering policy explicit', 24) +
      card(
        24,
        100,
        672,
        'Current search intent: cat',
        'Request 2; loading true; earlier request 1 is still in flight.',
        false,
        96,
      ) +
      arrow('M360 196V310') +
      text(376, 254, 'Loaded(2)', 17, true) +
      card(
        24,
        312,
        672,
        'Matching pending result accepted',
        'Results: cat, caterpillar; request 2; loading false',
        true,
        112,
      ) +
      arrow('M360 424V542') +
      text(376, 486, 'publish state', 17, true) +
      card(
        24,
        544,
        672,
        'Current state now represents the newer response',
        'The view shows cat, caterpillar.',
        false,
        112,
      ) +
      arrow('M180 656V774') +
      text(196, 716, 'next event', 17, true) +
      card(24, 776, 312, 'Loaded(request 1)', 'Older results: car, cart', false, 112) +
      card(384, 776, 312, 'Guard rejects', '1 ≠ 2; retain current state.', true, 112) +
      arrow('M336 832H382') +
      text(338, 810, 'check', 16, true) +
      arrow('M540 888V1006') +
      text(556, 952, 'unchanged', 17, true) +
      card(
        24,
        1008,
        672,
        'Same UI state after the stale completion',
        'Results: cat, caterpillar; loading false',
        false,
        112,
      );
  return svg(
    'A stale request completion cannot replace newer accepted search state',
    staleDescription,
    compact ? 360 : 720,
    compact ? 1256 : 1168,
    d,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['unidirectional-data-flow-cycle', cycle],
  ['unidirectional-data-flow-stale', stale],
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
console.log('Built UDF cycle and stale-completion diagrams with independent phone layouts.');
