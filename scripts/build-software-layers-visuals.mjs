import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets/software-engineering');
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 19, secondary = false) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${secondary ? '#626962' : '#252c28'}">${esc(value)}</text>`;
const rect = (x, y, width, height, accent = false, surface = false) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${surface ? '#fff' : accent ? '#edf5f0' : '#f1f2ef'}" stroke="${accent ? '#00855b' : '#a6aca3'}" stroke-width="1.2"/>`;
const arrow = (d) =>
  `<path d="${d}" fill="none" stroke="#00855b" stroke-width="1.5" marker-end="url(#arrow)"/>`;
const card = (x, y, width, title, detail, accent = false, height = 76) =>
  rect(x, y, width, height, accent) +
  text(x + 16, y + 29, title, 20) +
  (detail ? text(x + 16, y + 55, detail, 17, true) : '');

function svg(title, description, width, height, drawing) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}path,rect{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}

const dependencyDescription =
  'Closed layering permits presentation to use business logic and business logic to use price access. The open example also permits a direct presentation-to-price-access dependency for a separately defined read-only operation.';
const deploymentDescription =
  'One deployment contains presentation, business logic, and price access in one process. A second deployment keeps presentation and business together but places price access in a separate service, requiring a network protocol.';

function dependencies(compact) {
  let body = text(24, 34, 'Choose the access policy', compact ? 22 : 24);
  for (const open of [false, true]) {
    const x = compact ? 28 : open ? 396 : 24;
    const y = compact ? (open ? 538 : 104) : 106;
    const width = compact ? 280 : open ? 264 : 280;
    const center = x + width / 2;
    const height = compact ? 72 : 76;
    const gap = compact ? 120 : 124;
    body += text(x, y - 28, open ? 'Open: chosen bypass' : 'Closed: adjacent only', 21);
    body += card(x, y, width, 'Presentation', 'Parse input · format result', false, height);
    body += card(x, y + gap, width, 'Business logic', 'Compute quote policy', true, height);
    body += card(x, y + 2 * gap, width, 'Price access', 'Read unit price in cents', false, height);
    body += arrow(`M${center} ${y + height}V${y + gap - 2}`);
    body += arrow(`M${center} ${y + gap + height}V${y + 2 * gap - 2}`);
    if (open)
      body += arrow(
        `M${x + width} ${y + height / 2}H${compact ? 332 : 684}V${y + 2 * gap + height / 2}H${x + width + 2}`,
      );
    body += text(
      x,
      y + 2 * gap + height + 36,
      open ? 'Extra access is explicitly allowed.' : 'Only the adjacent lower layer.',
      compact ? 17 : 16,
      true,
    );
  }
  if (compact) body += text(28, 928, 'Quote rules still belong in business.', 17);
  return svg(
    'Closed and open layer dependencies',
    dependencyDescription,
    compact ? 360 : 720,
    compact ? 958 : 504,
    body,
  );
}

function deployment(compact) {
  if (compact) {
    return svg(
      'Logical layers and physical deployment tiers',
      deploymentDescription,
      360,
      948,
      text(24, 32, 'Deployment is a', 22) +
        text(24, 59, 'separate choice', 22) +
        text(24, 104, 'One process', 22) +
        rect(24, 128, 312, 300, false, true) +
        card(44, 148, 272, 'Presentation', '', false, 64) +
        card(44, 244, 272, 'Business logic', '', true, 64) +
        card(44, 340, 272, 'Price access', '', false, 64) +
        arrow('M180 212V242') +
        arrow('M180 308V338') +
        text(24, 464, 'All three layers run together.', 18, true) +
        text(24, 522, 'Two tiers', 22) +
        rect(24, 546, 312, 184, false, true) +
        card(44, 566, 272, 'Presentation', '', false, 58) +
        card(44, 656, 272, 'Business logic', '', true, 58) +
        arrow('M180 624V654') +
        arrow('M180 714V834') +
        text(198, 788, 'Network call', 17) +
        card(24, 836, 312, 'Price-access service', 'Separate process', false, 82),
    );
  }
  return svg(
    'Logical layers and physical deployment tiers',
    deploymentDescription,
    720,
    498,
    text(24, 34, 'Layers do not determine deployment', 24) +
      text(24, 82, 'One process', 22) +
      text(396, 82, 'Two tiers', 22) +
      rect(24, 100, 300, 292, false, true) +
      rect(396, 100, 300, 196, false, true) +
      card(44, 122, 260, 'Presentation', '', false, 54) +
      card(44, 218, 260, 'Business logic', '', true, 54) +
      card(44, 314, 260, 'Price access', '', false, 54) +
      arrow('M174 176V216') +
      arrow('M174 272V312') +
      card(416, 122, 260, 'Presentation', '', false, 54) +
      card(416, 218, 260, 'Business logic', '', true, 54) +
      arrow('M546 176V216') +
      arrow('M546 272V366') +
      text(564, 333, 'Network call', 17) +
      card(396, 368, 300, 'Price-access service', 'Separate process', false, 76) +
      text(24, 435, 'All calls stay inside the process.', 17, true) +
      text(396, 478, 'New protocol and failure modes.', 17, true),
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['layers-dependencies', dependencies],
  ['layers-deployment', deployment],
]) {
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`;
    const content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[`software-engineering/${filename}`] = {
      width: Number(width),
      height: Number(height),
    };
  }
}
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await writeFile(manifestPath, JSON.stringify({ ...manifest, ...dimensions }, null, 2) + '\n');
console.log('Built the Layers dependency and deployment figures with separate phone layouts.');
