// Original, editable teaching drawings. They illustrate spatial relationships,
// never construction instructions or measured plans of the photographed precedents.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spatialDrawings } from './architecture-spatial-visuals.mjs';
import { editorialLabel } from './architecture-visual-labels.mjs';
import { renderEditorialVisual } from './architecture-editorial-visuals.mjs';
import { standingFigure, planFigure, seatedFigure } from './architecture-figure-symbols.mjs';
const root = resolve(import.meta.dirname, '..');
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const r = (x, y, w, h, c = 'wall', rx = 0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${c}"/>`;
const l = (x, y, a, b, c = 'line') => `<path d="M${x} ${y}L${a} ${b}" class="${c}"/>`;
const p = (d, c = 'line') => `<path d="${d}" class="${c}"/>`;
const t = (x, y, s) => {
  const label = editorialLabel(s);
  const left = Math.max(24, Math.min(x, 536 - label.length * 11.5));
  const onAccent = ['Formal test', 'Valid test', 'Recycle'].includes(label);
  return `<text x="${left}" y="${y}"${onAccent ? ' class="on-accent"' : ''}>${esc(label)}</text>`;
};
const circle = (x, y, rad, c = 'tree') => `<circle cx="${x}" cy="${y}" r="${rad}" class="${c}"/>`;
const a = (x, y, u, v, c = 'flow') =>
  `<path d="M${x} ${y}L${u} ${v}" class="${c}" marker-end="url(#arrow)"/>`;
const room = (x, y, w, h, label) => r(x, y, w, h, 'room') + (label ? t(x + 12, y + 34, label) : '');
const seat = (x, y) => r(x, y, 44, 18, 'seat', 4);
const tree = (x, y) => circle(x, y, 22) + l(x, y - 13, x, y + 13) + l(x - 11, y, x + 11, y);
const figure = (x, y, view = 'section') =>
  view === 'plan' ? planFigure(x, y, 0.7) : standingFigure(x, y + 40, 74, view !== 'section-left');
const win = (x, y, w, h = 6) => r(x, y, w, h, 'glass');
const gap = (x, y, w, h) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--paper)"/>`;
const drawings = {};
const define = (slug, items) => {
  drawings[slug] = items;
};
define('courtyards-which-live', [
  [
    'A court on the daily route',
    room(45, 100, 470, 240) +
      r(150, 157, 260, 130, 'garden') +
      t(215, 207, 'COURT') +
      room(50, 105, 130, 48, 'café') +
      room(340, 290, 168, 45, 'shared room') +
      gap(95, 148, 40, 10) +
      gap(370, 285, 40, 10) +
      gap(40, 235, 10, 40) +
      gap(510, 235, 10, 40) +
      a(30, 255, 530, 255) +
      seat(190, 170) +
      tree(355, 200) +
      t(48, 365, 'Doors connect occupied edges to the court.'),
  ],
  [
    'Enclosure changes the sky',
    p('M55 320V110h65v210m70 0V110h65v210') +
      p('M325 320V235h45v85m100 0V235h45v85') +
      a(160, 92, 160, 235) +
      a(420, 112, 420, 285) +
      t(55, 350, 'Narrow / tall') +
      t(325, 350, 'Wider / lower') +
      t(48, 385, 'Compare sun, shade and airflow by season.', 18),
  ],
  [
    'An invitation to stay',
    room(45, 105, 200, 210) +
      r(92, 150, 105, 115, 'garden') +
      t(63, 350, 'View-only void') +
      room(310, 105, 200, 210) +
      r(345, 150, 130, 115, 'garden') +
      seat(355, 160) +
      tree(445, 230) +
      gap(305, 267, 12, 36) +
      gap(505, 267, 12, 36) +
      a(270, 285, 370, 285) +
      a(450, 285, 530, 285) +
      t(317, 350, 'Doors + purpose'),
  ],
]);
define('light-on-two-sides', [
  [
    'A second direction of light',
    room(45, 120, 205, 200) +
      win(43, 160, 7, 95) +
      p('M52 164L210 145L210 290L52 250', 'light') +
      room(310, 120, 205, 200) +
      win(308, 160, 7, 95) +
      win(375, 118, 95) +
      p('M317 164L490 155L490 285L317 250Z', 'light') +
      p('M378 125L350 295L485 295L465 125Z', 'light') +
      t(54, 355, 'One opening') +
      t(319, 355, 'Two directions'),
  ],
  [
    'Light at the task',
    p('M70 325V110h420v215') +
      win(68, 130, 8, 140) +
      p('M80 135L400 290L400 320L80 265Z', 'light') +
      r(280, 260, 140, 12) +
      figure(310, 270, 'section-left') +
      r(60, 122, 85, 10, 'shade') +
      t(175, 165, 'Control direct sun') +
      t(180, 350, 'Check glare from the occupied view.'),
  ],
  [
    'Form makes the opportunity',
    room(40, 125, 200, 195) +
      r(90, 170, 150, 150, 'wall') +
      t(55, 350, 'Corner access') +
      room(300, 125, 75, 195) +
      room(375, 250, 140, 70) +
      win(298, 145, 6, 85) +
      win(373, 145, 6, 85) +
      t(305, 350, 'Shallow wings') +
      t(47, 388, 'More perimeter also means more envelope.', 18),
  ],
]);
define('reuse-before-replacement', [
  [
    'Three ways to meet one brief',
    room(40, 120, 140, 160) +
      r(55, 140, 110, 120, 'retained') +
      room(210, 120, 140, 160) +
      r(225, 140, 70, 120, 'retained') +
      r(295, 140, 40, 120, 'new') +
      room(380, 120, 140, 160) +
      r(395, 140, 110, 120, 'new') +
      t(48, 320, 'Repair') +
      t(217, 320, 'Adapt + add') +
      t(390, 320, 'Replace') +
      t(45, 365, 'Compare useful service, disruption and impacts.'),
  ],
  [
    'Keep the useful structure',
    p('M95 330V125h370v205M95 230h370M205 125v205M355 125v205', 'retained-line') +
      p('M82 335V110h395v225', 'thermal') +
      r(220, 247, 65, 82, 'new') +
      t(220, 155, 'Retain frame') +
      t(235, 185, 'Upgrade') +
      t(235, 211, 'enclosure') +
      p('M285 290L296 330H300', 'fine') +
      t(300, 345, 'New services') +
      t(50, 375, 'Survey condition before selecting what stays.'),
  ],
  [
    'Account over a consistent life',
    a(75, 320, 500, 320) +
      a(75, 320, 75, 105) +
      r(112, 180, 70, 140, 'new') +
      r(223, 245, 70, 75, 'retained') +
      l(293, 245, 468, 175, 'thermal') +
      l(182, 180, 468, 135, 'flow') +
      t(102, 350, 'Upfront') +
      t(305, 350, 'Future operation') +
      t(98, 115, 'Illustrative categories, not project data', 18) +
      t(320, 227, 'Adapt') +
      t(320, 146, 'Replace'),
  ],
]);
// Additional batches register their authored drawings below.
define('site-repair', [
  [
    'Read the existing site',
    r(50, 110, 460, 220, 'garden') +
      tree(110, 165) +
      tree(175, 250) +
      r(335, 120, 150, 170, 'wall') +
      a(80, 295, 465, 295) +
      t(80, 365, 'Value trees + route; investigate damaged ground.'),
  ],
  [
    'Repair a damaged edge',
    r(40, 120, 210, 200, 'garden') +
      tree(80, 170) +
      r(125, 170, 105, 95, 'new') +
      p('M125 170l105 95m0-95l-105 95', 'warning') +
      r(310, 120, 210, 200, 'garden') +
      tree(355, 175) +
      r(425, 200, 80, 105, 'new') +
      t(45, 355, 'Consumes garden') +
      t(310, 355, 'Repairs edge'),
  ],
  [
    'Make connections useful',
    p('M60 310h450M100 310V175h150v135') +
      r(85, 160, 180, 15, 'retained') +
      a(280, 300, 470, 300) +
      tree(425, 215) +
      t(95, 145, 'Keep sound fabric') +
      t(290, 350, 'Reconnect route'),
  ],
]);
define('south-facing-outdoors', [
  [
    'Leave useful sky to the garden',
    r(45, 115, 200, 90) +
      r(45, 205, 200, 115, 'garden') +
      r(315, 230, 200, 90) +
      r(315, 115, 200, 115, 'garden') +
      p('M315 230l35-95h165v95Z', 'light') +
      t(55, 350, 'Building to north') +
      t(318, 350, 'Garden to north') +
      t(45, 385, 'Northern temperate-climate example; not universal.', 17),
  ],
  [
    'The season changes the answer',
    p('M110 330V125h95v205M60 330h450') +
      a(470, 125, 210, 285) +
      a(340, 90, 293, 165) +
      r(205, 165, 90, 10, 'shade') +
      t(320, 80, 'Higher summer sun') +
      t(288, 295, 'Low winter sun') +
      t(50, 370, 'Use a site-specific sun study.'),
  ],
  [
    'Offer sunny and shaded places',
    r(50, 135, 460, 175, 'garden') +
      tree(385, 190) +
      tree(445, 215) +
      seat(110, 230) +
      seat(375, 250) +
      circle(120, 120, 20, 'new') +
      t(80, 350, 'Sun choice') +
      t(330, 350, 'Shade choice'),
  ],
]);
define('water-sensitive-landscape', [
  [
    'Follow the whole water path',
    room(50, 110, 160, 130, 'roof') +
      r(300, 170, 140, 100, 'garden') +
      a(215, 175, 295, 210) +
      a(370, 275, 370, 325) +
      a(370, 325, 510, 325) +
      t(310, 155, 'Storage') +
      t(275, 365, 'Safe overflow route'),
  ],
  [
    'Keep water away from the wall',
    p('M60 320h160l45 30h95l45-30h95M90 320V125h100v195') +
      p('M265 345h95', 'flow') +
      tree(315, 265) +
      r(205, 300, 55, 12, 'wall') +
      t(86, 110, 'Building') +
      t(200, 285, 'Path') +
      t(370, 275, 'Planted basin') +
      t(50, 385, 'Check soil, structure and groundwater conditions.', 17),
  ],
  [
    'Design the full-basin condition',
    r(50, 120, 200, 170, 'garden') +
      p('M65 245h170', 'flow') +
      t(60, 325, 'Ordinary rainfall') +
      r(310, 120, 200, 170, 'garden') +
      p('M325 160h170', 'flow') +
      a(495, 160, 530, 160) +
      a(530, 160, 530, 300) +
      t(316, 325, 'Storage full') +
      t(45, 375, 'Overflow avoids doors and essential routes.'),
  ],
]);
define('positive-outdoor-space', [
  [
    'Make the space a figure',
    r(45, 120, 60, 80) +
      r(170, 105, 75, 65) +
      r(140, 240, 95, 75) +
      r(65, 280, 40, 40) +
      r(315, 110, 195, 55) +
      r(315, 165, 50, 150) +
      r(365, 265, 145, 50) +
      r(455, 165, 55, 100) +
      r(365, 165, 90, 100, 'garden') +
      t(45, 360, 'Leftover gaps') +
      t(315, 360, 'Shaped space'),
  ],
  [
    'An open room can have gaps',
    room(50, 115, 170, 60, 'café') +
      room(340, 115, 170, 60, 'homes') +
      p('M65 185v110h155M340 295h155V185') +
      tree(100, 260) +
      tree(465, 260) +
      seat(240, 240) +
      t(220, 210, 'Square') +
      a(280, 350, 280, 275),
  ],
  [
    'Keep movement beside staying',
    r(50, 120, 200, 180, 'garden') +
      seat(90, 180) +
      seat(165, 230) +
      a(60, 290, 235, 140) +
      r(310, 120, 200, 180, 'garden') +
      seat(340, 175) +
      seat(415, 175) +
      a(325, 270, 495, 270) +
      t(52, 345, 'Crosses sitting') +
      t(312, 345, 'Clear passing edge'),
  ],
]);

