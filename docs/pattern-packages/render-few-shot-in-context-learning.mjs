import { lightEditorial } from './ml-illustration-style.mjs';
// Original prompt-construction illustration derived from the executable fictional example.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const source = await readFile(
  resolve(root, 'content/assets/widgets/ml-few-shot-in-context-learning.html'),
  'utf8',
);
const manifestPath = resolve(root, 'content/assets/manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const text = (x, y, size, value, bold = false) =>
  '<text x="' +
  x +
  '" y="' +
  y +
  '" font-size="' +
  size +
  '"' +
  (bold ? ' font-weight="700"' : '') +
  '>' +
  value +
  '</text>';

for (const mobile of [false, true]) {
  const dom = new JSDOM(source, {
    runScripts: 'dangerously',
    beforeParse(window) {
      Object.defineProperty(window, 'innerWidth', { value: mobile ? 360 : 1000 });
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
    height = mobile ? 1360 : 1000,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    chartHeight = mobile ? 810 : 440;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 35, 27, 'A few examples.', true) +
      text(left, 70, 27, 'The same weights.', true) +
      text(left, 103, 14, 'Prompt construction only; no model run.')
    : text(left, 42, 29, 'A few examples. The same weights.', true) +
      text(left, 80, 17, 'Select demonstrations → assemble context → condition a fixed model.');
  body +=
    '<svg x="' +
    left +
    '" y="125" width="' +
    wide +
    '" height="' +
    chartHeight +
    '" viewBox="0 0 ' +
    wide +
    ' ' +
    chartHeight +
    '">' +
    chart +
    '</svg>';
  const y = mobile ? 980 : 620;
  const sample = r.selected.find((e) => e.id === 'D1');
  body +=
    '<rect x="' +
    left +
    '" y="' +
    y +
    '" width="' +
    wide +
    '" height="245" rx="8" fill="#f2f6f2"/>' +
    text(left + 12, y + 30, 17, 'Inside the assembled prompt', true);
  body +=
    text(left + 12, y + 64, 14, 'Request: ' + sample.input) +
    text(left + 12, y + 92, 14, 'Label: ' + sample.label, true) +
    text(left + 12, y + 120, 13, 'Other selected examples omitted in this excerpt.');
  const queryLines = [];
  for (const word of ('New request: ' + r.query).split(' ')) {
    const last = queryLines.length - 1;
    if (last < 0 || (mobile && (queryLines[last] + ' ' + word).length > 36)) queryLines.push(word);
    else queryLines[last] += ' ' + word;
  }
  queryLines.forEach((line, i) => {
    body += text(left + 12, y + 160 + i * 24, 14, line);
  });
  body += text(left + 12, y + 160 + queryLines.length * 24 + 12, 14, 'Label:', true);
  body += mobile
    ? text(left, 1265, 14, r.characters + ' Unicode characters; not model tokens.') +
      text(left, 1300, 14, 'No response or accuracy is simulated.') +
      text(left, 1335, 13, 'Word overlap is a lexical selection heuristic.')
    : text(
        left,
        900,
        15,
        r.characters +
          ' Unicode characters · ' +
          r.labels.length +
          '/3 labels demonstrated · no inference performed.',
      ) +
      text(
        left,
        940,
        14,
        'Reversing order preserves this selected set and length but changes the sequence.',
      ) +
      text(
        left,
        978,
        14,
        'Fictional library examples; word overlap does not measure semantic fit or prediction quality.',
      );
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    width +
    '" height="' +
    height +
    '" viewBox="0 0 ' +
    width +
    ' ' +
    height +
    '" role="img" aria-labelledby="title desc"><title id="title">Task demonstrations change the inference context while model weights stay fixed</title><desc id="desc">The fictional library prompt selects D2, D1, and D3 using Jaccard word-overlap scores five tenths, two tenths, and two twelfths. Their request-label pairs precede a new request about renewing Dune. The exact prompt contains 369 Unicode characters and demonstrates two of three labels. A conceptual model would condition on these inputs with unchanged weights. Neither the illustration nor explorer performs inference or reports prediction quality.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset =
    'machine-learning/few-shot-in-context-learning' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Few-Shot In-Context Learning desktop and phone illustrations.');
