// Original flow illustrations; counts, identifiers and team cases are hypothetical.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find(
  (p) => p.id === 'agentic-improve-the-flow-of-accepted-work',
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
function queue(mobile) {
  const q = fixture.queue;
  if (q.ledger.at(-1).remaining !== 40 || q.accepted !== null)
    throw new Error('Queue conservation or acceptance boundary changed.');
  const w = mobile ? 360 : 720;
  let b = text(mobile ? 20 : 32, 32, 'Twelve arrive; four complete review', mobile ? 18 : 22);
  b += text(mobile ? 20 : 32, 68, 'Hypothetical · distinct review entries', mobile ? 16 : 19);
  if (mobile) {
    b += panel(
      20,
      100,
      320,
      'Each working day',
      ['12 enter before 4 leave review.', 'Net change: +8 queued.', 'Initial queue: 0.'],
      'neutral',
      17,
      20,
    ).markup;
    b +=
      text(28, 350, 'Day', 17) +
      text(102, 350, 'Arrive', 17) +
      text(184, 350, 'Review', 17) +
      text(276, 350, 'Left', 17);
    b += path('M20 366H340', 'fine');
    q.ledger.forEach((r, i) => {
      const y = 410 + 55 * i;
      b +=
        text(36, y, r.day, 20) +
        text(118, y, r.arrivals, 20) +
        text(208, y, r.completed_reviews, 20) +
        text(282, y, r.remaining, 20);
      b += path(`M20 ${y + 16}H340`, 'fine');
    });
    b += panel(
      20,
      690,
      320,
      'Acceptance is unknown',
      ['Review completion does not', 'establish integration or', 'product acceptance.'],
      'mint',
      17,
      20,
    ).markup;
    b += lines(
      20,
      944,
      [
        'No returns or withdrawals.',
        'Fixed rates are assumptions,',
        'not a forecast of real work.',
      ],
      17,
    );
    return svg(
      w,
      1040,
      'Hypothetical review queue conservation',
      'Each day adds twelve distinct entries and completes four reviews. Queued work grows eight per day to forty. Acceptance is unknown.',
      b,
    );
  }
  b += panel(
    32,
    104,
    656,
    'One day: previous queue + 12 − 4',
    [
      'Net accumulation: 8 review entries per working day.',
      'Initial queue: 0. No returns, withdrawals or duplicates.',
    ],
    'neutral',
    19,
    22,
  ).markup;
  b +=
    text(48, 310, 'Day', 19) +
    text(188, 310, 'Arrivals', 19) +
    text(350, 310, 'Reviews complete', 19) +
    text(568, 310, 'Queued', 19);
  b += path('M32 330H688', 'fine');
  q.ledger.forEach((r, i) => {
    const y = 373 + 52 * i;
    b +=
      text(56, y, r.day, 22) +
      text(204, y, r.arrivals, 22) +
      text(412, y, r.completed_reviews, 22) +
      text(592, y, r.remaining, 22);
    b += path(`M32 ${y + 15}H688`, 'fine');
  });
  b += panel(
    32,
    632,
    656,
    'Accepted and integrated: unknown',
    [
      'Four completed reviews are not four accepted changes.',
      'The ledger establishes queue growth, not useful delivery.',
    ],
    'mint',
    19,
    22,
  ).markup;
  b += text(32, 834, 'Constant rates are illustrative assumptions, not a forecast.', 18);
  return svg(
    w,
    870,
    'Hypothetical review queue conservation',
    'A five-day ledger shows twelve arrivals and four completed reviews daily, leaving eight, sixteen, twenty-four, thirty-two and forty queued. Acceptance is unknown.',
    b,
  );
}

