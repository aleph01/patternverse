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
  workers:
    'A coordinator admits at most four jobs awaiting result collection. The pool has up to two reusable threads; in the illustrated snapshot two jobs execute while two wait. A thread finishes one job and takes another instead of being recreated. Completed futures still occupy the coordinator’s admission window until collected.',
  lifecycle:
    'In one possible schedule, worker A runs job 0 and later job 2 on the same thread. Worker B runs job 1 and later job 3. Each future becomes a result or exception, which the coordinator collects before freeing an admission place. After the final submitted tasks finish, the owner shuts down and joins the pool workers before removing temporary files.',
};
function workers(phone) {
  let d = text(
    24,
    34,
    phone ? 'Two limits, one workload' : 'Limit worker threads and admitted work separately',
    phone ? 22 : 24,
  );
  if (phone) {
    d += rect(24, 112, 312, 152, true) + text(40, 144, 'Coordinator window = four jobs', 18);
    d +=
      text(40, 188, 'Count every submitted job whose', 16, true) +
      text(40, 220, 'outcome has not been collected.', 16, true);
    d += arrow('M180 264V334') + text(196, 308, 'submit', 16, true);
    d += rect(24, 336, 312, 152) + text(40, 368, 'Two queued calls in this snapshot', 17);
    d += rect(40, 400, 128, 56, false, true) + rect(192, 400, 128, 56, false, true);
    d += text(54, 434, 'job 2', 18) + text(206, 434, 'job 3', 18);
    d += arrow('M180 488V590') + text(196, 544, 'dispatch', 16, true);
    d += rect(24, 592, 312, 200, true) + text(40, 624, 'Pool: up to two worker threads', 18);
    d += text(40, 670, 'A executes job 0.', 18) + text(40, 710, 'B executes job 1.', 18);
    d += text(40, 760, 'Reuse these threads for later jobs.', 16, true);
    d += rect(24, 888, 312, 168) + text(40, 920, 'Finished but not collected?', 19);
    d += text(40, 964, 'The future still counts in the window.', 15, true);
    d += text(40, 1008, 'Collect it before admitting more.', 16, true);
    d += text(24, 1130, 'Snapshot: two running + two queued.', 16, true);
    d +=
      text(24, 1170, 'The pool ceiling alone is not a', 16, true) +
      text(24, 1202, 'limit on the submitted backlog.', 16, true);
    d += text(24, 1260, 'Arrows: submission and dispatch.', 16, true);
  } else {
    d += card(
      24,
      112,
      672,
      'Coordinator: track up to four submitted jobs awaiting collection',
      'The window includes queued, running, and completed-uncollected jobs.',
      true,
      144,
    );
    d += arrow('M360 256V334') + text(376, 302, 'submit', 17, true);
    d +=
      rect(24, 336, 672, 448, true) + text(40, 368, 'Thread pool: up to two reusable workers', 21);
    d +=
      rect(48, 416, 624, 96) +
      text(64, 448, 'Queue snapshot: job 2 and job 3 wait while both workers are busy.', 18);
    d += text(64, 486, 'Scheduling and queue policy belong to the executor.', 16, true);
    d += arrow('M360 512V552H196V606') + arrow('M360 552H524V606');
    d += text(278, 588, 'dispatch when free', 16, true);
    d += card(48, 608, 296, 'Worker thread A', 'Executing job 0', false, 144);
    d += card(376, 608, 296, 'Worker thread B', 'Executing job 1', false, 144);
    d +=
      text(64, 720, 'Same thread takes another task.', 16, true) +
      text(392, 720, 'Same thread takes another task.', 16, true);
    d += card(
      24,
      880,
      672,
      'Finished future, not yet collected: still one admitted job',
      'Collect the result or exception before freeing its window place.',
      false,
      144,
    );
    d += text(24, 1080, 'Snapshot: two running + two queued = four jobs awaiting collection.', 19);
    d += text(24, 1120, 'The worker ceiling alone does not bound the submitted backlog.', 17, true);
    d += text(
      24,
      1170,
      'Arrows: submission and dispatch; threads are reused across jobs.',
      17,
      true,
    );
  }
  return svg(
    'Thread Pool: workers and admission',
    descriptions.workers,
    phone ? 360 : 720,
    phone ? 1312 : 1216,
    d,
  );
}
function lifecycle(phone) {
  let d = text(
    24,
    34,
    phone ? 'A task ends; its thread stays' : 'Reusable threads, separate task futures',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 98, 'One possible schedule; assignments vary.', 16, true);
    d += rect(24, 144, 312, 168, true) + text(40, 176, 'Thread A', 20);
    d +=
      text(40, 218, 'job 0: 3 bytes', 18) +
      arrow('M180 232V266') +
      text(40, 292, 'job 2: ValueError', 18);
    d += rect(24, 376, 312, 168, true) + text(40, 408, 'Thread B', 20);
    d +=
      text(40, 450, 'job 1: 4 bytes', 18) +
      arrow('M180 464V498') +
      text(40, 524, 'job 3: FileNotFoundError', 18);
    d += text(24, 606, 'Row arrows: same thread, next task.', 16, true);
    d += rect(24, 672, 312, 200) + text(40, 704, 'Coordinator collects futures', 19);
    d += text(40, 748, 'Each result or error stays tied to its job.', 15, true);
    d += text(40, 792, 'Collect → free an admission place.', 16, true);
    d += text(40, 840, 'Collection overlaps worker execution.', 15, true);
    d += rect(24, 968, 312, 216, true) + text(40, 1000, 'Owner exits the pool context', 19);
    d += text(40, 1044, 'Wait for submitted tasks to finish.', 16, true);
    d += text(40, 1088, 'Join workers before returning.', 16, true);
    d += text(40, 1132, 'Then remove temporary input files.', 16, true);
    d += text(24, 1248, 'Report sorting does not order execution.', 16, true);
    d += text(24, 1290, 'A stuck task can hold shutdown open.', 16, true);
  } else {
    d += text(
      24,
      96,
      'One possible schedule; task-to-thread assignment is not a promise.',
      17,
      true,
    );
    for (const [index, row] of [
      ['A', '0', '3 bytes', '2', 'ValueError'],
      ['B', '1', '4 bytes', '3', 'FileNotFoundError'],
    ].entries()) {
      const y = 160 + index * 240;
      d += rect(24, y, 128, 160, true) + text(40, y + 38, 'Thread ' + row[0], 20);
      d += text(40, y + 84, 'Reused', 17, true);
      d += card(192, y, 216, 'job ' + row[1], row[2], false, 160);
      d += card(480, y, 216, 'job ' + row[3], row[4], false, 160);
      d += arrow(`M408 ${y + 80}H478`) + text(424, y + 58, 'next', 15, true);
    }
    d += text(
      24,
      698,
      'Row arrows: the same thread takes another task, not a new thread.',
      17,
      true,
    );
    d += card(
      24,
      768,
      672,
      'Coordinator: collect each completed future’s result or exception',
      'Collection overlaps execution and frees an admission place for another job.',
      false,
      144,
    );
    d += card(
      24,
      1008,
      672,
      'Pool owner: finish input, collect outcomes, exit the executor context',
      'Wait for submitted tasks and join workers before removing temporary files.',
      true,
      144,
    );
    d += text(
      24,
      1210,
      'Index-sorted reporting does not imply execution or completion order.',
      17,
      true,
    );
    d += text(24, 1250, 'A stuck task can keep shutdown waiting indefinitely.', 17, true);
  }
  return svg(
    'Thread Pool: task and worker lifetimes',
    descriptions.lifecycle,
    phone ? 360 : 720,
    phone ? 1336 : 1296,
    d,
  );
}
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, build] of [
  ['workers', workers],
  ['lifecycle', lifecycle],
])
  for (const phone of [false, true]) {
    const key = `software-engineering/thread-pool-${name}${phone ? '-mobile' : ''}.svg`;
    const source = build(phone);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    await writeFile(resolve(assets, key), source);
    manifest[key] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Generated Thread Pool: two native figures with separate phone compositions.');
