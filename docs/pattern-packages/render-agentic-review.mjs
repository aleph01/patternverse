// Original intent-and-risk illustrations: fictional diffs, checked policy paths, and scoped allegation review.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find((p) => p.id === 'agentic-review-intent-and-risk').examples;
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
function importer(mobile) {
  const f = fixture.import;
  if (mobile) {
    let b = text(20, 32, 'Find the consequential policy changes', 19);
    b += text(20, 68, 'Fictional diff · create-only · initial P100: 4', 15);
    let y = 106;
    let p = panel(
      20,
      y,
      320,
      'Account for the whole patch',
      ['Preview copy and helper names', 'Validation and writer changes'],
      'neutral',
      17,
      19,
    );
    b += p.markup;
    y += p.height + 46;
    p = panel(
      20,
      y,
      320,
      'Consequential schematic diff',
      [
        '− validate(rows, currentInventory)',
        '+ validate(rows)',
        '− insertNewRowsAtomically(rows)',
        '+ for each row:',
        '  await upsertOne(row)',
      ],
      'mint',
      15,
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
      'Trace the overwrite decision',
      ['Input P100:99; P201:3', 'Upsert result P100:99; P201:3', 'Required: reject; only P100:4'],
      'pending',
      17,
      19,
    );
    b += p.markup;
    y += p.height + 46;
    p = panel(
      20,
      y,
      320,
      'Trace the write boundary',
      [
        'Valid rows P201:3; P202:2',
        'Failure before row 2',
        'Per-row commit retains P201:3',
        'Atomic reference retains P100:4',
      ],
      'pending',
      17,
      20,
    );
    b += p.markup;
    y += p.height + 46;
    p = panel(
      20,
      y,
      320,
      'Disposition: request changes',
      [
        'Keep existing-SKU rejection.',
        'Keep new rows all or none.',
        'Retain both meaningful checks.',
      ],
      'mint',
      18,
      19,
    );
    b += p.markup;
    y += p.height + 50;
    b += text(20, y, 'Arrow: edited logic → consequences', 16);
    y += 33;
    b += text(20, y, 'No score; mechanical scope still matters.', 16);
    return svg(
      360,
      y + 32,
      'Review consequential importer behavior within the whole fictional patch',
      'The larger fictional change includes copy and naming as well as validation and writes. The removed existing-stock check and per-row upsert are traced to separate overwrite and partial-commit defects under the create-only contract. SQLite references verify the stated state effects, not a production importer.',
      b,
    );
  }
  let b = text(28, 32, 'Trace policy changes inside a larger fictional diff', 23);
  b += text(
    28,
    68,
    'Create-only: reject existing SKUs; valid new rows all or none · initial P100: 4',
    18,
  );
  b += panel(
    28,
    106,
    664,
    'Other changed areas still need coverage',
    ['Preview wording in import-preview.tsx · helper naming in helpers.ts'],
    'neutral',
    20,
    22,
  ).markup;
  b += panel(
    28,
    260,
    664,
    'Consequential schematic diff: validation and writer',
    f.schematic_diff,
    'mint',
    19,
    22,
  ).markup;
  b += path('M360 476v14H186v18m-5 -6l5 6l5 -6') + path('M360 490H534v18m-5 -6l5 6l5 -6');
  b += panel(
    28,
    526,
    316,
    'Overwrite path',
    ['Input P100:99; P201:3', 'Upsert: P100:99; P201:3', 'Required: reject, keep P100:4'],
    'pending',
    17,
    22,
    204,
  ).markup;
  b += panel(
    376,
    526,
    316,
    'Write-failure path',
    [
      'Valid P201:3; P202:2',
      'Failure before row 2',
      'Per-row commit retains P201:3',
      'Atomic keeps only P100:4',
    ],
    'pending',
    17,
    22,
    204,
  ).markup;
  b += panel(
    28,
    776,
    664,
    'Disposition: request changes for both violated obligations',
    [
      'Restore existing-SKU rejection and the all-or-nothing write boundary.',
      'Keep focused evidence for both; formatting cannot compensate.',
    ],
    'mint',
    19,
    21,
  ).markup;
  b += text(
    28,
    968,
    'Arrows: trace edited logic into contractual consequences, not a risk score',
    18,
  );
  return svg(
    720,
    1000,
    'A review locates overwrite and transaction-boundary defects in a fictional diff',
    'The same create-only requirements and P100 baseline govern both review findings. Existing-stock validation removal permits overwrite, while per-row commits allow a partial import after failure. Other changed areas remain accounted for and no arbitrary risk score is assigned.',
    b,
  );
}
function permission(mobile) {
  const f = fixture.permission;
  if (mobile) {
    let b = text(20, 32, 'Trace who can reach the writer', 21);
    b += text(20, 68, 'Same U2 request · P7 · Plan → Revised', 16);
    let y = 106;
    let p = panel(
      20,
      y,
      320,
      'Policy for this shared project',
      ['Owner or current P7 editor may rename.', 'Use server-established membership.'],
      'neutral',
      16,
      20,
    );
    b += p.markup;
    y += p.height + 46;
    p = panel(
      20,
      y,
      320,
      'Editor of P7 → permit',
      ['Identity U2 → P7 role lookup', 'Permission true → one write', 'Title becomes Revised'],
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
      'Viewer P7 / editor P8 → deny',
      ['Identity U2 → P7 role lookup', 'Permission false → stop', 'Zero writes; title stays Plan'],
      'pending',
      18,
      18,
    );
    b += p.markup;
    y += p.height + 46;
    p = panel(
      20,
      y,
      320,
      'Proposed guard checks identity',
      [
        'if (!actor) return forbidden()',
        'Both relationship cases are logged in.',
        'The denied paths now reach a write.',
      ],
      'pending',
      16,
      18,
    );
    b += p.markup;
    y += p.height + 46;
    p = panel(
      20,
      y,
      320,
      'Restore resource permission',
      [
        'Keep allowed and denied checks.',
        'Check response, title and write count.',
        'Real route and lookup still untested.',
      ],
      'mint',
      16,
      20,
    );
    b += p.markup;
    y += p.height + 50;
    b += text(20, y, 'Arrows within labels: request → decision → effect', 14);
    y += 33;
    b += text(20, y, 'Only the trusted relationship varies.', 17);
    return svg(
      360,
      y + 32,
      'Resource permission separates permitted and denied rename paths',
      'The same U2 rename request targets P7 from Plan. A P7 editor reaches one write, while a P7 viewer or P8-only editor stops before writing. The authentication-only change wrongly admits both denied cases. Executed reference policy checks are not a production authorization assessment.',
      b,
    );
  }
  let b = text(28, 32, 'A small guard change broadens the allowed writer', 23);
  b += text(28, 68, 'Same U2 action and P7 starting state; vary only trusted relationship', 19);
  b += panel(
    28,
    106,
    664,
    `${f.actor} → rename ${f.project} from Plan to Revised`,
    ['Policy: P7 owner or current P7 editor; authenticated identity alone is insufficient.'],
    'neutral',
    18,
    22,
  ).markup;
  b += panel(
    28,
    264,
    316,
    'Permitted relationship',
    ['Server lookup: editor of P7', 'Identity: U2 · target: P7'],
    'neutral',
    18,
    21,
  ).markup;
  b += panel(
    376,
    264,
    316,
    'Denied relationships',
    ['Viewer P7 or editor P8 only', 'Identity: U2 · target: P7'],
    'neutral',
    17,
    21,
  ).markup;
  b += down(186, 416) + down(534, 416);
  b += panel(
    28,
    457,
    316,
    'Resource permission: true',
    ['Permit the requested rename.', 'Continue to the writer.'],
    'mint',
    18,
    20,
  ).markup;
  b += panel(
    376,
    457,
    316,
    'Resource permission: false',
    ['Deny the requested rename.', 'Stop before the writer.'],
    'pending',
    18,
    20,
  ).markup;
  b += down(186, 609) + down(534, 609);
  b += panel(28, 650, 316, 'State effect', ['One write', 'Title: Revised'], 'mint', 20, 22).markup;
  b += panel(
    376,
    650,
    316,
    'State effect',
    ['Zero writes', 'Title: Plan'],
    'pending',
    20,
    22,
  ).markup;
  b += panel(
    28,
    836,
    664,
    'Proposed identity-only guard: if (!actor) return forbidden()',
    [
      'U2 is authenticated in both cases; denied relationships would also write.',
      'Disposition: restore resource-specific permission and meaningful checks.',
    ],
    'mint',
    18,
    20,
  ).markup;
  b += text(
    28,
    1028,
    'Arrows: request identity → resource decision → write or unchanged state',
    18,
  );
  return svg(
    720,
    1060,
    'Compare permitted and denied paths with the same actor, action and resource',
    'Only the trusted relationship differs across the U2 P7 rename cases. Resource authorization permits the P7 editor and denies the viewer or P8-only editor, preserving the denied state. An authentication-only guard loses that decision. The reference also checks owner and missing-actor cases outside this diagram.',
    b,
  );
}
function claim(mobile) {
  const f = fixture.claim;
  if (mobile) {
    let b = text(20, 32, 'A reviewer claim needs a mechanism', 19);
    b += text(20, 68, 'RACE-1 is invented · reference checks executed', 15);
    let y = 106;
    let p = panel(
      20,
      y,
      320,
      'Allegation, not established defect',
      ['“Both calls read PV7 before deletion.”'],
      'pending',
      16,
      18,
    );
    b += p.markup;
    y += p.height + 46;
    p = panel(20, y, 320, 'Inspected synchronous take()', f.code, 'neutral', 15, 19);
    b += p.markup;
    y += p.height + 46;
    p = panel(
      20,
      y,
      320,
      'Required execution assumptions',
      [
        'One JavaScript agent; private Map',
        'Primitive keys; no await or reentry',
        'take finishes before caller awaits.',
      ],
      'neutral',
      16,
      18,
    );
    b += p.markup;
    y += p.height + 12;
    b += down(180, y);
    y += 41;
    p = panel(
      20,
      y,
      320,
      'Original helper reference',
      ['Results: saved + missing', 'Persistence calls: 1', 'Code + execution model explain why.'],
      'mint',
      17,
      20,
    );
    b += p.markup;
    y += p.height + 46;
    p = panel(
      20,
      y,
      320,
      'Separate await counterexample',
      [
        'Insert await between read and delete.',
        'Results: saved + saved; calls: 2',
        'This changes the original assumption.',
      ],
      'pending',
      16,
      18,
    );
    b += p.markup;
    y += p.height + 46;
    p = panel(
      20,
      y,
      320,
      'Disposition: scoped refutation',
      [
        'No read/delete interleaving here.',
        'Reassess on async or deployment change.',
        'No durable or distributed guarantee.',
      ],
      'mint',
      15,
      19,
    );
    b += p.markup;
    y += p.height + 50;
    b += text(20, y, 'Arrow: inspected evidence → conclusion', 15);
    y += 33;
    b += text(20, y, 'One passing run alone is not a proof.', 17);
    return svg(
      360,
      y + 32,
      'A race allegation is assessed against code and an explicit execution model',
      'The supplied synchronous helper has no yield or reentrant callback in one JavaScript agent. A reference yields saved and missing with one persistence call. Inserting await creates a separate two-save counterexample. Refutation is scoped to the original read/delete mechanism and does not approve distributed or durable behavior.',
      b,
    );
  }
  let b = text(28, 32, 'Trace an allegation to evidence and a scoped disposition', 22);
  b += text(28, 68, 'RACE-1: fictional automated-review claim · checked JavaScript references', 18);
  b += panel(
    28,
    106,
    664,
    'Allegation: two confirmations both read PV7 before deletion',
    ['Plausible wording is not yet a verified interleaving mechanism.'],
    'pending',
    20,
    21,
  ).markup;
  b += panel(28, 264, 316, 'Inspected take()', f.code, 'neutral', 16, 22, 204).markup;
  b += panel(
    376,
    264,
    316,
    'Execution assumptions',
    [
      'One JavaScript agent',
      'Private Map; primitive keys',
      'No await, callback, or reentry',
      'take before caller’s first await',
    ],
    'neutral',
    16,
    21,
    204,
  ).markup;
  b += path('M186 480v14H360v18m-5 -6l5 6l5 -6') + path('M534 480v14H360');
  b += panel(
    28,
    530,
    664,
    'Original: saved + missing · persistence calls: 1',
    [
      'First take reads and deletes; the next take sees no value.',
      'The code and run-to-completion model supply the argument.',
    ],
    'mint',
    20,
    22,
  ).markup;
  b += panel(
    28,
    716,
    664,
    'Different helper: insert await between lookup and deletion',
    [
      'Reference then yields saved + saved with two persistence calls.',
      'That changed helper does not show a yield in the supplied original.',
    ],
    'pending',
    20,
    21,
  ).markup;
  b += panel(
    28,
    902,
    664,
    'Disposition: refuted under the inspected single-agent assumptions',
    [
      'No demonstrated read/delete race in this synchronous private-Map helper.',
      'Reassess if the helper yields or the deployment/store assumptions change.',
      'No claim of durable consumption, distributed safety, or correct retries.',
    ],
    'mint',
    18,
    20,
  ).markup;
  b += text(
    28,
    1126,
    'Arrows: evidence supports a scoped conclusion; an allegation is not approval.',
    18,
  );
  return svg(
    720,
    1158,
    'Code evidence and execution semantics refute a particular race allegation',
    'The original helper’s synchronous private Map and single-agent execution are compared with a deliberately changed await-based counterexample. Reference observations support the scoped reasoning, but one passing run alone would not prove race freedom and no wider production guarantee is claimed.',
    b,
  );
}
await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['import', importer],
  ['permission', permission],
  ['claim', claim],
]) {
  for (const mobile of [false, true]) {
    const filename = `review-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Rendered six original intent-and-risk review illustrations and registered their dimensions.',
);
