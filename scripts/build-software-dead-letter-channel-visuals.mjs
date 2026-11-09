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

const flowDescription =
  'Instruction E901 remains on the normal orders path while classified dependency failures are within a three-failure budget. At the third failure, a safe handoff preserves the original instruction and failure context in the dead letter channel. Diagnosis and repair precede controlled redrive through the normal idempotent receiver.';
const transferDescription =
  'One local SQLite transaction inserts the complete failure record and deletes the pending record. Commit leaves the instruction in the dead letter channel. A full destination or an error before commit leaves the source instruction intact. Broker acknowledgments and remote processing effects are outside this database simulation.';
function flow(compact) {
  const drawing = compact
    ? text(24, 34, 'Retain the unresolved work', 23) +
      text(24, 86, 'Policy: three classified failures.', 17, true) +
      card(24, 112, 312, 'Normal orders path', 'Instruction: E901', false, 100) +
      arrow('M180 212V252H12V368H46') +
      arrow('M12 368V616H46') +
      card(48, 288, 288, 'Fewer than 3 failures', 'Stay on the normal retry path.', false, 160) +
      text(64, 404, 'Use the existing delay policy.', 16, true) +
      card(48, 536, 288, '3 failures reached', 'Safe handoff to failure channel', true, 160) +
      text(64, 652, 'Do not release the only copy.', 16, true) +
      arrow('M192 696V774') +
      card(24, 776, 312, 'Dead letter channel', 'Identity + original bytes', true, 176) +
      text(40, 886, 'Reason / attempts / timestamps', 17, true) +
      text(40, 926, 'Source / consumer version', 17, true) +
      arrow('M180 952V1038') +
      text(196, 1004, 'investigate', 16, true) +
      card(
        24,
        1040,
        312,
        'Repair, then controlled redrive',
        'Revalidate; preserve logical identity.',
        false,
        176,
        true,
      ) +
      text(40, 1150, 'Use the normal idempotent receiver.', 16, true) +
      text(40, 1190, 'Verify the business outcome.', 17, true) +
      text(24, 1296, 'Redrive is an explicit decision.', 17, true)
    : text(24, 34, 'Preserve work beyond normal recovery', 24) +
      card(
        24,
        112,
        672,
        'Normal orders path',
        'Illustrative policy: three classified dependency failures',
        false,
        96,
      ) +
      arrow('M360 208V248H180V286') +
      arrow('M360 248H540V286') +
      card(24, 288, 312, 'Fewer than 3 failures', 'Stay on the normal retry path.', false, 144) +
      text(40, 398, 'Use the existing delay policy.', 17, true) +
      card(384, 288, 312, '3 failures reached', 'Safe handoff to failure channel', true, 144) +
      text(400, 398, 'Preserve the recoverable copy.', 17, true) +
      arrow('M540 432V510') +
      card(
        24,
        512,
        672,
        'Dead letter channel: E901 is still unresolved',
        'Identity + original bytes + failure category + attempts + timestamps',
        true,
        144,
      ) +
      text(
        40,
        620,
        'Retain source destination and processing version; assign an owner.',
        18,
        true,
      ) +
      arrow('M360 656V734') +
      text(376, 704, 'owner investigates', 17, true) +
      card(
        24,
        736,
        672,
        'Repair, then controlled redrive',
        'Revalidate and preserve logical event identity.',
        false,
        160,
      ) +
      text(
        40,
        852,
        'Use the normal idempotent receiver and verify the business outcome.',
        18,
        true,
      ) +
      text(
        24,
        976,
        'Arrows: disposition and recovery paths. Redrive is not an automatic loop.',
        18,
      ) +
      text(
        24,
        1016,
        'This budget is an application policy, not a universal broker counter.',
        18,
        true,
      );
  return svg(
    'Dead Letter Channel: owned recovery path',
    flowDescription,
    compact ? 360 : 720,
    compact ? 1352 : 1072,
    drawing,
  );
}
function transfer(compact) {
  const drawing = compact
    ? text(24, 34, 'Transfer without losing the source', 21) +
      card(
        24,
        112,
        312,
        'One local SQLite transaction',
        'Insert the complete failure record.',
        true,
        208,
      ) +
      text(40, 222, 'Delete the matching pending row.', 17, true) +
      text(40, 270, 'Commit both changes together.', 17, true) +
      arrow('M180 320V360H12V496H46') +
      arrow('M12 496V760H46') +
      card(48, 416, 288, 'Destination accepts', 'Commit: pending 0 / dead 1', true, 160) +
      text(64, 532, 'E901 remains available for recovery.', 15, true) +
      card(
        48,
        672,
        288,
        'Full channel or write error',
        'Rollback: pending row retained',
        false,
        176,
      ) +
      text(64, 788, 'No silent deletion.', 18, true) +
      text(64, 828, 'Raise the failure to the caller.', 16, true) +
      card(24, 960, 312, 'Outside this simulation', 'Broker-to-store transfer', false, 192, true) +
      text(40, 1070, 'needs its own safety contract.', 17, true) +
      text(40, 1112, 'Earlier business effects may exist.', 16, true) +
      text(24, 1232, 'Branches: alternative transaction outcomes.', 15, true)
    : text(24, 34, 'Keep source ownership until transfer is safe', 24) +
      rect(24, 112, 672, 192, true) +
      text(40, 150, 'One local SQLite transaction', 22) +
      text(40, 202, '1. Insert complete failure record', 18, true) +
      text(400, 202, '2. Delete pending row', 18, true) +
      text(
        40,
        252,
        'Preserve receipt ID, event ID, bytes, timing, and failure context.',
        19,
        true,
      ) +
      arrow('M360 304V352H180V414') +
      arrow('M360 352H540V414') +
      card(24, 416, 312, 'Destination accepts', 'Commit: pending 0 / dead 1', true, 176) +
      text(40, 536, 'E901 remains recoverable.', 18, true) +
      card(
        384,
        416,
        312,
        'Full channel or write error',
        'Rollback: pending row retained',
        false,
        176,
      ) +
      text(400, 536, 'No silent deletion; raise failure.', 17, true) +
      card(
        24,
        704,
        672,
        'Outside this simulation: broker-to-store transfer',
        'A real remote handoff needs its own documented safety contract.',
        false,
        176,
        true,
      ) +
      text(40, 824, 'Moving a message cannot undo an earlier business effect.', 20, true) +
      text(
        24,
        968,
        'Arrows: alternative outcomes of one local transaction, not broker guarantees.',
        17,
      );
  return svg(
    'Dead Letter Channel: safe local handoff',
    transferDescription,
    compact ? 360 : 720,
    compact ? 1288 : 1024,
    drawing,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['data-engineering/dead-letter-queues', flow],
  ['software-engineering/dead-letter-channel-transfer', transfer],
])
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`,
      content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[filename] = { width: +width, height: +height };
  }
const manifest = resolve(root, 'content/assets/manifest.json');
await writeFile(
  manifest,
  JSON.stringify({ ...JSON.parse(await readFile(manifest, 'utf8')), ...dimensions }, null, 2) +
    '\n',
);
console.log('Rebuilt the existing Dead Letter Channel asset and added three responsive assets.');
