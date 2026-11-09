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

const boundaryDescription =
  'Producer and consumer caller threads enter synchronized put, get, and close methods through one shared monitor lock. The protected inbox contains a bounded deque and a closed flag. A condition wait releases that same lock; a returning waiter reacquires it and rechecks the state predicate.';
const waitDescription =
  'A consumer finds an empty inbox, waits, and releases the lock. A producer acquires it, inserts one item, and notifies while retaining the lock. Only after the producer releases can the consumer reacquire. The consumer rechecks the predicate before removing an item, or waits again if it is still false.';
function boundary(phone) {
  let drawing = text(
    24,
    34,
    phone
      ? 'One state boundary, one lock'
      : 'Callers execute methods through one shared monitor lock',
    phone ? 22 : 24,
  );
  if (phone) {
    drawing += card(
      24,
      112,
      312,
      'Producer and consumer callers',
      'put, get, close run on their threads.',
      false,
      128,
      true,
    );
    drawing += arrow('M180 240V318') + text(196, 286, 'enter method', 16, true);
    drawing += card(
      24,
      320,
      312,
      'Shared monitor lock',
      'One caller in protected state access.',
      true,
      128,
      true,
    );
    drawing += arrow('M180 448V526') + text(196, 494, 'check + update', 16, true);
    drawing += card(
      24,
      528,
      312,
      'Protected inbox state',
      'Bounded deque + closed flag',
      false,
      144,
      true,
    );
    drawing += text(40, 638, 'Invariant: 0 ≤ count ≤ capacity', 17, true);
    drawing += rect(24, 768, 312, 160, true) + text(40, 800, 'When a predicate is false', 19);
    drawing += text(40, 842, 'Condition.wait releases this lock.', 16, true);
    drawing += text(40, 878, 'On return: reacquire, then recheck.', 16, true);
    drawing += text(40, 912, 'No dedicated object worker exists.', 15, true);
    drawing += text(24, 1012, 'Arrows: caller entry and state access.', 16, true);
    drawing += text(24, 1052, 'The waiting invocation remains pending.', 15, true);
  } else {
    drawing += card(24, 112, 296, 'Producer caller', 'Calls put(item).', false, 128);
    drawing += card(400, 112, 296, 'Consumer caller', 'Calls get().', false, 128);
    drawing += arrow('M172 240V302H328V350') + arrow('M548 240V302H392V350');
    drawing += text(276, 286, 'method invocation', 17, true);
    drawing += card(
      24,
      352,
      672,
      'Synchronized methods: put, get, close',
      'Each method runs on its caller’s thread; the object has no worker.',
      true,
      128,
    );
    drawing += arrow('M360 480V574') + text(376, 534, 'same lock', 17, true);
    drawing += card(
      24,
      576,
      672,
      'Shared monitor lock',
      'Exclusive access covers both the state predicate and its mutation.',
      true,
      128,
    );
    drawing += arrow('M360 704V798') + text(376, 758, 'check + update', 17, true);
    drawing += card(
      24,
      800,
      672,
      'Protected state: bounded deque and closed flag',
      'Invariant: 0 ≤ item count ≤ capacity. Callers have no unlocked state path.',
      false,
      128,
    );
    drawing +=
      rect(24, 1024, 672, 144, true) +
      text(40, 1058, 'If a predicate is false: wait through the condition', 22);
    drawing += text(
      40,
      1102,
      'Wait releases this same lock so another caller can change state.',
      19,
      true,
    );
    drawing += text(
      40,
      1142,
      'A returning waiter reacquires it and checks the predicate again.',
      18,
      true,
    );
    drawing += text(
      24,
      1252,
      'Arrows: synchronized entry and protected state access, not queued methods.',
      17,
      true,
    );
  }
  return svg(
    'Monitor Object state and locking boundary',
    boundaryDescription,
    phone ? 360 : 720,
    phone ? 1104 : 1296,
    drawing,
  );
}
function waiting(phone) {
  let drawing = text(
    24,
    34,
    phone ? 'Notify, reacquire, recheck' : 'Notification does not transfer the monitor lock',
    phone ? 22 : 24,
  );
  if (phone) {
    drawing += card(
      24,
      112,
      312,
      '1 / consumer owns lock',
      'Inbox empty; get cannot proceed.',
      false,
      144,
      true,
    );
    drawing += text(40, 222, 'Must wait without keeping the lock.', 15, true);
    drawing += arrow('M180 256V318');
    drawing += card(
      24,
      320,
      312,
      '2 / consumer waits',
      'wait releases the monitor lock.',
      true,
      144,
      true,
    );
    drawing += text(40, 430, 'The caller remains suspended.', 16, true);
    drawing += arrow('M180 464V526');
    drawing += card(
      24,
      528,
      312,
      '3 / producer owns lock',
      'Insert an item; call notify_all().',
      true,
      144,
      true,
    );
    drawing += text(40, 638, 'Lock remains held during notify.', 16, true);
    drawing += arrow('M180 672V734');
    drawing += card(
      24,
      736,
      312,
      '4 / producer returns',
      'Exit releases the monitor lock.',
      false,
      144,
      true,
    );
    drawing += text(40, 846, 'Notified waiters may now compete.', 15, true);
    drawing += arrow('M180 880V942');
    drawing += card(
      24,
      944,
      312,
      '5 / consumer owns lock',
      'Reacquire and check state again.',
      true,
      144,
      true,
    );
    drawing += text(40, 1054, 'If no item, repeat waiting.', 17, true);
    drawing += text(24, 1172, 'Arrows: one explanatory event trace.', 16, true);
    drawing += text(24, 1212, 'A notification does not reserve an item.', 15, true);
  } else {
    const stages = [
      [
        112,
        'Consumer',
        'owns lock',
        'Find the inbox empty',
        'get cannot remove data; it must wait for the predicate.',
        false,
      ],
      [
        304,
        'Released',
        'caller waits',
        'Condition.wait releases the lock',
        'The suspended invocation does not block protected access.',
        true,
      ],
      [
        496,
        'Producer',
        'owns lock',
        'Insert one item and notify',
        'Notification does not release the monitor lock.',
        true,
      ],
      [
        688,
        'Released',
        'method exits',
        'Producer returns and releases the lock',
        'Notified callers can now compete to reacquire it.',
        false,
      ],
      [
        880,
        'Consumer',
        'owns lock',
        'Reacquire, then check the predicate',
        'Remove only if data exists; otherwise wait again.',
        true,
      ],
    ];
    for (const [y, label, detail, title, note, accent] of stages) {
      drawing +=
        rect(24, y, 144, 128, false, true) +
        text(40, y + 36, label, 19) +
        text(40, y + 78, detail, 16, true);
      drawing += card(208, y, 488, title, note, accent, 128, true);
      if (y < 880) drawing += arrow(`M96 ${y + 128}V${y + 190}`);
    }
    drawing += text(
      24,
      1090,
      'Arrows: an explanatory trace, not a fairness or handoff guarantee.',
      18,
      true,
    );
    drawing += text(
      24,
      1130,
      'Recheck in a while loop: notification alone does not prove the predicate.',
      17,
      true,
    );
  }
  return svg(
    'Monitor Object wait and notification',
    waitDescription,
    phone ? 360 : 720,
    phone ? 1256 : 1176,
    drawing,
  );
}
const files = [
  ['monitor-object-boundary.svg', boundary(false), 720, 1296],
  ['monitor-object-boundary-mobile.svg', boundary(true), 360, 1104],
  ['monitor-object-wait.svg', waiting(false), 720, 1176],
  ['monitor-object-wait-mobile.svg', waiting(true), 360, 1256],
];
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [file, drawing, width, height] of files) {
  await writeFile(resolve(assets, 'software-engineering', file), drawing);
  manifest['software-engineering/' + file] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Built four editable Monitor Object SVG variants.');
