import { lightEditorial } from './ml-illustration-style.mjs';
// Compose an original temperature comparison and actual single-example student result.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const dom = new JSDOM(
  await readFile(resolve(root, 'content/assets/widgets/ml-knowledge-distillation.html'), 'utf8'),
  { runScripts: 'dangerously' },
);
const panels = [];
let result;
try {
  for (const temperature of [1, 2]) {
    dom.window.eval('session.temperature=' + temperature + ';render()');
    panels.push(dom.window.document.querySelector('svg > g').innerHTML);
  }
  result = JSON.parse(
    dom.window.eval(
      'advance(session,10);JSON.stringify(measure(session.logits,session.teacher,session.temperature,session.alpha))',
    ),
  );
} finally {
  dom.window.close();
}
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
const box = (x, y, w, h) =>
  '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="#f2f6f2"/>';
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const mobile of [false, true]) {
  const width = mobile ? 360 : 720,
    height = mobile ? 1180 : 770,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(16, 33, 26, 'Transfer more than', true) +
      text(16, 64, 26, 'the top answer.', true) +
      text(16, 91, 14, 'Training signals from a frozen teacher.')
    : text(20, 40, 29, 'Transfer more than the top answer.', true) +
      text(
        20,
        73,
        16,
        'A frozen teacher supplies a distribution; labels can supply a separate signal.',
      );
  body +=
    box(left, 115, wide, mobile ? 90 : 65) +
    text(left + 12, 145, 18, 'Teacher logits: [4, 2, 0]', true);
  body += text(left + 12, mobile ? 176 : 169, 14, 'Class order: Delivery, Billing, Account.');
  panels.forEach((panel, i) => {
    const x = mobile ? 16 : 20 + i * 352,
      y = mobile ? 245 + i * 235 : 220;
    body += '<g transform="translate(' + x + ',' + y + ')">' + panel + '</g>';
  });
  const note = mobile ? 718 : 460;
  if (mobile) {
    body +=
      text(left, note, 15, 'Higher T softens the distribution.') +
      text(left, note + 24, 15, 'The class ordering stays the same.') +
      text(left, note + 50, 14, 'Soft targets are not verified truth.');
  } else {
    body +=
      text(left, note, 15, 'Higher T softens the distribution; ordering stays.') +
      text(left, note + 26, 14, 'Soft targets are not new data or verified truth.');
  }
  const objective = mobile ? 790 : 525;
  body +=
    box(left, objective, wide, mobile ? 115 : 100) +
    text(left + 12, objective + 28, 18, 'True label: Delivery', true);
  body += text(left + 12, objective + 56, 17, '↓ Combine label loss and teacher loss', true);
  body += text(left + 12, objective + 84, 14, '(1 − α) CE + α T² KL(teacher || student)');
  const trained = mobile ? 950 : 635;
  body +=
    box(left, trained, wide, mobile ? 125 : 90) +
    text(left + 12, trained + 28, 18, 'Student after 10 actual steps', true);
  body += text(
    left + 12,
    trained + 56,
    16,
    'Delivery at T = 1: ' + (100 * result.r[0]).toFixed(1) + '% · loss ' + result.total.toFixed(3),
  );
  body += text(left + 12, trained + 82, 13, 'Training T = 2; α = 0.5; learning rate = 0.5.');
  if (mobile) {
    body += text(left, 1125, 14, 'One-case score model, not a neural network.');
    body += text(left, 1153, 13, 'No latency or held-out accuracy is measured.');
  } else {
    body += text(
      left,
      754,
      14,
      'One fictional training case with three free student scores. No generalization or speedup claim.',
    );
  }
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    width +
    '" height="' +
    height +
    '" viewBox="0 0 ' +
    width +
    ' ' +
    height +
    '" role="img" aria-labelledby="title desc"><title id="title">Knowledge distillation with softened teacher distributions</title><desc id="desc">Teacher scores [4, 2, 0] produce probabilities [86.7, 11.7, 1.6] percent at temperature one and [66.5, 24.5, 9.0] percent at temperature two. A one-case student combines teacher matching and a true Delivery label. After ten computed steps, its deployment probability for Delivery is 84.7 percent and total loss is 0.128.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/knowledge-distillation' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Knowledge Distillation desktop and phone illustrations.');
