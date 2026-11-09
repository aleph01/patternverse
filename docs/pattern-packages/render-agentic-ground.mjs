// Original fictional discovery maps, not an executed repository or upgrade report.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find(
  (p) => p.id === 'agentic-ground-work-in-the-existing-system',
).examples;
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

const proposedDown = (x, y, length = 24) => path(`M${x} ${y}v${length}m-5 -6l5 6l5 -6`, 'pending');

function imports(mobile) {
  const f = fixture.import;
  let b = text(mobile ? 20 : 28, 32, 'Find the existing reuse points', mobile ? 20 : 22);
  b += text(mobile ? 20 : 28, 68, `${f.revision} · fictional system map`, 18);
  if (mobile) {
    b += rect(20, 106, 320, 76) + text(36, 139, 'ProductForm', 21);
    b += text(36, 169, 'Inspected manual-entry caller', 18);
    b += down(180, 194);
    b += rect(20, 233, 320, 116, 'mint');
    b += text(36, 270, 'validateProduct', 21, 'accent');
    b += lines(36, 310, ['quantity_nonnegative', 'Field code; no CSV row number'], 17, 27);
    b += path('M20 291H8V958h12m-6 -5l6 5l-6 5');
    b += path('M180 394v-31m-5 6l5 -6l5 6', 'pending');
    b += rect(20, 396, 320, 124, 'pending');
    b += text(36, 431, 'Proposed CSV upload + decode', 18);
    b += lines(36, 470, ['P201,3', 'P202,-1'], 20, 30);
    b += path('M340 291h10v336h-10m6 -5l-6 5l6 5', 'pending');
    b += rect(20, 572, 320, 110, 'pending');
    b += text(36, 608, 'Preview · read-only', 21);
    b += lines(36, 646, ['Adapter adds row 2 to error'], 18);
    b += proposedDown(180, 694, 36);
    b += path('M173 703l14 14m-14 0l14 -14');
    b += text(20, 760, 'Invalid file: confirmation blocked', 18);
    b += rect(20, 782, 320, 66, 'pending');
    b += text(36, 822, 'Confirm valid file only', 20);
    b += proposedDown(180, 860);
    b += rect(20, 900, 320, 116, 'mint');
    b += text(36, 935, 'createProducts', 21, 'accent');
    b += lines(36, 975, ['Existing-SKU check', 'All-or-none transaction'], 18, 28);
    b += down(180, 1028);
    b += rect(20, 1068, 320, 76) + text(36, 1102, 'Inventory', 21);
    b += text(36, 1132, 'This invalid file: P100 stays 4', 18);
    b += lines(
      20,
      1190,
      ['Solid: inspected existing calls', 'Dashed: proposed import wiring'],
      17,
      28,
    );
    return svg(
      360,
      1244,
      'Ground proposed import in inspected validation and storage',
      'Fictional BASE-E: manual entry uses validateProduct and createProducts. Proposed CSV decoding reuses validation; the adapter adds row 2. Invalid preview blocks confirmation, so inventory stays P100:4. Dashed paths are proposed, solid paths inspected.',
      b,
    );
  }
  b += rect(28, 106, 244, 90) + text(44, 143, 'ProductForm', 22);
  b += text(44, 178, 'Existing manual entry', 18);
  b += path('M284 152h88m-6 -5l6 5l-6 5');
  b += rect(388, 106, 304, 130, 'mint') + text(404, 145, 'validateProduct', 22, 'accent');
  b += lines(404, 184, ['quantity_nonnegative', 'Field code, no row number'], 18, 30);
  b += path('M388 220h-34v380h-44v28m-5 -6l5 6l5 -6');
  b += lines(28, 455, ['Manual-entry save', 'keeps the write boundary'], 19, 31);
  b += path('M267 466H354', 'fine');
  b += rect(28, 272, 244, 126, 'pending') + text(44, 308, 'CSV upload + decode', 20);
  b += lines(44, 347, ['P201,3', 'P202,-1'], 20, 31);
  b += path('M272 334h56V188h60m-6 -5l6 5l-6 5', 'pending');
  b += proposedDown(540, 248, 26);
  b += rect(388, 290, 304, 108, 'pending') + text(404, 326, 'Preview · read-only', 21);
  b += lines(404, 365, ['Adapter adds row 2 to error'], 18);
  b += proposedDown(540, 410, 44) + path('M533 424l14 14m-14 0l14 -14');
  b += text(388, 488, 'Invalid: confirmation blocked', 19);
  b += rect(388, 510, 304, 66, 'pending') + text(404, 550, 'Confirm valid file only', 20);
  b += path('M540 588v20H500v20m-5 -6l5 6l5 -6', 'pending');
  b +=
    rect(28, 646, 664, 102, 'mint') +
    text(44, 683, 'createProducts · existing write boundary', 22, 'accent');
  b += text(44, 723, 'Existing-SKU check + all-or-none transaction', 20);
  b += down(360, 760);
  b += rect(28, 800, 664, 78) + text(44, 834, 'Inventory', 21);
  b += text(44, 864, 'This invalid file: P100 stays 4', 19);
  b += text(28, 927, 'Solid: inspected calls · dashed: proposed import wiring', 19);
  return svg(
    720,
    958,
    'Reuse existing validation and the inventory write boundary',
    'The fictional map distinguishes inspected ProductForm, validateProduct, createProducts and inventory relationships from proposed upload, preview and confirmation wiring. The invalid row blocks confirmation; no new storage bypass is introduced.',
    b,
  );
}

