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

const resend = (d) =>
  `<path d="${d}" fill="none" stroke="#626962" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#wiring)"/>`;
const factDescription =
  'A dispatch request reaches Shipment, which checks its ready state and records a ShipmentDispatched fact with event ID, shipment ID, tracking code, and occurrence time. Separate reactions consume the fact; Shipment does not call the archive or customer-communication code directly.';
const deliveryDescription =
  'A domain operation first holds a pending event in memory. In a durable publishing design, one atomic transaction commits business state and an outgoing record. A relay later sends the committed message to consumers; a repeated delivery retains the same event identity. A rollback leaves no committed outgoing record.';

function facts(compact) {
  const drawing = compact
    ? text(24, 32, 'Name the occurrence;', 22) +
      text(24, 60, 'separate its reactions', 22) +
      card(24, 104, 312, 'DispatchShipment', 'Request · can be rejected') +
      arrow('M180 180V228') +
      card(24, 230, 312, 'Shipment', 'ready to dispatched', true, 100) +
      arrow('M180 330V378') +
      rect(24, 380, 312, 156, true) +
      text(40, 414, 'ShipmentDispatched · E1', 20) +
      text(40, 450, 'Shipment S1 · TRACK-9', 18) +
      text(40, 480, '2026-10-29 10:00 UTC', 17) +
      text(40, 512, 'Pending · immutable fact', 17, true) +
      arrow('M180 536V584') +
      card(24, 586, 312, 'Application policy', 'Here: pure descriptions only', false, 100) +
      card(44, 732, 272, 'Archive description', 'S1 + TRACK-9') +
      card(44, 864, 272, 'Notice description', 'S1 + E1') +
      arrow('M180 686V708H12V902H42') +
      arrow('M12 770H42') +
      text(24, 1000, 'Independent descriptions; neither sends.', 17) +
      text(24, 1034, 'Recording does not commit or deliver.', 17, true)
    : text(24, 34, 'A named fact separates the transition from reactions', 24) +
      card(24, 100, 200, 'DispatchShipment', 'May be rejected', false, 100, true) +
      card(
        300,
        100,
        396,
        'Shipment · ready to dispatched',
        'Validate; record a pending fact',
        true,
        100,
      ) +
      arrow('M224 150H298') +
      text(232, 128, 'request', 16, true) +
      arrow('M498 200V278') +
      text(516, 246, 'record', 17, true) +
      rect(300, 280, 396, 156, true) +
      text(316, 312, 'ShipmentDispatched', 21) +
      text(316, 348, 'E1 · shipment S1 · TRACK-9', 18) +
      text(316, 378, 'Occurred: 2026-10-29 10:00 UTC', 17) +
      text(316, 410, 'Pending · immutable occurrence data', 17, true) +
      text(24, 312, 'Fact ≠ request', 21) +
      text(24, 348, 'A named local outcome', 18) +
      arrow('M498 436V470H360V506') +
      text(24, 466, 'Recording is separate from dispatch.', 17, true) +
      card(
        24,
        508,
        672,
        'Application chooses dispatch timing',
        'In this example: pure descriptions only',
      ) +
      arrow('M360 584V624H180V658') +
      arrow('M360 624H540V658') +
      card(24, 660, 312, 'Archive description', 'Reads S1 + TRACK-9', false, 100) +
      card(384, 660, 312, 'Notice description', 'Reads S1 + E1', false, 100) +
      text(
        24,
        808,
        'Solid arrows: request, record, then reactions under a chosen policy.',
        17,
        true,
      );
  return svg(
    'Domain fact and independent reactions',
    factDescription,
    compact ? 360 : 720,
    compact ? 1066 : 840,
    drawing,
  );
}

function delivery(compact) {
  const drawing = compact
    ? text(24, 32, 'A pending fact is not', 22) +
      text(24, 60, 'a delivered message', 22) +
      card(24, 104, 312, '1. Pending fact E1', 'Memory only; local change', false, 100) +
      arrow('M180 204V248') +
      rect(24, 250, 312, 388, true, true) +
      text(40, 284, '2. One atomic commit', 20) +
      card(44, 316, 272, 'Shipment S1', 'State: dispatched') +
      card(44, 432, 272, 'Outgoing message M1', 'Mapped from domain fact E1', true, 76, true) +
      text(44, 560, 'Rollback commits neither.', 18) +
      text(44, 590, 'State and record stay together.', 17, true) +
      arrow('M180 638V682') +
      card(24, 684, 312, '3. Relay reads M1', 'Committed messages only', false, 100) +
      arrow('M180 784V830') +
      card(24, 832, 312, '4. Consumer receives M1', 'Delivery may repeat M1', true, 100) +
      resend('M336 734H348V882H338') +
      text(24, 994, 'Retry uses the same message ID.', 17) +
      text(24, 1032, 'Solid: normal progress', 16, true) +
      text(24, 1060, 'Dashed: possible resend', 16, true)
    : text(24, 34, 'Recording, commitment, and delivery differ', 24) +
      card(
        24,
        88,
        672,
        '1. Pending domain fact E1 · memory',
        'Shipment S1 changes locally; no durable write',
        false,
        100,
      ) +
      arrow('M360 188V232') +
      rect(24, 234, 672, 232, true, true) +
      text(44, 270, '2. One atomic commit', 21) +
      card(44, 300, 280, 'Shipment state', 'S1: dispatched', false, 100) +
      card(388, 300, 288, 'Outgoing message M1', 'Mapped from domain fact E1', true, 100, true) +
      text(44, 438, 'Rollback: neither the state change nor message record commits.', 18) +
      arrow('M360 466V492H180V524') +
      card(24, 526, 312, '3. Relay reads M1', 'Committed messages only', false, 100) +
      card(384, 526, 312, '4. Consumer receives M1', 'Delivery may repeat M1', true, 100) +
      arrow('M336 576H382') +
      text(343, 558, 'send', 16, true) +
      resend('M180 626V674H540V628') +
      text(180, 710, 'Possible resend · same M1', 18, true) +
      text(
        24,
        756,
        'Solid: normal progress · dashed: possible resend of the same message',
        17,
        true,
      );
  return svg(
    'Pending fact, atomic commitment, and repeated delivery',
    deliveryDescription,
    compact ? 360 : 720,
    compact ? 1092 : 786,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['domain-event-fact-reactions', facts],
  ['domain-event-commit-delivery', delivery],
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
console.log(
  'Built Domain Event fact/reactions and commit/delivery figures with separate phone layouts.',
);
