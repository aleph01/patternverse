import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets');
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

const descriptions = {
  states:
    'Closed admits calls and observes classified outcomes. A threshold opens the breaker and rejects new calls. After a cooldown, a subsequent call may enter half-open as a limited probe. A successful qualifying probe closes the breaker; a failed probe reopens it and restarts the cooldown.',
  trace:
    'Six sequential calls use one retained breaker. Two failures at time zero open it; a third call at zero is rejected locally. A probe fails at 100 milliseconds and reopens until 200. A call at 199 is rejected; a successful probe at 200 closes the breaker. Only four calls reach the simulated dependency.',
};
function states(phone) {
  let d = text(
    24,
    34,
    phone ? 'Admission follows breaker state' : 'Three states control admission to the dependency',
    phone ? 22 : 24,
  );
  if (phone) {
    d += card(
      24,
      112,
      312,
      'CLOSED / admit normal calls',
      'Observe classified outcomes.',
      false,
      128,
      true,
    );
    d += arrow('M224 240V350') + text(24, 300, 'Threshold reached', 17, true);
    d += card(
      24,
      352,
      312,
      'OPEN / reject new calls',
      'No dependency invocation.',
      true,
      128,
      true,
    );
    d += arrow('M224 480V590') + text(24, 540, 'Cooldown + next call', 17, true);
    d += card(
      24,
      592,
      312,
      'HALF-OPEN / limited probe',
      'Test the protected operation.',
      true,
      128,
      true,
    );
    d += text(24, 808, 'Probe outcomes / alternatives', 20);
    d += card(
      24,
      848,
      312,
      'Success / return to CLOSED',
      'Reset the chosen history.',
      true,
      128,
      true,
    );
    d += card(24, 1040, 312, 'Failure / return to OPEN', 'Restart the cooldown.', false, 128, true);
    d +=
      text(24, 1224, 'An inconclusive model probe reopens.', 16, true) +
      text(24, 1264, 'Cooldown permits testing, not full traffic.', 16, true) +
      text(24, 1304, 'Arrows: state changes; not call retries.', 16, true);
    return svg('Circuit breaker states and recovery rules', descriptions.states, 360, 1344, d);
  }
  d +=
    rect(208, 112, 304, 128) +
    text(224, 148, 'CLOSED', 22) +
    text(224, 188, 'Admit normal calls.', 18, true) +
    text(224, 220, 'Observe classified outcomes.', 17, true);
  d += arrow('M360 240V350') + text(376, 304, 'threshold reached', 17, true);
  d +=
    rect(208, 352, 304, 128, true) +
    text(224, 388, 'OPEN', 22) +
    text(224, 428, 'Reject new calls locally.', 18, true) +
    text(224, 460, 'Do not invoke the dependency.', 17, true);
  d += arrow('M360 480V590') + text(376, 544, 'cooldown + next call', 17, true);
  d +=
    rect(208, 592, 304, 128, true) +
    text(224, 628, 'HALF-OPEN', 22) +
    text(224, 668, 'Admit limited probes.', 18, true) +
    text(224, 700, 'Test the protected operation.', 17, true);
  d += arrow('M208 656H64V176H206') + text(80, 308, 'probe succeeds', 17, true);
  d +=
    arrow('M512 656H656V416H514') +
    text(524, 568, 'probe fails', 17, true) +
    text(524, 600, 'or inconclusive', 16, true);
  d +=
    rect(24, 824, 672, 144) +
    text(40, 856, 'Cooldown is permission to test, not proof of recovery', 20) +
    text(40, 902, 'The model uses one probe; production policies may evaluate several.', 17, true) +
    text(
      40,
      944,
      'Arrows show state transitions, not retries or cancellation of in-flight calls.',
      17,
      true,
    );
  return svg(
    'Closed, open and half-open circuit breaker transitions',
    descriptions.states,
    720,
    1008,
    d,
  );
}
const rows = [
  ['1', '0', 'normal call', 'failure', 'closed'],
  ['2', '0', 'normal call', 'failure', 'open'],
  ['3', '0', 'local rejection', 'not invoked', 'open'],
  ['4', '100', 'recovery probe', 'failure', 'open'],
  ['5', '199', 'local rejection', 'not invoked', 'open'],
  ['6', '200', 'recovery probe', 'written', 'closed'],
];
function trace(phone) {
  let d = text(
    24,
    34,
    phone
      ? 'Six requests; four invocations'
      : 'Local rejection and probe execution have different outcomes',
    phone ? 22 : 24,
  );
  if (phone) {
    for (let i = 0; i < rows.length; i++) {
      const [call, ms, admission, result, state] = rows[i],
        y = 112 + i * 168;
      d +=
        rect(24, y, 312, 120, admission === 'recovery probe') +
        text(40, y + 30, `${call} / ${ms} ms / ${admission}`, 18) +
        text(40, y + 74, `${result} / then ${state.toUpperCase()}`, 17, true);
    }
    d +=
      rect(24, 1184, 312, 176, true) +
      text(40, 1214, 'Four dependency invocations', 19) +
      text(40, 1258, 'Two local rejections never call write.', 16, true) +
      text(40, 1302, 'Rows: sequential request order.', 17, true) +
      text(40, 1344, 'Time: virtual milliseconds.', 17, true);
    return svg('Sequential warehouse writer admission trace', descriptions.trace, 360, 1400, d);
  }
  d += card(
    24,
    104,
    672,
    'One retained breaker / two counted failures / 100 ms cooldown',
    'A failed probe at 100 ms sets the next test boundary to 200 ms.',
    true,
    104,
  );
  for (const [x, label] of [
    [40, 'Call'],
    [112, 'Time / ms'],
    [232, 'Admission'],
    [432, 'Outcome'],
    [592, 'State after'],
  ])
    d += text(x, 264, label, 17, true);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i],
      y = 296 + i * 88;
    d += rect(24, y, 672, 72, row[2] === 'recovery probe');
    [40, 112, 232, 432, 592].forEach((x, k) => {
      d += text(x, y + 43, row[k], 17, k === 3);
    });
  }
  d +=
    rect(24, 896, 672, 144, true) +
    text(40, 928, 'Only four requests invoke the simulated dependency', 20) +
    text(
      40,
      972,
      'The two local rejections add no dependency result or counted failure.',
      17,
      true,
    ) +
    text(
      40,
      1014,
      'Rows show request order; times are virtual milliseconds, not measurements.',
      17,
      true,
    );
  return svg(
    'Warehouse writer trace with local rejections and recovery probes',
    descriptions.trace,
    720,
    1080,
    d,
  );
}
const dimensions = {};
for (const [name, draw] of [
  ['states', states],
  ['trace', trace],
])
  for (const phone of [false, true]) {
    const path =
      name === 'states'
        ? `data-engineering/circuit-breakers${phone ? '-mobile' : ''}.svg`
        : `software-engineering/circuit-breaker-trace${phone ? '-mobile' : ''}.svg`;
    const content = draw(phone);
    const [, width, height] = content.match(/viewBox="0 0 (\d+) (\d+)"/);
    await mkdir(resolve(assets, path.split('/')[0]), { recursive: true });
    await writeFile(resolve(assets, path), content);
    dimensions[path] = { width: Number(width), height: Number(height) };
  }
const path = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(path, 'utf8'));
await writeFile(path, JSON.stringify({ ...manifest, ...dimensions }, null, 2) + '\n');
console.log(
  'Reworked canonical state figure and phone layout; added warehouse trace pair and dimensions.',
);
