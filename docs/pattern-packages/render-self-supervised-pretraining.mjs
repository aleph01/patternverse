import { lightEditorial } from './ml-illustration-style.mjs';
// Original two-stage workflow, with input/target pairs taken from the executable example.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const dom = new JSDOM(
  await readFile(
    resolve(root, 'content/assets/widgets/ml-self-supervised-pretraining.html'),
    'utf8',
  ),
  { runScripts: 'dangerously' },
);
let data;
try {
  data = JSON.parse(
    dom.window.eval(
      'JSON.stringify({raw:trainingLines[0],masked:makeExample(sentences[0],1,"masked"),causal:makeExample(sentences[0],3,"causal"),targets:fit(sentences,"causal").examples.length})',
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
    height = mobile ? 1250 : 800,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(16, 33, 26, 'Create targets.', true) +
      text(16, 64, 26, 'Transfer parameters.', true) +
      text(16, 91, 14, 'The pretraining task is not the final task.')
    : text(20, 40, 30, 'Create targets. Transfer parameters.', true) +
      text(20, 73, 16, 'The pretraining task and the final task have different targets.');
  body +=
    box(left, 110, wide, 95) + text(left + 12, 138, 18, 'Raw example · no intent annotation', true);
  body += text(left + 12, 174, 20, data.raw, true);
  for (const [i, [name, example]] of [
    ['Masked-token prediction', data.masked],
    ['Next-token prediction', data.causal],
  ].entries()) {
    const x = mobile ? 16 : 20 + i * 352,
      y = mobile ? 245 + i * 205 : 245;
    body += box(x, y, 328, 173) + text(x + 12, y + 28, 18, name, true);
    const parts = example.input.split(' ');
    body += text(x + 12, y + 66, 18, parts.slice(0, 3).join(' '), true);
    if (parts.length > 3) body += text(x + 12, y + 92, 18, parts.slice(3).join(' '), true);
    body += text(x + 12, y + 129, 17, 'Target from text: ' + example.target, true);
    body += text(
      x + 12,
      y + 155,
      13,
      i ? 'Future words withheld.' : 'Selected word hidden; context remains.',
    );
  }
  const train = mobile ? 665 : 470;
  body += box(left, train, wide, mobile ? 100 : 78);
  body += text(left + 12, train + 29, 18, '↓ Optimize the pretraining objective', true);
  body += text(left + 12, train + 57, 17, 'Learn encoder + word-prediction head.');
  if (mobile)
    body += text(
      left + 12,
      train + 83,
      13,
      'Toy corpus: 5 lines → ' + data.targets + ' token targets.',
    );
  if (!mobile)
    body += text(
      left,
      train + 105,
      14,
      'Toy corpus: 5 lines → ' + data.targets + ' token targets. No intent labels are created.',
    );
  const task = mobile ? 825 : 620;
  body += text(left, task - 21, 18, '↓ Reuse parameters for a new task', true);
  body +=
    box(left, task, wide, mobile ? 130 : 105) +
    text(left + 12, task + 28, 18, 'Reuse encoder; add intent head', true);
  body += text(left + 12, task + 59, 17, '“my parcel is late”', true);
  body += text(left + 12, task + 87, 17, '→ Delivery complaint', true);
  const evaluate = mobile ? 1015 : 746;
  if (mobile) {
    body +=
      box(left, evaluate, wide, 110) +
      text(left + 12, evaluate + 29, 18, '↓ Adapt, then evaluate', true) +
      text(left + 12, evaluate + 58, 15, 'Freeze encoder or fine-tune it.') +
      text(left + 12, evaluate + 86, 15, 'Test intent recognition independently.');
    body += text(left, 1170, 14, 'Lower word loss does not prove task accuracy.');
    body += text(left, 1202, 13, 'Illustrative neural workflow; fictional message labels.');
  } else {
    body += text(
      left,
      evaluate,
      17,
      'Adapt with task labels → test intent recognition independently.',
      true,
    );
    body += text(
      left,
      780,
      14,
      'Illustrative neural workflow. Lower word loss does not prove intent accuracy.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">Self-supervised pretraining and separate task adaptation</title><desc id="desc">Raw words create masked and next-token targets. Optimizing this prediction task learns model parameters. A separate labeled delivery-complaint example is used for adaptation, and independent intent evaluation is required. Token targets do not create intent annotations.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/self-supervised-pretraining' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Self-Supervised Pretraining desktop and phone illustrations.');
