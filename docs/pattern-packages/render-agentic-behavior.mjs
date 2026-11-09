// Original complete-behavior illustrations: proposed journeys and bounded SQLite/contract reference evidence.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find(
  (p) => p.id === 'agentic-verify-the-complete-behavior',
).examples;
const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (x, y, value, size = 20, cls = '') =>
  `<text x="${x}" y="${y}" font-size="${size}"${cls ? ` class="${cls}"` : ''}>${esc(value)}</text>`;
const rect = (x, y, width, height, cls = 'neutral') =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" class="${cls}"/>`;
const path = (d, cls = 'line') => `<path d="${d}" class="${cls}"/>`;
const svg = (
  width,
  height,
  title,
  desc,
  body,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-agentic-style="light-editorial">
<title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc>
<style>
:root{color-scheme:only light;--paper:#fff;--ink:#252c28;--secondary:#a6aca3;--neutral:#f1f2ef;--mint:#edf5f0;--accent:#00855b}
svg{background:#fff;color:var(--ink)}
text{fill:var(--ink);font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}
path,rect,circle{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:butt}
.paper{fill:var(--paper)}.neutral{fill:var(--neutral)}.mint{fill:var(--mint);stroke:var(--accent);stroke-width:1}
.fine{fill:none;stroke:var(--secondary);stroke-width:1}.line{fill:none;stroke:var(--ink);stroke-width:1.1}
.accent{fill:var(--accent)}.boundary{fill:none;stroke:var(--accent);stroke-width:1.3}
.pending{fill:none;stroke:var(--ink);stroke-width:1.1;stroke-dasharray:5 4}
</style><rect width="${width}" height="${height}" class="paper"/>${body}</svg>\n`;

const lines = (x, y, values, size = 19, step = 32, cls = '') =>
  values.map((value, i) => text(x, y + i * step, value, size, cls)).join('');
const down = (x, y, length = 24) => path(`M${x} ${y}v${length}m-5 -6l5 6l5 -6`);

function panel(x, y, w, title, rows, cls = 'neutral', font = 18, titleSize = 21, minHeight = 0) {
  const height = Math.max(76 + rows.length * 32, minHeight);
  return {
    height,
    markup:
      rect(x, y, w, height, cls) +
      text(x + 16, y + 36, title, titleSize, cls === 'mint' ? 'accent' : '') +
      lines(x + 16, y + 78, rows, font, 32),
  };
}
function journey(mobile) {
  const f = fixture.journey;
  if (mobile) {
    let b = text(20, 32, 'Follow confirmation into stored state', 19);
    b += text(20, 68, 'Planned browser journey · reference DB checks', 15);
    let y = 106;
    let p = panel(
      20,
      y,
      320,
      'Isolated baseline per scenario',
      ['P100: 4; no imported products', 'Preview must not write.'],
      'neutral',
      17,
      19,
    );
    b += p.markup;
    y += p.height + 46;
    b += text(20, y, 'Valid file · two new products', 20, 'accent');
    y += 28;
    p = panel(
      20,
      y,
      320,
      '1 · Upload → preview',
      ['P201: 3; P202: 2 shown', 'Storage still P100: 4'],
      'neutral',
      18,
      21,
    );
    b += p.markup;
    y += p.height + 12;
    b += down(180, y);
    y += 41;
    p = panel(
      20,
      y,
      320,
      '2 · Confirm → storage',
      ['POST /imports/confirm', 'Persist P100:4, P201:3, P202:2'],
      'mint',
      17,
      21,
    );
    b += p.markup;
    y += p.height + 12;
    b += down(180, y);
    y += 41;
    p = panel(
      20,
      y,
      320,
      '3 · Reload → fresh read',
      [f.read_endpoint, 'Storage → response → render', 'Same three products required'],
      'mint',
      18,
      21,
    );
    b += p.markup;
    y += p.height + 46;
    p = panel(
      20,
      y,
      320,
      'Invalid file · separate baseline',
      [
        'Upload P201,3 then P202,-1',
        'Preview: row 2 error',
        'quantity_nonnegative',
        'Confirm: reject; no writes',
        'Fresh read: only P100: 4',
      ],
      'pending',
      17,
      18,
    );
    b += p.markup;
    y += p.height + 50;
    b += text(20, y, 'Arrows: planned verification sequence', 16);
    y += 33;
    b += text(20, y, 'Reload must cause a fresh storage read.', 16);
    return svg(
      360,
      y + 32,
      'Planned browser journeys include the persistence and reload boundary',
      'Both scenarios start separately from P100:4. The valid path previews, confirms, persists, reloads and reads three products. The invalid path requires a row-2 error, server rejection and unchanged state. Only SQLite reference state checks were executed, not the proposed browser journeys.',
      b,
    );
  }
  let b = text(28, 32, 'Confirmation is not complete at the success display', 23);
  b += text(
    28,
    68,
    'Planned browser journeys · storage outcomes checked in a SQLite reference',
    18,
  );
  const seed = panel(
    28,
    106,
    664,
    'Separate isolated baseline for each scenario',
    ['Stored P100: 4 · preview writes nothing · existing stock must remain.'],
    'neutral',
    20,
    22,
  );
  b += seed.markup;
  b += text(28, 260, 'Valid file', 22, 'accent') + text(376, 260, 'Invalid file', 22);
  const ys = [289, 482, 675];
  const left = [
    ['1 · Upload → preview', ['P201: 3; P202: 2 shown', 'Stored inventory still P100: 4']],
    ['2 · Confirm → storage', ['POST /imports/confirm', 'P100:4, P201:3, P202:2']],
    [
      '3 · Reload → fresh read',
      ['GET /inventory → storage', 'Response renders all three products'],
    ],
  ];
  const right = [
    ['1 · Upload → preview', ['P201: 3; P202: −1', 'Row 2: quantity_nonnegative']],
    ['2 · Reject confirmation', ['Block normal confirm; reject at server', 'No inventory writes']],
    ['3 · Reload → fresh read', ['GET /inventory → storage', 'Response shows only P100: 4']],
  ];
  ys.forEach((y, i) => {
    b += panel(
      28,
      y,
      316,
      left[i][0],
      left[i][1],
      i ? 'mint' : 'neutral',
      17,
      i === 2 ? 20 : 21,
    ).markup;
    b += panel(
      376,
      y,
      316,
      right[i][0],
      right[i][1],
      i ? 'pending' : 'neutral',
      17,
      i === 2 ? 20 : 21,
    ).markup;
    if (i < 2) b += down(186, y + 152) + down(534, y + 152);
  });
  b += text(
    28,
    869,
    'A fresh read must cross storage; a cached screen cannot establish persistence.',
    18,
  );
  b += text(28, 911, 'Arrows: required verification sequence, not an executed browser trace', 18);
  return svg(
    720,
    943,
    'Trace a valid and invalid import through storage and a fresh reload read',
    'The same create-only contract requires persisted new products after confirmation and unchanged baseline after invalid confirmation. The two scenarios use isolated initial state. The diagram specifies the complete browser path; executed SQLite probes establish only the reference storage outcomes.',
    b,
  );
}
function contract(mobile) {
  const f = fixture.contract;
  if (mobile) {
    let b = text(20, 32, 'Passing parts can miss one field', 20);
    b += text(20, 68, 'PV7 · serializer/handler reference only', 16);
    let y = 106;
    for (const [title, rows, cls, titleSize] of [
      [
        'Same preview and endpoint',
        [f.endpoint, 'PV7 contains the valid two-row file.'],
        'neutral',
        19,
      ],
      [
        'Frontend check: PASS',
        ['Sends {import_id: "PV7"}', 'Mock ignores body → success'],
        'pending',
        21,
      ],
      [
        'Backend check: PASS',
        ['Fixture {preview_id: "PV7"}', 'Expected handler → success'],
        'neutral',
        21,
      ],
    ]) {
      const p = panel(20, y, 320, title, rows, cls, 17, titleSize);
      b += p.markup;
      y += p.height + 46;
    }
    b += down(180, y - 34);
    y += 7;
    let p = panel(
      20,
      y,
      320,
      'Connect the actual shapes',
      ['Sent key: import_id', 'Required key: preview_id', 'Reference: 400', 'preview_id_required'],
      'mint',
      18,
      19,
    );
    b += p.markup;
    y += p.height + 46;
    p = panel(
      20,
      y,
      320,
      'Correct only the request field',
      [
        '{preview_id: "PV7"} → 200',
        'Then verify the real write, reload,',
        'fresh read, and error presentation.',
      ],
      'mint',
      17,
      18,
    );
    b += p.markup;
    y += p.height + 50;
    b += text(20, y, 'Arrow: omitted contract boundary', 17);
    y += 33;
    b += text(20, y, 'No browser HTTP journey was executed.', 16);
    return svg(
      360,
      y + 32,
      'A mismatched request field is hidden by passing isolated fixtures',
      'A frontend mock ignores import_id while a backend fixture uses preview_id. Connecting the serializer shape to the handler reference exposes 400 preview_id_required; correcting the field produces reference 200. Real network, state, and UI behavior remain to be verified.',
      b,
    );
  }
  let b = text(28, 32, 'Join the request shape the browser actually sends', 23);
  b += text(28, 68, 'Same PV7 and confirmation endpoint · reference calculations only', 19);
  b += panel(
    28,
    106,
    664,
    f.endpoint,
    ['Preview PV7 represents the same valid P201:3 and P202:2 input.'],
    'neutral',
    20,
    22,
  ).markup;
  b += panel(
    28,
    264,
    316,
    'Frontend check: PASS',
    ['Sends {import_id: "PV7"}', 'Mock ignores body → success'],
    'pending',
    18,
    21,
  ).markup;
  b += panel(
    376,
    264,
    316,
    'Backend check: PASS',
    ['Fixture {preview_id: "PV7"}', 'Actual required key → success'],
    'neutral',
    17,
    21,
  ).markup;
  b += path('M186 416v14H360v18m-5 -6l5 6l5 -6') + path('M534 416v14H360');
  b += panel(
    28,
    466,
    664,
    'Connected shapes expose the mismatch',
    [
      'Sent: {import_id: "PV7"}; handler requires preview_id',
      'Reference result: 400 · preview_id_required',
      'Real UI must show failure; rejection must leave storage unchanged.',
    ],
    'mint',
    19,
    22,
  ).markup;
  b += panel(
    28,
    684,
    664,
    'Correct only the field: {preview_id: "PV7"} → reference 200',
    [
      'Then repeat the actual confirmation, write, reload, and fresh read.',
      'Keep the focused contract check for diagnosis.',
    ],
    'mint',
    19,
    21,
  ).markup;
  b += text(28, 876, 'Arrows: omitted request-contract boundary, not a live HTTP trace', 18);
  b += text(
    28,
    910,
    'Passing reference 200 is not evidence of persistent or user-visible completion.',
    18,
  );
  return svg(
    720,
    942,
    'The frontend mock and backend fixture pass with incompatible field names',
    'The same preview token and endpoint are held fixed. A mock accepts the serializer’s import_id body while the backend fixture supplies preview_id. Connecting the shapes exposes the missing field; a corrected field still needs the full application path verified.',
    b,
  );
}
function interruption(mobile) {
  const f = fixture.interruption;
  if (mobile) {
    let b = text(20, 32, 'Interrupt at a specified boundary', 20);
    b += text(20, 68, 'J1 · executed SQLite reference probe', 17);
    let y = 106;
    let p = panel(
      20,
      y,
      320,
      'Selected policy: all or nothing',
      ['Initial inventory P100: 4', 'J1 is recorded as running.'],
      'neutral',
      18,
      18,
    );
    b += p.markup;
    y += p.height + 46;
    p = panel(
      20,
      y,
      320,
      'Worker transaction',
      ['BEGIN; stage P201: 3', 'No COMMIT; P202 not written.'],
      'neutral',
      18,
      21,
    );
    b += p.markup;
    y += p.height + 12;
    b += down(180, y);
    y += 57;
    b += text(20, y, 'Terminate worker before commit', 18, 'accent');
    y += 28;
    p = panel(
      20,
      y,
      320,
      'Fresh read after termination',
      ['Only P100: 4 remains.', 'J1 still says running.', 'Reconcile the stale job status.'],
      'mint',
      18,
      19,
    );
    b += p.markup;
    y += p.height + 12;
    b += down(180, y);
    y += 41;
    p = panel(
      20,
      y,
      320,
      'Controlled retry: one commit',
      [
        'P100:4, P201:3, P202:2',
        'J1 completed in same transaction',
        'Fresh connection verifies both.',
      ],
      'mint',
      17,
      19,
    );
    b += p.markup;
    y += p.height + 46;
    p = panel(
      20,
      y,
      320,
      'Still outside this probe',
      [
        'After-commit / before-ack failure',
        'Real queue and message delivery',
        'Batch-prefix policy needs its own',
        'progress and resume expectations.',
      ],
      'pending',
      17,
      20,
    );
    b += p.markup;
    y += p.height + 50;
    b += text(20, y, 'Arrows: observed reference sequence', 16);
    y += 33;
    b += text(20, y, 'Not a power-loss or production test.', 17);
    return svg(
      360,
      y + 32,
      'A pre-commit worker termination preserves the selected atomic inventory policy',
      'The SQLite reference stages P201 then terminates before commit. A fresh connection sees only the baseline and a stale running record. Controlled retry commits both products and completion together. Later acknowledgement ambiguity and external delivery are not tested.',
      b,
    );
  }
  let b = text(28, 32, 'Compare interrupted state with the selected failure policy', 22);
  b += text(28, 68, 'J1 · executed SQLite process-termination reference · one failure point', 19);
  b += panel(
    28,
    106,
    664,
    'Selected policy: all-or-nothing inventory changes',
    ['Initial P100: 4 · J1 is separately recorded as running.'],
    'neutral',
    20,
    22,
  ).markup;
  b += panel(
    28,
    264,
    664,
    'Worker: BEGIN → stage P201: 3',
    ['The row is inside the transaction; no COMMIT and no P202 write yet.'],
    'neutral',
    20,
    22,
  ).markup;
  b += down(360, 384);
  b += text(28, 449, 'Terminate the worker process here, before commit', 22, 'accent');
  b += panel(
    28,
    478,
    664,
    'Observed through a fresh connection',
    [
      'Inventory: only P100: 4 · no partial imported row persisted',
      'J1 status: running — stale; reconciliation remains required.',
    ],
    'mint',
    20,
    22,
  ).markup;
  b += down(360, 630);
  b += panel(
    28,
    671,
    664,
    'Controlled retry: inserts and completion share one commit',
    [
      `Inventory: P100:4, P201:3, P202:2 · ${f.job}: completed`,
      'A new connection verifies both the inventory and completion record.',
    ],
    'mint',
    19,
    21,
  ).markup;
  b += panel(
    28,
    857,
    664,
    'Remaining boundaries',
    [
      'After commit / before acknowledgement requires a separate check.',
      'Real queue and external-message delivery were not exercised.',
      'A batch-prefix policy needs different durable progress and resume rules.',
    ],
    'pending',
    18,
    22,
  ).markup;
  b += text(
    28,
    1081,
    'Arrows: observed reference sequence; no production or power-loss claim.',
    18,
  );
  return svg(
    720,
    1113,
    'One interruption probe checks an explicitly selected all-or-nothing policy',
    'The same J1 inputs are retained across interruption and controlled retry. The process is terminated after its first uncommitted insert; a fresh connection sees no partial inventory. Completion and both products commit together on retry. Queue acknowledgement and other policies remain unverified.',
    b,
  );
}
await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['journey', journey],
  ['contract', contract],
  ['interruption', interruption],
]) {
  for (const mobile of [false, true]) {
    const filename = `behavior-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Rendered six original complete-behavior illustrations and registered their dimensions.',
);
