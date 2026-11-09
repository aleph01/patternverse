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
const article = await readFile(resolve(root, 'content/patterns/branch-by-abstraction.md'), 'utf8');
const figures = [...article.matchAll(/!\[(.*?)\]\(\.\.\/assets\/(.*?)\.svg "/g)].map((m) => [
  m[2],
  m[1],
]);
if (figures.length !== 2) throw new Error('Expected two Branch by Abstraction figures.');
function seam(phone) {
  let d = text(
    24,
    36,
    phone ? 'Change the supplier' : 'Keep callers behind one application-owned seam',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 76, 'During migration · per instance', 18, true);
    d +=
      rect(24, 108, 312, 104) +
      text(40, 146, 'Checkout + basket preview', 20) +
      text(40, 184, 'Call quote_cents(weight_g)', 18);
    d += arrow('M72 212V268') + text(96, 248, 'Application call', 18, true);
    d +=
      rect(24, 272, 312, 104, true) +
      text(40, 310, 'Rates contract', 22) +
      text(40, 348, 'Positive grams → US cents', 18);
    d += arrow('M72 376V432') + text(96, 412, 'One configured choice', 18, true);
    d +=
      rect(24, 436, 312, 104) +
      text(40, 474, 'Legacy adapter', 22) +
      text(40, 512, 'Wraps vendor library', 18, true);
    d += text(40, 580, 'OR', 20, true);
    d +=
      rect(24, 612, 312, 104, true) +
      text(40, 650, 'New rate engine', 22) +
      text(40, 688, 'Same caller contract', 18, true);
    d +=
      text(24, 766, 'Shared checks cover both paths.', 18) +
      text(24, 806, 'Do not run both per request.', 18, true);
  } else {
    d += text(
      24,
      80,
      'During migration · one selected implementation per application instance',
      18,
      true,
    );
    d +=
      rect(24, 112, 312, 88) +
      text(40, 148, 'Checkout', 22) +
      text(40, 184, 'Call quote_cents(weight_g)', 18);
    d +=
      rect(384, 112, 312, 88) +
      text(400, 148, 'Basket preview', 22) +
      text(400, 184, 'Call quote_cents(weight_g)', 18);
    d += arrow('M180 200V260') + arrow('M540 200V260');
    d += text(264, 236, 'Application calls', 18, true);
    d +=
      rect(24, 264, 672, 104, true) +
      text(40, 302, 'Rates · application-owned contract', 22) +
      text(40, 342, 'Positive integer grams in; integer US cents out; specified errors.', 18);
    d +=
      arrow('M180 368V456') +
      arrow('M540 368V456') +
      text(218, 414, 'Select one implementation', 19, true);
    d +=
      rect(24, 460, 312, 104) +
      text(40, 498, 'Legacy adapter', 22) +
      text(40, 536, 'Wraps the vendor library', 18, true);
    d +=
      rect(384, 460, 312, 104, true) +
      text(400, 498, 'New rate engine', 22) +
      text(400, 536, 'Implements the same contract', 18, true);
    d += text(24, 612, 'Shared behavioral checks exercise both implementations independently.', 19);
  }
  return svg(
    'One boundary, two implementations during migration',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 844 : 652,
    d,
  );
}
function lifecycle(phone) {
  let d = text(
    24,
    36,
    phone ? 'Keep each stage releasable' : 'Replace in stages that remain releasable',
    phone ? 22 : 24,
  );
  const stages = phone
    ? [
        ['1 Introduce the seam', 'Old implementation active', 'Move direct calls behind Rates'],
        ['2 Build alongside', 'Old active; new under test', 'Check both against the contract'],
        ['3 Switch deliberately', 'New implementation active', 'Observe behavior and failures'],
        [
          '4 Retire the old path',
          'Old uses + obligations closed',
          'Remove adapter, library, switch',
        ],
      ]
    : [
        [
          '1 Introduce the seam',
          'Keep the old implementation active.',
          'Move direct calls behind the application contract.',
        ],
        [
          '2 Build alongside',
          'Old remains active; develop and verify the new implementation.',
          'Run shared contract checks and supplier-specific tests.',
        ],
        [
          '3 Switch deliberately',
          'Select the new implementation for a safe unit of work.',
          'Observe real behavior; recovery depends on state compatibility.',
        ],
        [
          '4 Retire the old path',
          'Confirm remaining uses and recovery obligations are closed.',
          'Remove the old supplier, adapter, and transition controls.',
        ],
      ];
  for (let i = 0; i < stages.length; i++) {
    const y = phone ? 88 + i * 200 : 100 + i * 176;
    d += rect(24, y, phone ? 312 : 672, phone ? 144 : 128, i === 2);
    d +=
      text(40, y + 38, stages[i][0], 22) +
      text(40, y + 80, stages[i][1], phone ? 18 : 19) +
      text(40, y + 116, stages[i][2], phone ? 17 : 18, true);
    if (i < 3)
      d +=
        arrow(`M72 ${y + (phone ? 144 : 128)}V${y + (phone ? 196 : 172)}`) +
        text(
          96,
          y + (phone ? 180 : 160),
          ['Preserve behavior', 'Compatibility evidence', 'Retirement evidence'][i],
          18,
          true,
        );
  }
  d += text(
    24,
    phone ? 880 : 804,
    phone
      ? 'New working ≠ old unused.'
      : 'A working replacement does not establish that the old path is unused.',
    phone ? 18 : 19,
  );
  return svg(
    'A staged replacement with an explicit retirement gate',
    figures[1][1],
    phone ? 360 : 720,
    phone ? 920 : 844,
    d,
  );
}
const manifestPath = resolve(assets, 'manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [i, draw] of [seam, lifecycle].entries())
  for (const phone of [false, true]) {
    const relative = figures[i][0] + (phone ? '-mobile' : '') + '.svg',
      source = draw(phone);
    await mkdir(resolve(assets, relative, '..'), { recursive: true });
    await writeFile(resolve(assets, relative), source);
    const [, w, h] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: +w, height: +h };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Two editable mechanism figures generated with separate phone layouts.');
