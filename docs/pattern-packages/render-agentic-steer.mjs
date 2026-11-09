// Original evidence illustrations: checked CSV fixtures and constructed diagnostic/prototype records.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find((p) => p.id === 'agentic-steer-through-evidence').examples;
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

function parser(mobile) {
  const f = fixture.parser;
  if (mobile) {
    let b = text(20, 32, 'Probe quoting before upload work', 20);
    b += text(20, 68, 'Fictional input · CRLF at line breaks', 16);
    b += rect(20, 106, 320, 201) + text(36, 142, 'Same input for both approaches', 18);
    b += lines(36, 181, f.valid_csv.split('\r\n'), 17, 31);
    b += down(180, 319);
    b += rect(20, 360, 320, 158, 'pending') + text(36, 396, 'Literal CRLF + comma split', 19);
    b += lines(
      36,
      436,
      [
        `${f.naive_data_rows} apparent data rows; expected 2`,
        'shelf" becomes a separate row',
        'Comma inside note also splits',
      ],
      17,
      30,
    );
    b += rect(20, 564, 320, 148, 'mint') + text(36, 600, 'Strict CSV reference', 21, 'accent');
    b += lines(
      36,
      641,
      [
        `${f.reference_data_rows} records; multiline note retained`,
        'Escaped quote and comma retained',
      ],
      16,
      30,
    );
    b += rect(20, 758, 320, 158) + text(36, 794, 'Separate unfinished-quote probe', 17);
    b += lines(36, 834, ['P100,"front', 'Splitter accepts; strict CSV errors'], 17, 31);
    b +=
      rect(20, 962, 320, 110, 'mint') +
      text(36, 998, 'Decision: reject literal splitting', 18, 'accent');
    b += text(36, 1039, 'Evaluate parser in target runtime', 17);
    b += text(20, 1120, 'Arrows: probe input into comparison', 16);
    b += text(20, 1153, 'Fixtures do not certify an importer.', 17);
    return svg(
      360,
      1185,
      'Quoted CSV probes change the implementation decision',
      'Both approaches receive the same CRLF fixture. A naive splitter creates three rows; a strict reference preserves two records and rejects the separate unfinished quote. Runtime integration and broader dialect behavior remain unchecked.',
      b,
    );
  }
  let b = text(28, 32, 'Check the assumption before the upload UI', 23);
  b += text(28, 68, 'Fictional fixtures · line breaks are CRLF', 19);
  b += rect(28, 106, 664, 201) + text(44, 143, 'Same valid input for both approaches', 21);
  b += lines(44, 186, f.valid_csv.split('\r\n'), 20, 31);
  b += path('M360 319v12H186v18m-5 -6l5 6l5 -6');
  b += path('M360 331H534v18m-5 -6l5 6l5 -6');
  b += rect(28, 366, 316, 184, 'pending') + text(44, 404, 'Literal CRLF + comma split', 20);
  b += lines(
    44,
    447,
    [
      `${f.naive_data_rows} apparent data rows; expected 2`,
      'shelf" becomes a separate row',
      'Note’s comma also splits',
    ],
    18,
    32,
  );
  b += rect(376, 366, 316, 184, 'mint') + text(392, 404, 'Strict CSV reference', 21, 'accent');
  b += lines(
    392,
    447,
    [
      `${f.reference_data_rows} records; quoted CRLF retained`,
      'Escaped quote retained',
      'Note’s comma retained',
    ],
    18,
    32,
  );
  b += rect(28, 596, 664, 112) + text(44, 634, 'Separate malformed fixture ends: P100,"front', 21);
  b += text(44, 676, 'Literal splitter accepts text; strict CSV raises an error.', 20);
  b +=
    rect(28, 754, 664, 110, 'mint') +
    text(44, 792, 'Reject literal splitting before dependent UI work expands', 22, 'accent');
  b += text(44, 833, 'Evaluate a parser with the required behavior in the target runtime.', 20);
  b += text(28, 916, 'Arrows: one input enters a comparison, not measured execution time', 18);
  b += text(
    28,
    950,
    'Reference fixtures only; streaming, limits, and importer behavior remain open.',
    18,
  );
  return svg(
    720,
    982,
    'One representative quoted input distinguishes two parser approaches',
    'The same CRLF CSV input creates three apparent data rows with literal splitting but two records with the strict reference. The malformed fixture supplies a separate rejection check. The failure changes the implementation decision without certifying a production parser.',
    b,
  );
}
function timeout(mobile) {
  const f = fixture.timeout;
  if (mobile) {
    let b = text(20, 32, 'Which stage explains the timeout?', 19);
    b += text(
      20,
      68,
      `${f.request} · constructed ${f.deadline_ms.toLocaleString('en-US')} ms deadline`,
      17,
    );
    b += rect(20, 106, 320, 168, 'pending') + text(36, 142, 'Competing explanations', 21);
    b += lines(
      36,
      184,
      ['H1 · slow parsing', 'H2 · database contention', 'H3 · disconnected result path'],
      18,
      30,
    );
    b += rect(20, 320, 320, 154) + text(36, 357, 'Observation 1 · same request', 19);
    b += lines(
      36,
      398,
      [
        `Parsing ends at ${f.parse_end_ms} ms`,
        `DB waits from ${f.db_wait_start_ms} ms; pending`,
        'at the 3,000 ms deadline',
      ],
      18,
      29,
    );
    b += down(180, 486);
    b += rect(20, 527, 320, 126) + text(36, 564, 'H1: not the ongoing wait', 20);
    b += lines(
      36,
      606,
      ['DB wait cause still unresolved.', 'H3 delivery evidence missing.'],
      18,
      28,
    );
    b += down(180, 665);
    b +=
      rect(20, 706, 320, 154, 'mint') + text(36, 743, 'Observation 2 · lock record', 20, 'accent');
    b += lines(
      36,
      785,
      [
        `${f.lock_owner} blocks ${f.request}: 14 → 4,014 ms`,
        '4,000 ms of database lock wait',
        'Positive evidence of contention',
      ],
      17,
      29,
    );
    b += rect(20, 906, 320, 106, 'mint') + text(36, 943, 'H2 is a contributor', 21, 'accent');
    b += text(36, 984, 'Next: inspect TX9 boundary', 18);
    b += rect(20, 1058, 320, 106, 'pending') + text(36, 1095, 'H3 remains possible', 21);
    b += text(36, 1136, 'Next: trace result delivery', 18);
    b += text(20, 1214, 'Arrows: evidence narrows diagnosis', 16);
    b += text(20, 1247, 'No probabilities; no measured trace.', 17);
    return svg(
      360,
      1279,
      'Narrow a timeout explanation while preserving uncertainty',
      'Constructed R17 parser completion rules out ongoing parsing. An identified TX9 lock establishes database contention as a contributor. Worker result delivery remains unobserved; the hypotheses need not be exclusive or exhaustive.',
      b,
    );
  }
  let b = text(28, 32, 'A timeout reproduces the symptom, not its cause', 23);
  b += text(
    28,
    68,
    `${f.request} · constructed deadline ${f.deadline_ms.toLocaleString('en-US')} ms · hypotheses may coexist`,
    19,
  );
  for (const [x, title, ls] of [
    [28, 'H1 · parsing', ['Parsing is still', 'occupying the request']],
    [254, 'H2 · database', ['Contention blocks', 'progress']],
    [480, 'H3 · result path', ['Worker result delivery', 'is disconnected']],
  ]) {
    b +=
      rect(x, 106, 212, 138, 'pending') +
      text(x + 16, 143, title, 20) +
      lines(x + 16, 184, ls, 17, 29);
  }
  b += rect(28, 290, 664, 112) + text(44, 328, 'Observation 1 · correlated stages for R17', 21);
  b += text(44, 370, 'Parse ends at 12 ms; DB waits from 14 ms and is pending at deadline.', 19);
  b += down(360, 414);
  b +=
    rect(28, 455, 664, 112) +
    text(44, 493, 'H1 does not explain the ongoing wait after parsing', 22);
  b += text(
    44,
    535,
    'A pending DB span does not identify contention or verify result delivery.',
    18,
  );
  b += down(360, 579);
  b +=
    rect(28, 620, 664, 112, 'mint') +
    text(44, 658, 'Observation 2 · correlated database lock record', 22, 'accent');
  b += text(
    44,
    700,
    `${f.lock_owner} blocks ${f.request} from 14 to 4,014 ms: 4,000 ms of lock wait.`,
    20,
  );
  b += path('M360 744v12H186v18m-5 -6l5 6l5 -6') + path('M360 756H534v18m-5 -6l5 6l5 -6');
  b += rect(28, 792, 316, 112, 'mint') + text(44, 830, 'H2 is a contributor', 22, 'accent');
  b += lines(44, 869, ['Next: inspect TX9 boundary'], 18, 30);
  b += rect(376, 792, 316, 112, 'pending') + text(392, 830, 'H3 remains possible', 22);
  b += text(392, 869, 'Next: trace result delivery', 18);
  b += text(
    28,
    956,
    'Arrows: evidence narrows the explanation; no probabilities or timing scale',
    18,
  );
  return svg(
    720,
    988,
    'Positive evidence identifies one timeout contributor, not all causes',
    'Three initial hypotheses are compared against constructed observations. Parser completion narrows the explanation; a TX9 lock record confirms a database contention contributor while missing delivery evidence leaves the worker result path unresolved.',
    b,
  );
}
function prototype(mobile) {
  const f = fixture.prototype;
  if (mobile) {
    let b = text(20, 32, 'What did the prototype establish?', 20);
    b += text(20, 68, 'Constructed walkthrough · no user study', 16);
    b += rect(20, 106, 320, 104) + text(36, 143, `Same file · row ${f.row}: ${f.error}`, 18);
    b += text(36, 184, 'File and other rows stay fixed.', 18);
    b += rect(20, 256, 320, 104, 'pending') + text(36, 293, 'A · “Cannot confirm” only', 21);
    b += text(36, 334, 'Fictional participant gets stuck.', 17);
    b += rect(20, 406, 320, 202, 'mint') + text(36, 443, 'B · repair path', 22, 'accent');
    b += lines(36, 485, f.b, 18, 31);
    b += rect(20, 654, 320, 104, 'mint') + text(36, 691, 'Supported for this task', 21, 'accent');
    b += text(36, 732, 'Carry B into next design iteration.', 17);
    b += rect(20, 804, 320, 232, 'pending') + text(36, 841, 'Unresolved production conditions', 17);
    b += lines(
      36,
      883,
      [
        'Authorization + persistence',
        'Keyboard + assistive tech',
        'Recovery after failure',
        'Representative load',
      ],
      18,
      34,
    );
    b += text(20, 1086, 'Interaction evidence stays in scope.', 17);
    b += text(20, 1119, 'No production-readiness conclusion.', 17);
    return svg(
      360,
      1151,
      'Prototype repair evidence has a defined boundary',
      'Both fictional prototype paths retain the same file and row-2 error. Adding a repair route supports one task walkthrough. Production conditions remain visibly separate and untested; no observed user research is claimed.',
      b,
    );
  }
  let b = text(28, 32, 'Resolve an interaction; retain the production questions', 23);
  b += text(28, 68, 'Constructed walkthrough · not conducted user research', 19);
  b +=
    rect(28, 106, 664, 103) +
    text(44, 144, `Held constant: same file, row ${f.row} with ${f.error}`, 22);
  b += text(
    44,
    185,
    'The file and other rows stay fixed; only the repair interaction changes.',
    19,
  );
  b += rect(28, 255, 316, 230, 'pending') + text(44, 293, 'A · blocked confirmation', 22);
  b += lines(
    44,
    336,
    ['“Cannot confirm”', 'No repair route', 'Fictional participant stuck'],
    20,
    39,
  );
  b += rect(376, 255, 316, 230, 'mint') + text(392, 293, 'B · explicit repair path', 22, 'accent');
  b += lines(392, 336, f.b, 19, 35);
  b +=
    rect(28, 531, 664, 104, 'mint') +
    text(44, 569, 'Supported: carry B into the next design iteration', 22, 'accent');
  b += text(44, 610, 'The constructed participant completes this repair path.', 20);
  b += rect(28, 681, 664, 172, 'pending') + text(44, 719, 'Not established by the walkthrough', 22);
  b += lines(
    44,
    761,
    [
      'Authorization · persistence · keyboard and assistive-technology access',
      'Failure recovery · representative load',
    ],
    19,
    38,
  );
  b += text(28, 905, 'A prototype revision supports a design choice, not a release decision.', 20);
  b += text(28, 947, 'Dashed boundary: production questions still requiring evidence', 18);
  return svg(
    720,
    979,
    'Prototype success supports a limited design decision',
    'The same row-2 error is held constant. Adding a route to correction changes the fictional walkthrough outcome. A separate dashed boundary retains untested production conditions, with no scalability, accessibility, or population-wide usability claim.',
    b,
  );
}
await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['parser', parser],
  ['timeout', timeout],
  ['prototype', prototype],
]) {
  for (const mobile of [false, true]) {
    const filename = `steer-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Rendered six original evidence-steering illustrations and registered their dimensions.',
);
