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
  'A reservation view forwards quantity text to a presenter. The presenter commands the booking model and reads its remaining seats, then sends display text, button availability, and a message back to the view. In the Passive View example there is no direct model-to-view connection. A recording view implements the same render contract during tests.';
const rejectionDescription =
  'A three-seat model accepts a reservation of two seats, and the presenter renders one remaining seat with Reserve enabled. A second request for two is rejected without mutation. The presenter reads the unchanged remaining count and renders the same availability with an error message. The recording view captures that screen result without a GUI.';
function roles(compact) {
  const d = compact
    ? text(24, 32, 'Passive View MVP:', 22) +
      text(24, 60, 'coordinate through a contract', 21) +
      card(24, 104, 312, 'View: widget adapter', 'Forward quantity text: "2".', false, 96) +
      arrow('M180 200V286') +
      text(196, 252, 'event', 17, true) +
      card(24, 288, 312, 'Presenter: handle input', 'Parse text; call reserve(2).', true, 112) +
      arrow('M180 400V486') +
      text(196, 452, 'command', 17, true) +
      card(24, 488, 312, 'Booking model', 'Enforce capacity; mutate.', false, 112) +
      arrow('M180 600V686') +
      text(196, 652, 'remaining: 1', 17, true) +
      card(24, 688, 312, 'Same presenter: refresh', 'Build text, flag, and message.', true, 112) +
      arrow('M180 800V886') +
      text(196, 852, 'render(screen)', 17, true) +
      card(24, 888, 312, 'Same view: display', 'Seats left: 1; Reserve enabled.', false, 112) +
      text(24, 1052, 'Tests substitute RecordingView.', 18) +
      text(24, 1088, 'It records the same screen value.', 17, true) +
      text(24, 1140, 'No direct view/model link.', 18)
    : text(24, 34, 'A presenter coordinates a passive view', 24) +
      card(24, 100, 312, 'View: widget adapter', 'Forward quantity text: "2".', false, 112) +
      card(24, 336, 312, 'Presenter: handle input', 'Parse text; call reserve(2).', true, 124) +
      arrow('M180 212V334') +
      text(196, 280, 'event', 17, true) +
      card(384, 336, 312, 'Booking model', 'Enforce capacity; mutate.', false, 124) +
      arrow('M336 382H382') +
      text(341, 363, 'call', 16, true) +
      arrow('M384 430H338') +
      text(390, 504, 'read remaining: 1', 17, true) +
      card(
        24,
        580,
        672,
        'Same presenter: derive the screen result',
        'Seats left: 1; Reserve enabled; message: Reserved',
        true,
        112,
      ) +
      arrow('M180 460V578') +
      text(196, 526, 'refresh', 17, true) +
      card(24, 804, 312, 'Same view: apply values', 'Widget properties only.', false, 112) +
      card(384, 804, 312, 'Or: recording view', 'Record values for assertions.', false, 112) +
      arrow('M180 692V802') +
      text(196, 752, 'render(screen)', 17, true) +
      arrow('M540 692V802') +
      text(556, 752, 'same contract', 17, true) +
      text(24, 972, 'No direct view/model link in this Passive View example.', 18);
  return svg(
    'MVP with a passive view and an interchangeable recording view',
    rolesDescription,
    compact ? 360 : 720,
    compact ? 1184 : 1024,
    d,
  );
}
function rejection(compact) {
  const d = compact
    ? text(24, 32, 'Reject the booking;', 22) +
      text(24, 60, 'update the feedback', 22) +
      card(24, 104, 312, 'Before the next click', 'Seats left: 1; Reserve enabled.', false, 104) +
      arrow('M180 208V294') +
      text(196, 260, 'reserve("2")', 17, true) +
      card(24, 296, 312, 'Presenter → model', 'Request two more seats.', false, 104) +
      arrow('M180 400V486') +
      text(196, 452, 'capacity check', 17, true) +
      card(24, 488, 312, 'Model rejects', '2 > 1; remaining stays 1.', true, 104) +
      arrow('M180 592V678') +
      text(196, 644, 'BookingError', 17, true) +
      card(24, 680, 312, 'Presenter refreshes', 'Read unchanged remaining.', false, 104) +
      arrow('M180 784V870') +
      text(196, 836, 'render(screen)', 17, true) +
      card(24, 872, 312, 'View receives', 'Seats left: 1; Reserve enabled.', true, 144) +
      text(40, 986, 'Message: Not enough seats', 17, true) +
      text(24, 1072, 'The recorder captures this result.', 18) +
      text(24, 1112, 'A flag never replaces validation.', 17, true)
    : text(24, 34, 'A failed command changes feedback, not capacity', 24) +
      card(24, 100, 672, 'Before the next click', 'Seats left: 1; Reserve enabled.', false, 104) +
      card(24, 312, 312, 'Presenter → model', 'Request two more seats.', false, 104) +
      arrow('M180 204V310') +
      text(196, 264, 'reserve("2")', 17, true) +
      card(384, 312, 312, 'Model rejects', '2 > 1; no mutation.', true, 104) +
      arrow('M336 364H382') +
      card(
        24,
        536,
        672,
        'Presenter refreshes after BookingError',
        'Read remaining: 1; choose the rejection message.',
        false,
        104,
      ) +
      arrow('M540 416V534') +
      text(556, 478, 'failure result', 17, true) +
      card(
        24,
        752,
        672,
        'View receives one screen result',
        'Seats left: 1; Reserve enabled; message: Not enough seats',
        true,
        104,
      ) +
      arrow('M180 640V750') +
      text(196, 702, 'render(screen)', 17, true) +
      text(24, 924, 'The recorder captures the result without loading a GUI.', 18) +
      text(24, 960, 'An enabled or disabled button never replaces model validation.', 17, true);
  return svg(
    'Rejected reservation preserves capacity and changes screen feedback',
    rejectionDescription,
    compact ? 360 : 720,
    compact ? 1160 : 1008,
    d,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['model-view-presenter-roles', roles],
  ['model-view-presenter-rejection', rejection],
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
console.log('Built MVP roles and rejection figures with separate phone layouts.');
