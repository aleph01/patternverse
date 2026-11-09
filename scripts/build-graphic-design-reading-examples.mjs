import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets/graphic-design'),
  ink = '#17352f';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (name) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, name))).toString('base64')}`;
const text = (id, x, y, value, size = 22, weight = 400, extra = '') =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${ink}"${extra}>${escape(value)}</text>`;
const photo = (x, y, width, height) =>
  `<svg data-element="photograph" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#photo"/></svg>`;
const packingSteps = [
  ['Fill envelope', 'Add 20 dry seeds.', 'Keep the rim clear.'],
  ['Close envelope', 'Fold the flap inward.', 'Keep the seeds inside.'],
  ['Seal envelope', 'Tape across the flap.', 'Press the tape flat.'],
  ['Label envelope', 'Write the variety', 'and harvest year.'],
];
const procedure = (after) =>
  [
    text('brand', 65, 104, 'YARD GARDEN / SEED LIBRARY', 22),
    text('headline-1', 65, 207, 'Pack', 54, 500),
    text('headline-2', 65, 284, 'seeds.', 54, 500),
    photo(31, 333, 548, 200),
    ...packingSteps.map((lines, i) => {
      const x = 55 + (i % 2) * 265,
        y = 550 + Math.floor(i / 2) * 145;
      return `<g data-step="${i + 1}"><rect data-element="step-${i + 1}-boundary" x="${x}" y="${y}" width="245" height="116" rx="3" fill="none" stroke="${ink}" stroke-opacity="0.2"/>${after ? text('number-' + (i + 1), x + 10, y + 30, String(i + 1), 20, 700, ' data-intervention="step-number"') : ''}${text('step-' + (i + 1) + '-title', x + 45, y + 30, lines[0], 20, 500)}${text('step-' + (i + 1) + '-line-1', x + 45, y + 63, lines[1], 18)}${text('step-' + (i + 1) + '-line-2', x + 45, y + 91, lines[2], 18)}</g>`;
    }),
  ].join('');
const continuation = [
  'The patch stays visible.',
  'Its purpose is to make',
  'the jacket useful again.',
];
const editorial = (after) =>
  [
    text('brand', 65, 104, 'YARD JOURNAL / REPAIR NOTES', 22),
    text('headline-1', 65, 207, 'Keep it', 54, 500),
    text('headline-2', 65, 284, 'in use.', 54, 500),
    photo(31, 333, 548, 200),
    `<g data-part="opening" transform="translate(65 575)">${['At the repair table, a jacket', 'becomes a record of use.', 'The volunteer keeps the old', 'fabric and patches the tear.'].map((line, i) => text('opening-' + i, 0, i * 28, line, 18)).join('')}</g>`,
    `<g data-part="continuation" data-intervention="continuation-position" transform="translate(${after ? 65 : 335} 735)">${continuation.map((line, i) => text('continuation-' + i, 0, i * 28, line, 18)).join('')}</g>`,
    `<g data-part="aside" transform="translate(335 575)">${text('aside-heading', 0, 0, 'BRING ALONG', 20, 700)}${['One clean garment', 'Matching spare fabric', 'Your repair questions'].map((line, i) => text('aside-' + i, 0, 40 + i * 28, line, 18)).join('')}</g>`,
    text('footer', 65, 835, 'Repair notes · Autumn 2026', 18),
  ].join('');
const visitSteps = [
  {
    id: 1,
    title: '1. Check the session',
    lines: ['Clay workshop · Sat 14 Nov', '10:00–12:00 · Yard Studios'],
  },
  {
    id: 2,
    title: '2. Reserve your place',
    lines: ['yard.example/workshops', 'Booking closes 7 Nov'],
  },
  {
    id: 3,
    title: '3. Save confirmation',
    lines: ['Keep the emailed reference.', 'Bring it to the welcome desk.'],
  },
];
const visit = (after) =>
  [
    text('brand', 158, 155, 'YARD / FIRST VISIT', 18),
    text('headline-1', 158, 215, 'Plan your', 36, 500),
    text('headline-2', 158, 260, 'visit.', 36, 500),
    photo(138, 300, 334, 125),
    ...visitSteps.map((step, i) => {
      const index = after ? i : [0, 2, 1][i],
        change = step.id === 1 ? '' : ' data-intervention="mobile-position"';
      return `<g data-step="${step.id}"${change} transform="translate(158 ${452 + index * 102})">${text('visit-' + step.id + '-title', 0, 0, step.title, 20, 700)}${text('visit-' + step.id + '-line-1', 0, 31, step.lines[0], 17)}${text('visit-' + step.id + '-line-2', 0, 60, step.lines[1], 17)}</g>`;
    }),
    text('help', 158, 782, 'Help: hello@yard.example', 16),
  ].join('');
