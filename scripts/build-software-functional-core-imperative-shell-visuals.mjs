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

const boundaryDescription =
  'An imperative shell reads inventory from a CSV file and converts it to immutable item values. A functional core returns replenishment proposals. The shell writes those proposals to a CSV file; the core receives no file handle.';
const snapshotDescription =
  'An observed stock value of three produces a proposal for seven units toward a target of ten. If actual stock becomes eight before execution, the saved proposal still says seven. A pure computation is repeatable but does not refresh its observations.';
function boundary(compact) {
  const drawing = compact
    ? text(24, 32, 'Observe → decide → act', 22) +
      rect(24, 102, 312, 712, false, true) +
      text(40, 136, 'Imperative shell', 21) +
      card(44, 166, 272, '1 · Read stock.csv', 'Parse and close the file', false, 76) +
      arrow('M180 242V310') +
      text(198, 282, 'Item values', 17) +
      card(44, 312, 272, '2 · Functional core', 'plan_reorders(items)', true, 124) +
      text(60, 416, 'No file, clock, or database access', 16, true) +
      arrow('M180 436V522') +
      text(198, 494, 'Proposals', 17) +
      card(44, 524, 272, '3 · Write proposals.csv', 'Shell performs the effect', false, 76) +
      text(44, 654, 'Core: values in, values out', 18) +
      text(44, 694, 'Shell: I/O and resource lifetime', 16, true) +
      text(44, 752, 'Returning a proposal does', 17) +
      text(44, 780, 'not place an order.', 17)
    : text(24, 34, 'Observe → decide → act', 24) +
      rect(24, 108, 672, 344, false, true) +
      text(44, 146, 'Imperative shell · owns I/O and resource lifetime', 21) +
      card(44, 238, 180, '1 · Read', 'stock.csv', false, 76) +
      card(268, 224, 184, '2 · Pure core', 'plan_reorders', true, 104) +
      card(496, 238, 180, '3 · Write', 'proposals.csv', false, 76) +
      arrow('M224 276H266') +
      arrow('M452 276H494') +
      text(208, 204, 'Item values', 17) +
      text(458, 204, 'Proposals', 17) +
      text(44, 382, 'The core receives values, never a file handle or database client.', 17, true) +
      text(44, 418, 'Only the shell reads, writes, and closes files.', 18) +
      text(24, 510, 'Arrows carry values. A returned proposal has not been executed.', 18);
  return svg(
    'Pure computation between external effects',
    boundaryDescription,
    compact ? 360 : 720,
    compact ? 850 : 552,
    drawing,
  );
}
function snapshot(compact) {
  const drawing = compact
    ? text(24, 32, 'Repeatable does not', 22) +
      text(24, 60, 'mean current', 22) +
      card(24, 112, 312, '1 · Observe stock', '3 units · target 10', false, 76) +
      arrow('M180 188V246') +
      card(24, 248, 312, '2 · Compute proposal', '7 units to reach the target', true, 76) +
      arrow('M180 324V406') +
      text(198, 356, 'External stock', 16, true) +
      text(198, 382, 'changes', 16, true) +
      card(24, 408, 312, '3 · Current stock is 8', 'The saved input is still 3', false, 76) +
      arrow('M180 484V542') +
      card(24, 544, 312, '4 · Saved proposal: 7', 'No automatic refresh or lock', true, 76) +
      text(24, 682, 'Recompute from 8: propose nothing.', 17) +
      text(24, 718, 'The reorder point is 3 units.', 17, true) +
      text(24, 772, 'Execution needs its own', 18) +
      text(24, 802, 'consistency policy.', 18)
    : text(24, 34, 'A pure decision still uses an observed snapshot', 24) +
      card(24, 110, 300, '1 · Observe', 'Stock 3 · point 3 · target 10', false, 88) +
      card(396, 110, 300, '2 · Compute', 'Proposal: 7 units', true, 88) +
      arrow('M324 154H394') +
      arrow('M546 198V288') +
      text(24, 248, 'Meanwhile: external stock changes', 18, true) +
      card(396, 290, 300, '3 · Current stock: 8', 'Saved input remains 3', false, 88) +
      arrow('M396 334H326') +
      card(24, 290, 300, '4 · Saved proposal: 7', 'No automatic refresh or lock', true, 88) +
      text(24, 446, 'Recomputing from 8 units would produce no proposal.', 19) +
      text(
        24,
        482,
        'Purity does not keep external state unchanged between read and action.',
        17,
        true,
      );
  return svg(
    'Snapshot repeatability and changing external state',
    snapshotDescription,
    compact ? 360 : 720,
    compact ? 840 : 526,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['functional-core-imperative-shell-boundary', boundary],
  ['functional-core-imperative-shell-snapshot', snapshot],
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
console.log(
  'Built Functional Core, Imperative Shell value-boundary and snapshot figures with separate phone layouts.',
);
