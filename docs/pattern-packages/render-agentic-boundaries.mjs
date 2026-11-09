// Original planning diagrams. No upgrade, importer, or prototype is executed.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find(
  (p) => p.id === 'agentic-make-boundaries-and-decisions-explicit',
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

function scope(mobile) {
  const current = fixture.import.initial_inventory.P100;
  const incoming = fixture.import.alternative_outcomes.replace.P100;
  let b = '';
  if (mobile) {
    b += text(20, 32, 'CSV import: set the boundary', 20);
    b += rect(20, 72, 320, 168) + text(36, 108, 'Keep working', 20);
    b +=
      text(36, 150, 'Manual entry', 19) +
      text(36, 185, 'Existing validation', 19) +
      text(36, 220, 'Existing form checks', 18);
    b += text(20, 274, 'Reuse existing validation', 18, 'accent');
    b += rect(20, 300, 320, 168, 'boundary') + text(36, 336, 'Permitted change', 20, 'accent');
    b +=
      text(36, 376, 'CSV preview', 19) +
      text(36, 411, 'Import confirmation', 19) +
      text(36, 446, 'Reuse validation', 18);
    b += rect(20, 518, 320, 220, 'pending') + text(36, 554, 'D-01: open decision', 20);
    b +=
      text(36, 597, `Existing P100 = ${current}`, 19) +
      text(36, 631, `Incoming P100 = ${incoming}`, 19);
    b += text(36, 677, `Reject → ${current}`, 20) + text(196, 712, `Replace → ${incoming}`, 20);
    b += rect(20, 785, 320, 136, 'mint') + text(36, 821, 'D-01: accepted', 20, 'accent');
    b +=
      text(36, 859, 'Reject file on existing SKU.', 18) +
      text(36, 894, `P100 stays ${current}.`, 20);
    b += text(20, 975, 'Accepted ≠ implemented', 19);
    return svg(
      360,
      1005,
      'Make the import boundary and overwrite decision explicit',
      'Fictional retained behavior and permitted changes are separate from D-01. Before the decision, reject retains quantity 4 and replace would store 8. Accepted policy rejects the file, but implementation still needs verification.',
      b,
    );
  }
  b += text(28, 34, 'CSV import: decide before writing', 21);
  b += rect(28, 76, 244, 210) + text(44, 112, 'Keep working', 20);
  b +=
    text(44, 155, 'Manual entry', 19) +
    text(44, 198, 'Existing validation', 19) +
    text(44, 244, 'Existing form checks', 18);
  b += rect(356, 76, 336, 210, 'boundary') + text(372, 112, 'Permitted change', 20, 'accent');
  b +=
    text(372, 155, 'CSV preview', 19) +
    text(372, 198, 'Import confirmation', 19) +
    text(372, 244, 'Reuse validation', 19);
  b += path('M272 191H356') + text(288, 176, 'reuse', 16);
  b += rect(28, 330, 664, 144, 'pending') + text(44, 365, 'D-01: open overwrite decision', 20);
  b += text(44, 405, `Existing P100 = ${current} · Incoming P100 = ${incoming}`, 20);
  b += text(44, 451, `Reject → ${current}`, 20) + text(400, 451, `Replace → ${incoming}`, 20);
  b += rect(28, 520, 664, 97, 'mint') + text(44, 555, 'D-01: accepted', 20, 'accent');
  b += text(44, 591, `Reject file on existing SKU; P100 stays ${current}.`, 20);
  b += text(28, 659, 'Accepted is not yet implemented.', 19);
  return svg(
    720,
    689,
    'Make the import boundary and overwrite decision explicit',
    'An existing manual-entry path and validator are retained while import preview and confirmation are permitted. The overwrite choice moves from proposed alternatives to an accepted rejection policy. The connection denotes required reuse, not runtime chronology.',
    b,
  );
}

