// Original traceable-history illustrations; all history identifiers are teaching labels.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find(
  (p) => p.id === 'agentic-keep-a-traceable-change-history',
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
  if (mobile) {
    let b = text(20, 32, 'Recover the overwrite decision', 20);
    b += text(20, 68, 'Fictional IDs · no release executed', 16);
    let y = 106;
    const add = (title, rows, cls = 'neutral', relation = '') => {
      const p = panel(20, y, 320, title, rows, cls, 17, 20);
      b += p.markup;
      y += p.height;
      if (relation) {
        b += down(180, y + 10, 22);
        b += text(20, y + 62, relation, 16);
        y += 88;
      }
    };
    add(
      'IMP42 · accepted revision D7',
      [
        'Listed SKUs replace quantities.',
        'Absent SKUs remain unchanged.',
        'D7 supersedes create-only policy.',
      ],
      'neutral',
      'Purpose links to implementation',
    );
    add(
      'C1 · add preview + T1',
      ['P100:99 → replace', 'P201:3 → create', 'T1: no inventory writes'],
      'neutral',
      'C1 → C2: parent to child',
    );
    add(
      'C2 · add confirmation + T2',
      ['D7 explains the replacement rule.', 'T2: P100:99; P201:3', 'P900 stays 8.'],
      'mint',
      'Evidence at C2 supports assessment',
    );
    add(
      'R2 · assess H0..C2',
      ['Reviewed range is named.', 'T1 and T2 identify C2.', 'Approval is not integration.'],
      'neutral',
      'Map reviewed head into shared history',
    );
    add(
      'M2 · integrated version',
      ['Parents: H0 and C2', 'I2: separate integration evidence'],
      'neutral',
      'REL7 records source and build identity',
    );
    add(
      'REL7 · source M2',
      [
        'Artifact A7 · configuration CFG2',
        'Real records need actual digests.',
        'No running-state proof here.',
      ],
      'pending',
    );
    y += 50;
    b += text(20, y, 'Connectors mean their written relation.', 16);
    return svg(
      360,
      y + 34,
      'A fictional trace identifies the overwrite decision',
      'IMP42 and D7 link to C1 preview and C2 confirmation. Parent-to-child ancestry, reviewed range, integration mapping and release identity are distinct labeled relationships. T1 and T2 reference checks were executed; review, integration and release labels are fictional.',
      b,
    );
  }
  let b = text(28, 32, 'Trace an overwrite to its accepted decision', 23);
  b += text(28, 68, 'All history IDs are fictional · no review, merge or release executed', 18);
  b += panel(
    28,
    106,
    664,
    'IMP42 / D7 · revised acceptance',
    [
      'Listed SKUs replace quantities; absent SKUs remain unchanged.',
      'D7 explicitly supersedes the earlier create-only policy.',
    ],
    'neutral',
    19,
    22,
  ).markup;
  b += down(360, 260, 22);
  b += text(28, 308, 'Purpose links: preview and confirmation implement the revised outcome', 18);
  b += panel(
    28,
    338,
    316,
    'C1 · preview + T1',
    ['P100:99 → replace', 'P201:3 → create', 'T1: no inventory writes'],
    'neutral',
    18,
    22,
  ).markup;
  b += panel(
    376,
    338,
    316,
    'C2 · confirmation + T2',
    ['D7: replace listed stock', 'T2: P100:99; P201:3', 'P900 stays 8.'],
    'mint',
    18,
    21,
  ).markup;
  b += path('M344 398h32m-6 -5l6 5l-6 5');
  b += text(28, 550, 'C1 → C2: parent-to-child ancestry; T1/T2 identify their source version', 18);
  b += down(360, 568, 22);
  b += panel(
    28,
    616,
    664,
    'R2 · assessed range H0..C2',
    ['T1 and T2 at C2 support the review; approval is not integration.'],
    'neutral',
    19,
    22,
  ).markup;
  b += down(360, 736, 22);
  b += text(28, 790, 'Map the reviewed head to the integrated version', 18);
  b += panel(
    28,
    818,
    664,
    'M2 · integration record',
    ['Parents H0 and C2; I2 records separate integration evidence.'],
    'neutral',
    19,
    22,
  ).markup;
  b += down(360, 938, 22);
  b += text(28, 992, 'Release record identifies source, artifact and configuration', 18);
  b += panel(
    28,
    1020,
    664,
    'REL7 · source M2 · artifact A7 · configuration CFG2',
    [
      'Real records retain resolvable revisions and built-byte digests.',
      'This fictional mapping does not establish deployed or running state.',
    ],
    'pending',
    19,
    21,
  ).markup;
  b += text(
    28,
    1204,
    'Each connector means its written relation; this is not one commit graph.',
    18,
  );
  return svg(
    720,
    1238,
    'A fictional requirement-to-release trace retains the overwrite rationale',
    'Purpose links connect IMP42 and D7 to preview C1 and confirmation C2. Only the horizontal C1-to-C2 arrow means parent-to-child ancestry. Other connectors name assessment, integration and release identity relationships. All history labels are fictional.',
    b,
  );
}

