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
  dispersion:
    'Four clients without jitter retry at elapsed times one, three, and seven seconds. Independent full-jitter draws spread their retry times within the same successive one, two, and four second waiting bounds. Request durations are omitted and the times are illustrative.',
  policy:
    'After an eligible failure, retry only when an attempt remains and the total budget permits the sampled wait. A first full-jitter window is zero through 100 milliseconds, then zero through 200, then zero through 400. Four total attempts permit at most three waits. Permanent failure, exhausted attempts, or exhausted budget ends the operation.',
};
const draws = [
  [0.2, 1.8, 3.9],
  [0.7, 1.1, 4.5],
  [0.1, 0.7, 2.7],
  [0.8, 1.7, 5.0],
];
function chart(y, jitter, phone) {
  const left = phone ? 60 : 100,
    scale = phone ? 36 : 80,
    right = left + 7 * scale;
  let d = '';
  for (let i = 0; i < 4; i++) {
    const row = y + i * 56;
    d += text(phone ? 24 : 40, row + 6, 'ABCD'[i], 18);
    d += `<path d="M${left} ${row}H${right}" fill="none" stroke="#a6aca3" stroke-width="1.2"/>`;
    for (const value of jitter ? draws[i] : [1, 3, 7])
      d += `<rect x="${left + value * scale - 3}" y="${row - 3}" width="6" height="6" fill="${jitter ? '#00855b' : '#252c28'}"/>`;
  }
  for (const tick of [0, 1, 3, 7]) d += text(left + tick * scale, y + 216, String(tick), 17, true);
  return d;
}
function dispersion(phone) {
  let d = text(
    24,
    34,
    phone ? 'Spread the retry starts' : 'Backoff slows retries; jitter spreads their timing',
    phone ? 22 : 24,
  );
  if (phone) {
    d += card(
      24,
      104,
      312,
      'Retry windows / 1 s, 2 s, 4 s',
      'Request durations are omitted.',
      true,
      112,
      true,
    );
    d += text(24, 264, 'Without jitter / same delays', 20) + chart(304, false, true);
    d += text(24, 608, 'Full jitter / independent draws', 20) + chart(648, true, true);
    d +=
      rect(24, 952, 312, 208, true) +
      text(40, 984, 'Squares mark retry starts.', 18) +
      text(40, 1028, 'Both axes: elapsed seconds.', 17, true) +
      text(40, 1072, 'Random starts can still coincide.', 17, true) +
      text(40, 1116, 'These are illustrative draws.', 17, true);
    d +=
      text(24, 1220, 'At the cap, keep randomizing the wait.', 16, true) +
      text(24, 1260, 'Do not replace jitter with a fixed delay.', 16, true);
    return svg('Retry timing with and without jitter', descriptions.dispersion, 360, 1304, d);
  }
  d += card(
    24,
    104,
    672,
    'Same retry windows: 1, 2, then 4 seconds',
    'All initial failures are at time zero; request durations are omitted.',
    true,
    104,
  );
  d += text(24, 264, 'Without jitter / same delays', 22) + chart(304, false, false);
  d += text(24, 608, 'Full jitter / independent draws', 22) + chart(648, true, false);
  d +=
    rect(24, 952, 672, 136, true) +
    text(40, 984, 'Squares mark retry starts; both axes show elapsed seconds.', 20) +
    text(40, 1026, 'Independent draws reduce alignment but can still coincide.', 17, true) +
    text(
      40,
      1064,
      'At the cap, keep drawing across the range rather than using a fixed delay.',
      17,
      true,
    );
  return svg(
    'Deterministic backoff versus independently jittered retries',
    descriptions.dispersion,
    720,
    1120,
    d,
  );
}
function policy(phone) {
  let d = text(
    24,
    34,
    phone ? 'Admit, then space retries' : 'Retry admission and retry timing are separate decisions',
    phone ? 22 : 24,
  );
  if (phone) {
    d +=
      rect(24, 104, 312, 224, true) +
      text(40, 134, 'Four attempts total', 20) +
      text(40, 178, 'Retry 1 / draw 0..100 ms', 17) +
      text(40, 222, 'Retry 2 / draw 0..200 ms', 17) +
      text(40, 266, 'Retry 3 / draw 0..400 ms', 17) +
      text(40, 306, 'No fourth retry.', 17, true);
    d += card(
      24,
      408,
      312,
      'Eligible and safe to repeat?',
      'Permanent or unsafe: stop.',
      false,
      112,
      true,
    );
    d += arrow('M180 520V590');
    d += card(
      24,
      592,
      312,
      'An attempt remains?',
      'Initial attempt plus three retries.',
      false,
      112,
      true,
    );
    d += arrow('M180 704V774');
    d += card(
      24,
      776,
      312,
      'Sample fits remaining budget?',
      'Equal to the remainder: stop.',
      false,
      112,
      true,
    );
    d += arrow('M180 888V958');
    d += card(
      24,
      960,
      312,
      'Wait, then recheck deadline',
      'Use the same operation budget.',
      true,
      128,
      true,
    );
    d +=
      rect(24, 1168, 312, 176) +
      text(40, 1198, 'Stop when any check fails.', 18) +
      text(40, 1242, 'No wait follows success', 17, true) +
      text(40, 1286, 'or the last allowed failure.', 17, true);
    d += text(24, 1404, 'Arrows: advance only if checks pass.', 16, true);
    return svg('Bounded admission before a jittered retry', descriptions.policy, 360, 1448, d);
  }
  d += text(24, 136, 'Before another attempt', 22) + text(400, 136, 'Example delay windows', 22);
  d += card(
    24,
    184,
    296,
    'Eligible and safe to repeat?',
    'Permanent or unsafe: stop.',
    false,
    128,
    true,
  );
  d += arrow('M172 312V406');
  d += card(
    24,
    408,
    296,
    'An attempt remains?',
    'Four total; at most three retries.',
    false,
    128,
    true,
  );
  d += arrow('M172 536V630');
  d += card(
    24,
    632,
    296,
    'Sample fits remaining budget?',
    'Equal to the remainder: stop.',
    false,
    128,
    true,
  );
  d +=
    rect(400, 184, 296, 576, true) +
    text(416, 220, 'Uniform integer milliseconds', 18) +
    text(416, 292, 'Retry 1 / 0..100 ms', 19) +
    text(416, 380, 'Retry 2 / 0..200 ms', 19) +
    text(416, 468, 'Retry 3 / 0..400 ms', 19) +
    text(416, 580, 'Initial attempt has no backoff.', 17, true) +
    text(416, 648, 'Delay cap: 400 ms.', 17, true) +
    text(416, 716, 'Total budget: 1,000 ms.', 17, true);
  d +=
    rect(24, 864, 672, 144, true) +
    text(40, 896, 'Wait, then recheck the same deadline before starting again', 20) +
    text(40, 942, 'Stop when any admission check fails.', 17, true) +
    text(40, 984, 'No wait follows success or the final allowed failure.', 17, true);
  d += text(
    24,
    1084,
    'Arrows: advance only if all checks pass. Spacing does not supply idempotency.',
    17,
    true,
  );
  return svg(
    'Bounded retry admission with capped jitter windows',
    descriptions.policy,
    720,
    1136,
    d,
  );
}
const dimensions = {};
for (const [name, draw] of [
  ['dispersion', dispersion],
  ['policy', policy],
])
  for (const phone of [false, true]) {
    const path =
      name === 'dispersion'
        ? `data-engineering/exponential-backoff-with-jitter${phone ? '-mobile' : ''}.svg`
        : `software-engineering/retry-backoff-jitter-policy${phone ? '-mobile' : ''}.svg`;
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
  'Updated the canonical timing figure, added its phone layout, and wrote the policy figure pair.',
);
