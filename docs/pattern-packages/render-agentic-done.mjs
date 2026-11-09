// Original fictional completion records, not executed application or agent results.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find((p) => p.id === 'agentic-agree-on-done').examples;
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
  const f = fixture.import;
  let b = text(mobile ? 20 : 28, 32, 'Parser task / import feature', mobile ? 20 : 22);
  b += text(mobile ? 20 : 28, 68, `${f.revision} · fictional evidence`, 18);
  if (mobile) {
    b += rect(20, 100, 320, 300, 'mint');
    b += text(36, 136, 'Parser task', 21, 'accent');
    b += lines(36, 179, [
      'P201,3 → record',
      'P202,-1 → row 2 error',
      'Focused checks available',
      'Interface + diff inspectable',
    ]);
    b += text(36, 349, 'TASK COMPLETE', 19, 'accent');
    b += text(36, 380, 'Ready for review', 19);
    b += rect(20, 438, 320, 300, 'pending');
    b += text(36, 474, 'Import feature', 21);
    b += text(36, 514, 'Still missing', 18);
    b += lines(36, 549, f.missing, 19, 32);
    b += text(36, 714, 'FEATURE INCOMPLETE', 19);
    b += rect(20, 784, 320, 172);
    b += text(36, 821, 'Application acceptance case', 18);
    b += lines(
      36,
      861,
      ['P100,8 → reject entire file', 'P100 stays 4', 'Not yet verified'],
      19,
      32,
    );
    b += text(20, 1004, 'Parser has no inventory access.', 18);
    return svg(
      360,
      1036,
      'Separate parser completion from import completion',
      'The same fictional PARSER-A revision supports a parser task handoff but not a completed import. P201,3 yields a record, P202,-1 yields row 2 error, and application-level existing-SKU rejection remains unverified.',
      b,
    );
  }
  b += path('M28 87H692', 'fine');
  b += rect(28, 110, 316, 320, 'mint') + rect(376, 110, 316, 320, 'pending');
  b += text(44, 149, 'Parser task', 22, 'accent') + text(392, 149, 'Import feature', 22);
  b += lines(44, 195, [
    'P201,3 → record',
    'P202,-1 → row 2 error',
    'Focused checks available',
    'Interface + diff inspectable',
  ]);
  b += text(392, 189, 'Still missing', 18) + lines(392, 225, f.missing);
  b += text(44, 380, 'TASK COMPLETE', 20, 'accent') + text(44, 411, 'Ready for review', 19);
  b += text(392, 402, 'FEATURE INCOMPLETE', 20);
  b += rect(28, 479, 664, 140);
  b += text(44, 516, 'Application acceptance case', 20);
  b += text(44, 555, 'P100,8 → reject file; P100 stays 4', 20);
  b += text(44, 594, 'Not yet verified · parser has no inventory access', 19);
  b += text(28, 662, 'Same revision. Different completion claims.', 20);
  return svg(
    720,
    692,
    'Aligned parser and feature completion lanes',
    'At fictional revision PARSER-A, parser evidence is available but upload, error display, confirmation, and persistence are missing. The application acceptance case cannot be inferred from parser checks.',
    b,
  );
}

function fix(mobile) {
  const f = fixture.fix;
  const x = mobile ? 20 : 28;
  const w = mobile ? 320 : 664;
  let b = text(x, 32, 'Search fix: evidence and delivery', mobile ? 19 : 22);
  b += text(x, 68, 'Fictional revisions · arrows show sequence', mobile ? 16 : 18);
  const order = f.expected_order.join(', ');
  if (mobile) {
    b += rect(x, 103, w, 154);
    b += text(36, 139, 'Reproduce the tie-order defect', 19);
    b += lines(
      36,
      180,
      ['Scores: A10 = 8, A20 = 8', 'Faulty: A20, A10, A30', 'Required: A10 before A20'],
      18,
      30,
    );
    b += down(180, 269);
    b += rect(x, 306, w, 174, 'mint');
    b += text(36, 342, f.revisions.reviewed, 22, 'accent');
    b += lines(36, 383, [order, 'Tie + unequal-score checks', 'Diff reviewed at FIX-B'], 19, 33);
    b += down(180, 492);
    b += rect(x, 529, w, 144, 'mint');
    b += text(36, 565, f.revisions.integrated, 22, 'accent');
    b += lines(36, 605, ['Integrated code checked', 'Fix complete in increment'], 19, 33);
    b += path('M20 712H340', 'fine');
    b += text(20, 748, 'Release is a separate claim', 20);
    b += rect(x, 779, w, 140, 'pending');
    b += text(36, 815, `${f.revisions.serving} still serving`, 21);
    b += lines(36, 854, ['MAIN-C rollout pending', 'Use existing delivery process'], 18, 31);
    b += text(20, 970, 'Ordering ≠ pagination consistency', 18);
    return svg(
      360,
      1002,
      'Verify and integrate a fix without claiming a release',
      'Fictional search evidence moves from a tie-order defect to FIX-B and MAIN-C, with checks and review tied to revisions. LIVE-A is still serving; MAIN-C rollout remains pending. Ordering alone does not prove pagination consistency.',
      b,
    );
  }
  b += rect(x, 104, w, 117);
  b += text(44, 140, 'Reproducer · A10 = 8, A20 = 8, A30 = 7', 21);
  b += text(44, 182, 'Faulty: A20, A10, A30 · required: A10 before A20', 20);
  b += down(360, 233);
  b += rect(x, 270, w, 117, 'mint');
  b += text(44, 306, `${f.revisions.reviewed} · verified and reviewed`, 21, 'accent');
  b += text(44, 348, `${order} · tie + unequal-score regression cases`, 19);
  b += down(360, 399);
  b += rect(x, 436, w, 117, 'mint');
  b += text(44, 472, `${f.revisions.integrated} · integrated`, 21, 'accent');
  b += text(44, 514, 'Combined-code checks pass · fix complete in increment', 20);
  b += path('M28 589H692', 'fine');
  b += text(28, 624, 'Release is a separate claim', 21);
  b += rect(x, 653, w, 100, 'pending');
  b += text(44, 689, `${f.revisions.serving} still serving · MAIN-C rollout pending`, 21);
  b += text(44, 729, 'Existing delivery process governs authorization and rollout.', 19);
  b += text(28, 797, 'Ordering checks do not establish pagination consistency.', 20);
  return svg(
    720,
    830,
    'A reviewed and integrated fix has a distinct release state',
    'The fictional search tie-order defect has a reproducer, corrected and regression results at FIX-B, and integrated checks at MAIN-C. LIVE-A still serves; no production rollout is implied by integration.',
    b,
  );
}