function split(mobile) {
  const same = fixture.split_final_trees_identical;
  if (!same) throw new Error('Reference split must retain the final files.');
  if (mobile) {
    let b = text(20, 32, 'Separate purpose; retain final files', 20);
    b += text(20, 68, 'Fictional local work · same CSV and stock', 15);
    let y = 106;
    const add = (title, rows, cls = 'neutral') => {
      const p = panel(20, y, 320, title, rows, cls, 17, 20);
      b += p.markup;
      y += p.height;
    };
    add(
      'MIXED · feature + rename',
      [
        'import.mjs: writer and helper name',
        'import.test.mjs: both purposes',
        'One unit hides two decisions.',
      ],
      'pending',
    );
    y += 55;
    b += text(20, y, 'Reorganize owned, unshared work', 17);
    y += 35;
    add(
      'B · confirmation + its checks',
      [
        'Keep parseRows as the name.',
        'Replace listed SKUs; retain others.',
        'T2 is included; T1/T2 pass.',
      ],
      'mint',
    );
    b += down(180, y + 12, 24);
    y += 65;
    add(
      'N · rename helper + references',
      ['parseRows → readRows', 'Update source and test callers.', 'Keep assertions; rerun T1/T2.'],
      'mint',
    );
    y += 54;
    add(
      'Reference comparison',
      [
        'Final N files = final MIXED files.',
        'B and N both load and pass.',
        'No actual history split executed.',
      ],
      'neutral',
    );
    y += 50;
    b += text(20, y, 'Arrow B → N: parent-to-child order', 16);
    return svg(
      360,
      y + 34,
      'Two coherent purposes retain the same final files',
      'MIXED combines feature and rename changes within source and tests. B retains confirmation with its tests; N renames the helper and every caller while preserving assertions. Disposable reference snapshots pass and match final files, without modifying Git history.',
      b,
    );
  }
  let b = text(28, 32, 'Split by purpose, including within the same files', 23);
  b += text(28, 68, 'Fictional local work · same input, baseline, assertions and final files', 18);
  b += panel(
    28,
    106,
    316,
    'MIXED · one unit',
    [
      'Add confirmation writer',
      'Rename parseRows to readRows',
      'Add feature assertions',
      'Update test helper imports',
    ],
    'pending',
    17,
    22,
  ).markup;
  b += panel(
    376,
    106,
    316,
    'B · confirmation + checks',
    [
      'Keep parseRows as the name.',
      'Replace listed SKUs.',
      'Preserve absent stock.',
      'Include T2; T1/T2 pass.',
    ],
    'mint',
    17,
    20,
  ).markup;
  b += down(534, 334, 24);
  b += text(376, 393, 'B → N: parent-to-child order', 17);
  b += panel(
    376,
    422,
    316,
    'N · rename + references',
    [
      'parseRows → readRows',
      'Update every source caller.',
      'Update test imports/calls.',
      'Keep assertions; T1/T2 pass.',
    ],
    'mint',
    17,
    20,
  ).markup;
  b += panel(
    28,
    422,
    316,
    'Both files mix purposes',
    ['import.mjs', 'import.test.mjs', 'Do not split code from tests.'],
    'neutral',
    17,
    21,
  ).markup;
  b += panel(
    28,
    688,
    664,
    'N final files = MIXED final files',
    [
      'Reference snapshots B and N load and pass their checks.',
      'Final file bytes match; no actual commits were split.',
    ],
    'neutral',
    20,
    23,
  ).markup;
  b += text(
    28,
    874,
    'Organized purposes help interpretation; byte equality is only one check.',
    18,
  );
  return svg(
    720,
    908,
    'Purpose-based units preserve implementation and relevant tests',
    'The same final source and test files are compared as one mixed change or a confirmation unit B followed by rename N. Behavior assertions remain with B and are retained and rerun after N. Only B-to-N means ancestry; the final comparison concerns file bytes.',
    b,
  );
}

