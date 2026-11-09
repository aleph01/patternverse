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
  scope:
    'After lock acquisition succeeds, control enters the protected body. Normal completion, an early return, or an exception all reach the same scope-exit release. Only after that release does the caller continue, receive the return value, or observe the exception. Failed acquisition does not enter the protected body.',
  inventory:
    'With five initial items, reserving two changes the protected state to three available and two reserved, then returns after release. A request for four raises before changing that state and still releases. Another caller can then reserve the remaining three and obtain zero available and five reserved. All displayed states preserve a total of five items.',
};
function scope(phone) {
  let d = text(
    24,
    34,
    phone ? 'Scope owns the release' : 'Acquire once; release on structured scope exit',
    phone ? 22 : 24,
  );
  if (phone) {
    d += card(
      24,
      112,
      312,
      'Acquire the shared lock',
      'Enter only after acquisition succeeds.',
      true,
      128,
      true,
    );
    d += arrow('M180 240V334');
    d += card(
      24,
      336,
      312,
      'Protected body',
      'Check and update the shared invariant.',
      false,
      152,
      true,
    );
    d += arrow('M180 488V606');
    d += rect(24, 608, 312, 200) + text(40, 640, 'Any structured exit', 20);
    d +=
      text(40, 684, 'Normal completion', 18) +
      text(40, 728, 'Early return', 18) +
      text(40, 772, 'Propagating exception', 18);
    d += arrow('M180 808V910');
    d += card(
      24,
      912,
      312,
      'Scope cleanup releases once',
      'Only this acquisition is being released.',
      true,
      144,
      true,
    );
    d +=
      text(24, 1132, 'Then the caller continues, gets a value,', 16, true) +
      text(24, 1166, 'or observes the exception.', 16, true);
    d += text(24, 1234, 'Failed entry never runs the body.', 17);
    d += text(24, 1290, 'Arrows: control flow, not data rollback.', 16, true);
  } else {
    d += card(
      24,
      112,
      672,
      'Acquire the shared lock',
      'The protected body starts only after acquisition succeeds.',
      true,
      112,
    );
    d += arrow('M360 224V318');
    d += card(
      24,
      320,
      672,
      'Protected body: one complete critical section',
      'State-dependent checks and updates use the same shared lock.',
      false,
      144,
    );
    d += arrow('M360 464V512H128V590') + arrow('M360 512V590') + arrow('M360 512H592V590');
    d += card(24, 592, 208, 'Normal completion', 'Fall through', false, 144, true);
    d += card(256, 592, 208, 'Early return', 'Return a value', false, 144, true);
    d += card(488, 592, 208, 'Exception', 'Propagate error', false, 144, true);
    d += arrow('M128 736V846') + arrow('M360 736V846') + arrow('M592 736V846');
    d += card(
      24,
      848,
      672,
      'One shared cleanup boundary releases this acquisition',
      'One selected exit path, one release; cleanup does not undo changed data.',
      true,
      144,
    );
    d += arrow('M360 992V1070');
    d += text(24, 1118, 'Continue, deliver the return value, or propagate the exception.', 21);
    d += text(
      24,
      1170,
      'Arrows: control flow after successful entry. Process termination is excluded.',
      17,
      true,
    );
  }
  return svg(
    'Scoped Locking: acquisition and all structured exits',
    descriptions.scope,
    phone ? 360 : 720,
    phone ? 1336 : 1216,
    d,
  );
}
function inventory(phone) {
  let d = text(
    24,
    34,
    phone
      ? 'Release on success and rejection'
      : 'One inventory lock, three calls, no missed release',
    phone ? 21 : 24,
  );
  const rows = [
    [
      'Call 1 / reserve 2',
      '(5, 0)',
      '(3, 2)',
      'Return the new state after release.',
      'Check and publication are protected.',
    ],
    [
      'Call 2 / reserve 4',
      '(3, 2)',
      '(3, 2)',
      'Reject before changing the state.',
      'Release, then propagate ValueError.',
    ],
    [
      'Call 3 / reserve 3',
      '(3, 2)',
      '(0, 5)',
      'A later caller acquires the same lock.',
      'Release, then deliver the new state.',
    ],
  ];
  d += text(24, 88, 'Pairs: (available, reserved) item counts', phone ? 16 : 18, true);
  for (const [i, row] of rows.entries()) {
    if (phone) {
      const y = 128 + i * 344;
      d += rect(24, y, 312, 264, i === 1) + text(40, y + 34, row[0], 20);
      d += text(40, y + 80, 'before', 16, true) + text(208, y + 80, 'after', 16, true);
      d += rect(40, y + 96, 112, 72, false, true) + rect(208, y + 96, 112, 72, false, true);
      d += text(56, y + 144, row[1], 24) + text(224, y + 144, row[2], 24);
      d += arrow(`M152 ${y + 132}H206`);
      d += text(40, y + 216, row[3], 16, true) + text(40, y + 248, row[4], 16, true);
    } else {
      const y = 128 + i * 336;
      d +=
        rect(24, y, 672, 224, i === 1) + text(40, y + 32, row[0] + ' — under the shared lock', 21);
      d += text(48, y + 72, 'before', 17, true) + text(432, y + 72, 'after', 17, true);
      d += rect(48, y + 88, 240, 64, false, true) + rect(432, y + 88, 240, 64, false, true);
      d += text(64, y + 132, row[1], 25) + text(448, y + 132, row[2], 25);
      d += arrow(`M288 ${y + 120}H430`);
      d += text(40, y + 192, row[3] + ' ' + row[4], 17, true);
    }
  }
  if (phone) {
    d +=
      text(24, 1240, 'Invariant: both counts stay nonnegative;', 16, true) +
      text(24, 1274, 'their sum stays five.', 16, true);
    d += text(24, 1330, 'Arrows: the protected operation.', 16, true);
    d += text(24, 1372, 'Rejection is checked before mutation.', 16, true);
  } else {
    d += text(24, 1160, 'Invariant: nonnegative counts with a constant total of five items.', 20);
    d += text(
      24,
      1208,
      'Arrows: the protected operation. Equal pairs mean no state change.',
      17,
      true,
    );
  }
  return svg(
    'Scoped Locking: inventory return and rejection',
    descriptions.inventory,
    phone ? 360 : 720,
    phone ? 1416 : 1256,
    d,
  );
}
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, build] of [
  ['scope', scope],
  ['inventory', inventory],
])
  for (const phone of [false, true]) {
    const key = `software-engineering/scoped-locking-${name}${phone ? '-mobile' : ''}.svg`;
    const source = build(phone);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    await writeFile(resolve(assets, key), source);
    manifest[key] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Generated Scoped Locking: two native figures with separately composed phone variants.',
);
