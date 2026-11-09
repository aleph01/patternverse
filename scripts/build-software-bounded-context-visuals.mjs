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

const dashed = (d) =>
  `<path d="${d}" fill="none" stroke="#626962" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#wiring)"/>`;
const meaningsDescription =
  'Sales models commercial account AC-72 as an established relationship. Billing models payer BILL-19 as current and BILL-20 as overdue. Service Access models workspace WS-301 as enabled and funded by BILL-19. Identity mappings connect the models, while the funding relationship identifies which payer matters to the workspace.';
const translationDescription =
  "A published BillingCondition for BILL-19 and a workspace funded by BILL-19 enter Access-owned interpretation. A current condition means keep current access; an overdue condition means review access. The function rejects mismatched or unresolved payer mappings and never directly changes the workspace's enabled state.";

function meanings(compact) {
  const drawing = compact
    ? text(24, 32, 'One company,', 22) +
      text(24, 60, 'three coherent models', 22) +
      rect(24, 104, 312, 172, false, true) +
      text(40, 138, 'Sales', 22) +
      card(44, 158, 272, 'AC-72', 'Established relationship') +
      rect(24, 352, 312, 320, false, true) +
      text(40, 386, 'Billing', 22) +
      card(44, 412, 272, 'BILL-19', 'Current') +
      card(44, 548, 272, 'BILL-20', 'Overdue') +
      rect(24, 752, 312, 200, true, true) +
      text(40, 786, 'Service Access', 22) +
      card(44, 814, 272, 'WS-301', 'Enabled', true) +
      text(44, 924, 'Funding payer: BILL-19', 18) +
      dashed('M180 276V314H12V586H42') +
      dashed('M12 450H42') +
      arrow('M316 450H348V852H318') +
      text(256, 728, 'funds', 17, true) +
      text(24, 1012, 'Dashed: mapped identities', 17, true) +
      text(24, 1044, 'Green: funding relationship', 17, true) +
      text(24, 1090, 'Overdue is not an access state.', 18)
    : text(24, 34, 'One company, three coherent local models', 24) +
      rect(24, 84, 200, 420, false, true) +
      text(40, 118, 'Sales', 22) +
      card(40, 164, 168, 'AC-72', 'Established', false, 112) +
      text(40, 334, 'Commercial', 17, true) +
      text(40, 364, 'relationships', 17, true) +
      rect(264, 84, 200, 420, false, true) +
      text(280, 118, 'Billing', 22) +
      card(280, 164, 168, 'BILL-19', 'Current', false, 112) +
      card(280, 344, 168, 'BILL-20', 'Overdue', false, 112) +
      rect(504, 84, 192, 420, true, true) +
      text(520, 118, 'Service Access', 20) +
      card(520, 164, 160, 'WS-301', 'Enabled', true, 112) +
      text(520, 312, 'Funding: BILL-19', 16) +
      text(520, 354, 'Workspace and', 17, true) +
      text(520, 384, 'entitlements', 17, true) +
      dashed('M208 220H278') +
      dashed('M242 220V400H278') +
      text(230, 194, 'IDs', 16, true) +
      arrow('M448 220H518') +
      text(466, 194, 'funds', 17, true) +
      text(24, 560, 'Dashed: identity mapping · green: funding relationship', 18) +
      text(24, 612, 'BILL-20 being overdue does not define WS-301’s access state.', 18);
  return svg(
    'Bounded contexts preserve different meanings and identities',
    meaningsDescription,
    compact ? 360 : 720,
    compact ? 1122 : 644,
    drawing,
  );
}

function translation(compact) {
  const drawing = compact
    ? text(24, 32, 'Translate the meaning;', 22) +
      text(24, 60, 'keep the decision local', 22) +
      card(24, 104, 312, 'BillingCondition', 'BILL-19 · overdue', false, 100) +
      card(24, 252, 312, 'Workspace WS-301', 'Funded by BILL-19 · enabled', false, 100) +
      rect(24, 430, 312, 132, true) +
      text(40, 464, 'Access-owned interpretation', 18) +
      text(40, 502, 'Match funding payer exactly', 17) +
      text(40, 536, 'Use known payment states', 17, true) +
      arrow('M180 204V224H12V496H22') +
      arrow('M180 352V428') +
      card(24, 642, 312, 'review_access', 'WS-301 stays enabled', true, 100) +
      arrow('M180 562V640') +
      text(196, 608, 'match', 17, true) +
      card(24, 822, 312, 'Wrong or unknown payer', 'Error; access stays unchanged', false, 100) +
      dashed('M336 496H348V872H338') +
      text(204, 790, 'if unresolved', 17, true) +
      text(24, 990, 'Published billing fact ≠ access state.', 17) +
      text(24, 1024, 'This example performs no state write.', 17) +
      text(24, 1070, 'Green: assessment · dashed: rejection', 16, true)
    : text(24, 34, 'Translate a notice; preserve the local access model', 24) +
      card(24, 84, 312, 'BillingCondition', 'BILL-19 · overdue', false, 100) +
      rect(384, 84, 312, 100) +
      text(400, 114, 'Workspace WS-301', 20) +
      text(400, 146, 'Funding payer: BILL-19', 17) +
      text(400, 172, 'Enabled: True', 17, true) +
      rect(24, 260, 672, 232, true, true) +
      text(44, 294, 'Access-owned interpretation', 21) +
      card(44, 318, 280, 'Matching payer', 'overdue: review_access', true, 100) +
      card(388, 318, 288, 'Unresolved / mismatch', 'Reject; do not guess', false, 100, true) +
      arrow('M180 184V220H280V258') +
      arrow('M540 184V220H440V258') +
      text(44, 462, 'Never copy payment_state into enabled.', 18) +
      card(24, 540, 312, 'review_access', 'WS-301 remains enabled', true, 100) +
      card(384, 540, 312, 'Mapping error', 'Access state unchanged', false, 100) +
      arrow('M184 418V444H12V590H22') +
      dashed('M532 418V538') +
      text(24, 704, 'Arrows: published inputs, local interpretation, then outcome.', 18) +
      text(24, 740, 'This function returns advice; it does not change entitlements.', 17, true);
  return svg(
    'A receiving context owns semantic interpretation',
    translationDescription,
    compact ? 360 : 720,
    compact ? 1088 : 772,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['bounded-context-meanings', meanings],
  ['bounded-context-translation', translation],
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
console.log('Built Bounded Context meanings and translation figures with separate phone layouts.');
