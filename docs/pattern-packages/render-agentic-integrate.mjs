// Original frequent-integration illustrations; revision labels are fictional.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find((p) => p.id === 'agentic-integrate-frequently').examples;
const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (x, y, value, size = 20, cls = '') =>
  `<text x="${x}" y="${y}" font-size="${size}"${cls ? ` class="${cls}"` : ''}>${esc(value)}</text>`;
const rect = (x, y, width, height, cls = 'neutral') =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" class="${cls}"/>`;
const path = (d, cls = 'line') => `<path d="${d}" class="${cls}"/>`;
const svg = (
  width,
  height,
  title,
  desc,
  body,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-agentic-style="light-editorial">
<title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc>
<style>
:root{color-scheme:only light;--paper:#fff;--ink:#252c28;--secondary:#a6aca3;--neutral:#f1f2ef;--mint:#edf5f0;--accent:#00855b}
svg{background:#fff;color:var(--ink)}
text{fill:var(--ink);font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}
path,rect,circle{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:butt}
.paper{fill:var(--paper)}.neutral{fill:var(--neutral)}.mint{fill:var(--mint);stroke:var(--accent);stroke-width:1}
.fine{fill:none;stroke:var(--secondary);stroke-width:1}.line{fill:none;stroke:var(--ink);stroke-width:1.1}
.accent{fill:var(--accent)}.boundary{fill:none;stroke:var(--accent);stroke-width:1.3}
.pending{fill:none;stroke:var(--ink);stroke-width:1.1;stroke-dasharray:5 4}
</style><rect width="${width}" height="${height}" class="paper"/>${body}</svg>\n`;

const lines = (x, y, values, size = 19, step = 32, cls = '') =>
  values.map((value, i) => text(x, y + i * step, value, size, cls)).join('');
const down = (x, y, length = 24) => path(`M${x} ${y}v${length}m-5 -6l5 6l5 -6`);

function panel(x, y, w, title, rows, cls = 'neutral', font = 18, titleSize = 21, minHeight = 0) {
  const height = Math.max(76 + rows.length * 32, minHeight);
  return {
    height,
    markup:
      rect(x, y, w, height, cls) +
      text(x + 16, y + 36, title, titleSize, cls === 'mint' ? 'accent' : '') +
      lines(x + 16, y + 78, rows, font, 32),
  };
}
const node = (x, y, label, dx = -12, dy = -20) =>
  `<circle cx="${x}" cy="${y}" r="7" fill="#ffffff" stroke="#252c28" stroke-width="1.1"/>` +
  text(x + dx, y + dy, label, 18);
const edge = (d) => path(d);
function lanes(mobile) {
  const f = fixture.rows;
  if (f.observations.I1.contract_passes || !f.observations.I2.contract_passes)
    throw new Error('Expected contrasting composed checks.');
  if (mobile) {
    let b = text(20, 32, 'Mainline update ≠ peer integration', 20);
    b += text(20, 68, 'Fictional revisions · ancestry arrows', 16);
    b +=
      text(22, 120, 'Mainline', 16) +
      text(139, 120, 'Frontend', 16) +
      text(267, 120, 'Backend', 16);
    b += path('M60 144v354M180 144v354M300 144v354', 'fine');
    b += edge('M60 187v156m-5 -6l5 6l5 -6');
    b += edge('M67 180h113v43m-5 -6l5 6l5 -6');
    b += edge('M67 180h233v113m-5 -6l5 6l5 -6');
    b += edge('M180 237v186m-5 -6l5 6l5 -6');
    b += edge('M67 350h57l49 73m-7 -3l7 3l0 -8');
    b += edge('M180 437v176m-5 -6l5 6l5 -6');
    b += edge('M300 307v254H180v52m-5 -6l5 6l5 -6');
    b += node(60, 180, 'M0', -34, 5) + node(60, 350, 'M1', -34, 5);
    b += node(180, 230, 'F1', 12, 5) + node(180, 430, 'F2', 12, 5);
    b += node(300, 300, 'B1', -34, 5) + node(180, 620, 'I1', 12, 5);
    b += text(20, 530, 'M1: docs only', 16);
    b += text(20, 692, 'I1 is a candidate, not shared mainline.', 16);
    let y = 724;
    let p = panel(
      20,
      y,
      320,
      'F2 has M1; it still lacks B1',
      ['F1 mock expects row 2.', 'B1’s own fixture expects row 3.'],
      'neutral',
      17,
      20,
    );
    b += p.markup;
    y += p.height + 46;
    p = panel(
      20,
      y,
      320,
      'I1 · combine F2 + B1',
      ['Same file: P201:3; P202:−1', 'Display: Data row 3', 'Required: Data row 2'],
      'pending',
      17,
      20,
    );
    b += p.markup;
    y += p.height + 12;
    b += down(180, y);
    y += 42;
    p = panel(
      20,
      y,
      320,
      'I2 · use corrected backend B2',
      ['Contract excludes the header.', 'Display: Data row 2', 'Then assess shared M2.'],
      'mint',
      17,
      19,
    );
    b += p.markup;
    y += p.height + 50;
    b += text(20, y, 'Panel arrow: repair and recheck.', 16);
    return svg(
      360,
      y + 34,
      'Receiving mainline does not include an unintegrated peer',
      'Recomposed vertical branch lanes show M0, documentation M1, frontend F1/F2 and peer backend B1. Ancestry arrows converge at candidate I1. The check exposes row 3 instead of 2; I2 corrects the backend convention before planned shared integration. All labels are fictional.',
      b,
    );
  }
  let b = text(28, 32, 'Receiving M1 does not make peer B1 visible', 23);
  b += text(28, 68, 'Fictional revision labels · lane arrows mean parent → child', 18);
  b += text(28, 124, 'Mainline', 18) + text(28, 254, 'Frontend', 18) + text(28, 384, 'Backend', 18);
  b += path('M112 170h564M112 300h564M112 430h564', 'fine');
  b += edge('M127 170h266m-6 -5l6 5l-6 5');
  b += edge('M127 170h53v130h93m-6 -5l6 5l-6 5');
  b += edge('M127 170h53v260h93m-6 -5l6 5l-6 5');
  b += edge('M287 300h206m-6 -5l6 5l-6 5');
  b += edge('M400 177v53l95 64m-8 0l8 0l-3 -7');
  b += edge('M507 300h50l88 123m-8 -2l8 2l0 -8');
  b += edge('M287 430h356m-6 -5l6 5l-6 5');
  b += node(120, 170, 'M0', -18, 32) + node(400, 170, 'M1', -18, -20);
  b += text(449, 146, 'docs only', 17);
  b +=
    node(280, 300, 'F1') +
    node(500, 300, 'F2') +
    text(239, 337, 'mock row 2', 17) +
    text(461, 337, '+M1; no B1', 17);
  b +=
    node(280, 430, 'B1') +
    text(231, 468, 'returns row 3', 17) +
    node(650, 430, 'I1', 12, -20) +
    text(594, 468, 'candidate', 17);
  b += panel(
    28,
    516,
    664,
    'I1 = F2 + B1 · composed check fails',
    [
      'Same CSV: P201:3 then P202:−1, after the header.',
      'Display: Data row 3 · required: Data row 2',
    ],
    'pending',
    20,
    22,
  ).markup;
  b += down(360, 670, 24);
  b += panel(
    28,
    718,
    664,
    'I2 = F2 + corrected B2 · composed check passes',
    [
      'B2 uses one-based logical data records, excluding the header.',
      'Display: Data row 2 · then integrate and check shared M2.',
    ],
    'mint',
    19,
    21,
  ).markup;
  b += text(28, 902, 'Panel arrow: repair and recheck; no real merge or mainline check ran.', 18);
  return svg(
    720,
    936,
    'A branch update omits an unintegrated peer’s changed row convention',
    'Mainline M1 contains documentation only. F2 includes M1 and F1 but not B1; only candidate I1 combines both contributors and fails the expected row-2 display. Corrected backend B2 gives I2 row 2. Lane arrows describe ancestry, while panels report reference function checks and planned shared integration.',
    b,
  );
}
function units(mobile) {
  const samples = fixture.units.observations;
  if (samples[0].wrong.inventory.P201 !== 300 || samples[0].fixed.inventory.P201 !== 3)
    throw new Error('Unit reference changed.');
  if (mobile) {
    let b = text(20, 32, 'Same number type; different units', 20);
    b += text(20, 68, 'Quantity 3 each · initial P100:4', 16);
    let y = 106;
    const add = (title, rows, cls = 'neutral', arrow = true) => {
      const p = panel(20, y, 320, title, rows, cls, 17, 20);
      b += p.markup;
      y += p.height;
      if (arrow) {
        b += down(180, y + 12);
        y += 65;
      }
    };
    add(
      'Contract at both boundaries',
      ['CSV and V1 use each.', 'Whole quantities from 0 to 500.'],
      'neutral',
      false,
    );
    y += 46;
    add('Q1 · wrong scaling', ['Input: 3 each', 'Multiply by 100 → 300 hundredths'], 'pending');
    add(
      'V1 · interprets 300 as each',
      ['300 is a valid whole number.', 'Reference writer stores P201:300.'],
      'pending',
      false,
    );
    y += 46;
    add(
      'Repair · remove the scaling',
      ['Same input: 3 each', 'V1 accepts 3; writer stores 3.', 'P100 remains 4.'],
      'mint',
      false,
    );
    y += 46;
    add(
      'Contrast · same fraction 3.5',
      [
        'Old: 350 is accepted and written.',
        'Fixed: quantity_whole; 0 writes.',
        'Baseline remains P100:4.',
      ],
      'neutral',
      false,
    );
    y += 50;
    b += text(20, y, 'Arrows: value passed to the next component', 15);
    return svg(
      360,
      y + 34,
      'One quantity exposes an incompatible scaling assumption',
      'Input 3 each is multiplied to 300 hundredths but the validator and writer interpret the number as each. Removing the conversion retains quantity 3. Input 3.5 separately demonstrates forbidden fractions being accepted after scaling, then correctly rejected without writes.',
      b,
    );
  }
  let b = text(28, 32, 'One input reveals incompatible quantity units', 23);
  b += text(28, 68, 'Same CSV quantity 3 each · initial P100:4 · contract: whole each, 0–500', 18);
  b += panel(
    28,
    106,
    316,
    'Q1 · wrong conversion',
    ['CSV: 3 each', '×100 → 300 hundredths', 'Mock expects that scale.'],
    'pending',
    18,
    21,
  ).markup;
  b += panel(
    376,
    106,
    316,
    'V1 · expects each',
    ['Reads the number as 300 each.', 'Integer and range checks pass.', 'Writer stores P201:300.'],
    'pending',
    17,
    22,
  ).markup;
  b += edge('M344 198h32m-6 -5l6 5l-6 5');
  b += text(28, 320, 'Arrow: the value crosses the component boundary; units do not agree.', 18);
  b += panel(
    28,
    350,
    664,
    'Repair the importer’s representation',
    [
      'Pass the same input as 3 each; remove multiplication by 100.',
      'V1 accepts 3; reference writer records P201:3 and retains P100:4.',
    ],
    'mint',
    19,
    22,
  ).markup;
  b += panel(
    28,
    536,
    316,
    'Fraction contrast · old',
    ['Input: 3.5 each', '×100 → 350; V1 accepts.', 'Writer stores P201:350.'],
    'pending',
    18,
    21,
  ).markup;
  b += panel(
    376,
    536,
    316,
    'Fraction contrast · fixed',
    ['Same input: 3.5 each', 'V1: quantity_whole', '0 writes; only P100:4'],
    'mint',
    18,
    21,
  ).markup;
  b += text(28, 752, 'Same inputs and contract; changed variable: importer scaling.', 19);
  b += text(28, 790, 'Executed in-memory references; no production storage or migration test.', 18);
  return svg(
    720,
    824,
    'A scaled integer passes a validator using a different unit',
    'The same input 3 each is represented as 300 hundredths by Q1, then misinterpreted as 300 each by V1 and the writer. Repair removes scaling. A matched fractional input 3.5 is then correctly rejected rather than written as 350. Results concern reference functions only.',
    b,
  );
}
function preparation(mobile) {
  const stages = fixture.preparation.observations;
  if (stages.P1.confirmation_present || !stages.K1.confirmation_present)
    throw new Error('Preparation must not expose confirmation.');
  if (mobile) {
    let b = text(20, 32, 'Integrate a working preparation first', 19);
    b += text(20, 68, 'Fictional sequence · release is separate', 16);
    let y = 106;
    const add = (title, rows, cls = 'neutral', relation = '') => {
      const p = panel(20, y, 320, title, rows, cls, 17, 20);
      b += p.markup;
      y += p.height;
      if (relation) {
        b += down(180, y + 12);
        b += text(20, y + 66, relation, 16);
        y += 92;
      }
    };
    add(
      'S0 · working preview',
      ['Inline quantity checks', 'Data row 2 stays row 2.', 'No confirmation function'],
      'neutral',
      'Extract; verify against shared code',
    );
    add(
      'P1 · shared preparation',
      [
        'Preview calls validateQuantity.',
        'Same response and error codes',
        'No confirmation function',
      ],
      'mint',
      'Then start K1 from shared P1',
    );
    add(
      'K1 · confirmation + checks',
      [
        'Reuse the shared validator.',
        'P201:3 → accepted; 1 write',
        'P201:3.5 → rejected; 0 writes',
        'Existing preview cases still pass.',
      ],
      'mint',
    );
    y += 46;
    add(
      'Intermediate-state checks',
      [
        '0, 3: accepted by preview',
        '−1: quantity_nonnegative',
        '3.5: quantity_whole',
        '501: quantity_max_500',
      ],
      'neutral',
    );
    y += 50;
    b += text(20, y, 'Arrows: planned integration dependency', 16);
    y += 32;
    b += text(20, y, 'Reference modules ran; no commits landed.', 15);
    return svg(
      360,
      y + 34,
      'A compatible preparation precedes a dependent confirmation feature',
      'S0 preview is followed by P1 extraction with the same preview cases and no confirmation capability. K1 starts from the planned shared preparation and adds confirmation checks. The labeled arrows describe a proposed integration sequence, not completed source-control operations or release.',
      b,
    );
  }
  let b = text(28, 32, 'Make the preparation shared before the feature grows', 23);
  b += text(28, 68, 'Fictional stages · dependency arrows are a plan, not completed commits', 18);
  b += panel(
    28,
    106,
    664,
    'S0 · existing working preview',
    [
      'Inline quantity validation; expected error codes and data-row numbering.',
      'Confirmation function absent.',
    ],
    'neutral',
    19,
    22,
  ).markup;
  b += down(360, 260, 24);
  b += text(28, 314, 'Review, check against current mainline, and integrate the preparation', 18);
  b += panel(
    28,
    342,
    664,
    'P1 · compatible shared preparation',
    [
      'Preview now calls validateQuantity; response and errors stay the same.',
      'Confirmation remains absent; five quantity cases and row-2 case pass.',
    ],
    'mint',
    19,
    22,
  ).markup;
  b += down(360, 496, 24);
  b += text(28, 550, 'K1 starts from shared P1; check the feature and the combined version', 18);
  b += panel(
    28,
    578,
    664,
    'K1 · confirmation uses the same validator',
    [
      'P201:3 accepted, 1 reference write; P201:3.5 rejected, 0 writes.',
      'Earlier preview cases still pass; full acceptance and release remain.',
    ],
    'mint',
    19,
    22,
  ).markup;
  b += panel(
    28,
    764,
    664,
    'Same preview expectations at S0, P1 and K1',
    [
      '0 and 3 accepted; −1 nonnegative error; 3.5 whole-number error.',
      '501 maximum error; second invalid data record reports row 2.',
    ],
    'neutral',
    19,
    22,
  ).markup;
  b += text(
    28,
    950,
    'Reference module checks passed. No actual integration or release occurred.',
    18,
  );
  return svg(
    720,
    984,
    'A behavior-preserving extraction makes later integration smaller',
    'The proposed integration sequence shares preparation P1 before confirmation K1 depends on it. S0 and P1 retain preview behavior and no confirmation function. Executed reference checks preserve specified cases and test valid and invalid confirmation in K1; no production route or transaction is claimed.',
    b,
  );
}
await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['lanes', lanes],
  ['units', units],
  ['preparation', preparation],
]) {
  for (const mobile of [false, true]) {
    const filename = `integrate-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered six original frequent-integration SVGs and registered their dimensions.');
