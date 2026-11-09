import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import {
  PATTERN_GRAPHICS,
  patternGraphicSvg,
} from '../apps/web/src/lib/illustrations/pattern-graphics.ts';
import { PATTERN_GRAPHIC_SPECIFICATION } from '../apps/web/src/lib/illustrations/pattern-graphic-specification.ts';

// Run with Node 22's built-in TypeScript stripping; no image service or API credentials needed.
const destination = resolve(process.argv[2] ?? '.local/pattern-graphics');
await mkdir(destination, { recursive: true });
const escapeHtml = (text) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
for (const graphic of PATTERN_GRAPHICS) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(graphic.id)) throw new Error('Invalid graphic filename.');
  await writeFile(join(destination, `${graphic.id}.svg`), patternGraphicSvg(graphic));
}
await writeFile(
  join(destination, 'patternverse-concept-graphics.json'),
  JSON.stringify({ version: 2, graphics: PATTERN_GRAPHICS }, null, 2) + '\n',
);
await writeFile(join(destination, 'design-specification.txt'), PATTERN_GRAPHIC_SPECIFICATION);
const items = [...PATTERN_GRAPHICS]
  .sort((a, b) => a.title.localeCompare(b.title))
  .map(
    (g) =>
      `<article><a href="${g.id}.svg"><img src="${g.id}.svg" width="96" height="96" alt="${escapeHtml(g.title)}"></a><h2>${escapeHtml(g.title)}</h2><p>${escapeHtml(g.reading)}</p><div class="sizes"><img src="${g.id}.svg" width="48" height="48" alt=""><span>48 px</span><img src="${g.id}.svg" width="32" height="32" alt=""><span>32 px</span></div></article>`,
  )
  .join('');
await writeFile(
  join(destination, 'index.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Patternverse concept graphics</title><style>*{box-sizing:border-box}body{background:#f6f5f0;color:#181814;margin:0;padding:40px;font-family:Inter,system-ui,sans-serif}header{max-width:1260px;margin:0 auto 32px}h1{font-family:Georgia,serif;font-size:36px;font-weight:400;margin:12px 0}header p{color:#62655f;line-height:1.6}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;max-width:1260px;margin:auto}article{background:white;padding:26px}article>a{display:flex;justify-content:center;padding:16px 0 28px}h2{font-size:17px;line-height:1.35;min-height:46px}article p{font-size:13px;line-height:1.6;color:#62655f;min-height:90px}.sizes{border-top:1px solid #eeeee8;padding-top:14px;display:flex;align-items:center;gap:12px;font-size:11px;color:#62655f}@media(max-width:500px){body{padding:24px 16px}}</style></head><body><header><p>patternverse · concept graphics</p><h1>One visual language. ${PATTERN_GRAPHICS.length} distinct concepts.</h1><p>Abstract geometric relationships, dark ink and supporting gray, with one meaningful green or purple accent.<br>Each graphic is shown at 96, 48, and 32 pixels. Select a large graphic to open its SVG.</p></header><main>${items}</main></body></html>`,
);
console.log(
  `Exported ${PATTERN_GRAPHICS.length} SVGs, design specification, authored registry, and gallery to ${destination}`,
);
