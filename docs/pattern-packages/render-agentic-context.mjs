// Original fictional context artifacts, not a running memory system or agent report.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find(
  (p) => p.id === 'agentic-keep-context-durable-and-discoverable',
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

function map(mobile) {
  const f = fixture.map;
  const x = mobile ? 20 : 28;
  let b = text(x, 32, 'Task: accept P201,3.5?', mobile ? 21 : 23);
  b += text(x, 68, 'Fictional sources · retrieve the relevant subset', mobile ? 15 : 19);
  if (mobile) {
    b += rect(20, 106, 320, 98) + text(36, 142, f.guide, 22);
    b += text(36, 182, 'Conventions + source links', 19);
    b += down(180, 216);
    b += rect(20, 256, 320, 98, 'mint') + text(36, 292, f.module, 21, 'accent');
    b += text(36, 332, 'Quantity representation', 19);
    b += down(180, 366);
    b +=
      rect(20, 406, 320, 146, 'mint') +
      text(36, 442, `${f.decision_id}: whole-unit stock`, 20, 'accent');
    b += lines(
      36,
      481,
      [
        'Accepted · discrete items',
        'No fractions or silent rounding',
        'Weighed goods: new decision',
      ],
      18,
      29,
    );
    b += path('M20 305H8V653h12m-6 -5l6 5l-6 5');
    b += rect(20, 604, 320, 116, 'mint') + text(36, 641, 'validateProduct + checks', 20, 'accent');
    b += lines(36, 679, ['Inspect fraction rejection', 'Verify current conformance'], 18, 28);
    b += path('M340 155h10v696h-10m6 -5l-6 5l6 5', 'fine');
    b += rect(20, 791, 320, 118) + text(36, 828, f.external, 19);
    b += lines(36, 868, ['Indexed, not retrieved', 'Not needed for this policy task'], 18, 28);
    b += lines(
      20,
      961,
      ['Green: selected sources', 'Arrows: reference links, not execution'],
      17,
      31,
    );
    return svg(
      360,
      1022,
      'Retrieve the inventory policy and relevant code selectively',
      'The fictional project guide links to inventory documentation and an external RowReader reference. Inventory documentation links to accepted INV-01 and current validation checks. Only the inventory subset is selected for the P201,3.5 policy question.',
      b,
    );
  }
  b += rect(28, 107, 664, 98) + text(44, 143, f.guide, 23);
  b += text(44, 183, 'Small shared conventions + links to detailed sources', 20);
  b += path('M360 217v20H186v28m-5 -6l5 6l5 -6');
  b += path('M360 237H534v28m-5 -6l5 6l5 -6', 'fine');
  b += rect(28, 283, 316, 112, 'mint') + text(44, 321, f.module, 21, 'accent');
  b += text(44, 362, 'Quantity representation', 20);
  b += rect(376, 283, 316, 112) + text(392, 321, 'RowReader 2.1.0 reference', 20);
  b += text(392, 362, 'Indexed, not retrieved', 19);
  b += path('M186 407v32H186v28m-5 -6l5 6l5 -6');
  b += path('M186 439H534v28m-5 -6l5 6l5 -6');
  b += rect(28, 485, 316, 168, 'mint') + text(44, 524, 'INV-01: whole-unit stock', 21, 'accent');
  b += lines(
    44,
    566,
    ['Accepted · discrete items', 'No silent rounding', 'Weighed goods: new decision'],
    18,
    30,
  );
  b += rect(376, 485, 316, 168, 'mint') + text(392, 524, 'validateProduct + checks', 21, 'accent');
  b += lines(392, 566, ['Inspect fraction rejection', 'Verify current conformance'], 19, 32);
  b += text(28, 706, 'Green: selected sources · arrows: reference links', 20);
  b += text(28, 748, 'Policy intent and code conformance are separate questions.', 20);
  return svg(
    720,
    780,
    'A small project guide leads to task-specific context',
    'Fictional guide, inventory module, accepted decision INV-01, current validation checks, and external parser reference. The selected subset answers the fraction policy question without loading the parser manual. Links are navigational, not execution arrows.',
    b,
  );
}

