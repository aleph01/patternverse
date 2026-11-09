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
const figures = [
  [
    'horizontal-sharding',
    'Tenant 7 maps to logical bucket 6. Routing map version 12 assigns buckets 0–3 to A, 4–7 to B, and 8–11 to C, so this request goes only to B. The shards share a schema but hold different rows; replicas within a shard are a separate concern.',
  ],
  [
    'sharding-handoff',
    'With requests paused, copy bucket 6 from B to D, change the authoritative owner from B at version 12 to D at version 13, and remove B’s old copy. After requests resume, an old version-12 write to B is rejected; a refreshed version-13 read from D returns paid.',
  ],
];
function routing(phone) {
  let d = text(
    24,
    36,
    phone ? 'One key, one owning shard' : 'Classify a key, then resolve its owner',
    phone ? 22 : 24,
  );
  d += text(
    24,
    78,
    phone ? '12 buckets; 3 owning groups.' : 'Twelve logical buckets; three owning groups.',
    phone ? 17 : 19,
    true,
  );
  if (phone) {
    d +=
      rect(24, 112, 312, 76) +
      text(40, 144, 'Request: tenant 7', 21) +
      text(40, 172, 'Read order O71', 17, true);
    d += arrow('M180 188V228') + text(204, 216, 'classify', 17, true);
    d +=
      rect(24, 232, 312, 76) +
      text(40, 264, 'Logical bucket 6', 21) +
      text(40, 292, '(7 − 1) modulo 12 = 6', 17, true);
    d += arrow('M180 308V348') + text(204, 336, 'lookup', 17, true);
    d +=
      rect(24, 352, 312, 92, true) +
      text(40, 386, 'Routing map v12', 21) +
      text(40, 420, 'Bucket 6 → B', 19);
    d +=
      rect(24, 504, 312, 76) +
      text(40, 536, 'A owns buckets 0–3', 20) +
      text(40, 564, 'Other rows of the same schema', 17, true);
    d +=
      rect(24, 600, 312, 108, true) +
      text(40, 636, 'B owns buckets 4–7', 20) +
      text(40, 670, 'Tenant 7 / O71 / paid', 18);
    d +=
      rect(24, 728, 312, 76) +
      text(40, 760, 'C owns buckets 8–11', 20) +
      text(40, 788, 'Other rows of the same schema', 17, true);
    d +=
      arrow('M324 444V466H348V654H338') + text(40, 480, 'Route this request only to B.', 17, true);
    d +=
      rect(24, 852, 312, 128) +
      text(40, 886, 'Same schema; different rows.', 19) +
      text(40, 926, 'Replicas copy a shard’s data.', 17, true) +
      text(40, 958, 'They are not additional shards.', 17, true);
  } else {
    for (const [x, a, b] of [
      [24, 'Request: tenant 7', 'Read order O71'],
      [264, 'Logical bucket 6', '(7 − 1) modulo 12'],
      [504, 'Routing map v12', 'Bucket 6 → B'],
    ])
      d +=
        rect(x, 112, 192, 96, x === 504) +
        text(x + 12, 148, a, 20) +
        text(x + 12, 186, b, 17, true);
    d +=
      arrow('M218 160H258') +
      text(220, 100, 'key', 16, true) +
      arrow('M458 160H498') +
      text(459, 100, 'map', 16, true);
    d += arrow('M600 208V284H360V332') + text(24, 284, 'Resolve bucket 6 → B', 20);
    for (const [x, name, buckets, selected] of [
      [24, 'A', '0–3', false],
      [256, 'B', '4–7', true],
      [488, 'C', '8–11', false],
    ])
      d +=
        rect(x, 336, 208, 144, selected) +
        text(x + 16, 376, `Shard ${name}`, 22) +
        text(x + 16, 414, `Owns buckets ${buckets}`, 18, true) +
        text(x + 16, 454, selected ? 'T7 / O71 / paid' : 'Other tenant rows', 18);
    d +=
      rect(24, 536, 672, 144) +
      text(40, 574, 'Same schema; different rows in each shard.', 22) +
      text(40, 618, 'Replicas within a shard copy its data for availability.', 19, true) +
      text(40, 654, 'Replication and sharding solve different capacity problems.', 19, true);
  }
  return svg(
    'Classify a key, then resolve its owner',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 1012 : 720,
    d,
  );
}
const phases = [
  ['Before the move', 'v12: bucket 6 → B', 'B has T7 / O71 / paid'],
  ['Copy bucket 6 to D', 'v12: B still owns it', 'D is a copy, not a second writer'],
  ['Publish placement; clean up', 'v13: bucket 6 → D', 'Remove bucket 6 rows from B'],
];
function handoff(phone) {
  const w = phone ? 312 : 672,
    step = phone ? 208 : 176,
    h = phone ? 144 : 112;
  let d = text(24, 36, 'Move placement, keep identity', phone ? 22 : 24);
  d += text(24, 78, 'Requests pause throughout steps 1–3.', phone ? 17 : 19, true);
  for (const [i, row] of phases.entries()) {
    const y = 112 + i * step;
    d +=
      rect(24, y, w, h, i === 2) +
      text(40, y + 34, `${i + 1}. ${row[0]}`, phone ? 19 : 22) +
      text(40, y + (phone ? 78 : 70), row[1], phone ? 19 : 21) +
      text(40, y + (phone ? 116 : 100), row[2], phone ? 17 : 18, true);
    if (i < 2)
      d +=
        arrow(`M${phone ? 72 : 360} ${y + h}V${y + step - 4}`) +
        text(
          phone ? 96 : 384,
          y + h + 38,
          i === 0 ? 'Copy selected rows' : 'Change ownership',
          phone ? 17 : 18,
          true,
        );
  }
  const y = 112 + 3 * step;
  d +=
    arrow(`M${phone ? 72 : 360} ${112 + 2 * step + h}V${y - 4}`) +
    text(phone ? 96 : 384, 112 + 2 * step + h + 38, 'Resume requests', phone ? 17 : 18, true);
  d +=
    rect(24, y, w, phone ? 224 : 200, true) +
    text(40, y + 34, '4. Validate each routed operation', phone ? 18 : 22);
  d +=
    text(40, y + 78, 'Old v12 write → B: rejected', phone ? 18 : 21) +
    text(40, y + 118, 'Fresh v13 read → D: paid', phone ? 18 : 21);
  d += text(
    40,
    y + 164,
    phone ? 'Bucket 6 keeps its identity.' : 'Bucket 6 keeps its identity; the owner changes.',
    phone ? 18 : 19,
    true,
  );
  if (phone) d += text(40, y + 202, 'Old B copy: absent', 18, true);
  else d += text(40, y + 190, 'Old B copy: absent', 18, true);
  const note = y + (phone ? 264 : 240);
  d +=
    text(24, note, 'Quiesced, in-memory teaching model.', phone ? 17 : 19, true) +
    text(24, note + 32, 'No online or crash-recovery guarantee.', phone ? 17 : 19, true);
  return svg('A quiesced bucket handoff', figures[1][1], phone ? 360 : 720, note + 72, d);
}
await mkdir(assets, { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [index, draw] of [routing, handoff].entries())
  for (const phone of [false, true]) {
    const relative = `data-engineering/${figures[index][0]}${phone ? '-mobile' : ''}.svg`;
    const source = draw(phone);
    await writeFile(resolve(assets, relative), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Two native SVG figures and separate phone layouts generated.');
