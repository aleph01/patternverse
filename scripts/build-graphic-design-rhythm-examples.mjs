import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  assets = resolve(root, 'content/assets/graphic-design');
const ink = '#17352f';
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embedded = async (file) =>
  `data:image/jpeg;base64,${(await readFile(resolve(assets, file))).toString('base64')}`;
const text = (id, x, y, value, size = 22, weight = 400, fill = ink) =>
  `<text data-element="${id}" x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}"${fill === null ? '' : ` fill="${fill}"`}>${escape(value)}</text>`;
const photo = (id, source, x, y, width, height, extra = '') =>
  `<svg data-element="${id}"${extra} x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"><use href="#${source}"/></svg>`;
const essayRows = [
  {
    id: 'materials',
    source: 'photo',
    title: '01 / Materials',
    line1: 'Raw clay and simple tools.',
    line2: 'Start with what is at hand.',
  },
  {
    id: 'workspace',
    source: 'photo2',
    title: '02 / Workspace',
    line1: 'A clear table, ready for work.',
    line2: 'Leave room to move.',
  },
  {
    id: 'studio',
    source: 'photo3',
    title: '03 / Studio',
    line1: 'See work at different stages.',
    line2: 'Ask how each piece is made.',
  },
  {
    id: 'objects',
    source: 'photo4',
    title: '04 / Objects',
    line1: 'Small variations remain.',
    line2: 'Notice the marks of making.',
  },
];
const essay = (after) =>
  [
    text('brand', 65, 104, 'YARD / A DAY IN THE STUDIO'),
    text('headline', 65, 190, 'A maker’s Saturday', 38, 500),
    text('intro', 65, 236, 'Four views of a working day.', 22),
    ...essayRows.map((r, i) => {
      const right = after ? i % 2 === 1 : i === 2;
      const xPhoto = right ? 365 : 65,
        xCopy = right ? 65 : 275,
        y = 280 + i * 120;
      return (
        photo(r.id + '-photograph', r.source, xPhoto, y, 180, 100, i ? ' data-change="x"' : '') +
        '<g data-element="' +
        r.id +
        '-copy"' +
        (i ? ' data-change="transform"' : '') +
        ' transform="translate(' +
        xCopy +
        ' ' +
        y +
        ')">' +
        text('row-title', 0, 28, r.title, 24, 500) +
        text('row-line-1', 0, 60, r.line1, 18) +
        text('row-line-2', 0, 86, r.line2, 18) +
        '</g>'
      );
    }),
    text('url', 65, 820, 'yard.example/studio-diary', 20),
  ].join('');
const program = (after) =>
  [
    text('brand', 65, 104, 'YARD / OPEN STUDIO PROGRAM'),
    text('headline', 65, 195, 'A day of making', 38, 500),
    photo('photograph', 'photo', 65, 235, 480, 130),
    text('morning-title', 65, 420, 'MORNING / 09:00–12:00', 20, 700),
    ...['09:00 / Clay basics', '10:15 / Hand-building', '11:30 / Studio tour'].map((s, i) =>
      text('morning-' + i, 65, 460 + i * 40, s, 24),
    ),
    '<g data-element="afternoon-block" data-change="transform" transform="translate(0 ' +
      (after ? 50 : 0) +
      ')">' +
      text('afternoon-title', 65, 575, 'AFTERNOON / 13:30–17:00', 20, 700) +
      ['13:30 / Glazing demo', '14:45 / Print lab', '16:00 / Open tables']
        .map((s, i) => text('afternoon-' + i, 65, 615 + i * 40, s, 24))
        .join('') +
      '</g>',
    text('url', 65, 820, 'yard.example/open-studio', 20),
  ].join('');
const poster = (after) =>
  [
    text('brand', 65, 104, 'YARD / OPEN STUDIO SATURDAY'),
    ...['Look.', 'Make.', 'Share.'].map((s, i) =>
      text('word-' + i, 65, 205 + i * 80, s, (after ? [32, 48, 64] : [44, 56, 40])[i], 500).replace(
        ' x=',
        ' data-change="font-size" x=',
      ),
    ),
    photo('photograph', 'photo', 65, 420, 480, 230),
    text('date', 65, 720, 'Sat 14 Nov · 10:00–17:00', 26),
    text('venue', 65, 764, 'Yard Studio · Free entry', 22),
    text('url', 65, 820, 'yard.example/open-studio', 20),
  ].join('');