define('arcades', [
  [
    'Between room and street',
    room(55, 125, 130, 200, 'inside') +
      r(185, 125, 220, 15, 'shade') +
      r(375, 140, 14, 185) +
      p('M45 325h480') +
      figure(275, 285) +
      t(204, 180, 'Sheltered') +
      t(420, 300, 'Street'),
  ],
  [
    'Keep a continuous clear route',
    r(50, 115, 460, 210, 'garden') +
      [100, 200, 300, 400].map((x) => r(x, 250, 16, 16)).join('') +
      room(50, 115, 460, 70, 'Rooms + doors') +
      seat(135, 195) +
      seat(330, 195) +
      a(65, 300, 495, 300) +
      t(80, 365, 'Waiting and door swings sit beside the route.'),
  ],
  [
    'Does the shelter reach?',
    p('M65 325V125h80M325 325V125h180M45 325h190M300 325h220') +
      r(65, 120, 80, 10, 'shade') +
      r(325, 120, 180, 10, 'shade') +
      a(220, 140, 155, 285) +
      a(520, 140, 455, 285) +
      figure(90, 285) +
      figure(380, 285) +
      t(50, 365, 'Shallow cover') +
      t(320, 365, 'Occupied depth'),
  ],
]);
define('entrance-transition', [
  [
    'Arrival in stages',
    r(40, 145, 110, 150, 'garden') +
      room(150, 145, 110, 150, 'porch') +
      room(260, 145, 110, 150, 'lobby') +
      room(370, 145, 150, 150, 'room') +
      a(60, 260, 500, 260) +
      t(48, 125, 'Street') +
      t(45, 350, 'Keep the sequence short and understandable.'),
  ],
  [
    'A threshold without a step',
    p('M50 320h470M180 320V125h280v195') +
      r(110, 145, 150, 12, 'shade') +
      figure(240, 280) +
      a(65, 305, 425, 305) +
      t(95, 130, 'Shelter') +
      t(315, 175, 'Inside') +
      t(55, 370, 'Change enclosure and light, not floor level.'),
  ],
  [
    'Protect privacy at arrival',
    room(45, 120, 200, 205, 'meeting') +
      gap(40, 215, 12, 45) +
      a(20, 240, 140, 240) +
      room(310, 120, 200, 205, 'meeting') +
      r(310, 225, 100, 100, 'garden') +
      p('M410 225v100') +
      gap(305, 265, 12, 40) +
      a(270, 285, 370, 285) +
      t(45, 360, 'Direct exposure') +
      t(310, 360, 'Buffered arrival'),
  ],
]);
define('building-edge', [
  [
    'Give the edge useful depth',
    room(45, 110, 470, 110, 'Occupied rooms') +
      win(115, 215, 75) +
      gap(290, 212, 45, 15) +
      r(45, 225, 470, 95, 'garden') +
      seat(105, 250) +
      seat(395, 250) +
      a(60, 300, 500, 300) +
      t(45, 360, 'Windows, doors and pauses support the edge.'),
  ],
  [
    'A choice of exposure',
    p('M60 320h455M215 320V115h260v205') +
      r(155, 145, 180, 12, 'shade') +
      seat(175, 275) +
      figure(340, 275) +
      t(58, 355, 'Passing') +
      t(170, 355, 'Pause') +
      t(338, 355, 'Private') +
      t(55, 385, 'Choose the relationship on each side.', 18),
  ],
  [
    'Three meetings with the ground',
    p('M85 310V120m185 190V120m180 190V120M40 310h480') +
      r(230, 270, 30, 40, 'garden') +
      seat(390, 265) +
      r(390, 155, 80, 12, 'shade') +
      t(45, 350, 'Blank') +
      t(205, 350, 'Setback') +
      t(380, 350, 'Usable edge'),
  ],
]);
define('wings-of-light', [
  [
    'Trade depth for useful edges',
    room(45, 120, 190, 195) +
      p('M100 125v185', 'dashed') +
      room(310, 120, 75, 195) +
      room(385, 240, 130, 75) +
      r(385, 120, 130, 120, 'garden') +
      t(45, 355, 'Deep block') +
      t(310, 355, 'Shallow wings'),
  ],
  [
    'Check the sky between wings',
    p('M55 325V130h70v195m70 0V130h70v195M320 325V230h50v95m110 0V230h50v95') +
      a(160, 95, 160, 255) +
      a(420, 95, 420, 285) +
      t(50, 365, 'Restricted sky') +
      t(320, 365, 'More sky visible'),
  ],
  [
    'Extra edges have a cost',
    r(60, 135, 180, 170, 'garden') +
      p('M60 135h180v170H60Z', 'thermal') +
      p('M320 135h70v100h120v70H320Z', 'thermal') +
      a(250, 220, 300, 220) +
      t(45, 350, 'Compact perimeter') +
      t(310, 350, 'More facade') +
      t(45, 385, 'Compare daylight, land use and envelope.', 18),
  ],
]);