function handoff(mobile) {
  const f = fixture.handoff;
  const x = mobile ? 20 : 28;
  let b = text(x, 32, 'Handoff: claims need a state and a source', mobile ? 17 : 22);
  b += text(x, 68, 'Fictional branch, revisions, diff, and results', mobile ? 16 : 19);
  if (mobile) {
    b += rect(20, 106, 320, 126) + text(36, 141, f.branch, 21);
    b += lines(36, 180, ['BASE-E → IMPORT-F', '+ uncommitted PREVIEW-D1'], 19, 30);
    b +=
      rect(20, 279, 320, 142, 'mint') +
      text(36, 315, 'Parser complete for these cases', 18, 'accent');
    b += lines(36, 356, ['IMPORT-F', 'Focused checks: passed'], 20, 32);
    b += rect(20, 467, 320, 240, 'pending') + text(36, 503, 'Preview unfinished', 21);
    b += lines(
      36,
      546,
      [
        'upload.ts + preview.ts',
        'IMPORT-F + PREVIEW-D1',
        'Run H-2: failed',
        'Expected row 2 · observed row 3',
      ],
      18,
      34,
    );
    b += rect(20, 753, 320, 114, 'pending') + text(36, 790, 'Confirmation: unknown', 21);
    b += text(36, 832, 'Save path not wired', 20);
    b += lines(
      20,
      917,
      [
        'Next hypothesis, not a diagnosis:',
        'Header offset applied twice?',
        'Inspect diff; rerun the same case.',
      ],
      18,
      33,
    );
    b += text(20, 1052, 'A note does not back up the code.', 18);
    return svg(
      360,
      1084,
      'A handoff preserves evidence, working changes, and uncertainty',
      'Fictional IMPORT-F parser checks pass. Uncommitted PREVIEW-D1 affects upload.ts and preview.ts, where H-2 reports row 3 instead of row 2. Confirmation is unknown and unwired. Double header offset remains a hypothesis.',
      b,
    );
  }
  b += rect(28, 107, 664, 106) + text(44, 143, f.branch, 23);
  b += text(44, 184, 'BASE-E → IMPORT-F + uncommitted PREVIEW-D1', 21);
  b += text(28, 258, 'Claim', 20) + text(376, 258, 'Inspectable basis', 20);
  b += rect(28, 284, 316, 110, 'mint') + rect(376, 284, 316, 110, 'mint');
  b += text(44, 323, 'Parser complete', 22, 'accent') + text(44, 363, 'For the recorded cases', 19);
  b += text(392, 323, 'IMPORT-F', 22, 'accent') + text(392, 363, 'Focused checks: passed', 20);
  b += path('M350 339h19m-6 -5l6 5l-6 5');
  b += rect(28, 437, 316, 150, 'pending') + rect(376, 437, 316, 150);
  b += text(44, 476, 'Preview unfinished', 22);
  b += lines(44, 517, ['Expected row 2', 'Observed row 3'], 21, 33);
  b += text(392, 476, 'PREVIEW-D1 + IMPORT-F', 20);
  b += lines(392, 517, ['upload.ts + preview.ts', 'Run H-2: failed'], 20, 33);
  b += path('M350 512h19m-6 -5l6 5l-6 5');
  b += rect(28, 635, 664, 100, 'pending') + text(44, 672, 'Confirmation revalidation: unknown', 22);
  b += text(44, 712, 'Save path not wired; no completed integration check.', 20);
  b += text(28, 786, 'Next hypothesis: header offset applied twice?', 21);
  b += text(28, 828, 'Inspect the diff and rerun; a summary is not a diagnosis.', 19);
  b += text(28, 870, 'Arrows link claims to evidence; no release is implied.', 19);
  return svg(
    720,
    902,
    'Tie handoff claims to committed and uncommitted state',
    'A fictional note identifies branch codex/import-preview, base BASE-E, head IMPORT-F, and diff PREVIEW-D1. Parser, failed preview row numbering, and unknown confirmation remain distinct. Arrows identify evidence links, not chronological steps.',
    b,
  );
}

