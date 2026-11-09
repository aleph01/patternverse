// Original fictional delegation diagrams, not a tested sandbox or service upgrade.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find((p) => p.id === 'agentic-bound-the-task').examples;
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

function preview(mobile) {
  let b = text(mobile ? 20 : 28, 32, 'CSV preview: authority and capability', mobile ? 18 : 22);
  b += text(
    mobile ? 20 : 28,
    68,
    'Fictional task · modeled controls, not a security test',
    mobile ? 13 : 18,
  );
  if (mobile) {
    b +=
      rect(20, 106, 320, 650, 'boundary') +
      text(36, 143, 'Agreed task: preview only', 21, 'accent');
    b += rect(36, 172, 288, 104) + text(52, 205, 'Synthetic CSV', 20);
    b += lines(52, 239, ['P201,3', 'P202,-1'], 19, 27);
    b += down(180, 288);
    b += rect(36, 328, 288, 72, 'mint') + text(52, 372, 'Reuse validateProduct', 21, 'accent');
    b += down(180, 412);
    b += rect(36, 452, 288, 103) + text(52, 487, 'Read-only preview', 21);
    b += text(52, 529, 'Row 2: negative quantity', 19);
    b += rect(36, 600, 288, 121) + text(52, 634, 'Available resources', 20);
    b += lines(52, 672, ['Edit preview + related tests', 'Local renderer + fixtures'], 18, 29);
    b += down(180, 770, 65) + path('M170 796l20 20m-20 0l20 -20');
    b += text(20, 879, 'Specified execution boundary', 20);
    b += rect(20, 907, 320, 179, 'line') + rect(26, 913, 308, 167, 'fine');
    b += text(36, 948, 'Production inventory + schema', 18);
    b += lines(
      36,
      988,
      ['Denied: schema writes', 'Production calls + deployment', 'No production credentials'],
      18,
      31,
    );
    b += lines(
      20,
      1136,
      ['Required fixture result: P100 stays 4', 'Cross: operation unavailable'],
      17,
      31,
    );
    return svg(
      360,
      1200,
      'Separate preview authority from modeled production permissions',
      'A fictional preview task uses synthetic CSV, existing validation, local edits and checks. A separate modeled execution boundary denies schema writes, production operations, and deployment. No actual isolation or denial test is claimed.',
      b,
    );
  }
  b +=
    rect(28, 107, 664, 360, 'boundary') + text(44, 144, 'Agreed task: preview only', 22, 'accent');
  b += rect(44, 177, 184, 110) + text(60, 213, 'Synthetic CSV', 20);
  b += lines(60, 249, ['P201,3', 'P202,-1'], 19, 29);
  b += rect(268, 177, 184, 110, 'mint') + text(284, 213, 'Reuse existing', 19, 'accent');
  b += text(284, 254, 'validateProduct', 20, 'accent');
  b += rect(492, 177, 184, 110) + text(508, 213, 'Preview', 21);
  b += lines(508, 249, ['Row 2: error', 'No inventory write'], 17, 29);
  b += path('M236 232h24m-6 -5l6 5l-6 5') + path('M460 232h24m-6 -5l6 5l-6 5');
  b += rect(44, 331, 632, 101) + text(60, 367, 'Available resources', 21);
  b += text(60, 406, 'Preview + test edits · local renderer · synthetic fixtures', 20);
  b += down(360, 479, 70) + path('M350 504l20 20m-20 0l20 -20');
  b += text(28, 595, 'Specified execution boundary, enforced outside the model', 21);
  b += rect(28, 623, 664, 140, 'line') + rect(34, 629, 652, 128, 'fine');
  b += text(44, 662, 'Production inventory + schema', 22);
  b += text(44, 703, 'Denied: schema writes, production calls, deployment', 20);
  b += text(44, 742, 'Host/broker policy · production credentials not supplied', 19);
  b += text(28, 811, 'Required fixture: P100 stays 4 · cross: operation unavailable', 19);
  return svg(
    720,
    843,
    'A written task boundary and an execution boundary are different',
    'The fictional delegated preview task includes CSV, validation, local code edits and related checks. Production effects sit beyond a separately specified execution boundary. Arrows show local flow and the crossed attempt toward an unavailable effect, not an actual production test.',
    b,
  );
}

