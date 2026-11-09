import { readFile, writeFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [template, css, library, starters] = await Promise.all([
  read('../src/lib/article-widgets/needs/browser.html'),
  read('../src/lib/widgets/templates/needs.css'),
  read('../../../content/assets/libraries/needs.json'),
  read('../src/lib/widgets/needs-starters.json'),
]);
const html = template
  .replace('/* NEEDS_STYLES */', () => css)
  .replace('<!-- NEEDS_LIBRARY -->', () =>
    JSON.stringify(JSON.parse(library)).replaceAll('<', '\\u003c'),
  )
  .replace('<!-- NEEDS_STARTERS -->', () =>
    JSON.stringify(JSON.parse(starters)).replaceAll('<', '\\u003c'),
  );
await writeFile(
  new URL('../../../content/assets/widgets/identify-needs.html', import.meta.url),
  html,
);
