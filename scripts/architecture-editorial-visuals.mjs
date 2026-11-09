// The approved editorial-plan drawing language and its original nine compositions.
// These are original conceptual relationships, never measured precedent drawings.
import { seatedFigure } from './architecture-figure-symbols.mjs';
const path = (d, cls = 'line') => `<path d="${d}" class="${cls}"/>`;
const rect = (x, y, w, h, cls = 'existing') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"/>`;
const circle = (x, y, r, cls = 'tree') => `<circle cx="${x}" cy="${y}" r="${r}" class="${cls}"/>`;
const text = (x, y, value, anchor = 'start') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}">${value}</text>`;
const tree = (x, y, r = 26) => circle(x, y, r) + path(`M${x - 4} ${y}h8M${x} ${y - 4}v8`, 'fine');
const arrow = (d) => `<path d="${d}" class="route" marker-end="url(#arrow)"/>`;
const chair = (x, y) =>
  rect(x, y, 33, 33, 'intervention') + path(`M${x - 3} ${y + 33}v-36h39v36`, 'line');

const drawings = {
  'site-repair': [
    // The valued garden and the disturbed corner are both visible before siting.
    () =>
      rect(57, 75, 446, 240, 'boundary') +
      rect(76, 93, 221, 167, 'landscape') +
      tree(142, 149, 36) +
      tree(236, 218, 25) +
      rect(355, 94, 126, 114) +
      rect(355, 208, 126, 52, 'disturbed') +
      arrow('M77 287H417V263') +
      path('M93 113V55H174M436 232H520V345H405', 'leader') +
      text(92, 44, 'Valued garden') +
      text(405, 361, 'Investigate') +
      text(405, 392, 'this ground'),
    // Both plans retain the same existing building and useful garden.
    () =>
      text(153, 48, 'Consumes garden', 'middle') +
      text(408, 48, 'Repairs edge', 'middle') +
      [43, 299]
        .map(
          (x) =>
            rect(x, 79, 218, 237, 'boundary') +
            rect(x + 16, 99, 119, 167, 'landscape') +
            tree(x + 60, 150, 24) +
            rect(x + 144, 100, 58, 91) +
            rect(x + 144, 191, 58, 74, 'disturbed') +
            path(`M${x + 16} 289h186`, 'route'),
        )
        .join('') +
      rect(67, 194, 58, 70, 'intervention') +
      rect(443, 194, 58, 70, 'intervention') +
      path('M472 264V289', 'route') +
      path('M96 264V289', 'route') +
      text(280, 366, 'Same brief. Different consequences.', 'middle'),
    // An axonometric fragment connects retained fabric, path and planted ground.
    () =>
      path('M53 244L280 131L507 244L280 357Z', 'boundary') +
      path('M86 239L211 177L303 223L178 286Z', 'landscape') +
      path('M198 271L424 158L475 184L249 297Z', 'path-surface') +
      path('M237 208L388 133V94L237 169Z', 'existing') +
      path('M237 169L388 94L401 101L250 176Z', 'paper') +
      path('M250 176L401 101V140L250 215Z', 'existing') +
      path('M237 208V169L388 94L401 101V140L250 215ZM237 169L250 176L401 101M250 176V215', 'line') +
      path('M102 247L147 224L199 250L154 273Z', 'intervention') +
      arrow('M248 283L433 191') +
      path('M327 128V57H402M140 249L90 307H50', 'leader') +
      text(402, 45, 'Retained wall', 'end') +
      text(51, 334, 'Restored ground') +
      text(345, 330, 'Clear route'),
  ],
  'courtyards-which-live': [
    () =>
      rect(54, 82, 452, 244, 'existing') +
      rect(129, 140, 302, 126, 'paper') +
      rect(145, 151, 269, 89, 'landscape') +
      // A protected sitting edge is beside, rather than in, the passing route.
      rect(157, 158, 65, 16, 'intervention') +
      tree(365, 189, 24) +
      path('M54 109H506M97 82V140M302 82V140M54 298H506M262 266V326', 'fine') +
      rect(173, 134, 31, 12, 'paper') +
      rect(357, 260, 31, 12, 'paper') +
      path(
        'M174 140V110M174 110A30 30 0 0 1 204 140M358 266V296M358 296A30 30 0 0 0 388 266',
        'fine',
      ) +
      rect(48, 242, 13, 32, 'paper') +
      rect(499, 242, 13, 32, 'paper') +
      arrow('M30 254H530') +
      text(163, 67, 'Useful rooms', 'middle') +
      text(279, 369, 'Doors make the connection.', 'middle'),
    // Sections keep sky exposure and enclosure legible without claiming a sun model.
    () =>
      text(147, 55, 'Narrow / tall', 'middle') +
      text(407, 55, 'Wider / lower', 'middle') +
      rect(53, 105, 48, 188) +
      rect(195, 105, 48, 188) +
      rect(303, 193, 34, 100) +
      rect(479, 193, 34, 100) +
      path('M43 294H252M292 294H523', 'line') +
      path('M149 265L102 105M149 265L194 105M407 265L338 193M407 265L478 193', 'fine') +
      // One useful sheltered edge, coordinated with the wider court.
      rect(443, 192, 38, 7, 'intervention') +
      path('M446 200V293', 'line') +
      path('M150 318V347H222M407 318V347H334', 'leader') +
      text(280, 377, 'Study the sky and the occupied edge.', 'middle'),
    // An open-sided spatial fragment reveals entry, sitting and passing space.
    () =>
      path('M66 248L281 141L496 248L281 356Z', 'paper') +
      path('M66 248L281 141L496 248L281 356Z', 'boundary') +
      path('M66 248V161L281 54V141Z', 'existing') +
      path('M281 54L496 161V248L281 141Z', 'existing') +
      path('M66 161L281 54L496 161M281 54V141', 'line') +
      // Door opening in the left wall is a real break, not a line through solid wall.
      path('M137 212V158L170 142V196Z', 'paper') +
      path('M137 212V158L170 142V196', 'fine') +
      path('M307 166L369 197L354 205L292 174Z', 'intervention') +
      path('M292 174L354 205V216L292 185Z', 'intervention') +
      path('M354 205L369 197V208L354 216Z', 'intervention') +
      path('M292 174L354 205L369 197M354 205V216', 'outline-green') +
      path('M220 230L285 197L351 230L285 263Z', 'landscape') +
      arrow('M141 229L236 277L365 277') +
      path('M341 196L424 123H490M155 180L97 101H48', 'leader') +
      text(491, 105, 'A place to sit', 'end') +
      text(48, 83, 'Usable door') +
      text(280, 392, 'Pass beside the sitting place.', 'middle'),
  ],
  'window-place': [
    () =>
      rect(111, 83, 366, 230, 'paper') +
      path('M111 142V83H477V313H111V257', 'wall-line') +
      // A gap with two fine glazing lines reads as a window in plan.
      path('M106 144V256M113 144V256', 'fine') +
      rect(128, 155, 123, 103, 'landscape') +
      chair(151, 182) +
      rect(203, 185, 31, 40) +
      path('M151 184L132 174M151 213L132 223', 'fine') +
      arrow('M437 286H282V236') +
      path('M166 166V46H230M317 286V358H379', 'leader') +
      text(230, 40, 'Seat + view', 'end') +
      text(380, 384, 'Clear approach', 'end'),
    // A schematic section explains the whole occupied edge, not a construction detail.
    () =>
      rect(124, 92, 29, 211) +
      rect(147, 116, 11, 127, 'paper') +
      path('M152 119V241M157 119V241', 'fine') +
      rect(153, 111, 88, 7, 'intervention') +
      path('M93 304H482M153 243H191V304', 'line') +
      rect(164, 246, 104, 13, 'intervention') +
      path('M171 259V304M261 259V304', 'line') +
      // The filled seated silhouette faces the window; feet meet the floor.
      seatedFigure(217, 192, 1.6) +
      path('M190 191L157 181', 'fine') +
      path('M137 117V316H310', 'outline-green') +
      path('M219 112V57H345M253 251L350 216H451', 'leader') +
      text(346, 49, 'Control direct sun', 'end') +
      text(453, 201, 'Support posture', 'end') +
      text(280, 371, 'Coordinate the whole window edge.', 'middle'),
    () =>
      text(149, 53, 'Blocks the route', 'middle') +
      text(409, 53, 'Makes a pocket', 'middle') +
      [43, 299]
        .map(
          (x) =>
            rect(x, 89, 218, 224, 'paper') +
            path(`M${x} 145V89h218v224H${x}v-55`, 'wall-line') +
            path(`M${x - 4} 146v110M${x + 3} 146v110`, 'fine'),
        )
        .join('') +
      rect(63, 174, 65, 88, 'existing') +
      arrow('M242 283H96V206') +
      rect(316, 145, 79, 95, 'landscape') +
      chair(333, 173) +
      arrow('M497 283H410V230') +
      text(280, 375, 'Keep movement beside occupation.', 'middle'),
  ],
};

