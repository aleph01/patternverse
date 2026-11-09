// Capture the actual default chart from each shipped example as an inert SVG.
// Run from the repository root with Node; uses the web app's existing jsdom dependency.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/statistics.json'), 'utf8'),
);
// Article fences remain authoritative if package metadata uses another descriptive format.
const filenames = new Set();
for (const pattern of metadata.patterns) {
  const source = await readFile(resolve(root, 'content/patterns', `${pattern.id}.md`), 'utf8');
  for (const match of source.matchAll(/```patternverse-widget\s*([\s\S]*?)```/g))
    filenames.add(JSON.parse(match[1]).src);
}
const directory = resolve(root, 'content/assets/statistics');
await mkdir(directory, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const filename of filenames) {
  for (const compact of [false, true]) {
    const dom = new JSDOM(
      await readFile(resolve(root, 'content/assets/widgets', filename), 'utf8'),
      {
        runScripts: 'dangerously',
        beforeParse(window) {
          Object.defineProperty(window, 'innerWidth', { value: compact ? 360 : 1024 });
        },
      },
    );
    try {
      const svg = dom.window.document.querySelector('svg');
      const box = svg.getAttribute('viewBox')?.split(/\s+/).map(Number);
      if (!box || !svg.querySelector('rect, path, line'))
        throw new Error(`No default chart in ${filename}`);
      const width = compact ? 360 : 720,
        height = Math.ceil((width * box[3]) / box[2]);
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.setAttribute('width', String(width));
      svg.setAttribute('height', String(height));
      svg.setAttribute('style', 'background:#fafaf6;color:#181814');
      const style = dom.window.document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent =
        'text{fill:#181814;font:14px Helvetica,Arial,sans-serif}.axis{stroke:#898983;opacity:.6}';
      svg.prepend(style);
      const asset = `statistics/${filename.replace('.html', `-preview${compact ? '-mobile' : ''}.svg`)}`;
      await writeFile(resolve(root, 'content/assets', asset), `${svg.outerHTML}\n`);
      manifest[asset] = { width, height };
    } finally {
      dom.window.close();
    }
  }
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Rendered ${filenames.size} static example previews.`);
