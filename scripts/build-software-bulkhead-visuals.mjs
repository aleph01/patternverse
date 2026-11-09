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

const descriptions = {
  allocation:
    'A fixed allocation divides twenty worker permits into twelve for live processing, four for backfills, and four for exploration. Backfills at their four-permit limit cannot take the live allowance. Each class has its own admission boundary; all still depend on shared systems that need separate limits.',
  admission:
    'A backfill action acquires its one permit and waits on an event. A second backfill call is rejected without invocation, while a live call uses its independent permit. After the event is released, the first backfill finishes, returns its permit, and permits another backfill call.',
};
function slots(x, y, count, columns, accent) {
  let d = '';
  for (let i = 0; i < count; i++)
    d += `<rect x="${x + (i % columns) * 32}" y="${y + Math.floor(i / columns) * 32}" width="22" height="22" fill="${accent ? '#00855b' : '#fff'}" stroke="${accent ? '#00855b' : '#a6aca3'}" stroke-width="1.2"/>`;
  return d;
}
function allocation(phone) {
  let d = text(
    24,
    34,
    phone ? 'Each compartment has a limit' : 'Separate allowances protect a named resource',
    phone ? 22 : 24,
  );
  if (phone) {
    d +=
      rect(24, 112, 312, 192, true) +
      text(40, 144, 'LIVE / 12 worker permits', 20) +
      slots(40, 184, 12, 6, false) +
      text(40, 280, 'Backfills cannot borrow these.', 17, true);
    d +=
      rect(24, 384, 312, 160) +
      text(40, 416, 'BACKFILL / 4 permits / full', 19) +
      slots(40, 456, 4, 4, true) +
      text(40, 512, 'Excess work stays outside this lane.', 16, true);
    d +=
      rect(24, 624, 312, 160) +
      text(40, 656, 'EXPLORATION / 4 permits', 19) +
      slots(40, 696, 4, 4, false) +
      text(40, 752, 'An independent admission limit.', 17, true);
    d +=
      rect(24, 864, 312, 192, true) +
      text(40, 896, '20 permits / fixed 12 + 4 + 4', 19) +
      text(40, 940, 'Unused capacity can remain idle.', 17, true) +
      text(40, 984, 'Shared database and storage', 17, true) +
      text(40, 1028, 'still need their own controls.', 17, true);
    d +=
      text(24, 1120, 'Squares: concurrent worker permits.', 16, true) +
      text(24, 1160, 'These are not CPU or memory units.', 16, true) +
      text(24, 1200, 'The allocation is illustrative.', 16, true);
    return svg(
      'Three separately enforced workload allowances',
      descriptions.allocation,
      360,
      1240,
      d,
    );
  }
  d += card(
    24,
    112,
    672,
    'Fixed allocation: 20 worker permits',
    'Live processing 12; backfills 4; exploration 4. No borrowing in this example.',
    true,
    112,
  );
  const rows = [
    {
      y: 304,
      title: 'LIVE / 12',
      count: 12,
      accent: false,
      note: 'Its allowance remains separate.',
    },
    {
      y: 512,
      title: 'BACKFILL / 4',
      count: 4,
      accent: true,
      note: 'Full: excess backfill stays outside.',
    },
    {
      y: 720,
      title: 'EXPLORATION / 4',
      count: 4,
      accent: false,
      note: 'Independent admission boundary.',
    },
  ];
  for (const row of rows) {
    d +=
      rect(24, row.y, 672, 144, row.accent) +
      text(40, row.y + 34, row.title, 20) +
      slots(272, row.y + 24, row.count, 6, row.accent) +
      text(40, row.y + 114, row.note, 18, true);
  }
  d +=
    rect(24, 944, 672, 144, true) +
    text(40, 976, 'The protected resource here is worker concurrency', 20) +
    text(
      40,
      1018,
      'Squares are permits, not automatically reserved CPU, memory or connections.',
      17,
      true,
    ) +
    text(
      40,
      1060,
      'Shared downstream limits and data correctness remain separate obligations.',
      17,
      true,
    );
  return svg(
    'Fixed workload capacity partitions contain interference',
    descriptions.allocation,
    720,
    1128,
    d,
  );
}
function admission(phone) {
  let d = text(
    24,
    34,
    phone
      ? 'A permit follows active work'
      : 'One full compartment leaves the other allowance available',
    phone ? 22 : 24,
  );
  if (phone) {
    d += card(
      24,
      112,
      312,
      'Backfill acquires its only permit',
      'Action waits on an owned event.',
      true,
      128,
      true,
    );
    d += arrow('M224 240V350') + text(24, 300, 'While it is active', 17, true);
    d += card(
      24,
      352,
      312,
      'Another backfill / rejected',
      'Its action is never invoked.',
      false,
      128,
      true,
    );
    d += card(
      24,
      560,
      312,
      'Live / independent permit',
      'Runs on its available caller thread.',
      true,
      128,
      true,
    );
    d += card(
      24,
      768,
      312,
      'Release the event; join worker',
      'Backfill finishes; finally releases.',
      false,
      128,
      true,
    );
    d += arrow('M224 896V1006') + text(24, 956, 'Now capacity is free', 17, true);
    d += card(
      24,
      1008,
      312,
      'A new backfill call / admitted',
      'Uses the returned permit.',
      true,
      128,
      true,
    );
    d +=
      text(24, 1216, 'No internal queue or thread reservation.', 16, true) +
      text(24, 1256, 'Arrows: local action-lifetime sequence.', 16, true);
    return svg(
      'Separate semaphore admission and permit release',
      descriptions.admission,
      360,
      1296,
      d,
    );
  }
  d += text(24, 128, 'BACKFILL / capacity 1', 22) + text(400, 128, 'LIVE / capacity 1', 22);
  d += card(
    24,
    184,
    296,
    'First action holds permit',
    'Waits on an event; remains active.',
    true,
    128,
    true,
  );
  d += card(
    400,
    184,
    296,
    'Its own permit is available',
    'Separate from backfill occupancy.',
    true,
    128,
    true,
  );
  d += arrow('M172 312V406') + arrow('M548 312V406');
  d += card(
    24,
    408,
    296,
    'Second action is rejected',
    'No invocation and no waiting queue.',
    false,
    128,
    true,
  );
  d += card(
    400,
    408,
    296,
    'Live action returns served',
    'Caller thread was already available.',
    true,
    128,
    true,
  );
  d += card(
    24,
    632,
    296,
    'Release event; join worker',
    'First action finishes and releases.',
    false,
    128,
    true,
  );
  d += arrow('M172 760V854');
  d += card(
    24,
    856,
    296,
    'A new backfill is admitted',
    'The permit is available again.',
    true,
    128,
    true,
  );
  d +=
    rect(400, 632, 296, 352) +
    text(416, 668, 'The gate counts action lifetimes.', 18) +
    text(416, 732, 'It does not reserve threads,', 17, true) +
    text(416, 772, 'terminate running actions,', 17, true) +
    text(416, 812, 'or bound downstream bytes.', 17, true) +
    text(416, 900, 'Release follows local completion,', 17, true) +
    text(416, 940, 'not merely a caller’s lost patience.', 17, true);
  d += text(
    24,
    1064,
    'Arrows: local sequencing. The live call can proceed during the active backfill.',
    17,
    true,
  );
  return svg(
    'Bulkhead saturation, independent admission and release',
    descriptions.admission,
    720,
    1104,
    d,
  );
}
const dimensions = {};
for (const [name, draw] of [
  ['allocation', allocation],
  ['admission', admission],
])
  for (const phone of [false, true]) {
    const path =
      name === 'allocation'
        ? `data-engineering/workload-isolation${phone ? '-mobile' : ''}.svg`
        : `software-engineering/bulkhead-admission${phone ? '-mobile' : ''}.svg`;
    const content = draw(phone);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    await mkdir(resolve(assets, path.split('/')[0]), { recursive: true });
    await writeFile(resolve(assets, path), content);
    dimensions[path] = { width: Number(width), height: Number(height) };
  }
const path = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(path, 'utf8'));
await writeFile(path, JSON.stringify({ ...manifest, ...dimensions }, null, 2) + '\n');
console.log(
  'Reworked the canonical workload allocation figure and added its phone layout plus the admission pair.',
);
