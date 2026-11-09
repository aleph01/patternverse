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

const reference = (d) =>
  `<path d="${d}" fill="none" stroke="#626962" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#wiring)"/>`;
const boundaryDescription =
  'An application sends allocate(package_id, kg) to the LoadPlan root. Inside its boundary are a capacity of 100 kilograms and allocation values A at 60 kilograms and B at 40 kilograms. The root protects their combined weight. Package records remain outside and are referenced by ID.';
const concurrencyDescription =
  'Two writers load version 7 of a plan holding 60 kilograms. One proposes adding 40 kilograms and the other 30 kilograms; both pass their local capacity check. The first atomic save advances to version 8 at 100 kilograms. The second save expects version 7 and is rejected. Re-evaluating its command against version 8 exceeds capacity.';

function boundary(compact) {
  const drawing = compact
    ? text(24, 32, 'One root protects', 22) +
      text(24, 60, 'the complete plan', 22) +
      card(24, 104, 312, 'Application', 'Requests a business change') +
      text(40, 232, 'allocate(package_id, kg)', 20) +
      rect(24, 252, 312, 548, true, true) +
      text(40, 286, 'LoadPlan aggregate · plan-42', 19) +
      card(44, 320, 272, 'LoadPlan · root', 'Capacity: 100 kg', true) +
      arrow('M180 180V200H12V358H42') +
      text(44, 444, 'Owned allocation values', 20) +
      card(44, 470, 272, 'pkg-A · 60 kg', 'Package ID and weight') +
      card(44, 570, 272, 'pkg-B · 40 kg', 'Package ID and weight') +
      card(44, 690, 272, '100 kg ≤ 100 kg', 'Total must fit capacity', true) +
      reference('M180 800V894') +
      text(196, 856, 'IDs only', 18, true) +
      card(
        44,
        896,
        272,
        'Packages · separate roots',
        'Tracking history stays outside',
        false,
        76,
        true,
      ) +
      text(24, 1020, 'Solid: command · dashed: ID reference', 16, true)
    : text(24, 34, 'One root guards the complete load plan', 24) +
      card(24, 154, 180, 'Application', 'Requests changes', false, 76, true) +
      text(24, 270, 'allocate(package_id, kg)', 17) +
      rect(264, 84, 432, 444, true, true) +
      text(284, 118, 'LoadPlan aggregate · plan-42', 21) +
      card(300, 154, 360, 'LoadPlan · root', 'Capacity: 100 kg', true) +
      arrow('M204 192H298') +
      text(300, 278, 'Owned allocation values', 20) +
      card(300, 302, 168, 'pkg-A · 60 kg', 'ID and weight', false, 76, true) +
      card(492, 302, 168, 'pkg-B · 40 kg', 'ID and weight', false, 76, true) +
      card(300, 412, 360, '100 kg ≤ 100 kg', 'sum(allocations) ≤ capacity', true) +
      reference('M480 528V614') +
      text(498, 580, 'References by ID', 17, true) +
      card(300, 616, 360, 'Packages · separate roots', 'Tracking history stays outside') +
      text(24, 730, 'Solid arrow: command · dashed arrow: reference by ID', 18, true);
  return svg(
    'Aggregate root and its consistency boundary',
    boundaryDescription,
    compact ? 360 : 720,
    compact ? 1044 : 754,
    drawing,
  );
}

function concurrency(compact) {
  const drawing = compact
    ? text(24, 32, 'Local validity needs', 22) +
      text(24, 60, 'an atomic save', 22) +
      card(24, 104, 312, '1. Both load version 7', '60 kg used · capacity: 100 kg', false, 100) +
      arrow('M180 204V248') +
      rect(24, 250, 312, 140, true) +
      text(40, 282, '2. Both local checks pass', 20) +
      text(40, 324, 'A adds 40 kg: total 100 kg', 19) +
      text(40, 358, 'B adds 30 kg: total 90 kg', 19) +
      arrow('M180 390V436') +
      card(24, 438, 312, '3. A saves, expecting v7', 'Stored: 100 kg · version 8', true, 100) +
      arrow('M180 538V596') +
      card(24, 598, 312, '4. B saves, expecting v7', 'Conflict: stored version is 8', false, 100) +
      arrow('M180 698V756') +
      rect(24, 758, 312, 140, false) +
      text(40, 790, '5. Reload and re-evaluate', 20) +
      text(40, 832, '100 + 30 = 130 kg', 21) +
      text(40, 868, 'Capacity exceeded: reject', 18) +
      text(24, 958, 'Version check and all writes', 18) +
      text(24, 988, 'must share one atomic commit.', 18) +
      text(24, 1036, 'Arrows show the numbered sequence.', 17, true)
    : text(24, 34, 'Local validation does not settle competing saves', 24) +
      card(
        24,
        84,
        672,
        '1. Both load the same plan · version 7',
        'pkg-A: 60 kg · capacity: 100 kg',
        false,
        76,
      ) +
      arrow('M360 160V194H180V226') +
      arrow('M360 194H540V226') +
      card(24, 228, 312, '2. A adds pkg-B: 40 kg', 'Local total: 100 kg · valid', true, 100) +
      card(384, 228, 312, '2. B adds pkg-C: 30 kg', 'Local total: 90 kg · valid', true, 100) +
      arrow('M180 328V388') +
      arrow('M540 328V388') +
      card(24, 390, 312, '3. A saves, expecting v7', 'Stored: 100 kg · version 8', true, 100) +
      card(384, 390, 312, '4. B saves, expecting v7', 'Conflict: stored version is 8', false, 100) +
      arrow('M540 490V530H360V558') +
      card(
        24,
        560,
        672,
        '5. Reload version 8 and re-evaluate B’s command',
        '100 + 30 = 130 kg > capacity 100 kg · reject allocation',
        false,
        100,
      ) +
      text(24, 714, 'Version check and all changed members share one atomic commit.', 18) +
      text(24, 750, 'Arrows show load, save, and reload; numbers specify the order.', 17, true);
  return svg(
    'A competing aggregate update requires re-evaluation',
    concurrencyDescription,
    compact ? 360 : 720,
    compact ? 1068 : 778,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['aggregate-boundary', boundary],
  ['aggregate-concurrency', concurrency],
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
console.log('Built Aggregate boundary and concurrency figures with separate phone layouts.');