function docs(mobile) {
  const f = fixture.docs;
  let b = text(mobile ? 20 : 28, 32, 'Documentation: relevant evidence', mobile ? 19 : 22);
  b += text(mobile ? 20 : 28, 68, `${f.revision} · fictional review record`, 18);
  if (mobile) {
    b += rect(20, 104, 320, 98) + text(36, 139, 'Before: sample contradicts rule', 18);
    b += text(36, 177, f.before, 21);
    b += rect(20, 226, 320, 98, 'mint') + text(36, 261, 'After: non-negative quantity', 18);
    b += text(36, 299, f.after, 21, 'accent');
    b += text(20, 371, 'Evidence at DOC-D', 21);
    const rows = [
      ['Accuracy', 'P202,0 agrees with rule'],
      ['Links', 'Import reference resolves'],
      ['Preview', 'Desktop + phone inspected'],
      ['Scope', 'Documentation-only diff'],
    ];
    rows.forEach(([label, value], i) => {
      const y = 399 + i * 87;
      b +=
        path(`M20 ${y}H340`, 'fine') +
        text(28, y + 30, label, 19, 'accent') +
        text(28, y + 61, value, 18);
    });
    b += rect(20, 778, 320, 126, 'pending');
    b += lines(
      36,
      815,
      ['Runtime tests: not applicable', 'No executable change', 'Not recorded as passed'],
      18,
      31,
    );
    b += text(20, 953, 'Ready for review', 21, 'accent');
    b += text(20, 990, 'Publication not established', 19);
    return svg(
      360,
      1022,
      'A proportionate documentation completion record',
      'At fictional DOC-D, P202,0 corrects the negative accepted example. Accuracy, reference link, desktop and phone preview, and scope have evidence. Runtime tests are not applicable, and publication has not been established.',
      b,
    );
  }
  b += rect(28, 106, 316, 106) + rect(376, 106, 316, 106, 'mint');
  b += text(44, 143, 'Before: contradicts rule', 19) + text(392, 143, 'After: quantity ≥ 0', 19);
  b += text(44, 184, f.before, 22) + text(392, 184, f.after, 22, 'accent');
  b += text(28, 260, 'Evidence at DOC-D', 22);
  const rows = [
    ['Accuracy', 'P202,0 agrees with the rule'],
    ['Links', 'Import reference destination resolves'],
    ['Preview', 'Desktop and phone views inspected'],
    ['Scope', 'Diff confined to requested documentation'],
  ];
  rows.forEach(([label, value], i) => {
    const y = 285 + i * 60;
    b +=
      path(`M28 ${y}H692`, 'fine') +
      text(44, y + 36, label, 20, 'accent') +
      text(210, y + 36, value, 20);
  });
  b += rect(28, 556, 664, 100, 'pending');
  b += text(44, 593, 'Runtime tests: not applicable · no executable change', 20);
  b += text(44, 632, 'Not applicable is not a passing test result.', 19);
  b += text(28, 708, 'Ready for review · publication not established', 21, 'accent');
  return svg(
    720,
    744,
    'Tie documentation completion to relevant checks',
    'Fictional DOC-D changes P202,-1 accepted to P202,0 accepted and repairs the import reference. The record checks accuracy, destination, rendering, and scope, without claiming unrelated runtime tests or publication.',
    b,
  );
}

await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['import', imports],
  ['fix', fix],
  ['docs', docs],
]) {
  for (const mobile of [false, true]) {
    const filename = `done-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered six original completion illustrations and registered their dimensions.');
