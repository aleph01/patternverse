// Content-specific acceptance checks, usable after each authored batch and on resume.
import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const root = resolve(import.meta.dirname, '..');
const require = createRequire(resolve(root, 'packages/compiler/package.json'));
const { parse } = require('yaml');
const partial = process.argv.includes('--partial');
const path = resolve(root, 'docs/pattern-packages/architecture.json');
const pkg = JSON.parse(await readFile(path, 'utf8'));
const progressPath = resolve(root, 'docs/pattern-packages/architecture-progress.json');
const progress = JSON.parse(await readFile(progressPath, 'utf8'));
const provenance = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/architecture-provenance.json'), 'utf8'),
);
const dimensions = JSON.parse(
  await readFile(resolve(root, 'content/assets/manifest.json'), 'utf8'),
);
const inventory = JSON.parse(
  await readFile(
    resolve(root, 'docs/pattern-packages/architecture-evidence/existing-pattern-inventory.json'),
    'utf8',
  ),
);
const known = new Set([
  ...inventory.map((p) => p.id),
  ...pkg.patterns.map((p) => p.id),
  ...(pkg.practices ?? []).map((p) => p.id),
  'architecture-field-guide',
  'architecture',
  ...pkg.groups.flatMap((g) => [g.id, ...g.collections.map((c) => c.id)]),
]);
const errors = [];
const check = (ok, msg) => {
  if (!ok) errors.push(msg);
};
check(pkg.practices.length === 0, 'Architecture must not contain guided practices');
let count = 0,
  placements = 0,
  totalWords = 0;