function interfaces(mobile) {
  const f = fixture.interface;
  const x = mobile ? 20 : 28;
  let b = text(x, 32, 'Same CSV. Check the version contract.', mobile ? 18 : 22);
  b += text(x, 68, 'RowReader · fictional package and API', mobile ? 17 : 19);
  if (mobile) {
    b += rect(20, 106, 320, 120) + text(36, 140, 'Intended input', 20);
    b += lines(36, 180, ['sku,quantity', 'P201,3'], 20, 30);
    b += rect(20, 268, 320, 116, 'pending') + text(36, 303, 'Remembered from 1.8.0', 20);
    b += text(36, 343, f.remembered_call, 20) + text(36, 372, 'Assumes a list result', 18);
    b += rect(20, 431, 320, 106, 'mint') + text(36, 467, 'Target 2.1.0 inspected', 20, 'accent');
    b += lines(36, 503, ['Lockfile = loaded module = 2.1.0'], 17);
    b += rect(20, 577, 320, 262, 'mint') + text(36, 614, 'Version-specific contract', 20, 'accent');
    b += lines(
      36,
      657,
      [
        'reader.read(text,',
        '{ header: true })',
        'rows: [{ sku: "P201",',
        'quantity: "3" }]',
        'issues: []',
      ],
      19,
      32,
    );
    b += text(20, 889, 'Quantity is still text.', 20);
    b += lines(
      20,
      930,
      ['Handle issues and result envelope.', 'Then apply product validation.'],
      18,
      31,
    );
    return svg(
      360,
      992,
      'Inspect the fictional target dependency interface',
      'Identical CSV input is considered under the remembered RowReader 1.8.0 parse signature and inspected fictional 2.1.0 read contract. Lockfile and loaded module agree; the result separates rows and issues and retains quantity as text.',
      b,
    );
  }
  b += rect(28, 108, 664, 90) + text(44, 143, 'Same intended input', 20);
  b += text(44, 179, 'sku,quantity  /  P201,3', 22);
  b += rect(28, 242, 316, 308, 'pending') + text(44, 281, 'Remembered from 1.8.0', 21);
  b += text(44, 331, f.remembered_call, 22) + text(44, 374, 'Assumes a list result', 20);
  b += text(44, 518, 'Not the target contract', 19);
  b += rect(376, 242, 316, 308, 'mint') + text(392, 281, 'Inspected target 2.1.0', 21, 'accent');
  b += lines(
    392,
    329,
    [
      'reader.read(text,',
      '{ header: true })',
      'rows: [{ sku: "P201",',
      'quantity: "3" }]',
      'issues: []',
    ],
    20,
    35,
  );
  b +=
    rect(28, 597, 664, 105, 'mint') +
    text(44, 634, 'Lockfile = loaded module = 2.1.0', 21, 'accent');
  b += text(44, 675, 'Handle envelope + issues; quantity still needs validation.', 20);
  b += text(28, 748, 'No real dependency or compatibility run is represented.', 19);
  return svg(
    720,
    780,
    'Compare a remembered signature with the inspected version',
    'A constructed RowReader upgrade from 1.8.0 to 2.1.0 uses identical CSV input. The inspected target changes the method, header option, and result envelope. No real library contract or executed upgrade is claimed.',
    b,
  );
}