define('compact-building-form', [
  [
    'Equal area, different perimeter',
    r(45, 135, 180, 180, 'garden') +
      p('M310 115h120v95h80v105H310Z', 'thermal') +
      p('M45 135h180v180H45Z', 'thermal') +
      t(45, 355, 'Simple enclosure') +
      t(310, 355, 'Articulated edge'),
  ],
  [
    'Find the conditioned boundary',
    p('M60 325V140h330v185M390 170h110v155') +
      p('M70 320V150h310v170Z', 'thermal') +
      t(115, 225, 'Conditioned') +
      t(400, 225, 'Open') +
      t(55, 365, 'A canopy does not enclose a heated room.'),
  ],
  [
    'Compare more than shape',
    t(45, 130, 'Criterion') +
      t(275, 130, 'Compact') +
      t(420, 130, 'Wings') +
      l(45, 145, 515, 145) +
      t(45, 185, 'Envelope') +
      t(275, 185, 'Less') +
      t(420, 185, 'More') +
      t(45, 235, 'Room depth') +
      t(275, 235, 'Check') +
      t(420, 235, 'Shallower') +
      t(45, 285, 'Outdoor edges') +
      t(275, 285, 'Fewer') +
      t(420, 285, 'More') +
      t(45, 350, 'The brief determines which differences matter.'),
  ],
]);
define('intimacy-gradient', [
  [
    'Make degrees of privacy legible',
    r(40, 150, 120, 150, 'garden') +
      room(160, 150, 120, 150, 'shared') +
      room(280, 150, 120, 150, 'quiet') +
      room(400, 150, 120, 150, 'private') +
      a(55, 325, 505, 325) +
      t(43, 130, 'Arrival') +
      t(45, 370, 'Sequence is contextual, not a social hierarchy.'),
  ],
  [
    'Keep visitors beside private rooms',
    room(45, 115, 200, 205) +
      room(45, 115, 200, 100, 'private') +
      a(65, 300, 225, 135) +
      room(310, 115, 200, 205) +
      room(310, 115, 200, 100, 'private') +
      a(325, 285, 495, 285) +
      t(45, 360, 'Through privacy') +
      t(310, 360, 'Shared route'),
  ],
  [
    'Three different boundaries',
    r(55, 140, 130, 150, 'garden') +
      r(215, 140, 130, 150, 'garden') +
      r(375, 140, 130, 150, 'garden') +
      p('M120 150v130', 'dashed') +
      p('M280 150v130', 'warning') +
      p('M440 150v130', 'thermal') +
      t(55, 335, 'Visual') +
      t(215, 335, 'Acoustic') +
      t(375, 335, 'Access') +
      t(45, 380, 'One boundary may not supply all three.', 18),
  ],
]);
define('common-areas-at-the-heart', [
  [
    'A heart on everyday routes',
    room(200, 175, 160, 110, 'shared') +
      room(45, 110, 120, 70, 'rooms') +
      room(395, 110, 120, 70, 'rooms') +
      room(45, 285, 120, 70, 'rooms') +
      room(395, 285, 120, 70, 'rooms') +
      a(165, 155, 195, 195) +
      a(395, 155, 365, 195) +
      a(165, 310, 195, 270) +
      a(395, 310, 365, 270),
  ],
  [
    'Pass beside the conversation',
    room(55, 115, 450, 210) +
      r(100, 165, 240, 90, 'garden') +
      seat(135, 180) +
      seat(260, 220) +
      a(70, 295, 485, 295) +
      t(360, 180, 'Quiet') +
      t(360, 210, 'entry') +
      t(55, 365, 'Participation is a choice, not a toll on movement.'),
  ],
  [
    'Several degrees of involvement',
    room(55, 115, 450, 210) +
      r(210, 170, 145, 90, 'wall') +
      seat(215, 150) +
      seat(300, 275) +
      seat(80, 195) +
      r(405, 150, 80, 100, 'garden') +
      t(65, 355, 'Edge seat') +
      t(210, 355, 'Shared table') +
      t(405, 355, 'Alcove'),
  ],
]);
define('flexibly-linked-rooms', [
  [
    'Two rooms, one useful connection',
    room(55, 125, 220, 190, 'room A') +
      room(275, 125, 230, 190, 'room B') +
      gap(268, 190, 14, 75) +
      p('M260 195h30m-30 65h30', 'thermal') +
      t(55, 360, 'Each room also needs independent access.'),
  ],
  [
    'Test distinct operating states',
    room(40, 130, 210, 180) +
      r(100, 190, 90, 45, 'wall') +
      t(55, 345, 'One gathering') +
      room(310, 130, 210, 180) +
      l(415, 130, 415, 310, 'thermal') +
      r(335, 190, 45, 45, 'wall') +
      r(455, 190, 40, 45, 'wall') +
      t(310, 345, 'Two activities'),
  ],
  [
    'An opening needs an operation',
    p('M65 315V125h420v190M275 125v65m0 70v55') +
      r(263, 190, 25, 70, 'wall') +
      r(265, 135, 65, 30, 'garden') +
      a(290, 210, 320, 165) +
      t(340, 165, 'Storage') +
      t(95, 355, 'Check seals, force and handling space.'),
  ],
]);

