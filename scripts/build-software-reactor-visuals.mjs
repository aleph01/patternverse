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

const dispatchDescription =
  "Two sockets are registered with the Reactor. The dispatcher waits on the selector, receives readable socket handles, and invokes each handle's registered handler. Each handler attempts nonblocking reads, retains unfinished state, and returns control to the dispatcher.";
const fragmentsDescription =
  'A first sends hel without a newline, so its handler retains three bytes and returns. B sends ok followed by a newline and completes independently. A later sends lo followed by a newline, completing hello. A final incomplete record at EOF is rejected and its socket is unregistered before closing.';
function dispatch(phone) {
  let drawing = text(
    24,
    34,
    phone ? 'Wait, dispatch, return' : 'Readiness selects a handler; the handler performs I/O',
    phone ? 22 : 24,
  );
  if (phone) {
    drawing += card(
      24,
      112,
      312,
      'Registered sockets A and B',
      'Read interest + one callback each',
      false,
      128,
      true,
    );
    drawing += arrow('M180 240V318') + text(196, 286, 'wait', 16, true);
    drawing += card(
      24,
      320,
      312,
      'Selector / demultiplexer',
      'Returns readable registrations.',
      true,
      128,
      true,
    );
    drawing += arrow('M180 448V526') + text(196, 494, 'ready handles', 16, true);
    drawing += card(
      24,
      528,
      312,
      'Reactor dispatcher',
      'Calls key.data(key, mask).',
      true,
      128,
      true,
    );
    drawing += arrow('M180 656V734') + text(196, 702, 'callback', 16, true);
    drawing += card(
      24,
      736,
      312,
      'Connection’s read handler',
      'Attempts one nonblocking read.',
      false,
      144,
      true,
    );
    drawing += text(40, 846, 'Retains unfinished bytes locally.', 16, true);
    drawing += arrow('M180 880V958') + text(196, 926, 'return', 16, true);
    drawing += card(
      24,
      960,
      312,
      'Loop can wait or dispatch again',
      'No handler waits for a full record.',
      false,
      128,
      true,
    );
    drawing += text(24, 1172, 'Arrows: control flow for one loop turn.', 15, true);
    drawing += text(24, 1210, 'A ready socket is not a complete record.', 15, true);
  } else {
    drawing += card(
      24,
      112,
      296,
      'Socket A registration',
      'Read interest + callback A',
      false,
      112,
    );
    drawing += card(
      400,
      112,
      296,
      'Socket B registration',
      'Read interest + callback B',
      false,
      112,
    );
    drawing += arrow('M172 224V286H328V350') + arrow('M548 224V286H392V350');
    drawing += text(270, 270, 'wait on registered handles', 17, true);
    drawing += card(
      24,
      352,
      672,
      'Selector / synchronous event demultiplexer',
      'Waits until handles are ready, then returns their registrations.',
      true,
      128,
    );
    drawing += arrow('M360 480V574') + text(376, 534, 'readable registrations', 17, true);
    drawing += card(
      24,
      576,
      672,
      'Reactor dispatcher',
      'For each ready key: call its registered handler with the event mask.',
      true,
      128,
    );
    drawing += arrow('M360 704V798') + text(376, 758, 'callback', 17, true);
    drawing += card(
      24,
      800,
      672,
      'Handler performs nonblocking I/O, then returns',
      'One bounded read; retain per-connection framing state.',
      false,
      128,
    );
    drawing += text(
      40,
      900,
      'A would-block result returns control rather than waiting inside the handler.',
      16,
      true,
    );
    drawing += text(
      24,
      1012,
      'Arrows: registration interests and control flow; no completed record is implied.',
      16,
      true,
    );
    drawing += text(
      24,
      1050,
      'After the callback returns, the loop can process other ready connections.',
      18,
      true,
    );
  }
  return svg(
    'Reactor readiness dispatch',
    dispatchDescription,
    phone ? 360 : 720,
    phone ? 1256 : 1104,
    drawing,
  );
}
function fragments(phone) {
  let drawing = text(
    24,
    34,
    phone ? 'A fragment need not stall B' : 'Per-connection state survives across short callbacks',
    phone ? 22 : 24,
  );
  if (phone) {
    drawing += card(
      24,
      112,
      312,
      '1 / A receives hel',
      'No LF terminator / no record yet',
      false,
      144,
      true,
    );
    drawing += text(40, 222, 'Keep A’s buffer; return to the loop.', 15, true);
    drawing += arrow('M180 256V318');
    drawing += card(
      24,
      320,
      312,
      '2 / B receives ok + LF',
      'Emit B’s complete record: ok',
      true,
      144,
      true,
    );
    drawing += text(40, 430, 'B does not wait for A’s terminator.', 15, true);
    drawing += arrow('M180 464V526');
    drawing += card(
      24,
      528,
      312,
      '3 / A receives lo + LF',
      'Retained hel + lo becomes hello.',
      true,
      144,
      true,
    );
    drawing += text(40, 638, 'Emit A’s complete record; clear buffer.', 15, true);
    drawing += arrow('M180 672V734');
    drawing += card(
      24,
      736,
      312,
      '4 / A receives x, then EOF',
      'Reject the unfinished suffix x.',
      false,
      144,
      true,
    );
    drawing += text(40, 846, 'Unregister A before closing it.', 16, true);
    drawing += text(24, 970, 'Arrows: one explanatory event trace.', 16, true);
    drawing += text(24, 1010, 'LF is the record terminator byte.', 16, true);
    drawing += text(24, 1050, 'Selector ordering is not guaranteed.', 16, true);
  } else {
    const stages = [
      [
        112,
        '1 / A',
        'Receive hel; no LF terminator',
        'A retains hel; handler returns without emitting a record.',
        false,
      ],
      [
        320,
        '2 / B',
        'Receive ok + LF; emit ok',
        'B completes while A’s record remains unfinished.',
        true,
      ],
      [
        528,
        '3 / A',
        'Receive lo + LF; emit hello',
        'A combines retained hel with lo, then clears its buffer.',
        true,
      ],
      [
        736,
        '4 / A',
        'Receive x, then EOF; reject x',
        'Unregister before close; keep earlier complete records.',
        false,
      ],
    ];
    for (const [y, label, title, detail, accent] of stages) {
      drawing += rect(24, y, 128, 144, false, true) + text(40, y + 36, label, 21);
      drawing += card(192, y, 504, title, detail, accent, 144, true);
      if (y < 736) drawing += arrow(`M88 ${y + 144}V${y + 206}`);
    }
    drawing += text(
      24,
      970,
      'Arrows: an explanatory trace, not a promise about selector ordering.',
      18,
      true,
    );
    drawing += text(
      24,
      1010,
      'Each callback consumes at most four bytes. LF marks a record boundary.',
      18,
      true,
    );
    drawing += text(
      24,
      1050,
      'Connection state is independent; no callback waits for a full record.',
      18,
      true,
    );
  }
  return svg(
    'Reactor fragmented records',
    fragmentsDescription,
    phone ? 360 : 720,
    phone ? 1104 : 1104,
    drawing,
  );
}
const files = [
  ['reactor-dispatch.svg', dispatch(false), 720, 1104],
  ['reactor-dispatch-mobile.svg', dispatch(true), 360, 1256],
  ['reactor-fragments.svg', fragments(false), 720, 1104],
  ['reactor-fragments-mobile.svg', fragments(true), 360, 1104],
];
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [file, drawing, width, height] of files) {
  await writeFile(resolve(assets, 'software-engineering', file), drawing);
  manifest['software-engineering/' + file] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Built four editable Reactor SVG variants.');