function fixtures(mobile) {
  const f = fixture.fixture;
  const x = mobile ? 20 : 28;
  let b = text(x, 32, 'Locate the failure before changing code', mobile ? 18 : 22);
  b += text(x, 68, `${f.revision} · fictional controlled rerun`, 18);
  if (mobile) {
    b += rect(20, 107, 320, 102) + text(36, 142, 'Environment: unchanged', 21);
    b += text(36, 182, 'Same runtime + working directory', 17);
    b += text(20, 253, 'Before: fixture missing', 21);
    b += rect(20, 279, 320, 115, 'pending') + text(36, 315, f.fixture_path, 19);
    b += lines(36, 355, ['ENOENT at load', 'Missing path confirmed'], 18, 28);
    b += down(180, 406);
    b += rect(20, 447, 320, 101, 'pending') + text(36, 482, 'Application not reached', 21);
    b += text(36, 523, 'No assertion result', 19);
    b +=
      path('M20 590H340', 'fine') + text(20, 629, 'Restore documented fixture only', 19, 'accent');
    b += rect(20, 659, 320, 130, 'mint') + text(36, 695, f.fixture_path, 19, 'accent');
    b += lines(36, 736, ['sku,quantity', 'P100,4'], 20, 31);
    b += down(180, 801);
    b += rect(20, 842, 320, 145, 'mint') + text(36, 879, 'Assertion now reached', 21, 'accent');
    b += lines(36, 920, ['P100,8 → existing-SKU error', 'P100 stays 4'], 19, 32);
    b += lines(20, 1037, ['Application code unchanged.', 'One check ≠ whole environment.'], 18, 31);
    return svg(
      360,
      1100,
      'Separate fixture setup failure from application behavior',
      'Fictional BASE-E with the same runtime and application code initially stops at missing fixtures/inventory.csv, before application assertions. Restoring synthetic P100,4 reaches an assertion that rejects P100,8 and retains quantity 4.',
      b,
    );
  }
  b += rect(28, 106, 664, 96) + text(44, 141, 'Environment: unchanged', 22);
  b += text(44, 180, 'Same runtime, working directory, and application code', 20);
  b +=
    text(28, 255, 'Before: fixture missing', 21) +
    text(376, 255, 'After: fixture restored', 21, 'accent');
  b += rect(28, 284, 316, 140, 'pending') + rect(376, 284, 316, 140, 'mint');
  b += text(44, 322, f.fixture_path, 20) + text(392, 322, f.fixture_path, 20, 'accent');
  b += lines(44, 365, ['ENOENT at load', 'Missing path confirmed'], 20, 32);
  b += lines(392, 365, ['sku,quantity', 'P100,4'], 20, 32);
  b += down(186, 438) + down(534, 438);
  b += rect(28, 478, 316, 140, 'pending') + rect(376, 478, 316, 140, 'mint');
  b +=
    text(44, 516, 'Application not reached', 21) +
    text(392, 516, 'Assertion now reached', 21, 'accent');
  b += text(44, 559, 'No assertion result', 20);
  b += lines(392, 559, ['P100,8 → existing-SKU error', 'P100 stays 4'], 19, 32);
  b += text(28, 673, 'Only fixture availability changes; application code is retained.', 20);
  b += text(28, 716, 'One passing check does not establish the whole environment.', 19);
  return svg(
    720,
    748,
    'Locate a missing fixture rather than change the application',
    'Matched fictional before and after runs preserve environment and application code. Missing fixture data stops loading; restoring the documented synthetic fixture lets the existing-SKU assertion run. No empty-inventory fallback is added.',
    b,
  );
}

await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['import', imports],
  ['interface', interfaces],
  ['fixture', fixtures],
]) {
  for (const mobile of [false, true]) {
    const filename = `ground-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered six original discovery illustrations and registered their dimensions.');
