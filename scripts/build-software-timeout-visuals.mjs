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
  budget:
    'A quote has one 300 millisecond budget. Inventory consumes the first 120 milliseconds, leaving shipping 180 milliseconds until the same deadline. Giving shipping a fresh 300 milliseconds would extend the operation to 420 milliseconds. Queueing and setup must be explicitly included or excluded from the chosen boundary.',
  outcome:
    'When a deadline expires, the caller takes a timeout path and may request cancellation. A cooperative local dependency releases its resource before reporting timeout. A remote service can commit before cancellation or a late reply arrives; the caller must reconcile that outcome rather than infer rollback.',
};
function budget(phone) {
  let d = text(
    24,
    34,
    phone ? 'Spend one shared budget' : 'A shared deadline preserves the total waiting budget',
    phone ? 22 : 24,
  );
  if (phone) {
    d += card(
      24,
      104,
      312,
      'Quote budget / 300 ms',
      'One deadline for both stages.',
      true,
      112,
      true,
    );
    d += card(
      24,
      288,
      312,
      'Inventory / 120 ms used',
      'Remaining: 300 − 120 = 180 ms.',
      false,
      128,
      true,
    );
    d += arrow('M180 416V486');
    d += card(
      24,
      488,
      312,
      'Shipping / up to 180 ms',
      'The original deadline stays fixed.',
      true,
      128,
      true,
    );
    d += arrow('M180 616V686');
    d += card(
      24,
      688,
      312,
      'Deadline / at 300 ms',
      'Take the timeout path if overdue.',
      false,
      128,
      true,
    );
    d +=
      rect(24, 896, 312, 160) +
      text(40, 925, 'Resetting breaks the total budget', 18) +
      text(40, 970, '120 ms + a fresh 300 ms', 17, true) +
      text(40, 1014, 'allows 420 ms across the two waits.', 17, true);
    d +=
      text(24, 1120, 'Arrows: stage handoff toward expiry.', 16, true) +
      text(24, 1160, 'Queue/setup need an explicit boundary.', 16, true) +
      text(24, 1200, 'Illustrative accounting; not a benchmark.', 16, true);
    return svg('One shared quote budget', descriptions.budget, 360, 1240, d);
  }
  d += card(
    24,
    104,
    672,
    'Example boundary: inventory and shipping waits',
    'Elapsed time runs left to right; all numbers are milliseconds.',
    true,
    104,
  );
  d += text(24, 264, 'Shared operation budget', 22);
  d += rect(60, 312, 160, 104) + text(76, 344, 'Inventory', 19) + text(76, 379, '120 ms', 17, true);
  d +=
    rect(220, 312, 240, 104, true) +
    text(236, 344, 'Shipping', 19) +
    text(236, 379, '180 ms remaining', 17, true);
  d +=
    '<path d="M460 288V470" fill="none" stroke="#00855b" stroke-width="1.5" stroke-dasharray="5 5"/>';
  d +=
    text(60, 450, '0 ms', 17, true) +
    text(220, 450, '120 ms', 17, true) +
    text(472, 450, '300 ms / deadline', 17, true);
  d += text(24, 536, 'Fresh budget per call', 22);
  d += rect(60, 584, 160, 104) + text(76, 616, 'Inventory', 19) + text(76, 651, '120 ms', 17, true);
  d +=
    rect(220, 584, 400, 104) +
    text(236, 616, 'Shipping', 19) +
    text(236, 651, 'Fresh 300 ms allowance', 17, true);
  d +=
    '<path d="M460 560V744" fill="none" stroke="#00855b" stroke-width="1.5" stroke-dasharray="5 5"/>';
  d +=
    text(60, 726, '0 ms', 17, true) +
    text(220, 726, '120 ms', 17, true) +
    text(620, 726, '420 ms', 17, true);
  d += card(
    24,
    816,
    672,
    'After 120 ms, pass only the remaining 180 ms',
    'Queueing and setup must be budgeted when included in the boundary.',
    true,
    128,
  );
  d += text(
    24,
    994,
    'Same horizontal scale in both rows. Numbers are illustrative, not measured.',
    17,
    true,
  );
  return svg('Shared deadline versus resetting per-call limits', descriptions.budget, 720, 1040, d);
}
function outcome(phone) {
  let d = text(
    24,
    34,
    phone
      ? 'Expiry is not remote rollback'
      : 'A timeout and the operation’s outcome are different facts',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 116, 'Cooperative local dependency', 20);
    d += card(24, 152, 312, 'Deadline expires', 'Request cancellation.', true, 112, true);
    d += arrow('M180 264V334');
    d += card(
      24,
      336,
      312,
      'Unwind the local finally block',
      'Then report TimeoutError.',
      true,
      112,
      true,
    );
    d += text(24, 520, 'One possible remote ordering', 20);
    d += card(
      24,
      560,
      312,
      'Server commits a state change',
      'The client has no confirmation yet.',
      false,
      112,
      true,
    );
    d += arrow('M180 672V742');
    d += card(
      24,
      744,
      312,
      'Client deadline expires',
      'Cancellation can arrive too late.',
      false,
      112,
      true,
    );
    d += arrow('M180 856V926');
    d += card(
      24,
      928,
      312,
      'A reply arrives late',
      'The wait has already expired.',
      false,
      112,
      true,
    );
    d +=
      rect(24, 1120, 312, 160, true) +
      text(40, 1150, 'Reconcile by operation identity', 18) +
      text(40, 1194, 'Timeout alone cannot confirm', 17, true) +
      text(40, 1238, 'rejection, success, or rollback.', 17, true);
    d +=
      text(24, 1348, 'Arrows: order within each example.', 16, true) +
      text(24, 1388, 'Cleanup itself can delay the outcome.', 16, true);
    return svg('Local cleanup and uncertain remote completion', descriptions.outcome, 360, 1424, d);
  }
  d +=
    text(24, 128, 'Cooperative local dependency', 20) +
    text(400, 128, 'One possible remote ordering', 20);
  d += card(24, 184, 296, 'Deadline expires', 'Request cancellation.', true, 128, true);
  d += card(400, 184, 296, 'Server commits', 'Client has no confirmation yet.', false, 128, true);
  d += arrow('M172 312V406') + arrow('M548 312V406');
  d += card(24, 408, 296, 'Unwind local finally', 'Run the owned cleanup path.', true, 128, true);
  d += card(
    400,
    408,
    296,
    'Client deadline expires',
    'Cancellation can arrive too late.',
    false,
    128,
    true,
  );
  d += arrow('M172 536V630') + arrow('M548 536V630');
  d += card(24, 632, 296, 'Report TimeoutError', 'Cleanup may delay this step.', true, 128, true);
  d += card(
    400,
    632,
    296,
    'A reply arrives late',
    'The wait has already expired.',
    false,
    128,
    true,
  );
  d +=
    rect(24, 864, 672, 160, true) +
    text(40, 896, 'Reconcile uncertain remote outcomes by operation identity', 20) +
    text(
      40,
      940,
      'The local cleanup path does not prove that the remote operation stopped.',
      17,
      true,
    ) +
    text(40, 984, 'Timeout alone cannot confirm rejection, success, or rollback.', 17, true);
  d += text(
    24,
    1104,
    'Arrows: order within each example; the columns have separate lifecycles.',
    17,
    true,
  );
  return svg(
    'Timeout is distinct from confirmed operation outcome',
    descriptions.outcome,
    720,
    1152,
    d,
  );
}
const dimensions = {};
for (const [name, draw] of [
  ['budget', budget],
  ['outcome', outcome],
])
  for (const phone of [false, true]) {
    const path = `software-engineering/timeout-${name}${phone ? '-mobile' : ''}.svg`;
    const content = draw(phone);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
    await writeFile(resolve(assets, path), content);
    dimensions[path] = { width: Number(width), height: Number(height) };
  }
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await writeFile(manifestPath, JSON.stringify({ ...manifest, ...dimensions }, null, 2) + '\n');
console.log('Wrote two Timeout figures, four editable variants and dimensions.');
