// Original release-control, schema-compatibility and persistent-repair illustrations.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'content/assets/agentic-coding');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/agentic-coding.json'), 'utf8'),
);
const fixture = metadata.patterns.find(
  (p) => p.id === 'agentic-release-with-observation-and-recovery',
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
function exposure(mobile) {
  if (fixture.exposure.decision !== 'stop-and-recover') throw new Error('I7 must stop expansion.');
  if (mobile) {
    let b = text(20, 32, 'Deployment and exposure differ', 20);
    b += text(20, 68, 'Fictional R7 · no live rollout performed', 16);
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
    add('Deployment · A7 installed', [
      'Source MAIN7 · schema D1',
      'Installed does not mean admitted.',
    ]);
    y += 46;
    add(
      'Separate control · F7 exposure',
      ['Admit authorized P7 and P8.', 'P9 stays excluded.', 'Workers recheck before starting.'],
      'mint',
      'Admitted work supplies observations',
    );
    add(
      'Constructed I7 · P7',
      ['Status says completed.', 'P100: 4 → 99; P900: 8 → 70', 'Create-only rule forbids both.'],
      'pending',
      'Integrity violation determines stop',
    );
    add(
      'Pause expansion; disable F7',
      [
        'No new P7/P8 admissions.',
        'Queued J8 cannot start.',
        'Verify propagation and in-flight work.',
      ],
      'mint',
    );
    y += 46;
    add('What disabling leaves intact', [
      'Artifact A7 remains installed.',
      'Committed P100:99; P900:70',
      'Repair is a separate decision.',
    ]);
    y += 50;
    b += text(20, y, 'Missing evidence → hold expansion.', 16);
    return svg(
      360,
      y + 34,
      'Separate deployment, admission, observations and a stop decision',
      'Artifact A7 stays installed while F7 permits only P7 and P8. Constructed I7 reports completion despite forbidden overwrites, driving a pause and disable decision. New admissions and queued J8 are blocked in reference functions; committed data remains and real propagation and in-flight cancellation were not tested.',
      b,
    );
  }
  let b = text(28, 32, 'Deployment does not grant import admission', 23);
  b += text(28, 68, 'Fictional R7 · explicit group · no production observations or rates', 18);
  b += panel(
    28,
    106,
    316,
    'Deployment · A7',
    ['Installed artifact A7', 'Source MAIN7 · schema D1', 'F7 does not replace code.'],
    'neutral',
    18,
    22,
  ).markup;
  b += panel(
    376,
    106,
    316,
    'Exposure authority · F7',
    ['Admit authorized P7/P8.', 'Exclude P9.', 'Worker checks before start.'],
    'mint',
    18,
    21,
  ).markup;
  b += down(534, 292, 24);
  b += text(28, 358, 'Admission creates work to observe; completion is only one signal.', 18);
  b += panel(
    28,
    386,
    664,
    'Constructed I7 evidence · P7',
    [
      'Status: completed · expected: reject existing SKUs without writes.',
      'P100: 4 → 99; P900: 8 → 70',
      'The create-only integrity rule is violated.',
    ],
    'pending',
    19,
    22,
  ).markup;
  b += down(360, 572, 24);
  b += text(28, 638, 'Evidence determines the stop decision; missing evidence would hold.', 18);
  b += panel(
    28,
    666,
    664,
    'Pause expansion and disable new admissions',
    [
      'F7 off: P7/P8 denied; queued J8 cannot start in the reference.',
      'Verify real propagation and already admitted or in-flight work.',
    ],
    'mint',
    19,
    22,
  ).markup;
  b += panel(
    28,
    852,
    316,
    'Code remains installed',
    ['Artifact A7 is still present.', 'No deployment was reversed.'],
    'neutral',
    17,
    21,
  ).markup;
  b += panel(
    376,
    852,
    316,
    'Committed data remains',
    ['P100:99; P900:70', 'Disabling does not repair it.'],
    'pending',
    17,
    21,
  ).markup;
  b += text(28, 1036, 'Arrows: admitted work → observations → containment decision.', 18);
  return svg(
    720,
    1070,
    'Installed code and serving admission have different controls',
    'Two independent controls identify installed artifact A7 and project admission F7. Constructed I7 evidence triggers a stop even though its status is completed. Disabling blocks new reference admissions without reversing code or committed data. No real rollout, telemetry or cancellation was executed.',
    b,
  );
}
function schema(mobile) {
  if (!fixture.schema.D2.old_supported || !fixture.schema.D2.new_supported)
    throw new Error('D2 must support both reference clients.');
  if (mobile) {
    let b = text(20, 32, 'Keep old and new clients compatible', 19);
    b += text(20, 68, 'Whole items already mean each.', 16);
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
      'D0 · no unit column',
      ['A0 old: reads and writes work.', 'A1 new: NO; unit is absent.'],
      'neutral',
      'Expand before A1 depends on unit',
    );
    add(
      'D1 · nullable unit',
      ['A0: YES; may insert NULL.', 'A1: YES; legacy NULL means each.', 'A1 writes explicit each.'],
      'neutral',
      'Coordinate default, backfill, constraint',
    );
    add(
      'D2 · default each retained',
      [
        'NOT NULL; CHECK unit = each',
        'A0: YES; omitted unit defaults.',
        'A1: YES; writes each.',
        'Fresh reads: no NULL units.',
      ],
      'mint',
    );
    y += 46;
    add(
      'Rejected alternative',
      [
        'Required unit; no default',
        'A0 insert fails: unit is missing.',
        'Same old named-column SQL.',
      ],
      'pending',
    );
    y += 50;
    b += text(20, y, 'Arrows: planned schema-stage order', 16);
    y += 32;
    b += text(20, y, 'SQLite reference; no online-DDL claim.', 16);
    return svg(
      360,
      y + 34,
      'A nullable expansion and retained default preserve old-client inserts',
      'D0 supports A0 but not A1. D1 permits mixed old and new clients under the established legacy each meaning. D2 backfills and constrains the unit while retaining default each for A0 inserts. Without that default a counterexample rejects A0. Checks concern small SQLite clients, not an online deployment.',
      b,
    );
  }
  let b = text(28, 32, 'Implicit each → explicit each, with compatible writers', 23);
  b += text(28, 68, 'Named-column SQL · unchanged quantities · executed SQLite references', 18);
  const xs = [28, 258, 475];
  const widths = [230, 217, 217];
  for (let i = 0; i < 3; i++) b += rect(xs[i], 106, widths[i], 64, 'neutral');
  b +=
    text(44, 146, 'Schema state', 20) +
    text(274, 146, 'A0 · old client', 20) +
    text(491, 146, 'A1 · new client', 20);
  const rows = [
    {
      y: 170,
      h: 130,
      stage: ['D0', 'No unit column'],
      old: ['YES', 'Named columns'],
      next: ['NO', 'unit is absent'],
    },
    {
      y: 300,
      h: 162,
      stage: ['D1', 'Nullable unit'],
      old: ['YES', 'May insert NULL'],
      next: ['YES', 'NULL means each', 'Writes each'],
    },
    {
      y: 462,
      h: 194,
      stage: ['D2', 'Backfill + constraint', 'Default each'],
      old: ['YES', 'Omitted unit', 'receives default'],
      next: ['YES', 'Writes each', 'No NULL units'],
    },
  ];
  for (const r of rows) {
    for (let i = 0; i < 3; i++)
      b += rect(xs[i], r.y, widths[i], r.h, r.stage[0] === 'D2' ? 'mint' : 'fine');
    b += lines(44, r.y + 38, r.stage, 18, 34);
    b += lines(274, r.y + 38, r.old, 18, 34);
    b += lines(491, r.y + 38, r.next, 18, 34);
  }
  b += text(28, 704, 'Rows follow planned D0 → D1 → D2 order; YES means tested client scope.', 18);
  b += panel(
    28,
    736,
    664,
    'Rejected alternative · required unit with no default',
    [
      'A0 omits unit in its named-column INSERT; the insert fails.',
      'Retaining default each at D2 preserves that legacy writer.',
    ],
    'pending',
    19,
    22,
  ).markup;
  b += text(28, 920, 'Fresh D2 quantities: P100:4, P201:3, P202:2, P203:1, P204:0.', 18);
  b += text(
    28,
    958,
    'All units are each. Tiny table reconstruction is not an online-migration test.',
    18,
  );
  return svg(
    720,
    992,
    'Compatibility across an additive and constrained unit transition',
    'The matrix records tested named-column reference client support at D0, nullable D1 and backfilled constrained D2. Default each keeps A0 inserts valid. The no-default counterexample fails despite a valid new-client representation. Quantity meaning is fixed throughout; the reference does not certify online migration.',
    b,
  );
}
function repair(mobile) {
  const f = fixture.recovery;
  if (f.after_repair.P100.quantity !== 2 || f.after_repair.P900.quantity !== 8)
    throw new Error('Repair fixture changed.');
  if (mobile) {
    let b = text(20, 32, 'Three controls change different state', 19);
    b += text(20, 68, 'Fictional I7 and S9 · SQLite reference', 16);
    let y = 106;
    const add = (title, rows, cls = 'neutral') => {
      const p = panel(20, y, 320, title, rows, cls, 17, 20);
      b += p.markup;
      y += p.height + 46;
    };
    add('Same current snapshot', [
      'I7 overwrote 4→99 and 8→70.',
      'Legitimate S9 removed 2 from P100.',
      'Now P100:97; P900:70.',
    ]);
    b += text(20, y, 'Separate control → its specific effect', 16);
    y += 34;
    add('Disable F7 → admission', [
      'Block new import admissions.',
      'Stored quantities stay 97 and 70.',
    ]);
    add('A6 / A8 → application code', [
      'Compatible rollback or fix-forward',
      'Stored quantities stay 97 and 70.',
    ]);
    add(
      'C7 → conditional data repair',
      ['P100: 97 − 95 → 2', 'P900: 70 − 62 → 8', 'Preserves S9; requires provenance.'],
      'mint',
    );
    add('C7 guards and reference checks', [
      'Expected versions: P100 v2; P900 v1',
      'Exception → both updates roll back.',
      'Retry → 2 and 8; repeat → no change.',
      'Stale plan → reject all updates.',
    ]);
    add(
      'N7 remains separate',
      ['Delivered notification is fictional.', 'No recall or correction executed.'],
      'pending',
    );
    b += text(20, y + 4, 'Arrows in labels: control → affected state', 15);
    return svg(
      360,
      y + 38,
      'Admission, code changes and data repair are separate recovery actions',
      'The same post-I7 and post-sale snapshot feeds separate control choices. Disabling F7 and changing code leave stored quantities intact. Conditional C7 removes the erroneous deltas while preserving S9; transaction guards, an exception, retry and stale-plan references scope the evidence. N7 delivery remains a separate fictional obligation.',
      b,
    );
  }
  let b = text(28, 32, 'Containment is not persistent-data repair', 23);
  b += text(28, 68, 'Fictional incident · same current state for each control below', 18);
  b += panel(
    28,
    106,
    664,
    'After I7 overwrite and legitimate sale S9',
    [
      'I7: P100 4→99; P900 8→70. S9 then removes 2 from P100.',
      'Current P100:97 (v2); P900:70 (v1).',
    ],
    'neutral',
    19,
    22,
  ).markup;
  b +=
    path('M360 260v22H130v30m-5 -6l5 6l5 -6') +
    path('M360 282v30m-5 -6l5 6l5 -6') +
    path('M360 282H590v30m-5 -6l5 6l5 -6');
  b += panel(
    28,
    334,
    204,
    'Disable F7',
    ['New admissions stop.', 'Effect: admission', 'Data stays 97 / 70.'],
    'neutral',
    16,
    21,
    204,
  ).markup;
  b += panel(
    258,
    334,
    204,
    'A6 / A8 code',
    ['Rollback / fix-forward', 'Effect: installed code', 'Data stays 97 / 70.'],
    'neutral',
    16,
    20,
    204,
  ).markup;
  b += panel(
    488,
    334,
    204,
    'C7 data repair',
    ['97 − 95 → 2', '70 − 62 → 8', 'Preserve S9’s sale.'],
    'mint',
    17,
    20,
    204,
  ).markup;
  b += text(
    28,
    582,
    'Branch arrows: control choice → affected state, not a mandatory sequence.',
    17,
  );
  b += panel(
    28,
    614,
    664,
    'C7 · conditional and repeat-safe reference plan',
    [
      'Require verified I7 history; compare expected quantities and versions.',
      'Controlled exception: both updates roll back. Retry: fresh quantities 2 / 8.',
      'Repeat C7: already applied. A stale plan rejects all updates.',
    ],
    'mint',
    18,
    22,
  ).markup;
  b += panel(
    28,
    832,
    664,
    'Delivered N7 · separate obligation',
    [
      'Notification status is fictional; no delivery recall or correction was executed.',
      'The additive repair model does not establish every domain’s recovery rule.',
    ],
    'pending',
    18,
    22,
  ).markup;
  b += text(
    28,
    1018,
    'Only disposable SQLite data repair ran; no production rollback or incident fix.',
    17,
  );
  return svg(
    720,
    1052,
    'Distinct recovery controls preserve current-state evidence and later valid work',
    'Separate branches show admission disabling, code rollback or fix-forward, and conditional C7 data repair from the same current snapshot. C7 preserves the later sale, uses transaction and retry guards, and remains separate from notification N7. The executed checks concern only a disposable reference under the additive stock assumptions.',
    b,
  );
}
await mkdir(output, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['exposure', exposure],
  ['schema', schema],
  ['repair', repair],
]) {
  for (const mobile of [false, true]) {
    const filename = `release-${name}${mobile ? '-mobile' : ''}.svg`;
    const source = draw(mobile);
    await writeFile(resolve(output, filename), source);
    const [, width, height] = source.match(/width="(\d+)" height="(\d+)"/);
    manifest[`agentic-coding/${filename}`] = { width: Number(width), height: Number(height) };
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered six original release-and-recovery SVGs and registered their dimensions.');
