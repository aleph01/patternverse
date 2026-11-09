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
const article = await readFile(resolve(root, 'content/patterns/feature-toggle.md'), 'utf8');
const figures = [...article.matchAll(/!\[(.*?)\]\(\.\.\/assets\/(.*?)\.svg "/g)].map((m) => [
  m[2],
  m[1],
]);
if (figures.length !== 2) throw new Error('Expected two Feature Toggle figures.');
function decision(phone) {
  let d = text(
    24,
    36,
    phone ? 'Decide once for this request' : 'Separate policy evaluation from behavior selection',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 76, 'Receipt rollout · original example', 18, true);
    d +=
      rect(24, 108, 312, 140) +
      text(40, 146, 'Account: acct-42', 22) +
      text(40, 184, 'Policy v1: expose to 20%', 18) +
      text(40, 222, 'Trusted key + one snapshot', 18, true);
    d += arrow('M72 248V304') + text(96, 284, 'Evaluate once', 18, true);
    d +=
      rect(24, 308, 312, 140, true) +
      text(40, 346, 'Evaluator', 22) +
      text(40, 386, 'Bucket 12 < 20 → enabled', 18) +
      text(40, 426, 'Revision v1 · reason: rollout', 17, true);
    d += arrow('M72 448V504') + text(96, 484, 'Keep request decision', 18, true);
    d +=
      rect(24, 508, 312, 104) +
      text(40, 546, 'Toggle point', 22) +
      text(40, 584, 'Renderer selects one path', 18);
    d += arrow('M72 612V652') + text(96, 648, 'Select one alternative', 18, true);
    d +=
      rect(24, 656, 312, 308, false, true) +
      rect(40, 676, 280, 100) +
      text(56, 714, 'False: standard receipt', 20) +
      text(56, 752, 'Existing layout', 18, true);
    d += text(56, 812, 'OR', 20, true);
    d +=
      rect(40, 844, 280, 100, true) +
      text(56, 882, 'True: detailed receipt', 20) +
      text(56, 920, 'New layout', 18, true);
    d +=
      text(24, 998, 'Only the selected path runs.', 18) +
      text(24, 1038, 'Authorization stays separate.', 18, true);
  } else {
    d += text(
      24,
      80,
      'Receipt rollout · one configuration snapshot and a trusted account key',
      18,
      true,
    );
    d +=
      rect(24, 112, 312, 104) +
      text(40, 150, 'Request context', 22) +
      text(40, 190, 'Account: acct-42', 19);
    d +=
      rect(384, 112, 312, 104) +
      text(400, 150, 'Policy snapshot v1', 22) +
      text(400, 190, 'Expose to 20%', 19);
    d +=
      arrow('M180 216V284') +
      arrow('M540 216V284') +
      text(40, 256, 'Context', 18, true) +
      text(400, 256, 'Configuration', 18, true);
    d +=
      rect(24, 288, 672, 104, true) +
      text(40, 326, 'Evaluator: stable bucket 12 < 20 → enabled', 22) +
      text(40, 366, 'Return a Boolean decision with revision v1 and reason: rollout.', 18);
    d += arrow('M72 392V460') + text(96, 432, 'One decision retained for this request', 18, true);
    d +=
      rect(24, 464, 672, 104) +
      text(40, 502, 'Toggle point: receipt renderer', 22) +
      text(40, 542, 'Accept the decision; keep targeting policy outside the renderer.', 18);
    d +=
      arrow('M180 568V652') +
      arrow('M540 568V652') +
      text(58, 612, 'False', 18, true) +
      text(594, 612, 'True', 18, true) +
      text(246, 612, 'Choose one path', 18, true);
    d +=
      rect(24, 656, 312, 104) +
      text(40, 694, 'Standard receipt', 22) +
      text(40, 734, 'Existing layout', 18, true);
    d +=
      rect(384, 656, 312, 104, true) +
      text(400, 694, 'Detailed receipt', 22) +
      text(400, 734, 'New layout', 18, true);
    d += text(24, 808, 'Only the selected renderer runs; authorization stays separate.', 19);
  }
  return svg(
    'One evaluated policy decision selects a receipt path',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 1076 : 848,
    d,
  );
}
function retirement(phone) {
  let d = text(
    24,
    36,
    phone ? 'A release flag needs an exit' : 'Expose gradually, then retire the temporary flag',
    phone ? 22 : 24,
  );
  const rows = phone
    ? [
        ['1 Deployed, off', 'Both paths are in the build', 'Standard layout remains active'],
        ['2 Limited exposure', 'A stable cohort sees the change', 'Observe errors and outcomes'],
        ['3 Full exposure', 'New layout serves all targets', 'Keep the recovery window explicit'],
        ['4 Retirement gate', 'Recovery obligations closed', 'Remove old path, checks, config'],
      ]
    : [
        [
          '1 Deployed, off',
          'The release contains both rendering paths.',
          'Users still receive the standard layout.',
        ],
        [
          '2 Limited exposure',
          'A stable target cohort receives the detailed layout.',
          'Observe variant exposure, errors, and outcomes.',
        ],
        [
          '3 Full exposure',
          'All intended targets receive the detailed layout.',
          'Retain the flag only while recovery obligations require it.',
        ],
        [
          '4 Retirement gate',
          'Owner confirms the old path is no longer needed.',
          'Remove the old path, toggle checks, and flag configuration.',
        ],
      ];
  for (let i = 0; i < rows.length; i++) {
    const y = phone ? 88 + i * 200 : 100 + i * 176;
    d +=
      rect(24, y, phone ? 312 : 672, phone ? 144 : 128, i === 1 || i === 2) +
      text(40, y + 38, rows[i][0], 22) +
      text(40, y + 80, rows[i][1], phone ? 17 : 19) +
      text(40, y + 116, rows[i][2], phone ? 16 : 18, true);
    if (i < 3)
      d +=
        arrow(`M72 ${y + (phone ? 144 : 128)}V${y + (phone ? 196 : 172)}`) +
        text(
          96,
          y + (phone ? 180 : 160),
          ['Set exposure policy', 'Use rollout evidence', 'Review retirement evidence'][i],
          phone ? 17 : 18,
          true,
        );
  }
  d += text(
    24,
    phone ? 880 : 804,
    phone
      ? 'Full exposure ≠ flag removed.'
      : 'Full exposure does not remove the alternate code path.',
    phone ? 18 : 19,
  );
  return svg(
    'Temporary release exposure and evidence-gated retirement',
    figures[1][1],
    phone ? 360 : 720,
    phone ? 920 : 844,
    d,
  );
}
const manifestPath = resolve(assets, 'manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [i, draw] of [decision, retirement].entries())
  for (const phone of [false, true]) {
    const relative = figures[i][0] + (phone ? '-mobile' : '') + '.svg',
      source = draw(phone);
    await mkdir(resolve(assets, relative, '..'), { recursive: true });
    await writeFile(resolve(assets, relative), source);
    const [, w, h] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: +w, height: +h };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Feature decision and temporary release lifecycle figures generated with phone layouts.',
);
