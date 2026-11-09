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
  admission:
    'A request reaches a cheap admission decision before expensive work. If its trusted work cost fits the remaining budget, that cost is claimed and the operation runs. If it does not fit, the service returns an explicit overload result without invoking the operation or adding it to an internal waiting queue. Claimed budget returns after local completion and cleanup.',
  budget:
    'With capacity three, a running heavy search occupies two units. A second two-unit search would require four and is refused without invocation. A one-unit lookup fits exactly alongside the running search. After local work finishes and releases its units, a later heavy search can run. Policy units do not reserve execution threads or predict actual resource consumption.',
};
const control = (d) =>
  `<path d="${d}" fill="none" stroke="#252c28" stroke-width="1.3" marker-end="url(#control)"/>`;
const finish = (...args) =>
  svg(...args).replace(
    '</defs>',
    '<marker id="control" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#252c28" stroke-width="1.2"/></marker></defs>',
  );
function admission(phone) {
  let d = text(
    24,
    34,
    phone ? 'Refuse before expensive work' : 'Refuse before the expensive path',
    phone ? 22 : 24,
  );
  if (phone) {
    d +=
      rect(24, 80, 312, 80) +
      text(40, 110, 'Request / cheap checks', 20) +
      text(40, 140, 'Classify before protected work.', 17, true);
    d += control('M100 160V190');
    d +=
      rect(24, 192, 312, 144, true) +
      text(40, 226, 'Admission decision', 22) +
      text(40, 272, 'Does the declared cost fit?', 19) +
      text(40, 312, 'Trusted policy; cover all paths.', 17, true);
    d += arrow('M100 336V454') + control('M336 264H348V840H338');
    d +=
      rect(24, 456, 312, 160, true) +
      text(40, 488, 'Fits / claim budget', 20) +
      text(40, 530, 'Invoke the protected operation.', 17) +
      text(40, 574, 'Release after local cleanup.', 17, true);
    d +=
      rect(24, 760, 312, 160) +
      text(40, 792, 'Does not fit / refuse', 20) +
      text(40, 834, 'Operation is never invoked.', 17) +
      text(40, 878, 'No internal waiting queue.', 17, true);
    d +=
      text(24, 1016, 'The refusal path still costs work.', 18) +
      text(24, 1060, 'No silent promise to process later.', 17, true) +
      text(24, 1104, 'Arrows: admission control flow.', 17, true);
    return finish('Refuse before the expensive path', descriptions.admission, 360, 1144, d);
  }
  d +=
    rect(24, 96, 672, 104) +
    text(40, 132, 'Request / cheap parsing and trusted classification', 22) +
    text(40, 174, 'Decide before queries, allocations, or downstream fan-out.', 19, true);
  d += control('M360 200V278') + text(24, 246, 'Classified request', 17, true);
  d +=
    rect(24, 280, 672, 128, true) +
    text(40, 318, 'Admission decision', 24) +
    text(40, 366, 'Server-assigned cost / remaining work budget', 20);
  d +=
    arrow('M176 408V494') +
    control('M544 408V494') +
    text(40, 460, 'Fits', 18) +
    text(408, 460, 'Does not fit', 18);
  d +=
    rect(24, 496, 304, 160, true) +
    text(40, 530, 'Claim budget; invoke', 20) +
    text(40, 576, 'Protected operation starts.', 17) +
    text(40, 626, 'Release after local cleanup.', 17, true);
  d +=
    rect(392, 496, 304, 160) +
    text(408, 530, 'Return overload result', 20) +
    text(408, 576, 'Operation never invoked.', 17) +
    text(408, 626, 'No internal waiting queue.', 17, true);
  d +=
    rect(24, 736, 672, 176) +
    text(40, 774, 'Refusal still uses resources', 22) +
    text(40, 822, 'This boundary cannot reclaim costs already incurred upstream.', 19, true) +
    text(40, 868, 'An earlier layer may need to protect the admission gate.', 19, true);
  d += text(24, 984, 'Arrows: admission decisions and control flow.', 18, true);
  return finish('Refuse before the expensive path', descriptions.admission, 720, 1024, d);
}
function slots(x, y) {
  let s = '';
  for (let i = 0; i < 3; i++)
    s += `<rect x="${x + i * 44}" y="${y}" width="30" height="30" fill="${i < 2 ? '#00855b' : '#fff'}" stroke="${i < 2 ? '#00855b' : '#a6aca3'}" stroke-width="1.2"/>`;
  return s;
}
function budget(phone) {
  let d = text(
    24,
    34,
    phone ? 'Admit only work that fits' : 'A three-unit policy admits only work that fits',
    phone ? 22 : 24,
  );
  if (phone) {
    d +=
      rect(24, 112, 312, 160, true) +
      text(40, 146, 'Held heavy search / cost 2', 20) +
      slots(40, 186) +
      text(40, 248, '2 occupied / 1 available', 18, true);
    d += text(24, 316, 'While the first search is active', 18, true);
    d +=
      rect(24, 352, 312, 144) +
      text(40, 386, 'Next heavy / cost 2', 20) +
      text(40, 432, '2 + 2 = 4 > 3 / refused', 19) +
      text(40, 474, 'Callback is not invoked.', 17, true);
    d +=
      rect(24, 576, 312, 144, true) +
      text(40, 610, 'Light lookup / cost 1', 20) +
      text(40, 656, '2 + 1 = 3 / fits exactly', 19) +
      text(40, 698, 'Uses its available caller thread.', 17, true);
    d +=
      rect(24, 800, 312, 144, true) +
      text(40, 834, 'Held work finishes', 20) +
      text(40, 880, 'Returns 2 units after cleanup.', 17, true) +
      text(40, 922, 'Later heavy / cost 2 can run.', 17, true);
    d +=
      text(24, 1040, 'Same gate / capacity 3 policy units', 18) +
      text(24, 1080, 'Equality fits; cost is trusted policy.', 17, true) +
      text(24, 1120, 'No CPU, thread or rate reservation.', 17, true) +
      text(24, 1160, 'Only this process shares the budget.', 17, true) +
      text(24, 1200, 'No priority or fairness guarantee.', 17, true);
    return finish(
      'A three-unit policy admits only work that fits',
      descriptions.budget,
      360,
      1240,
      d,
    );
  }
  d +=
    rect(24, 112, 672, 160, true) +
    text(40, 148, 'Held heavy search / cost 2', 22) +
    slots(40, 190) +
    text(208, 214, '2 occupied / 1 available / capacity 3', 20, true);
  d += text(24, 320, 'While the first search is active', 20, true);
  d +=
    rect(24, 352, 312, 160) +
    text(40, 388, 'Next heavy / cost 2', 22) +
    text(40, 438, '2 + 2 = 4 > 3 / refused', 20) +
    text(40, 484, 'No invocation; no budget claim.', 17, true);
  d +=
    rect(384, 352, 312, 160, true) +
    text(400, 388, 'Light lookup / cost 1', 22) +
    text(400, 438, '2 + 1 = 3 / fits exactly', 20) +
    text(400, 484, 'Caller thread was already available.', 17, true);
  d +=
    rect(24, 624, 672, 112, true) +
    text(40, 662, 'Finish held work; release its 2 units', 22) +
    text(40, 706, 'Later heavy work can claim 2 units again.', 19, true);
  d +=
    rect(24, 800, 672, 136) +
    text(40, 838, 'A policy budget, not a hardware reservation', 22) +
    text(40, 882, 'No priority guarantee, timed rate, or fleet-wide accounting.', 19, true);
  return finish('A three-unit policy admits only work that fits', descriptions.budget, 720, 976, d);
}
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
const manifestPath = resolve(assets, 'manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, draw] of [
  ['admission', admission],
  ['budget', budget],
])
  for (const phone of [false, true]) {
    const path = `software-engineering/load-shedding-${name}${phone ? '-mobile' : ''}.svg`,
      source = draw(phone);
    await writeFile(resolve(assets, path), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[path] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Created admission and weighted-budget figures with separate phone compositions.');
