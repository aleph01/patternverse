import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets/software-engineering');
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 19, secondary = false) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${secondary ? '#626962' : '#252c28'}">${esc(value)}</text>`;
const rect = (x, y, width, height, accent = false, surface = false) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${surface ? '#fff' : accent ? '#edf5f0' : '#f1f2ef'}" stroke="${accent ? '#00855b' : '#a6aca3'}" stroke-width="1.2"/>`;
const arrow = (d) =>
  `<path d="${d}" fill="none" stroke="#00855b" stroke-width="1.5" marker-end="url(#arrow)"/>`;
const card = (x, y, width, title, detail, accent = false, height = 76, small = false) =>
  rect(x, y, width, height, accent) +
  text(x + 16, y + 29, title, small ? 18 : 20) +
  text(x + 16, y + 55, detail, small ? 16 : 17, true);

function svg(title, description, width, height, drawing) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}path,rect{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker><marker id="wiring" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#626962" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}

const reuseDescription =
  'The print-queue selector and manual-release validator both call is_satisfied_by on the same eligible-for-print specification. The candidate is a PrintJob snapshot, and the result is a Boolean. The specification defines acceptance while callers decide what to do with the result.';
const compositionDescription =
  'A composed printing policy requires approved OR proof copy, at most 40 pages, and NOT cancelled. Job A has approval and exactly 40 pages and passes. B has 41 pages and fails. C is an unapproved proof copy within the limit and passes. D has neither approval nor the exception and fails. E is cancelled and fails despite approval.';

function reuse(compact) {
  const drawing = compact
    ? text(24, 32, 'One criterion,', 22) +
      text(24, 60, 'two callers', 22) +
      card(24, 104, 312, 'Queue selection', 'Keep every matching job') +
      card(24, 236, 312, 'Release validation', 'Check one proposed job') +
      card(44, 392, 272, 'eligible · Specification', 'is_satisfied_by(job)', true, 100, true) +
      arrow('M180 180V200H12V442H42') +
      arrow('M180 312V390') +
      card(24, 572, 312, 'PrintJob snapshot', 'Data without this policy', false, 100) +
      arrow('M180 572V494') +
      text(196, 540, 'input', 17, true) +
      card(24, 752, 312, 'True or False', 'Caller decides what to do', false, 100) +
      arrow('M316 442H348V802H338') +
      text(252, 724, 'return', 17, true) +
      text(24, 922, 'Same rule for filtering and validation.', 17, true)
    : text(24, 34, 'One matching criterion, two callers', 24) +
      card(24, 100, 280, 'Queue selection', 'Keep every matching job', false, 100) +
      card(416, 100, 280, 'Release validation', 'Check one proposed job', false, 100) +
      card(164, 280, 392, 'eligible · Specification', 'is_satisfied_by(job)', true, 100) +
      arrow('M164 200V240H280V278') +
      arrow('M556 200V240H440V278') +
      card(24, 476, 280, 'PrintJob snapshot', 'Candidate data only', false, 100) +
      card(416, 476, 280, 'True or False', 'Caller decides what to do', false, 100) +
      arrow('M164 476V430H280V382') +
      text(24, 434, 'evaluate', 17, true) +
      arrow('M440 380V430H556V474') +
      text(574, 434, 'return', 17, true) +
      text(24, 640, 'Arrows: calls, candidate input, and Boolean result.', 18) +
      text(24, 678, 'Neither caller owns a second copy of the policy.', 17, true);
  return svg(
    'One specification reused for selection and validation',
    reuseDescription,
    compact ? 360 : 720,
    compact ? 950 : 710,
    drawing,
  );
}

function formula(x, y, width, compact) {
  return (
    rect(x, y, width, 156, true) +
    text(x + 16, y + 34, '(approved OR proof_copy)', compact ? 20 : 22) +
    text(x + 16, y + 72, 'AND pages ≤ 40', compact ? 20 : 22) +
    text(x + 16, y + 110, 'AND NOT cancelled', compact ? 20 : 22)
  );
}
function jobCard(y, title, detail, reason, accepted) {
  return (
    rect(24, y, 312, 112, accepted) +
    text(40, y + 30, title, 20) +
    text(40, y + 66, detail, 17) +
    text(40, y + 96, reason, 17, true)
  );
}
function composition(compact) {
  let drawing;
  if (compact) {
    drawing =
      text(24, 32, 'An exception changes', 22) +
      text(24, 60, 'only its own group', 22) +
      formula(24, 104, 312, true) +
      arrow('M180 260V302') +
      jobCard(324, 'A · 40 pages · True', 'Approved · not cancelled', 'Exact page limit', true) +
      jobCard(468, 'B · 41 pages · False', 'Approved · not cancelled', 'Page limit fails', false) +
      jobCard(
        612,
        'C · 4 pages · True',
        'Proof copy · not cancelled',
        'Approval group passes',
        true,
      ) +
      jobCard(
        756,
        'D · 4 pages · False',
        'No approval or proof copy',
        'Approval group fails',
        false,
      ) +
      jobCard(
        900,
        'E · 4 pages · False',
        'Approved · cancelled',
        'Cancellation rule fails',
        false,
      ) +
      text(24, 1072, 'Every group must pass.', 18) +
      text(24, 1110, 'True and False labels carry the result.', 17, true);
  } else {
    drawing =
      text(24, 34, 'Grouped rules keep the exception bounded', 24) +
      formula(24, 84, 672, false) +
      arrow('M360 240V284') +
      text(378, 274, 'All groups must hold', 17, true) +
      rect(24, 286, 672, 52) +
      text(40, 320, 'Job', 18) +
      text(118, 320, 'Pages', 18) +
      text(222, 320, 'Approval group', 18) +
      text(438, 320, 'Cancelled', 18) +
      text(590, 320, 'Result', 18);
    for (const [i, row] of [
      ['A', '40', 'approved', 'False', 'True'],
      ['B', '41', 'approved', 'False', 'False'],
      ['C', '4', 'proof copy', 'False', 'True'],
      ['D', '4', 'neither', 'False', 'False'],
      ['E', '4', 'approved', 'True', 'False'],
    ].entries()) {
      const y = 338 + i * 56;
      drawing += rect(24, y, 672, 56, row[4] === 'True', row[4] !== 'True');
      for (const [column, value] of row.entries()) {
        drawing += text([40, 118, 222, 438, 590][column], y + 35, value, 18);
      }
    }
    drawing +=
      text(24, 670, 'D’s approval group fails; E is cancelled.', 19) +
      text(24, 710, 'C’s exception does not override the page cap or cancellation.', 17, true);
  }
  return svg(
    'Composed specification and boundary examples',
    compositionDescription,
    compact ? 360 : 720,
    compact ? 1142 : 740,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['specification-reuse', reuse],
  ['specification-composition', composition],
]) {
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`;
    const content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[`software-engineering/${filename}`] = {
      width: Number(width),
      height: Number(height),
    };
  }
}
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await writeFile(manifestPath, JSON.stringify({ ...manifest, ...dimensions }, null, 2) + '\n');
console.log('Built Specification reuse and composition figures with separate phone layouts.');
