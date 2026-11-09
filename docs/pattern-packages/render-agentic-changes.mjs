// Original fictional change plans, not executed imports, CI runs, or review benchmarks.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find(
  (p) => p.id === 'agentic-deliver-small-reviewable-changes',
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

function imports(mobile) {
  const x = mobile ? 20 : 28;
  let b = text(x, 32, 'Split the review, retain the requirements', mobile ? 18 : 23);
  b += text(x, 68, 'Fictional change plan · no completed integrations', mobile ? 14 : 19);
  if (mobile) {
    b += rect(20, 106, 320, 154) + text(36, 142, 'Same parent requirements', 20);
    b += lines(
      36,
      183,
      [
        'P: row-error preview; no invalid writes',
        'C: confirm all rows or none',
        'Reject existing identifiers',
      ],
      16,
      31,
    );
    b += rect(20, 305, 320, 160, 'pending') + text(36, 341, 'One combined review', 22);
    b += lines(
      36,
      384,
      ['Preview + confirmation', 'Validation, UI, transaction', 'All P + C evidence at once'],
      19,
      32,
    );
    b += text(20, 516, 'Two dependent review units', 21);
    b += rect(20, 546, 320, 143, 'mint') + text(36, 583, 'U1 · read-only preview', 21, 'accent');
    b += lines(36, 625, ['P201,3 + P202,-1 → row 2 error', 'P100 stays 4'], 18, 32);
    b += down(180, 701);
    b += rect(20, 742, 320, 149, 'mint') + text(36, 779, 'U2 · confirmation', 21, 'accent');
    b += lines(36, 821, ['Depends on U1', 'All-or-none + existing-SKU checks'], 17, 32);
    b += rect(20, 937, 320, 132) + text(36, 973, 'Intended state after U1', 20);
    b += lines(
      36,
      1015,
      ['Preview usable; parent incomplete', 'No confirm control or write route'],
      17,
      31,
    );
    b += lines(
      20,
      1119,
      ['Arrow: review/base dependency', 'Queue: await workload evidence'],
      18,
      31,
    );
    return svg(
      360,
      1181,
      'Two review units retain the original import acceptance requirements',
      'Fictional combined and split plans retain P, read-only preview with row errors, and C, all-or-none confirmation rejecting existing identifiers. U2 depends on U1. After U1 there is no confirm control or import write route; the parent remains incomplete.',
      b,
    );
  }
  b += rect(28, 107, 664, 145) + text(44, 144, 'Same parent requirements in both views', 22);
  b += lines(
    44,
    185,
    [
      'P: preview row errors; invalid files write nothing',
      'C: confirm all rows or none; reject existing identifiers',
    ],
    20,
    34,
  );
  b += rect(28, 307, 316, 329, 'pending') + text(44, 347, 'One combined review', 22);
  b += lines(
    44,
    394,
    ['Preview + confirmation', 'Validation, UI, transaction', 'All P + C evidence at once'],
    20,
    37,
  );
  b += text(44, 599, 'One diff, several concerns', 19);
  b += rect(376, 307, 316, 143, 'mint') + text(392, 345, 'U1 · read-only preview', 22, 'accent');
  b += lines(392, 387, ['P202,-1 → row 2 error', 'P100 stays 4'], 20, 32);
  b += down(534, 462);
  b += rect(376, 503, 316, 154, 'mint') + text(392, 541, 'U2 · confirmation', 22, 'accent');
  b += lines(392, 583, ['Depends on U1', 'All-or-none + existing-SKU checks'], 17, 34);
  b +=
    rect(28, 705, 664, 107) +
    text(44, 742, 'Intended after U1: usable preview; parent still incomplete', 20);
  b += text(44, 784, 'No confirmation control or import write route.', 21);
  b += text(28, 861, 'Arrow: review/base dependency · queue awaits workload evidence', 18);
  return svg(
    720,
    893,
    'Compare one import review with two coherent dependent units',
    'The same fictional feature requirements are held constant. U1 covers read-only preview and its evidence, U2 confirmation and transactional checks. The arrow identifies a logical review/base dependency and intended integration order, not actual commits or releases.',
    b,
  );
}

