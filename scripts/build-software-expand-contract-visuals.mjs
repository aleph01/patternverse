import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets');
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 19, secondary = false) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${secondary ? '#626962' : '#252c28'}">${esc(value)}</text>`;
const rect = (x, y, width, height, accent = false, white = false) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${white ? '#fff' : accent ? '#edf5f0' : '#f1f2ef'}" stroke="${accent ? '#00855b' : '#a6aca3'}" stroke-width="1.2"/>`;
const arrow = (d) =>
  `<path d="${d}" fill="none" stroke="#00855b" stroke-width="1.5" marker-end="url(#arrow)"/>`;
function svg(title, description, width, height, drawing) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}rect,path{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}
const article = await readFile(
  resolve(root, 'content/patterns/data-expand-migrate-contract.md'),
  'utf8',
);
const figures = [...article.matchAll(/!\[(.*?)\]\(\.\.\/assets\/(.*?)\.svg "/g)].map((m) => [
  m[2],
  m[1],
]);
if (figures.length !== 2) throw new Error('Expected two Expand–Migrate–Contract figures.');
function phases(phone) {
  let d = text(
    24,
    36,
    phone ? 'Support the middle state' : 'Support the middle state, then retire the old name',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 84, 'Parallel Change / Expand-Contract', 18, true);
    d +=
      rect(24, 112, 312, 144, true) +
      text(40, 150, '1 Expand', 22) +
      text(40, 190, 'Old + new names supported', 18) +
      text(40, 230, 'Keep one authority', 19, true);
    d += arrow('M72 256V312') + text(96, 292, 'Compatible release', 18, true);
    d +=
      rect(24, 316, 312, 160, true) +
      text(40, 354, '2 Migrate', 22) +
      text(40, 392, 'Move consumers', 19) +
      text(40, 426, 'Backfill + reconcile data', 18) +
      text(40, 464, 'Both forms stay usable', 18, true);
    d += arrow('M72 476V532') + text(96, 512, 'Collect readiness evidence', 17, true);
    d +=
      rect(24, 536, 312, 176) +
      text(40, 574, 'Retirement gate', 22) +
      text(40, 612, 'Required data is current', 18) +
      text(40, 646, 'Old usages have moved', 18) +
      text(40, 684, 'Recovery obligations closed', 17, true);
    d += arrow('M72 712V768') + text(96, 748, 'Only after readiness', 18, true);
    d +=
      rect(24, 772, 312, 144, true) +
      text(40, 810, '3 Contract', 22) +
      text(40, 850, 'Remove the old name', 19) +
      text(40, 888, 'Retire obsolete bridge code', 17, true);
    d +=
      text(24, 964, 'Phases may span many releases.', 18) +
      text(24, 1004, 'New working ≠ old unused.', 18, true);
  } else {
    d += text(24, 84, 'Parallel Change / Expand-Contract · three deliberate phases', 19, true);
    d +=
      rect(24, 112, 672, 112, true) +
      text(40, 150, '1 Expand', 22) +
      text(40, 192, 'Support old + new interfaces; maintain one authoritative meaning.', 19);
    d += arrow('M72 224V280') + text(96, 260, 'Compatible release', 18, true);
    d +=
      rect(24, 284, 672, 128, true) +
      text(40, 322, '2 Migrate', 22) +
      text(40, 360, 'Move usages, backfill historical data, reconcile current changes.', 19) +
      text(40, 396, 'Both forms remain supported during the transition.', 18, true);
    d += arrow('M72 412V468') + text(96, 448, 'Collect readiness evidence', 18, true);
    d +=
      rect(24, 472, 672, 128) +
      text(40, 510, 'Retirement gate', 22) +
      text(40, 548, 'Data current · required readers and writers moved', 19) +
      text(40, 584, 'Recovery window and migration obligations closed', 18, true);
    d += arrow('M72 600V656') + text(96, 636, 'Only after readiness', 18, true);
    d +=
      rect(24, 660, 672, 112, true) +
      text(40, 698, '3 Contract', 22) +
      text(40, 740, 'Remove the old interface and obsolete compatibility machinery.', 19);
    d += text(
      24,
      824,
      'A working new interface does not establish that the old one is unused.',
      19,
    );
  }
  return svg(
    'Expansion, migration and evidence-gated contraction',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 1040 : 864,
    d,
  );
}
function backfill(phone) {
  let d = text(
    24,
    36,
    phone ? 'Do not restore stale data' : 'A delayed backfill must not overwrite a live update',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 84, 'Two-copy example; not the API code.', 17, true);
    d +=
      rect(24, 112, 312, 104) +
      text(40, 150, 'Backfill snapshot · A', 22) +
      text(40, 190, 'revision 10 · standard', 19);
    d += arrow('M72 216V272') + text(96, 252, 'Live update arrives', 18, true);
    d +=
      rect(24, 276, 312, 104, true) +
      text(40, 314, 'Target already current', 21) +
      text(40, 354, 'revision 11 · premium', 19);
    d += arrow('M72 380V436') + text(96, 416, 'Stale backfill attempts', 18, true);
    d +=
      rect(24, 440, 312, 160) +
      text(40, 478, 'Atomic revision guard', 21) +
      text(40, 518, 'incoming 10 > stored 11?', 18) +
      text(40, 558, 'False → reject stale copy', 19) +
      text(40, 588, 'Same authoritative ordering', 17, true);
    d += arrow('M72 600V656') + text(96, 636, 'Preserve newer value', 18, true);
    d +=
      rect(24, 660, 312, 104, true) +
      text(40, 698, 'Target remains', 22) +
      text(40, 738, 'revision 11 · premium', 19);
    d +=
      text(24, 814, 'Revisions must be comparable.', 18) +
      text(24, 852, 'Equal retries are no-ops.', 18, true) +
      text(24, 890, 'Protect deletion revisions too.', 18, true);
  } else {
    d += text(24, 84, 'Separate two-copy example; the Python API bridge uses one value.', 18, true);
    d +=
      rect(24, 124, 312, 128) +
      text(40, 164, 'Backfill snapshot · A', 22) +
      text(40, 204, 'revision 10 · standard', 19) +
      text(40, 238, 'Copy is delayed', 18, true);
    d +=
      rect(384, 124, 312, 128, true) +
      text(400, 164, 'Target after live update', 21) +
      text(400, 204, 'revision 11 · premium', 19) +
      text(400, 238, 'Already current', 18, true);
    d +=
      arrow('M180 252V336') +
      text(40, 300, 'incoming: 10', 18, true) +
      arrow('M540 252V336') +
      text(400, 300, 'stored: 11', 18, true);
    d +=
      rect(24, 340, 672, 144) +
      text(40, 380, 'Atomic conditional write: accept only a newer revision', 21) +
      text(40, 424, '10 > 11 is false → reject the stale write', 22) +
      text(
        40,
        466,
        'Compare and write together; use one authoritative revision order per account.',
        18,
        true,
      );
    d += arrow('M360 484V560') + text(384, 532, 'Preserve newer value', 18, true);
    d +=
      rect(24, 564, 672, 104, true) +
      text(40, 604, 'Target remains: revision 11 · premium', 23) +
      text(40, 646, 'An equal-revision retry is a no-op under this rule.', 18, true);
    d += text(
      24,
      722,
      'Retain deletion ordering too; a checkpoint alone does not prevent races.',
      18,
    );
  }
  return svg(
    'Reject stale historical copies after newer live changes',
    figures[1][1],
    phone ? 360 : 720,
    phone ? 928 : 764,
    d,
  );
}
const manifestPath = resolve(assets, 'manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [i, draw] of [phases, backfill].entries())
  for (const phone of [false, true]) {
    const relative = figures[i][0] + (phone ? '-mobile' : '') + '.svg',
      source = draw(phone);
    await mkdir(resolve(assets, relative, '..'), { recursive: true });
    await writeFile(resolve(assets, relative), source);
    const [, w, h] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: +w, height: +h };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Canonical phase figure revised and backfill-race figure added, each with a phone composition.',
);
