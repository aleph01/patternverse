import { lightEditorial } from './ml-illustration-style.mjs';
// Original evidence-flow illustration, derived from the executable fictional retrieval fixture.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-retrieval-augmented-generation.html'),
  'utf8',
);
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x, y, size, s, b = false) =>
  `<text x="${x}" y="${y}" font-size="${size}"${b ? ' font-weight="700"' : ''}>${escape(s)}</text>`;
const wrap = (s, n) =>
  s.split(' ').reduce((ls, w) => {
    const last = ls.length - 1;
    if (last < 0 || (ls[last] + ' ' + w).length > n) ls.push(w);
    else ls[last] += ' ' + w;
    return ls;
  }, []);
for (const mobile of [false, true]) {
  const dom = new JSDOM(source, {
    runScripts: 'dangerously',
    beforeParse(w) {
      Object.defineProperty(w, 'innerWidth', { value: mobile ? 360 : 1000 });
    },
  });
  let chart, r;
  try {
    chart = dom.window.document.querySelector('#mechanism').innerHTML;
    r = JSON.parse(dom.window.eval('JSON.stringify(report)'));
  } finally {
    dom.window.close();
  }
  chart = chart
    .replaceAll('var(--ink)', '#24372f')
    .replaceAll('var(--panel)', '#f2f6f2')
    .replaceAll('var(--band)', '#c8e1d2')
    .replaceAll('var(--accent)', '#28684d');
  const width = mobile ? 360 : 720,
    height = mobile ? 1430 : 940,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    ch = mobile ? 825 : 430;
  let body = `<rect width="${width}" height="${height}" fill="#fff"/>`;
  body += mobile
    ? text(left, 35, 27, 'Retrieve evidence.', true) +
      text(left, 70, 27, 'Check the answer.', true) +
      text(left, 103, 14, 'Fictional handbook; no model executed.')
    : text(left, 42, 29, 'Retrieve evidence. Check the answer.', true) +
      text(left, 80, 17, 'Question → eligible passages → context → generation → claim checking.');
  body += `<svg x="${left}" y="125" width="${wide}" height="${ch}" viewBox="0 0 ${wide} ${ch}">${chart}</svg>`;
  const y = mobile ? 990 : 590;
  body += `<rect x="${left}" y="${y}" width="${wide}" height="${mobile ? 310 : 240}" rx="8" fill="#f2f6f2"/>`;
  body += text(left + 12, y + 30, 17, 'From source to supported claim', true);
  let line = y + 65;
  for (const s of wrap('[P1] ' + r.selected[0].text, mobile ? 35 : 84)) {
    body += text(left + 12, line, 14, s);
    line += 24;
  }
  line += 15;
  body += text(left + 12, line, 14, 'Human-authored answer draft:', true);
  line += 28;
  for (const s of wrap(
    'Cancel without a fee at least 24 hours before the booking starts [P1].',
    mobile ? 35 : 84,
  )) {
    body += text(left + 12, line, 14, s);
    line += 24;
  }
  body += mobile
    ? text(left, 1345, 14, 'P5 concerns duration, not the cutoff.') +
      text(left, 1380, 14, 'A citation must support its claim.') +
      text(left, 1415, 13, 'Scores measure word relevance, not truth.')
    : text(
        left,
        875,
        15,
        'P5 is retrieved too, but its booking-duration rule does not support the cancellation claim.',
      ) +
      text(
        left,
        916,
        14,
        'Current public evidence: P1 at 2.8669; P5 at 2.2906. Citation presence is not verification.',
      );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">Retrieved evidence enters the context; answer support still needs checking</title><desc id="desc">For a fictional Cedar Hall cancellation question, current public passages P1 and P5 score 2.8669 and 2.2906. P1 states a 24-hour cancellation cutoff; P5 concerns booking duration. Metadata filtering excludes superseded P2 and staff-only P4. An illustrated human-authored draft cites P1. Generation and semantic support checking are conceptual, not executed.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>${body}</svg>\n`;
  const asset =
    'machine-learning/retrieval-augmented-generation' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Retrieval Augmented Generation desktop and phone illustrations.');
