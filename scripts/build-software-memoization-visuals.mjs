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
const descriptions = {
  dependencies:
    'Five project tasks form an acyclic dependency graph. Publish depends on package; package depends on assets and templates; both depend on parse. Parse finishes at minute 2, assets at 5, templates at 6, package at 7, and publish at 9. The shared parse result is computed once and reused.',
  scope:
    'Two estimator instances own separate immutable snapshots and memo tables. Snapshot S1 has parsing duration 2 minutes and caches task key 4 as finish time 9 minutes. Snapshot S2 has parsing duration 20 minutes and caches the same task key 4 as 27 minutes. Editing the caller’s input does not change S1.',
};
function task(x, y, w, title, own, finish, phone, accent = false) {
  const pad = phone && w < 200 ? 12 : 16;
  return (
    rect(x, y, w, phone ? 132 : 116, accent) +
    text(x + pad, y + 32, title, phone ? (w < 200 ? 17 : 20) : 22) +
    text(x + pad, y + 72, `Own: ${own} min`, phone ? 17 : 18, true) +
    text(x + pad, y + (phone ? 112 : 100), `Finish: ${finish} min`, phone ? 18 : 20)
  );
}
function dependencies(phone) {
  let d = text(
    24,
    34,
    phone ? 'Reuse the shared subproblem' : 'Five tasks; one result for each completed task',
    phone ? 22 : 24,
  );
  d += text(
    24,
    78,
    phone ? 'Arrow: needs the lower result.' : 'Arrow: upper task needs lower task’s result.',
    phone ? 17 : 19,
    true,
  );
  const center = phone ? 180 : 360;
  const w = phone ? 240 : 320,
    x = center - w / 2;
  d += task(x, 120, w, '4 / publish', 2, 9, phone);
  d += arrow(`M${center} ${phone ? 252 : 236}V${phone ? 284 : 268}`);
  d += task(x, phone ? 288 : 272, w, '3 / package', 1, 7, phone);
  const y = phone ? 480 : 456,
    h = phone ? 132 : 116;
  d += arrow(`M${center} ${phone ? 420 : 388}V${phone ? 448 : 420}H${phone ? 96 : 172}V${y - 4}`);
  d += arrow(`M${center} ${phone ? 420 : 388}V${phone ? 448 : 420}H${phone ? 264 : 548}V${y - 4}`);
  d += task(24, y, phone ? 144 : 296, '1 / assets', 3, 5, phone);
  d += task(phone ? 192 : 400, y, phone ? 144 : 296, '2 / templates', 4, 6, phone);
  const base = phone ? 704 : 680;
  d += arrow(`M${phone ? 96 : 172} ${y + h}V${base - 36}H${center - 60}V${base - 4}`);
  d += arrow(`M${phone ? 264 : 548} ${y + h}V${base - 36}H${center + 60}V${base - 4}`);
  d += task(x, base, w, '0 / parse', 2, 2, phone, true);
  const note = phone ? 884 : 844;
  d += rect(24, note, phone ? 312 : 672, phone ? 160 : 112, true);
  if (phone) {
    d +=
      text(40, note + 32, 'Task 0 is requested twice.', 20) +
      text(40, note + 72, 'First request: compute and store.', 17, true) +
      text(40, note + 112, 'Second request: reuse result 2.', 17, true) +
      text(40, note + 144, 'Cold calculation: five task bodies.', 17, true);
  } else {
    d +=
      text(40, note + 32, 'Task 0: first request computes; the second reuses 2 minutes.', 20) +
      text(
        40,
        note + 72,
        'Cold calculation: five task bodies, not six. No resource limits modeled.',
        18,
        true,
      ) +
      text(
        40,
        note + 100,
        'Finish times assume unlimited parallel resources; arrows are dependencies.',
        17,
        true,
      );
  }
  return svg(
    'Reuse the shared subproblem',
    descriptions.dependencies,
    phone ? 360 : 720,
    phone ? 1080 : 992,
    d,
  );
}
const snapshots = [
  ['S1 / original estimator', 2, 9],
  ['S2 / fresh estimator', 20, 27],
];
function scope(phone) {
  let d = text(
    24,
    34,
    phone ? 'Same key, different owners' : 'A task index is meaningful within its snapshot',
    phone ? 22 : 24,
  );
  d += text(
    24,
    78,
    phone
      ? 'Finish times are integer minutes.'
      : 'Each estimator owns a frozen snapshot and its own memo table.',
    phone ? 17 : 19,
    true,
  );
  for (const [i, r] of snapshots.entries()) {
    const x = phone ? 24 : 24 + i * 360,
      y = phone ? 112 + i * 476 : 120,
      w = phone ? 312 : 312;
    d += text(x, y + 28, r[0], 21);
    d +=
      rect(x, y + 64, w, 112) +
      text(x + 16, y + 96, 'Frozen input', 21) +
      text(x + 16, y + 140, `Task 0 duration: ${r[1]} min`, 19, true);
    d += arrow(`M${x + 156} ${y + 176}V${y + 216}`) + text(x + 180, y + 204, 'Calculate', 17, true);
    d +=
      rect(x, y + 220, w, 112, true) +
      text(x + 16, y + 252, 'Owned memo table', 21) +
      text(x + 16, y + 300, `Task key 4 → ${r[2]} min`, 22);
    d += text(x, y + 380, `Estimate task 4: ${r[2]} minutes`, 20);
    d += text(
      x,
      y + 416,
      phone
        ? 'No entries shared with the other owner.'
        : 'Separate table; no cross-snapshot reuse.',
      phone ? 16 : 17,
      true,
    );
  }
  const y = phone ? 1100 : 640;
  d += rect(24, y, phone ? 312 : 672, phone ? 176 : 144);
  if (phone) {
    d +=
      text(40, y + 32, 'Editing caller input leaves S1 intact.', 17) +
      text(40, y + 74, 'Clear: remove completed entries.', 17, true) +
      text(40, y + 116, 'Recompute: use the same snapshot.', 17, true) +
      text(40, y + 158, 'New input needs a fresh estimator.', 17, true);
  } else {
    d +=
      text(40, y + 34, 'Editing caller input does not alter the original estimator.', 21) +
      text(
        40,
        y + 78,
        'Clearing releases entries; recomputation still reads the same snapshot.',
        18,
        true,
      ) +
      text(
        40,
        y + 118,
        'A changed project gets a fresh estimator and an independent memo table.',
        18,
        true,
      );
  }
  return svg(
    'Same key, different snapshot owners',
    descriptions.scope,
    phone ? 360 : 720,
    phone ? 1312 : 824,
    d,
  );
}
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['dependencies', dependencies],
  ['scope', scope],
])
  for (const phone of [false, true]) {
    const path = `software-engineering/memoization-${name}${phone ? '-mobile' : ''}.svg`;
    const source = draw(phone);
    await writeFile(resolve(assets, path), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[path] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Created dependency-reuse and snapshot-ownership figures with phone compositions.');
