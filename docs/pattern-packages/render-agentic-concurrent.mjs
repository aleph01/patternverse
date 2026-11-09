// Original fictional coordination plans, not executed agents, merges, or migrations.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find(
  (p) => p.id === 'agentic-coordinate-concurrent-work',
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

function contract(mobile) {
  const f = fixture.contract;
  const x = mobile ? 20 : 28;
  let b = text(x, 32, 'Isolate files. Share the contract.', mobile ? 20 : 23);
  b += text(x, 68, 'Fictional work areas and integration plan', mobile ? 17 : 19);
  if (mobile) {
    b += rect(20, 106, 320, 151, 'mint') + text(36, 142, 'ERR-1 · shared contract', 21, 'accent');
    b += lines(
      36,
      184,
      [f.endpoint, 'row: 2 · quantity_nonnegative', 'Data rows start at 1; no writes'],
      17,
      29,
    );
    b += text(20, 289, 'Both working areas use ERR-1', 19);
    b += rect(20, 312, 320, 131, 'boundary') + text(36, 348, 'W-F · frontend F1', 22, 'accent');
    b += lines(
      36,
      390,
      ['Separate files + synthetic state', 'Rendering + consumer checks'],
      18,
      30,
    );
    b += rect(20, 490, 320, 131, 'boundary') + text(36, 526, 'W-B · backend B1', 22, 'accent');
    b += lines(36, 568, ['Separate files + synthetic state', 'Endpoint + provider checks'], 18, 30);
    b += path('M20 379H8V910h12m-6 -5l6 5l-6 5');
    b += down(180, 633);
    b += rect(20, 675, 320, 108) + text(36, 712, 'I-B: integrate B1 if compatible', 18);
    b += text(36, 753, 'Preserve existing clients', 19);
    b += down(180, 795);
    b +=
      rect(20, 837, 320, 146, 'mint') + text(36, 874, 'I-BF: add F1; check together', 18, 'accent');
    b += lines(
      36,
      916,
      ['Actual endpoint → screen: row 2', 'P100 stays 4; retain regressions'],
      17,
      31,
    );
    b += lines(
      20,
      1033,
      ['Assigned integrator owns evidence.', 'Arrows: integration prerequisites'],
      17,
      32,
    );
    return svg(
      360,
      1097,
      'Separate frontend and backend work under one versioned contract',
      'Fictional ERR-1 is used by separate W-F and W-B working areas. B1 may integrate first if compatible with existing clients; F1 then combines against that state. An assigned integrator verifies actual row 2 display and unchanged P100:4.',
      b,
    );
  }
  b +=
    rect(28, 107, 664, 145, 'mint') +
    text(44, 145, 'ERR-1 · shared before implementation', 22, 'accent');
  b += lines(
    44,
    187,
    [
      f.endpoint + ' → row: 2, code: quantity_nonnegative',
      'One-based data rows; header excluded; preview writes nothing',
    ],
    18,
    33,
  );
  b += down(186, 264) + down(534, 264);
  b += rect(28, 305, 316, 180, 'boundary') + text(44, 344, 'W-F · frontend F1', 22, 'accent');
  b += lines(
    44,
    391,
    ['Separate files + synthetic state', 'Rendering', 'Consumer checks against ERR-1'],
    17,
    34,
  );
  b += rect(376, 305, 316, 180, 'boundary') + text(392, 344, 'W-B · backend B1', 22, 'accent');
  b += lines(
    392,
    391,
    ['Separate files + synthetic state', 'Endpoint', 'Provider checks against ERR-1'],
    17,
    34,
  );
  b += path('M186 497v18H12v243h16m-6 -5l6 5l-6 5');
  b += down(534, 497);
  b += rect(28, 539, 664, 108) + text(44, 577, 'I-B: integrate B1 if additive and compatible', 22);
  b += text(44, 619, 'Verify existing clients before building on this shared base.', 20);
  b += down(360, 659, 27);
  b +=
    rect(28, 704, 664, 126, 'mint') +
    text(44, 742, 'I-BF: combine F1 against I-B; verify the actual path', 21, 'accent');
  b += text(44, 784, 'Endpoint → screen shows row 2; P100 stays 4; regressions checked.', 18);
  b += text(28, 882, 'Assigned integrator owns combined evidence and unresolved questions.', 18);
  b += text(28, 924, 'Arrows: contract/integration prerequisites, not a timing scale', 18);
  return svg(
    720,
    956,
    'Two isolated working areas converge through deliberate integration',
    'The same fictional ERR-1 governs frontend F1 and backend B1. The integration sequence is conditional on B1 preserving clients. The integrator checks the combined path and unchanged state rather than treating separate working areas as compatibility proof.',
    b,
  );
}

