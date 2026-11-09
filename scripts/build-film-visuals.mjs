import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { filmDrawings, renderFilmVisual } from './film-editorial-visuals.mjs';
const root = resolve(import.meta.dirname, '..');
const catalog = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/film-illustrations.json'), 'utf8'),
);
const dimensionsPath = resolve(root, 'content/assets/manifest.json');
const dimensions = JSON.parse(await readFile(dimensionsPath, 'utf8'));
await mkdir(resolve(root, 'content/assets/filmmaking'), { recursive: true });
if (Object.keys(filmDrawings).length !== catalog.visuals.length)
  throw Error('Drawing inventory mismatch');
for (const visual of catalog.visuals) {
  const drawing = filmDrawings[visual.id];
  if (!drawing) throw Error('Missing drawing: ' + visual.id);
  for (const compact of [false, true]) {
    const file = compact ? visual.file.replace('.svg', '-mobile.svg') : visual.file;
    const svg = renderFilmVisual(visual, compact);
    await writeFile(resolve(root, 'content/assets', file), svg);
    dimensions[file] = { width: 720, height: 560 };
  }
}
await writeFile(dimensionsPath, JSON.stringify(dimensions, null, 2) + '\n');
// Insert only the figure blocks. Everything else in each canonical article stays byte-identical.
for (const id of new Set(catalog.visuals.map((v) => v.article_id))) {
  const file = resolve(root, 'content/patterns', id + '.md');
  let text = await readFile(file, 'utf8');
  for (const v of catalog.visuals.filter((v) => v.article_id === id)) {
    const block = `<!-- film-illustration:${v.id} -->\n![${v.alt_text}](../assets/${v.file} "${v.caption}")\n<!-- /film-illustration:${v.id} -->`;
    const existing = new RegExp(
      '<!-- film-illustration:' + v.id + ' -->[\\s\\S]*?<!-- /film-illustration:' + v.id + ' -->',
    );
    if (existing.test(text)) {
      text = text.replace(existing, block);
      continue;
    }
    const line = text
      .split('\n')
      .find((l) => l === `## ${v.anchor}` || l === `### ${v.anchor}` || l === `**${v.anchor}**`);
    if (!line) throw Error('Missing section anchor ' + id + ': ' + v.anchor);
    text = text.replace(line, line + '\n\n' + block + '\n');
  }
  await writeFile(file, text);
}
console.log(
  `Built ${catalog.visuals.length} Filmography illustrations and compact companions across 49 canonical articles.`,
);
