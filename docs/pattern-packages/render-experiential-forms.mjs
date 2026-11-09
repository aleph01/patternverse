// Original article illustrations in the approved Architecture/Filmmaking language.
// The scenes express fictional examples, not diagnostic readings of bodies or symbols.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { planFigure, seatedFigure } from '../../scripts/architecture-figure-symbols.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = 'somatic-experiential';
await mkdir(resolve(root, 'content/assets', directory), { recursive: true });
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x, y, value, size = 17, cls = '', anchor = 'start') =>
  `<text x="${x}" y="${y}" font-size="${size}" class="${cls}" text-anchor="${anchor}">${esc(value)}</text>`;
const path = (d, cls = 'line', extra = '') => `<path d="${d}" class="${cls}" ${extra}/>`;
const rect = (x, y, w, h, cls = 'context') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"/>`;
const group = (x, y, body) => `<g transform="translate(${x} ${y})">${body}</g>`;
const leader = (d, cls = 'fine') => path(d, cls);
const chair = (x, floor) =>
  path(
    `M${x + 15} ${floor - 88}V${floor - 39}H${x - 24}M${x - 20} ${floor - 39}V${floor}M${x + 10} ${floor - 39}V${floor}`,
    'line',
  );
const seated = (x, y) => chair(x + 9, y + 153) + seatedFigure(x + 15, y + 84, 0.95, true);
const hand = (x, y, cls) =>
  `<g transform="translate(${x} ${y}) scale(.85)" class="${cls}">${path('M-12 56L-13 24-25 4Q-28-2-23-5Q-19-8-15-2L-8 8V-24Q-8-31-3-31Q2-31 2-24V-7L4-35Q5-41 10-40Q15-39 14-33L13-6L17-28Q18-34 23-33Q28-32 26-25L23-1L27-17Q29-23 34-21Q38-19 36-13L29 23Q26 36 14 42L14 56Z', 'hand-shape')}</g>`;

const style = `<style>
:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;fill:#252c28;letter-spacing:0}
path,rect,circle,ellipse,line{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.line{fill:none;stroke:#7c857c;stroke-width:1.25}.fine{fill:none;stroke:#a6aca3;stroke-width:1}.ground{fill:none;stroke:#d4d8d0;stroke-width:1}
.context{fill:#f1f2ef;stroke:#a6aca3;stroke-width:1}.tray{fill:#fafbf9;stroke:#899489;stroke-width:1.4}.sand{fill:#f1f2ef;stroke:none}.house-floor{fill:#fff;stroke:none}
.person{fill:#626962;stroke:none}.plan-head{fill:#fff;stroke:#626962;stroke-width:1}.accent .person,.accent .plan-head{fill:#00855b;stroke:#00855b;stroke-width:.7}
.accent-line{fill:none;stroke:#00855b;stroke-width:1.8}.accent-text{fill:#00855b}.quiet{fill:#626962}
.garden{fill:#edf5f0;stroke:#00855b;stroke-width:1.7}.plant{fill:#edf5f0;stroke:#a6aca3;stroke-width:1}
.hand-shape{fill:inherit;stroke:inherit;stroke-width:1.2}.hand-context{fill:#f1f2ef;stroke:#a6aca3}.hand-accent{fill:#edf5f0;stroke:#00855b}
</style>`;
function svg(width, height, title, description, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-illustration-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc>${style}<defs><marker id="arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L6 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${body}</svg>\n`;
}

function house(x, y, width, height, label = false) {
  const right = x + width,
    bottom = y + height;
  return (
    rect(x, y, width, height, 'house-floor') +
    path(
      `M${right} ${y + height * 0.32}V${y}H${x}V${bottom}H${right}V${y + height * 0.68}`,
      'line',
    ) +
    path(
      `M${right - 8} ${y + height * 0.32}H${right}M${right - 8} ${y + height * 0.68}H${right}`,
      'accent-line',
    ) +
    (label
      ? text(x + width / 2, y + height / 2 + 5, 'House', width < 65 ? 13 : 15, 'quiet', 'middle')
      : '')
  );
}