function contract(mobile) {
  const f = fixture.contract;
  const x = mobile ? 20 : 28;
  let b = text(x, 32, 'Two branches still share an interface', mobile ? 19 : 23);
  b += text(x, 68, 'Fictional B1 + F1 · separate checks can miss a mismatch', mobile ? 13 : 18);
  if (mobile) {
    b += rect(20, 106, 320, 148, 'mint') + text(36, 143, 'Agreed preview contract', 21, 'accent');
    b += lines(
      36,
      184,
      [f.endpoint, 'errors: [{ row: 2,', 'code: "quantity_nonnegative" }]'],
      17,
      28,
    );
    b += rect(20, 300, 320, 140) + text(36, 337, 'B1 · backend lane', 22);
    b += lines(36, 380, ['Actual response: row: 2', 'Own branch check: passes'], 19, 32);
    b += rect(20, 486, 320, 165, 'pending') + text(36, 523, 'F1 · frontend lane', 22);
    b += lines(
      36,
      566,
      ['Mock: line: 2', 'Renderer reads line', 'Own branch check: passes'],
      19,
      32,
    );
    b += path('M340 370h10v417h-10m6 -5l-6 5l6 5');
    b += down(180, 663);
    b += rect(20, 704, 320, 157, 'pending') + text(36, 741, 'Combined path', 22);
    b += lines(
      36,
      784,
      ['Response has row, not line', 'Row number disappears', 'F1 review needs this evidence'],
      18,
      31,
    );
    b += rect(20, 907, 320, 153, 'mint') + text(36, 944, 'Correct F1 before closing', 21, 'accent');
    b += lines(36, 987, ['Mock + renderer use row', 'Verify actual endpoint → screen'], 18, 32);
    b += text(20, 1110, 'Arrows: combined-path dependencies', 17);
    return svg(
      360,
      1142,
      'A frontend review needs the real backend contract and combined evidence',
      'Fictional B1 returns row:2 but F1 tests a line:2 mock and reads line. Own checks pass, while the combined path loses the row number. The frontend fixture and renderer must be corrected and the actual response-to-screen path verified.',
      b,
    );
  }
  b +=
    rect(28, 107, 664, 140, 'mint') +
    text(44, 144, 'Agreed contract: row, excluding the header', 22, 'accent');
  b += text(44, 184, f.endpoint, 21);
  b += text(44, 221, 'errors: [{ row: 2, code: "quantity_nonnegative" }]', 20);
  b += down(186, 259) + down(534, 259);
  b += rect(28, 300, 316, 174) + text(44, 339, 'B1 · backend lane', 22);
  b += lines(44, 382, ['Actual response: row: 2', 'Own branch check: passes'], 19, 37);
  b += rect(376, 300, 316, 174, 'pending') + text(392, 339, 'F1 · frontend lane', 22);
  b += lines(
    392,
    382,
    ['Mock: line: 2', 'Renderer reads line', 'Own branch check: passes'],
    19,
    33,
  );
  b += path('M186 486v25H360v22m-5 -6l5 6l5 -6') + path('M534 486v25H360');
  b +=
    rect(28, 551, 664, 132, 'pending') +
    text(44, 589, 'Combined path: response has row; renderer expects line', 21);
  b += text(44, 631, 'The row number disappears despite two passing branch checks.', 20);
  b +=
    rect(28, 730, 664, 107, 'mint') +
    text(44, 767, 'Correct F1 mock + renderer to use row', 22, 'accent');
  b += text(44, 809, 'Verify the actual endpoint-to-screen path against the combined base.', 18);
  b += text(28, 886, 'Arrows: contract and combined-review dependencies, not merge commands', 17);
  return svg(
    720,
    918,
    'Separate frontend and backend reviews retain a shared dependency',
    'Fictional agreed preview response uses row. B1 follows it but F1 uses line in its mock and renderer. Isolated checks can pass while the combined path fails. Contract and combined evidence are prerequisites to closing the frontend review.',
    b,
  );
}

function purpose(mobile) {
  const f = fixture.purpose;
  const x = mobile ? 20 : 28;
  let b = text(x, 32, 'Count purposes, not only changed lines', mobile ? 18 : 23);
  b += text(x, 68, 'Invented counts · no universal size threshold', mobile ? 15 : 19);
  if (mobile) {
    b += rect(20, 106, 320, 291, 'mint') + text(36, 144, '1,200 lines · one purpose', 22, 'accent');
    b += lines(
      36,
      189,
      [
        'Internal helper rename',
        f.rename.before,
        '→ ' + f.rename.after,
        'Update references',
        'Preserve public behavior',
      ],
      19,
      37,
    );
    b += rect(20, 443, 320, 285, 'pending') + text(36, 481, '40 lines · three decisions', 22);
    b += lines(
      36,
      526,
      [
        'Round fractions',
        'Overwrite existing SKUs',
        'Save partial invalid files',
        'Conflicts with current requirements',
      ],
      18,
      40,
    );
    b += rect(20, 774, 320, 154) + text(36, 811, 'Rename evidence still needed', 19);
    b += lines(
      36,
      853,
      ['Audit references, including dynamic', 'Relevant build + regression checks'],
      16,
      31,
    );
    b += lines(20, 978, ['Small diff ≠ one decision.', 'Mechanical ≠ unreviewed.'], 19, 32);
    return svg(
      360,
      1042,
      'Compare hypothetical textual size with semantic scope',
      'Invented 1200-line internal helper rename has one transformation and preserves public behavior. Invented 40-line policy patch changes rounding, overwrite behavior, and partial saves against current requirements. Both need purpose-appropriate assessment; no effort or defect forecast is made.',
      b,
    );
  }
  b += rect(28, 107, 316, 325, 'mint') + text(44, 146, '1,200 lines · one purpose', 23, 'accent');
  b += lines(
    44,
    193,
    [
      'Internal helper rename',
      f.rename.before,
      '→ ' + f.rename.after,
      'Update references',
      'Preserve public behavior',
    ],
    19,
    39,
  );
  b += rect(376, 107, 316, 325, 'pending') + text(392, 146, '40 lines · three decisions', 23);
  b += lines(
    392,
    193,
    ['Round fractions', 'Overwrite existing SKUs', 'Save partial invalid files'],
    20,
    41,
  );
  b += lines(392, 350, ['Conflicts with current', 'acceptance requirements'], 19, 33);
  b += rect(28, 481, 664, 121) + text(44, 519, 'Rename evidence still needed', 22);
  b += text(44, 561, 'Reference audit, including dynamic uses; build + regression checks.', 19);
  b += text(28, 655, 'A small diff can contain several consequential decisions.', 21);
  b += text(28, 697, 'Mechanical does not mean unreviewed; counts are not thresholds.', 19);
  return svg(
    720,
    729,
    'A large mechanical change can be conceptually narrow',
    'The counts 1200 and 40 are hypothetical. The internal helper rename has one intended purpose and keeps public behavior, whereas the short patch proposes three changes conflicting with the current contract. Size alone does not determine reviewability.',
    b,
  );
}

await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['import', imports],
  ['contract', contract],
  ['purpose', purpose],
]) {
  for (const mobile of [false, true]) {
    const filename = `changes-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered six original review-unit illustrations and registered their dimensions.');
