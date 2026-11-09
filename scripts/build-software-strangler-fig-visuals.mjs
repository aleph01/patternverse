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
const article = await readFile(
  resolve(root, 'content/patterns/data-incremental-replacement.md'),
  'utf8',
);
const figures = [...article.matchAll(/!\[(.*?)\]\(\.\.\/assets\/(.*?)\.svg "/g)].map((m) => [
  m[2],
  m[1],
]);
if (figures.length !== 2) throw new Error('Expected two Strangler Fig figures.');
function routing(phone) {
  let d = text(
    24,
    36,
    phone ? 'Shift responsibility by slice' : 'Transfer one capability through a controlled seam',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 84, 'During the catalog migration', 19, true);
    d +=
      rect(24, 112, 312, 88) +
      text(40, 150, 'Clients', 22) +
      text(40, 182, 'Keep the same entry point', 18, true);
    d += arrow('M72 200V256') + text(96, 236, 'Request a capability', 18, true);
    d +=
      rect(24, 260, 312, 144, true) +
      text(40, 298, 'Routing seam', 22) +
      text(40, 338, 'invoices → legacy', 19) +
      text(40, 378, 'catalog → replacement', 19);
    d += text(24, 456, 'Invoice request selects:', 19, true);
    d +=
      rect(24, 480, 312, 104) +
      text(40, 518, 'Legacy system', 22) +
      text(40, 556, 'Owns invoice capability', 19);
    d += text(24, 640, 'Catalog request selects:', 19, true);
    d +=
      rect(24, 664, 312, 120, true) +
      text(40, 702, 'Replacement', 22) +
      text(40, 740, 'Owns catalog capability', 19) +
      text(40, 772, 'Errors stay on this path', 17, true);
    d +=
      text(24, 836, 'One selected handler per request.', 18) +
      text(24, 874, 'No automatic error fallback.', 18, true) +
      text(24, 926, 'Retire displaced paths deliberately.', 18, true);
  } else {
    d += text(24, 84, 'During migration: catalog has moved; invoices have not.', 19, true);
    d +=
      rect(24, 116, 672, 88) +
      text(40, 152, 'Clients', 22) +
      text(40, 186, 'Stable entry point and public operation contracts', 19, true);
    d += arrow('M360 204V280') + text(384, 250, 'requests', 18, true);
    d +=
      rect(24, 284, 672, 112, true) +
      text(40, 326, 'Controlled routing seam', 22) +
      text(40, 370, 'invoices → legacy · catalog → replacement', 20);
    d +=
      arrow('M180 396V472') +
      text(40, 440, 'invoices', 18, true) +
      arrow('M540 396V472') +
      text(564, 440, 'catalog', 18, true);
    d +=
      rect(24, 476, 312, 132) +
      text(40, 518, 'Legacy system', 22) +
      text(40, 558, 'Owns invoice capability', 19) +
      text(40, 594, 'Catalog path displaced', 18, true);
    d +=
      rect(384, 476, 312, 132, true) +
      text(400, 518, 'Replacement', 22) +
      text(400, 558, 'Owns catalog capability', 19) +
      text(400, 594, 'Errors stay on this path', 18, true);
    d +=
      text(24, 668, 'One handler per request; replacement failure does not select legacy.', 19) +
      text(
        24,
        712,
        'Retire old paths after dependency and recovery obligations are resolved.',
        18,
        true,
      );
  }
  return svg(
    'A stable seam directs capabilities to different implementations',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 968 : 752,
    d,
  );
}
function handover(phone) {
  let d = text(
    24,
    36,
    phone ? 'Move publishing authority' : 'Transfer publishing authority, not random events',
    phone ? 22 : 24,
  );
  const rows = [
    ['Stage 0', 'old', 'old', 'old'],
    ['Stage 1', 'new', 'old', 'old'],
    ['Stage 2', 'new', 'new', 'old'],
    ['Stage 3', 'new', 'new', 'new'],
  ];
  if (phone) {
    d += text(24, 84, 'Stateful cohort example; not the code.', 17, true);
    rows.forEach(([stage, a, b, c], i) => {
      const y = 112 + i * 176;
      d +=
        rect(24, y, 312, 144, i > 0) +
        text(40, y + 38, stage, 22) +
        text(40, y + 82, `A: ${a} · B: ${b} · C: ${c}`, 20) +
        text(40, y + 120, 'One publisher for each cohort', 17, true);
    });
    d +=
      text(24, 876, 'Before each handover:', 21) +
      text(24, 918, 'Catch up to a checkpoint.', 18) +
      text(24, 956, 'Stop or fence stale publishers.', 18) +
      text(24, 994, 'Then enable the new publisher.', 18) +
      text(24, 1050, 'Rollback needs current data.', 18, true);
  } else {
    d += text(
      24,
      84,
      'Stateful tenant cohorts A, B, C · separate from the read-only code.',
      18,
      true,
    );
    d +=
      text(40, 146, 'Stage', 20, true) +
      text(212, 146, 'A', 20, true) +
      text(388, 146, 'B', 20, true) +
      text(564, 146, 'C', 20, true);
    rows.forEach(([stage, ...owners], i) => {
      const y = 176 + i * 116;
      d += rect(24, y, 144, 96, false, true) + text(40, y + 56, stage, 21);
      owners.forEach((owner, j) => {
        const x = 184 + j * 176;
        d += rect(x, y, 160, 96, owner === 'new') + text(x + 28, y + 56, owner, 23);
      });
    });
    d +=
      text(24, 704, 'Before each handover:', 22) +
      text(24, 748, 'Backfill and catch up to an identified checkpoint.', 19) +
      text(24, 790, 'Stop or fence the old publisher before enabling new authority.', 19) +
      text(24, 832, 'Rollback requires current data the old system can represent.', 19, true) +
      text(24, 894, 'One authoritative publisher per cohort and stage.', 20);
  }
  return svg(
    'One authoritative publisher for each migrated cohort',
    figures[1][1],
    phone ? 360 : 720,
    phone ? 1090 : 936,
    d,
  );
}
const manifestPath = resolve(assets, 'manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [i, draw] of [routing, handover].entries())
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
  'Strangler Fig routing and revised canonical cohort figure generated with separate phone layouts.',
);
