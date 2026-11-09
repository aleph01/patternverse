// Original evidence-grounded explanation illustrations; source cases and labels are fictional.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find(
  (p) => p.id === 'agentic-make-changes-understandable',
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
function trace(mobile) {
  const f = fixture.storage.trace;
  if (f.after_confirmation.P201 !== 3 || f.stale_inventory.P201 !== 5)
    throw new Error('Row-trace reference changed.');
  if (mobile) {
    let b = text(20, 32, 'Trace one row to its write boundary', 19);
    b += text(20, 68, 'Reference functions · initial P100:4', 16);
    let y = 106;
    const add = (title, rows, cls = 'neutral', arrow = false) => {
      const p = panel(20, y, 320, title, rows, cls, 17, 20);
      b += p.markup;
      y += p.height;
      if (arrow) {
        b += down(180, y + 12);
        y += 65;
      }
    };
    add(
      'parse_rows · P201,3',
      ['Logical data row 1', 'quantity_text is the string "3".'],
      'neutral',
      true,
    );
    add(
      'validate_rows',
      ['Whole, nonnegative quantity', 'Normalize to integer 3.'],
      'neutral',
      true,
    );
    add(
      'preview_import',
      ['Retain source; show P201:3.', 'No inventory writes: only P100:4.'],
      'neutral',
      true,
    );
    add(
      'confirm_import',
      [
        'Re-parse and validate source.',
        'Check P201 absent in transaction.',
        'Commit → fresh P100:4; P201:3',
      ],
      'mint',
    );
    y += 46;
    add(
      'Contrast · change 3 to −1',
      ['Row 1: quantity_nonnegative', 'Direct confirmation rejects.', '0 writes; only P100:4.'],
      'pending',
    );
    y += 46;
    add(
      'Contrast · valid preview is stale',
      [
        'Another write creates P201:5.',
        'Confirmation rejects sku_exists.',
        'P100:4 and P201:5 remain.',
      ],
      'pending',
    );
    y += 50;
    b += text(20, y, 'Arrows: inspected data/control path', 16);
    return svg(
      360,
      y + 34,
      'Concrete input, code responsibilities and state observations',
      'P201 quantity text is normalized to integer 3, previewed without writes, then revalidated and checked against current inventory before commit. Separate negative and stale-state contrasts explain rejection and retained state. The functions are teaching references, not actual application routes.',
      b,
    );
  }
  let b = text(28, 32, 'Follow P201 through inspectable responsibilities', 23);
  b += text(28, 68, 'Reference functions · create-only · each scenario starts at P100:4', 18);
  b += panel(28, 106, 204, 'CSV input', ['P201,3', 'Logical data row 1'], 'neutral', 17, 21).markup;
  b += panel(
    258,
    106,
    204,
    'parse_rows',
    ['SKU: P201', 'Quantity text: "3"'],
    'neutral',
    17,
    21,
  ).markup;
  b += panel(
    488,
    106,
    204,
    'validate_rows',
    ['Whole; nonnegative', 'Integer quantity: 3'],
    'neutral',
    16,
    21,
  ).markup;
  b += path('M232 180h26m-6 -5l6 5l-6 5') + path('M462 180h26m-6 -5l6 5l-6 5');
  b += text(
    28,
    292,
    'Arrows follow inspected data and control responsibility, not every path.',
    18,
  );
  b += panel(
    28,
    322,
    664,
    'preview_import · read-only inventory path',
    ['Retain source and show P201:3.', 'Observed inventory after preview: P100:4 only.'],
    'neutral',
    19,
    22,
  ).markup;
  b += down(360, 476, 24);
  b += panel(
    28,
    524,
    664,
    'confirm_import · the write boundary',
    [
      'Re-parse retained source, validate, and check current inventory.',
      'P201 must still be absent inside the write transaction.',
      'After commit, fresh read: P100:4; P201:3.',
    ],
    'mint',
    19,
    22,
  ).markup;
  b += panel(
    28,
    742,
    316,
    'Negative-input contrast',
    [
      'Change P201,3 to P201,−1.',
      'Row 1: quantity_nonnegative',
      'Direct confirm: 0 writes.',
      'Fresh: P100:4 only.',
    ],
    'pending',
    17,
    21,
  ).markup;
  b += panel(
    376,
    742,
    316,
    'Stale-preview contrast',
    [
      'Same valid source P201,3.',
      'Other write creates P201:5.',
      'Confirm: sku_exists; 0 writes.',
      'Fresh: P100:4; P201:5.',
    ],
    'pending',
    17,
    21,
  ).markup;
  b += text(
    28,
    990,
    'Authorization, HTTP, token persistence and other inputs remain unverified.',
    18,
  );
  return svg(
    720,
    1024,
    'A row trace exposes preview, confirmation and rejection responsibilities',
    'The same valid P201 row is traced from raw text through validation and read-only preview to confirmation and fresh storage. Negative-input and stale-state comparisons use separate controlled scenarios. Named functions and observed states come from the reference experiment; broader importer behavior remains untested.',
    b,
  );
}
function claim(mobile) {
  const f = fixture.storage.atomicity;
  if (f.observations.X17.all_or_none || !f.observations.T17.all_or_none)
    throw new Error('Expected a refuted claim and corrected reference.');
  if (mobile) {
    let b = text(20, 32, 'Test the claimed transaction boundary', 19);
    b += text(20, 68, 'S17, X17 and T17 are fictional labels.', 16);
    let y = 106;
    const add = (title, rows, cls = 'neutral', arrow = false) => {
      const p = panel(20, y, 320, title, rows, cls, 17, 20);
      b += p.markup;
      y += p.height;
      if (arrow) {
        b += down(180, y + 12);
        y += 65;
      }
    };
    add('Same input and failure point', [
      'Initial P100:4',
      'New rows P201:3 and P202:2',
      'Exception before second write.',
    ]);
    y += 46;
    add(
      'S17 · invented claim',
      ['All rows together or none.', 'Predicted after failure: P100:4.'],
      'pending',
    );
    y += 46;
    add(
      'X17 · inspected incremental loop',
      ['Insert P201, then COMMIT.', 'Next write is not reached.', 'Fresh read: P100:4; P201:3'],
      'pending',
      true,
    );
    add('Source + state refute S17', [
      'An error response is not rollback.',
      'Committed P201 remains stored.',
    ]);
    y += 46;
    add(
      'T17 · corrected reference',
      [
        'BEGIN before the loop.',
        'Same exception → ROLLBACK.',
        'Commit belongs after both writes.',
        'Fresh read: only P100:4.',
      ],
      'mint',
    );
    y += 50;
    b += text(20, y, 'Arrow: observed behavior informs correction.', 15);
    y += 32;
    b += text(20, y, 'No crash, disk-failure or concurrency proof.', 15);
    return svg(
      360,
      y + 34,
      'An invented atomicity claim is challenged by a matched failure',
      'S17 predicts no partial state, but X17 explicitly commits each row and leaves P201 stored before the second write fails. Corrected T17 places the same writes in one transaction and retains baseline after the same exception. Experiments concern one explicit controlled failure point.',
      b,
    );
  }
  let b = text(28, 32, 'Compare the explanation with persisted state', 23);
  b += text(28, 68, 'S17/X17/T17 are fictional labels · same rows and injected exception', 18);
  b += panel(
    28,
    106,
    664,
    'Shared fixture',
    [
      'Initial P100:4; valid new rows P201:3 and P202:2.',
      'Controlled exception before the second write.',
    ],
    'neutral',
    20,
    22,
  ).markup;
  b +=
    text(28, 302, 'S17 · claim, not evidence', 21) +
    text(376, 302, 'X17 · inspected + observed', 21);
  b += panel(28, 330, 316, 'Before', ['P100:4'], 'neutral', 19, 22).markup;
  b += panel(376, 330, 316, 'Before', ['P100:4'], 'neutral', 19, 22).markup;
  b += down(186, 452, 24) + down(534, 452, 24);
  b +=
    text(44, 518, 'Failure before write 2', 18) + text(392, 518, 'COMMIT P201, then failure', 18);
  b += panel(
    28,
    550,
    316,
    'Claimed after failure',
    ['P100:4 only', 'No partial inventory'],
    'pending',
    18,
    21,
  ).markup;
  b += panel(
    376,
    550,
    316,
    'Observed after failure',
    ['P100:4; P201:3', 'First row stayed committed.'],
    'pending',
    18,
    21,
  ).markup;
  b += panel(
    28,
    736,
    664,
    'T17 · actual single-transaction reference',
    [
      'BEGIN → insert P201 → same failure → ROLLBACK.',
      'Fresh read: P100:4 only. Commit is after both successful inserts.',
      'Update the code and the explanation; keep the same failure probe.',
    ],
    'mint',
    19,
    22,
  ).markup;
  b += text(28, 952, 'Lane arrows: execution order to predicted or observed state.', 18);
  b += text(28, 990, 'One controlled exception is not a general failure-safety certificate.', 18);
  return svg(
    720,
    1024,
    'Code and fresh reads refute an invented all-or-nothing summary',
    'The predicted and observed lanes share the initial inventory, two valid rows and failure location. The incremental X17 helper commits P201 before failure; the T17 reference explicitly rolls back the same failure within one batch transaction. Lane arrows show execution order, not revision ancestry.',
    b,
  );
}
function scope(mobile) {
  if (fixture.contract.interface.observations.length !== 2)
    throw new Error('Expected both envelope versions.');
  if (mobile) {
    let b = text(20, 32, 'Explain the boundary that changed', 20);
    b += text(20, 68, 'Same displayed result: data row 2', 16);
    let y = 106;
    const add = (title, rows, cls = 'neutral') => {
      const p = panel(20, y, 320, title, rows, cls, 17, 20);
      b += p.markup;
      y += p.height + 46;
    };
    add(
      'Local correction',
      [
        'index + 2 → index + 1',
        'Index 1: row 3 → row 2',
        'Checks: 0→1 and 1→2',
        'Wire contract is unchanged.',
      ],
      'mint',
    );
    add(
      'Separate interface proposal',
      [
        'v1: row = 2',
        'v2: data_index = 1',
        'Both refer to logical data rows.',
        'ADR-17 status: proposed.',
      ],
      'neutral',
    );
    add(
      'Transition decoder',
      [
        'v1 row 2 → canonical index 1',
        'v2 index 1 → canonical index 1',
        'Unknown-version fixture rejected.',
      ],
      'mint',
    );
    add('Declared consumers', [
      'Web: Data row 2',
      'CLI: row 2',
      'Saved preview: dataIndex 1',
      'Code: quantity_nonnegative',
    ]);
    add(
      'Different explanatory scope',
      [
        'Local fix: rule, location, checks.',
        'Interface: meaning and callers.',
        'State compatibility and decision status.',
        'Deployed clients remain untested.',
      ],
      'pending',
    );
    b += text(20, y + 4, 'Arrows in labels: conversion, not chronology', 15);
    return svg(
      360,
      y + 38,
      'Proportionate explanation distinguishes local and cross-component changes',
      'The local correction changes only display offset and retains the wire contract. A separate proposed versioned interface changes row representation and requires explicit producer meaning, three consumers and transition decoding. Reference outputs agree on displayed row 2 without proving deployed compatibility.',
      b,
    );
  }
  let b = text(28, 32, 'A local correction and an interface change need different evidence', 22);
  b += text(28, 68, 'Same negative second data record · same intended displayed row 2', 18);
  b += panel(
    28,
    106,
    316,
    'Local correction',
    [
      'index + 2 → index + 1',
      'Index 1: row 3 → row 2',
      'Checks: 0→1 and 1→2',
      'Wire contract unchanged.',
    ],
    'mint',
    18,
    22,
  ).markup;
  b += panel(
    376,
    106,
    316,
    'Separate interface proposal',
    [
      'v1 errors[0].row = 2',
      'v2 errors[0].data_index = 1',
      'Logical rows; header excluded',
      'ADR-17: proposed, not accepted',
    ],
    'neutral',
    16,
    20,
  ).markup;
  b += text(
    28,
    354,
    'Explanation follows the changed responsibility, not a word-count target.',
    18,
  );
  b += panel(
    28,
    386,
    664,
    'Transition decoder · preserve interpretation',
    [
      'v1 row 2 OR v2 data_index 1 → canonical dataIndex 1.',
      'Name producer assumptions, affected callers and compatibility limits.',
    ],
    'mint',
    19,
    22,
  ).markup;
  b += down(360, 540, 24);
  b += text(28, 606, 'Reference consumers of the same version-1 and version-2 fixtures', 18);
  b += panel(
    28,
    634,
    204,
    'Web renderer',
    ['Data row 2', 'Code retained'],
    'neutral',
    18,
    20,
  ).markup;
  b += panel(258, 634, 204, 'CLI formatter', ['row 2', 'Code retained'], 'neutral', 18, 20).markup;
  b += panel(
    488,
    634,
    204,
    'Saved reader',
    ['dataIndex 1', 'Code retained'],
    'neutral',
    18,
    20,
  ).markup;
  b += text(28, 818, 'Code: quantity_nonnegative. The exercised unknown version is rejected.', 18);
  b += text(28, 856, 'Arrow: decoded error reaches consumers; deployed clients are untested.', 18);
  return svg(
    720,
    890,
    'Explanatory scope follows interface consequences rather than prose length',
    'A small display correction needs a rule and focused checks. The separate interface proposal preserves displayed row 2 while changing v1 row to v2 data_index; it therefore identifies decision status, producer semantics and three consumers. Checks use reference functions and do not execute a real migration.',
    b,
  );
}
await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['trace', trace],
  ['claim', claim],
  ['scope', scope],
]) {
  for (const mobile of [false, true]) {
    const filename = `understand-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered six original understandable-change SVGs and registered their dimensions.');
