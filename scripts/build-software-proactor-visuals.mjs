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

const completionDescription =
  'The initiator submits a read request with an identity, buffer, and handler. The operation processor performs the read and places its result on a completion queue. The dispatcher retrieves that result and invokes the matching handler with transferred bytes and status.';
const lifetimeDescription =
  "A and B occupy two request slots. B finishes first, but its queued completion still retains a slot. Cancellation is requested for A without freeing its context. The backend reports A successful with three bytes. Dispatch consumes B and A's actual outcomes and releases their request slots.";
function completion(phone) {
  let drawing = text(
    24,
    34,
    phone
      ? 'Submit work; receive results'
      : 'Initiate now; dispatch a completed operation’s result later',
    phone ? 22 : 24,
  );
  if (phone) {
    drawing += card(
      24,
      112,
      312,
      'Initiator submits a read',
      'Request ID + buffer + handler',
      false,
      128,
      true,
    );
    drawing += arrow('M180 240V318') + text(196, 286, 'submit', 16, true);
    drawing += card(
      24,
      320,
      312,
      'Operation processor',
      'Performs the requested I/O.',
      true,
      128,
      true,
    );
    drawing += arrow('M180 448V526') + text(196, 494, 'terminal result', 16, true);
    drawing += card(
      24,
      528,
      312,
      'Completion queue',
      'Request ID + byte count + status',
      true,
      128,
      true,
    );
    drawing += arrow('M180 656V734') + text(196, 702, 'dequeue', 16, true);
    drawing += card(
      24,
      736,
      312,
      'Proactor dispatcher',
      'Finds the matching handler.',
      true,
      128,
      true,
    );
    drawing += arrow('M180 864V942') + text(196, 910, 'completion', 16, true);
    drawing += card(
      24,
      944,
      312,
      'Handler consumes the result',
      'Updates state; may start next I/O.',
      false,
      144,
      true,
    );
    drawing += text(40, 1054, 'It does not wait for read readiness.', 15, true);
    drawing += text(24, 1172, 'Arrows: submission and result flow.', 16, true);
    drawing += text(24, 1210, 'A short read can need another operation.', 15, true);
  } else {
    drawing += card(24, 112, 296, 'Initiator', 'Read + request ID + buffer', false, 144);
    drawing += text(40, 222, 'Registers completion handler.', 17, true);
    drawing += card(400, 112, 296, 'Operation processor', 'Performs the requested I/O.', true, 144);
    drawing += text(416, 222, 'Not just a readiness signal.', 17, true);
    drawing += arrow('M320 164H398') + text(328, 146, 'submit', 15, true);
    drawing += arrow('M548 256V318H360V350') + text(376, 302, 'completed I/O result', 17, true);
    drawing += card(
      24,
      352,
      672,
      'Completion queue',
      'Retains request identity, transferred byte count, and status.',
      true,
      128,
    );
    drawing += arrow('M360 480V574') + text(376, 534, 'dequeue result', 17, true);
    drawing += card(
      24,
      576,
      672,
      'Proactor / completion dispatcher',
      'Invokes the handler associated with that request.',
      true,
      128,
    );
    drawing += arrow('M360 704V798') + text(376, 758, 'completion callback', 17, true);
    drawing += card(
      24,
      800,
      672,
      'Completion handler consumes the result',
      'Checks count and status; updates protocol state; may initiate next I/O.',
      false,
      128,
    );
    drawing += text(
      40,
      900,
      'The requested operation is complete; the whole transfer may not be.',
      17,
      true,
    );
    drawing += text(
      24,
      1012,
      'Arrows: submit operation, enqueue result, and dispatch its completion.',
      18,
      true,
    );
    drawing += text(
      24,
      1050,
      'The handler receives an outcome rather than performing the original read.',
      17,
      true,
    );
  }
  return svg(
    'Proactor operation completion',
    completionDescription,
    phone ? 360 : 720,
    phone ? 1256 : 1104,
    drawing,
  );
}
function lifetime(phone) {
  let drawing = text(
    24,
    34,
    phone ? 'Cancel is not complete' : 'Retain request state until its terminal result is consumed',
    phone ? 22 : 24,
  );
  if (phone) {
    drawing += card(
      24,
      112,
      312,
      'A and B request up to 8 bytes',
      'Two retained request slots.',
      false,
      128,
      true,
    );
    drawing += arrow('M180 240V302');
    drawing += card(
      24,
      304,
      312,
      'B completes with ok / 2 bytes',
      'B’s result is queued, not delivered.',
      true,
      144,
      true,
    );
    drawing += text(40, 414, 'A and B still occupy both slots.', 16, true);
    drawing += arrow('M180 448V510');
    drawing += card(
      24,
      512,
      312,
      'Cancellation requested for A',
      'Request state stays retained.',
      false,
      144,
      true,
    );
    drawing += text(40, 622, 'A’s outcome is not yet known.', 17, true);
    drawing += arrow('M180 656V718');
    drawing += card(
      24,
      720,
      312,
      'A completes with hel / 3 bytes',
      'Backend reports success, not cancel.',
      true,
      144,
      true,
    );
    drawing += text(40, 830, 'The read is short; context is intact.', 15, true);
    drawing += arrow('M180 864V926');
    drawing += card(
      24,
      928,
      312,
      'Dispatch B, then A',
      'Handlers receive actual outcomes.',
      true,
      144,
      true,
    );
    drawing += text(40, 1038, 'Zero retained request slots remain.', 15, true);
    drawing += text(24, 1156, 'Arrows: the model’s explicit event trace.', 15, true);
    drawing += text(24, 1196, 'Ordering is a fixture choice, not a rule.', 15, true);
  } else {
    const stages = [
      [
        112,
        '2 retained',
        'Submit A and B / up to 8 bytes each',
        'Both requests retain their own buffer and handler.',
        false,
      ],
      [
        304,
        '2 retained',
        'B completes first with ok / 2 bytes',
        'Its completion is queued; B’s request slot is not released yet.',
        true,
      ],
      [
        496,
        '2 retained',
        'Request cancellation of A',
        'Keep A’s context. Cancellation has not supplied an outcome.',
        false,
      ],
      [
        688,
        '2 retained',
        'A completes successfully with hel / 3 bytes',
        'A’s result still records that cancellation was requested.',
        true,
      ],
      [
        880,
        '0 retained',
        'Dispatch B’s result, then A’s result',
        'Release each pending request as its completion is dispatched.',
        true,
      ],
    ];
    for (const [y, label, title, detail, accent] of stages) {
      drawing += rect(24, y, 144, 128, false, true) + text(40, y + 36, label, 19);
      drawing += card(208, y, 488, title, detail, accent, 128, true);
      if (y < 880) drawing += arrow(`M96 ${y + 128}V${y + 190}`);
    }
    drawing += text(
      24,
      1090,
      'Arrows: the teaching model’s event trace; completion order is not universal.',
      17,
      true,
    );
    drawing += text(
      24,
      1130,
      'Slot retention through dispatch is a model policy, not a native API requirement.',
      16,
      true,
    );
  }
  return svg(
    'Proactor request lifetime and cancellation',
    lifetimeDescription,
    phone ? 360 : 720,
    phone ? 1240 : 1176,
    drawing,
  );
}
const files = [
  ['proactor-completion.svg', completion(false), 720, 1104],
  ['proactor-completion-mobile.svg', completion(true), 360, 1256],
  ['proactor-lifetime.svg', lifetime(false), 720, 1176],
  ['proactor-lifetime-mobile.svg', lifetime(true), 360, 1240],
];
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [file, drawing, width, height] of files) {
  await writeFile(resolve(assets, 'software-engineering', file), drawing);
  manifest['software-engineering/' + file] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Built four editable Proactor SVG variants.');
