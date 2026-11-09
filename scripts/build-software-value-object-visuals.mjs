import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets/software-engineering');
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

const equalityDescription =
  'Two separately constructed StayDates instances both contain check-in 2026-10-29 and checkout 2026-11-01. They represent equal three-night values even though they are different runtime objects.';
const replacementDescription =
  'Before a change, booked and proposed refer to the same stay value, 2026-10-29 to 2026-11-01. After proposed is assigned the result of shifted(2), booked still refers to the original dates while proposed refers to 2026-10-31 to 2026-11-03.';
function stay(x, y, width, start, end, accent = false) {
  return (
    rect(x, y, width, 112, accent) +
    text(x + 16, y + 30, start, 20) +
    text(x + 16, y + 60, end, 20) +
    text(x + 16, y + 94, '3 calendar nights', 17, true)
  );
}
function equality(compact) {
  const drawing = compact
    ? text(24, 32, 'Equivalent dates,', 22) +
      text(24, 60, 'equal values', 22) +
      text(24, 116, 'StayDates · instance A', 20) +
      stay(24, 138, 312, 'Check-in: 2026-10-29', 'Checkout: 2026-11-01', true) +
      text(24, 312, 'StayDates · instance B', 20) +
      stay(24, 334, 312, 'Check-in: 2026-10-29', 'Checkout: 2026-11-01', true) +
      text(24, 506, 'Equal value: True', 21) +
      text(24, 544, 'Same runtime object: False', 19) +
      text(24, 606, 'Check-in included; checkout excluded.', 17) +
      text(24, 646, 'No separate business identifier', 17, true) +
      text(24, 674, 'takes part in value equality.', 17, true)
    : text(24, 34, 'Equality follows meaning, not the runtime instance', 24) +
      text(24, 110, 'StayDates · instance A', 21) +
      text(412, 110, 'StayDates · instance B', 21) +
      stay(24, 132, 284, 'Check-in: 2026-10-29', 'Checkout: 2026-11-01', true) +
      stay(412, 132, 284, 'Check-in: 2026-10-29', 'Checkout: 2026-11-01', true) +
      text(350, 198, '=', 28) +
      text(24, 310, 'Equal value: True · same runtime object: False', 21) +
      text(24, 358, 'Check-in included; checkout excluded. Both values describe 3 nights.', 18) +
      text(24, 400, 'The complete type and both dates determine equality.', 17, true);
  return svg(
    'Equivalent stay dates in distinct runtime objects',
    equalityDescription,
    compact ? 360 : 720,
    compact ? 714 : 440,
    drawing,
  );
}
const reference = (d) =>
  `<path d="${d}" fill="none" stroke="#626962" stroke-width="1.3" marker-end="url(#wiring)"/>`;
function owner(x, y, width, label) {
  return rect(x, y, width, 52) + text(x + 16, y + 33, label, 20);
}
function compactStay(y, shifted) {
  return card(
    44,
    y,
    272,
    shifted ? '2026-10-31 / 2026-11-03' : '2026-10-29 / 2026-11-01',
    '3 calendar nights',
    shifted,
    76,
    true,
  );
}
function replacement(compact) {
  const drawing = compact
    ? text(24, 32, 'Replace a reference;', 22) +
      text(24, 60, 'leave the old value intact', 22) +
      rect(24, 104, 312, 292, false, true) +
      text(40, 138, 'Before · one shared value', 20) +
      owner(44, 166, 272, 'booked + proposed') +
      reference('M180 218V270') +
      compactStay(272, false) +
      text(44, 426, 'proposed = proposed.shifted(2)', 17) +
      rect(24, 446, 312, 468, false, true) +
      text(40, 480, 'After · replace proposed', 20) +
      owner(44, 506, 272, 'booked') +
      reference('M180 558V592') +
      compactStay(594, false) +
      owner(44, 720, 272, 'proposed') +
      arrow('M180 772V806') +
      compactStay(808, true) +
      text(24, 964, 'Arrows are held references.', 18) +
      text(24, 998, 'The original dates never change.', 17, true)
    : text(24, 34, 'A replacement changes one owner’s reference', 24) +
      rect(24, 102, 672, 246, false, true) +
      text(44, 138, 'Before · both variables refer to one value', 21) +
      owner(44, 174, 180, 'booked') +
      owner(44, 266, 180, 'proposed') +
      stay(372, 198, 304, 'Check-in: 2026-10-29', 'Checkout: 2026-11-01') +
      reference('M224 200H370') +
      reference('M224 292H370') +
      rect(24, 404, 672, 364, false, true) +
      text(44, 440, 'After · proposed = proposed.shifted(2)', 21) +
      owner(44, 494, 180, 'booked') +
      stay(372, 470, 304, 'Check-in: 2026-10-29', 'Checkout: 2026-11-01') +
      reference('M224 520H370') +
      owner(44, 648, 180, 'proposed') +
      stay(372, 624, 304, 'Check-in: 2026-10-31', 'Checkout: 2026-11-03', true) +
      arrow('M224 674H370') +
      text(24, 822, 'Arrows show references, not mutation of a shared value.', 19) +
      text(24, 860, 'booked keeps the old dates; proposed receives the new value.', 18);
  return svg(
    'Immutable replacement without aliasing changes',
    replacementDescription,
    compact ? 360 : 720,
    compact ? 1036 : 900,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['value-object-equality', equality],
  ['value-object-replacement', replacement],
]) {
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`;
    const content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[`software-engineering/${filename}`] = {
      width: Number(width),
      height: Number(height),
    };
  }
}
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await writeFile(manifestPath, JSON.stringify({ ...manifest, ...dimensions }, null, 2) + '\n');
console.log(
  'Built Value Object equality and immutable replacement figures with separate phone layouts.',
);
