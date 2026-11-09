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

const membersDescription =
  'Operation E901 expects line results L1 and L2. L2 reports one packed unit, an identical L2 redelivery adds no new member, and L1 reports two packed units. Only the two distinct expected results release one complete summary totaling three physical units.';
const lifecycleDescription =
  'A group is open while only L1 is known. Arrival of L2 before the fixed 100 millisecond deadline closes it as complete. If L2 arrives at exactly 100 milliseconds, the group instead closes as timed out with L2 missing and no total. Valid late results and later polls do not release a second outcome.';
function members(compact) {
  const drawing = compact
    ? text(24, 34, 'Count members, not deliveries', 22) +
      text(24, 86, 'E901 expects exactly L1 and L2.', 18, true) +
      card(24, 144, 312, '10 ms: L2 reports 1 unit', 'Seen: {L2}', false, 144) +
      text(40, 252, 'Open: 1 of 2 expected members.', 17, true) +
      card(24, 352, 312, '20 ms: same L2 again', 'Seen: {L2}', false, 144) +
      text(40, 460, 'Open: still 1 of 2 members.', 17, true) +
      card(24, 560, 312, '30 ms: L1 reports 2 units', 'Seen: {L1, L2}', true, 144) +
      text(40, 668, 'Complete: 2 of 2 members.', 17, true) +
      arrow('M180 704V798') +
      text(196, 758, 'release', 17, true) +
      card(24, 800, 312, 'Outcome: E901 complete', 'Total: 3 packed physical units', true, 144) +
      text(40, 908, 'Missing: none', 18, true) +
      text(24, 1024, 'Each line contributes once.', 18) +
      text(24, 1068, 'No second output for a redelivery.', 17, true)
    : text(24, 34, 'Count distinct members, not deliveries', 24) +
      text(24, 86, 'Operation E901 expects exactly L1 and L2.', 19, true) +
      card(24, 144, 280, '10 ms: L2 arrives', '1 packed unit', false, 112) +
      arrow('M304 200H398') +
      card(400, 144, 296, 'Open: {L2}', '1 of 2 expected members', false, 112) +
      card(24, 352, 280, '20 ms: same L2 again', '1 packed unit; redelivery', false, 112) +
      arrow('M304 408H398') +
      card(400, 352, 296, 'Open: {L2}', 'Still 1 of 2 members', false, 112) +
      card(24, 560, 280, '30 ms: L1 arrives', '2 packed units', false, 112) +
      arrow('M304 616H398') +
      card(400, 560, 296, 'Complete: {L1, L2}', '2 of 2 expected members', true, 112) +
      arrow('M548 672V750') +
      text(564, 716, 'release', 17, true) +
      card(
        24,
        752,
        672,
        'Outcome: E901 complete',
        'Total: 3 packed physical units / missing: none',
        true,
        144,
      ) +
      text(40, 860, 'The repeated L2 report contributes no additional units.', 19, true) +
      text(
        24,
        976,
        'Horizontal arrows: accept results into the group. Vertical arrow: release.',
        18,
      ) +
      text(
        24,
        1016,
        'A complete report set does not prove the requested order was fulfilled.',
        18,
        true,
      );
  return svg(
    'Aggregator: distinct expected members',
    membersDescription,
    compact ? 360 : 720,
    compact ? 1120 : 1072,
    drawing,
  );
}
function lifecycle(compact) {
  const drawing = compact
    ? text(24, 34, 'One group, two terminal paths', 22) +
      card(24, 104, 312, 'Open: operation E902', 'Seen: L1 / 2 packed units', false, 176) +
      text(40, 210, 'Missing: L2', 18, true) +
      text(40, 250, 'Fixed deadline: 100 ms', 18, true) +
      arrow('M180 280V320H12V464H46') +
      arrow('M12 464V744H46') +
      card(48, 384, 288, 'If L2 arrives at 99 ms', 'complete / total: 3 units', true, 160) +
      text(64, 502, 'Missing: none', 18, true) +
      card(48, 664, 288, 'If L2 arrives at 100 ms', 'timed_out / total: None', false, 160) +
      text(64, 782, 'Missing: L2', 18, true) +
      card(
        24,
        936,
        312,
        'Either path closes the group',
        'Retain the terminal outcome.',
        true,
        160,
      ) +
      text(40, 1044, 'Later valid results: no new release.', 16, true) +
      text(24, 1176, 'Timeout does not cancel workers.', 17, true)
    : text(24, 34, 'An exact deadline resolves the release race', 24) +
      rect(24, 112, 672, 128) +
      text(40, 146, 'Open: operation E902 / expected: L1 and L2', 22) +
      text(40, 194, 'Seen: L1, 2 packed units / missing: L2 / fixed deadline: 100 ms', 18, true) +
      arrow('M360 240V288H180V350') +
      arrow('M360 288H540V350') +
      card(24, 352, 312, 'If L2 arrives at 99 ms', '1 packed unit; before deadline', true, 160) +
      text(40, 456, 'complete / total: 3 units', 19) +
      text(40, 492, 'Missing: none', 18, true) +
      card(384, 352, 312, 'If L2 arrives at 100 ms', 'Deadline reached; expiry wins', false, 160) +
      text(400, 456, 'timed_out / total: None', 19) +
      text(400, 492, 'Missing: L2', 18, true) +
      arrow('M180 512V598') +
      arrow('M540 512V598') +
      card(
        24,
        600,
        672,
        'Terminal state retained',
        'Later valid contributions and polls produce no second release.',
        true,
        160,
      ) +
      text(40, 710, 'The caller can still read the saved outcome.', 19, true) +
      text(24, 848, 'Branches are alternative runs, not steps performed in sequence.', 18) +
      text(
        24,
        888,
        'Timeout reports missing evidence. It neither cancels nor rolls back packing.',
        18,
        true,
      ) +
      text(
        24,
        944,
        'Arrows: local state transitions. No network or reliable publication is modeled.',
        17,
        true,
      );
  return svg(
    'Aggregator: completion and timeout lifecycle',
    lifecycleDescription,
    compact ? 360 : 720,
    compact ? 1232 : 1000,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['aggregator-members', members],
  ['aggregator-lifecycle', lifecycle],
])
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`,
      content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[`software-engineering/${filename}`] = { width: +width, height: +height };
  }
const manifest = resolve(root, 'content/assets/manifest.json');
await writeFile(
  manifest,
  JSON.stringify({ ...JSON.parse(await readFile(manifest, 'utf8')), ...dimensions }, null, 2) +
    '\n',
);
console.log('Built two Aggregator diagrams with phone compositions.');
