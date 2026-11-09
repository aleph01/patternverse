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
const article = await readFile(resolve(root, 'content/patterns/deployment-pipeline.md'), 'utf8');
const figures = [...article.matchAll(/!\[(.*?)\]\(\.\.\/assets\/(.*?)\.svg "/g)].map((m) => [
  m[2],
  m[1],
]);
function draw(index, phone) {
  const titles = ['Promote one identifiable candidate', 'Bind evidence to the actual bytes'];
  const rows =
    index === 0
      ? [
          ['1 Commit stage', 'Build once; run fast checks', 'Record candidate identity'],
          ['2 Acceptance stage', 'Deploy the same package', 'Run broader behavior checks'],
          [
            '3 Release decision',
            'Required evidence complete?',
            'Authorize this candidate + target',
          ],
          ['4 Production stage', 'Deploy; smoke test; observe', 'Keep recovery procedures ready'],
        ]
      : [
          [
            'Validation record',
            'Digest A passed required checks',
            'Evidence belongs to these bytes',
          ],
          ['Promotion input', 'Name: build-42; digest A or B', 'A name alone proves no identity'],
          [
            'Eligibility check',
            'Same digest + required evidence',
            'Release approval also required',
          ],
          ['Possible results', 'A + complete gates → eligible', 'B or missing gate → blocked'],
        ];
  let d =
    text(24, 36, phone && index === 0 ? 'Promote one candidate' : titles[index], phone ? 22 : 24) +
    text(
      24,
      80,
      index === 0
        ? 'Stage design depends on the system.'
        : 'Identity is one gate, not proof of safety.',
      phone ? 17 : 19,
      true,
    );
  for (let i = 0; i < rows.length; i++) {
    const y = phone ? 112 + i * 196 : 112 + i * 172;
    d +=
      rect(24, y, phone ? 312 : 672, phone ? 140 : 120, i === 2) +
      text(40, y + 36, rows[i][0], 22) +
      text(40, y + 76, rows[i][1], phone ? 17 : 20) +
      text(40, y + 112, rows[i][2], phone ? 16 : 18, true);
    if (i < 3)
      d +=
        arrow(`M72 ${y + (phone ? 140 : 120)}V${y + (phone ? 192 : 168)}`) +
        text(
          96,
          y + (phone ? 176 : 154),
          index === 0
            ? ['Passing candidate', 'Required checks pass', 'Approved promotion'][i]
            : ['Associate', 'Compare with evidence', 'Decide before writing'][i],
          17,
          true,
        );
  }
  d += text(
    24,
    phone ? 892 : 804,
    index === 0
      ? 'Same package; versioned configuration.'
      : 'Use trusted storage and evidence writers.',
    phone ? 16 : 18,
  );
  return svg(titles[index], figures[index][1], phone ? 360 : 720, phone ? 932 : 844, d);
}
const f = resolve(assets, 'manifest.json'),
  m = JSON.parse(await readFile(f, 'utf8'));
for (let i = 0; i < 2; i++)
  for (const phone of [false, true]) {
    const path = figures[i][0] + (phone ? '-mobile' : '') + '.svg',
      s = draw(i, phone);
    await mkdir(resolve(assets, path, '..'), { recursive: true });
    await writeFile(resolve(assets, path), s);
    const [, w, h] = s.match(/viewBox="0 0 (\d+) (\d+)"/);
    m[path] = { width: +w, height: +h };
  }
await writeFile(f, JSON.stringify(m, null, 2) + '\n');
