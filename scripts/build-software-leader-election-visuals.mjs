import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets');
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

const votesDescription =
  "In a fixed three-member group A, B, and C, an isolated C receives only its own vote and cannot win. A receives A and B's votes in term one and wins with two of three. Each voter can choose only one candidate per term, so another candidate cannot assemble a different majority in that term.";
const handoverDescription =
  "A wins term one and publishes manifest-A. After a partition B wins term two with B and C. A's old election result still exists. B installs term two at the destination and publishes manifest-B; the destination rejects A's later term-one write and retains manifest-B.";
function votes(phone) {
  const drawing = phone
    ? text(24, 34, 'Count the full membership', 22) +
      card(24, 112, 312, 'Fixed group: A, B, C', 'Quorum: 2 of all 3 voters', true, 112) +
      arrow('M180 224V286') +
      card(24, 288, 312, 'C isolated / term 1', 'Only C votes for C: 1 of 3', false, 128, true) +
      text(40, 390, 'No winner', 18, true) +
      arrow('M180 416V478') +
      rect(24, 480, 312, 272) +
      text(40, 514, 'After A contacts A and B', 20) +
      text(40, 570, 'Voter A / term 1 / voted A', 17, true) +
      text(40, 626, 'Voter B / term 1 / voted A', 17, true) +
      text(40, 682, 'Voter C / term 1 / voted C', 17, true) +
      arrow('M180 752V846') +
      text(196, 806, 'count A votes', 15, true) +
      card(24, 848, 312, 'A elected in term 1', 'Votes (A, B) / 2 of 3', true, 128) +
      text(40, 950, 'C’s earlier vote stays recorded.', 16, true) +
      text(24, 1064, 'Arrows: trace stages and vote counting.', 15, true)
    : text(24, 34, 'A majority means two of all three members', 24) +
      card(
        24,
        112,
        672,
        'C isolated / term 1 / only C votes for C',
        'One vote is insufficient. Membership remains A, B, C; quorum is 2.',
        false,
        128,
      ) +
      text(40, 210, 'No winner; the group is not resized to reachable members.', 18, true) +
      text(24, 324, 'Then A campaigns in term 1, contacting A and B.', 21) +
      card(24, 352, 208, 'Voter A', 'Term 1 / voted A', true, 144, true) +
      text(40, 460, 'Grants A its vote', 16, true) +
      card(256, 352, 208, 'Voter B', 'Term 1 / voted A', true, 144, true) +
      text(272, 460, 'Grants A its vote', 16, true) +
      card(488, 352, 208, 'Voter C', 'Term 1 / voted C', false, 144, true) +
      text(504, 460, 'Earlier record retained', 15, true) +
      arrow('M128 496V570H300V638') +
      arrow('M360 496V638') +
      card(
        24,
        640,
        672,
        'A elected in term 1',
        'Distinct votes (A, B) / 2 of the full 3-member group',
        true,
        128,
      ) +
      text(40, 738, 'C is not part of A’s winning vote set.', 18, true) +
      text(24, 856, 'Arrows: A’s granted votes contribute to its majority.', 18, true) +
      text(
        24,
        896,
        'A voter cannot select different candidates within one retained term.',
        17,
        true,
      );
  return svg(
    'Full-membership voting and one vote per term',
    votesDescription,
    phone ? 360 : 720,
    phone ? 1112 : 944,
    drawing,
  );
}
function handover(phone) {
  const drawing = phone
    ? text(24, 34, 'Election is not write revocation', 22) +
      card(
        24,
        112,
        312,
        'A elected / term 1',
        'Votes A, B / publishes manifest-A',
        false,
        128,
        true,
      ) +
      text(40, 214, 'Old result remains in memory.', 16, true) +
      arrow('M180 240V302') +
      text(196, 282, 'partition', 16, true) +
      card(24, 304, 312, 'B elected / term 2', 'Votes B, C / A may still run', true, 128, true) +
      text(40, 406, 'Destination not updated yet.', 16, true) +
      arrow('M180 432V494') +
      text(196, 474, 'install B / 2', 15, true) +
      card(
        24,
        496,
        312,
        'Register installs B / term 2',
        'Then B writes manifest-B.',
        true,
        144,
        true,
      ) +
      text(40, 604, 'Handover at this destination', 17, true) +
      arrow('M180 640V702') +
      card(
        24,
        704,
        312,
        'Late A / term 1 write',
        'Register rejects obsolete authority.',
        false,
        144,
        true,
      ) +
      text(40, 812, 'Stored value stays manifest-B.', 16, true) +
      text(24, 952, 'Arrows: election trace and register calls.', 15, true) +
      text(24, 988, 'Checks and writes must be atomic.', 16, true) +
      text(24, 1024, 'This model has no crash recovery.', 16, true)
    : text(24, 34, 'A new election does not stop the old process', 24) +
      card(24, 112, 312, 'Old result: A / term 1', 'A won votes from A and B.', false, 176) +
      text(40, 252, 'A may still run after partition.', 17, true) +
      card(384, 112, 312, 'New result: B / term 2', 'B wins votes from B and C.', true, 176) +
      text(400, 252, 'Election changes coordination.', 17, true) +
      arrow('M540 288V366H420V430') +
      text(436, 342, 'install B / 2', 17, true) +
      card(
        24,
        432,
        672,
        'Publication register installs B / term 2',
        'B then writes manifest-B under the installed authority.',
        true,
        160,
      ) +
      text(40, 550, 'This is the destination handover boundary.', 19, true) +
      arrow('M24 200H12V736H22') +
      arrow('M360 592V670') +
      card(
        24,
        672,
        672,
        'A’s delayed term-one write is rejected',
        'The register compares term and owner atomically with each write.',
        false,
        160,
      ) +
      text(40, 790, 'Stored value remains manifest-B.', 19, true) +
      text(24, 924, 'Arrows: election results and destination handover/write checks.', 17, true) +
      text(24, 964, 'Election alone does not fence an independent resource.', 18, true);
  return svg(
    'Separate election from destination handover',
    handoverDescription,
    phone ? 360 : 720,
    phone ? 1072 : 1008,
    drawing,
  );
}
const outputs = [
  ['software-engineering/leader-election-votes.svg', votes(false)],
  ['software-engineering/leader-election-votes-mobile.svg', votes(true)],
  ['software-engineering/leader-election-handover.svg', handover(false)],
  ['software-engineering/leader-election-handover-mobile.svg', handover(true)],
];
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [path, source] of outputs) {
  await mkdir(resolve(assets, path, '..'), { recursive: true });
  await writeFile(resolve(assets, path), source);
  const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
  manifest[path] = { width: Number(width), height: Number(height) };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Built four native Leader Election SVG variants.');