const escape = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

export function renderEditorialVisual(
  slug,
  index,
  title,
  description,
  compact = false,
  fallbackBody,
) {
  const draw = drawings[slug]?.[index];
  if (!draw && !fallbackBody) throw new Error(`No editorial drawing for ${slug}:${index}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="410" viewBox="0 0 560 410" role="img" aria-labelledby="title desc" data-architecture-style="light-editorial">
<title id="title">${escape(title)}</title>
<desc id="desc">${escape(description)} Original conceptual drawing; not to scale.</desc>
<style>
:root{color-scheme:only light;--paper:#fff;--ink:#252c28;--stone:#f1f2ef;--line:#a6aca3;--mint:#edf5f0;--green:#00855b;--deep:#00855b}
svg{background:#fff;color:var(--ink)}
path,rect,circle,ellipse{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:butt}
text{fill:var(--ink);font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:${compact ? 21.777778 : 20.222222}px;font-weight:400;letter-spacing:0}
.on-accent{fill:#fff}
.paper{fill:var(--paper)}.existing{fill:var(--stone);stroke:var(--line);stroke-width:1.1}
.landscape{fill:var(--mint)}.tree{fill:var(--paper);stroke:var(--ink);stroke-width:1.1}
.intervention{fill:var(--green);stroke:var(--deep);stroke-width:.8}
.highlight-plane{fill:var(--mint);stroke:var(--green);stroke-width:1.3}
.line{fill:none;stroke:var(--ink);stroke-width:1.3}.wall-line{fill:none;stroke:var(--ink);stroke-width:1.8}
.fine,.leader{fill:none;stroke:var(--line);stroke-width:1.1}
.boundary{fill:none;stroke:var(--line);stroke-width:1.1}.disturbed{fill:url(#hatch);stroke:var(--line);stroke-width:.8}
.path-surface{fill:var(--stone);stroke:none}.route{fill:none;stroke:var(--green);stroke-width:1.4}
.outline-green{fill:none;stroke:var(--deep);stroke-width:1.6}
.wall{fill:var(--stone);stroke:var(--line);stroke-width:1}
.room{fill:var(--paper);stroke:var(--ink);stroke-width:1.6}
.garden,.retained{fill:var(--mint);stroke:var(--line);stroke-width:.8}
.new,.seat,.shade{fill:var(--green);stroke:var(--deep);stroke-width:.8}
.flow{fill:none;stroke:var(--green);stroke-width:1.4}
.thermal,.retained-line{fill:none;stroke:var(--deep);stroke-width:1.6}
.glass{fill:var(--mint);stroke:var(--deep);stroke-width:1}
.service{fill:var(--paper);stroke:var(--deep);stroke-width:1.2}
.light{fill:var(--mint)}
.person{fill:var(--ink);stroke:none}.plan-head{fill:var(--paper);stroke:var(--ink);stroke-width:1.1}
.warning{fill:none;stroke:var(--ink);stroke-width:1.2;stroke-dasharray:5 4}
.dashed{fill:none;stroke:var(--line);stroke-width:1;stroke-dasharray:5 4}
</style>
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.1"/></marker>
<pattern id="hatch" patternUnits="userSpaceOnUse" width="9" height="9"><path d="M-2 2L2 -2M0 9L9 0M7 11L11 7" stroke="var(--line)" stroke-width=".7"/></pattern>
</defs>
<rect width="560" height="410" class="paper"/>
${draw ? draw() : fallbackBody}
</svg>\n`;
}