define('circulation-as-orientation', [
  [
    'Let the route explain the plan',
    room(50, 115, 460, 210) +
      r(220, 160, 140, 100, 'garden') +
      a(70, 290, 490, 290) +
      t(65, 150, 'Entry') +
      t(380, 150, 'Reception') +
      t(245, 210, 'Court') +
      a(285, 285, 285, 265),
  ],
  [
    'Distinguish the choices',
    p('M140 320V140m-80 80h160') +
      t(65, 355, 'Identical branches') +
      p('M400 320V140m-80 80h160') +
      tree(470, 145) +
      r(330, 125, 45, 35, 'glass') +
      t(320, 355, 'Useful landmarks'),
  ],
  [
    'Share orientation cues',
    p('M55 325h450M55 160h450') +
      p('M90 325l35-35h35v-35h35v-35h35v-35h35v-25') +
      room(360, 160, 80, 165, 'lift') +
      win(60, 130, 200) +
      t(60, 115, 'Shared view') +
      t(55, 375, 'Stair and lift reach the same legible landing.'),
  ],
]);
define('main-entrance', [
  [
    'Start at real arrival points',
    room(195, 110, 175, 115, 'public room') +
      gap(260, 215, 45, 15) +
      a(55, 330, 265, 230) +
      a(485, 330, 295, 230) +
      a(280, 370, 280, 230) +
      t(30, 315, 'Pavement') +
      t(410, 315, 'Drop-off') +
      t(215, 397, 'Transport', 18),
  ],
  [
    'Make the working door visible',
    r(55, 140, 450, 180) +
      r(215, 195, 125, 125, 'glass') +
      r(185, 180, 185, 12, 'shade') +
      t(225, 160, 'Entrance') +
      a(280, 375, 280, 330) +
      t(50, 110, 'Depth + shelter + visible destination'),
  ],
  [
    'Prominence and access together',
    p('M55 300h190M315 300h200') +
      room(110, 130, 95, 100, 'door') +
      p('M110 300h25v-20h25v-20h25v-30') +
      room(375, 130, 95, 100, 'door') +
      p('M315 300l155-70') +
      t(50, 350, 'Split invitation') +
      t(310, 350, 'Shared approach'),
  ],
]);
define('inclusive-arrival', [
  [
    'One public welcome',
    room(205, 110, 150, 120, 'welcome') +
      gap(255, 220, 45, 15) +
      a(50, 310, 260, 235) +
      a(505, 310, 300, 235) +
      a(280, 370, 280, 235) +
      t(35, 285, 'Walk / wheel') +
      t(415, 285, 'Drop-off') +
      t(205, 397, 'Public transport', 18),
  ],
  [
    'A usable threshold is a system',
    p('M55 325h450M300 325V130h175v195') +
      r(195, 145, 200, 12, 'shade') +
      r(306, 220, 15, 30, 'glass') +
      seat(150, 285) +
      a(55, 305, 290, 305) +
      t(190, 120, 'Shelter') +
      t(330, 215, 'Controls') +
      t(55, 370, 'Landing + information + door operation'),
  ],
  [
    'Trace every link',
    r(45, 140, 200, 65, 'garden') +
      r(315, 140, 200, 65, 'garden') +
      r(45, 275, 200, 65, 'garden') +
      r(315, 275, 200, 65, 'garden') +
      t(65, 180, 'Find the route') +
      t(335, 180, 'Reach the door') +
      t(65, 315, 'Operate it') +
      t(335, 315, 'Wait / get help') +
      a(250, 175, 307, 175) +
      a(410, 215, 410, 265) +
      a(307, 310, 255, 310),
  ],
]);
define('staircase-as-a-stage', [
  [
    'Let ascent join shared space',
    p('M50 325h460M50 150h460M110 325l35-35h35v-35h35v-35h35v-35h35v-35') +
      figure(400, 290) +
      t(340, 220, 'Shared hall') +
      t(70, 110, 'Visible landings reveal the next level.'),
  ],
  [
    'Keep participation equivalent',
    room(55, 110, 450, 215) +
      r(85, 140, 100, 155, 'wall') +
      room(350, 140, 100, 155, 'lift') +
      r(200, 140, 130, 75, 'garden') +
      t(95, 180, 'stair') +
      t(212, 180, 'shared') +
      a(185, 250, 350, 250) +
      t(55, 365, 'Lift route joins the same public destination.'),
  ],
  [
    'Separate sitting from passing',
    p('M55 310l35-35h35v-35h35v-35h35v-35h35') +
      seat(120, 235) +
      p('M315 310l35-35h35v-35h35v-35h35v-35h35') +
      seat(470, 290) +
      t(50, 355, 'Route blocked') +
      t(310, 355, 'Sitting beside'),
  ],
]);

