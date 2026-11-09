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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}path,rect{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker><marker id="wiring" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#626962" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}

const precedenceDescription =
  'A valid physical express order for 100000 US dollar cents enters an ordered routing policy. The high-value rule matches before the express rule, selecting manual-review only. A physical express order for 99999 cents reaches priority-fulfillment instead. The selected channel is a decision, not proof that a consumer completed the work.';
const boundariesDescription =
  'An unfamiliar but structurally valid service order selects unclassified-review through the otherwise rule. A negative amount selects invalid-messages before business rules run. Selecting priority-fulfillment says nothing about enqueue acknowledgment or completed shipment; those are later boundaries with their own failure handling.';
function precedence(compact) {
  const d = compact
    ? text(24, 32, 'Overlapping rules need a winner', 22) +
      card(24, 104, 312, 'Two physical express orders', 'A41: 99999 US dollar cents', false, 144) +
      text(40, 198, 'A42: 100000 US dollar cents', 17, true) +
      arrow('M180 248V334') +
      text(196, 298, 'inspect', 17, true) +
      rect(24, 336, 312, 248, true) +
      text(40, 366, 'orders-v1: first match', 20) +
      text(40, 410, '1. cents ≥ 100000 → review', 17, true) +
      text(40, 444, '2. digital → digital delivery', 17, true) +
      text(40, 478, '3. physical + express → priority', 16, true) +
      text(40, 512, '4. physical → standard', 17, true) +
      text(40, 546, '5. otherwise → classification', 17, true) +
      arrow('M180 584V640H12V758H22') +
      arrow('M12 758V966H22') +
      card(24, 704, 312, 'A41: priority fulfillment', 'High-value rule is false.', true, 112) +
      card(24, 912, 312, 'A42: manual review', 'High-value rule wins first.', true, 112) +
      text(24, 1104, 'Select one channel per message.', 18) +
      text(24, 1144, 'These are logical channel choices.', 17, true)
    : text(24, 34, 'Overlapping rules need an explicit winner', 24) +
      card(24, 100, 312, 'A41: physical + express', '99999 US dollar cents', false, 112) +
      card(384, 100, 312, 'A42: physical + express', '100000 US dollar cents', false, 112) +
      arrow('M180 212V318') +
      arrow('M540 212V318') +
      rect(24, 320, 672, 224, true) +
      text(40, 352, 'orders-v1: first matching rule wins', 20) +
      text(40, 392, '1. cents ≥ 100000 → manual-review', 18, true) +
      text(40, 424, '2. digital → digital-delivery', 18, true) +
      text(40, 456, '3. physical + express → priority-fulfillment', 18, true) +
      text(40, 488, '4. physical → standard-fulfillment', 18, true) +
      text(40, 520, '5. otherwise → unclassified-review', 18, true) +
      arrow('M360 544V620H180V702') +
      arrow('M360 620H540V702') +
      text(24, 596, 'A41: first rule false', 18) +
      text(384, 596, 'A42: first rule true', 18) +
      card(
        24,
        704,
        312,
        'A41 → priority-fulfillment',
        'The express-physical rule wins.',
        true,
        144,
        true,
      ) +
      text(40, 798, 'One selected output.', 17, true) +
      card(384, 704, 312, 'A42 → manual-review', 'Stop at the high-value rule.', true, 144, true) +
      text(400, 798, 'No express forwarding.', 17, true) +
      text(
        24,
        920,
        'First-match precedence is this policy, not a universal router guarantee.',
        17,
      ) +
      text(
        24,
        960,
        'Selecting a channel does not prove delivery or business completion.',
        17,
        true,
      );
  return svg(
    'Content-Based Router: ordered policy and threshold',
    precedenceDescription,
    compact ? 360 : 720,
    compact ? 1200 : 1008,
    d,
  );
}
function boundaries(compact) {
  const d = compact
    ? text(24, 32, 'Fallback and failure are different', 21) +
      card(24, 104, 312, 'Valid, unfamiliar kind', 'service / 9900 cents', false, 144) +
      text(40, 198, 'Select unclassified-review.', 17, true) +
      card(24, 336, 312, 'Malformed amount', '−1 US dollar cents', false, 144) +
      text(40, 430, 'Select invalid-messages.', 17, true) +
      text(24, 560, 'A selection is not completion', 20) +
      card(24, 616, 312, '1. Select logical channel', 'Return a Decision value.', true, 96) +
      arrow('M180 712V790') +
      card(24, 792, 312, '2. Forward to destination', 'Transport can fail or retry.', false, 96) +
      arrow('M180 888V966') +
      card(24, 968, 312, '3. Consumer does the work', 'Business effects can fail.', false, 96) +
      text(24, 1144, 'No step guarantees the next one.', 18)
    : text(24, 34, 'Unmatched, malformed, and undelivered differ', 24) +
      card(24, 104, 312, 'Valid, unfamiliar kind', 'service / 9900 US dollar cents', false, 112) +
      arrow('M336 160H382') +
      card(384, 104, 312, 'unclassified-review', 'otherwise / orders-v1', true, 112) +
      card(24, 336, 312, 'Malformed amount', '−1 US dollar cents', false, 112) +
      arrow('M336 392H382') +
      card(384, 336, 312, 'invalid-messages', 'fields / orders-v1', true, 112) +
      text(24, 568, 'Selection, handoff, and completion are separate', 22) +
      card(24, 632, 192, 'Select channel', 'Decision only', true, 128, true) +
      card(264, 632, 192, 'Enqueue', 'May fail or retry', false, 128, true) +
      card(504, 632, 192, 'Handle order', 'Effect may fail', false, 128, true) +
      arrow('M216 696H262') +
      arrow('M456 696H502') +
      text(24, 840, 'One valid decision does not prove the next step succeeded.', 18) +
      text(
        24,
        884,
        'Invalid-message selection here is not a broker dead-letter protocol.',
        17,
        true,
      );
  return svg(
    'Content-Based Router: fallback and delivery boundaries',
    boundariesDescription,
    compact ? 360 : 720,
    compact ? 1208 : 944,
    d,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['content-based-router-precedence', precedence],
  ['content-based-router-boundaries', boundaries],
])
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`,
      content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[`software-engineering/${filename}`] = { width: +width, height: +height };
  }
const manifest = resolve(root, 'content/assets/manifest.json');
await writeFile(
  manifest,
  JSON.stringify({ ...JSON.parse(await readFile(manifest, 'utf8')), ...dimensions }, null, 2) +
    '\n',
);
console.log('Built two Content-Based Router diagrams with phone compositions.');