function miniatureTray(x, y, width = 300, height = 155) {
  return (
    rect(x, y, width, height, 'tray') +
    rect(x + 7, y + 7, width - 14, height - 14, 'sand') +
    rect(x + 28, y + 30, 76, 73, 'garden') +
    path(`M${x + 40} ${y + 55}h50M${x + 40} ${y + 70}h50M${x + 40} ${y + 85}h50`, 'fine') +
    house(x + 151, y + 58, 48, 48) +
    `<g class="accent">${planFigure(x + 215, y + 84, 0.4, -90)}</g>` +
    planFigure(x + 258, y + 45, 0.38, -90) +
    planFigure(x + 267, y + 87, 0.38, -90) +
    planFigure(x + 256, y + 126, 0.38, -90)
  );
}

function formCell(kind, x, y) {
  let body = '';
  if (kind === 'speak') {
    body =
      text(0, 0, 'Speak From the Position', 18) +
      seated(27, 0) +
      text(126, 79, '“I need', 24, 'accent-text') +
      text(126, 108, 'time.”', 24, 'accent-text') +
      leader('M65 79L109 83', 'accent-line') +
      text(0, 196, 'Speak in the first person.', 15, 'quiet');
  } else if (kind === 'address') {
    body =
      text(0, 0, 'Address It Directly', 18) +
      seated(13, 0) +
      chair(238, 153) +
      path('M74 85Q149 63 206 95', 'accent-line', 'marker-end="url(#arrow)"') +
      text(110, 39, '“I need you to wait.”', 17, 'accent-text') +
      text(0, 196, 'Give the words an addressee.', 15, 'quiet');
  } else if (kind === 'body') {
    body =
      text(0, 0, 'Give It Bodily Form', 18) +
      `<g transform="translate(58 27)"><path d="M15 27C3 28 0 43 7 49C17 58 31 48 31 38C32 31 24 26 15 27ZM11 55Q29 54 41 75L50 91L36 99L27 84L27 112L53 145L43 152L16 120L8 151H-3L0 111L-3 79Q-2 61 11 55Z" class="person"/>${path('M10 56Q30 52 42 78', 'accent-line')}</g>` +
      text(143, 77, '“There is no', 19, 'accent-text') +
      text(143, 104, 'point asking.”', 19, 'accent-text') +
      text(0, 196, 'Explore one possible posture.', 15, 'quiet');
  } else if (kind === 'amplify') {
    body =
      text(0, 0, 'Amplify What Is Emerging', 18) +
      hand(65, 108, 'hand-context') +
      hand(199, 64, 'hand-accent') +
      path('M102 140Q147 135 172 92', 'accent-line', 'marker-end="url(#arrow)"') +
      text(41, 171, 'Emerging', 13, 'quiet') +
      text(166, 171, 'Repeated / enlarged', 13, 'quiet') +
      text(0, 196, 'Explore the movement’s quality.', 15, 'quiet');
  }
  return group(x, y, body);
}

function overview(mobile) {
  const width = mobile ? 360 : 720,
    height = mobile ? 1220 : 820;
  let body = '';
  const kinds = ['speak', 'address', 'body', 'amplify'];
  kinds.forEach((kind, i) => {
    const x = mobile ? 24 : i % 2 ? 385 : 30;
    const y = mobile ? 40 + i * 230 : i < 2 ? 40 : 290;
    body += formCell(kind, x, y);
  });
  if (mobile) {
    for (const y of [245, 475, 705, 935]) body += path(`M24 ${y}H336`, 'ground');
    body +=
      text(24, 980, 'Build a Symbolic Scene', 18) +
      miniatureTray(24, 1010) +
      text(24, 1194, 'A scene can remain still.', 15, 'quiet');
  } else {
    body += path('M30 260H690M30 510H690', 'ground');
    body +=
      text(30, 550, 'Build a Symbolic Scene', 18) +
      miniatureTray(30, 584) +
      text(382, 632, 'A scene can remain still.', 19, 'accent-text') +
      text(382, 667, 'Positions and boundaries', 16, 'quiet') +
      text(382, 691, 'can carry a relationship.', 16, 'quiet') +
      text(30, 785, 'Related forms of expression; no required sequence.', 15, 'quiet');
  }
  return {
    width,
    height,
    body,
    title: 'Five ways to give experience a form',
    description:
      'A comparison, not a sequence: a seated person speaks a first-person sentence; another directs words toward an empty chair; a posture accompanies one person’s phrase about asking; the same hand is shown in two positions to explore a gesture; miniature figures, a house and a garden form a still scene. Green highlights the expressive element in each example. These fictional forms do not diagnose a feeling or prescribe an expression.',
  };
}

