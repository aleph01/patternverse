import { lightEditorial } from './ml-illustration-style.mjs';
// Author separate desktop and phone compositions using the actual transformed arrays.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const dom = new JSDOM(
  await readFile(
    resolve(root, 'content/assets/widgets/ml-label-preserving-augmentation.html'),
    'utf8',
  ),
  { runScripts: 'dangerously' },
);
let panels, result;
try {
  panels = [...dom.window.document.querySelectorAll('svg > g')].map((g) => g.innerHTML);
  result = JSON.parse(
    dom.window.eval('JSON.stringify(inspect(transform(original,true,false,100),"presence",100))'),
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
const box = (x, y, width, height) =>
  '<rect x="' +
  x +
  '" y="' +
  y +
  '" width="' +
  width +
  '" height="' +
  height +
  '" rx="8" fill="#f2f6f2"/>';
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const mobile of [false, true]) {
  const width = mobile ? 360 : 720,
    height = mobile ? 1170 : 740;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(16, 33, 26, 'Same change.', true) +
      text(16, 64, 26, 'Different label.', true) +
      text(16, 91, 14, 'A horizontal flip depends on the task.')
    : text(20, 40, 30, 'Same change. Different label.', true) +
      text(20, 73, 16, 'A horizontal flip is safe only for targets it preserves.');
  panels.forEach((panel, i) => {
    const x = mobile ? 16 : 20 + i * 352,
      y = mobile ? 115 + i * 333 : 110;
    body += '<g transform="translate(' + x + ',' + y + ')">' + panel + '</g>';
  });
  if (mobile) body += text(16, 432, 15, '↓ Horizontal flip · same contrast');
  const changedY = mobile ? 777 : 438;
  body += text(
    mobile ? 16 : 20,
    changedY,
    15,
    result.changed + '/64 pixel values change; ' + result.foreground + ' remain foreground.',
  );
  for (const [i, [title, change, verdict]] of [
    [
      'Target: arrow presence',
      'Arrow present → Arrow present',
      'Copying the original label is valid.',
    ],
    ['Target: arrow direction', 'Right → Left', 'Copying the original label is invalid.'],
  ].entries()) {
    const x = mobile ? 16 : 20 + i * 352,
      y = mobile ? 805 + i * 110 : 468;
    body +=
      box(x, y, 328, 94) +
      text(x + 12, y + 26, 18, title, true) +
      text(x + 12, y + 52, 17, change, true) +
      text(x + 12, y + 77, 14, verdict);
  }
  if (mobile) {
    body += text(16, 1042, 15, '4 flip settings → ' + result.unique + ' unique images.');
    body += text(16, 1069, 14, 'This arrow is vertically symmetric.');
    body += text(16, 1110, 14, 'An inherited label is a task-specific claim.');
    body += text(16, 1140, 13, 'Synthetic example. No model accuracy is calculated.');
  } else {
    body += text(
      20,
      612,
      17,
      'Four horizontal/vertical flip settings produce ' + result.unique + ' unique images.',
      true,
    );
    body += text(
      20,
      641,
      15,
      'This arrow is vertically symmetric: a vertical flip adds no new pixel arrangement.',
    );
    body +=
      box(20, 676, 680, 44) +
      text(
        32,
        704,
        15,
        'Define the target → check the transformation → inherit only a justified label.',
        true,
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
    '" role="img" aria-labelledby="title desc"><title id="title">Label-preserving augmentation depends on the target</title><desc id="desc">An 8 by 8 right arrow is horizontally flipped into a left arrow. Both contain an arrow, but direction changes. Twelve pixel values change and 26 remain foreground. Four flip settings create two unique images because the source is vertically symmetric.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset =
    'machine-learning/label-preserving-augmentation' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Label-Preserving Augmentation desktop and phone illustrations.');
