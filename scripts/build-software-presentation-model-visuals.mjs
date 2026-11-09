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

const boundariesDescription =
  'A view maps its name field, feedback label, and enabled buttons to a presentation model containing draft text, validation, and Apply/Cancel behavior. Apply invokes the domain profile’s rename operation; Cancel reloads the current name. The presentation model has no widget reference. The view owns mapping or binding.';
const draftDescription =
  'The accepted profile name is Ada. A blank draft produces an error, disables Apply, and leaves Ada unchanged. Replacing the draft with Grace enables Apply. Applying invokes domain validation and changes the accepted name to Grace, after which Apply and Cancel are disabled.';
function boundaries(compact) {
  const d = compact
    ? text(24, 32, 'Model the editing experience', 22) +
      card(24, 104, 312, 'View: layout and mapping', 'Text field, feedback, buttons.', false, 112) +
      card(24, 400, 312, 'Presentation model', 'draft; error; can_apply', true, 176) +
      text(40, 488, 'can_cancel; apply(); cancel()', 17, true) +
      text(40, 536, 'No widget reference.', 18) +
      arrow('M56 216V398') +
      text(72, 284, 'draft / actions', 17, true) +
      arrow('M304 400V218') +
      text(196, 334, 'properties', 17, true) +
      card(24, 800, 312, 'Domain profile', 'Accepted name; validity rule.', false, 112) +
      arrow('M56 576V798') +
      text(72, 648, 'Apply: rename', 17, true) +
      arrow('M304 800V578') +
      text(196, 718, 'read name', 17, true) +
      text(24, 992, 'Cancel reloads the current name.', 18) +
      text(24, 1032, 'It discards the editing draft.', 17, true) +
      text(24, 1100, 'View owns synchronization.', 18) +
      text(24, 1140, 'Binding or an explicit mapping.', 17, true)
    : text(24, 34, 'Separate editing state from accepted data', 24) +
      card(
        24,
        100,
        672,
        'View: layout and mapping',
        'Name field; feedback label; enabled buttons',
        false,
        112,
      ) +
      card(
        24,
        344,
        672,
        'Presentation model: a model of the editing session',
        'draft; error; can_apply; can_cancel; apply(); cancel()',
        true,
        144,
      ) +
      text(40, 458, 'The editor has no reference to widgets or a view interface.', 17, true) +
      arrow('M180 212V342') +
      text(196, 278, 'draft / actions', 17, true) +
      arrow('M540 344V214') +
      text(556, 298, 'properties', 17, true) +
      card(
        24,
        656,
        672,
        'Domain profile',
        'Accepted name and its independent validity rule',
        false,
        112,
      ) +
      arrow('M180 488V654') +
      text(196, 570, 'Apply: rename', 17, true) +
      arrow('M540 656V490') +
      text(556, 610, 'read name', 17, true) +
      text(24, 840, 'Cancel reloads the current name and discards the editing draft.', 18) +
      text(24, 888, 'The view owns binding or explicit synchronization.', 18);
  return svg(
    'View, presentation model, and domain profile boundaries',
    boundariesDescription,
    compact ? 360 : 720,
    compact ? 1184 : 936,
    d,
  );
}
function draft(compact) {
  const d = compact
    ? text(24, 32, 'Keep the draft separate', 22) +
      text(24, 60, 'until Apply succeeds', 22) +
      card(24, 104, 312, 'Accepted name: Ada', 'Editor begins with draft: Ada.', false, 104) +
      arrow('M180 208V294') +
      text(196, 260, 'edit draft', 17, true) +
      card(24, 296, 312, 'Draft: two spaces', 'Apply disabled; Cancel enabled.', true, 144) +
      text(40, 406, 'Error: name needs 1–40 chars.', 17, true) +
      arrow('M180 440V526') +
      text(196, 492, 'Apply rejects', 17, true) +
      card(24, 528, 312, 'Accepted name stays Ada', 'Invalid draft remains editable.', false, 104) +
      arrow('M180 632V718') +
      text(196, 684, 'edit draft', 17, true) +
      card(24, 720, 312, 'Draft: Grace', 'Apply enabled; Cancel enabled.', true, 104) +
      arrow('M180 824V910') +
      text(196, 876, 'Apply succeeds', 16, true) +
      card(24, 912, 312, 'Accepted name: Grace', 'Draft becomes Grace; Saved.', false, 144) +
      text(40, 1026, 'Apply and Cancel disabled.', 17, true) +
      text(24, 1120, 'Validation also runs on Apply.', 18)
    : text(24, 34, 'Keep drafts separate from accepted data', 24) +
      card(24, 100, 672, 'Accepted name: Ada', 'Editor begins with draft: Ada.', false, 96) +
      card(24, 308, 312, 'Draft: two spaces', 'Apply disabled; Cancel enabled.', true, 128) +
      text(40, 412, 'Error: name needs 1–40 chars.', 16, true) +
      card(384, 308, 312, 'Accepted name: Ada', 'Invalid Apply changes no name.', false, 128) +
      arrow('M180 196V306') +
      text(196, 254, 'edit draft', 17, true) +
      arrow('M336 372H382') +
      card(
        24,
        548,
        672,
        'Draft: Grace; accepted name still Ada',
        'Apply enabled; Cancel enabled.',
        true,
        104,
      ) +
      arrow('M180 436V546') +
      text(196, 496, 'replace draft', 17, true) +
      card(
        24,
        780,
        672,
        'After successful Apply: accepted name and draft are Grace',
        'Apply disabled; Cancel disabled; feedback: Saved',
        false,
        104,
      ) +
      arrow('M180 652V778') +
      text(196, 718, 'Apply validates and renames', 17, true) +
      text(24, 944, 'Cancel would instead reload the current accepted name.', 18);
  return svg(
    'Invalid drafts stay outside accepted domain state',
    draftDescription,
    compact ? 360 : 720,
    compact ? 1168 : 992,
    d,
  );
}
await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['presentation-model-boundaries', boundaries],
  ['presentation-model-draft', draft],
])
  for (const compact of [false, true]) {
    const filename = `${name}${compact ? '-mobile' : ''}.svg`,
      content = draw(compact);
    await writeFile(resolve(assets, filename), content);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    dimensions[`software-engineering/${filename}`] = { width: +width, height: +height };
  }
const p = resolve(root, 'content/assets/manifest.json');
await writeFile(
  p,
  JSON.stringify({ ...JSON.parse(await readFile(p, 'utf8')), ...dimensions }, null, 2) + '\n',
);
console.log('Built Presentation Model boundaries and draft figures with phone compositions.');
