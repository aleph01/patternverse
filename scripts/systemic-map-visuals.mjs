import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'content/assets');
const directory = resolve(assets, 'systemic-therapy');
mkdirSync(directory, { recursive: true });

const styles = `
:root{color-scheme:only light;--paper:#ffffff;--ink:#252c28;--secondary:#a6aca3;--neutral:#f1f2ef;--mint:#edf5f0;--accent:#00855b}
svg{background:#ffffff;color:var(--ink)}
text{fill:var(--ink);font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}
path,rect,circle{vector-effect:non-scaling-stroke;stroke-linecap:butt;stroke-linejoin:round}
.paper{fill:var(--paper)}.person{fill:var(--neutral);stroke:var(--ink);stroke-width:1.15}
.school{fill:var(--paper);stroke:var(--ink);stroke-width:1.15}
.connection{fill:none;stroke:var(--secondary);stroke-width:1.25}
.added{fill:none;stroke:var(--accent);stroke-width:1.5}
.accent{fill:var(--accent)}.fine{fill:none;stroke:var(--secondary);stroke-width:1}
`;

const text = (x, y, value, size = 26, className = '', anchor = 'middle') =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}"${className ? ` class="${className}"` : ''}>${value}</text>`;
const path = (d, className = 'connection') => `<path d="${d}" class="${className}"/>`;
const person = (x, y, name, radius = 42, size = 26) =>
  `<circle cx="${x}" cy="${y}" r="${radius}" class="person"/>${text(x, y + 9, name, size)}`;
const school = (x, y, compact = false) => {
  const width = compact ? 120 : 112;
  return `<rect x="${x - width / 2}" y="${y - 36}" width="${width}" height="72" class="school"/>${text(x, y + 9, 'School', compact ? 28 : 26)}`;
};
const context = (x, y, label, detail, compact = false) =>
  text(x, y, label, compact ? 28 : 26, 'accent') +
  text(x, y + (compact ? 36 : 32), detail, compact ? 26 : 23) +
  path(`M${x - 48} ${y + (compact ? 53 : 48)}H${x + 48}`, 'added');

const svg = (width, height, composition) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-systemic-style="light-editorial">
<title id="title">The same morning, a wider map</title>
<desc id="desc">Two views of the same fictional school-attendance situation. Both connect Sam with Jo and school. The wider view also includes Jo's early shift, the bus arriving after the first lesson starts, and pending assessment of Sam's headaches. Green lines identify added connections. Lines are not causal arrows and the figure shows no treatment outcome.</desc>
<style>${styles}</style><rect width="${width}" height="${height}" class="paper"/>
${composition}
</svg>\n`;

const wide =
  text(220, 58, 'Initial frame', 28) +
  text(865, 58, 'Relevant context', 28) +
  path('M475 28V603', 'fine') +
  path('M193 303L112 439M247 303L325 434') +
  person(220, 270, 'Sam') +
  person(90, 470, 'Jo', 38) +
  school(350, 470) +
  text(220, 568, 'Sam, Jo, and school', 24) +
  path('M835 342L726 492M895 342L1023 484') +
  path('M865 168V268', 'added') +
  path('M635 263Q615 380 680 488', 'added') +
  path('M1085 263L907 296', 'added') +
  context(865, 120, 'Bus timetable', 'arrives after start') +
  context(635, 215, "Jo's work", 'early shift') +
  context(1085, 215, 'Headaches', 'assessment pending') +
  person(865, 310, 'Sam') +
  person(700, 520, 'Jo', 38) +
  school(1050, 520) +
  text(865, 598, 'Same situation; more relevant information', 24) +
  path('M32 651H85', 'added') +
  text(101, 658, 'Connections added in conversation', 23, '', 'start') +
  text(32, 696, 'All lines show reported connections, not causes.', 23, '', 'start');

const compact =
  text(330, 62, 'Initial frame', 30) +
  path('M300 241L167 350M360 241L493 344') +
  person(330, 210, 'Sam', 44, 28) +
  person(140, 380, 'Jo', 42, 28) +
  school(520, 380, true) +
  text(330, 455, 'Sam, Jo, and school', 26) +
  path('M32 490H628', 'fine') +
  text(330, 548, 'Relevant context', 30) +
  path('M300 992L167 1119M360 992L493 1114') +
  path('M330 703V916', 'added') +
  path('M155 828Q96 971 124 1111', 'added') +
  path('M505 828L371 943', 'added') +
  context(330, 650, 'Bus timetable', 'arrives after start', true) +
  context(155, 775, "Jo's work", 'early shift', true) +
  context(505, 775, 'Headaches', 'assessment pending', true) +
  person(330, 960, 'Sam', 44, 28) +
  person(140, 1150, 'Jo', 42, 28) +
  school(520, 1150, true) +
  text(330, 1225, 'Same situation; more relevant information', 26) +
  path('M42 1274H94', 'added') +
  text(111, 1282, 'Added in conversation', 26, '', 'start') +
  text(42, 1326, 'Lines show connections, not causes.', 26, '', 'start');

const figures = [
  ['relevant-system-school.svg', 1200, 730, wide],
  ['relevant-system-school-mobile.svg', 660, 1360, compact],
];
for (const [name, width, height, composition] of figures) {
  writeFileSync(resolve(directory, name), svg(width, height, composition));
}

// Upsert only this article's two entries into the current shared manifest.
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
for (const [name, width, height] of figures) {
  manifest[`systemic-therapy/${name}`] = { width, height };
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Created two system-map compositions and registered their dimensions.');
