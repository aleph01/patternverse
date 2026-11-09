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
  comparison:
    'Without feedback, a source offering five thousand records per second feeds a sink processing two thousand; a buffer with six thousand free places fills in two seconds. With feedback, downstream capacity limits upstream admission. Data moves downstream while a separate capacity signal travels upstream; excess work remains outside the controlled boundary.',
  pull: 'The transfer reads the first chunk and awaits its sink write. While the write is blocked, it does not request chunk two. Completion permits the next read. After all three chunks complete, the generator is closed and the result reports three chunks and six bytes. Failure or cancellation exits through source closing instead of requesting further chunks.',
};
const dataArrow = (d) =>
  `<path d="${d}" fill="none" stroke="#252c28" stroke-width="1.3" marker-end="url(#data)"/>`;
const finishSvg = (...args) =>
  svg(...args).replace(
    '</defs>',
    '<marker id="data" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#252c28" stroke-width="1.2"/></marker></defs>',
  );
function comparison(phone) {
  let d = text(
    24,
    34,
    phone ? 'Capacity controls admission' : 'Data downstream, capacity upstream',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 88, 'Without feedback', 20);
    for (const [y, title, detail] of [
      [112, 'Source / 5,000 offered per s', 'No capacity signal respected.'],
      [248, 'Buffer / 6,000 free places', 'Grows by 3,000 records per s.'],
      [384, 'Sink / 2,000 completed per s', 'Steady illustrative rates.'],
    ])
      d += rect(24, y, 312, 80) + text(40, y + 30, title, 18) + text(40, y + 60, detail, 17, true);
    d += dataArrow('M300 192V246') + dataArrow('M300 328V382');
    d += text(24, 508, '6,000 / 3,000 = 2 s to fill', 20);
    d += text(24, 550, 'A larger buffer only buys more time.', 17, true);
    d += text(24, 608, 'With feedback', 20);
    for (const [y, title, detail] of [
      [656, 'Source / pause or resume', 'Read when capacity permits.'],
      [792, 'Bound buffers and in-flight work', 'Declare the capacity units.'],
      [928, 'Sink / capacity returns', 'Completion or freed buffer space.'],
    ])
      d +=
        rect(24, y, 312, 80, true) +
        text(40, y + 30, title, 18) +
        text(40, y + 60, detail, 17, true);
    d += dataArrow('M300 736V790') + dataArrow('M300 872V926');
    d += arrow('M24 968H12V696H22');
    d += text(24, 1060, 'Return arrow: capacity permission.', 17);
    d += text(24, 1100, 'Data arrows: downstream delivery.', 17, true);
    d += text(24, 1140, 'Unadmitted work remains upstream.', 17, true);
    d += text(24, 1180, 'Non-pausable sources need a policy.', 17, true);
    return finishSvg('Data downstream, capacity upstream', descriptions.comparison, 360, 1216, d);
  }
  d += text(24, 104, 'Without feedback', 22);
  for (const [x, title, detail] of [
    [24, 'Source', '5,000 offered / s'],
    [272, 'Buffer', '6,000 free places'],
    [520, 'Sink', '2,000 done / s'],
  ])
    d +=
      rect(x, 152, 176, 112) + text(x + 16, 184, title, 20) + text(x + 16, 226, detail, 17, true);
  d += dataArrow('M200 208H270') + dataArrow('M448 208H518');
  d +=
    rect(24, 312, 672, 120) +
    text(40, 348, '5,000 − 2,000 = 3,000 queued records / s', 22) +
    text(40, 396, '6,000 free places / 3,000 per s = 2 s to fill', 20, true);
  d += text(24, 504, 'With feedback', 22);
  for (const [x, title, detail] of [
    [24, 'Pause / resume', 'Read on demand'],
    [272, 'Bounded stages', 'Count unfinished'],
    [520, 'Sink capacity', 'Permits more work'],
  ])
    d +=
      rect(x, 560, 176, 128, true) +
      text(x + 16, 596, title, 19) +
      text(x + 16, 650, detail, 17, true);
  d += dataArrow('M200 610H270') + dataArrow('M448 610H518');
  d += arrow('M608 688V760H112V690');
  d += text(248, 742, 'Capacity feedback / permission', 19);
  d +=
    rect(24, 832, 672, 152, true) +
    text(40, 868, 'Unadmitted work stays outside this boundary', 22) +
    text(40, 914, 'Feedback does not increase the sink’s capacity or erase backlog.', 19, true) +
    text(40, 956, 'A source that cannot pause needs an explicit overload policy.', 19, true);
  d += text(24, 1030, 'Forward arrows: data. Return arrow: capacity feedback.', 18, true);
  return finishSvg('Data downstream, capacity upstream', descriptions.comparison, 720, 1072, d);
}
function pull(phone) {
  let d = text(
    24,
    34,
    phone ? 'Await before advancing' : 'A completed write permits the next read',
    phone ? 22 : 24,
  );
  if (phone) {
    for (const [y, title, detail, extra] of [
      [
        112,
        'Read first chunk / 1 byte',
        'Call the asynchronous writer.',
        'One unfinished invocation.',
      ],
      [
        328,
        'Await write / held by an event',
        'Read count 1 / completed bytes 0',
        'No request for chunk two.',
      ],
      [
        568,
        'Completion permits next read',
        'Finish the callback; then advance.',
        'No per-chunk task queue.',
      ],
      [
        808,
        'Exhaustion / source closed',
        '3 chunks / 6 bytes completed',
        'The generator is closed.',
      ],
    ])
      d +=
        rect(24, y, 312, 152, true) +
        text(40, y + 32, title, 18) +
        text(40, y + 80, detail, 17, true) +
        text(40, y + 124, extra, 17, true);
    d += dataArrow('M300 264V326') + arrow('M300 480V566') + dataArrow('M300 720V806');
    d += text(24, 1016, 'Failure or cancellation: close source.', 17);
    d += text(24, 1060, 'Ownership starts with transfer.', 17, true);
    d += text(24, 1104, 'The callback owns its sink cleanup.', 17, true);
    return finishSvg('A completed write permits the next read', descriptions.pull, 360, 1144, d);
  }
  d += text(24, 104, 'SOURCE', 20) + text(400, 104, 'SINK CALLBACK', 20);
  for (const [x, y, title, detail] of [
    [24, 152, 'Read chunk one', 'One byte: a'],
    [400, 152, 'Await write', 'Held on an event'],
    [24, 360, 'Do not advance', 'Read count stays at 1'],
    [400, 360, 'Still unfinished', 'Completed bytes stay at 0'],
    [24, 640, 'Read next chunk', 'After the prior write finishes'],
    [400, 640, 'Await next write', 'Repeat sequentially'],
  ])
    d +=
      rect(x, y, 296, 128, true) +
      text(x + 16, y + 34, title, 20) +
      text(x + 16, y + 84, detail, 18, true);
  d += dataArrow('M320 216H398') + dataArrow('M320 704H398');
  d += arrow('M548 488V560H172V490');
  d += text(232, 542, 'Completion permits the next read', 19);
  d +=
    rect(24, 832, 672, 120) +
    text(40, 868, 'Finished: 3 chunks / 6 bytes / source closed', 22) +
    text(40, 910, 'Failure or cancellation also exits through owned source closing.', 18, true);
  d += text(24, 1004, 'After transfer starts. Sink cleanup belongs to the callback.', 18, true);
  return finishSvg('A completed write permits the next read', descriptions.pull, 720, 1048, d);
}
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['comparison', comparison],
  ['pull', pull],
])
  for (const phone of [false, true]) {
    const path =
      name === 'comparison'
        ? `data-engineering/backpressure${phone ? '-mobile' : ''}.svg`
        : `software-engineering/backpressure-pull${phone ? '-mobile' : ''}.svg`;
    const source = draw(phone);
    await writeFile(resolve(assets, path), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[path] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Reworked the canonical feedback figure and added its phone version plus the awaited-write pair.',
);
