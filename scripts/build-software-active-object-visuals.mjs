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

const ownerDescription =
  'Clients invoke the stock proxy, which creates requests containing an immutable quantity change and a future. A bounded activation queue passes requests to one worker scheduler. Only that worker accesses the stock quantity and resolves each future with a result or error.';
const resultsDescription =
  'Three admitted changes execute in order. Adding three units returns three. Removing five fails before mutation and returns an error, leaving three units. Adding two then returns five. Shutdown rejects new invocations, drains accepted requests, and joins the worker.';
function owner(phone) {
  let drawing = text(
    24,
    34,
    phone
      ? 'Invoke here; execute there'
      : 'The proxy accepts calls; one owner executes stock methods',
    phone ? 22 : 24,
  );
  if (phone) {
    drawing += card(
      24,
      112,
      312,
      'Caller thread / stock proxy',
      'Captures (delta, future).',
      false,
      144,
      true,
    );
    drawing += text(40, 222, 'Returns the future to its caller.', 16, true);
    drawing += arrow('M180 256V318') + text(196, 294, 'enqueue', 16, true);
    drawing += card(
      24,
      320,
      312,
      'Activation queue / FIFO',
      'At most two requests wait here.',
      true,
      128,
      true,
    );
    drawing += arrow('M180 448V526') + text(196, 494, 'dequeue', 16, true);
    drawing += card(
      24,
      528,
      312,
      'Owner thread / scheduler',
      'Selects the next method request.',
      true,
      128,
      true,
    );
    drawing += arrow('M180 656V734') + text(196, 702, 'execute', 16, true);
    drawing += card(
      24,
      736,
      312,
      'Servant state: quantity',
      'Only the worker checks and updates.',
      false,
      128,
      true,
    );
    drawing += arrow('M180 864V942') + text(196, 910, 'resolve', 16, true);
    drawing += card(
      24,
      944,
      312,
      'Future receives result or error',
      'Integer result exposes no mutable state.',
      false,
      144,
      true,
    );
    drawing += text(40, 1054, 'Caller chooses when to wait.', 16, true);
    drawing += text(24, 1172, 'Arrows: request, execution, result flow.', 15, true);
    drawing += text(24, 1210, 'The caller never mutates quantity directly.', 15, true);
  } else {
    drawing += card(24, 112, 296, 'Caller thread', 'Invokes change(delta).', false, 144);
    drawing += text(40, 222, 'Can continue with a future.', 17, true);
    drawing += card(400, 112, 296, 'Stock proxy', 'Captures (delta, future).', false, 144);
    drawing += text(416, 222, 'Does not execute stock changes.', 16, true);
    drawing += arrow('M320 156H398') + text(328, 140, 'invoke', 15, true);
    drawing += arrow('M400 212H322') + text(328, 198, 'future', 15, true);
    drawing += arrow('M548 256V318H360V350') + text(376, 302, 'method request', 17, true);
    drawing += card(
      24,
      352,
      672,
      'Bounded activation queue / FIFO',
      'At most two method requests wait; admission can reject a full queue.',
      true,
      128,
    );
    drawing += arrow('M360 480V574') + text(376, 534, 'dequeue next request', 17, true);
    drawing += card(
      24,
      576,
      672,
      'Owner thread / scheduler',
      'Runs one request at a time; queued cancellation can skip execution.',
      true,
      128,
    );
    drawing += arrow('M360 704V798') + text(376, 758, 'invoke servant behavior', 17, true);
    drawing += card(
      24,
      800,
      672,
      'Worker-owned servant state: quantity',
      'The worker checks and updates its local quantity; callers have no direct path.',
      false,
      128,
    );
    drawing += arrow('M360 928V1022') + text(376, 982, 'resolve result', 17, true);
    drawing += card(
      24,
      1024,
      672,
      'Future already returned to the caller',
      'Receives an immutable integer or an exception for this request.',
      false,
      128,
    );
    drawing += text(
      24,
      1232,
      'Arrows: method invocation, queued request, worker execution, result delivery.',
      17,
      true,
    );
    drawing += text(
      24,
      1270,
      'The control lock guards admission and closure, not the servant’s quantity.',
      17,
      true,
    );
  }
  return svg(
    'Active Object ownership and collaboration',
    ownerDescription,
    phone ? 360 : 720,
    phone ? 1256 : 1320,
    drawing,
  );
}
function results(phone) {
  let drawing = text(
    24,
    34,
    phone ? 'A failed request need not stop work' : 'One execution owner preserves the stock rule',
    phone ? 20 : 24,
  );
  if (phone) {
    drawing += card(24, 112, 312, '1 / add 3 units', 'Quantity: 0 → 3', true, 144, true);
    drawing += text(40, 222, 'Future returns 3 units.', 17, true);
    drawing += arrow('M180 256V318');
    drawing += card(
      24,
      320,
      312,
      '2 / remove 5 units',
      'Reject before changing quantity.',
      false,
      144,
      true,
    );
    drawing += text(40, 430, 'Future raises; quantity remains 3.', 15, true);
    drawing += arrow('M180 464V526');
    drawing += card(24, 528, 312, '3 / add 2 units', 'Quantity: 3 → 5', true, 144, true);
    drawing += text(40, 638, 'Future returns 5 units.', 17, true);
    drawing += arrow('M180 672V734');
    drawing += card(
      24,
      736,
      312,
      '4 / close the owner',
      'Stop admission; drain accepted work.',
      false,
      160,
      true,
    );
    drawing += text(40, 846, 'Then join the worker.', 17, true);
    drawing += text(40, 876, 'New invocations are rejected.', 16, true);
    drawing += text(24, 980, 'Arrows: this example’s execution order.', 15, true);
    drawing += text(24, 1020, 'Validation precedes the failed mutation.', 15, true);
    drawing += text(24, 1060, 'No general rollback is provided.', 16, true);
  } else {
    const stages = [
      [
        112,
        '1 / +3 units',
        'Add three / quantity 0 → 3',
        'The first future receives 3 units.',
        true,
      ],
      [
        320,
        '2 / −5 units',
        'Reject removal before mutation',
        'Quantity stays 3; this request’s future receives an error.',
        false,
      ],
      [
        528,
        '3 / +2 units',
        'Add two / quantity 3 → 5',
        'The next request still runs; its future receives 5 units.',
        true,
      ],
    ];
    for (const [y, label, title, detail, accent] of stages) {
      drawing += rect(24, y, 144, 144, false, true) + text(40, y + 36, label, 19);
      drawing += card(208, y, 488, title, detail, accent, 144, true);
      drawing += arrow(`M96 ${y + 144}V${y + 206}`);
    }
    drawing += card(
      24,
      736,
      672,
      '4 / close: stop admission, then drain and join',
      'The stop marker follows accepted requests. New invocations are rejected.',
      false,
      144,
    );
    drawing += text(40, 846, 'The worker is non-daemon; close waits for it to finish.', 18, true);
    drawing += text(
      24,
      970,
      'Arrows: example execution order, not caller start order across threads.',
      18,
      true,
    );
    drawing += text(
      24,
      1010,
      'Pre-mutation validation preserves quantity here; exceptions do not imply rollback.',
      16,
      true,
    );
  }
  return svg(
    'Active Object results, failure, and shutdown',
    resultsDescription,
    phone ? 360 : 720,
    phone ? 1112 : 1056,
    drawing,
  );
}
const files = [
  ['active-object-owner.svg', owner(false), 720, 1320],
  ['active-object-owner-mobile.svg', owner(true), 360, 1256],
  ['active-object-results.svg', results(false), 720, 1056],
  ['active-object-results-mobile.svg', results(true), 360, 1112],
];
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [file, drawing, width, height] of files) {
  await writeFile(resolve(assets, 'software-engineering', file), drawing);
  manifest['software-engineering/' + file] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Built four editable Active Object SVG variants.');
