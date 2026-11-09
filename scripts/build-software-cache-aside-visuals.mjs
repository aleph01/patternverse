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
  paths:
    'Application code checks the cache first. A usable hit returns without reading the store. A miss or expired entry causes a store read and cache fill before returning. A separate write path commits the source update and then invalidates the cached key.',
  race: 'Four ordered events show a late cache fill: reader A obtains 1200 on a miss; writer B commits 1300; B invalidates the key; A installs its older 1200. The authoritative store remains 1300 while a subsequent cache hit can return 1200.',
};
const flows = [
  {
    title: 'Usable hit',
    note: 'No source read',
    steps: [
      ['Check cache', 'Key matches; entry valid'],
      ['Return cached value', 'Source is untouched'],
    ],
  },
  {
    title: 'Miss / expired',
    note: 'Load on demand',
    steps: [
      ['Check cache', 'No usable entry'],
      ['Read source', 'Authoritative value'],
      ['Fill cache', 'Value + expiration'],
      ['Return loaded value', 'Caller receives result'],
    ],
  },
  {
    title: 'Application write',
    note: 'Source first',
    steps: [
      ['Commit source', 'Write succeeds'],
      ['Invalidate cache', 'Delete affected key'],
      ['Later read', 'Reload on a miss'],
    ],
  },
];
function paths(phone) {
  let d = text(
    24,
    34,
    phone ? 'Three application-owned paths' : 'Cache beside the source; application coordinates',
    phone ? 21 : 24,
  );
  d += text(
    24,
    78,
    phone ? 'Arrows mean next operation.' : 'Arrows mean next operation within each path.',
    phone ? 17 : 19,
    true,
  );
  if (phone) {
    let y = 112;
    for (const flow of flows) {
      d += text(24, y + 24, flow.title, 22) + text(24, y + 60, flow.note, 17, true);
      y += 88;
      for (const [i, step] of flow.steps.entries()) {
        d +=
          rect(24, y, 312, 92, i === flow.steps.length - 1) +
          text(40, y + 32, `${i + 1}. ${step[0]}`, 20) +
          text(40, y + 68, step[1], 17, true);
        if (i < flow.steps.length - 1) d += arrow(`M180 ${y + 92}V${y + 122}`);
        y += 124;
      }
      y += 28;
    }
    d +=
      text(24, y + 12, 'Cache data is disposable.', 18) +
      text(24, y + 48, 'These steps are not one transaction.', 17, true);
    return svg('Three application-owned paths', descriptions.paths, 360, y + 88, d);
  }
  for (const [col, flow] of flows.entries()) {
    const x = 24 + col * 232;
    d += text(x, 130, flow.title, col === 2 ? 20 : 22) + text(x, 166, flow.note, 17, true);
    for (const [i, step] of flow.steps.entries()) {
      const y = 200 + i * 140;
      d +=
        rect(x, y, 208, 100, i === flow.steps.length - 1) +
        text(x + 12, y + 34, `${i + 1}. ${step[0]}`, 18) +
        text(x + 12, y + 74, step[1], 15, true);
      if (i < flow.steps.length - 1) d += arrow(`M${x + 104} ${y + 100}V${y + 136}`);
    }
  }
  d +=
    rect(24, 760, 672, 96) +
    text(40, 795, 'Cache data is disposable; the source owns authoritative state.', 19) +
    text(40, 834, 'Commit then invalidate is ordered, not atomic across systems.', 18, true);
  return svg('Three application-owned paths', descriptions.paths, 720, 888, d);
}
const raceSteps = [
  ['1. Reader A misses', 'A reads source price 1200', 'A holds 1200; cache empty'],
  ['2. Writer B commits', 'B writes source price 1300', 'Source 1300; cache empty'],
  ['3. B invalidates', 'B deletes the cache key', 'Source 1300; cache empty'],
  ['4. A fills late', 'A installs its earlier 1200', 'Source 1300; cache 1200'],
];
function race(phone) {
  let d = text(
    24,
    34,
    phone ? 'An older read can fill late' : 'Commit then invalidate still permits a late fill',
    phone ? 22 : 24,
  );
  d += text(
    24,
    78,
    phone
      ? 'Same unversioned key: product:P7'
      : 'Same unversioned key: product:P7. Events run top to bottom.',
    phone ? 17 : 19,
    true,
  );
  d += text(24, 110, 'Prices are integer cents.', phone ? 17 : 18, true);
  for (const [i, r] of raceSteps.entries()) {
    const y = phone ? 144 + i * 196 : 152 + i * 148;
    d += rect(24, y, phone ? 312 : 672, phone ? 156 : 112, i === 3);
    if (phone) {
      d +=
        text(40, y + 32, r[0], 21) + text(40, y + 80, r[1], 18) + text(40, y + 128, r[2], 17, true);
      if (i < 3) d += arrow(`M180 ${y + 156}V${y + 192}`);
    } else {
      d +=
        text(40, y + 34, r[0], 22) + text(300, y + 34, r[1], 20) + text(40, y + 82, r[2], 19, true);
      if (i < 3) d += arrow(`M360 ${y + 112}V${y + 144}`);
    }
  }
  const y = phone ? 972 : 792;
  d += rect(24, y, phone ? 312 : 672, phone ? 176 : 120);
  if (phone) {
    d +=
      text(40, y + 34, 'A later hit may return 1200.', 20) +
      text(40, y + 78, 'TTL starts at the late installation.', 17, true) +
      text(40, y + 120, 'It does not prove source age.', 17, true) +
      text(40, y + 158, 'No version check rejects this fill.', 17, true);
  } else {
    d +=
      text(40, y + 34, 'A later cache hit can return 1200 while the source holds 1300.', 20) +
      text(40, y + 74, 'TTL starts at installation; it does not prove source age.', 18, true) +
      text(40, y + 104, 'This trace has no version check or fill/write coordination.', 18, true);
  }
  return svg(
    'An older read can fill late',
    descriptions.race,
    phone ? 360 : 720,
    phone ? 1184 : 944,
    d,
  );
}
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['paths', paths],
  ['race', race],
])
  for (const phone of [false, true]) {
    const path = `software-engineering/cache-aside-${name}${phone ? '-mobile' : ''}.svg`;
    const source = draw(phone);
    await writeFile(resolve(assets, path), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[path] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Created read/write paths and late-fill race with separate phone compositions.');
