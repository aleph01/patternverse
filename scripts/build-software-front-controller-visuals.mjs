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

const dispatchDescription =
  'Several web paths enter a shared front controller. It creates request-local context, chooses an allowlisted handler, and delegates path-specific work. Handler results or recognized routing failures return through common completion handling. Domain operations remain behind the handlers. Only paths mapped to this entry point participate.';
const outcomesDescription =
  'An unknown path produces a 404 without calling a handler. A known path with the wrong recognized method produces a 405 with an Allow value. A selected handler that raises an exception produces a generic 500, with its request ID retained in internal diagnostics. All three cases reach the simulation’s shared audit completion step.';
function dispatch(compact) {
  const d = compact
    ? text(24, 32, 'One shared request lifecycle', 22) +
      card(24, 104, 312, 'Mapped requests', 'Parsed method and exact path.', false, 88) +
      arrow('M180 192V294') +
      text(196, 248, 'request', 17, true) +
      card(24, 296, 312, 'Front Controller', 'New context; locale; routing.', true, 144) +
      text(40, 410, '404 / 405: skip the handler.', 16, true) +
      arrow('M180 440V526') +
      text(196, 492, 'select one', 17, true) +
      card(24, 528, 312, 'Delegated handler', 'welcome, orders, or broken', false, 144) +
      text(40, 642, 'Application work stays behind it.', 16, true) +
      arrow('M336 368H348V816H338') +
      arrow('M180 672V758') +
      text(196, 724, 'result / failure', 17, true) +
      card(24, 760, 312, 'Shared completion', 'Generic failure; append status.', true, 112) +
      arrow('M180 872V958') +
      text(196, 924, 'response', 17, true) +
      card(24, 960, 312, 'Return Response', 'Status; text; Allow for 405.', false, 104) +
      text(24, 1136, 'Only mapped paths participate.', 18)
    : text(24, 34, 'Central entry processing, delegated actions', 24) +
      card(
        24,
        100,
        672,
        'Mapped requests',
        'GET /; GET /orders; POST /orders; other mapped paths',
        false,
        96,
      ) +
      arrow('M360 196V302') +
      text(376, 252, 'request', 17, true) +
      card(
        24,
        304,
        672,
        'Front Controller',
        'New request context; locale; allowlisted handler selection',
        true,
        144,
      ) +
      text(40, 418, '404 / 405 skip the handler and complete centrally.', 17, true) +
      arrow('M360 448V504H180V566') +
      arrow('M360 504H540V566') +
      text(24, 488, 'Select one handler for this request.', 17, true) +
      card(24, 568, 312, 'Welcome handler', 'Path-specific response work', false, 112) +
      card(384, 568, 312, 'Orders handler', 'Application / view delegation', false, 112) +
      arrow('M696 384H708V880H698') +
      arrow('M180 680V822') +
      text(196, 752, 'result / failure', 17, true) +
      arrow('M540 680V822') +
      text(556, 752, 'result / failure', 17, true) +
      card(
        24,
        824,
        672,
        'Shared completion and response',
        'Translate handler failures; append audit status; return Response.',
        true,
        112,
      ) +
      text(
        24,
        1000,
        'Mapped scope matters; replicas may share the same processing contract.',
        17,
        true,
      );
  return svg(
    'A common request lifecycle delegates action-specific processing',
    dispatchDescription,
    compact ? 360 : 720,
    compact ? 1184 : 1040,
    d,
  );
}
function outcomes(compact) {
  const d = compact
    ? text(24, 32, 'Three distinct failure outcomes', 22) +
      card(24, 104, 312, 'Case 1: unknown path', 'GET /missing', false, 144) +
      text(40, 216, '404 Not found; no handler call.', 17, true) +
      card(24, 312, 312, 'Case 2: wrong method', 'POST /orders; only GET allowed', false, 144) +
      text(40, 424, '405; Allow: GET; no handler call.', 16, true) +
      card(24, 520, 312, 'Case 3: handler failure', 'GET /broken raises RuntimeError', false, 176) +
      text(40, 632, '500 Internal error to the caller.', 17, true) +
      text(40, 668, 'ID + exception class internally.', 17, true) +
      card(24, 800, 312, 'Every illustrated case', 'Append request ID and status.', true, 144) +
      text(40, 912, 'One common completion step.', 17, true) +
      text(24, 1008, 'These are alternative requests.', 18) +
      text(24, 1048, 'The audit is in memory only.', 17, true)
    : text(24, 34, 'Distinct failures, one completion policy', 24) +
      card(
        24,
        100,
        672,
        'Three alternative requests',
        'Each enters the same processing boundary.',
        false,
        104,
      ) +
      arrow('M360 204V260H128V322') +
      arrow('M360 260V322') +
      arrow('M360 260H592V322') +
      card(24, 324, 208, 'Unknown path', 'GET /missing', false, 160, true) +
      text(40, 420, '404 Not found', 17) +
      text(40, 456, 'No handler call.', 16, true) +
      card(256, 324, 208, 'Wrong method', 'POST /orders', false, 160, true) +
      text(272, 420, '405; Allow: GET', 17) +
      text(272, 456, 'No handler call.', 16, true) +
      card(488, 324, 208, 'Handler failure', 'GET /broken', false, 160, true) +
      text(504, 420, '500 Internal error', 17) +
      text(504, 456, 'Diagnostic ID kept.', 16, true) +
      arrow('M128 484V654') +
      arrow('M360 484V654') +
      arrow('M592 484V654') +
      card(
        24,
        656,
        672,
        'Shared completion',
        'Append this request ID and final status to the in-memory audit.',
        true,
        112,
      ) +
      text(
        24,
        844,
        'Failure diagnostics retain an ID and exception class, not public details.',
        17,
        true,
      ) +
      text(
        24,
        888,
        'Completion logging is not a durable or exactly-once audit guarantee.',
        17,
        true,
      );
  return svg(
    'Routing misses, method rejection, and handler errors remain distinct',
    outcomesDescription,
    compact ? 360 : 720,
    compact ? 1104 : 936,
    d,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['front-controller-dispatch', dispatch],
  ['front-controller-outcomes', outcomes],
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
console.log(
  'Built Front Controller dispatch and outcome diagrams with independent phone compositions.',
);
