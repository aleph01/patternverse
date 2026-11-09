import { lightEditorial } from './ml-illustration-style.mjs';
// Original model-host-tool feedback diagram, derived from executable local service rules.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-tool-augmented-interaction.html'),
  'utf8',
);
const manifestPath = resolve(root, 'content/assets/manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x, y, size, s, b = false) =>
  `<text x="${x}" y="${y}" font-size="${size}"${b ? ' font-weight="700"' : ''}>${escape(s)}</text>`;
for (const mobile of [false, true]) {
  const dom = new JSDOM(source, {
    runScripts: 'dangerously',
    beforeParse(w) {
      Object.defineProperty(w, 'innerWidth', { value: mobile ? 360 : 1000 });
    },
  });
  let chart, r, lost;
  try {
    chart = dom.window.document.querySelector('#mechanism').innerHTML;
    r = JSON.parse(dom.window.eval('JSON.stringify(report)'));
    lost = JSON.parse(dom.window.eval("JSON.stringify(compute(3,'clerk',true,'lost',1).final)"));
  } finally {
    dom.window.close();
  }
  chart = chart
    .replaceAll('var(--ink)', '#24372f')
    .replaceAll('var(--panel)', '#f2f6f2')
    .replaceAll('var(--accent)', '#28684d');
  const width = mobile ? 360 : 720,
    height = mobile ? 1460 : 960,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    ch = mobile ? 1020 : 590;
  let body = `<rect width="${width}" height="${height}" fill="#fff"/>`;
  body += mobile
    ? text(left, 35, 27, 'Propose. Check.', true) +
      text(left, 70, 27, 'Execute. Observe.', true) +
      text(left, 103, 14, 'Fictional equipment desk; scripted model.')
    : text(left, 42, 29, 'Propose. Check. Execute. Observe.', true) +
      text(
        left,
        80,
        17,
        'One loop, separate responsibilities. No language model or real booking runs.',
      );
  body += `<svg x="${left}" y="125" width="${wide}" height="${ch}" viewBox="0 0 ${wide} ${ch}">${chart}</svg>`;
  const y = mobile ? 1190 : 760;
  body += `<rect x="${left}" y="${y}" width="${wide}" height="${mobile ? 180 : 145}" rx="8" fill="#f2f6f2"/>`;
  body +=
    text(left + 12, y + 30, 17, 'A result must actually arrive', true) +
    text(left + 12, y + 64, 14, 'request_key: ' + r.envelope.request_key) +
    text(left + 12, y + 95, 14, 'Receipt: R1 · reserved 3 · remaining ' + r.final.available, true);
  body += mobile
    ? text(left + 12, y + 128, 14, 'Lost acknowledgement:') +
      text(left + 12, y + 157, 14, 'client ' + lost.client + '; server still has R1.')
    : text(
        left + 12,
        y + 128,
        14,
        'If the acknowledgement is lost: client ' +
          lost.client +
          '; simulated server still has R1.',
      );
  body += mobile
    ? text(left, 1410, 14, 'Same-key retry returns R1; no second write.') +
      text(left, 1444, 13, 'Atomic service contract assumed; local state only.')
    : text(
        left,
        944,
        14,
        'A repeated request key deduplicates only under the service contract, for the same logical intent.',
      );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">A proposed call is checked, executed, and observed through a tool loop</title><desc id="desc">The fictional default reads five tripods and checks a scripted call to reserve three. An authorized confirmed request creates R1 once and leaves two available. A delivered receipt can inform the next model turn. If the first successful write response is lost, the client sees UNKNOWN although the simulated server holds R1. Reusing the same request key returns that receipt without another reservation. Model inference, real authentication, and real bookings are not performed.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>${body}</svg>\n`;
  const asset = 'machine-learning/tool-augmented-interaction' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Tool-Augmented Interaction desktop and phone illustrations.');
