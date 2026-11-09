import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets');
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}path,rect{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker><marker id="wiring" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#626962" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}

const sequenceDescription =
  'Inventory reserves two mugs for O42, Packing reserves one slot, and Carrier declines delivery without committing it. Compensation releases the packing slot and then the Inventory reservation. Each effect belongs to its participant; there is no shared rollback.';
const recoveryDescription =
  "Inventory starts with five mugs. O42 reserves two, and another order O99 reserves one, leaving two available. O42's carrier declines. Packing is released, Inventory release temporarily fails, and a later retry releases only O42's two mugs. Four remain available; O99 still holds one.";
function sequence(phone) {
  const drawing = phone
    ? text(24, 34, 'Local steps, explicit recovery', 22) +
      card(24, 112, 312, '1 / Inventory accepts', 'O42 holds 2 mugs', true, 112) +
      arrow('M180 224V286') +
      text(196, 264, 'next step', 16, true) +
      card(24, 288, 312, '2 / Packing accepts', 'O42 holds 1 slot', true, 112) +
      arrow('M180 400V462') +
      card(24, 464, 312, '3 / Carrier declines', 'No delivery effect committed', false, 112) +
      arrow('M180 576V638') +
      text(196, 616, 'compensate', 16, true) +
      card(
        24,
        640,
        312,
        'C2 / Release packing',
        'New local operation / O42 only',
        false,
        112,
        true,
      ) +
      arrow('M180 752V814') +
      card(
        24,
        816,
        312,
        'C1 / Release inventory',
        'New local operation / O42 only',
        false,
        112,
        true,
      ) +
      text(24, 1024, 'Arrows: this plan’s execution order.', 16, true) +
      text(24, 1060, 'Earlier commits are not erased.', 17, true)
    : text(24, 34, 'Forward progress and compensation are separate work', 24) +
      card(24, 112, 312, 'T1 / Inventory accepts', 'O42 reserves 2 physical mugs', true, 144) +
      text(40, 220, 'Local effect committed', 17, true) +
      card(384, 112, 312, 'T2 / Packing accepts', 'O42 reserves 1 packing slot', true, 144) +
      text(400, 220, 'Local effect committed', 17, true) +
      arrow('M336 184H382') +
      arrow('M540 256V334') +
      card(384, 336, 312, 'T3 / Carrier declines', 'No delivery effect committed', false, 144) +
      text(400, 444, 'Triggers this plan’s recovery', 17, true) +
      arrow('M540 480V558') +
      card(
        384,
        560,
        312,
        'C2 / Release packing',
        'New local operation / O42 only',
        false,
        144,
        true,
      ) +
      text(400, 668, 'Explicit compensation', 17, true) +
      arrow('M384 632H338') +
      card(
        24,
        560,
        312,
        'C1 / Release inventory',
        'New local operation / O42 only',
        false,
        144,
        true,
      ) +
      text(40, 668, 'Explicit compensation', 17, true) +
      text(24, 810, 'Arrows: T1 → T2 → T3 refusal → C2 → C1.', 19) +
      text(24, 850, 'Participants own local effects. There is no shared rollback.', 18, true);
  return svg(
    'Saga local steps and compensating work',
    sequenceDescription,
    phone ? 360 : 720,
    phone ? 1112 : 904,
    drawing,
  );
}
function recovery(phone) {
  const drawing = phone
    ? text(24, 34, 'Release this order’s effects', 22) +
      card(24, 112, 312, 'Inventory starts with 5', 'All physical mug units', false, 96) +
      arrow('M180 208V270') +
      card(24, 272, 312, 'O42 holds 2; O99 holds 1', 'Available mugs: 2', true, 112, true) +
      arrow('M180 384V446') +
      card(24, 448, 312, 'Carrier declines O42', 'Packing release succeeds', false, 112) +
      arrow('M180 560V622') +
      card(
        24,
        624,
        312,
        'Inventory release unavailable',
        'waiting_compensation / done: 1',
        false,
        144,
        true,
      ) +
      text(40, 732, '2 mugs free; 1 packing slot free', 16, true) +
      arrow('M180 768V830') +
      text(196, 810, 'resume call', 16, true) +
      card(24, 832, 312, 'Release only O42’s 2 mugs', 'compensated / done: 0', true, 144, true) +
      text(40, 940, '4 mugs free; O99 still holds 1', 16, true) +
      text(24, 1064, 'Arrows: interleaving, refusal, recovery.', 15, true) +
      text(24, 1100, 'Same in-memory state; no crash recovery.', 15, true)
    : text(24, 34, 'Compensation preserves legitimate intervening work', 24) +
      card(
        24,
        112,
        672,
        'Inventory starts with 5 physical mugs',
        'O42 reserves 2; another order O99 reserves 1. Available: 2.',
        true,
        128,
      ) +
      text(40, 210, 'Each reservation has its own identity.', 18, true) +
      arrow('M360 240V318') +
      card(
        24,
        320,
        672,
        'Carrier declines O42; Packing releases its slot',
        'Inventory release is temporarily unavailable.',
        false,
        128,
      ) +
      text(40, 418, 'waiting_compensation / done: 1 / 2 mugs free / 1 slot free', 18, true) +
      arrow('M360 448V526') +
      text(376, 494, 'resume call', 17, true) +
      card(
        24,
        528,
        672,
        'Retry C1: release only O42’s two mugs',
        'Available: 4. Packing compensation is not repeated.',
        true,
        160,
      ) +
      text(40, 646, 'compensated / done: 0 / O99 still holds 1 mug', 18, true) +
      text(24, 790, 'The acceptable result is 4 available, not the original 5.', 20) +
      text(24, 834, 'Arrows: intervening work, compensation pause, then retry.', 18, true) +
      text(
        24,
        874,
        'This simulation retains one in-memory coordinator state; it has no crash recovery.',
        16,
        true,
      );
  return svg(
    'Compensation resumes without erasing other work',
    recoveryDescription,
    phone ? 360 : 720,
    phone ? 1144 : 920,
    drawing,
  );
}
const outputs = [
  ['software-engineering/saga-sequence.svg', sequence(false)],
  ['software-engineering/saga-sequence-mobile.svg', sequence(true)],
  ['software-engineering/saga-recovery.svg', recovery(false)],
  ['software-engineering/saga-recovery-mobile.svg', recovery(true)],
];
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [path, source] of outputs) {
  await mkdir(resolve(assets, path, '..'), { recursive: true });
  await writeFile(resolve(assets, path), source);
  const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
  manifest[path] = { width: Number(width), height: Number(height) };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Built four native Saga SVG variants.');