function focus(mobile) {
  if (fixture.focus.initial_started_tasks.length !== 4) throw new Error('Task boundary changed.');
  let b = text(mobile ? 20 : 32, 32, 'Resolve the dependency; finish I18', mobile ? 18 : 22);
  b += text(mobile ? 20 : 32, 68, 'Fictional identifiers · no measured result', mobile ? 16 : 19);
  if (mobile) {
    b += panel(
      20,
      100,
      320,
      'Initial snapshot · C18',
      ['Row contract waits for review.', 'Logical row convention unsettled.'],
      'neutral',
      17,
      20,
    ).markup;
    b += path('M180 300V260m-5 6l5 -6l5 6');
    b += panel(
      20,
      320,
      320,
      'Blocked · require C18',
      ['V18 · validation', 'U18 · error display', 'B18 · bulk implementation'],
      'neutral',
      17,
      20,
    ).markup;
    b += text(20, 540, 'Up arrow = requires the contract.', 17);
    b += text(20, 600, 'Proposal · ten working days', 20, 'accent');
    b += panel(
      20,
      630,
      320,
      'Useful-increment WIP limit: 1',
      [
        'Keep I18; withdraw B18 explicitly.',
        'Retain history; B18 accepted: 0.',
        'I18 still has 3 unfinished tasks.',
      ],
      'mint',
      17,
      20,
    ).markup;
    b += panel(
      20,
      870,
      320,
      '1 · Resolve C18',
      ['Review and settle the contract.'],
      'neutral',
      17,
      20,
    ).markup;
    b += down(180, 994, 24);
    b += panel(
      20,
      1034,
      320,
      '2 · Finish V18 and U18',
      ['Implement the agreed row rule.'],
      'neutral',
      17,
      20,
    ).markup;
    b += down(180, 1158, 24);
    b += panel(
      20,
      1198,
      320,
      '3 · Check I18 together',
      ['Integrate and verify behavior.', 'Record acceptance and release.'],
      'neutral',
      17,
      20,
    ).markup;
    b += lines(
      20,
      1404,
      [
        'Down arrows = planned sequence.',
        'Inspect waits, age and rework.',
        'Improvement remains unproven.',
      ],
      17,
    );
    return svg(
      360,
      1510,
      'Blocked importer work and proposed flow',
      'Initial contract C18 blocks validation V18, display U18 and bulk B18. Proposed policy records B18 withdrawal and focuses one useful increment I18 while retaining three unfinished child tasks. No observed improvement.',
      b,
    );
  }
  b += text(32, 120, 'Initial snapshot · four tasks started; two increments', 20);
  b += panel(
    48,
    148,
    624,
    'C18 · shared error contract',
    ['Waiting for review: logical row convention unsettled.'],
    'neutral',
    19,
    22,
  ).markup;
  b += path('M144 310V282H360V272m-5 6l5 -6l5 6');
  b += path('M360 310V282');
  b += path('M576 310V282H360');
  for (const [x, title] of [
    [48, 'V18 · validation'],
    [264, 'U18 · display'],
    [480, 'B18 · bulk'],
  ])
    b += panel(x, 326, 192, title, ['Requires C18'], 'neutral', 17, 19).markup;
  b += text(32, 480, 'Dependency arrows point toward the required contract.', 18);
  b += text(32, 544, 'Proposed · ten-working-day experiment', 22, 'accent');
  b += panel(
    32,
    574,
    656,
    'One started useful increment: I18',
    [
      'B18 withdrawn with history; no accepted completion.',
      'I18 still has three unfinished child tasks: C18, V18, U18.',
    ],
    'mint',
    19,
    22,
  ).markup;
  for (const [x, title, rows] of [
    [32, '1 · Resolve C18', ['Review contract', 'Settle row rule']],
    [264, '2 · Finish V18/U18', ['Implement against', 'the agreed contract']],
    [496, '3 · Check I18', ['Integrate + verify', 'Record acceptance']],
  ])
    b += panel(x, 790, 192, title, rows, 'neutral', 17, 18).markup;
  b += path('M232 858H256m-6 -5l6 5l-6 5') + path('M464 858H488m-6 -5l6 5l-6 5');
  b += lines(
    32,
    990,
    [
      'Horizontal arrows = planned sequence. Also record release.',
      'Inspect waiting, age and rework; improvement is unproven.',
    ],
    18,
  );
  return svg(
    720,
    1060,
    'Blocked importer work and proposed flow',
    'A fictional initial dependency graph and a proposed one-increment policy retain the same contract obligation. B18 withdrawal does not count as acceptance. No follow-up observations exist.',
    b,
  );
}