function garden(x, y, w, h) {
  return (
    rect(x, y, w, h, 'garden') +
    path(`M${x + 16} ${y + h - 25}H${x + w - 16}M${x + 16} ${y + h - 36}H${x + w - 16}`, 'fine') +
    `<circle cx="${x + w * 0.3}" cy="${y + h * 0.35}" r="${w * 0.1}" class="plant"/><circle cx="${x + w * 0.65}" cy="${y + h * 0.3}" r="${w * 0.12}" class="plant"/>`
  );
}

function scene(mobile) {
  const width = mobile ? 360 : 720,
    height = mobile ? 600 : 590;
  let body;
  if (mobile) {
    body =
      rect(16, 84, 328, 350, 'tray') +
      rect(24, 92, 312, 334, 'sand') +
      garden(44, 120, 107, 112) +
      house(184, 244, 57, 72, true) +
      `<g class="accent">${planFigure(259, 279, 0.55, -90)}</g>` +
      planFigure(306, 230, 0.48, -90) +
      planFigure(309, 301, 0.48, -90) +
      planFigure(299, 369, 0.48, -90) +
      text(22, 33, 'A protected place', 17) +
      text(22, 56, 'The wall protects.', 14, 'accent-text') +
      leader('M97 66V113') +
      text(182, 467, 'At the doorway', 16) +
      leader('M259 307V444') +
      text(179, 518, 'Others are waiting', 16) +
      leader('M314 386V493H306') +
      text(24, 566, 'The scene can remain still.', 17, 'accent-text');
  } else {
    body =
      rect(40, 96, 640, 350, 'tray') +
      rect(49, 105, 622, 332, 'sand') +
      garden(112, 158, 156, 154) +
      house(348, 224, 78, 88, true) +
      `<g class="accent">${planFigure(449, 268, 0.72, -90)}</g>` +
      planFigure(552, 187, 0.65, -90) +
      planFigure(580, 274, 0.65, -90) +
      planFigure(550, 368, 0.65, -90) +
      text(56, 42, 'A protected place', 20) +
      text(56, 69, 'The wall protects.', 16, 'accent-text') +
      leader('M192 78V150') +
      text(450, 42, 'Others are waiting', 20) +
      leader('M551 54V157') +
      text(388, 497, 'At the doorway', 20) +
      leader('M449 299V472') +
      text(56, 555, 'The scene can remain still.', 20, 'accent-text');
  }
  return {
    width,
    height,
    body,
    title: 'A symbolic scene can remain still',
    description:
      'Overhead view of a fictional sandtray. One green miniature stands at the doorway of a house; three gray figures face the house. A walled green garden stands apart. Callouts identify the garden as a protected place, the person at the doorway, and others waiting. The wall’s protective meaning comes from the fictional maker’s account. No arrow or rearranged scene prescribes a change.',
  };
}

const entries = [];
for (const [name, make] of [
  ['give-experience-a-form', overview],
  ['symbolic-scene', scene],
]) {
  for (const mobile of [false, true]) {
    const { width, height, body, title, description } = make(mobile);
    const asset = `${directory}/${name}${mobile ? '-mobile' : ''}.svg`;
    await writeFile(
      resolve(root, 'content/assets', asset),
      svg(width, height, title, description, body),
    );
    entries.push([asset, { width, height }]);
  }
}
// Read at the final write so registrations added by other work remain intact.
const manifestPath = resolve(root, 'content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [asset, size] of entries) manifest[asset] = size;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Rendered ${entries.length} light editorial article assets.`);