function stale(mobile) {
  const f = fixture.stale;
  const x = mobile ? 20 : 28;
  let b = text(x, 32, 'Repair stale guidance with current evidence', mobile ? 17 : 22);
  b += text(x, 68, 'RowReader · fictional versions and contracts', mobile ? 16 : 19);
  if (mobile) {
    b += rect(20, 105, 320, 102) + text(36, 141, 'Same CSV operation', 21);
    b += text(36, 183, 'sku,quantity / P201,3', 20);
    b += rect(20, 251, 320, 146, 'pending') + text(36, 287, 'Old note: 1.8.0', 21);
    b += lines(36, 330, [f.old_call, 'Assumed list result'], 20, 32);
    b += rect(20, 442, 320, 232, 'mint') + text(36, 479, 'Current evidence: 2.1.0', 21, 'accent');
    b += lines(
      36,
      522,
      [
        'Lockfile + loaded module agree',
        'Vendor contract for 2.1.0',
        'reader.read(text,',
        '{ header: true })',
        'rows + issues; quantity "3"',
      ],
      18,
      31,
    );
    b += down(180, 687);
    b += rect(20, 728, 320, 182, 'mint') + text(36, 765, 'Update the current note', 21, 'accent');
    b += lines(
      36,
      808,
      [
        'Link version + source + scope',
        'Guide → corrected 2.1.0 note',
        'Old signature: historical only',
      ],
      18,
      33,
    );
    b += lines(
      20,
      961,
      ['Product policy still comes from INV-01.', 'API evidence does not expand scope.'],
      17,
      32,
    );
    return svg(
      360,
      1025,
      'Reconcile a stale local note with a specific version contract',
      'For identical fictional CSV input, a stale RowReader 1.8.0 parse note conflicts with 2.1.0 resolution and vendor contract. Correct the active note to read with header true and rows/issues result; retain the old signature only as history. Product policy remains INV-01.',
      b,
    );
  }
  b += rect(28, 106, 664, 90) + text(44, 141, 'Same CSV operation', 21);
  b += text(44, 178, 'sku,quantity / P201,3', 22);
  b += rect(28, 241, 316, 242, 'pending') + text(44, 279, 'Old note: 1.8.0', 22);
  b += lines(44, 325, [f.old_call, 'Assumed list result', 'Historical, not current'], 20, 38);
  b += rect(376, 241, 316, 242, 'mint') + text(392, 279, 'Current evidence: 2.1.0', 21, 'accent');
  b += lines(
    392,
    321,
    [
      'Lockfile + module agree',
      'Vendor 2.1.0 contract',
      'reader.read(text,',
      '{ header: true })',
      'rows + issues; quantity "3"',
    ],
    18,
    31,
  );
  b += path('M534 495v28H360v26m-5 -6l5 6l5 -6');
  b += rect(28, 567, 664, 145, 'mint') + text(44, 604, 'Update the current note', 22, 'accent');
  b += lines(
    44,
    647,
    [
      'Active guide → 2.1.0 note with source and verification scope',
      'Old signature → explicitly historical migration context',
    ],
    19,
    35,
  );
  b += text(28, 763, 'INV-01 remains the product-policy source.', 21);
  b += text(28, 805, 'The arrow indicates a documentation update, not an upgrade run.', 19);
  return svg(
    720,
    837,
    'Replace stale active guidance without erasing its history',
    'A constructed RowReader API conflict is resolved by version-specific interface evidence and loaded-module agreement. The resulting change updates guidance and its source links, not product scope or the inventory quantity policy.',
    b,
  );
}

await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['map', map],
  ['handoff', handoff],
  ['stale', stale],
]) {
  for (const mobile of [false, true]) {
    const filename = `context-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered six original context illustrations and registered their dimensions.');