function learning(mobile) {
  const fs = fixture.fixtures;
  if (fs.length !== 3 || fs.filter((f) => !f.legacy_matches).length !== 2)
    throw new Error('Discriminating fixtures changed.');
  let b = text(mobile ? 20 : 32, 32, 'A recurring omission changes the brief', mobile ? 17 : 22);
  b += text(mobile ? 20 : 32, 68, 'Invented findings · bounded reference checks', mobile ? 15 : 19);
  if (mobile) {
    b += panel(
      20,
      100,
      320,
      'E18a and E18b · review',
      ['Both miss negative quantities.', 'No eligible-task denominator.'],
      'neutral',
      17,
      20,
    ).markup;
    b += down(180, 260);
    b += panel(
      20,
      300,
      320,
      'Version the acceptance example',
      [
        'Whole, nonnegative quantities.',
        'Invalid row → no batch writes.',
        'One-based logical data row.',
      ],
      'mint',
      17,
      19,
    ).markup;
    b += down(180, 504);
    b += panel(
      20,
      544,
      320,
      'Fixture · valid',
      ['P201,3 → add P201:3.', 'Baseline P100:4 remains.'],
      'neutral',
      17,
      20,
    ).markup;
    b += panel(
      20,
      708,
      320,
      'Fixture · negative',
      ['P201,-1 → reject row 1.', 'quantity_nonnegative; no writes.'],
      'neutral',
      17,
      20,
    ).markup;
    b += panel(
      20,
      872,
      320,
      'Fixture · mixed batch',
      ['P201,3 then P202,-1', 'Reject row 2; only P100:4.'],
      'neutral',
      17,
      20,
    ).markup;
    b += lines(
      20,
      1072,
      [
        'Reference passes 3/3 cases.',
        'Incomplete version fails 2/3.',
        'This is not a real importer test.',
      ],
      17,
    );
    b += down(180, 1170);
    b += panel(
      20,
      1210,
      320,
      'Next iteration · inspect',
      [
        'Omissions / eligible first reviews',
        'Fixture version + scope + rework',
        'Team recurrence: not observed',
      ],
      'mint',
      17,
      20,
    ).markup;
    b += text(20, 1452, 'Down arrows = feedback into work.', 17);
    return svg(
      360,
      1490,
      'Recurring finding to fixture and future evidence',
      'Two invented review findings lead to a versioned acceptance example and three fixtures. Constructed reference checks distinguish negative handling faults. The next iteration needs eligible-task counts and rework observations; recurrence is not measured.',
      b,
    );
  }
  b += panel(
    32,
    104,
    656,
    'Review records E18a and E18b',
    [
      'Recurring finding: negative quantities were not rejected.',
      'Two findings alone do not establish a defect frequency.',
    ],
    'neutral',
    19,
    22,
  ).markup;
  b += down(360, 264);
  b += panel(
    32,
    304,
    656,
    'Changed brief + versioned acceptance fixture',
    [
      'Whole and nonnegative; invalid row rejects the batch.',
      'Report its one-based logical data row and error code.',
    ],
    'mint',
    19,
    22,
  ).markup;
  b += down(360, 464);
  b += text(48, 532, 'Input rows · baseline P100:4', 19) + text(390, 532, 'Expected evidence', 19);
  b += path('M32 548H688', 'fine');
  for (const [y, input, result] of [
    [590, 'P201,3', 'Accept; add P201:3'],
    [642, 'P201,-1', 'Reject row 1; no writes'],
    [694, 'P201,3 then P202,-1', 'Reject row 2; no writes'],
  ])
    b += text(48, y, input, 19) + text(390, y, result, 19) + path(`M32 ${y + 16}H688`, 'fine');
  b += text(32, 758, 'Reference: 3/3 pass. Incomplete version: 2 rejection failures.', 18);
  b += down(360, 784);
  b += panel(
    32,
    824,
    656,
    'Next iteration: inspect eligible first reviews',
    [
      'Count repeated omissions with an eligible denominator.',
      'Retain fixture version, scope, review coverage and rework.',
      'Team recurrence and process improvement: not observed.',
    ],
    'mint',
    19,
    21,
  ).markup;
  b += text(32, 1064, 'Down arrows = feedback into preparation and verification.', 18);
  return svg(
    720,
    1100,
    'Recurring finding to fixture and future evidence',
    'Invented negative-quantity findings change a brief and reusable fixture. Three bounded reference cases discriminate faults, while future first-review recurrence and process improvement remain unobserved.',
    b,
  );
}

await mkdir(output, { recursive: true });
const generated = {};
for (const [name, draw] of [
  ['queue', queue],
  ['focus', focus],
  ['learning', learning],
]) {
  for (const mobile of [false, true]) {
    const value = draw(mobile);
    const filename = `flow-${name}${mobile ? '-mobile' : ''}.svg`;
    await writeFile(resolve(output, filename), value);
    const match = value.match(/width="(\d+)" height="(\d+)"/);
    generated[`agentic-coding/${filename}`] = { width: Number(match[1]), height: Number(match[2]) };
  }
}
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
Object.assign(manifest, generated);
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ generated }));
