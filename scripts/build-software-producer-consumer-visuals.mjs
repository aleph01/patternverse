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
  buffer:
    'A producer holds record 4 while two queue places contain records 2 and 3. Two consumers already process records 0 and 1 outside the queue. Removing a queued record frees a waiting place before processing finishes. Outcomes are collected separately.',
  finish:
    'The coordinator first finishes all producers, then enqueues one stop marker per consumer behind accepted jobs, waits for queue task accounting, and joins the consumer threads. Consumers keep removing and handling jobs during shutdown, recording either a measurement or a rejection before task_done; each exits after its own stop marker.',
};
function buffer(phone) {
  let d = text(
    24,
    34,
    phone ? 'Bound waiting work' : 'A full queue and two active consumers',
    phone ? 22 : 24,
  );
  if (phone) {
    d += card(
      24,
      104,
      312,
      'Producer holds record 4',
      'put waits while the queue is full.',
      false,
      112,
      true,
    );
    d += arrow('M180 216V294') + text(196, 260, 'admit when free', 15, true);
    d += rect(24, 296, 312, 184, true) + text(40, 326, 'FIFO queue: two waiting places', 18);
    d += rect(40, 350, 132, 94, false, true) + rect(188, 350, 132, 94, false, true);
    d += text(54, 380, 'record 2', 18) + text(54, 412, 'next out', 16, true);
    d += text(202, 380, 'record 3', 18) + text(202, 412, 'behind 2', 16, true);
    d += arrow('M180 480V582') + text(196, 532, 'next get', 16, true);
    d += rect(24, 584, 312, 192) + text(40, 616, 'Two consumers: work in progress', 18);
    d += text(40, 660, 'A processes record 0.', 18) + text(40, 702, 'B processes record 1.', 18);
    d += text(40, 748, 'Processing is outside the queue lock.', 15, true);
    d += arrow('M180 776V870') + text(196, 826, 'outcome', 16, true);
    d += card(
      24,
      872,
      312,
      'Separate result collection',
      'Success or rejection for each record.',
      false,
      128,
      true,
    );
    d += text(40, 974, 'Sorted by index after joining workers.', 15, true);
    d += text(24, 1060, 'Two waiting + two executing', 19);
    d += text(24, 1096, 'Up to four accepted records here.', 16, true);
    d += text(24, 1156, 'The input batch, held record, and', 16, true);
    d += text(24, 1188, 'collected results use extra memory.', 16, true);
    d += text(24, 1244, 'Arrows: admission, next take, outcome.', 15, true);
  } else {
    d += card(
      24,
      104,
      672,
      'Producer holds record 4',
      'Blocking put waits until a queue place opens.',
      false,
      112,
    );
    d += arrow('M360 216V302') + text(376, 262, 'admit when free', 17, true);
    d +=
      rect(24, 304, 672, 176, true) +
      text(40, 334, 'FIFO queue: capacity = two waiting entries', 20);
    d += card(40, 358, 304, 'record 2', 'Next entry removed', false, 96);
    d += card(376, 358, 304, 'record 3', 'Removed after record 2', false, 96);
    d += arrow('M360 480V530H172V606') + arrow('M360 530H548V606');
    d += text(226, 566, 'next get when a consumer is ready', 17, true);
    d += card(24, 608, 296, 'Consumer A', 'Processing record 0', false, 144);
    d += card(400, 608, 296, 'Consumer B', 'Processing record 1', false, 144);
    d +=
      text(40, 720, 'Work outside queue lock', 16, true) +
      text(416, 720, 'Work outside queue lock', 16, true);
    d += arrow('M172 752V878') + arrow('M548 752V878');
    d += text(376, 850, 'outcomes', 17, true);
    d += card(
      24,
      880,
      672,
      'Separate result collection: a value or rejection for each record',
      'The example restores report order by index after joining workers.',
      false,
      112,
    );
    d += text(24, 1040, 'Two waiting + two executing = up to four accepted records here.', 19);
    d += text(
      24,
      1080,
      'Input batch, producer-held record, and collected results use extra memory.',
      17,
      true,
    );
    d += text(24, 1130, 'Arrows: admission, a subsequent take, and outcome recording.', 17, true);
  }
  return svg(
    'Producer-Consumer: waiting versus executing',
    descriptions.buffer,
    phone ? 360 : 720,
    phone ? 1296 : 1176,
    d,
  );
}
function finish(phone) {
  let d = text(
    24,
    34,
    phone ? 'Finish, drain, join' : 'Shutdown: the coordinator waits; consumers keep running',
    phone ? 22 : 24,
  );
  if (phone) {
    d += rect(24, 104, 312, 136, true) + text(40, 136, 'Consumers stay active', 19);
    d += text(40, 176, 'get → handle → task_done', 17, true);
    d += text(40, 214, 'Stop entry: task_done, then exit.', 16, true);
    const steps = [
      [
        '1 / finish all producers',
        'The last data job has been put.',
        'No producer may submit later.',
      ],
      [
        '2 / put one stop per consumer',
        'Markers follow accepted jobs.',
        'These puts may block for space.',
      ],
      ['3 / pending.join()', 'Wait for all task_done calls.', 'Handled failures also count.'],
      [
        '4 / thread.join() for each',
        'Wait for consumer termination.',
        'Now read and order outcomes.',
      ],
    ];
    for (const [i, lines] of steps.entries()) {
      const y = 304 + i * 224;
      d += rect(24, y, 312, 152, i === 2) + text(40, y + 32, lines[0], 18);
      d += text(40, y + 78, lines[1], 16, true) + text(40, y + 122, lines[2], 16, true);
      if (i < 3) d += arrow(`M180 ${y + 152}V${y + 222}`);
    }
    d += text(24, 1200, 'Arrows: coordinator call order.', 16, true);
    d += text(24, 1238, 'Workers overlap steps 1–3.', 16, true);
    d += text(24, 1292, 'Completion is not universal success.', 17);
  } else {
    const steps = [
      ['Finish every producer', 'Last data job accepted; no later puts.'],
      ['Put two private stop markers', 'One per consumer, after the jobs.'],
      ['pending.join()', 'Wait for task accounting to reach zero.'],
      ['Join both consumer threads', 'Wait for their termination; read results.'],
    ];
    for (const [i, lines] of steps.entries()) {
      const y = 112 + i * 224;
      d += card(24, y, 416, lines[0], lines[1], i === 2, 144, true);
      if (i < 3) d += arrow(`M232 ${y + 144}V${y + 222}`);
    }
    d += rect(480, 112, 216, 592, true) + text(496, 148, 'Consumers run', 20);
    d += text(496, 184, 'during steps 1–3.', 18);
    d +=
      text(496, 264, 'For a data job:', 18) +
      text(496, 306, 'get', 18) +
      text(496, 348, 'handle + outcome', 17) +
      text(496, 390, 'task_done', 18);
    d +=
      text(496, 474, 'For a stop entry:', 18) +
      text(496, 516, 'get', 18) +
      text(496, 558, 'task_done', 18) +
      text(496, 600, 'exit', 18);
    d += text(496, 670, 'No queue lock at work.', 15, true);
    d +=
      text(480, 780, 'Stops can be consumed', 16, true) +
      text(480, 816, 'while the coordinator', 16, true) +
      text(480, 852, 'is still sending stops.', 16, true);
    d += text(24, 1040, 'Queue completion counts handled jobs, including rejected readings.', 19);
    d += text(
      24,
      1080,
      'A drained queue does not by itself prove that workers have terminated.',
      17,
      true,
    );
    d += text(
      24,
      1130,
      'Arrows: coordinator call order. Consumer execution overlaps it.',
      17,
      true,
    );
  }
  return svg(
    'Producer-Consumer: completion and shutdown',
    descriptions.finish,
    phone ? 360 : 720,
    phone ? 1336 : 1176,
    d,
  );
}
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, build] of [
  ['buffer', buffer],
  ['finish', finish],
])
  for (const phone of [false, true]) {
    const key = `software-engineering/producer-consumer-${name}${phone ? '-mobile' : ''}.svg`;
    const source = build(phone);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    await writeFile(resolve(assets, key), source);
    manifest[key] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Generated Producer-Consumer: two native figures, each with a phone composition.');
