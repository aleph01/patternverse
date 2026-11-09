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
  flow: 'Bursty producers enqueue jobs into a six-place waiting buffer. A controlled handler transfers work toward the target using a two-job budget per one-second model tick. Confirmed admission and completed work are distinct outcomes. Queue capacity, drain budget, and target capacity are separate controls.',
  trace:
    'Four one-second ticks show arrivals of six, two, zero, and zero jobs. All are admitted without rejection. Each tick completes two jobs, leaving four, four, two, and zero waiting. Accepted jobs total eight, completed jobs total eight, and the final backlog is empty.',
};
function flow(phone) {
  const width = phone ? 360 : 720,
    right = width - 48,
    axis = phone ? 300 : 360;
  let d = text(
    24,
    34,
    phone ? 'Accept now; finish later' : 'Buffer arrivals, then control the drain',
    phone ? 22 : 24,
  );
  d += rect(24, 104, right, 112) + text(40, 136, 'Producers / bursty intake', 20);
  if (phone) d += text(40, 174, 'Tick 1: six jobs arrive.', 17, true);
  else d += text(40, 176, 'Tick 1: six jobs arrive. Tick 2: two more arrive.', 19, true);
  d += arrow(`M${axis} 216V312`);
  d += text(24, 264, 'Confirmed enqueue', 17, true);
  d +=
    rect(24, 312, right, phone ? 192 : 144, true) + text(40, 344, 'Waiting queue / capacity 6', 20);
  for (let i = 0; i < 6; i++)
    d += rect(40 + i * (phone ? 44 : 48), 376, phone ? 28 : 32, 32, true, true);
  if (phone)
    d +=
      text(40, 438, 'Count jobs.', 17, true) +
      text(40, 478, 'Also bound bytes in production.', 17, true);
  else d += text(40, 438, 'Count jobs; also bound bytes in production.', 17, true);
  const bottom = phone ? 504 : 456;
  d += arrow(`M${axis} ${bottom}V${bottom + 96}`);
  d += text(24, bottom + 48, 'Take within the budget', 17, true);
  d += rect(24, bottom + 96, right, 144, true) + text(40, bottom + 128, 'Controlled handler', 20);
  d += text(
    40,
    bottom + 168,
    phone ? 'At most 2 jobs per 1 s tick.' : 'At most 2 jobs per one-second model tick.',
    phone ? 18 : 20,
  );
  d += text(
    40,
    bottom + 208,
    phone
      ? 'All consumers share this budget.'
      : 'Aggregate demand includes every consumer and retry.',
    phone ? 16 : 18,
    true,
  );
  d += arrow(`M${axis} ${bottom + 240}V${bottom + 336}`);
  d += text(24, bottom + 288, 'Work toward the target', 17, true);
  d += rect(24, bottom + 336, right, 112) + text(40, bottom + 368, 'Target / report writer', 20);
  d += text(
    40,
    bottom + 408,
    phone ? 'Fits the chosen service budget.' : 'Queue depth alone does not protect its capacity.',
    phone ? 17 : 19,
    true,
  );
  const foot = bottom + 512;
  d += text(24, foot, 'Arrows: work transfer.', 17, true);
  d += text(
    24,
    foot + 40,
    phone
      ? 'Enqueued does not mean finished.'
      : 'Confirmed enqueue is separate from successful completion.',
    phone ? 17 : 19,
  );
  d += text(
    24,
    foot + 80,
    phone
      ? 'The tick budget is a model rule.'
      : 'The tick budget models controlled service; it is not a live limiter.',
    phone ? 17 : 18,
    true,
  );
  return svg('Buffer arrivals, then control the drain', descriptions.flow, width, foot + 112, d);
}
// tick, arrivals, accepted, rejected, completed, waiting at tick end
const rows = [
  [1, 6, 6, 0, 2, 4],
  [2, 2, 2, 0, 2, 4],
  [3, 0, 0, 0, 2, 2],
  [4, 0, 0, 0, 2, 0],
];
function trace(phone) {
  let d = text(
    24,
    34,
    phone ? 'A burst drains over time' : 'Eight accepted jobs, two completions per tick',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 80, 'One tick = 1 second. Capacity = 6 jobs.', 16, true);
    for (const [i, r] of rows.entries()) {
      const y = 120 + i * 216;
      d += rect(24, y, 312, 176, true) + text(40, y + 30, `Tick ${r[0]} / arrivals ${r[1]}`, 20);
      d += text(40, y + 70, `Accepted ${r[2]} / rejected ${r[3]}`, 18);
      d += text(40, y + 110, `Completed ${r[4]} jobs`, 18);
      d += text(40, y + 150, `Waiting at tick end: ${r[5]}`, 18, true);
    }
    d += text(24, 1020, 'Admit first; then drain up to 2.', 17, true);
    d += text(24, 1060, 'Total: 8 accepted, 8 completed.', 17);
    d += text(24, 1100, 'Final backlog: 0 jobs.', 17);
    return svg('A burst drains over four ticks', descriptions.trace, 360, 1144, d);
  }
  d += text(24, 88, 'One tick = 1 second. Waiting capacity = 6 jobs.', 19, true);
  const xs = [40, 140, 250, 358, 466, 574];
  d += rect(24, 128, 672, 64);
  ['Tick', 'Arrive', 'Accept', 'Reject', 'Done', 'Waiting'].forEach((s, i) => {
    d += text(xs[i], 166, s, 18);
  });
  for (const [i, row] of rows.entries()) {
    const y = 192 + i * 88;
    d += rect(24, y, 672, 88, true);
    row.forEach((value, j) => {
      d += text(xs[j], y + 51, value, 22);
    });
  }
  d += text(24, 600, 'Arrivals are admitted before that tick’s drain.', 19, true);
  d += text(24, 642, 'Waiting is sampled after completions at tick end.', 19, true);
  d += text(24, 696, '8 accepted = 8 completed + 0 still waiting', 22);
  return svg('A burst drains over four ticks', descriptions.trace, 720, 736, d);
}
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['flow', flow],
  ['trace', trace],
])
  for (const phone of [false, true]) {
    const path = `software-engineering/queue-based-load-leveling-${name}${phone ? '-mobile' : ''}.svg`;
    const source = draw(phone);
    await writeFile(resolve(assets, path), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[path] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Created two native load-leveling figures and their separately composed phone variants.',
);