function identity(mobile) {
  const f = fixture.identity;
  const x = mobile ? 20 : 28;
  let b = text(x, 32, 'Different files. Conflicting identity.', mobile ? 19 : 23);
  b += text(x, 68, 'Fictional schematic declarations, one baseline', mobile ? 15 : 19);
  if (mobile) {
    b += rect(20, 106, 320, 186, 'pending') + text(36, 143, 'A · products.schema', 22);
    b += lines(
      36,
      185,
      ['− identity: sku', '+ identity: product_id', '+ sku: editable_label'],
      20,
      34,
    );
    b += rect(20, 338, 320, 157, 'pending') + text(36, 375, 'B · stock.schema', 22);
    b += lines(36, 417, ['− product_ref: sku', '+ product_ref: immutable_sku'], 18, 34);
    b += text(20, 545, 'No overlapping lines by construction.', 17);
    b += rect(20, 574, 320, 153) + text(36, 611, 'Same product PR-7', 22);
    b += lines(
      36,
      654,
      ['SKU changes: P100 → P101', 'product_id remains PR-7', 'Stock keeps reference P100'],
      18,
      30,
    );
    b += rect(20, 773, 320, 136, 'pending') + text(36, 810, 'P100 no longer matches P101', 18);
    b += lines(36, 851, ['Constraint rejects rename, or', 'stock reference is unresolved'], 18, 30);
    b +=
      rect(20, 955, 320, 108, 'mint') + text(36, 992, 'Hold for a shared decision', 21, 'accent');
    b += text(36, 1033, 'Choose identity; align references.', 17);
    b += text(20, 1113, 'Clean text ≠ compatible data model', 18);
    return svg(
      360,
      1145,
      'Non-overlapping schema changes disagree about product identity',
      'Fictional products.schema makes SKU editable under product_id; stock.schema requires immutable SKU references. PR-7 changes label P100 to P101 while stock retains P100. Both proposals require a shared model decision, not merely text-conflict resolution.',
      b,
    );
  }
  b += rect(28, 107, 316, 220, 'pending') + text(44, 146, 'A · ' + f.proposal_a.file, 22);
  b += lines(
    44,
    192,
    ['− identity: sku', '+ identity: product_id', '+ sku: editable_label'],
    20,
    38,
  );
  b += rect(376, 107, 316, 220, 'pending') + text(392, 146, 'B · ' + f.proposal_b.file, 22);
  b += lines(392, 192, ['− product_ref: sku', '+ product_ref:', 'immutable_sku'], 20, 38);
  b += text(28, 379, 'Different files; no overlapping lines by construction.', 21);
  b += rect(28, 424, 664, 140) + text(44, 462, 'Same product PR-7; product_id unchanged', 22);
  b += lines(44, 505, ['Editable SKU: P100 → P101', 'Stock reference remains P100'], 21, 33);
  b +=
    rect(28, 611, 664, 112, 'pending') +
    text(44, 649, 'P100 no longer matches the product SKU P101', 22);
  b += text(
    44,
    691,
    'A constraint may reject the rename; otherwise the reference is unresolved.',
    17,
  );
  b +=
    rect(28, 770, 664, 101, 'mint') +
    text(44, 808, 'Hold both proposals for a shared identity decision', 22, 'accent');
  b += text(44, 849, 'Then align references, migration compatibility, and checks.', 20);
  b += text(28, 921, 'Schematic proposals only; no migration or merge experiment executed.', 18);
  return svg(
    720,
    953,
    'A clean textual combination can still contain a semantic conflict',
    'Two fictional schema proposals from the same baseline disagree about mutable SKU labels and immutable SKU references. The unchanged product ID PR-7 and renamed SKU expose the mismatch. The declarations are schematic, not an applied migration or a particular schema language.',
    b,
  );
}