define('window-place', [
  [
    'Make a place at the opening',
    room(55, 115, 450, 210) +
      win(53, 155, 7, 110) +
      seat(85, 195) +
      r(145, 195, 45, 35, 'wall') +
      a(225, 280, 125, 235) +
      t(255, 170, 'Clear approach') +
      t(255, 210, 'Seat + view') +
      t(55, 370, 'Keep window operation and the route usable.'),
  ],
  [
    'Comfort belongs in the section',
    p('M85 325V110h30v215M115 325h385') +
      win(83, 135, 10, 130) +
      r(115, 265, 150, 15, 'seat') +
      figure(175, 260) +
      r(75, 125, 105, 10, 'shade') +
      p('M105 325V275h155', 'thermal') +
      t(285, 170, 'Shade') +
      t(285, 220, 'Posture') +
      t(285, 270, 'Warm junction'),
  ],
  [
    'A pocket beside the route',
    room(40, 120, 210, 200) +
      seat(115, 205) +
      a(60, 290, 225, 145) +
      room(310, 120, 210, 200) +
      seat(340, 175) +
      a(325, 285, 495, 285) +
      win(308, 150, 6, 90) +
      t(45, 355, 'Route conflict') +
      t(315, 355, 'Usable edge'),
  ],
]);
define('alcoves', [
  [
    'A smaller place within a room',
    room(55, 110, 450, 220) +
      r(370, 110, 135, 130, 'garden') +
      p('M370 110v85m35 45h100') +
      seat(420, 150) +
      r(170, 210, 110, 50, 'wall') +
      t(80, 155, 'Shared room') +
      t(55, 370, 'Stay connected with less exposure.'),
  ],
  [
    'Enclosure is not sound isolation',
    p('M50 320V160h120M220 320V160h120M390 320V130h120v190') +
      seat(90, 270) +
      seat(255, 270) +
      seat(420, 270) +
      r(220, 155, 120, 10, 'shade') +
      t(45, 355, 'Open edge') +
      t(215, 355, 'Canopy') +
      t(390, 355, 'Room'),
  ],
  [
    'Place withdrawal beside movement',
    room(55, 115, 450, 210) +
      r(355, 125, 140, 110, 'garden') +
      seat(400, 155) +
      a(70, 290, 490, 290) +
      a(290, 215, 350, 215) +
      t(65, 155, 'View to room') +
      t(55, 370, 'Clear entry; no concealed circulation shortcut.'),
  ],
]);
define('ceiling-height-variety', [
  [
    'A sequence in section',
    p('M55 325V220h135V115h300v210M55 325h435') +
      figure(125, 285) +
      figure(350, 285) +
      t(65, 365, 'Lower threshold') +
      t(295, 365, 'Taller gathering'),
  ],
  [
    'Different scales in one room',
    p('M55 325V115h450v210M55 325h450') +
      r(55, 205, 135, 12, 'shade') +
      seat(95, 275) +
      r(300, 255, 100, 12, 'wall') +
      t(70, 190, 'Sitting edge') +
      t(285, 170, 'Main volume') +
      t(55, 370, 'A canopy changes scale, not acoustic isolation.'),
  ],
  [
    'Coordinate the usable height',
    r(55, 110, 450, 40) +
      p('M120 150v45h75v-45M330 150v60h100v-60') +
      p('M55 325h450M55 225h450', 'dashed') +
      figure(240, 285) +
      t(210, 135, 'Structure') +
      t(330, 195, 'Services') +
      t(55, 365, 'Resolve clear headroom and maintenance access.'),
  ],
]);
define('prospect', [
  [
    'A useful outward view',
    room(55, 125, 200, 200) +
      win(253, 155, 7, 115) +
      seat(155, 210) +
      p('M200 215L480 140L480 300Z', 'light') +
      tree(435, 190) +
      t(300, 335, 'Useful outlook') +
      t(55, 375, 'Judge the view from a comfortable position.'),
  ],
  [
    'Eye level changes the view',
    p('M45 325H255M315 325H530M210 325V225H222V325M485 325V225H497V325') +
      r(60, 285, 70, 18, 'seat', 4) +
      seatedFigure(95, 255, 1, true) +
      standingFigure(400, 325, 120) +
      l(115, 255, 210, 244, 'flow') +
      p('M206 240L214 248M214 240L206 248', 'fine') +
      a(415, 223, 535, 190) +
      t(55, 130, 'Seated view') +
      t(325, 130, 'Standing view') +
      t(55, 375, 'Sills and planting can block seated views.'),
  ],
  [
    'Outlook with a protected side',
    room(55, 115, 450, 210) +
      p('M115 245v-80h70', 'thermal') +
      seat(135, 180) +
      p('M180 190L455 135L455 285Z', 'light') +
      seat(350, 280) +
      t(55, 370, 'Offer choices about view and exposure.'),
  ],
]);

