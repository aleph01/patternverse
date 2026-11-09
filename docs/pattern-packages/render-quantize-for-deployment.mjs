import { lightEditorial } from './ml-illustration-style.mjs';
// Original packed-code, quantization-grid, and output comparison from the executable fixture.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const slug = 'quantize-for-deployment';
const source = await readFile(resolve(root, `content/assets/widgets/ml-${slug}.html`), 'utf8');
const manifestPath = resolve(root, 'content/assets/manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const text = (x, y, size, value, bold = false) =>
  `<text x="${x}" y="${y}" font-size="${size}"${bold ? ' font-weight="700"' : ''}>${value}</text>`;
for (const mobile of [false, true]) {
  const dom = new JSDOM(source, {
    runScripts: 'dangerously',
    beforeParse(w) {
      Object.defineProperty(w, 'innerWidth', { value: mobile ? 360 : 1000 });
    },
  });
  let chart, r, alternate;
  try {
    chart = dom.window.document.querySelector('#mechanism').innerHTML;
    r = JSON.parse(dom.window.eval('JSON.stringify(report)'));
    alternate = JSON.parse(dom.window.eval("JSON.stringify(compute(4,8,'channel','narrow','D2'))"));
  } finally {
    dom.window.close();
  }
  for (const [name, color] of Object.entries({
    ink: '#24372f',
    panel: '#f2f6f2',
    paper: '#fff',
    accent: '#28684d',
    muted: '#53685b',
    line: '#b4c7b9',
    band: '#c8e1d2',
  }))
    chart = chart.replaceAll(`var(--${name})`, color);
  const width = mobile ? 360 : 720,
    height = mobile ? 1340 : 1220,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680,
    ch = mobile ? 900 : 800;
  let body = `<rect width="${width}" height="${height}" fill="#fff"/>`;
  body += mobile
    ? text(left, 36, 27, 'Smaller numbers.', true) +
      text(left, 73, 27, 'Different winner.', true) +
      text(left, 105, 14, 'A fictional classifier; computed conversion.')
    : text(left, 42, 27, 'A smaller grid can change the winner.', true) +
      text(
        left,
        82,
        16,
        'Six weights. Integer dot products. Floating-point output scaling and biases.',
      );
  body += `<svg x="${left}" y="125" width="${wide}" height="${ch}" viewBox="0 0 ${wide} ${ch}">${chart}</svg>`;
  const y = mobile ? 1070 : 970;
  body +=
    `<rect x="${left}" y="${y}" width="${wide}" height="${mobile ? 185 : 160}" rx="8" fill="#f2f6f2"/>` +
    text(left + 12, y + 30, 17, 'Count more than the weight codes', true);
  if (mobile)
    body +=
      text(
        left + 12,
        y + 64,
        14,
        'Shared grid: 3 + 4 + 8 + 4 = ' + r.model.bytes.length + ' bytes',
      ) +
      text(
        left + 12,
        y + 94,
        14,
        'Two grids: 3 + 8 + 8 + 4 = ' + alternate.model.bytes.length + ' bytes',
      ) +
      text(left + 12, y + 126, 13, 'Codes + weight scales + biases + input scale.') +
      text(
        left + 12,
        y + 158,
        14,
        'Two-grid winner on D2: ' + alternate.selected.quantizedWinner + '.',
      );
  else
    body +=
      text(
        left + 12,
        y + 64,
        15,
        'FP32 weights and biases: 32 bytes. Packed 4-bit weight codes alone: 3 bytes.',
      ) +
      text(
        left + 12,
        y + 96,
        14,
        'Shared grid: 3 code + 4 weight-scale + 8 bias + 4 input-scale bytes = ' +
          r.model.bytes.length +
          '.',
      ) +
      text(
        left + 12,
        y + 128,
        14,
        'Per-output scales: ' +
          alternate.model.bytes.length +
          ' bytes; D2 winner ' +
          alternate.selected.quantizedWinner +
          ' instead of ' +
          r.selected.quantizedWinner +
          '.',
      );
  body += mobile
    ? text(left, 1294, 13, 'Custom packed record; implicit zero points.') +
      text(left, 1320, 13, 'No graph-file, RAM, or speedup estimate.')
    : text(
        left,
        1188,
        14,
        'Custom packed record; implicit zero points. No model-file, RAM, or speedup estimate.',
      );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">Quantization can shrink storage while changing a model decision</title><desc id="desc">A fictional two-output classifier quantizes six weights to four-bit symmetric codes with one shared scale. Small A weights round to zero; B codes are seven, minus five, two. Input D2 has eight-bit codes 119,102,51. Integer sums zero and 425 give scores about 0.0500 and 0.0762 after floating output scaling and bias addition, changing the original float winner A to B. A number line shows the first A weight 0.12 rounding to zero. Per-output scales restore A in this example. Weight codes alone occupy three bytes, but the custom parameter record occupies nineteen bytes with one scale or twenty-three with two, versus thirty-two FP32 weight-and-bias bytes. No task accuracy or device performance is measured.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>${body}</svg>\n`;
  const asset = `machine-learning/${slug}${mobile ? '-mobile' : ''}.svg`;
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered quantization desktop and phone illustrations.');
