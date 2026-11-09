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
const descriptions = {
  stored:
    'Three sales for shop A total USD 100. After another USD 10 sale commits, the source contains four sales totaling USD 110 while generation 1 still contains three sales totaling USD 100. A successful refresh publishes generation 2 with four sales totaling USD 110.',
  refresh:
    'A full refresh starts from published generation 2 with four sales totaling 11000 cents. Rebuilding after source corrections would publish generation 3 with three sales totaling 7000 cents. An injected publication failure rolls back to generation 2; a successful retry publishes generation 3 and the corrected result together.',
};
// label, source count/cents, published generation/count/cents
const states = [
  ['Initial publication', 3, 10000, 1, 3, 10000],
  ['New sale committed', 4, 11000, 1, 3, 10000],
  ['Refresh committed', 4, 11000, 2, 4, 11000],
];
function stored(phone) {
  let d = text(
    24,
    34,
    phone ? 'Read stored; refresh separately' : 'Read a stored answer; refresh it separately',
    phone ? 22 : 24,
  );
  d += text(
    24,
    78,
    phone ? 'Shop A / USD. All amounts in cents.' : 'Shop A / USD. All amounts are integer cents.',
    phone ? 17 : 19,
    true,
  );
  for (const [i, r] of states.entries()) {
    const y = 112 + i * (phone ? 256 : 212),
      h = phone ? 192 : 144;
    d +=
      rect(24, y, phone ? 312 : 672, h, i === 2) +
      text(40, y + 32, `${i + 1}. ${r[0]}`, phone ? 20 : 22);
    if (phone) {
      d +=
        text(40, y + 80, `Source: ${r[1]} sales / ${r[2]} cents`, 17) +
        text(40, y + 122, `Stored: ${r[4]} sales / ${r[5]} cents`, 17) +
        text(40, y + 166, `Published generation ${r[3]}`, 19, true);
    } else {
      d +=
        text(40, y + 80, `Source: ${r[1]} sales / ${r[2]} cents`, 19) +
        text(400, y + 80, `Stored: ${r[4]} sales / ${r[5]} cents`, 18) +
        text(40, y + 122, 'Source owns business changes.', 18, true) +
        text(400, y + 122, `Published generation ${r[3]}`, 19, true);
    }
    if (i < 2) {
      d +=
        arrow(`M${phone ? 72 : 360} ${y + h}V${y + h + (phone ? 60 : 64)}`) +
        text(
          phone ? 96 : 384,
          y + h + 40,
          i === 0 ? 'Source commit +1000' : 'Refresh commit',
          phone ? 17 : 18,
          true,
        );
    }
  }
  const y = phone ? 884 : 744;
  d +=
    rect(24, y, phone ? 312 : 672, phone ? 128 : 96) +
    text(40, y + 34, 'Reads do not trigger this refresh.', phone ? 19 : 21) +
    text(
      40,
      y + 78,
      phone ? 'Publish one complete result.' : 'Maintenance publishes a complete result.',
      phone ? 17 : 19,
      true,
    );
  return svg(
    'Read stored; refresh separately',
    descriptions.stored,
    phone ? 360 : 720,
    phone ? 1056 : 880,
    d,
  );
}
// label, generation, count, cents, publication state
const phases = [
  ['Published before refresh', 2, 4, 11000, 'Readers use the complete old result.'],
  ['Candidate inside transaction', 3, 3, 7000, 'Candidate is not yet published.'],
  ['Failure rolls back', 2, 4, 11000, 'Old rows and generation are restored.'],
  ['Retry commits', 3, 3, 7000, 'Rows and generation commit together.'],
];
function refresh(phone) {
  let d = text(
    24,
    34,
    phone ? 'Failure keeps the old result' : 'Publish data and generation in one transaction',
    phone ? 21 : 24,
  );
  d += text(
    24,
    78,
    phone
      ? 'Shop A / USD. All amounts in cents.'
      : 'Shop A / USD. Corrected source: 3 sales / 7000 cents.',
    phone ? 17 : 19,
    true,
  );
  for (const [i, r] of phases.entries()) {
    const y = 112 + i * (phone ? 236 : 176),
      h = phone ? 176 : 128;
    d +=
      rect(24, y, phone ? 312 : 672, h, i === 3) +
      text(40, y + 34, `${i + 1}. ${r[0]}`, phone ? 18 : 21);
    d += text(
      phone ? 40 : 400,
      y + (phone ? 84 : 34),
      `G${r[1]} / ${r[2]} sales / ${r[3]} cents`,
      phone ? 20 : 19,
    );
    d += text(40, y + (phone ? 132 : 88), r[4], phone ? 16 : 19, true);
    if (i < 3) {
      d +=
        arrow(`M${phone ? 72 : 360} ${y + h}V${y + h + (phone ? 56 : 44)}`) +
        text(
          phone ? 96 : 384,
          y + h + 32,
          ['Build candidate', 'Abort / rollback', 'Retry / commit'][i],
          phone ? 17 : 18,
          true,
        );
    }
  }
  const y = phone ? 1088 : 864;
  d +=
    rect(24, y, phone ? 312 : 672, phone ? 144 : 96) +
    text(40, y + 34, 'Generation is a publication identity.', phone ? 18 : 21) +
    text(
      40,
      y + 78,
      phone
        ? 'It is not a source watermark.'
        : 'It is not a source watermark or a freshness deadline.',
      phone ? 18 : 19,
      true,
    );
  if (phone) d += text(40, y + 118, 'Readers may retain an older snapshot.', 16, true);
  return svg(
    'Refresh failure keeps the old result',
    descriptions.refresh,
    phone ? 360 : 720,
    phone ? 1264 : 1000,
    d,
  );
}
await mkdir(resolve(assets, 'data-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['materialized-views', stored],
  ['materialized-view-refresh', refresh],
])
  for (const phone of [false, true]) {
    const path = `data-engineering/${name}${phone ? '-mobile' : ''}.svg`,
      source = draw(phone);
    await writeFile(resolve(assets, path), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[path] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Updated stored-result figure and added atomic refresh/recovery with phone variants.');