define('refuge', [
  [
    'Protected, with a way to engage',
    room(55, 115, 450, 210) +
      p('M130 245V155h110', 'thermal') +
      seat(155, 185) +
      a(210, 205, 430, 205) +
      t(270, 180, 'View to room') +
      t(55, 370, 'Protected back; clear route out.'),
  ],
  [
    'Protection without entrapment',
    room(45, 125, 200, 190) +
      p('M95 265V165h90', 'thermal') +
      seat(120, 205) +
      a(175, 255, 230, 285) +
      room(310, 125, 200, 190) +
      p('M350 275V155h130v120h-90', 'warning') +
      seat(400, 205) +
      t(45, 355, 'Clear choice') +
      t(310, 355, 'Hard to leave'),
  ],
  [
    'Offer degrees of exposure',
    room(55, 115, 450, 210) +
      seat(110, 210) +
      p('M250 265V165h70', 'thermal') +
      seat(265, 205) +
      room(385, 140, 95, 145) +
      seat(410, 190) +
      t(70, 365, 'Open') +
      t(225, 365, 'Protected') +
      t(380, 365, 'Enclosed'),
  ],
]);
define('external-solar-shading', [
  [
    'Intercept sun before the glass',
    p('M160 325V125h30v200M190 325h310') +
      win(158, 160, 8, 110) +
      r(95, 145, 120, 12, 'shade') +
      a(60, 95, 135, 145) +
      p('M136 147l50 65', 'dashed') +
      t(255, 160, 'External shade') +
      t(255, 220, 'Glazing') +
      t(55, 370, 'Glare control inside may still be needed.'),
  ],
  [
    'One overhang, different sun angles',
    p('M120 325V125M390 325V125') +
      r(55, 145, 100, 12, 'shade') +
      r(325, 145, 100, 12, 'shade') +
      a(65, 90, 95, 140) +
      a(260, 235, 385, 255) +
      t(45, 355, 'High sun stopped') +
      t(310, 355, 'Low sun enters'),
  ],
  [
    'Choose a device for the exposure',
    room(45, 140, 125, 160) +
      r(30, 125, 150, 12, 'shade') +
      room(220, 140, 125, 160) +
      r(230, 135, 12, 175, 'shade') +
      r(310, 135, 12, 175, 'shade') +
      room(395, 140, 125, 160) +
      r(400, 145, 110, 140, 'garden') +
      t(40, 350, 'Overhang') +
      t(215, 350, 'Fins') +
      t(390, 350, 'Screen'),
  ],
]);
define('cross-ventilation', [
  [
    'A driver and a continuous path',
    room(60, 125, 440, 195) +
      gap(53, 190, 15, 70) +
      gap(493, 190, 15, 70) +
      a(20, 225, 530, 225) +
      t(65, 110, 'Different pressures at usable openings') +
      t(55, 370, 'Flow direction depends on site and weather.'),
  ],
  [
    'Will the internal path stay open?',
    room(45, 125, 200, 190) +
      l(145, 125, 145, 315) +
      a(55, 225, 135, 225) +
      p('M135 205l20 40m0-40l-20 40', 'warning') +
      room(310, 125, 200, 190) +
      p('M410 125v65m0 70v55') +
      a(320, 225, 500, 225) +
      t(45, 355, 'Door blocks route') +
      t(310, 355, 'Usable connection'),
  ],
  [
    'Two different airflow drivers',
    room(45, 145, 200, 165) +
      a(25, 235, 265, 235) +
      room(340, 145, 150, 165) +
      gap(335, 255, 12, 35) +
      gap(440, 138, 35, 12) +
      a(310, 275, 395, 275) +
      a(395, 270, 455, 120) +
      t(45, 355, 'Cross flow') +
      t(335, 355, 'High / low flow'),
  ],
]);
define('continuous-thermal-envelope', [
  [
    'Trace one thermal boundary',
    p('M95 325V145l185-65 185 65v180Z') +
      p('M110 310V155l170-60 170 60v155Z', 'thermal') +
      t(195, 240, 'Conditioned') +
      t(55, 370, 'Roof, wall, floor and every connecting edge.'),
  ],
  [
    'Two functions at a window',
    r(75, 125, 100, 200, 'wall') +
      win(155, 180, 15, 90) +
      p('M105 125v55h55m0 90h-55v55', 'thermal') +
      p('M140 125v50h35v100h-35v50', 'flow') +
      t(240, 175, 'Insulation continuity') +
      t(240, 235, 'Airtight connection') +
      t(55, 375, 'Rain and vapor control also need design.'),
  ],
  [
    'Resolve structural penetrations',
    p('M130 125v200M70 230h175', 'retained-line') +
      p('M115 125v200', 'warning') +
      p('M375 125v200M330 230h15M375 230h115', 'retained-line') +
      p('M360 125v200', 'thermal') +
      r(345, 210, 30, 40, 'new') +
      t(45, 365, 'Slab crosses boundary') +
      t(310, 365, 'Designed junction'),
  ],
]);