function contract(mobile) {
  const f = fixture.contract;
  const x = mobile ? 20 : 28;
  let b = text(x, 32, 'A package update finds a service contract', mobile ? 17 : 22);
  b += text(x, 68, 'Fictional stock-client payloads · no upgrade run', mobile ? 15 : 18);
  if (mobile) {
    b += rect(20, 106, 320, 199, 'boundary') + text(36, 142, f.package, 22, 'accent');
    b += text(36, 180, 'Allowed: client + required lock entries', 16);
    b += lines(
      36,
      219,
      ['Before: quantity: 3', 'Proposed: quantity:', '{ value: 3, unit: "item" }'],
      19,
      32,
    );
    b += down(180, 317);
    b += text(20, 386, 'Agreed edit boundary', 19);
    b += path('M20 410H340', 'pending');
    b += rect(20, 441, 320, 109) + text(36, 478, f.consumer, 22);
    b += text(36, 520, 'Still requires integer quantity', 18);
    b += rect(20, 595, 320, 120, 'pending') + text(36, 632, 'Bounded local investigation', 19);
    b += lines(
      36,
      672,
      ['Can an adapter preserve the wire?', 'Reading the contract is allowed.'],
      17,
      29,
    );
    b +=
      rect(20, 758, 320, 105, 'mint') + text(36, 794, 'If compatible and verified', 20, 'accent');
    b += text(36, 835, 'Continue inside inventory-ui', 19);
    b += rect(20, 907, 320, 126, 'pending') + text(36, 943, 'Otherwise return a decision', 20);
    b += lines(
      36,
      984,
      ['Defer, or coordinate broader scope', 'Do not rewrite inventory-api silently.'],
      16,
      29,
    );
    b += text(20, 1083, 'Conditional paths, not test outcomes.', 18);
    return svg(
      360,
      1115,
      'A package task does not authorize a consumer rewrite',
      'Fictional inventory-ui can update stock-client and necessary lock entries. The consumer inventory-api expects integer quantity, while the proposed payload is an object. Local compatibility may be investigated; broader service changes require a separate decision.',
      b,
    );
  }
  b += rect(28, 107, 316, 189, 'boundary') + text(44, 145, f.package, 23, 'accent');
  b += text(44, 185, 'Client + required lock entries', 18);
  b += lines(
    44,
    225,
    ['Before: quantity: 3', 'Proposed quantity:', '{ value: 3, unit: "item" }'],
    20,
    30,
  );
  b += rect(376, 107, 316, 189) + text(392, 145, f.consumer, 23);
  b += lines(
    392,
    190,
    ['Outside edit authority', 'Requires quantity: 3', 'Object payload incompatible'],
    19,
    35,
  );
  b += path('M350 218h19m-6 -5l6 5l-6 5');
  b += path('M360 90V324', 'pending');
  b += text(28, 347, 'Arrow: wire dependency · dashed line: agreed edit boundary', 19);
  b +=
    rect(28, 391, 664, 115, 'pending') +
    text(44, 428, 'Bounded investigation within inventory-ui', 22);
  b += text(44, 471, 'Can a supported adapter preserve the existing integer contract?', 19);
  b += path('M360 518v22H186v22m-5 -6l5 6l5 -6') + path('M360 540H534v22m-5 -6l5 6l5 -6');
  b += rect(28, 580, 316, 135, 'mint') + text(44, 618, 'If compatible and verified', 20, 'accent');
  b += lines(44, 660, ['Continue inside inventory-ui', 'Keep the service unchanged'], 19, 30);
  b += rect(376, 580, 316, 135, 'pending') + text(392, 618, 'Otherwise return a decision', 20);
  b += lines(392, 660, ['Defer, or coordinate', 'an explicit scope change'], 19, 30);
  b += text(28, 765, 'Conditional choices · no compatibility result or deployment claimed', 18);
  return svg(
    720,
    797,
    'Expose a wire-contract change at the edge of delegated authority',
    'A fictional client update changes quantity from integer to value-and-unit object. The service outside the task still requires an integer. A bounded compatibility investigation can lead to a verified local update, deferral, or a separately coordinated scope decision.',
    b,
  );
}

