import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets');
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 19, secondary = false) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${secondary ? '#626962' : '#252c28'}">${esc(value)}</text>`;
const rect = (x, y, width, height, accent = false, white = false) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${white ? '#fff' : accent ? '#edf5f0' : '#f1f2ef'}" stroke="${accent ? '#00855b' : '#a6aca3'}" stroke-width="1.2"/>`;
const arrow = (d) =>
  `<path d="${d}" fill="none" stroke="#00855b" stroke-width="1.5" marker-end="url(#arrow)"/>`;
function svg(title, description, width, height, drawing) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}rect,path{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}
const descriptions = {
  contract:
    "An external prober calls an instance's health endpoint. The handler reads declared local lifecycle and dependency observations and returns a small status. The observer applies configured timing and thresholds before changing routing, startup gating, or restart behavior. The endpoint does not perform those actions itself.",
  lifecycle:
    'Five lifecycle phases show liveness, startup, and readiness responses. Starting gives 200, 503, 503; ready gives three 200 responses; a required dependency outage gives 200, 200, 503; recovery gives three 200 responses; draining gives 200, 200, 503. Readiness loss does not imply a liveness failure or an automatic restart.',
};
const control = (d) =>
  `<path d="${d}" fill="none" stroke="#252c28" stroke-width="1.3" marker-end="url(#control)"/>`;
const finish = (...args) =>
  svg(...args).replace(
    '</defs>',
    '<marker id="control" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#252c28" stroke-width="1.2"/></marker></defs>',
  );
