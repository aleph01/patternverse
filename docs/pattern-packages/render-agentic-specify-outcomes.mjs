// Original fixed-case illustrations. No importer, search service, or agent is run.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = resolve(root, 'content/assets/agentic-coding');
const packageData = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const scenario = packageData.patterns[0].examples;
const escape = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const text = (x, y, value, size = 20, cls = '') =>
  `<text x="${x}" y="${y}" font-size="${size}"${cls ? ` class="${cls}"` : ''}>${escape(value)}</text>`;
const line = (x1, y1, x2, y2, cls = 'fine') =>
  `<path d="M${x1} ${y1}H${x2}" class="${cls}"/>`.replace(
    `H${x2}`,
    y1 === y2 ? `H${x2}` : `L${x2} ${y2}`,
  );
const rect = (x, y, w, h, cls = 'neutral') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"/>`;
const path = (d, cls = 'leader') => `<path d="${d}" class="${cls}"/>`;
const svg = (
  w,
  h,
  title,
  desc,
  body,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc" data-agentic-style="light-editorial">
<title id="title">${escape(title)}</title><desc id="desc">${escape(desc)}</desc>
<style>
:root{color-scheme:only light;--paper:#fff;--ink:#252c28;--secondary:#a6aca3;--neutral:#f1f2ef;--mint:#edf5f0;--accent:#00855b}
svg{background:#fff;color:var(--ink)}
text{fill:var(--ink);font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}
path,rect,circle{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:butt}
.paper{fill:var(--paper)}.neutral{fill:var(--neutral)}.mint{fill:var(--mint);stroke:var(--accent);stroke-width:1}
.fine{fill:none;stroke:var(--secondary);stroke-width:1}.leader{fill:none;stroke:var(--ink);stroke-width:1.1}
.accent{fill:var(--accent)}.intervention{fill:none;stroke:var(--accent);stroke-width:1.4}
.failure{fill:none;stroke:var(--ink);stroke-width:1.1;stroke-dasharray:4 3}
</style><rect width="${w}" height="${h}" class="paper"/>${body}</svg>\n`;

function importFigure(mobile) {
  const start = `P100 = ${scenario.inventory_start.P100}`;
  const fixture = scenario.csv_cases.find((item) => item.id === 'displayed-combined-failures');
  const rows = fixture.csv.trim().split('\n');
  let b = '';
  if (mobile) {
    b += text(20, 32, `Start: ${start}`);
    b += rect(20, 54, 320, 44) + text(30, 82, '“Import CSV; handle errors.”', 18);
    b += text(20, 130, 'Specify each expected outcome', 18, 'accent');
    const cases = [
      ['P201,3 · P202,0', 'Confirm: add both products'],
      ['P202,-1', 'Reject: no inventory changes'],
      ['Repeated P201', 'Reject: no inventory changes'],
    ];
    cases.forEach(([input, output], i) => {
      const y = 174 + i * 80;
      b += text(28, y, input, 19) + text(28, y + 30, output, 17) + line(20, y + 47, 340, y + 47);
    });
    b += text(20, 432, 'One file, two failures');
    rows.forEach((row, i) => {
      const y = 476 + i * 37;
      if (i) b += text(25, y, String(i), 17);
      b += text(65, y, row, 20);
    });
    b += text(20, 660, 'Expected preview');
    b += text(25, 702, '2: quantity must be ≥ 0', 18);
    b += text(25, 740, '3: P201 repeats row 1', 18);
    b += path('M205 550H329V696H305') + path('M205 587H312V734H298');
    b += rect(20, 790, 320, 124, 'mint');
    b +=
      text(36, 822, 'Rejected file', 20, 'accent') +
      text(36, 858, 'No confirmation.', 18) +
      text(36, 892, `Inventory: ${start}`, 19);
    b += text(20, 958, 'Neither new product is stored.', 17);
    return svg(
      360,
      990,
      'Specify the expected import outcome',
      'Fictional input and acceptance cases. Row 2 has a negative quantity; row 3 repeats row 1. The expected rejection leaves P100 at quantity 4.',
      b,
    );
  }
  b += text(28, 34, `Same starting inventory: ${start}`);
  b += rect(28, 54, 664, 44) + text(42, 83, '“Import CSV; handle errors.”', 20);
  b +=
    text(28, 132, 'Input case', 18) +
    text(376, 132, 'Required outcome', 18, 'accent') +
    line(28, 148, 692, 148);
  [
    ['P201,3 · P202,0', 'Confirm: add both products'],
    ['P202,-1', 'Reject: inventory unchanged'],
    ['Repeated P201', 'Reject: inventory unchanged'],
  ].forEach(([input, output], i) => {
    const y = 184 + i * 48;
    b +=
      text(40, y, input, 20) +
      text(376, y, output, 19) +
      path(`M309 ${y - 6}H354`, 'intervention') +
      line(28, y + 18, 692, y + 18);
  });
  b += text(28, 346, 'One file, two failures', 20);
  rows.forEach((row, i) => {
    const y = 390 + i * 34;
    if (i) b += text(35, y, String(i), 17);
    b += text(74, y, row, 21);
  });
  b += text(394, 390, 'Expected preview', 20);
  b += text(394, 437, '2: quantity must be ≥ 0', 19) + text(394, 482, '3: P201 repeats row 1', 19);
  b += path('M239 452H331V431H378') + path('M239 486H346V476H378');
  b += rect(28, 536, 664, 88, 'mint');
  b += text(44, 570, 'Rejected file: no confirmation', 21, 'accent');
  b += text(44, 605, `Inventory after rejection: ${start}`, 20);
  b += text(28, 658, 'Neither P201 nor P202 is stored.', 18);
  return svg(
    720,
    686,
    'Specify the expected import outcome',
    'An acceptance matrix resolves the ambiguous import request. In the displayed fictional CSV, negative quantity and repeated identifier errors reject the entire file without changing existing inventory.',
    b,
  );
}

function searchFigure(mobile) {
  const search = scenario.search;
  const order = (ids) => ids.join(' · ');
  let b = '';
  if (mobile) {
    b += text(20, 32, 'Input scores', 20);
    search.rows.forEach((r, i) => {
      const y = 76 + i * 38;
      b += text(20, y, r.id, 20) + text(108, y, r.name, 19) + text(306, y, String(r.score), 20);
    });
    b += line(20, 174, 340, 174) + text(20, 211, 'Score only permits both:', 19);
    search.score_only_permitted_orders.forEach((r, i) => {
      b += text(28, 250 + i * 37, order(r), 20);
    });
    b +=
      text(20, 334, 'Order by score, then ID', 19, 'accent') +
      text(28, 371, order(search.total_order), 20, 'accent');
    b += line(20, 400, 340, 400) + text(20, 445, 'Between page requests', 20);
    b += text(20, 487, `Page 1: [${search.first_page.join(', ')}]`, 20);
    b += text(20, 526, `Insert ${search.inserted.id} with score ${search.inserted.score}.`, 19);
    b += text(20, 573, 'New order:', 19) + text(20, 609, order(search.order_after_insert), 20);
    b += text(20, 661, 'Offset 2 now gives:', 19);
    b +=
      rect(20, 676, 160, 43, 'failure') +
      text(30, 705, `[${search.offset_page_after_insert.join(', ')}]`, 22) +
      text(196, 704, 'A20 repeats', 17);
    b += rect(20, 765, 320, 156, 'mint');
    b +=
      text(36, 800, 'Chosen contract:', 19, 'accent') +
      text(36, 834, 'Keep the session result set.', 17);
    b += text(36, 869, 'Page 2: [A30]', 20) + text(36, 899, 'New search can see A05.', 17);
    b += text(20, 969, 'Tie-breaking does not freeze data.', 17);
    return svg(
      360,
      1000,
      'Ordering and paging are separate decisions',
      'Fictional relevance scores allow two tie orders. An identifier tie-breaker resolves that ambiguity, but inserting A05 between pages makes offset paging repeat A20. A fixed session result set is a separate chosen requirement.',
      b,
    );
  }
  b += text(28, 34, 'Same fixture. Different permitted orders.', 21);
  b += text(28, 84, 'Input scores', 19) + text(384, 84, 'Score only permits both:', 19);
  search.rows.forEach((r, i) => {
    const y = 128 + i * 38;
    b += text(28, y, r.id, 20) + text(111, y, r.name, 19) + text(294, y, String(r.score), 20);
  });
  search.score_only_permitted_orders.forEach((r, i) => {
    b += text(392, 128 + i * 38, order(r), 20);
  });
  b +=
    text(384, 211, 'Add identifier tie-breaker', 18, 'accent') +
    text(392, 245, order(search.total_order), 20, 'accent');
  b += line(28, 279, 692, 279) + text(28, 319, 'Changing data is a separate decision', 21);
  b += text(28, 367, 'Read page 1', 20) + text(420, 367, `[${search.first_page.join(', ')}]`, 21);
  b += text(28, 411, `Insert ${search.inserted.id} with score ${search.inserted.score}`, 20);
  b += text(28, 456, `New order: ${search.order_after_insert.join(', ')}`, 20);
  b += text(28, 512, 'Skip 2 in the new order', 20);
  b +=
    rect(408, 482, 164, 44, 'failure') +
    text(420, 512, `[${search.offset_page_after_insert.join(', ')}]`, 21) +
    text(590, 512, 'A20 repeats', 17);
  b += rect(28, 566, 664, 90, 'mint');
  b += text(44, 601, 'Chosen contract: keep the session’s result set', 20, 'accent');
  b += text(44, 637, 'Page 2: [A30] · A new search can see A05.', 20);
  b += text(28, 699, 'A tie-breaker is not a snapshot.', 19);
  return svg(
    720,
    730,
    'Ordering and paging are separate decisions',
    'Equal scores permit two orders until the identifier tie-breaker is specified. The same fictional list then demonstrates a repeat after a between-page insertion. The fixed result set is a chosen requirement, not an implemented guarantee.',
    b,
  );
}

await mkdir(directory, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, render] of [
  ['import', importFigure],
  ['search', searchFigure],
]) {
  for (const mobile of [false, true]) {
    const filename = `specify-outcomes-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = render(mobile);
    await writeFile(resolve(directory, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Rendered four original light-editorial illustrations and registered their dimensions.',
);
