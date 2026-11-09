import { lightEditorial } from './ml-illustration-style.mjs';
// Original collection-to-release diagram. Counts are fictional; no audio or model is executed.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const e = metadata.patterns.find((p) => p.id === 'ml-datasheets-for-datasets').example;
const released = e.candidate_clips - e.exclusions.reduce((n, x) => n + x.count, 0),
  seconds = released * e.clip_seconds;
const hours = Math.floor(seconds / 3600),
  minutes = Math.floor((seconds % 3600) / 60),
  remainder = seconds % 60;
const number = (n) => n.toLocaleString('en-US');
const manifestPath = resolve(root, 'content/assets/manifest.json'),
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
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
  esc(value) +
  '</text>';
const rect = (x, y, w, h, fill = '#f2f6f2', dash = false) =>
  '<rect x="' +
  x +
  '" y="' +
  y +
  '" width="' +
  w +
  '" height="' +
  h +
  '" rx="8" fill="' +
  fill +
  '" stroke="#b4c7b9"' +
  (dash ? ' stroke-dasharray="5 4"' : '') +
  '/>';

for (const mobile of [false, true]) {
  const width = mobile ? 360 : 720,
    height = mobile ? 1430 : 1040,
    left = mobile ? 16 : 20,
    wide = mobile ? 328 : 680;
  let body = '<rect width="' + width + '" height="' + height + '" fill="#fff"/>';
  body += mobile
    ? text(left, 36, 27, 'Files need', true) +
      text(left, 70, 27, 'a history.', true) +
      text(left, 103, 14, 'Fictional collection → documented release')
    : text(left, 43, 29, 'Files need a history.', true) +
      text(
        left,
        80,
        17,
        'Record units, selection rules, labels, and use conditions travel together.',
      );
  body +=
    rect(left, 130, wide, 100) +
    text(left + 12, 161, 19, e.dataset + ' ' + e.version, true) +
    text(
      left + 12,
      192,
      15,
      number(e.candidate_clips) + ' candidate clips · ' + e.pumps + ' pumps',
    ) +
    text(left + 12, 218, 14, '10 seconds · 16 kHz mono · indoor recordings');
  const ly = mobile ? 260 : 265,
    lw = mobile ? 328 : 305;
  body +=
    rect(left, ly, lw, 230) +
    text(left + 12, ly + 30, 19, 'Collection ledger ' + e.collection_ledger, true) +
    text(left + 12, ly + 65, 15, 'Start: ' + number(e.candidate_clips) + ' clips');
  e.exclusions.forEach(
    (x, i) =>
      (body += text(
        left + 12,
        ly + 98 + i * 32,
        15,
        '−' + number(x.count) + ' ' + x.reason.toLowerCase(),
      )),
  );
  body += text(left + 12, ly + 204, 16, 'Release: ' + number(released) + ' clips', true);
  const rx = mobile ? left : 345,
    ry = mobile ? 520 : 265,
    rw = mobile ? 328 : 355;
  body +=
    rect(rx, ry, rw, 190) +
    text(rx + 12, ry + 30, 19, 'What the release represents', true) +
    text(rx + 12, ry + 65, 17, number(released) + ' clips from ' + e.pumps + ' pumps', true) +
    text(rx + 12, ry + 97, 15, number(seconds) + ' seconds of audio') +
    text(
      rx + 12,
      ry + 129,
      15,
      hours + ' hours, ' + minutes + ' minutes, ' + remainder + ' seconds',
    ) +
    text(rx + 12, ry + 165, 14, 'Repeated clips remain related observations.');
  const sy = mobile ? 740 : 540,
    sh = mobile ? 270 : 155;
  body +=
    rect(left, sy, wide, sh) + text(left + 12, sy + 30, 19, 'Keep each pump in one split', true);
  e.splits.forEach((s, i) => {
    const x = mobile ? left + 12 : left + 12 + i * 220,
      y = mobile ? sy + 72 + i * 64 : sy + 67;
    body +=
      text(x, y, 16, s.name, true) +
      text(x, y + 26, 15, s.pumps + ' pumps · ' + number(s.clips) + ' clips');
  });
  const by = mobile ? 1040 : 730,
    bh = mobile ? 290 : 230;
  body +=
    rect(left, by, wide, bh) +
    text(
      left + 12,
      by + 30,
      19,
      mobile ? 'Meaning and maintenance' : 'Meaning, boundaries, maintenance',
      true,
    );
  const lines = mobile
    ? [
        'Labels describe controlled run conditions:',
        'normal or an induced bearing fault.',
        'Natural failures and outdoor conditions',
        'are not represented.',
        'Owner: ' + e.owner + ' · pipeline ' + e.pipeline,
        '1.1 corrects ' +
          e.correction.changed_labels +
          ' labels (' +
          ((100 * e.correction.changed_labels) / released).toFixed(1) +
          '%).',
        'Record changes and notify downstream users.',
      ]
    : [
        'Labels describe controlled normal or induced bearing-fault run conditions.',
        'Natural failures and outdoor conditions are not represented.',
        'Owner: ' + e.owner + ' · pipeline ' + e.pipeline + ' · pump-split manifest S1',
        'Release 1.1 corrects ' +
          e.correction.changed_labels +
          ' labels (' +
          ((100 * e.correction.changed_labels) / released).toFixed(1) +
          '%); identifiers and schema stay fixed.',
        'Record changes and notify downstream users.',
      ];
  lines.forEach((s, i) => (body += text(left + 12, by + 65 + i * 29, 15, s)));
  body += mobile
    ? text(left, 1372, 14, 'Fictional counts; no model performance claimed.') +
      text(left, 1400, 14, 'Documentation does not grant or enforce rights.')
    : text(
        left,
        1007,
        14,
        'Fictional counts · documentation does not grant rights or establish deployment validity.',
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
    '" role="img" aria-labelledby="title desc"><title id="title">A datasheet connects collection choices to a specific dataset release</title><desc id="desc">Fictional pump-sounds 1.0 starts with 12,000 clips. Sequential non-overlapping exclusions remove 300 unreadable files, 900 duplicate copies, and 800 clips with unverified run conditions. The release contains 10,000 ten-second clips from forty pumps, totaling 100,000 seconds of audio. Training, validation, and test contain separate groups of 28, six, and six pumps with 7,000, 1,500, and 1,500 clips. Labels describe controlled normal or induced-fault conditions, not future breakdowns. Release 1.1 corrects 150 labels, or 1.5 percent, while retaining identifiers and schema. Documentation does not grant rights or establish deployment validity.</desc><style>text{font-family:Helvetica,Arial,sans-serif;fill:#24372f}</style>' +
    body +
    '</svg>\n';
  const asset = 'machine-learning/datasheets-for-datasets' + (mobile ? '-mobile' : '') + '.svg';
  await writeFile(resolve(root, 'content/assets', asset), lightEditorial(svg));
  manifest[asset] = { width, height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered Datasheets for Datasets desktop and phone illustrations.');
