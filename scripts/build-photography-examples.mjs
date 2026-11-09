// Additional teaching examples, with authored mobile layouts. Source pixels stay
// embedded; only the white-balance illustration deliberately changes their color.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {
  editorialModification,
  photographyEditorialStyle,
} from './photography-editorial-style.mjs';

const root = resolve(import.meta.dirname, '..');
const assetRoot = resolve(root, 'content/assets');
const manifestPath = resolve(assetRoot, 'manifest.json');
const provenancePath = resolve(root, 'docs/pattern-packages/photography-provenance.json');
const derivedPath = resolve(root, 'docs/pattern-packages/photography-derived-visuals.json');
const dimensions = JSON.parse(await readFile(manifestPath, 'utf8'));
const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));
const derived = JSON.parse(await readFile(derivedPath, 'utf8'));
const cache = new Map();
const escape = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 22) =>
  `<text x="${x}" y="${y}" font-size="${size}">${escape(value)}</text>`;
const image = async (name, crop, x, y, width, height, filter = '') => {
  const file = `photography/${name}.webp`;
  if (!cache.has(name))
    cache.set(name, (await readFile(resolve(assetRoot, file))).toString('base64'));
  const size = dimensions[file];
  return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${(crop ?? [0, 0, size.width, size.height]).join(' ')}" preserveAspectRatio="xMidYMid meet"><image width="${size.width}" height="${size.height}" href="data:image/webp;base64,${cache.get(name)}"${filter ? ` filter="url(#${filter})"` : ''}/></svg>`;
};
const upsert = (list, record) => {
  const index = list.findIndex((item) => item.file === record.file);
  if (index < 0) list.push(record);
  else list[index] = record;
};
const write = async (name, width, height, title, body, sources = [], modifications = '') => {
  const file = `photography/${name}.svg`;
  const sourceRecords = sources.map((source) =>
    provenance.assets.find((item) => item.file === `photography/${source}.webp`),
  );
  if (sourceRecords.some((source) => !source)) throw Error(`Missing source rights for ${name}`);
  const publicDomain = name.startsWith('selection-candidates');
  const record = {
    file,
    kind: sources.length ? 'native-svg-with-photographs' : 'native-svg-diagram',
    creator: 'Patternverse photography collection; embedded creators credited in sources',
    teaching_objective: title,
    source_files: sourceRecords.map((source) => source.file),
    license: publicDomain
      ? 'Public domain source photographs; original SVG layout'
      : 'Original SVG layout; embedded sources retain their stated rights',
    license_url: publicDomain ? 'https://commons.wikimedia.org/wiki/Template:PD-USGov' : null,
    attribution:
      sourceRecords.map((source) => source.attribution ?? source.creator).join('; ') ||
      'Patternverse photography collection',
    modifications:
      modifications ||
      'Native crop viewports, annotations and labels; embedded source pixels unchanged. Mobile companion reflows the same content.',
    regenerate: 'node scripts/build-photography-examples.mjs',
    retrieved_or_created: '2026-10-25',
    width,
    height,
  };
  record.modifications += ' ' + editorialModification;
  const metadata = {
    ...record,
    sources: sourceRecords.map(({ file, creator, source_url, license, license_url, rights }) => ({
      file,
      creator,
      source_url,
      license,
      license_url,
      rights,
    })),
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-photography-style="light-editorial"><title id="title">${escape(title)}</title><desc id="desc">${escape(title)}. ${escape(record.modifications)}</desc><metadata>${escape(JSON.stringify(metadata))}</metadata>${photographyEditorialStyle}<rect width="${width}" height="${height}" fill="#fff"/><g fill="#252c28">${body}</g></svg>\n`;
  await writeFile(resolve(assetRoot, file), svg);
  record.sha256 = createHash('sha256').update(svg).digest('hex');
  dimensions[file] = { width, height };
  upsert(provenance.assets, record);
  upsert(derived, { file, sources, method: title });
};

for (const width of [720, 360]) {
  const mobile = width === 360;
  const suffix = mobile ? '-mobile' : '';
  const font = mobile ? 18 : 22;
  const pad = 12;
  const inner = width - pad * 2;
  const label = (x, y, value) => text(x, y, value, font);

  // One actual source crop: the second frame cannot retain the shop-window echo.
  const relationshipHeight = (inner * 2) / 3;
  let body = label(pad, 28, 'Include both sides of the echo');
  body += await image('relationship-umbrella-source', null, pad, 44, inner, relationshipHeight);
  const secondY = 44 + relationshipHeight + 44;
  body += label(pad, secondY - 14, 'Tight crop: the window is lost');
  body += await image(
    'relationship-umbrella-source',
    [1055, 205, 345, 590],
    pad,
    secondY,
    inner,
    relationshipHeight,
  );
  await write(
    `relationship-umbrella-comparison${suffix}`,
    width,
    secondY + relationshipHeight + pad,
    'A crop can preserve the person and remove the relationship',
    body,
    ['relationship-umbrella-source'],
  );

  // Source frames 11, 14 and 15 are upright in the contact-sheet excerpt.
  const candidates = [
    [[48, 376, 280, 190], '11: turned, quiet'],
    [[975, 372, 278, 190], '14: speaking, clear'],
    [[1270, 372, 279, 190], '15: hand near face'],
  ];
  const columns = mobile ? 1 : 3;
  const tileWidth = (inner - (columns - 1) * 12) / columns;
  const tileHeight = (tileWidth * 190) / 280;
  body = label(pad, 28, 'Purpose: a conversational portrait');
  for (const [index, [crop, title]] of candidates.entries()) {
    const x = pad + (index % columns) * (tileWidth + 12);
    const y = 44 + Math.floor(index / columns) * (tileHeight + 48);
    body += await image('ansel-contact-sheet', crop, x, y, tileWidth, tileHeight);
    body += text(x, y + tileHeight + 28, title, mobile ? 18 : 19);
  }
  const selectionHeight = 44 + Math.ceil(candidates.length / columns) * (tileHeight + 48) + 42;
  body += label(pad, selectionHeight - 18, 'Editorial choice here: frame 14');
  await write(
    `selection-candidates${suffix}`,
    width,
    selectionHeight,
    'Three enlarged real candidates compared against a stated purpose',
    body,
    ['ansel-contact-sheet'],
    'Cropped three upright frames from the public-domain contact sheet without retouching or rotation. Original frame numbers retained in new labels. Selection is an editorial interpretation, not an archival preference.',
  );

  const cupColumns = mobile ? 2 : 3;
  const cupWidth = (inner - (cupColumns - 1) * 12) / cupColumns;
  const cupLabels = ['Wide', 'Low', 'Overhead', 'Turn the cup', 'Handle detail', 'Space'];
  body = '';
  for (let index = 0; index < 6; index++) {
    const x = pad + (index % cupColumns) * (cupWidth + 12);
    const y = pad + Math.floor(index / cupColumns) * (cupWidth + 40);
    const sx = [0, 515, 1028][index % 3];
    const sy = index < 3 ? 0 : 515;
    body += await image('work-cup-variations-source', [sx, sy, 508, 508], x, y, cupWidth, cupWidth);
    body += text(x, y + cupWidth + 26, cupLabels[index], mobile ? 16 : 20);
  }
  await write(
    `work-cup-variations${suffix}`,
    width,
    pad + Math.ceil(6 / cupColumns) * (cupWidth + 40),
    'Six deliberate alternatives around an ordinary cup',
    body,
    ['work-cup-variations-source'],
  );

  const photoHeight = (inner * 505) / 1536;
  body = label(pad, 28, '1. Check the intended subject');
  body += await image('focus-garden-comparison', [0, 0, 1536, 505], pad, 44, inner, photoHeight);
  const outline = (x, y, w, h, stroke) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${stroke}" stroke-width="1.6"/>`;
  body += outline(
    pad + inner * 0.16,
    44 + photoHeight * 0.17,
    inner * 0.13,
    photoHeight * 0.45,
    '#fff',
  );
  body += outline(
    pad + inner * 0.52,
    44 + photoHeight * 0.05,
    inner * 0.2,
    photoHeight * 0.45,
    '#00855b',
  );
  body += label(pad, 44 + photoHeight + 28, 'Flower soft; near wire sharp.');
  const nextY = 44 + photoHeight + 88;
  body += label(pad, nextY - 16, '2. Try selecting the flower');
  body += await image(
    'focus-garden-comparison',
    [0, 517, 1536, 507],
    pad,
    nextY,
    inner,
    photoHeight,
  );
  body += outline(
    pad + inner * 0.52,
    nextY + photoHeight * 0.05,
    inner * 0.2,
    photoHeight * 0.45,
    '#00855b',
  );
  body += label(pad, nextY + photoHeight + 28, 'Flower detail is clearer.');
  await write(
    `review-focus-next-attempt${suffix}`,
    width,
    nextY + photoHeight + 48,
    'Review one issue: intended flower versus visibly sharp wire, then a clearer alternative',
    body,
    ['focus-garden-comparison'],
    'Annotated crops of a generated focus illustration. Boxes identify regions to inspect, not actual camera autofocus metadata. The two views illustrate a proposed next experiment, not proof of what caused a real failed capture.',
  );

  // Conceptual ranges intentionally fade rather than imply hard boundaries.
  const focusX = width * 0.56;
  body = `<defs><linearGradient id="range"><stop stop-color="#00855b" stop-opacity="0"/><stop offset=".25" stop-color="#00855b" stop-opacity=".14"/><stop offset=".75" stop-color="#00855b" stop-opacity=".14"/><stop offset="1" stop-color="#00855b" stop-opacity="0"/></linearGradient></defs>`;
  body += label(pad, 28, 'Focus places the range.');
  body += label(pad, 56, 'Depth of field changes its width.');
  for (const [index, [title, center, span]] of [
    ['Same focus, narrower range', focusX, inner * 0.23],
    ['Same focus, wider range', focusX, inner * 0.57],
    ['Move focus to a farther subject', width * 0.78, inner * 0.23],
  ].entries()) {
    const y = 110 + index * 125;
    body += label(pad, y - 12, title);
    body += `<rect x="${center - span / 2}" y="${y}" width="${span}" height="52" fill="url(#range)"/><path d="M36 ${y + 36} H${width - 20}" stroke="#a6aca3" stroke-width="1.1"/><path d="M${center} ${y - 2} V${y + 58}" stroke="#252c28" stroke-width="1.6"/>`;
    for (const fraction of [0.36, 0.56, 0.78]) {
      const x = width * fraction;
      body += `<circle cx="${x}" cy="${y + 28}" r="8" fill="white" stroke="#252c28" stroke-width="1.1"/>`;
    }
    body +=
      text(pad, y + 80, 'Near', mobile ? 15 : 18) +
      text(width - 66, y + 80, 'Far', mobile ? 15 : 18);
  }
  body += text(pad, 490, 'Conceptual ranges; no hard boundary.', mobile ? 16 : 20);
  await write(
    `foundations-focus-range${suffix}`,
    width,
    510,
    'Focus distance and the width of the acceptable sharp range are distinct choices',
    body,
    [],
    'Native conceptual distance diagram with fading range edges. Not an optical calculation or a prescription for exact near/far limits.',
  );

  // Ideal perspective projections: z=4/8, focal scale 200/400. Moving
  // the camera forward by two gives z=2/6; it is not a digital zoom.
  body = label(pad, 28, 'Near circle, distant doorway');
  const frameHeight = (inner * 180) / 320;
  const frameY = (index) => 76 + index * (frameHeight + 70);
  const frameWidth = inner;
  const scale = frameWidth / 320;
  const rows = [
    ['1. Wider view', 200, 4, 8],
    ['2. Zoom from the same position', 400, 4, 8],
    ['3. Move closer, keep the lens', 200, 2, 6],
  ];
  for (const [index, [title, focal, near, far]] of rows.entries()) {
    const y = frameY(index);
    body += label(pad, y - 14, title);
    const circleX = pad + frameWidth / 2 - ((focal * 0.5) / near) * scale;
    const circleR = ((focal * 0.28) / near) * scale;
    const doorX = pad + frameWidth / 2 + (focal / far) * scale;
    const doorW = ((focal * 1.2) / far) * scale;
    const doorH = ((focal * 3) / far) * scale;
    body += `<svg x="${pad}" y="${y}" width="${frameWidth}" height="${frameHeight}" viewBox="${pad} 0 ${frameWidth} ${frameHeight}"><rect x="${pad}" width="${frameWidth}" height="${frameHeight}" fill="#f1f2ef"/><rect x="${doorX - doorW / 2}" y="${(frameHeight - doorH) / 2}" width="${doorW}" height="${doorH}" fill="#edf5f0" stroke="#252c28" stroke-width="1.1"/><circle cx="${circleX}" cy="${frameHeight / 2}" r="${circleR}" fill="#00855b" stroke="#252c28" stroke-width="1.1"/></svg>`;
  }
  const perspectiveHeight = frameY(2) + frameHeight + 62;
  body += text(pad, perspectiveHeight - 36, 'Zoom: both grow in proportion.', mobile ? 17 : 22);
  body += text(pad, perspectiveHeight - 8, 'Move: the near shape grows more.', mobile ? 17 : 22);
  await write(
    `foundations-move-versus-zoom${suffix}`,
    width,
    perspectiveHeight,
    'Zoom changes framing; moving changes near-to-far size relationships',
    body,
    [],
    'Native ideal perspective projections of two abstract objects. No lens distortion, camera photograph or numerical focal-length claim. Row 3 moves closer using row 1 focal scale; row 2 stays in row 1 position and doubles focal scale.',
  );

  body = `<defs><filter id="warm" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1.08 0 0 0 .025 0 1 0 0 0 0 0 .82 0 0 0 0 0 1 0"/></filter><filter id="cool" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".82 0 0 0 0 0 .98 0 0 0 0 0 1.08 0 .025 0 0 0 1 0"/></filter></defs>`;
  const wbColumns = mobile ? 1 : 3;
  const wbWidth = (inner - (wbColumns - 1) * 12) / wbColumns;
  for (const [index, [filter, title]] of [
    ['warm', 'Warmer rendering'],
    ['', 'Source rendering'],
    ['cool', 'Cooler rendering'],
  ].entries()) {
    const x = pad + (index % wbColumns) * (wbWidth + 12);
    const y = pad + Math.floor(index / wbColumns) * (wbWidth + 44);
    body += await image(
      'work-cup-variations-source',
      [515, 0, 508, 508],
      x,
      y,
      wbWidth,
      wbWidth,
      filter,
    );
    body += text(x, y + wbWidth + 28, title, mobile ? 18 : 20);
  }
  await write(
    `foundations-white-balance${suffix}`,
    width,
    pad + Math.ceil(3 / wbColumns) * (wbWidth + 44),
    'The same cup image rendered warmer, unchanged, and cooler',
    body,
    ['work-cup-variations-source'],
    'Exact same crop rendered through explicit sRGB channel color matrices for warm/cool alternatives. Center is the unchanged generated source, not a measured neutral reference. Illustrates rendering direction, not camera Kelvin values or new illumination.',
  );
}

await writeFile(manifestPath, `${JSON.stringify(dimensions, null, 2)}\n`);
await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);
await writeFile(derivedPath, `${JSON.stringify(derived, null, 2)}\n`);
console.log('Wrote seven additional examples and their seven mobile companions.');
