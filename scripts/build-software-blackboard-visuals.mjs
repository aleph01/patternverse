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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}path,rect{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker><marker id="selection" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#626962" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}

const selection = (d) =>
  `<path d="${d}" fill="none" stroke="#626962" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#selection)"/>`;
const collaborationDescription =
  'A shared blackboard holds input features, intermediate evidence, and a document hypothesis. Independent text, layout, and combination knowledge sources read snapshots and propose additions. A separate controller chooses an eligible source and commits its contribution.';
const agendaDescription =
  'With text and layout features present, layout and text sources are eligible while combination is blocked. The controller chooses layout, then text, then the newly enabled combination source. Their additions remain on the board until the declared goal is met.';

function collaboration(compact) {
  const drawing = compact
    ? text(24, 32, 'One workspace;', 22) +
      text(24, 60, 'independent expertise', 22) +
      text(24, 102, 'Text · layout · combination', 18, true) +
      rect(44, 132, 272, 184, true) +
      text(60, 166, 'Blackboard', 22) +
      text(60, 204, 'Inputs · evidence', 19) +
      text(60, 236, 'Partial solutions', 19) +
      text(60, 276, 'Controller owns writes', 17, true) +
      card(44, 418, 272, 'Knowledge source', 'Layout selected this cycle', false, 100) +
      rect(44, 638, 272, 132) +
      text(60, 674, 'Control component', 21) +
      text(60, 712, 'Eligibility · priority', 18) +
      text(60, 744, 'Validate · commit', 18) +
      arrow('M244 316V416') +
      text(260, 370, 'read', 17) +
      arrow('M244 518V636') +
      text(260, 582, 'patch', 17) +
      selection('M116 638V520') +
      text(50, 582, 'select', 17) +
      arrow('M316 288H348V704H318') +
      text(300, 618, 'state', 17) +
      arrow('M44 712H12V268H42') +
      text(24, 376, 'commit', 17) +
      text(24, 818, 'Only the controller commits changes.', 17) +
      text(24, 862, 'Solid: state and contributions', 17, true) +
      text(24, 890, 'Dashed: selection of work', 17, true)
    : text(24, 34, 'Shared state, independent expertise', 24) +
      text(24, 82, 'Text · layout · combination specialists', 20, true) +
      rect(24, 130, 280, 260, true) +
      text(40, 166, 'Blackboard', 22) +
      text(40, 212, 'Input features', 19) +
      text(40, 248, 'Partial evidence', 19) +
      text(40, 284, 'Supported hypotheses', 19) +
      text(40, 344, 'Retain earlier contributions', 17, true) +
      card(416, 130, 280, 'Knowledge source', 'Layout selected this cycle', false, 132) +
      rect(416, 392, 280, 132) +
      text(432, 428, 'Control component', 20) +
      text(432, 460, 'Eligibility · priority', 18) +
      text(432, 492, 'Validate · commit', 18) +
      arrow('M304 182H414') +
      text(320, 162, 'snapshot', 16) +
      arrow('M620 262V390') +
      text(636, 330, 'patch', 17) +
      selection('M492 392V264') +
      text(422, 330, 'select', 17) +
      arrow('M304 336H360V426H414') +
      text(320, 318, 'state', 17) +
      arrow('M416 458H164V392') +
      text(240, 440, 'commit', 17) +
      text(24, 586, 'Solid: state and contributions · dashed: work selection', 17, true) +
      text(24, 620, 'Only the controller commits changes.', 18);
  return svg(
    'Shared state, independent knowledge, and separate control',
    collaborationDescription,
    compact ? 360 : 720,
    compact ? 920 : 648,
    drawing,
  );
}

function agenda(compact) {
  let drawing;
  if (compact) {
    drawing = text(24, 32, 'Re-evaluate after', 22) + text(24, 60, 'every contribution', 22);
    const cycles = [
      [
        110,
        '1 · Choose layout (20)',
        'Eligible: layout (20), text (10)',
        'combine (100): not eligible',
        'Add has_table = True',
      ],
      [
        378,
        '2 · Choose text (10)',
        'Eligible: text (10)',
        'combine (100): not eligible',
        'Add candidate = invoice',
      ],
    ];
    for (const [y, title, eligible, blocked, addition] of cycles) {
      drawing +=
        rect(24, y, 312, 220, false, true) +
        text(40, y + 36, title, 21) +
        text(40, y + 76, eligible, 17) +
        text(40, y + 110, blocked, 17, true) +
        rect(40, y + 140, 280, 56, true) +
        text(56, y + 174, addition, 19);
    }
    drawing +=
      arrow('M180 330V376') +
      text(196, 360, 'recheck', 17) +
      arrow('M180 598V644') +
      text(196, 628, 'recheck', 17) +
      rect(24, 646, 312, 232, false, true) +
      text(40, 682, '3 · Choose combine (100)', 21) +
      text(40, 722, 'Eligible: combine (100)', 17) +
      text(40, 756, 'Both clues are now present.', 17, true) +
      rect(40, 788, 280, 66, true) +
      text(56, 816, 'Add interpretation:', 19) +
      text(56, 842, 'invoice-supported', 18) +
      text(24, 928, 'Goal met after three contributions.', 17) +
      text(24, 960, 'Budget 2 stops before combination.', 17, true);
  } else {
    drawing =
      text(24, 34, 'Choose from the current opportunities', 24) +
      text(24, 98, 'Cycle', 17, true) +
      text(120, 98, 'Eligible / blocked', 17, true) +
      text(376, 98, 'Choose', 17, true) +
      text(520, 98, 'Add to board', 17, true);
    const cycles = [
      [
        118,
        '1',
        'layout (20), text (10)',
        'combine: not eligible',
        'layout',
        'has_table = True',
        'Table evidence',
      ],
      [
        254,
        '2',
        'text (10)',
        'combine: not eligible',
        'text',
        'candidate = invoice',
        'Text hypothesis',
      ],
      [
        390,
        '3',
        'combine (100)',
        'Both clues present',
        'combine',
        'interpretation:',
        'invoice-supported',
      ],
    ];
    for (const [y, cycle, eligible, detail, chosen, key, value] of cycles) {
      drawing +=
        text(24, y + 34, cycle, 22) +
        text(120, y + 34, eligible, 18) +
        text(120, y + 64, detail, 17, true) +
        rect(376, y + 4, 112, 72, true) +
        text(392, y + 38, chosen, 20) +
        arrow(`M488 ${y + 40}H518`) +
        text(520, y + 34, key, 17) +
        text(520, y + 64, value, 17, true);
    }
    drawing +=
      text(24, 552, 'Goal met after three committed contributions.', 18) +
      text(24, 586, 'With budget 2, the same run stops before combination.', 17, true);
  }
  return svg(
    'A state-dependent agenda in three control cycles',
    agendaDescription,
    compact ? 360 : 720,
    compact ? 990 : 614,
    drawing,
  );
}

await mkdir(assets, { recursive: true });
const dimensions = {};
for (const [name, draw] of [
  ['blackboard-collaboration', collaboration],
  ['blackboard-agenda', agenda],
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
console.log('Built Blackboard collaboration and agenda figures with separate phone layouts.');