function upgrade(mobile) {
  let b = '';
  if (mobile) {
    b += text(20, 32, 'Preserve current session rules.', 19);
    b += rect(20, 72, 320, 90) + text(36, 106, 'Client v1', 19) + text(36, 142, 'Token value', 20);
    b +=
      path('M180 162V200') +
      rect(20, 200, 320, 90) +
      text(36, 234, 'Client v2', 19) +
      text(36, 270, 'Token callback', 20);
    b += rect(20, 342, 320, 126, 'mint') + text(36, 378, 'Bounded investigation', 20, 'accent');
    b +=
      text(36, 414, 'Can an adapter preserve', 18) + text(36, 446, 'the credential lifecycle?', 18);
    b += path('M180 468V492H10V766H20') + path('M10 582H20');
    b +=
      rect(20, 522, 320, 126, 'boundary') +
      text(36, 558, 'If yes: continue upgrade', 20, 'accent') +
      text(36, 596, 'Verify existing session rules', 18);
    b +=
      rect(20, 706, 320, 126, 'pending') +
      text(36, 742, 'If no: return a decision', 20) +
      text(36, 780, 'Defer or revise scope', 19);
    b +=
      text(20, 904, 'Expansion remains a proposal.', 18) +
      text(20, 940, 'No redesign is implied.', 18);
    return svg(
      360,
      970,
      'Investigate a dependency break without silently expanding scope',
      'The fictional token interface change triggers an adapter investigation. Conditional branches either preserve the current session rules or return a decision to defer or explicitly revise scope. No branch is an observed implementation result.',
      b,
    );
  }
  b += text(28, 34, 'Upgrade client; preserve session rules.', 21);
  b += rect(28, 74, 300, 94) + rect(392, 74, 300, 94);
  b += text(44, 108, 'Client v1', 19) + text(44, 143, 'Token value', 20);
  b +=
    text(408, 108, 'Client v2', 19) + text(408, 143, 'Token callback', 20) + path('M328 126H392');
  b +=
    rect(28, 218, 664, 92, 'mint') + text(44, 252, 'Bounded adapter investigation', 20, 'accent');
  b += text(44, 287, 'Can existing credential behavior be preserved?', 20);
  b +=
    path('M360 310V348M178 392V348H550V392') + text(116, 381, 'Yes', 18) + text(491, 381, 'No', 18);
  b +=
    rect(28, 410, 300, 122, 'boundary') +
    text(44, 447, 'Continue upgrade', 20, 'accent') +
    text(44, 489, 'Check session behavior', 19);
  b +=
    rect(392, 410, 300, 122, 'pending') +
    text(408, 447, 'Return a decision', 20) +
    text(408, 489, 'Defer or revise scope', 19);
  b += text(28, 586, 'An auth redesign is still outside the task.', 20);
  b += text(28, 627, 'Proposing expansion does not accept it.', 19);
  return svg(
    720,
    657,
    'Investigate a dependency break without silently expanding scope',
    'A fictional client API changes from token value to callback. The logical decision fork is conditional on a bounded investigation, not a measured timeline. Compatibility work may continue; authentication redesign requires a separate explicit scope decision.',
    b,
  );
}

function prototype(mobile) {
  const shared = fixture.prototype.shared_fixture.join(' · ');
  let b = '';
  if (mobile) {
    b += text(20, 32, 'Same question, different boundaries', 18);
    b +=
      rect(20, 64, 320, 130) +
      text(36, 96, 'Shared teaching fixture', 18) +
      text(36, 132, shared, 20) +
      text(36, 170, 'Can row errors be understood?', 17);
    b += text(20, 248, 'Prototype brief', 20, 'accent');
    [
      'Synthetic rows',
      'In-memory list',
      'Disposable local UI',
      'No external calls',
      'Evidence: interaction',
      'and observations',
    ].forEach((s, i) => {
      b += text(28, 291 + i * 37, s, 19);
    });
    b += path('M20 509H340', 'fine') + text(20, 555, 'Production brief', 20, 'accent');
    [
      'Authorized real inputs',
      'Preview: no inventory writes',
      'Established validation',
      'Integration / failure checks',
      'Evidence: acceptance',
      'and preserved behavior',
    ].forEach((s, i) => {
      b += text(28, 598 + i * 37, s, 18);
    });
    b +=
      rect(20, 850, 320, 100, 'mint') +
      text(36, 885, 'Keep the learning.', 20, 'accent') +
      text(36, 922, 'Reconsider implementation.', 18);
    b += text(20, 1006, 'Prototype ≠ ready for release', 18);
    return svg(
      360,
      1036,
      'Separate prototype learning from production obligations',
      'The same fictional row-error question has different briefs. A prototype can use synthetic data and memory-only state. Production needs established validation, unchanged inventory during preview, and relevant checks. No user study or release is claimed.',
      b,
    );
  }
  b += text(28, 34, 'Same preview question. Different boundaries.', 21);
  b +=
    rect(28, 74, 664, 78) +
    text(44, 106, `Shared fixture: ${shared}`, 20) +
    text(44, 137, 'Question: are row errors understandable?', 18);
  b +=
    text(44, 214, 'Prototype brief', 20, 'accent') +
    text(396, 214, 'Production brief', 20, 'accent') +
    path('M360 190V494', 'fine');
  const left = [
    'Synthetic rows',
    'In-memory list',
    'Disposable local UI',
    'No external calls',
    'Evidence: interaction',
    'and observations',
  ];
  const right = [
    'Authorized real inputs',
    'Preview: no inventory writes',
    'Established validation',
    'Integration / failure checks',
    'Evidence: acceptance',
    'and preserved behavior',
  ];
  left.forEach((s, i) => {
    b += text(44, 259 + i * 42, s, 19);
  });
  right.forEach((s, i) => {
    b += text(396, 259 + i * 42, s, 18);
  });
  b +=
    rect(28, 522, 664, 72, 'mint') +
    text(44, 565, 'Keep the learning; reconsider the implementation.', 20, 'accent');
  b += text(28, 642, 'Prototype evidence does not establish release readiness.', 19);
  return svg(
    720,
    672,
    'Separate prototype learning from production obligations',
    'Matched briefs use the same fictional CSV fixture while differing in permitted data, state, implementation, and evidence. The comparison explains planned boundaries, not an observed prototype-to-production promotion.',
    b,
  );
}

await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['import', scope],
  ['upgrade', upgrade],
  ['prototype', prototype],
]) {
  for (const mobile of [false, true]) {
    const filename = `boundaries-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Rendered six original light-editorial boundary illustrations and registered their dimensions.',
);