define('structural-bay-rhythm', [
  [
    'One frame, several room sizes',
    room(55, 120, 450, 205) +
      [80, 215, 350, 485]
        .map((x) => [145, 295].map((y) => r(x, y, 12, 12, 'seat')).join(''))
        .join('') +
      p('M220 120v205M355 120v205M220 225h285', 'dashed') +
      t(75, 190, 'Large') +
      t(240, 190, 'Small') +
      t(380, 275, 'Small') +
      t(55, 370, 'Check doors, furniture and future partitions.'),
  ],
  [
    'Coordinate related rhythms',
    r(55, 125, 450, 195) +
      [75, 210, 345, 480].map((x) => r(x, 125, 12, 195, 'seat')).join('') +
      [100, 165, 235, 300, 370, 435].map((x) => win(x, 170, 35, 100)).join('') +
      t(55, 365, 'One structural bay can contain several windows.'),
  ],
  [
    'Span is a consequential choice',
    p('M55 145h190M55 310h190M315 145h190M315 310h190') +
      [65, 120, 175, 230].map((x) => r(x, 145, 10, 165, 'wall')).join('') +
      [325, 485].map((x) => r(x, 145, 10, 165, 'wall')).join('') +
      r(315, 135, 190, 25, 'wall') +
      t(45, 355, 'Closer supports') +
      t(310, 355, 'Longer span'),
  ],
]);
define('drained-ventilated-rainscreen', [
  [
    'Several lines of defense',
    r(75, 120, 35, 205, 'wall') +
      r(160, 120, 20, 205, 'glass') +
      r(190, 120, 80, 205, 'garden') +
      r(280, 120, 45, 205, 'wall') +
      a(35, 160, 75, 180) +
      a(135, 170, 135, 305) +
      a(135, 305, 90, 335) +
      t(345, 150, 'Outer cladding') +
      t(345, 200, 'Drained cavity') +
      t(345, 250, 'Protected inner wall') +
      t(45, 380, 'Concept only; actual assemblies vary.', 18),
  ],
  [
    'An opening interrupts the route',
    r(95, 110, 30, 100, 'wall') +
      r(95, 260, 30, 75, 'wall') +
      r(180, 110, 25, 100, 'glass') +
      r(180, 260, 25, 75, 'glass') +
      r(125, 210, 115, 50, 'garden') +
      a(155, 125, 155, 200) +
      a(155, 200, 75, 210) +
      t(285, 165, 'Water above window') +
      t(285, 235, 'Directed outward') +
      t(55, 375, 'Head, jambs and sill must agree.'),
  ],
  [
    'Coordinate drainage and fire control',
    r(95, 115, 35, 210, 'wall') +
      r(205, 115, 55, 210, 'garden') +
      r(130, 225, 75, 20, 'new') +
      a(165, 140, 165, 215) +
      a(165, 215, 85, 215) +
      t(300, 165, 'Water route') +
      t(300, 240, 'Cavity interruption') +
      t(55, 375, 'Use project-specific fire and facade design.'),
  ],
]);
define('repairable-connections', [
  [
    'Replace the vulnerable part',
    r(75, 130, 100, 190, 'retained') +
      r(245, 145, 35, 160, 'wall') +
      r(355, 160, 80, 130, 'new') +
      l(160, 190, 365, 190, 'dashed') +
      l(160, 265, 365, 265, 'dashed') +
      a(450, 230, 505, 230) +
      t(65, 355, 'Retain support') +
      t(330, 355, 'Replace part'),
  ],
  [
    'Draw the repair access',
    room(45, 130, 200, 185) +
      r(100, 180, 90, 70, 'wall') +
      p('M75 150l140 145m0-145L75 295', 'warning') +
      room(310, 130, 200, 185) +
      r(380, 180, 90, 70, 'wall') +
      gap(305, 205, 12, 70) +
      a(275, 240, 370, 240) +
      t(45, 355, 'Trapped assembly') +
      t(310, 355, 'Workable access'),
  ],
  [
    'Diagnosis precedes replacement',
    r(45, 135, 200, 65, 'garden') +
      r(315, 135, 200, 65, 'garden') +
      r(45, 275, 200, 65, 'garden') +
      r(315, 275, 200, 65, 'garden') +
      t(65, 175, 'Inspect') +
      t(335, 175, 'Understand failure') +
      t(65, 315, 'Record + review') +
      t(335, 315, 'Targeted repair') +
      a(250, 170, 305, 170) +
      a(410, 210, 410, 265) +
      a(305, 310, 255, 310),
  ],
]);
define('loose-fit-layers', [
  [
    'Different parts, different times',
    r(65, 120, 430, 25, 'retained') +
      r(65, 170, 430, 25, 'wall') +
      r(65, 220, 430, 25, 'service') +
      r(65, 270, 430, 25, 'new') +
      t(85, 140, 'Structure') +
      t(85, 190, 'Enclosure') +
      t(85, 240, 'Services') +
      t(85, 290, 'Room divisions + contents') +
      t(55, 365, 'The layers are a model, not fixed lifespans.'),
  ],
  [
    'Keep likely changes accessible',
    r(55, 130, 195, 45, 'wall') +
      p('M75 150h155v120', 'flow') +
      r(315, 130, 195, 45, 'wall') +
      p('M335 205h155v75', 'flow') +
      p('M315 235h195', 'dashed') +
      t(45, 350, 'Embedded dependency') +
      t(310, 350, 'Planned access'),
  ],
  [
    'Prove a plausible next layout',
    room(45, 125, 200, 195) +
      p('M145 125v195', 'dashed') +
      room(310, 125, 200, 195) +
      p('M310 220h200', 'dashed') +
      [65, 225, 330, 490]
        .map((x) => r(x, 145, 10, 10, 'seat') + r(x, 290, 10, 10, 'seat'))
        .join('') +
      t(45, 360, 'Current rooms') +
      t(310, 360, 'Future arrangement'),
  ],
]);