const specifications = [
  {
    name: 'reading-seed-procedure',
    photo: 'form-seed-packing-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    phone: false,
    title: 'Seed procedure: make an existing progression explicit',
    before: 'BEFORE · Four unnumbered topics',
    after: 'AFTER · Four ordered steps',
    draw: procedure,
    description:
      'Only four step numbers are added in existing card margins. All original words, card order, geometry, typography, colors, photograph/crop, paper and lighting remain identical. The underlying sequence Fill, Close, Seal, Label is unchanged. Fictional seed-library instruction sheet.',
    footer: 'Only four numbers are added. Original copy, cards, positions and styles stay fixed.',
  },
  {
    name: 'reading-editorial-thread',
    photo: 'core-message-repair-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    phone: false,
    title: 'Repair newsletter: keep a story continuation beneath its opening',
    before: 'BEFORE · Continuation under aside',
    after: 'AFTER · Story stays in one column',
    draw: editorial,
    description:
      'Only the intact three-line story continuation moves horizontally from x335 to x65. Its baseline, text, line breaks and styles remain fixed. Opening, clearly labeled aside, footer, photograph/crop, paper and lighting stay identical. Main-story source order is opening then continuation in both versions. Original fictional editorial text.',
    footer: 'Only the continuation moves sideways. The labeled aside and every word stay fixed.',
  },
  {
    name: 'reading-visit-preparation',
    photo: 'audience-pottery-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    phone: true,
    title: 'Visit preparation: align narrow visual order with the logical list',
    before: 'BEFORE · Mobile shows 1–3–2',
    after: 'AFTER · Mobile shows 1–2–3',
    draw: visit,
    description:
      'Only the vertical slots of intact steps 2 and 3 exchange. Source/list order is 1,2,3 in both variants; all numbered titles, text, fonts, sizes, weights, colors, left anchors, photograph/crop, phone and lighting remain fixed. A separate responsive HTML prototype tests desktop and narrow CSS order. Fictional static preparation page, not a booking service.',
    footer: 'Only steps 2 and 3 exchange vertical slots. Source order stays 1–2–3.',
  },
];
for (const s of specifications) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${await embedded(s.stage)}"/><image id="photo" width="1536" height="1024" href="${await embedded(s.photo)}"/></defs>`;
  const metadata = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example; shared generated photographic artwork. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 24, 500)}${text('after-label', 712, 44, s.after, 24, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 22)}</svg>`;
  const mobileWidth = s.phone ? 480 : 660,
    mobileX = s.phone ? -65 : 25,
    labelX = s.phone ? 30 : 62;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="${mobileWidth}" height="2070" viewBox="0 0 ${mobileWidth} 2070" role="img" aria-labelledby="title description">${metadata}${defs}<rect width="${mobileWidth}" height="2070" fill="#e8e5dc"/>${text('before-label', labelX, 44, s.before, 24, 500)}${group(false, mobileX, 70)}${text('after-label', labelX, 1064, s.after, 24, 500)}${group(true, mobileX, 1090)}${text('comparison-label', labelX, 2050, 'Fictional example · Generated photographs', s.phone ? 16 : 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
const proofPhoto = await embedded('audience-pottery-photo.jpg');
const proofSection = (variant) =>
  `<section class="${variant}" data-variant="${variant}"><h2>${variant === 'before' ? 'Before: narrow rule changes visual order' : 'After: visual and list order agree'}</h2><img alt="Generated pottery-workshop photograph" src="${proofPhoto}"/><ol class="steps">${visitSteps.map((step) => `<li data-step="${step.id}"><h3>${escape(step.title)}</h3>${step.lines.map((line) => `<p>${escape(line)}</p>`).join('')}</li>`).join('')}</ol></section>`;
const proof = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Reading order: responsive verification prototype</title><style>body{margin:0;background:#e8e5dc;color:#17352f;font-family:Arial,Helvetica,sans-serif}main{max-width:960px;margin:auto;padding:24px;box-sizing:border-box}h1{font-size:26px}h2{font-size:21px}section{background:#fffdf6;padding:20px;margin:24px 0}img{display:block;width:100%;height:160px;object-fit:cover}.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;list-style:none;padding:0;margin:28px 0 0}.steps li{min-width:0}.steps h3{font-size:20px;margin:0 0 14px}.steps p{font-size:17px;line-height:1.5;margin:4px 0;overflow-wrap:anywhere}@media(max-width:600px){main{padding:14px}section{padding:16px}.steps{grid-template-columns:1fr}.before [data-step="1"]{order:1}.before [data-step="2"]{order:3}.before [data-step="3"]{order:2}}</style></head><body><main><h1>Reading order: responsive comparison</h1><p>Original fictional verification prototype. Both lists retain source order 1–2–3. No booking interaction is implemented.</p>${proofSection('before')}${proofSection('after')}</main></body></html>\n`;
await writeFile(
  resolve(root, 'docs/pattern-packages/graphic-design-reading-responsive-proof.html'),
  proof,
);
console.log(
  'Built three controlled reading-order comparisons, mobile variants and responsive proof.',
);