function sequence(mobile) {
  const f = fixture.sequence;
  const x = mobile ? 20 : 28;
  let b = text(x, 32, 'Choose a sequence when edits are coupled', mobile ? 17 : 23);
  b += text(x, 68, 'Same offset fix + rename; fictional change labels', mobile ? 15 : 19);
  if (mobile) {
    b += rect(20, 106, 320, 100) + text(36, 143, 'dataIndex 1 must report row 2', 19);
    b += text(36, 184, 'Current +2 gives 3; correct +1 gives 2', 16);
    b += text(20, 257, 'Parallel option: same BASE-H', 21);
    b += rect(20, 285, 320, 66) + text(36, 325, f.module, 22);
    b += path('M180 363v13H94v18m-5 -6l5 6l5 -6') + path('M180 376H266v18m-5 -6l5 6l5 -6');
    b += rect(20, 412, 148, 101, 'pending') + text(36, 449, 'Fix body', 20);
    b += text(36, 490, '+2 → +1', 20);
    b += rect(192, 412, 148, 101, 'pending') + text(208, 449, 'Rename', 20);
    b += text(208, 490, 'Old body +2', 17);
    b += path('M94 525v18H180v18m-5 -6l5 6l5 -6') + path('M266 525v18H180');
    b += rect(20, 579, 320, 110, 'pending') + text(36, 616, 'Reconcile name, body, callers', 18);
    b += text(36, 657, 'Neither isolated edit proves both.', 17);
    b += text(20, 741, 'Selected sequence from BASE-H', 20, 'accent');
    b += rect(20, 770, 320, 90, 'mint') + text(36, 807, 'A1: fix offset + checks', 21, 'accent');
    b += text(36, 842, 'dataIndex + 1', 19);
    b += down(180, 872);
    b += rect(20, 913, 320, 118, 'mint') + text(36, 950, 'A2: rename from A1', 21, 'accent');
    b += lines(36, 989, [f.old_helper + ' →', f.new_helper], 19, 29);
    b += rect(20, 1077, 320, 100) + text(36, 1114, 'Verify through the renamed caller', 17);
    b += text(36, 1155, 'dataIndex 1 → row 2', 21);
    b += text(20, 1227, 'Arrows: dependencies, not durations', 17);
    return svg(
      360,
      1259,
      'Sequence the header-offset fix before the helper rename',
      'The fictional parallel layout forks a body fix and rename from BASE-H, requiring reconciliation. The selected sequence fixes the offset in A1 then renames from that base in A2. Both plans retain the same requested changes and expected row 2, with no timing claim.',
      b,
    );
  }
  b +=
    rect(28, 107, 664, 101) + text(44, 145, 'Same expectation: dataIndex 1 must report row 2', 22);
  b += text(44, 186, 'Current +2 gives 3; corrected +1 gives 2 · import-errors.ts', 20);
  b += text(28, 262, 'Parallel option', 22) + text(376, 262, 'Selected sequence', 22, 'accent');
  b += rect(28, 291, 316, 70) + text(44, 334, 'BASE-H', 22);
  b += rect(376, 291, 316, 70) + text(392, 334, 'BASE-H', 22);
  b += path('M186 373v12H102v18m-5 -6l5 6l5 -6') + path('M186 385H270v18m-5 -6l5 6l5 -6');
  b +=
    rect(28, 421, 148, 100, 'pending') +
    text(44, 458, 'Fix body', 20) +
    text(44, 498, '+2 → +1', 20);
  b +=
    rect(196, 421, 148, 100, 'pending') +
    text(212, 458, 'Rename', 20) +
    text(212, 498, 'Old body +2', 17);
  b += path('M102 533v15H186v18m-5 -6l5 6l5 -6') + path('M270 533v15H186');
  b += rect(28, 584, 316, 111, 'pending') + text(44, 622, 'Reconcile both edits', 21);
  b += text(44, 664, 'Name, body, and callers', 19);
  b += down(534, 373);
  b +=
    rect(376, 414, 316, 90, 'mint') +
    text(392, 451, 'A1: fix offset + checks', 21, 'accent') +
    text(392, 486, 'dataIndex + 1', 19);
  b += down(534, 516);
  b += rect(376, 557, 316, 138, 'mint') + text(392, 594, 'A2: rename from A1', 21, 'accent');
  b += lines(392, 635, [f.old_helper + ' →', f.new_helper], 19, 31);
  b +=
    rect(28, 744, 664, 102) +
    text(44, 782, 'Final evidence: renamed helper through its relevant caller', 21);
  b += text(44, 824, 'dataIndex 1 → row 2; both requested edits retained', 20);
  b += text(28, 896, 'Arrows: dependency structure, not a timing scale or speedup claim', 18);
  return svg(
    720,
    928,
    'Compare parallel reconciliation with a chosen sequential dependency',
    'Both fictional layouts preserve the offset correction and internal rename in import-errors.ts. Parallel copies need reconciliation; the selected sequence carries the corrected body into the renamed helper. Final caller evidence remains required, without a performance claim.',
    b,
  );
}

await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['contract', contract],
  ['identity', identity],
  ['sequence', sequence],
]) {
  for (const mobile of [false, true]) {
    const filename = `concurrent-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered six original concurrent-work illustrations and registered their dimensions.');
