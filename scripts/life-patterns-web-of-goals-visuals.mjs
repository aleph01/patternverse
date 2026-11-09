import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Original activity/goal arrangements. Geometry is explanatory, never a score or causal model.
const directory = fileURLToPath(new URL('../content/assets/life-patterns/', import.meta.url));
const colors = {
  walk: { stroke: '#00855b', fill: '#edf5f0' },
  cooking: { stroke: '#7259b8', fill: '#f3eff9' },
  repair: { stroke: '#4e5851', fill: '#f0f2ef' },
};
const goals = {
  movement: { label: 'Movement', width: 174 },
  connection: { label: 'Connection', width: 190 },
  enjoyment: { label: 'Enjoyment', width: 174 },
  skills: { label: 'Practical skills', width: 220 },
  expenses: { label: 'Lower expenses', width: 222 },
  independence: { label: 'Independence', width: 224 },
};
const activities = [
  { id: 'walk', label: ['Walk with', 'a friend'], goals: ['movement', 'connection', 'enjoyment'] },
  { id: 'cooking', label: ['Shared', 'cooking'], goals: ['connection', 'skills', 'expenses'] },
  { id: 'repair', label: ['Repair', 'circle'], goals: ['skills', 'expenses', 'independence'] },
];

const escapeXml = (value) =>
  String(value).replace(
    /[<>&"']/g,
    (character) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[character],
  );

function text(x, y, lines, options = {}) {
  const { size = 24, color = '#252c28', anchor = 'middle', gap = 30 } = options;
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="${color}">${(Array.isArray(lines) ? lines : [lines]).map((line, index) => `<tspan x="${x}" dy="${index ? gap : 0}">${escapeXml(line)}</tspan>`).join('')}</text>`;
}

function svg(width, height, title, description, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-life-pattern="web-of-goals">
<title id="title">${escapeXml(title)}</title>
<desc id="desc">${escapeXml(description)}</desc>
<style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400}path,polygon,rect{stroke-linejoin:round;stroke-linecap:round}</style>
<rect width="${width}" height="${height}" fill="#fff"/>
${body}
</svg>\n`;
}

function goalNode(id, x, y, options = {}) {
  const { label, width } = goals[id];
  const { missing = false, size = 24, height = 46 } = options;
  return `<g data-goal="${id}" data-state="${missing ? 'unavailable' : 'possible'}">
<rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}" rx="8" fill="#fff" stroke="${missing ? '#92978f' : '#b9c0b7'}" stroke-width="1.4"${missing ? ' stroke-dasharray="5 5"' : ''}/>
${text(x, y + 8, label, { size, color: missing ? '#737b72' : '#252c28' })}
${missing ? `<path d="M${x - width / 2 + 13} ${y + 14}L${x + width / 2 - 13} ${y - 14}" fill="none" stroke="#737b72" stroke-width="2"/>` : ''}
</g>`;
}

function web(mobile) {
  const width = mobile ? 560 : 960;
  const height = mobile ? 930 : 650;
  const points = mobile
    ? {
        movement: [125, 165],
        connection: [340, 310],
        enjoyment: [100, 440],
        skills: [200, 650],
        expenses: [435, 510],
        independence: [420, 810],
      }
    : {
        movement: [165, 170],
        connection: [430, 295],
        enjoyment: [145, 465],
        skills: [430, 535],
        expenses: [730, 195],
        independence: [810, 500],
      };
  const labels = mobile
    ? { walk: [182, 315], cooking: [344, 442], repair: [365, 700] }
    : { walk: [230, 320], cooking: [510, 346], repair: [675, 415] };
  let body = text(28, 42, 'Build a web of goals', { size: mobile ? 30 : 32, anchor: 'start' });
  body += text(
    28,
    79,
    mobile
      ? ['Goals are shared points.', 'Each shaded shape is an activity.']
      : 'Goals are shared points. Each shaded shape is an activity.',
    { size: 22, anchor: 'start', gap: 28 },
  );
  // Draw the right-hand module first so the shared edge remains legible beneath the purple one.
  for (const activity of [...activities].reverse()) {
    const palette = colors[activity.id];
    body += `<polygon data-activity="${activity.id}" data-goals="${activity.goals.join(' ')}" points="${activity.goals.map((id) => points[id].join(',')).join(' ')}" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="2.5"/>`;
  }
  for (const activity of activities) {
    const [x, y] = labels[activity.id];
    body +=
      `<g data-activity-label="${activity.id}">` +
      text(x, y, activity.label, {
        size: mobile ? 26 : 25,
        color: colors[activity.id].stroke,
        gap: 31,
      }) +
      '</g>';
  }
  for (const [id, [x, y]] of Object.entries(points))
    body += goalNode(id, x, y, { size: mobile ? 25 : 24 });
  body += text(
    28,
    height - (mobile ? 54 : 39),
    mobile
      ? ['Possible contributions, not guarantees.', 'Lines do not represent causation.']
      : 'Possible contributions, not guarantees. Lines do not represent causation.',
    { size: 21, anchor: 'start', gap: 28, color: '#596158' },
  );
  return svg(
    width,
    height,
    'Three activities connected by shared goals',
    'An original goal web. Walking with a friend joins movement, connection, and enjoyment. Shared cooking joins connection, practical skills, and lower expenses. A repair circle joins practical skills, lower expenses, and independence. Goal labels are shared across the shaded activity shapes. Their positions and distances have no numerical meaning.',
    body,
  );
}

function adaptationPanel(x, y, mobile, missing) {
  const center = mobile ? 280 : 240;
  const left = mobile ? 139 : 131;
  const right = mobile ? 421 : 349;
  const top = mobile ? 120 : 110;
  const bottom = mobile ? 302 : 285;
  let body = `<g transform="translate(${x} ${y})" data-panel="${missing ? 'actual' : 'expected'}">`;
  body += text(mobile ? 28 : 30, 35, missing ? 'After one month' : 'Expected benefits', {
    anchor: 'start',
    size: mobile ? 28 : 26,
  });
  body += `<path d="M${left} ${top}L${right} ${top}" fill="none" stroke="#7259b8" stroke-width="2.5"/>`;
  body += `<path d="M${left} ${top}L${center} ${bottom}L${right} ${top}" fill="none" stroke="${missing ? '#92978f' : '#7259b8'}" stroke-width="2.5"${missing ? ' stroke-dasharray="7 6"' : ''}/>`;
  body += text(center, mobile ? 188 : 176, ['Shared', 'cooking'], {
    color: '#7259b8',
    size: mobile ? 27 : 25,
    gap: 30,
  });
  body += goalNode('connection', left, top, { size: mobile ? 25 : 23 });
  body += goalNode('skills', right, top, { size: mobile ? 25 : 23 });
  body += goalNode('expenses', center, bottom, { missing, size: mobile ? 25 : 23 });
  body += text(
    center,
    mobile ? 370 : 353,
    missing ? 'No expense benefit this month.' : 'Three purposes worth testing.',
    { color: '#596158', size: mobile ? 23 : 21 },
  );
  body += '</g>';
  return body;
}

function adaptation(mobile) {
  const width = mobile ? 560 : 960;
  const height = mobile ? 960 : 550;
  let body = text(28, 42, 'When one benefit disappears', {
    size: mobile ? 30 : 32,
    anchor: 'start',
  });
  body += text(
    28,
    79,
    mobile
      ? ['The activity can retain other value.', 'Its overall cost still needs a review.']
      : 'The activity can retain other value. Its overall cost still needs a review.',
    { size: 22, anchor: 'start', gap: 28 },
  );
  body += adaptationPanel(0, mobile ? 125 : 110, mobile, false);
  body += adaptationPanel(mobile ? 0 : 480, mobile ? 550 : 110, mobile, true);
  body += mobile
    ? '<path d="M28 535H532" fill="none" stroke="#d5d9d2" stroke-width="1"/>'
    : '<path d="M480 135V490" fill="none" stroke="#d5d9d2" stroke-width="1"/>';
  return svg(
    width,
    height,
    'Shared cooking before and after an expense expectation fails',
    'The first panel connects shared cooking with connection, practical skills, and lower expenses. The second keeps connection and practical skills linked while the lower-expenses node is crossed out and its links are dashed. The example does not assume the activity should continue: remaining value and costs still need review.',
    body,
  );
}

await mkdir(directory, { recursive: true });
const manifestPath = fileURLToPath(new URL('../content/assets/manifest.json', import.meta.url));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, content] of [
  ['web-of-goals.svg', web(false)],
  ['web-of-goals-mobile.svg', web(true)],
  ['web-of-goals-adaptation.svg', adaptation(false)],
  ['web-of-goals-adaptation-mobile.svg', adaptation(true)],
]) {
  await writeFile(`${directory}/${name}`, content);
  const [, width, height] = content.match(/width="(\d+)" height="(\d+)"/);
  manifest[`life-patterns/${name}`] = { width: Number(width), height: Number(height) };
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Wrote the goal web and adaptation comparison, with dedicated phone layouts.');