function docs(mobile) {
  const f = fixture.docs;
  const x = mobile ? 20 : 28;
  let b = text(x, 32, 'Same edit. Different resulting effect.', mobile ? 19 : 23);
  b += text(x, 68, 'Fictional documentation task · quantity rule unchanged', mobile ? 13 : 18);
  if (mobile) {
    b += rect(20, 106, 320, 114) + text(36, 141, 'The identical correction', 21);
    b += lines(36, 181, [f.before + ' →', f.after], 20, 29);
    b += rect(20, 266, 320, 180, 'mint') + text(36, 303, 'Disposable local draft', 21, 'accent');
    b += lines(36, 345, [f.folder, 'Reorganize prose + links', 'Save + render permitted'], 19, 32);
    b += rect(20, 492, 320, 195, 'pending') + text(36, 529, 'Production-served page', 21);
    b += lines(
      36,
      572,
      ['Same text and policy', 'Saving can publish immediately', 'No publishing authority or tool'],
      18,
      34,
    );
    b += rect(20, 733, 320, 166) + text(36, 770, 'Local handoff evidence', 21);
    b += lines(
      36,
      812,
      ['Rule accuracy + links', 'Rendered views + scoped diff', 'Return a reviewable draft'],
      18,
      32,
    );
    b += lines(
      20,
      949,
      ['Broad local editing freedom', 'does not authorize live publication.'],
      18,
      31,
    );
    return svg(
      360,
      1012,
      'Compare local editing authority with live publishing effects',
      'The identical fictional edit changes P202,-1 accepted to P202,0 accepted under the same quantity rule. Local saving and rendering are delegated; saving on a production-served page can publish and is outside this task. No live publishing tool is supplied.',
      b,
    );
  }
  b +=
    rect(28, 107, 664, 100) +
    text(44, 143, 'Identical text correction under the same quantity rule', 21);
  b += text(44, 183, `${f.before} → ${f.after}`, 22);
  b += rect(28, 252, 316, 234, 'mint') + text(44, 291, 'Disposable local draft', 22, 'accent');
  b += lines(
    44,
    338,
    [f.folder, 'Reorganize prose + links', 'Save + render permitted', 'No live publication'],
    19,
    36,
  );
  b += rect(376, 252, 316, 234, 'pending') + text(392, 291, 'Production-served page', 22);
  b += lines(
    392,
    338,
    [
      'Same text and policy',
      'Saving can publish',
      'No publishing authority',
      'No live publishing tool',
    ],
    19,
    36,
  );
  b += rect(28, 534, 664, 114) + text(44, 572, 'Proportionate local handoff evidence', 22);
  b += text(44, 614, 'Rule accuracy · links · rendered views · scoped diff', 20);
  b += text(28, 699, 'Environment and effect change; the requested text does not.', 20);
  b += text(28, 741, 'Return a reviewable draft. Live publication remains outside scope.', 19);
  return svg(
    720,
    773,
    'A narrow documentation task can delegate broad local discretion',
    'Matched fictional local and production environments retain the same text and policy. Local editing within docs/import-guide is delegated with accuracy and rendering evidence. Live publication is a different effect with no authority or tool in this task.',
    b,
  );
}

await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['preview', preview],
  ['contract', contract],
  ['docs', docs],
]) {
  for (const mobile of [false, true]) {
    const filename = `task-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered six original delegation illustrations and registered their dimensions.');