function contract(phone) {
  let d = text(
    24,
    34,
    phone ? 'Report evidence; apply policy' : 'The endpoint reports; the observer decides',
    phone ? 22 : 24,
  );
  if (phone) {
    d +=
      rect(24, 104, 312, 112) +
      text(40, 138, 'Prober / declared consumer', 20) +
      text(40, 182, 'Knows the question being asked.', 17, true);
    d += control('M300 216V358') + arrow('M70 360V218');
    d += text(104, 268, 'Health request', 17) + text(90, 320, 'Status / timing', 17, true);
    d +=
      rect(24, 360, 312, 176, true) +
      text(40, 394, 'Instance / health handler', 20) +
      text(40, 442, 'Small, explicit response.', 18) +
      text(40, 492, 'One snapshot per stateful probe.', 17, true);
    d += arrow('M300 648V538') + text(24, 596, 'Reads declared evidence', 17, true);
    d +=
      rect(24, 648, 312, 160) +
      text(40, 682, 'Local lifecycle + selected', 20) +
      text(40, 720, 'dependency observations', 20) +
      text(40, 774, 'Bounded check or aged snapshot.', 17, true);
    d += control('M336 160H348V1072H338');
    d +=
      rect(24, 992, 312, 176, true) +
      text(40, 1026, 'Observer owns the action', 20) +
      text(40, 1070, 'Configure routing, startup gating,', 17) +
      text(40, 1110, 'restart, or alert policy.', 17) +
      text(40, 1150, 'Endpoint does not act on itself.', 17, true);
    d += text(24, 1220, 'Timing and thresholds are configured.', 17, true);
    return finish(
      'The endpoint reports; the observer decides',
      descriptions.contract,
      360,
      1264,
      d,
    );
  }
  d +=
    rect(24, 96, 672, 112) +
    text(40, 132, 'External prober / declared consumer', 22) +
    text(40, 178, 'Choose the operational question and evaluate the matching signal.', 19, true);
  d +=
    control('M600 208V318') +
    arrow('M120 320V210') +
    text(400, 260, 'Health request', 18) +
    text(144, 290, 'Status / timed result', 18, true);
  d +=
    rect(24, 320, 672, 176, true) +
    text(40, 358, 'Instance / small health handler', 24) +
    text(40, 408, 'Read declared local lifecycle and selected dependency evidence.', 19) +
    text(40, 456, 'Return a small status; each stateful request reads one snapshot.', 19, true);
  d +=
    arrow('M172 584V498') +
    arrow('M548 584V498') +
    text(40, 550, 'Read', 17, true) +
    text(416, 550, 'Read', 17, true);
  d +=
    rect(24, 584, 296, 128) +
    text(40, 620, 'Lifecycle state', 22) +
    text(40, 670, 'Initialization / draining', 18, true);
  d +=
    rect(400, 584, 296, 128) +
    text(416, 620, 'Dependency observations', 21) +
    text(416, 670, 'Bounded checks / freshness', 17, true);
  d += control('M696 152H708V888H698');
  d +=
    rect(24, 808, 672, 160, true) +
    text(40, 846, 'Observer applies the matched policy', 22) +
    text(40, 890, 'Timing and thresholds govern routing, startup, restart, or alerts.', 19) +
    text(40, 936, 'The endpoint does not perform these actions itself.', 19, true);
  d += text(24, 1032, 'Arrows: probe/response, evidence reads, and observer control.', 18, true);
  return finish('The endpoint reports; the observer decides', descriptions.contract, 720, 1072, d);
}
// phase, live HTTP status, startup HTTP status, ready HTTP status
const rows = [
  ['starting', 200, 503, 503],
  ['ready', 200, 200, 200],
  ['dependency down', 200, 200, 503],
  ['recovered', 200, 200, 200],
  ['draining', 200, 200, 503],
];
function lifecycle(phone) {
  let d = text(
    24,
    34,
    phone ? 'Three signals, three decisions' : 'One policy, three separate HTTP signals',
    phone ? 22 : 24,
  );
  if (phone) {
    d += text(24, 80, 'The demo queries all three paths.', 17, true);
    for (const [i, r] of rows.entries()) {
      const y = 112 + i * 196;
      d += rect(24, y, 312, 160, r[3] === 200) + text(40, y + 32, r[0], 20);
      ['live', 'startup', 'ready'].forEach((v, j) => {
        d += text([40, 138, 236][j], y + 82, v, 17, true);
        d += text([40, 138, 236][j], y + 128, r[j + 1], 22);
      });
    }
    d +=
      text(24, 1136, 'Unready is not a restart instruction.', 17) +
      text(24, 1176, 'Requests read independent snapshots.', 17, true) +
      text(24, 1216, 'The observer supplies control policy.', 17, true) +
      text(24, 1256, 'Startup-gated probes normally wait.', 17, true);
    return finish('One policy, three separate HTTP signals', descriptions.lifecycle, 360, 1300, d);
  }
  d += text(24, 86, 'Example statuses; each request reads its own snapshot.', 19, true);
  d += rect(24, 112, 672, 64);
  ['Phase', '/livez', '/startupz', '/readyz'].forEach((v, i) => {
    d += text([40, 270, 400, 540][i], 152, v, 19);
  });
  for (const [i, r] of rows.entries()) {
    const y = 176 + i * 80;
    d += rect(24, y, 672, 80, r[3] === 200);
    r.forEach((v, j) => {
      d += text([40, 270, 400, 540][j], y + 48, v, j === 0 ? 20 : 22);
    });
  }
  d +=
    rect(24, 656, 672, 152) +
    text(40, 690, 'Required dependency down: unready, not a restart signal.', 20) +
    text(40, 736, 'Draining ends new-traffic eligibility; existing work can remain.', 18, true) +
    text(40, 780, 'Demo calls all paths; startup-gated probes normally wait.', 18, true);
  return finish('One policy, three separate HTTP signals', descriptions.lifecycle, 720, 848, d);
}
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['contract', contract],
  ['lifecycle', lifecycle],
])
  for (const phone of [false, true]) {
    const path = `software-engineering/health-endpoint-${name}${phone ? '-mobile' : ''}.svg`,
      source = draw(phone);
    await writeFile(resolve(assets, path), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[path] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Created health-contract collaboration and lifecycle-status figures with phone compositions.',
);