function summary(mobile) {
  const f = fixture;
  if (f.summaryS1.head === f.summaryS2.head) throw new Error('Expected a stale source version.');
  if (mobile) {
    let b = text(20, 32, 'Correct the record for the actual head', 19);
    b += text(20, 68, 'Fictional IDs · proposed head stays C2', 16);
    let y = 106;
    const add = (title, rows, cls = 'neutral') => {
      const p = panel(20, y, 320, title, rows, cls, 17, 20);
      b += p.markup;
      y += p.height;
    };
    add(
      'S1 · superseded record',
      ['Describes C1: preview only.', 'No confirmation writer.', 'Evidence: T1 at C1'],
      'pending',
    );
    y += 46;
    add('Actual proposal · H0..C2', [
      'C2 adds a confirmation writer.',
      'It can replace existing stock.',
      'C1 and C2 digests differ.',
    ]);
    y += 46;
    add('Inspect C1..C2', [
      'inventory[row.sku] = row.quantity',
      'New T2: listed stock replaces.',
      'Absent P900 remains 8.',
    ]);
    b += down(180, y + 12, 24);
    y += 65;
    add(
      'S2 · current description',
      [
        'Scope: preview + confirmation',
        'Decision: D7 permits replacement.',
        'Evidence: T1 and T2 at C2',
        'Integration checks pending.',
      ],
      'mint',
    );
    y += 50;
    b += text(20, y, 'Arrow: comparison informs the correction.', 15);
    y += 32;
    b += text(20, y, 'Updated words do not perform review.', 16);
    return svg(
      360,
      y + 34,
      'A current description replaces a stale preview-only summary',
      'S1 describes the earlier C1 while the unchanged proposed head C2 contains a writer. Comparing the delta and reference evidence informs S2. S2 names the actual range, decision, version-specific checks and pending integration without claiming approval.',
      b,
    );
  }
  let b = text(28, 32, 'A summary must describe the version being proposed', 23);
  b += text(28, 68, 'Fictional IDs · same proposed head C2 throughout this correction', 18);
  b += panel(
    28,
    106,
    316,
    'S1 · superseded',
    ['Describes C1: preview only', 'No confirmation writer', 'T1 at C1'],
    'pending',
    18,
    22,
  ).markup;
  b += panel(
    376,
    106,
    316,
    'Actual proposal · H0..C2',
    ['C2 adds confirmation.', 'Can replace existing stock.', 'Different source digest'],
    'neutral',
    18,
    20,
  ).markup;
  b += path('M344 166h32m-6 -5l6 5l-6 5');
  b += text(28, 320, 'Horizontal arrow: compare recorded scope with actual proposed scope', 18);
  b += panel(
    28,
    350,
    664,
    'Inspect C1..C2 · explain the changed bytes',
    [
      'New write: inventory[row.sku] = row.quantity',
      'New T2: listed SKUs replace; absent P900 remains 8.',
    ],
    'neutral',
    20,
    22,
  ).markup;
  b += down(360, 504, 24);
  b += text(28, 558, 'Source comparison and current evidence inform the corrected record', 18);
  b += panel(
    28,
    586,
    664,
    'S2 · current description names H0..C2',
    [
      'Preview and confirmation; D7 permits replacement of listed SKUs.',
      'Absent SKUs remain; T1 and T2 passed at C2.',
      'Integration checks pending; current review still required.',
    ],
    'mint',
    19,
    22,
  ).markup;
  b += text(28, 802, 'Changed content digests detect difference; diffs explain meaning.', 19);
  b += text(
    28,
    840,
    'A corrected description does not create approval or integration evidence.',
    18,
  );
  return svg(
    720,
    874,
    'A stale summary is corrected against the final diff and version-specific evidence',
    'S1 describes C1 preview-only behavior but C2 adds a replacement writer. The C1-to-C2 source delta and reference checks inform S2, which describes H0-to-C2, cites D7 and current checks, and leaves integration pending. All identifiers are fictional.',
    b,
  );
}

await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['trace', trace],
  ['split', split],
  ['summary', summary],
]) {
  for (const mobile of [false, true]) {
    const filename = `history-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered six original traceable-history SVGs and registered their dimensions.');
