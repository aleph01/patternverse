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
const card = (x, y, width, title, detail, accent = false, height = 76, small = false) =>
  rect(x, y, width, height, accent) +
  text(x + 16, y + 29, title, small ? 18 : 20) +
  text(x + 16, y + 55, detail, small ? 16 : 17, true);

function svg(title, description, width, height, drawing) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}path,rect{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}

const extensionDescription =
  'A document request enters the core, which normalizes text and produces the base line count. Through the analyzer contract, the core calls independent word-count and TODO-count plug-ins, then assembles their results.';
const lifecycleDescription =
  'During configuration, the core checks each extension’s declared API version and unique identity before registration. The first string input seals the registry. Requests then execute against that fixed set; later registration is rejected.';

function extensions(compact) {
  const drawing = compact
    ? text(24, 32, 'Keep the core;', 22) +
      text(24, 60, 'extend its capabilities', 22) +
      card(24, 96, 312, 'Document text', 'inspect(text)') +
      arrow('M180 172V218') +
      text(196, 202, 'request', 17) +
      rect(24, 220, 312, 244, true, true) +
      text(40, 252, 'Document core', 21) +
      text(40, 286, 'Normalize · count lines', 18) +
      text(40, 314, 'Assemble complete report', 18) +
      card(44, 348, 272, 'Analyzer API v1', 'analyze(text) → count', true) +
      arrow('M316 386H348V548H96V578') +
      arrow('M264 548V578') +
      text(24, 508, 'Optional capabilities', 20) +
      text(292, 536, 'calls', 17) +
      card(24, 580, 144, 'WordCount', 'Token count', false, 76, true) +
      card(192, 580, 144, 'TodoCount', 'TODO lines', false, 76, true) +
      arrow('M24 440H12V752H22') +
      text(24, 700, 'result', 17) +
      card(24, 714, 312, 'Complete report', 'Base + extension counts') +
      text(24, 840, 'Base report works without plug-ins.', 17, true)
    : text(24, 34, 'Extend capabilities, keep the core', 24) +
      card(24, 86, 352, 'Document text', 'inspect(text)', false, 68) +
      arrow('M200 154V204') +
      text(216, 188, 'request', 17) +
      rect(24, 206, 352, 242, true, true) +
      text(40, 240, 'Document core', 22) +
      text(40, 282, 'Normalize text', 19) +
      text(40, 312, 'Count lines · assemble report', 19) +
      card(44, 348, 312, 'Analyzer API v1', 'analyze(text) → count', true) +
      card(488, 242, 208, 'WordCount', 'Counts tokens') +
      card(488, 370, 208, 'TodoCount', 'Counts TODO lines') +
      arrow('M356 386H430V280H486') +
      arrow('M430 386V408H486') +
      text(386, 362, 'calls', 17) +
      arrow('M200 448V510') +
      text(216, 486, 'result', 17) +
      card(24, 512, 352, 'Complete report', 'Base + extension counts', false, 68) +
      text(488, 502, 'Optional capabilities', 17, true) +
      text(24, 616, 'Plug-ins receive text; they do not call each other.', 18, true);
  return svg(
    'A stable core with independent optional analyzers',
    extensionDescription,
    compact ? 360 : 720,
    compact ? 872 : 644,
    drawing,
  );
}

function state(x, y, width, title, first, second, accent = false) {
  return (
    rect(x, y, width, 132, accent) +
    text(x + 16, y + 36, title, 22) +
    text(x + 16, y + 72, first, 17) +
    text(x + 16, y + 102, second, 17)
  );
}

function lifecycle(compact) {
  const drawing = compact
    ? text(24, 32, 'Register first,', 22) +
      text(24, 60, 'then fix the configured set', 22) +
      state(
        24,
        110,
        312,
        'Configuring',
        'API v1 · unique identity',
        'Register trusted extensions',
      ) +
      arrow('M180 242V330') +
      text(196, 280, 'First string', 17) +
      text(196, 304, 'input', 17) +
      state(
        24,
        332,
        312,
        'Sealed',
        'Same configured extensions',
        'Dispatch in registration order',
        true,
      ) +
      arrow('M180 464V552') +
      text(196, 516, 'register', 17) +
      card(24, 554, 312, 'Registration rejected', 'Registry stays sealed') +
      text(24, 682, 'Requests can still run.', 18) +
      text(24, 714, 'New extensions need a new instance.', 17, true) +
      text(24, 772, 'No live unloading or isolation.', 17, true)
    : text(24, 34, 'Choose extensions before serving requests', 24) +
      state(
        24,
        116,
        280,
        'Configuring',
        'API v1 · unique identity',
        'Register trusted extensions',
      ) +
      state(
        416,
        116,
        280,
        'Sealed',
        'Same configured extensions',
        'Dispatch in registration order',
        true,
      ) +
      arrow('M304 182H414') +
      text(312, 140, 'First string', 17) +
      text(312, 162, 'input', 17) +
      text(24, 306, 'Further registration is allowed.', 17, true) +
      arrow('M556 248V362') +
      text(572, 318, 'register', 17) +
      card(416, 364, 280, 'Registration rejected', 'Registry stays sealed') +
      text(24, 368, 'No extensions is a valid setup.', 17) +
      text(24, 396, 'Hot replacement is not modeled.', 17, true) +
      text(24, 478, 'Sealing fixes configuration; it does not isolate execution.', 17, true);
  return svg(
    'Startup registration and a sealed execution registry',
    lifecycleDescription,
    compact ? 360 : 720,
    compact ? 802 : 506,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['microkernel-extensions', extensions],
  ['microkernel-lifecycle', lifecycle],
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
console.log('Built the Microkernel extension and lifecycle figures with separate phone layouts.');
