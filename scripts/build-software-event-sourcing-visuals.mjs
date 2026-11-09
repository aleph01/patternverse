import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets');
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

const replayDescription =
  'An authoritative stream contains Opened 20 at revision one, Reserved R1 three at revision two, and Released R1 one at revision three. Applying the first two events yields seventeen available seats; applying all three yields eighteen. Neither reconstruction sends a confirmation.';
const appendDescription =
  'A release command based on revision two reaches a stream already at revision three and is rejected without adding an event. The caller must reload and reconsider. The accepted stream remains at revision three and replay still reports eighteen seats.';
function reconstruction(phone) {
  const drawing = phone
    ? text(24, 34, 'Facts reconstruct state', 22) +
      card(24, 112, 312, '1 / Opened', 'Capacity: 20 seats', true, 96) +
      arrow('M180 208V270') +
      card(24, 272, 312, '2 / Reserved', 'R1 holds 3 seats', true, 96) +
      arrow('M180 368V430') +
      card(24, 432, 312, 'Replay revisions 1–2', '20 − 3 = 17 available', false, 120) +
      text(40, 526, 'R1 holds 3 seats', 17, true) +
      arrow('M180 552V614') +
      text(196, 594, 'next fact', 16, true) +
      card(24, 616, 312, '3 / Released', 'R1 releases 1 seat', true, 96) +
      arrow('M180 712V774') +
      card(24, 776, 312, 'Replay revisions 1–3', '20 − 3 + 1 = 18 available', false, 136) +
      text(40, 882, 'R1 holds 2 seats', 17, true) +
      text(24, 998, 'Arrows: ordered application of facts.', 16, true) +
      text(24, 1034, 'Rebuild state; send no confirmations.', 16, true)
    : text(24, 34, 'Accepted facts are the authoritative record', 24) +
      rect(24, 112, 672, 300, true) +
      text(40, 144, 'POOL-1 / ordered event stream', 20) +
      card(48, 168, 624, '1 / Opened', 'Capacity: 20 seats', false, 64) +
      card(48, 248, 624, '2 / Reserved', 'Reservation R1: 3 seats', false, 64) +
      card(48, 328, 624, '3 / Released', 'Reservation R1: 1 seat', false, 64) +
      arrow('M180 412V558') +
      text(24, 492, 'apply revisions 1–2', 17, true) +
      arrow('M540 412V558') +
      text(384, 492, 'apply revisions 1–3', 17, true) +
      card(24, 560, 312, 'State at revision 2', '20 − 3 = 17 available', false, 176) +
      text(40, 684, 'R1 holds 3 seats', 18, true) +
      card(384, 560, 312, 'State at revision 3', '20 − 3 + 1 = 18 available', false, 176) +
      text(400, 684, 'R1 holds 2 seats', 18, true) +
      text(24, 818, 'Arrows: replay the selected prefix into derived state.', 18) +
      text(24, 858, 'Neither path sends a confirmation or rewrites the event stream.', 17, true);
  return svg(
    'Reconstruct from accepted facts',
    replayDescription,
    phone ? 360 : 720,
    phone ? 1080 : 920,
    drawing,
  );
}
function conditional(phone) {
  const drawing = phone
    ? text(24, 34, 'A stale append adds nothing', 22) +
      card(24, 112, 312, 'Release 1 seat from R1', 'Expected revision: 2', false, 120) +
      text(40, 208, 'Decision based on earlier history', 16, true) +
      arrow('M180 232V294') +
      card(24, 296, 312, 'Stored stream now at 3', 'Opened / Reserved / Released', true, 144) +
      text(40, 404, 'R1 holds 2; 18 available', 17, true) +
      arrow('M180 440V502') +
      card(24, 504, 312, 'Compare inside transaction', 'Expected 2 ≠ current 3', true, 144) +
      text(40, 612, 'Reject; no INSERT; roll back', 17, true) +
      arrow('M180 648V710') +
      card(
        24,
        712,
        312,
        'Stream remains at 3',
        'Replaying still yields 18 available',
        false,
        144,
        true,
      ) +
      text(40, 820, 'Reload and reconsider the request.', 16, true) +
      text(24, 942, 'Arrows: request, check, and outcome.', 16, true) +
      text(24, 980, 'No event is added for this rejection.', 16, true)
    : text(24, 34, 'Append only against the state used to decide', 24) +
      card(24, 112, 312, 'Release 1 seat from R1', 'Expected revision: 2', false, 176) +
      text(40, 244, 'Earlier decision', 18, true) +
      card(
        384,
        112,
        312,
        'Stored stream at revision 3',
        'Opened / Reserved / Released',
        true,
        176,
      ) +
      text(400, 244, '18 available; R1 holds 2', 18, true) +
      arrow('M180 288V366H300V430') +
      arrow('M540 288V366H420V430') +
      card(
        24,
        432,
        672,
        'Conditional append in one transaction',
        'Expected revision 2 ≠ current revision 3',
        true,
        160,
      ) +
      text(40, 550, 'Reject before INSERT; roll back. No new accepted fact.', 18, true) +
      arrow('M360 592V670') +
      card(
        24,
        672,
        672,
        'Stream remains at revision 3',
        'Reconstruction still yields 18 available and R1 holding 2.',
        false,
        144,
      ) +
      text(40, 784, 'Reload history and reconsider before proposing a new event.', 18, true) +
      text(24, 906, 'Arrows: command input, current revision, and rejection outcome.', 17, true);
  return svg(
    'Conditional append rejects stale decisions',
    appendDescription,
    phone ? 360 : 720,
    phone ? 1024 : 960,
    drawing,
  );
}
const outputs = [
  ['data-engineering/event-sourcing.svg', reconstruction(false)],
  ['data-engineering/event-sourcing-mobile.svg', reconstruction(true)],
  ['software-engineering/event-sourcing-append.svg', conditional(false)],
  ['software-engineering/event-sourcing-append-mobile.svg', conditional(true)],
];
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [path, source] of outputs) {
  await mkdir(resolve(assets, path, '..'), { recursive: true });
  await writeFile(resolve(assets, path), source);
  const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
  manifest[path] = { width: Number(width), height: Number(height) };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rebuilt original Event Sourcing diagram and three responsive assets.');
