// Original recovery illustrations: fictional source history, conditional effect repair, and resumption brief.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find((p) => p.id === 'agentic-keep-work-recoverable').examples;
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

function checkpoint(mobile) {
  const f = fixture.checkpoint;
  if (mobile) {
    let b = text(20, 32, 'Restore code. Retain the failure.', 20);
    b += text(20, 68, 'Fictional local revisions · owned scope only', 15);
    b += rect(20, 106, 320, 96) + text(36, 142, `${f.checkpoint} · earlier checks pass`, 21);
    b += text(36, 181, 'F1 preview row still wrong', 18);
    b += down(180, 214);
    b += rect(20, 255, 320, 96, 'pending') + text(36, 291, 'E1 · remove quotes', 21);
    b += text(36, 330, 'Breaks record structure', 18);
    b += down(180, 363);
    b += rect(20, 404, 320, 96, 'pending') + text(36, 440, 'E2 · remove embedded CRLF', 19);
    b += text(36, 479, 'Changes the note value', 18);
    b += path('M180 512v24m-5 -6l5 6l5 -6', 'boundary');
    b += text(20, 570, 'Restore only the owned experiment', 17, 'accent');
    b += rect(20, 594, 320, 96, 'mint') + text(36, 630, 'Selected code: C0', 22, 'accent');
    b += text(36, 669, 'Recheck baseline and F1', 18);
    b += text(20, 738, 'Retained outside removal scope', 19, 'accent');
    b +=
      rect(20, 764, 320, 164, 'mint') + text(36, 800, 'F1 · quoted multiline note', 21, 'accent');
    b += lines(
      36,
      841,
      [
        'One logical data record',
        '3 physical lines including header',
        'Expected row 1; observed row 2',
      ],
      17,
      29,
    );
    b += rect(20, 974, 320, 104) + text(36, 1010, 'New diagnosis: preview mapping', 17);
    b += text(36, 1051, 'Keep quoting; inspect the adapter.', 17);
    b += text(20, 1126, 'Black arrows: local source history', 17);
    b += text(20, 1159, 'Green arrow: restoration action', 17);
    b += text(20, 1192, 'Other contributors’ work stays intact.', 17);
    return svg(
      360,
      1224,
      'Abandon the local parser attempt while retaining its failing fixture',
      'Fictional C0 E1 E2 history is distinct from source restoration. C0 is selected again only within the owned scope. F1 and the row mismatch remain outside removal scope, supporting a new adapter investigation without losing the failure.',
      b,
    );
  }
  let b = text(28, 32, 'A recovery path for code and for learning', 23);
  b += text(28, 68, 'Fictional local history · unshared experiment · other work preserved', 19);
  b += text(28, 119, 'Source history', 22) + text(376, 119, 'Retained evidence', 22, 'accent');
  b += rect(28, 148, 316, 112) + text(44, 186, `${f.checkpoint} · baseline checks pass`, 21);
  b += text(44, 228, 'F1 row failure still exists', 19);
  b += down(186, 272);
  b += rect(28, 313, 316, 112, 'pending') + text(44, 351, 'E1 · remove quotes', 22);
  b += text(44, 393, 'Breaks record structure', 19);
  b += down(186, 437);
  b += rect(28, 478, 316, 112, 'pending') + text(44, 516, 'E2 · remove embedded CRLF', 19);
  b += text(44, 558, 'Changes note value', 19);
  b += path('M186 602v24m-5 -6l5 6l5 -6', 'boundary');
  b += text(28, 660, 'Restore owned scope', 20, 'accent');
  b += rect(28, 683, 316, 112, 'mint') + text(44, 721, 'Selected code: C0', 22, 'accent');
  b += text(44, 763, 'Recheck baseline and F1', 19);
  b += rect(376, 148, 316, 176, 'mint') + text(392, 186, 'F1 · quoted CRLF in note', 20, 'accent');
  b += lines(
    392,
    228,
    ['One logical data record', 'Three physical lines with header', 'Keep outside removal scope'],
    17,
    31,
  );
  b += down(534, 336);
  b += rect(376, 377, 316, 176) + text(392, 415, 'Failure record retained', 22);
  b += lines(
    392,
    457,
    ['Expected data row 1', 'Observed data row 2', 'Rejected explanations retained'],
    18,
    31,
  );
  b += down(534, 565);
  b += rect(376, 606, 316, 189) + text(392, 644, 'Next question', 22);
  b += lines(
    392,
    687,
    ['Physical line position used', 'as logical data row?', 'Inspect the preview adapter.'],
    19,
    34,
  );
  b += text(
    28,
    852,
    'C0 is recoverable, not complete: the minimized failure must remain visible.',
    19,
  );
  b += text(28, 900, 'Black arrows: history at left; retained evidence at right', 18);
  b += text(28, 934, 'Green arrow: source restoration action, not a new parent commit', 18);
  return svg(
    720,
    966,
    'Restorable source history and retained learning have different scopes',
    'Fictional C0 E1 E2 local history is abandoned within an owned boundary. The selected code returns to C0, while retained F1 and the expected versus observed row numbers guide a new investigation. This diagram is not an executed history operation.',
    b,
  );
}
function effects(mobile) {
  const f = fixture.effects;
  if (mobile) {
    let b = text(20, 32, 'Code recovery has a boundary', 21);
    b += text(20, 68, 'Constructed ledger · same I7 and S9', 17);
    b += rect(20, 106, 320, 140) + text(36, 142, `${f.sku} · additive stock only`, 21);
    b += lines(36, 184, ['Initial 10 + import I7 (+5)', '− unrelated sale S9 (2) = 13'], 18, 31);
    b += text(20, 296, 'After source restoration', 21, 'accent');
    b += rect(20, 324, 320, 96, 'mint') + text(36, 360, 'Code returns to C0', 22, 'accent');
    b += text(36, 399, 'Existing effects are not reversed.', 17);
    b += rect(20, 466, 320, 96) + text(36, 502, 'Committed stock stays 13', 22);
    b += text(36, 541, 'I7 and S9 remain in the ledger.', 17);
    b += rect(20, 608, 320, 96, 'pending') + text(36, 644, 'N7 remains delivered', 22);
    b += text(36, 683, 'No source-control recall', 18);
    b +=
      rect(20, 750, 320, 168, 'mint') + text(36, 786, 'Conditional data repair: C7', 20, 'accent');
    b += lines(
      36,
      828,
      ['13 − I7’s 5 = target 8', 'Keep the sale’s −2 effect.', 'Check domain rules + duplicates.'],
      17,
      30,
    );
    b += rect(20, 964, 320, 104, 'pending') + text(36, 1000, 'Do not reset stock to 10', 20);
    b += text(36, 1041, 'That would erase S9’s effect.', 17);
    b += text(20, 1118, 'A correction message is a new action.', 17);
    b += text(20, 1151, 'Repair plan only; nothing executed.', 17);
    return svg(
      360,
      1183,
      'Separate restored code, committed stock, and delivered notifications',
      'Source restoration changes only code. Stock remains 13 and N7 remains delivered. Under a simplified additive model a separately authorized C7 compensation targets 8 while preserving S9. Domain and retry checks remain requirements, not implemented guarantees.',
      b,
    );
  }
  let b = text(28, 32, 'Restoring source does not restore every effect', 23);
  b += text(28, 68, 'Constructed additive-stock ledger · same import and sale throughout', 19);
  b +=
    rect(28, 106, 664, 104) +
    text(44, 144, `${f.sku}: initial 10 + import I7 (+5) − unrelated sale S9 (2) = 13`, 21);
  b += text(44, 185, 'N7 has already been delivered. Recovery must account for both systems.', 19);
  b +=
    text(28, 262, 'Code', 22) +
    text(254, 262, 'Database', 22) +
    text(480, 262, 'External service', 22);
  for (const [x, ls] of [
    [28, ['Faulty revision', 'after I7']],
    [254, ['Committed quantity', '13']],
    [480, ['Notification N7', 'delivered']],
  ]) {
    b += rect(x, 291, 212, 112) + lines(x + 16, 330, ls, 20, 38);
  }
  b += path('M134 415v24m-5 -6l5 6l5 -6', 'boundary');
  b += text(28, 477, 'After source restoration', 21, 'accent');
  b +=
    rect(28, 505, 212, 112, 'mint') +
    lines(44, 544, ['Source: C0', 'Selected code'], 20, 38, 'accent');
  b += rect(254, 505, 212, 112) + lines(270, 544, ['Quantity stays', '13'], 20, 38);
  b += rect(480, 505, 212, 112, 'pending') + lines(496, 544, ['N7 remains', 'delivered'], 20, 38);
  b +=
    rect(28, 663, 664, 140, 'mint') +
    text(44, 701, 'Separate conditional repair: C7 references I7', 22, 'accent');
  b += lines(
    44,
    743,
    [
      '13 − 5 = target 8; retain S9’s legitimate −2 effect.',
      'Domain checks and transactional duplicate protection remain required.',
    ],
    19,
    32,
  );
  b +=
    rect(28, 849, 664, 104, 'pending') +
    text(44, 887, 'Resetting to 10 would erase the unrelated sale’s effect.', 21);
  b += text(44, 928, 'N7 cannot be unsent by code restore; any correction is a new action.', 19);
  b += text(
    28,
    1005,
    'Green arrow: source restoration only. Compensation is a plan, not executed.',
    18,
  );
  return svg(
    720,
    1037,
    'Source restoration, data compensation, and delivery recovery differ',
    'The same fictional I7 import and S9 sale yield stock 13 before and after code restoration. Conditional compensation C7 targets 8 rather than overwriting the sale with the old stock 10. N7 remains delivered and requires a separate recovery decision.',
    b,
  );
}
function resume(mobile) {
  const f = fixture.resume;
  if (mobile) {
    let b = text(20, 32, 'Resume from anchors, not a story', 20);
    b += text(20, 68, 'Constructed brief R1 · verify before editing', 15);
    b += rect(20, 106, 320, 140) + text(36, 142, 'Source anchor', 22);
    b += lines(
      36,
      184,
      [
        `${f.source} + uncommitted D1`,
        'D1 logs preview diagnostics.',
        'No verified correction claimed.',
      ],
      17,
      29,
    );
    b += rect(20, 292, 320, 140) + text(36, 328, 'Failure anchor: F1', 22);
    b += lines(
      36,
      370,
      [
        'Expected row 1; observed row 2',
        'One record; note retains CRLF',
        'Earlier baseline checks pass.',
      ],
      17,
      29,
    );
    b += rect(20, 478, 320, 196, 'mint') + text(36, 514, 'R1 · retained learning', 22, 'accent');
    b += lines(
      36,
      556,
      [
        'E1 / E2 abandoned',
        'No local writes or sends',
        'Question: physical position used',
        'for a logical data-row number?',
      ],
      17,
      31,
    );
    b += down(180, 686);
    b += rect(20, 727, 320, 164) + text(36, 763, 'Fresh session verifies', 21);
    b += lines(
      36,
      805,
      [
        'Inspect source + dirty changes.',
        'Verify F1; reproduce failure.',
        'If state differs, update R1.',
      ],
      17,
      29,
    );
    b += down(180, 903);
    b += rect(20, 944, 320, 104, 'mint') + text(36, 980, 'Next bounded action', 22, 'accent');
    b += text(36, 1021, 'Inspect adapter before correction.', 17);
    b += text(20, 1098, 'Arrows: inspect evidence before action', 16);
    b += text(20, 1131, 'No fresh agent session was executed.', 17);
    return svg(
      360,
      1163,
      'A concise resumption brief carries evidence and uncertainty',
      'Constructed R1 points to C0 plus uncommitted diagnostics D1 and to F1 with its row mismatch. It retains rejected explanations and the unresolved mapping question. A new session verifies actual state and reproduction before selecting a bounded edit.',
      b,
    );
  }
  let b = text(28, 32, 'A resumption brief points to verifiable work', 23);
  b += text(28, 68, 'Constructed R1 · the transcript is not the source of truth', 19);
  b += rect(28, 106, 316, 176) + text(44, 144, 'Source anchor', 22);
  b += lines(
    44,
    186,
    [`${f.source} + uncommitted D1`, 'D1: preview diagnostics only', 'Not a verified correction'],
    19,
    34,
  );
  b += rect(376, 106, 316, 176) + text(392, 144, 'Failure anchor: F1', 22);
  b += lines(
    392,
    186,
    [
      'Expected row 1; observed row 2',
      'One record; note retains CRLF',
      'Earlier baseline checks pass',
    ],
    17,
    34,
  );
  b += path('M186 294v14H360v18m-5 -6l5 6l5 -6') + path('M534 294v14H360');
  b +=
    rect(28, 344, 664, 176, 'mint') +
    text(44, 382, 'R1 · retain decisions and uncertainty', 22, 'accent');
  b += lines(
    44,
    424,
    [
      'E1 / E2 abandoned; quote and newline removal changed meaning.',
      'Local probe made no writes or sends; I7 is a separate case.',
      'Question: physical line position used as logical data-row number?',
    ],
    19,
    34,
  );
  b += down(360, 532);
  b += rect(28, 573, 664, 140) + text(44, 611, 'Fresh session checks current state', 22);
  b += lines(
    44,
    653,
    [
      'Inspect source and dirty changes; verify F1 and reproduce the mismatch.',
      'If state differs from R1, update the brief before acting.',
    ],
    19,
    32,
  );
  b += down(360, 725);
  b +=
    rect(28, 766, 664, 104, 'mint') +
    text(44, 804, 'Next bounded action: inspect the preview adapter', 22, 'accent');
  b += text(44, 845, 'Test a mapping correction while preserving the parsed note.', 20);
  b += text(
    28,
    922,
    'Arrows: evidence is inspected before action; not every conversation turn.',
    18,
  );
  b += text(28, 956, 'No root cause or completed fresh-session execution is claimed.', 19);
  return svg(
    720,
    988,
    'Evidence anchors guide resumption while uncertainty stays explicit',
    'Source C0 plus uncommitted D1 and fixture F1 anchor a constructed resumption brief. R1 preserves the expected versus observed mismatch and abandoned explanations. The next session checks current state and reproduction before a bounded adapter investigation.',
    b,
  );
}
await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['checkpoint', checkpoint],
  ['effects', effects],
  ['resume', resume],
]) {
  for (const mobile of [false, true]) {
    const filename = `recover-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered six original recovery illustrations and registered their dimensions.');
