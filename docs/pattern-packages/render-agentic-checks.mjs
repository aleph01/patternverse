// Original oracle illustrations: checked fixtures, executed teaching models, and exact decimal predicates.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find(
  (p) => p.id === 'agentic-establish-independent-checks',
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

function oracle(mobile) {
  const f = fixture.oracle;
  if (mobile) {
    let b = text(20, 32, 'Let the expectation challenge code', 19);
    b += text(20, 68, 'Fictional create-only inventory import', 17);
    b += rect(20, 106, 320, 168) + text(36, 142, 'Same state and input', 21);
    b += lines(
      36,
      184,
      ['Initial P100: 4', 'Import P201: 3 and P202: 2', 'Existing stock must remain.'],
      17,
      29,
    );
    b += rect(20, 320, 320, 168) + text(36, 356, 'Faulty implementation output', 19);
    b += lines(
      36,
      398,
      ['P201: 3; P202: 2', 'P100 missing; total 5', 'The imported map replaced stock.'],
      17,
      29,
    );
    b +=
      rect(20, 534, 320, 198, 'mint') + text(36, 570, 'Requirement → expected map', 19, 'accent');
    b += lines(
      36,
      612,
      [
        'P100: 4; P201: 3; P202: 2',
        'Total 4 + 3 + 2 = 9',
        'Fixture derived before accepting',
        'the implementation’s output.',
      ],
      17,
      29,
    );
    b += down(180, 744);
    b +=
      rect(20, 785, 320, 104, 'mint') + text(36, 821, 'Independent comparison: FAIL', 18, 'accent');
    b += text(36, 862, 'P100 must still be present.', 18);
    b += rect(20, 935, 320, 140, 'pending') + text(36, 971, 'Copy output into snapshot?', 19);
    b += lines(
      36,
      1013,
      ['Same wrong map matches: PASS', 'Agreement preserves the omission.'],
      17,
      29,
    );
    b += text(20, 1125, 'Arrow: fixture supplies the expected map', 15);
    b += text(20, 1158, 'Check entries, not just the total.', 17);
    return svg(
      360,
      1190,
      'Independent expected inventory rejects a self-derived snapshot',
      'The same state and input yield a faulty replacement map without P100. The separate create-only requirement derives the expected map with P100 retained. That comparison fails while copying the wrong map into a snapshot can pass.',
      b,
    );
  }
  let b = text(28, 32, 'Two sources for expected behavior give different checks', 22);
  b += text(28, 68, 'Fictional inventory fixture · identical state and input throughout', 19);
  b += rect(28, 106, 664, 104) + text(44, 144, 'Initial P100: 4 · import P201: 3 and P202: 2', 22);
  b += text(44, 185, 'Create-only contract: add new SKUs and retain existing stock.', 20);
  b += rect(28, 256, 316, 112) + text(44, 294, 'Implementation path', 22);
  b += text(44, 336, 'Fault: replace the inventory map', 18);
  b += rect(376, 256, 316, 112, 'mint') + text(392, 294, 'Independent oracle path', 22, 'accent');
  b += text(392, 336, 'Requirement + reviewed fixture', 18);
  b += down(186, 380) + down(534, 380);
  b += rect(28, 421, 316, 140) + text(44, 459, 'Actual output', 22);
  b += lines(44, 501, ['P201: 3; P202: 2', 'P100 missing · total 5'], 20, 32);
  b += rect(376, 421, 316, 140, 'mint') + text(392, 459, 'Expected inventory', 22, 'accent');
  b += lines(
    392,
    501,
    ['P100: 4; P201: 3; P202: 2', `Total ${f.expected_total} · retain every entry`],
    18,
    32,
  );
  b += path('M186 573v14H360v18m-5 -6l5 6l5 -6') + path('M534 573v14H360');
  b +=
    rect(28, 623, 664, 104, 'mint') +
    text(44, 661, 'Independent map comparison: FAIL — P100 is missing', 22, 'accent');
  b += text(44, 702, 'The requirement supplies an expectation the code can contradict.', 20);
  b +=
    rect(28, 773, 664, 140, 'pending') +
    text(44, 811, 'Self-derived snapshot: copy the actual output into “expected”', 21);
  b += lines(
    44,
    853,
    [
      'Same faulty map compared with itself: PASS, with P100 still absent.',
      'That agreement does not establish the create-only contract.',
    ],
    19,
    32,
  );
  b += text(28, 965, 'Arrows: provenance of actual and expected values, not execution time', 18);
  return svg(
    720,
    997,
    'An independent oracle catches a mistake that an implementation-derived snapshot preserves',
    'Requirements and input derive an expected inventory independently from the replacement implementation. Their maps disagree about P100. A snapshot copied from the actual output instead reproduces the omission and passes by agreement.',
    b,
  );
}
function regression(mobile) {
  const f = fixture.regression;
  if (mobile) {
    let b = text(20, 32, 'One case. One oracle. Two versions.', 19);
    b += text(20, 68, 'D0 / D1: executed fictional reference models', 15);
    b += rect(20, 106, 320, 168) + text(36, 142, 'Held constant', 22);
    b += lines(
      36,
      184,
      ['Initial P100: 4', 'CSV rows: P201,3 then P201,2', 'Same fixture and initial state'],
      17,
      29,
    );
    b += rect(20, 320, 320, 198, 'mint') + text(36, 356, 'Fixed expectation', 22, 'accent');
    b += lines(
      36,
      398,
      [
        'Reject: row 2, duplicate_sku',
        'Inventory stays P100: 4',
        'Write calls: 0',
        'Same assertions for D0 and D1',
      ],
      17,
      29,
    );
    b +=
      rect(20, 564, 320, 204, 'pending') +
      text(36, 600, `${f.prior} · collapse duplicates first`, 19);
    b += lines(
      36,
      642,
      [
        'Accepted; no issues',
        'Inventory P100: 4; P201: 2',
        'Write calls: 1',
        'Fixed assertion: FAIL',
      ],
      18,
      31,
    );
    b +=
      rect(20, 814, 320, 204, 'mint') +
      text(36, 850, `${f.repaired} · validate before writing`, 19, 'accent');
    b += lines(
      36,
      892,
      [
        'Rejected: row 2, duplicate_sku',
        'Inventory P100: 4',
        'Write calls: 0',
        'Fixed assertion: PASS',
      ],
      18,
      31,
    );
    b += text(20, 1070, 'Changed: duplicate-handling algorithm', 16);
    b += text(20, 1103, 'Response, state, and calls all checked.', 17);
    b += text(20, 1136, 'No production transaction was run.', 17);
    return svg(
      360,
      1168,
      'A fixed duplicate-row regression fails before and passes after the repair',
      'D0 collapses repeated SKU rows and writes the last value. D1 detects the repeated SKU before any write. The initial inventory, CSV, expected row error, final state, and write-call requirement are unchanged. These are in-memory teaching models.',
      b,
    );
  }
  let b = text(28, 32, 'The same regression must challenge both versions', 23);
  b += text(28, 68, 'D0 / D1 are fictional reference implementations, not repository commits', 19);
  b +=
    rect(28, 106, 664, 104) +
    text(44, 144, 'Held constant: initial P100: 4 · rows P201,3 then P201,2', 22);
  b += text(
    44,
    185,
    'Same CSV fixture and initial state; only the duplicate algorithm changes.',
    19,
  );
  b +=
    rect(28, 256, 664, 112, 'mint') +
    text(44, 294, 'Fixed oracle: reject with row 2, code duplicate_sku', 22, 'accent');
  b += text(44, 336, 'Inventory remains P100: 4; reference-store write calls must be zero.', 20);
  b += rect(28, 414, 316, 248, 'pending') + text(44, 452, `${f.prior} · collapse first`, 22);
  b += lines(
    44,
    494,
    ['Accepted; no issues', 'P100: 4; P201: 2', 'Write calls: 1', 'Fixed assertion: FAIL'],
    20,
    40,
  );
  b +=
    rect(376, 414, 316, 248, 'mint') +
    text(392, 452, `${f.repaired} · validate first`, 22, 'accent');
  b += lines(
    392,
    494,
    ['Rejected: row 2', 'code: duplicate_sku', 'P100: 4 · write calls: 0', 'Fixed assertion: PASS'],
    20,
    40,
  );
  b +=
    rect(28, 708, 664, 112) + text(44, 746, 'A correct error response alone is insufficient.', 22);
  b += text(44, 788, 'The check also inspects inventory and write calls after the operation.', 20);
  b += text(
    28,
    872,
    'Executed reference models only; no production storage transaction tested.',
    19,
  );
  b += text(28, 906, 'Comparison holds the input, initial state, and expected behavior fixed.', 18);
  return svg(
    720,
    938,
    'Fixed before-and-after assertions expose the duplicate collapse bug',
    'The same fixture and initial stock are compared with an unchanged rejection oracle. D0 accepts and writes a collapsed row, while D1 rejects before writing. Reference execution verifies the response, final inventory, and write count without claiming production transaction behavior.',
    b,
  );
}
function tolerance(mobile) {
  const f = fixture.tolerance;
  if (mobile) {
    let b = text(20, 32, 'The output did not change', 22);
    b += text(20, 68, 'ROUND-1 · exact decimal reference values', 16);
    b += rect(20, 106, 320, 198) + text(36, 142, 'Held fixed in all three checks', 19);
    b += lines(
      36,
      184,
      [
        `Input ${f.input} · ties away from zero`,
        `Expected ${f.expected} · actual ${f.actual}`,
        `Absolute error ${f.absolute_error}`,
        'Display must have two decimals.',
      ],
      17,
      29,
    );
    b +=
      rect(20, 350, 320, 104, 'mint') +
      text(36, 386, 'Required: exact formatted value', 17, 'accent');
    b += text(36, 427, '2.34 ≠ 2.35 → FAIL', 21);
    b += rect(20, 500, 320, 104) + text(36, 536, 'Old tolerance: 0.005', 21);
    b += text(36, 577, '0.01 > 0.005 → FAIL', 21);
    b += rect(20, 650, 320, 104, 'pending') + text(36, 686, 'Wider tolerance: 0.02', 21);
    b += text(36, 727, '0.01 ≤ 0.02 → PASS', 21);
    b += rect(20, 800, 320, 164, 'mint') + text(36, 836, 'Review the changed judge', 20, 'accent');
    b += lines(
      36,
      878,
      [
        'ROUND-1 still requires 2.35.',
        'Fix code, or authorize and version',
        'a genuinely changed contract.',
      ],
      17,
      29,
    );
    b += text(20, 1014, 'Changed: acceptance predicate only', 17);
    b += text(20, 1047, 'No corrected output is shown.', 17);
    return svg(
      360,
      1079,
      'A wider tolerance accepts the unchanged wrong rounding result',
      'Input 2.345, expected 2.35, actual 2.34, and ROUND-1 remain fixed. Exact equality and error tolerance 0.005 fail; inclusive tolerance 0.02 passes. Only the judge changed, not the implementation or requirement.',
      b,
    );
  }
  let b = text(28, 32, 'A passing check can change without a repaired result', 23);
  b += text(28, 68, 'ROUND-1 · exact decimal values · only the acceptance predicate varies', 19);
  b +=
    rect(28, 106, 664, 140) +
    text(44, 144, `Input ${f.input} · required nearest rounding with ties away from zero`, 21);
  b += lines(
    44,
    186,
    [
      `Expected ${f.expected} · actual ${f.actual} from ties-to-even`,
      `Absolute error |${f.actual} − ${f.expected}| = ${f.absolute_error} · two-decimal display required`,
    ],
    20,
    32,
  );
  b +=
    rect(28, 292, 664, 104, 'mint') +
    text(44, 330, 'Required: exact formatted value', 22, 'accent');
  b += text(44, 372, 'Output 2.34 ≠ expected 2.35 → FAIL', 21);
  b += rect(28, 442, 664, 104) + text(44, 480, 'Earlier comparator: absolute error ≤ 0.005', 22);
  b += text(44, 522, 'Same output 2.34 · error 0.01 > 0.005 → FAIL', 21);
  b +=
    rect(28, 592, 664, 104, 'pending') +
    text(44, 630, 'Relaxed comparator: absolute error ≤ 0.02', 22);
  b += text(44, 672, 'Same output 2.34 · error 0.01 ≤ 0.02 → PASS', 21);
  b +=
    rect(28, 742, 664, 140, 'mint') +
    text(44, 780, 'Review whether the requirement actually changed', 22, 'accent');
  b += lines(
    44,
    822,
    [
      'ROUND-1 still requires 2.35. Correct the implementation, or obtain',
      'an explicit new contract decision and derive its expectations.',
    ],
    20,
    32,
  );
  b += text(
    28,
    934,
    'No output, input, or requirement changed merely because tolerance widened.',
    18,
  );
  return svg(
    720,
    966,
    'Changing the acceptance predicate does not change the fixed rounding output',
    'The three comparisons hold input 2.345, expected 2.35, and actual 2.34 constant. Only the wider inclusive tolerance passes. It does not satisfy the still-current exact display contract or establish an authorized rounding-policy change.',
    b,
  );
}
await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['oracle', oracle],
  ['regression', regression],
  ['tolerance', tolerance],
]) {
  for (const mobile of [false, true]) {
    const filename = `checks-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Rendered six original independent-check illustrations and registered their dimensions.',
);
