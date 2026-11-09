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
  ownership:
    'One scope owns a temporary directory, then an open file in that directory, then a gzip decoder that borrows that file. Acquisitions are registered as they succeed. On exit, the decoder closes before the file, and the file closes before the directory is removed. A returned byte value is independent of all three resources.',
  failure:
    'On a successful read or body exception, cleanup closes the decoder, closes the raw file, and removes the directory. If opening the raw file fails, cleanup removes only the already-owned directory; no file or decoder exit is registered. A resource whose own entry fails remains responsible for its internal partial acquisition.',
};
function ownership(phone) {
  let d = text(
    24,
    34,
    phone ? 'Scope owns cleanup' : 'Acquire in dependency order; release in reverse',
    phone ? 22 : 24,
  );
  if (phone) {
    d += card(
      24,
      112,
      312,
      'One explicit ownership stack',
      'Register each successful entry.',
      true,
      128,
      true,
    );
    d += rect(24, 336, 312, 200) + text(40, 368, 'Acquire + register', 20);
    d +=
      text(40, 412, '1 / create temporary directory', 17) +
      text(40, 456, '2 / open the raw file inside it', 17) +
      text(40, 500, '3 / decoder borrows that file', 17);
    d += arrow('M180 536V606');
    d += card(
      24,
      608,
      312,
      'Scope ends',
      'Return, early exit, or body exception.',
      false,
      144,
      true,
    );
    d += arrow('M180 752V830');
    d += rect(24, 832, 312, 200, true) + text(40, 864, 'Release registered contexts', 19);
    d +=
      text(40, 908, '3 / close the decoder', 18) +
      text(40, 952, '2 / close the raw file', 18) +
      text(40, 996, '1 / remove the directory', 18);
    d += text(24, 1120, 'The decoder does not close the raw file.', 16, true);
    d += text(24, 1170, 'Only detached bytes are returned.', 17);
    d += text(24, 1230, 'Arrows: control reaches cleanup.', 16, true);
    d += text(24, 1274, 'Numbers identify acquisition order.', 16, true);
  } else {
    d += card(
      24,
      112,
      672,
      'One scope owns directory, raw file, and decoder lifetimes',
      'The decoder borrows the raw file; it does not own that file’s close.',
      true,
      112,
    );
    d += text(24, 296, 'Acquire + register', 21) + text(400, 296, 'Release on scope exit', 21);
    const entries = [
      ['1 / directory', 'Create the workspace', '3 / decoder', 'Close wrapper; raw stays open'],
      [
        '2 / raw file',
        'Open archive inside directory',
        '2 / raw file',
        'Close the owned file handle',
      ],
      ['3 / decoder', 'Borrows the raw file', '1 / directory', 'Remove workspace contents'],
    ];
    for (const [i, r] of entries.entries()) {
      const y = 336 + i * 240;
      d +=
        card(24, y, 296, r[0], r[1], false, 144, true) +
        card(400, y, 296, r[2], r[3], true, 144, true);
      if (i < 2) d += arrow(`M172 ${y + 144}V${y + 238}`) + arrow(`M548 ${y + 144}V${y + 238}`);
    }
    d += card(
      24,
      1072,
      672,
      'Return detached bytes; no live reader escapes this scope',
      'Acquisition arrows show setup. Release arrows show reverse-order cleanup.',
      false,
      128,
    );
  }
  return svg(
    'Scoped Resource Management: dependency-aware ownership',
    descriptions.ownership,
    phone ? 360 : 720,
    phone ? 1320 : 1240,
    d,
  );
}
function failure(phone) {
  let d = text(
    24,
    34,
    phone ? 'Unwind only what is owned' : 'Partial setup changes which resources need cleanup',
    phone ? 22 : 24,
  );
  if (phone) {
    d += rect(24, 112, 312, 280, true) + text(40, 144, 'All three contexts entered', 20);
    d += text(40, 188, 'Success or body exception:', 17, true);
    d +=
      text(40, 232, '1 / close decoder', 18) +
      text(40, 276, '2 / close raw file', 18) +
      text(40, 320, '3 / remove directory', 18);
    d += text(40, 364, 'This is reverse acquisition order.', 16, true);
    d += rect(24, 488, 312, 280) + text(40, 520, 'Opening the raw file fails', 20);
    d += text(40, 564, 'Only the directory context entered.', 16, true);
    d += text(40, 608, 'Remove that directory and contents.', 16);
    d += text(40, 652, 'No raw-reader exit was registered.', 16, true);
    d += text(40, 696, 'No decoder was constructed.', 16, true);
    d += text(40, 740, 'Propagate the open error after cleanup.', 15, true);
    d += rect(24, 864, 312, 232, true) + text(40, 896, 'If cleanup itself raises', 20);
    d += text(40, 940, 'Attempt the remaining registered exits.', 15, true);
    d +=
      text(40, 984, 'The outcome may change; inspect', 16, true) +
      text(40, 1018, 'the exception and its chained context.', 16, true);
    d += text(40, 1062, 'Attempted release is not proof of success.', 14, true);
    d += text(24, 1180, 'No exit callback for a failed entry.', 17);
    d +=
      text(24, 1228, 'An entry routine must clean up its own', 16, true) +
      text(24, 1262, 'internal partial allocation if it fails.', 16, true);
    d += text(24, 1322, 'Numbered lines give cleanup order.', 16, true);
  } else {
    d += text(24, 128, 'All entries succeed', 21) + text(400, 128, 'Raw file open fails', 21);
    d += card(
      24,
      176,
      296,
      'Directory + file + decoder',
      'Three registered exit handlers',
      true,
      128,
      true,
    );
    d += card(
      400,
      176,
      296,
      'Directory context entered',
      'Opening raw file raises an error',
      false,
      128,
      true,
    );
    d += arrow('M172 304V398') + arrow('M548 304V398');
    d += card(24, 400, 296, 'Close decoder', 'Dependent stops using the file.', true, 112, true);
    d += arrow('M172 512V606');
    d += card(24, 608, 296, 'Close raw file', 'Release its owned handle.', true, 112, true);
    d += arrow('M172 720V814');
    d += card(
      24,
      816,
      296,
      'Remove directory',
      'Remove owned workspace contents.',
      true,
      112,
      true,
    );
    d += rect(400, 400, 296, 224) + text(416, 432, 'Remove directory', 20);
    d +=
      text(416, 478, 'Clean only the owned prefix.', 16, true) +
      text(416, 524, 'No raw-reader exit registered.', 16, true) +
      text(416, 570, 'No decoder constructed.', 16, true);
    d +=
      text(400, 720, 'The open error leaves the scope', 16, true) +
      text(400, 756, 'after directory cleanup succeeds.', 16, true);
    d += card(
      24,
      1072,
      672,
      'A cleanup failure can change the outcome that reaches the caller',
      'ExitStack still attempts remaining registered exits; release may itself fail.',
      false,
      144,
    );
    d += text(
      24,
      1272,
      'Arrows: scope-exit cleanup. An entry routine owns its internal failure cleanup.',
      17,
      true,
    );
  }
  return svg(
    'Scoped Resource Management: partial acquisition and failure',
    descriptions.failure,
    phone ? 360 : 720,
    phone ? 1368 : 1312,
    d,
  );
}
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, build] of [
  ['ownership', ownership],
  ['failure', failure],
])
  for (const phone of [false, true]) {
    const key = `software-engineering/scoped-resource-management-${name}${phone ? '-mobile' : ''}.svg`;
    const source = build(phone);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    await writeFile(resolve(assets, key), source);
    manifest[key] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Generated Scoped Resource Management: two native figures and separate phone compositions.',
);
