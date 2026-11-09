import { readFile, writeFile } from 'node:fs/promises';
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
const items = JSON.parse(
  await readFile(resolve(root, '.local/software-remaining/articles.json'), 'utf8'),
);
const rows = {
  'audit-logging': [
    ['Trusted operation', 'Authenticated actor + request ID', 'Choose the capture guarantee'],
    ['One local transaction', 'Balance update + audit insertion', 'One shared commit boundary'],
    [
      'Commit or roll back',
      'Both changes persist, or neither',
      'Failed attempts need another path',
    ],
    [
      'Protected collection',
      'Ship committed evidence separately',
      'Delivery is not the local commit',
    ],
  ],
  'humble-object': [
    ['GUI adapter reads', 'Read the weight field as text', 'Framework owns controls'],
    ['Testable decision', 'Validate grams; calculate tariff', 'No GUI dependency'],
    ['Explicit result', 'Return the complete display label', 'Rules tested with ordinary values'],
    [
      'GUI adapter writes',
      'Apply the label to the right control',
      'Real binding still needs a check',
    ],
  ],
  'parameterized-test': [
    ['Named case data', 'Inputs + independent expectations', 'Boundary names explain failures'],
    [
      'Fresh invocation state',
      'Arrange and run the same test shape',
      'Do not share mutable state by accident',
    ],
    [
      'Compare this row',
      'Actual value versus expected value',
      'Same production formula is no oracle',
    ],
    ['Identify the result', 'Report case name and parameters', 'Subtests are not separate methods'],
  ],
  'golden-master-approval-testing': [
    [
      'Fixed scenario',
      'Produce a reproducible observation',
      'Normalize only justified differences',
    ],
    ['Compare to approved', 'Read the reviewed baseline', 'Normal tests do not change it'],
    ['Match or mismatch', 'Match: pass; mismatch: fail + diff', 'Write received output separately'],
    [
      'Review a difference',
      'Keep or deliberately replace baseline',
      'Review is a separate operation',
    ],
  ],
  'ml-shadow-deployment': [
    [
      'Live path retains authority',
      'Incumbent answers every user',
      'Only selected copies leave this path',
    ],
    [
      'Isolated shadow work',
      'Bound admission, queue and workers',
      'No production-effect authority',
    ],
    [
      'Attributed evidence',
      'Request ID + snapshots + versions',
      'Count misses and incomplete labels',
    ],
    ['Compare matched cases', 'Use timely pairs and labeled pairs', 'No candidate user responses'],
  ],
};
const labels = {
  'audit-logging': ['Execute', 'Both or neither', 'Separate delivery'],
  'humble-object': ['Delegate input', 'Return decision', 'Apply result'],
  'parameterized-test': ['For each named case', 'Assert this outcome', 'Report this case'],
  'golden-master-approval-testing': ['Observe', 'Compare', 'For a mismatch'],
  'ml-shadow-deployment': ['Selected copies only', 'Capture outcomes', 'Join by identity'],
};
const manifestPath = resolve(assets, 'manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const a of items) {
  const md = await readFile(resolve(root, 'content/patterns/' + a.id + '.md'), 'utf8'),
    alt = md.match(/!\[(.*?)\]\(\.\.\/assets\//)[1];
  for (const phone of [false, true]) {
    const heading =
      a.asset === 'golden-master-approval-testing' ? 'Observe, compare, review' : a.title;
    let d =
      text(24, 36, heading, phone ? 22 : 24) +
      text(24, 80, 'Execution boundaries and evidence', phone ? 17 : 19, true);
    rows[a.id].forEach((row, i) => {
      const y = 112 + i * (phone ? 196 : 172);
      d +=
        rect(24, y, phone ? 312 : 672, phone ? 140 : 120, i === 1) +
        text(40, y + 36, row[0], phone ? 20 : 22) +
        text(40, y + 76, row[1], phone ? 16 : 20) +
        text(40, y + 112, row[2], phone ? 15 : 18, true);
      if (i < 3)
        d +=
          arrow(`M72 ${y + (phone ? 140 : 120)}V${y + (phone ? 192 : 168)}`) +
          text(96, y + (phone ? 176 : 154), labels[a.id][i], 17, true);
    });
    const relative = 'software-engineering/' + a.asset + (phone ? '-mobile' : '') + '.svg',
      source = svg(heading, alt, phone ? 360 : 720, phone ? 884 : 800, d);
    await writeFile(resolve(assets, relative), source);
    manifest[relative] = { width: phone ? 360 : 720, height: phone ? 884 : 800 };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