const specs = [
  {
    name: 'rhythm-studio-diary',
    photo: 'audience-pottery-photo.jpg',
    photo2: 'scale-workshop-photo-v2.jpg',
    photo3: 'form-open-studios-photo.jpg',
    photo4: 'explicit-tableware-photo.jpg',
    draw: essay,
    title: 'Studio diary: establish a recognizable alternation',
    before: 'BEFORE · A one-off side switch',
    after: 'AFTER · A repeatable left-right rhythm',
    description:
      'Only image x coordinates and complete copy-group x translations in rows 2, 3 and 4 change. Image-side order becomes left, right, left, right instead of left, left, right, left. The first row, all y positions, words, type styles, image dimensions/crops/source pixels, paper and lighting stay fixed. Original fictional editorial diary; alternation is contextual.',
    footer:
      'Only horizontal photo/copy placement changes in rows 2–4. Size, crop, words, type and intervals stay fixed.',
  },
  {
    name: 'rhythm-open-studio-program',
    photo: 'form-open-studios-photo.jpg',
    draw: program,
    title: 'Program: keep the beat, add a meaningful pause',
    before: 'BEFORE · The midday break feels slight',
    after: 'AFTER · A pause between two runs',
    description:
      'Only the complete afternoon block moves down by 50 layout units. All morning content and the afternoon block’s internal 40-unit baseline intervals stay fixed. The gap from the last morning baseline to the afternoon heading grows from 35 to 85 units. Copy, font styles, hierarchy, photograph/crop, paper and lighting remain identical. Original fictional program.',
    footer:
      'Only the complete afternoon block moves down. Internal intervals, copy, typography and photo stay fixed.',
  },
  {
    name: 'rhythm-look-make-share',
    photo: 'form-open-studios-photo.jpg',
    draw: poster,
    title: 'Poster: build a three-beat typographic crescendo',
    before: 'BEFORE · The middle word peaks',
    after: 'AFTER · Three beats build toward Share',
    description:
      'Only the three designated word font sizes change: 44, 56, 40 become 32, 48, 64, rising by 16 units each time. Copy, font family, weights, alignment, baselines, anchors, line breaks, photograph/crop, paper and lighting remain fixed. Original fictional poster whose brief culminates in sharing; no fixed reading-speed or attention result is claimed.',
    footer:
      'Only Look, Make and Share font sizes change. Weights, anchors, words, photo, crop and lighting stay fixed.',
  },
];
const stage = await embedded('scale-print-stage-v2.jpg');
for (const s of specs) {
  const defs = `<defs><image id="stage" width="610" height="915" href="${stage}"/>${(await Promise.all(['photo', 'photo2', 'photo3', 'photo4'].filter((key) => s[key]).map(async (key) => `<image id="${key}" width="1536" height="1024" href="${await embedded(s[key])}"/>`))).join('')}</defs>`;
  const meta = `<title id="title">${escape(s.title)}</title><desc id="description">${escape(s.description)}</desc><metadata>Original fictional Patternverse example. Selected generated photographs; separately authored print design. ${escape(s.description)}</metadata>`;
  const group = (after, x, y) =>
    `<g data-variant="${after ? 'after' : 'before'}" transform="translate(${x} ${y})"><use data-element="stage" href="#stage"/>${s.draw(after)}</g>`;
  const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1060" viewBox="0 0 1320 1060" role="img" aria-labelledby="title description">${meta}${defs}<rect width="1320" height="1060" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${text('after-label', 712, 44, s.after, 23, 500)}${group(false, 30, 70)}${group(true, 680, 70)}${text('comparison-label', 62, 1030, s.footer, 21)}</svg>`;
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="2070" viewBox="0 0 660 2070" role="img" aria-labelledby="title description">${meta}${defs}<rect width="660" height="2070" fill="#e8e5dc"/>${text('before-label', 62, 44, s.before, 23, 500)}${group(false, 25, 70)}${text('after-label', 62, 1064, s.after, 23, 500)}${group(true, 25, 1090)}${text('comparison-label', 62, 2050, 'Fictional example · Generated photographs', 22)}</svg>`;
  await writeFile(resolve(assets, s.name + '.svg'), wide + '\n');
  await writeFile(resolve(assets, s.name + '-mobile.svg'), mobile + '\n');
}
console.log('Built three visual-rhythm comparisons and their stacked versions.');