const used = new Set();
for (const p of pkg.patterns) {
  let markdown;
  try {
    markdown = await readFile(resolve(root, `content/patterns/${p.id}.md`), 'utf8');
  } catch {
    if (!partial) errors.push(`Missing article ${p.id}`);
    continue;
  }
  count++;
  const parts = markdown.split(/^---\s*$/m);
  const front = parse(parts[1]);
  const body = parts.slice(2).join('---');
  check(
    front.id === p.id && front.type === 'pattern' && front.status === 'published',
    `${p.id}: canonical metadata`,
  );
  check(front.verses.includes('architecture'), `${p.id}: verse membership`);
  check(
    !inventory.some((x) => x.id === p.id || x.title.toLowerCase() === p.title.toLowerCase()),
    `${p.id}: duplicate existing identity/title`,
  );
  check(
    p.example_user_queries.length >= 8 &&
      p.example_user_queries.length <= 15 &&
      new Set(p.example_user_queries).size === p.example_user_queries.length,
    `${p.id}: query coverage`,
  );
  check(
    p.scale.every((s) => front.tags.includes('scale-' + s)) &&
      p.design_concerns.every((c) => front.tags.includes(c)),
    `${p.id}: indexed architectural metadata`,
  );
  for (const match of body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g))
    check(known.has(match[1]), `${p.id}: unresolved ${match[1]}`);
  for (const id of p.related_patterns)
    check(body.includes(`[[${id}`), `${p.id}: missing related prose ${id}`);
  const headings = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  check(
    JSON.stringify(headings) === JSON.stringify(pkg.article_outline),
    `${p.id}: shared article outline`,
  );
  const examples = body.split('## Architectural examples\n')[1]?.split('\n## ')[0] ?? '';
  check([...examples.matchAll(/^### /gm)].length >= 2, `${p.id}: distinct example headings`);
  const prose = body
    .split('## Sources and provenance')[0]
    .split('\n')
    .filter((line) => !p.example_user_queries.some((query) => line === `- ${query}`))
    .join('\n')
    .replace(/!\[[^\]]*\]\([^\n]*\)/g, '')
    .replace(/\[[^\]]*\]\(https?:[^)]*\)/g, '');
  const words = (prose.match(/\b[\p{L}\p{N}’'-]+\b/gu) ?? []).length;
  totalWords += words;
  check(words >= 800 && words <= 1500, `${p.id}: ${words} words (target 800–1500)`);
  check(!/@visual|@photo|TODO|TBD|lorem ipsum/i.test(body), `${p.id}: unresolved placeholder`);
  check(
    p.sources.length > 0 && p.sources.every((s) => s.url.startsWith('https://')),
    `${p.id}: sources`,
  );
  check(p.visuals.length === 3, `${p.id}: three distinct explanatory diagrams`);
  const photos = p.photographs ?? [];
  check(photos.length >= 1 && photos.length <= 2, `${p.id}: one or two photographic examples`);
  check(
    new Set(photos.map((photo) => photo.file)).size === photos.length,
    `${p.id}: distinct photographs`,
  );
  const images = [...body.matchAll(/!\[([^\]]*)\]\(\.\.\/assets\/([^\s]+)\s+"([^"]+)"\)/g)];
  check(images.length === 3 + photos.length, `${p.id}: diagrams and photo coverage match metadata`);
  for (const photo of photos) {
    check(
      examples.includes(`../assets/${photo.file}`),
      `${p.id}: photo belongs with architectural examples`,
    );
    check(
      images.filter((image) => image[2] === photo.file).length === 1,
      `${p.id}: photo appears once`,
    );
  }
  for (const [, alt, file, caption] of images) {
    placements++;
    used.add(file);
    check(alt.length > 30 && caption.length > 50, `${file}: meaningful alt/caption`);
    try {
      check((await stat(resolve(root, 'content/assets', file))).size > 100, `${file}: empty asset`);
    } catch {
      errors.push(`Missing image ${file}`);
    }
    check(
      dimensions[file]?.width > 0 && dimensions[file]?.height > 0,
      `${file}: missing intrinsic dimensions`,
    );
    if (file.endsWith('.svg')) {
      const svg = await readFile(resolve(root, 'content/assets', file), 'utf8');
      check(
        p.visuals.find((v) => v.file === file)?.style === 'light-editorial' &&
          svg.includes('data-architecture-style="light-editorial"'),
        `${file}: approved editorial drawing style`,
      );
      check(
        svg.includes('<title') && svg.includes('<desc') && svg.includes('color-scheme:only light'),
        `${file}: accessible white-background SVG`,
      );
      check(
        !/<script|<image|https?:\/\//i.test(svg.replace('http://www.w3.org/2000/svg', '')),
        `${file}: self-contained native diagram`,
      );
    } else {
      const rec = provenance.assets.find((a) => a.file === file);
      check(
        rec?.creator && rec?.license && rec?.source_url && rec?.rights_review,
        `${file}: missing reuse evidence`,
      );
      check(body.includes(rec?.source_url ?? 'MISSING'), `${file}: visible source attribution`);
      if (rec)
        check(
          createHash('sha256')
            .update(await readFile(resolve(root, 'content/assets', file)))
            .digest('hex') === rec.sha256,
          `${file}: photo checksum`,
        );
    }
  }
  progress.patterns[p.id] = {
    status: 'locally-validated',
    article_words: words,
    figures: images.length,
    article_sha256: createHash('sha256').update(markdown).digest('hex'),
  };
}
if (!partial) {
  check(count === 36, 'Expected 36 canonical patterns');
  const expectedVisuals = new Set(
    pkg.patterns.flatMap((p) => [...p.visuals, ...(p.photographs ?? [])].map((v) => v.file)),
  );
  check(
    used.size === expectedVisuals.size,
    `Expected ${expectedVisuals.size} distinct visuals, got ${used.size}`,
  );
  for (const g of pkg.groups) {
    for (const c of g.collections) {
      const raw = await readFile(resolve(root, `content/collections/${c.id}.md`), 'utf8');
      const f = parse(raw.split(/^---\s*$/m)[1]);
      check(f.items.length >= 3, `${c.id}: collection coverage`);
      for (const id of f.items) check(known.has(id), `${c.id}: missing item ${id}`);
    }
  }
}
const report = {
  checked: '2026-10-27',
  mode: partial ? 'batch' : 'complete',
  patterns: count,
  article_words: totalWords,
  figure_placements: placements,
  distinct_visuals: used.size,
  errors,
};
progress.local_validation = report;
await writeFile(progressPath, JSON.stringify(progress, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