define('design-for-disassembly', [
  [
    'Plan a safe removal sequence',
    r(65, 260, 100, 55, 'retained') +
      r(230, 185, 100, 55, 'wall') +
      r(395, 110, 100, 55, 'new') +
      a(170, 270, 225, 235) +
      a(335, 195, 390, 160) +
      t(65, 350, 'Support') +
      t(230, 280, 'Release') +
      t(395, 205, 'Handle') +
      t(45, 385, 'Actual stability and method require engineering.', 17),
  ],
  [
    'Preserve different kinds of value',
    r(55, 125, 165, 65, 'wall') +
      t(75, 165, 'Component') +
      a(225, 160, 355, 160) +
      r(365, 125, 140, 65, 'garden') +
      t(380, 165, 'Reuse') +
      a(225, 180, 355, 285) +
      r(365, 250, 140, 65, 'new') +
      t(380, 290, 'Recycle') +
      t(55, 365, 'Whole function and material recovery differ.'),
  ],
  [
    'Information travels with the part',
    r(65, 130, 150, 175, 'wall') +
      r(300, 130, 195, 175, 'garden') +
      t(85, 170, 'Part A17') +
      t(320, 170, 'Identity') +
      t(320, 205, 'Material') +
      t(320, 235, 'Condition') +
      t(320, 266, 'Connections') +
      t(320, 297, 'Changes') +
      a(220, 215, 290, 215) +
      t(55, 365, 'A record supports assessment; it is not a warranty.'),
  ],
]);
define('observe-before-briefing', [
  [
    'Map actual use',
    room(55, 115, 450, 210) +
      room(55, 115, 150, 100, 'waiting') +
      a(70, 280, 480, 280) +
      circle(330, 200, 28, 'new') +
      seat(420, 150) +
      t(280, 150, 'Queue') +
      t(55, 370, 'Record routes, workarounds and different times.'),
  ],
  [
    'Observation is not explanation',
    r(55, 135, 190, 80, 'wall') +
      t(70, 175, 'Door wedged open') +
      a(250, 175, 305, 175) +
      t(320, 140, 'Airflow?') +
      t(320, 190, 'Supervision?') +
      t(320, 240, 'Difficult hardware?') +
      t(55, 350, 'Ask users before choosing a spatial remedy.'),
  ],
  [
    'Turn evidence into a brief',
    r(45, 135, 200, 65, 'garden') +
      r(315, 135, 200, 65, 'garden') +
      r(45, 275, 200, 65, 'garden') +
      r(315, 275, 200, 65, 'garden') +
      t(65, 175, 'Listen + observe') +
      t(335, 175, 'Check interpretation') +
      t(65, 315, 'Revise the brief') +
      t(335, 315, 'Define an outcome') +
      a(250, 170, 305, 170) +
      a(410, 210, 410, 265) +
      a(305, 310, 255, 310),
  ],
]);
define('compare-spatial-alternatives', [
  [
    'Change an organizing relationship',
    room(40, 130, 140, 180) +
      p('M110 130v180', 'dashed') +
      room(215, 130, 140, 180) +
      r(250, 180, 70, 70, 'garden') +
      p('M390 130h55v125h85v55H390Z', 'thermal') +
      t(45, 355, 'Compact') +
      t(215, 355, 'Court') +
      t(390, 355, 'Wings'),
  ],
  [
    'Keep tradeoffs visible',
    t(45, 130, 'Criterion') +
      t(285, 130, 'Option A') +
      t(420, 130, 'Option B') +
      l(45, 145, 515, 145) +
      t(45, 190, 'Access') +
      t(285, 190, 'Study') +
      t(420, 190, 'Study') +
      t(45, 240, 'Daylight') +
      t(285, 240, 'Study') +
      t(420, 240, 'Study') +
      t(45, 290, 'Cost / resources') +
      t(285, 290, 'Estimate') +
      t(420, 290, 'Estimate') +
      t(45, 365, 'Same brief, scale and level of evidence.'),
  ],
  [
    'Study what could change the choice',
    r(55, 140, 180, 100, 'wall') +
      t(70, 180, 'Uncertain') +
      t(70, 215, 'assumption') +
      a(240, 190, 315, 190) +
      r(325, 140, 180, 100, 'garden') +
      t(340, 180, 'Targeted') +
      t(340, 215, 'investigation') +
      a(415, 250, 415, 315) +
      t(275, 355, 'Revise the comparison'),
  ],
]);
define('test-at-full-scale', [
  [
    'Bodies reveal spatial conflicts',
    room(55, 115, 450, 210) +
      r(210, 180, 140, 65, 'wall') +
      figure(175, 250, 'plan') +
      figure(395, 250, 'plan') +
      p('M70 295h420', 'dashed') +
      t(65, 150, 'Full-size layout') +
      t(55, 370, 'Include real tasks, objects and simultaneous use.'),
  ],
  [
    'Match fidelity to the question',
    r(45, 135, 140, 170, 'garden') +
      r(210, 135, 140, 170, 'wall') +
      r(375, 135, 140, 170, 'new') +
      t(55, 180, 'Movement') +
      t(220, 180, 'Assembly') +
      t(385, 180, 'Performance') +
      t(55, 230, 'Tape / props', 18) +
      t(220, 230, 'Real interfaces', 18) +
      t(385, 230, 'Valid method', 18) +
      t(45, 365, 'An informal mock-up cannot prove every claim.'),
  ],
  [
    'A trial should produce a decision',
    r(45, 135, 200, 65, 'garden') +
      r(315, 135, 200, 65, 'garden') +
      r(45, 275, 200, 65, 'garden') +
      r(315, 275, 200, 65, 'garden') +
      t(65, 175, 'Question') +
      t(335, 175, 'Trial + observation') +
      t(65, 315, 'Retest if needed') +
      t(335, 315, 'Revise') +
      a(250, 170, 305, 170) +
      a(410, 210, 410, 265) +
      a(305, 310, 255, 310),
  ],
]);
define('post-occupancy-evaluation', [
  [
    'Close the learning loop',
    r(45, 135, 200, 65, 'garden') +
      r(315, 135, 200, 65, 'garden') +
      r(45, 275, 200, 65, 'garden') +
      r(315, 275, 200, 65, 'garden') +
      t(65, 175, 'Intended outcome') +
      t(335, 175, 'Occupied evidence') +
      t(65, 315, 'Verify improvement') +
      t(335, 315, 'Assign action') +
      a(250, 170, 305, 170) +
      a(410, 210, 410, 265) +
      a(305, 310, 255, 310) +
      a(145, 265, 145, 210),
  ],
  [
    'Combine kinds of evidence',
    room(55, 125, 450, 195) +
      win(53, 165, 7, 95) +
      r(270, 175, 140, 70, 'wall') +
      circle(125, 225, 20, 'new') +
      t(80, 155, 'Conditions') +
      t(270, 155, 'Activities') +
      t(270, 285, 'User experience') +
      t(55, 370, 'Measure the room and understand its use.'),
  ],
  [
    'Return through relevant seasons',
    a(55, 230, 510, 230) +
      [80, 215, 350, 485].map((x) => circle(x, 230, 8, 'seat')).join('') +
      t(55, 185, 'Handover') +
      t(175, 285, 'Early use') +
      t(305, 185, 'Seasonal check') +
      t(410, 285, 'Next brief') +
      t(55, 365, 'Record action and context, not just a score.'),
  ],
]);

// ARCHITECTURE_DRAWING_BATCHES

const pkg = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/architecture.json'), 'utf8'),
);
const manifestPath = resolve(root, 'content/assets/manifest.json');
const dimensions = JSON.parse(await readFile(manifestPath, 'utf8'));
await mkdir(resolve(root, 'content/assets/architecture'), { recursive: true });
let count = 0;
const onlyOption = process.argv.slice(2).find((arg) => arg.startsWith('--only='));
const only = onlyOption ? new Set(onlyOption.slice('--only='.length).split(',')) : null;
for (const slug of only ?? [])
  if (!Object.hasOwn(drawings, slug)) throw new Error(`Unknown drawing selection ${slug}`);
for (const [slug, items] of Object.entries(drawings)) {
  if (only && !only.has(slug)) continue;
  const pattern = pkg.patterns.find((x) => x.slug === slug);
  if (!pattern) throw Error(`Unknown pattern ${slug}`);
  for (const [index, [title, body]] of items.entries()) {
    const file = `architecture/${slug}-${index + 1}.svg`;
    const desc = pattern.visuals[index]?.alt_text ?? title;
    const composition = spatialDrawings[`${slug}:${index}`];
    const drawingBody = composition
      ? composition.draw()
      : `<g transform="translate(0 -20)">${body}</g>`;
    const svg = renderEditorialVisual(slug, index, title, desc, false, drawingBody);
    await writeFile(resolve(root, 'content/assets', file), svg + '\n');
    dimensions[file] = { width: 560, height: 410 };
    const mobile = file.replace('.svg', '-mobile.svg');
    const compactSvg = renderEditorialVisual(slug, index, title, desc, true, drawingBody);
    await writeFile(resolve(root, 'content/assets', mobile), compactSvg);
    dimensions[mobile] = { width: 560, height: 410 };
    count++;
  }
}
const provenance = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/architecture-provenance.json'), 'utf8'),
);
for (const asset of provenance.assets)
  dimensions[asset.file] = { width: asset.width, height: asset.height };
await writeFile(manifestPath, JSON.stringify(dimensions, null, 2) + '\n');
console.log(`Built ${count} original Architecture diagrams; recorded image dimensions.`);
