// Original editorial comparison; assignments come from the explorer's actual hash.
import { lightEditorial } from './ml-illustration-style.mjs';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url)),
  require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom'),
  source = await readFile(resolve(root, 'content/assets/widgets/ml-hashed-feature.html'), 'utf8');
const dom = new JSDOM(source, {
  runScripts: 'dangerously',
  beforeParse(w) {
    w.TextEncoder = TextEncoder;
  },
});
let names, hashes;
try {
  names = dom.window.document
    .querySelector('textarea')
    .value.trim()
    .split(/\s*\n\s*/);
  hashes = names.map((name) => dom.window.hashKey('channel=' + name));
} finally {
  dom.window.close();
}
const t = (x, y, value, size = 20, anchor = 'start') =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${value}</text>`;
function slots(count, x, y, mobile) {
  const groups = Array.from({ length: count }, () => []);
  names.forEach((name, i) => groups[hashes[i] % count].push(name));
  const step = count === 4 ? (mobile ? 76 : 84) : 42;
  let body =
    t(x, y - 56, count + ' buckets', 24) +
    t(x, y - 23, count === 4 ? '3 colliding pairs' : '1 colliding pair', 18);
  groups.forEach((group, i) => {
    const top = y + i * step,
      shared = group.length > 1;
    body +=
      t(x + 16, top + step / 2 + 6, String(i), 18, 'middle') +
      `<rect x="${x + 42}" y="${top}" width="278" height="${step}" fill="${shared ? '#edf5f0' : '#fff'}" stroke="${shared ? '#00855b' : '#a6aca3'}" stroke-width="1.1"/>`;
    if (count === 4 && shared)
      group.forEach((name, k) => (body += t(x + 58, top + (step - 66) / 2 + 18 + k * 22, name)));
    else
      body += t(x + 58, top + step / 2 + 7, group.join(' · ') || '—', group.length > 1 ? 19 : 20);
  });
  return body;
}
const mp = resolve(root, 'content/assets/manifest.json'),
  manifest = JSON.parse(await readFile(mp, 'utf8'));
for (const mobile of [false, true]) {
  const width = mobile ? 360 : 720,
    height = mobile ? 1000 : 590;
  let body = `<rect width="${width}" height="${height}" fill="#fff"/>`;
  body +=
    slots(4, 20, mobile ? 88 : 100, mobile) +
    slots(8, mobile ? 20 : 372, mobile ? 510 : 100, mobile);
  if (mobile)
    body +=
      t(20, 900, 'Same keys. Same hash.', 20) +
      t(20, 936, 'More positions separate some names.', 18) +
      t(20, 972, 'Green: names sharing one position.', 17);
  else
    body +=
      t(20, 494, 'Same keys. Same hash. More positions separate some names.', 21) +
      t(20, 535, 'Green marks shared positions; referral and affiliate still collide.', 19) +
      t(20, 570, 'FNV-1a over channel=name; bucket = hash modulo bucket count.', 17);
  const asset = `machine-learning/hashed-feature-buckets${mobile ? '-mobile' : ''}.svg`,
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">The same six channels in four and eight hash buckets</title><desc id="desc">Four buckets put social in zero, email in one, referral, direct and affiliate in two, and search in three. Eight buckets separate direct into two while referral and affiliate remain together in six. Three colliding pairs become one. The green fill and outline identify shared positions. Assignments are computed by the explorer's FNV-1a hash.</desc>${body}</svg>`;
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(mp, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered the editorial Hashed Feature comparison.');
