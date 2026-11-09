// Original conceptual film diagrams in the approved light editorial drawing language.
// Camera plans, optical paths and frame sequences are explanatory, not measured rigs.
import { filmSpatialDrawings } from './film-spatial-visuals.mjs';
import { filmPrecisionDrawings } from './film-precision-visuals.mjs';
import { filmReadableDrawings } from './film-readable-visuals.mjs';
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const p = (d, c = 'line', extra = '') => `<path d="${d}" class="${c}" ${extra}/>`;
const r = (x, y, w, h, c = 'existing') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${c}"/>`;
const c = (x, y, rad, cls = 'line') => `<circle cx="${x}" cy="${y}" r="${rad}" class="${cls}"/>`;
const t = (x, y, s, anchor = 'start') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}">${esc(s)}</text>`;
const a = (d, cls = 'outline-green') =>
  p(d, cls, `marker-end="url(#${cls === 'line' || cls === 'fine' ? 'arrow-neutral' : 'arrow'})"`);
const person = (x, y, h = 100, cls = 'line', arm = 0) =>
  `<g transform="translate(${x} ${y}) scale(${h / 100})" class="${cls === 'outline-green' || cls === 'intervention' ? 'figure-accent' : 'figure'}">` +
  '<path d="M-7-76C-15-79-15-92-7-96C1-100 10-95 10-88L15-84 10-81C10-75 5-72 0-73L-1-67C9-64 13-55 14-43L5-38 3-28 10-2 1 0-8-23-10-1-19 0-18-32-20-52C-21-63-15-68-8-69Z"/>' +
  `<path d="M4-61Q12-61 14-51L17 ${-39 - arm * 5}L${28 - arm * 5} ${-49 - arm * 18}L${34 - arm * 5} ${-44 - arm * 18}L21 ${-32 - arm * 5}Q15 ${-29 - arm * 5} 10 ${-36 - arm * 5}L3-49Z"/></g>`;
const camera = (x, y, angle = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${angle})">${r(-22, -13, 36, 26, 'figure')}${p('M14 -9L27 -16V16L14 9Z', 'figure')}</g>`;
const panel = (x, y, w = 210, h = 180) => r(x, y, w, h, 'boundary');
const frame = (x, y, w = 210, h = 145) => r(x, y, w, h, 'boundary');
const baseline = (s) => t(280, 376, s, 'middle');
const box = (x, y, w, h, label, cls = 'existing') =>
  r(x, y, w, h, cls) + t(x + w / 2, y + h / 2 + 7, label, 'middle');
const group = (x, y, body) => `<g transform="translate(${x} ${y})">${body}</g>`;
const star = (x, y, rad = 15, cls = 'intervention') =>
  p(
    Array.from({ length: 10 }, (_, i) => {
      const q = (i * Math.PI) / 5 - Math.PI / 2,
        rr = i % 2 ? rad * 0.4 : rad;
      return `${i ? 'L' : 'M'}${x + Math.cos(q) * rr} ${y + Math.sin(q) * rr}`;
    }).join('') + 'Z',
    cls,
  );
export const filmDrawings = {};
const draw = (id, view, body) => (filmDrawings[id] = { view, body, coordinateSpace: 'legacy' });

draw(
  'forced-perspective',
  'plan-and-frame',
  t(42, 42, 'Two equal people') +
    camera(63, 220) +
    p('M90 220L455 165M90 220L455 280', 'fine') +
    person(240, 245, 75, 'outline-green') +
    person(422, 245, 75) +
    p('M239 272V282H422V272', 'fine') +
    t(220, 315, 'Near') +
    t(399, 315, 'Far') +
    r(360, 50, 160, 100, 'boundary') +
    person(408, 134, 64, 'outline-green') +
    person(471, 134, 36) +
    t(440, 42, 'Frame', 'middle') +
    baseline('Depth becomes apparent size.'),
);

draw(
  'mirror-duplicate-sets',
  'plan',
  t(66, 43, 'Room') +
    t(331, 43, 'Duplicate room') +
    r(48, 77, 214, 213, 'boundary') +
    r(291, 77, 214, 213, 'boundary') +
    p('M278 65V302', 'outline-green') +
    r(112, 89, 70, 26) +
    r(368, 89, 70, 26) +
    person(156, 250, 90) +
    person(398, 250, 90, 'outline-green') +
    a('M177 207H374', 'fine') +
    camera(84, 300, -30) +
    t(280, 315, 'Open frame; matched action', 'middle') +
    baseline('A second performance replaces the reflection.'),
);

draw(
  'dolly-zoom',
  'frame-comparison',
  t(145, 44, 'Closer / zoom out', 'middle') +
    t(415, 44, 'Farther / zoom in', 'middle') +
    frame(40, 78) +
    frame(310, 78) +
    r(56, 100, 42, 107) +
    r(187, 109, 47, 98) +
    r(318, 87, 73, 125) +
    r(443, 87, 69, 125) +
    person(145, 210, 106, 'outline-green') +
    person(415, 210, 106, 'outline-green') +
    camera(105, 289) +
    camera(378, 289) +
    a('M167 289H333') +
    baseline('Subject size stays; background scale changes.'),
);

draw(
  'reverse-motion',
  'frame-sequence',
  t(44, 43, 'Recorded action') +
    [0, 1, 2]
      .map((i) => {
        const x = 40 + i * 175;
        let s = frame(x, 82, 145, 135);
        if (i === 0) s += p(`M${x + 55} 123h35l-4 14l14 43l-8 18h-40l-8-18l14-43Z`, 'existing');
        else
          for (let k = 0; k < 5; k++)
            s += p(`M${x + 24 + k * 23} ${i === 1 ? 128 + k * 12 : 188}l13 -9l6 15Z`, 'existing');
        return s + t(x + 72, 249, String(i + 1), 'middle');
      })
      .join('') +
    a('M58 291H506') +
    t(280, 326, 'Playback may run either way.', 'middle') +
    baseline('Reverse the order, preserve the fragments.'),
);

draw(
  'hidden-cut',
  'frame-sequence',
  [
    ['Take A', 40],
    ['Obstruction', 215],
    ['Take B', 390],
  ]
    .map(
      ([s, x], i) =>
        frame(x, 85, 145, 170) +
        t(x + 72, 45, s, 'middle') +
        (i === 1
          ? r(x + 28, 85, 90, 170, 'existing')
          : person(x + 72, 235, 115, i === 2 ? 'outline-green' : 'line')),
    )
    .join('') +
    p('M288 277V326', 'outline-green') +
    t(280, 355, 'Join while the frame is concealed.', 'middle'),
);

draw(
  'rotating-set',
  'section',
  t(280, 43, 'The room turns', 'middle') +
    r(116, 80, 285, 235, 'boundary') +
    group(
      260,
      199,
      `<g transform="rotate(-27)">${r(-105, -84, 210, 168, 'existing')}${p('M-100 49H100', 'line')}${person(0, 48, 100)}</g>`,
    ) +
    a('M414 132Q472 187 425 260') +
    a('M76 121V287', 'line') +
    t(67, 331, 'Gravity') +
    baseline('Gravity stays vertical as the set rotates.'),
);

draw(
  'breakaway-versions',
  'object-comparison',
  [
    ['Appearance', 40],
    ['Action', 215],
    ['Aftermath', 390],
  ]
    .map(([s, x], i) => {
      let b = panel(x, 87, 145, 180) + t(x + 72, 45, s, 'middle');
      if (i < 2)
        b += p(
          `M${x + 30} 129h85v30h-85ZM${x + 37} 159v78M${x + 108} 159v78`,
          i === 1 ? 'outline-green' : 'line',
        );
      else
        b += p(
          `M${x + 25} 204l48 -25l31 13M${x + 28} 211l8 29M${x + 102} 201l15 29`,
          'outline-green',
        );
      return b;
    })
    .join('') + baseline('Different props carry one continuous event.'),
);

draw(
  'camera-mapping',
  'spatial',
  t(41, 43, 'Projection camera') +
    camera(78, 223) +
    p('M105 223L268 100L474 188L311 311Z', 'landscape') +
    p('M268 100L474 188V273L311 311L268 283Z', 'existing') +
    p('M311 119V311M268 196L474 233', 'fine') +
    p('M105 223L268 100M105 223L311 311M105 223L474 188', 'outline-green') +
    camera(149, 311, -20) +
    a('M174 305Q200 273 206 242') +
    t(335, 319, 'Viewing camera') +
    baseline('Simple depth supports a limited new view.'),
);

draw(
  'peppers-ghost-rays',
  'optical-plan',
  t(47, 43, 'Hidden source') +
    person(280, 135, 68, 'outline-green') +
    camera(70, 229) +
    r(395, 172, 111, 111, 'existing') +
    p('M225 284L335 174', 'glassed') +
    a('M280 143V229H101') +
    p('M308 229H395', 'fine') +
    t(343, 139, 'Glass') +
    t(399, 320, 'Visible set') +
    baseline('Reflection and transmitted view overlap.'),
);

draw(
  'schufftan-masked-mirror',
  'optical-plan',
  camera(69, 223) +
    p('M222 276L331 167', 'line') +
    p('M224 274L301 197', 'outline-green') +
    p('M317 181L330 168', 'outline-green') +
    p('M303 195L315 183', 'dashed') +
    r(386, 179, 105, 90, 'existing') +
    r(228, 77, 92, 48, 'existing') +
    a('M274 126V219H102') +
    p('M99 223L435 173', 'fine') +
    t(43, 315, 'Camera') +
    t(337, 144, 'Clear patch') +
    t(389, 306, 'Live action') +
    baseline('Reflect the model; see through the cleared area.'),
);

draw(
  'slit-scan-exposure',
  'section-and-frame',
  t(53, 43, 'Camera travel') +
    camera(80, 160) +
    a('M112 125H205') +
    r(278, 92, 8, 134, 'existing') +
    r(278, 139, 8, 42, 'intervention') +
    r(407, 91, 91, 138, 'existing') +
    p('M412 115h80M412 145h80M412 175h80M412 205h80', 'fine') +
    p('M106 160L279 141M106 160L279 181', 'outline-green') +
    t(270, 266, 'Slit') +
    t(402, 266, 'Artwork') +
    frame(52, 298, 451, 40) +
    [0, 1, 2, 3, 4, 5]
      .map((i) => p(`M${70 + i * 24} 306L${265 + i * 42} 328`, 'outline-green'))
      .join('') +
    baseline('One open exposure accumulates traces.'),
);

draw(
  'diffusion-highlight',
  'image-comparison',
  t(147, 44, 'Without diffusion', 'middle') +
    t(416, 44, 'With diffusion', 'middle') +
    frame(42, 84) +
    frame(311, 84) +
    r(61, 101, 172, 109, 'existing') +
    r(330, 101, 172, 109, 'existing') +
    c(147, 156, 12, 'intervention') +
    [44, 32, 20].map((rr) => c(416, 156, rr, 'fine')).join('') +
    c(416, 156, 12, 'intervention') +
    p('M416 205V278H340', 'leader') +
    t(339, 307, 'Scattered light') +
    baseline('A bright core gains a wider influence.'),
);

draw(
  'substitution-join',
  'editing-sequence',
  t(110, 43, 'Before stop', 'middle') +
    t(450, 43, 'After restart', 'middle') +
    frame(35, 83, 150, 163) +
    frame(375, 83, 150, 163) +
    c(110, 167, 29, 'existing') +
    p('M108 137l8-14', 'fine') +
    p('M418 182q30 -33 59 0q-9 25-44 15Z', 'existing') +
    c(465, 151, 16, 'existing') +
    p('M478 148l17 7l-17 7', 'line') +
    p('M218 80V260M342 80V260', 'fine') +
    r(219, 99, 122, 145, 'landscape') +
    t(280, 137, 'Replace', 'middle') +
    t(280, 169, 'off camera', 'middle') +
    a('M178 298H381') +
    baseline('The replacement interval never reaches the screen.'),
);

draw(
  'bullet-time-array',
  'plan',
  t(280, 42, 'Many viewpoints; one event', 'middle') +
    c(280, 203, 28, 'existing') +
    [-150, -120, -90, -60, -30, 0, 30]
      .map((deg) => {
        const q = (deg * Math.PI) / 180,
          x = 280 + 146 * Math.cos(q),
          y = 210 + 110 * Math.sin(q);
        return camera(x, y, deg + 180) + p(`M${x} ${y}L280 203`, 'fine');
      })
      .join('') +
    a('M78 170Q100 320 290 332') +
    t(380, 328, 'Select views') +
    baseline('Viewpoint changes without advancing the event.'),
);

draw(
  'motion-control-passes',
  'plan-and-sequence',
  t(58, 43, 'Repeat the same camera path') +
    a('M67 126C169 67 352 67 489 128') +
    [90, 277, 464].map((x) => camera(x, 133, -90)).join('') +
    person(280, 260, 87) +
    [40, 215, 390]
      .map(
        (x, i) =>
          frame(x, 291, 145, 43) + t(x + 72, 321, ['Set', 'Performer', 'Effect'][i], 'middle'),
      )
      .join('') +
    baseline('Matching viewpoints allow separate passes to combine.'),
);

draw(
  'capture-playback-rates',
  'timeline',
  t(41, 43, 'One second of action') +
    [12, 24, 48]
      .map((n, i) => {
        const y = 104 + i * 76;
        return (
          t(40, y + 7, n + ' fps') +
          r(147, y - 18, n * 6.3, 32, i === 1 ? 'existing' : 'landscape') +
          p(`M147 ${y + 19}h${n * 6.3}`, 'outline-green') +
          t(510, y + 7, ['0.5 s', '1 s', '2 s'][i], 'end')
        );
      })
      .join('') +
    baseline('Play every version at 24 frames per second.'),
);

draw(
  'impact-evidence-timing',
  'timeline',
  t(41, 43, 'One apparent impact') +
    p('M180 83V305M496 83V305', 'dashed') +
    [
      ['Reaction', 111],
      ['Surface cue', 184],
      ['Sound', 257],
    ]
      .map(
        ([s, y]) =>
          t(42, y + 8, s) +
          p(`M185 ${y}H490`, 'fine') +
          r(286, y - 13, 67, 26, 'landscape') +
          c(320, y, 5, 'intervention'),
      )
      .join('') +
    p('M320 77V306', 'outline-green') +
    baseline('Coordinate the cues around the same screen moment.'),
);

draw(
  'cheated-contact-viewpoint',
  'plan-and-frame',
  t(45, 43, 'Top view') +
    camera(73, 203) +
    p('M100 203H468', 'fine') +
    c(277, 168, 26, 'existing') +
    c(423, 230, 26, 'existing') +
    p('M277 168L350 203', 'outline-green') +
    p('M423 230L390 203', 'line') +
    p('M352 200H388', 'dashed') +
    t(335, 153, 'Real gap') +
    frame(326, 276, 184, 50) +
    p('M350 312h67M422 296v32', 'outline-green') +
    t(44, 318, 'Camera hides it') +
    baseline('Angle, reaction and timing imply contact.'),
);

draw(
  'negative-fill-paths',
  'lighting-plan',
  t(41, 43, 'Top view') +
    person(280, 260, 110) +
    r(60, 115, 53, 80, 'existing') +
    p('M114 125L267 187L267 241L114 185Z', 'landscape') +
    a('M120 154L239 204') +
    r(427, 104, 19, 173, 'intervention') +
    p('M449 156L342 200M449 241L342 221', 'dashed') +
    t(45, 316, 'Key light') +
    t(386, 316, 'Black flag') +
    baseline('Keep the key; reduce reflected fill.'),
);

draw(
  'miniature-shot-layers',
  'layer-stack',
  t(43, 43, 'One image; separate ingredients') +
    [
      ['Model', 65],
      ['Atmosphere', 146],
      ['Added figures', 227],
    ]
      .map(([s, y], i) => box(76, y, 408, 55, s, i === 1 ? 'landscape' : 'existing'))
      .join('') +
    a('M280 290V333') +
    baseline('Match viewpoint, light and apparent scale.'),
);

draw(
  'selective-focus-depth',
  'frame-depth-map',
  t(41, 43, 'Same objects; a different sharpness pattern') +
    frame(49, 76, 462, 230) +
    r(50, 76, 460, 70, 'existing') +
    r(50, 147, 460, 86, 'landscape') +
    r(50, 234, 460, 71, 'existing') +
    [109, 189, 267]
      .map((y, i) =>
        [101, 224, 347]
          .map((x) =>
            p(`M${x} ${y}l15 -13h44l15 13l-7 12h-60Z`, i === 1 ? 'outline-green' : 'fine'),
          )
          .join(''),
      )
      .join('') +
    t(438, 119, 'Soft') +
    t(438, 196, 'Sharp') +
    t(438, 277, 'Soft') +
    baseline('Assign focus by scene depth, not object size.'),
);

draw(
  'wild-wall-access',
  'plan',
  t(42, 43, 'Camera outside the room') +
    r(189, 84, 307, 217, 'landscape') +
    p('M189 139V84H496V301H189V254', 'wall-line') +
    p('M189 142V251', 'dashed') +
    r(137, 278, 9, 50, 'intervention') +
    camera(63, 194) +
    p('M90 194L364 123L364 270Z', 'fine') +
    person(365, 259, 88) +
    a('M177 249L149 278') +
    t(205, 325, 'Removed panel') +
    baseline('The frame excludes the opening it looks through.'),
);

draw(
  'creative-geography-pemberley',
  'editing-geography',
  t(150, 43, 'Location A', 'middle') +
    t(410, 43, 'Location B', 'middle') +
    r(49, 86, 202, 165, 'existing') +
    r(309, 86, 202, 165, 'existing') +
    p('M62 191l86-63l87 63M330 129h160v91H330Z', 'line') +
    box(75, 264, 150, 44, 'Exterior', 'landscape') +
    box(335, 264, 150, 44, 'Interior', 'landscape') +
    a('M231 166H296') +
    baseline('An edit connects separate places into one.'),
);

draw(
  'split-diopter-zones',
  'lens-and-frame',
  t(141, 43, 'Lens attachment', 'middle') +
    c(141, 165, 71, 'line') +
    p('M141 94A71 71 0 0 0 141 236Z', 'landscape') +
    p('M141 94V236', 'outline-green') +
    frame(276, 88, 242, 180) +
    person(329, 247, 123, 'outline-green') +
    person(470, 232, 64) +
    p('M398 91V266', 'dashed') +
    t(325, 307, 'Near', 'middle') +
    t(470, 307, 'Far', 'middle') +
    baseline('Two focus zones; the boundary needs concealment.'),
);

draw(
  'probe-relay-paths',
  'optical-section',
  t(42, 43, 'Straight probe') +
    camera(68, 112) +
    r(95, 106, 320, 12, 'landscape') +
    p('M98 112H418', 'outline-green') +
    c(453, 111, 15, 'existing') +
    t(41, 232, 'Periscope head') +
    camera(69, 300) +
    r(96, 294, 266, 12, 'landscape') +
    r(351, 212, 12, 88, 'landscape') +
    p('M98 300H357V211', 'outline-green') +
    p('M345 310L369 286', 'line') +
    c(357, 174, 15, 'existing') +
    baseline('The optical head sets the viewing position.'),
);

draw(
  'body-camera-anchor',
  'frame-comparison',
  t(146, 43, 'Body mount', 'middle') +
    t(416, 43, 'Room camera', 'middle') +
    [41, 311]
      .map(
        (x) =>
          frame(x, 83, 210, 170) + p(`M${x + 20} 103v126h48V103M${x + 121} 103v126h48V103`, 'fine'),
      )
      .join('') +
    person(146, 239, 117, 'outline-green') +
    person(385, 239, 117) +
    p('M105 264H188', 'fine') +
    a('M354 280H475') +
    t(280, 324, 'Which reference stays stable?', 'middle') +
    baseline('Anchor the viewpoint to the torso or the room.'),
);

draw(
  'silver-retention-path',
  'process-branch',
  t(280, 42, 'After color development', 'middle') +
    box(171, 82, 218, 49, 'Dyes + silver') +
    a('M225 139L146 193', 'fine') +
    a('M335 139L416 193') +
    box(40, 207, 212, 57, 'Silver removed') +
    box(310, 207, 212, 57, 'Silver retained', 'landscape') +
    t(146, 305, 'Dye image', 'middle') +
    t(416, 305, 'Dyes + silver', 'middle') +
    baseline('Residual silver changes tone and color separation.'),
);

draw(
  'stop-motion-frames',
  'exposure-sequence',
  t(41, 43, 'Changes happen between exposures') +
    [0, 1, 2]
      .map((i) => {
        const x = 40 + i * 175;
        return (
          frame(x, 83, 145, 171) +
          person(x + 72, 236, 106, 'outline-green', i) +
          t(x + 72, 292, 'Frame ' + (i + 1), 'middle')
        );
      })
      .join('') +
    baseline('Pose a joint or replace a part; record one frame.'),
);

draw(
  'match-cut-alignment',
  'frame-comparison',
  t(146, 43, 'Shot A', 'middle') +
    t(416, 43, 'Shot B', 'middle') +
    frame(41, 83) +
    frame(311, 83) +
    c(146, 155, 44, 'outline-green') +
    p('M188 140C222 129 222 183 188 172', 'line') +
    c(416, 155, 44, 'outline-green') +
    c(400, 146, 8, 'existing') +
    c(430, 172, 12, 'existing') +
    p('M146 240V275H416V240', 'leader') +
    t(280, 313, 'Shared position + shape', 'middle') +
    baseline('A direct cut carries a visual relationship.'),
);

draw(
  'wire-support-roles',
  'section',
  t(47, 43, 'Support outside the frame') +
    p('M85 91H475M120 91V54M440 91V54', 'line') +
    p('M215 91L263 210M355 91L295 210', 'outline-green') +
    person(279, 276, 120) +
    r(146, 130, 265, 181, 'boundary') +
    camera(71, 261) +
    t(422, 248, 'Frame') +
    baseline('Retain the performance; remove visible support.'),
);

draw(
  'rear-projection-layout',
  'optical-plan',
  t(42, 43, 'Rear projection') +
    camera(63, 211) +
    person(253, 250, 100) +
    p('M361 104V292', 'glassed') +
    camera(464, 211, 180) +
    p('M438 210L362 123L362 280Z', 'landscape') +
    p('M89 210H229M276 210H359', 'fine') +
    t(312, 330, 'Screen') +
    baseline('Projector and camera occupy opposite sides.'),
);

draw(
  'front-projection-layout',
  'optical-plan',
  t(42, 43, 'Front projection') +
    camera(62, 209) +
    camera(251, 84, 90) +
    p('M199 257L300 157', 'glassed') +
    p('M460 101V295', 'line') +
    person(362, 257, 100) +
    a('M251 112V207H458') +
    p('M460 219H91', 'fine') +
    t(355, 329, 'Reflective screen') +
    baseline('A beam splitter aligns projection with the camera.'),
);

draw(
  'day-night-contributions',
  'frame-and-process',
  t(146, 43, 'Capture', 'middle') +
    t(416, 43, 'Finish', 'middle') +
    frame(41, 83) +
    frame(311, 83) +
    [41, 311].map((x) => p(`M${x + 9} 197l50 -56l37 32l40 -66l66 90`, 'fine')).join('') +
    r(61, 115, 50, 81, 'existing') +
    r(331, 115, 50, 81, 'existing') +
    person(182, 212, 75) +
    person(452, 212, 75, 'outline-green') +
    p('M313 128H519', 'dashed') +
    t(142, 292, 'Useful detail', 'middle') +
    t(415, 292, 'Shape the night', 'middle') +
    baseline('Exposure, sky and local light have separate jobs.'),
);

draw(
  'dry-wet-cues',
  'layer-stack',
  t(40, 43, 'Build one underwater impression') +
    [
      ['Performance', 82],
      ['Light + hair', 163],
      ['Water detail', 244],
    ]
      .map(([s, y], i) => box(100, y, 360, 51, s, i === 1 ? 'landscape' : 'existing'))
      .join('') +
    a('M280 142V155') +
    a('M280 224V237') +
    baseline('Each cue must describe the same environment.'),
);

draw(
  'cloud-tank-layers',
  'tank-section',
  t(43, 43, 'Tank section') +
    r(59, 86, 443, 217, 'boundary') +
    r(60, 87, 441, 91, 'existing') +
    r(60, 178, 441, 124, 'landscape') +
    p('M60 178H501', 'outline-green') +
    p(
      'M270 62V135Q263 159 228 166Q176 167 151 180Q209 203 270 184Q320 204 396 177Q347 163 305 166Q287 155 290 136V62',
      'fine',
    ) +
    t(73, 132, 'Upper water') +
    t(75, 269, 'Denser layer') +
    a('M280 108V155') +
    baseline('A plume spreads near a density boundary.'),
);

draw(
  'gimbal-camera-relationship',
  'section-comparison',
  t(146, 43, 'Camera stays', 'middle') +
    t(416, 43, 'Camera rides', 'middle') +
    [146, 416]
      .map(
        (x, i) =>
          group(
            x,
            183,
            `<g transform="rotate(-15)">${r(-75, -43, 150, 98, 'existing')}${person(0, 48, 71)}${i ? camera(-48, -9) : ''}</g>`,
          ) +
          c(x, 254, 11, 'glassed') +
          p(`M${x - 57} 290L${x} 254L${x + 57} 290`, 'fine'),
      )
      .join('') +
    camera(52, 235) +
    p('M79 235L112 206', 'fine') +
    a('M228 160Q254 199 223 234') +
    a('M499 160Q525 199 494 234') +
    baseline('Relative camera motion changes the perceived movement.'),
);

draw(
  'rain-light-background',
  'lighting-section',
  t(43, 43, 'Rain seen from the side') +
    camera(62, 203) +
    person(262, 255, 105) +
    r(448, 151, 30, 48, 'existing') +
    p('M446 156L308 126L308 263L446 194Z', 'landscape') +
    a('M438 177H338') +
    [
      [174, 147],
      [203, 244],
      [335, 111],
      [360, 218],
    ]
      .map(([x, y]) => p(`M${x} ${y}l-5 20`, 'outline-green'))
      .join('') +
    t(43, 318, 'Camera') +
    t(402, 318, 'Backlight') +
    baseline('Light separates transparent drops from the background.'),
);

draw(
  'crowd-authored-rules',
  'process',
  t(280, 43, 'Resources + direction', 'middle') +
    [
      ['Bodies', 40],
      ['Actions', 215],
      ['Rules', 390],
    ]
      .map(([s, x]) => box(x, 85, 145, 49, s))
      .join('') +
    p('M112 145L280 177L462 145', 'fine') +
    a('M280 177V199') +
    box(104, 211, 352, 48, 'Routes + density', 'landscape') +
    [100, 170, 240, 310, 380, 450]
      .map((x, i) => person(x, 329, 48, i % 3 ? 'line' : 'outline-green'))
      .join('') +
    baseline('Shared resources produce varied, directed activity.'),
);

draw(
  'performance-to-character',
  'process',
  t(41, 43, 'Performance is the input') +
    [
      ['Record', 41],
      ['Retarget', 216],
      ['Refine', 391],
    ]
      .map(([s, x]) => box(x, 81, 144, 47, s))
      .join('') +
    a('M188 104H209') +
    a('M363 104H384') +
    person(113, 292, 113) +
    person(288, 292, 130, 'outline-green') +
    p(
      'M448 172Q475 167 482 196L466 213V251L487 287M462 214L435 244M466 251L444 287',
      'outline-green',
    ) +
    c(467, 172, 15, 'outline-green') +
    baseline('Adapt the acting to the character’s anatomy.'),
);

draw(
  'prosthetic-edge-section',
  'material-section',
  t(43, 43, 'Enlarged section') +
    r(59, 217, 442, 67, 'existing') +
    p('M61 217C133 217 156 195 215 152Q270 105 310 151Q368 210 499 217Z', 'landscape') +
    p('M61 217C133 217 156 195 215 152Q270 105 310 151Q368 210 499 217', 'outline-green') +
    p('M279 132V81H341M119 211L91 312H55', 'leader') +
    t(342, 69, 'Added volume', 'end') +
    t(55, 337, 'Thin edge') +
    t(419, 316, 'Skin') +
    baseline('Shape the volume; soften the join.'),
);

draw(
  'digital-replacement-scope',
  'scope-comparison',
  [
    ['Face', 110],
    ['Head', 280],
    ['Body', 450],
  ]
    .map(
      ([s, x], i) =>
        t(x, 43, s, 'middle') +
        panel(x - 66, 83, 132, 209) +
        person(x, 274, 137, i === 2 ? 'outline-green' : 'line') +
        (i === 0
          ? c(x, 157.55, 9, 'intervention')
          : i === 1
            ? `<g transform="translate(${x} 274) scale(1.37)" class="figure-accent"><path d="M-7-76C-15-79-15-92-7-96C1-100 10-95 10-88L15-84 10-81C10-75 5-72 0-73L-1-67-8-69Z"/></g>`
            : ''),
    )
    .join('') + baseline('Green marks the part replaced by the digital double.'),
);

draw(
  'animatronic-control-chain',
  'mechanism-section',
  box(42, 74, 186, 52, 'Control input') +
    box(314, 74, 204, 52, 'Mechanism') +
    a('M237 100H302') +
    p('M258 246Q269 171 338 166L459 199L489 228L369 246L454 273Q345 313 280 278Z', 'existing') +
    c(337, 245, 7, 'intervention') +
    p('M337 245L450 272', 'outline-green') +
    a('M417 137V181') +
    t(40, 281, 'Jaw rotation') +
    baseline('The joint moves; the outer surface must follow.'),
);

draw(
  'creature-suit-body',
  'body-section',
  t(43, 43, 'Performer inside a different silhouette') +
    p(
      'M212 111Q219 74 272 81L391 104L392 130L302 148L325 179L355 224L335 240L306 211L312 285L340 316L320 331L276 293L257 330L225 330L238 278L228 207L198 236L178 218L206 178Z',
      'existing',
    ) +
    person(269, 312, 186, 'outline-green') +
    p('M269 247H400V277H475', 'leader') +
    t(477, 303, 'Balance', 'end') +
    baseline('Design around joints, movement and balance.'),
);

draw(
  'cleanup-rebuild-layers',
  'composite-stages',
  [
    ['Plate', 40],
    ['Repair', 215],
    ['Foreground', 390],
  ]
    .map(([s, x], i) => {
      let b = t(x + 72, 43, s, 'middle') + frame(x, 83, 145, 184);
      for (let k = 0; k < 5; k++) b += p(`M${x + 17 + k * 27} 91V258`, 'fine');
      if (i === 0) b += person(x + 72, 248, 109);
      else
        b +=
          r(x + 38, 124, 69, 124, 'landscape') +
          p(`M${x + 44} 125v121M${x + 71} 125v121M${x + 98} 125v121`, 'fine');
      if (i !== 1) b += p(`M${x + 6} 210H${x + 139}`, 'outline-green');
      return b;
    })
    .join('') + baseline('Rebuild what was hidden, then restore overlap.'),
);

draw(
  'roto-shape-and-matte',
  'mask-comparison',
  [
    ['Source', 40],
    ['Matte', 215],
    ['Composite', 390],
  ]
    .map(([s, x], i) => {
      let b = t(x + 72, 43, s, 'middle') + frame(x, 83, 145, 181);
      if (i !== 1)
        b += p(
          `M${x + 8} 126H${x + 137}M${x + 8} 179H${x + 137}M${x + 8} 225H${x + 137}`,
          i === 2 ? 'outline-green' : 'fine',
        );
      b +=
        c(x + 72, 143, 12, i === 1 ? 'intervention' : 'existing') +
        p(
          `M${x + 59} 160h26v36l20 48h-15l-18-32l-18 32h-15l20-48Z`,
          i === 1 ? 'intervention' : 'existing',
        ) +
        p(
          `M${x + 59} 165l-20 28l9 7l24-29l24 29l9-7l-20-28`,
          i === 1 ? 'intervention' : 'existing',
        );
      return b;
    })
    .join('') + baseline('An animated boundary controls which layer appears.'),
);

draw(
  'simulation-state-steps',
  'process',
  t(280, 43, 'Calculate before rendering', 'middle') +
    box(105, 80, 351, 48, 'State + forces') +
    a('M280 138V162') +
    box(105, 175, 351, 48, 'Advance one step', 'landscape') +
    a('M469 200H505V106H467') +
    [110, 280, 450]
      .map((x, i) => c(x, 260 + i * 20, 8, 'intervention') + p(`M${x - 45} 323H${x + 45}`, 'fine'))
      .join('') +
    baseline('Repeat small updates, then review the motion.'),
);

draw(
  'morph-correspondence',
  'frame-sequence',
  [0, 0.5, 1]
    .map((v, i) => {
      const x = 106 + i * 175,
        rx = 36 + 20 * v,
        ry = 58 - 18 * v,
        e = 14 + 15 * v;
      return (
        t(x, 43, ['Source', 'Intermediate', 'Target'][i], 'middle') +
        `<ellipse cx="${x}" cy="175" rx="${rx}" ry="${ry}" class="landscape"/>` +
        `<ellipse cx="${x}" cy="175" rx="${rx}" ry="${ry}" class="line"/>` +
        c(x - e, 164, 3, 'intervention') +
        c(x + e, 164, 3, 'intervention') +
        p(`M${x - 14} 194Q${x} 205 ${x + 14} 194`, 'outline-green')
      );
    })
    .join('') +
    p('M93 287H470', 'fine') +
    a('M123 287H269') +
    a('M299 287H445') +
    baseline('Move corresponding features as appearance blends.'),
);

draw(
  'camera-parallax-agreement',
  'plan-and-parallax',
  t(43, 43, 'Fixed features; moving camera') +
    camera(76, 266, -52) +
    camera(253, 266, -52) +
    c(282, 172, 8, 'intervention') +
    c(417, 90, 8, 'existing') +
    p('M88 251L282 172M265 251L282 172', 'outline-green') +
    p('M88 251L417 90M265 251L417 90', 'fine') +
    a('M98 315H247') +
    t(305, 184, 'Near') +
    t(446, 97, 'Far') +
    baseline('Near points shift more as the camera translates.'),
);

draw(
  'photogrammetry-rays',
  'plan',
  t(280, 43, 'One shared surface detail', 'middle') +
    camera(81, 265, -31) +
    camera(479, 265, -149) +
    c(280, 125, 8, 'intervention') +
    p('M103 251L280 125L457 251', 'outline-green') +
    p('M262 125h36M280 107v36', 'fine') +
    t(84, 315, 'View A') +
    t(477, 315, 'View B', 'end') +
    baseline('Overlapping observations constrain depth.'),
);

draw(
  'interactive-light-consequence',
  'frame-comparison',
  t(145, 43, 'On set', 'middle') +
    t(415, 43, 'In the composite', 'middle') +
    [40, 310]
      .map(
        (x, i) =>
          frame(x, 82, 210, 181) +
          r(x + 20, 122, 30, 50, i ? 'landscape' : 'intervention') +
          p(`M${x + 51} 125L${x + 153} 150V205L${x + 51} 170Z`, 'landscape') +
          person(x + 152, 244, 105) +
          (i ? star(x + 36, 146, 22) : ''),
      )
      .join('') +
    baseline('Photograph the light’s influence on real surfaces.'),
);

draw(
  'hdr-capture-to-light',
  'capture-and-material',
  [
    ['Short', 40],
    ['Middle', 215],
    ['Long', 390],
  ]
    .map(
      ([s, x], i) =>
        t(x + 72, 43, s, 'middle') +
        frame(x, 77, 145, 91) +
        r(x + 12, 91, 121, 62, i === 2 ? 'paper' : 'existing') +
        r(x + 94, 94, 30, 47, i === 0 ? 'intervention' : 'landscape'),
    )
    .join('') +
    p('M112 178L280 208L462 178', 'fine') +
    a('M280 208V231') +
    box(108, 243, 345, 48, 'Radiance map', 'landscape') +
    c(146, 311, 14, 'existing') +
    c(415, 311, 14, 'existing') +
    r(418, 300, 6, 9, 'intervention') +
    baseline('One environment; different material responses.'),
);

// The view, not a decorative template, determines which composition is used.
for (const [id, drawing] of Object.entries({
  ...filmSpatialDrawings,
  ...filmPrecisionDrawings,
  ...filmReadableDrawings,
})) {
  filmDrawings[id] = { ...drawing, coordinateSpace: 'editorial' };
}

// The final character has volume; it is not a line skeleton.
filmDrawings['performance-to-character'].body = filmDrawings[
  'performance-to-character'
].body.replace(
  /<path d="M448 172[\s\S]*?<circle cx="467" cy="172" r="15" class="outline-green"\/>/,
  p(
    'M451 191Q436 178 450 162Q471 145 484 163L494 173 482 186 480 199Q493 214 487 231L505 225 512 208 522 211 517 238 493 253 484 248 473 254 490 285 478 290 460 264 448 289 436 284 450 252 448 224 432 243 423 236 440 209Z',
    'figure-accent',
  ),
);

export function renderFilmVisual(visual, compact = false) {
  const drawing = filmDrawings[visual.id];
  if (!drawing) throw Error('Missing drawing: ' + visual.id);
  let body = drawing.body;
  if (drawing.coordinateSpace === 'legacy') {
    if (compact) {
      body = body.replace(
        /<text x="280" y="376" text-anchor="middle">([^<]+)<\/text>/g,
        (_, value) => {
          if (value.length < 39)
            return `<text x="280" y="376" text-anchor="middle">${value}</text>`;
          const words = value.split(' ');
          let left = '';
          while (words.length && left.length < value.length / 2)
            left += (left ? ' ' : '') + words.shift();
          return `<text x="280" y="357" text-anchor="middle">${left}</text><text x="280" y="389" text-anchor="middle">${words.join(' ')}</text>`;
        },
      );
    }
    body = `<g class="legacy${compact ? ' compact' : ''}" transform="translate(0 8) scale(1.2857142857)">${body}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="560" viewBox="0 0 720 560" role="img" aria-labelledby="title desc" data-film-style="light-editorial" data-view="${drawing.view}">
<title id="title">${esc(visual.title)}</title>
<desc id="desc">${esc(visual.alt_text)} Original conceptual illustration; not a documented film setup.</desc>
<style>
:root{color-scheme:only light;--paper:#fff;--ink:#252c28;--line:#a6aca3;--stone:#f1f2ef;--mint:#edf5f0;--green:#00855b;--deep:#00855b}
svg{background:#fff;color:var(--ink)}
text{fill:var(--ink);font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:26px;font-weight:400;letter-spacing:0}
.heading{font-size:28px}.small,.caption{font-size:26px}
.legacy text{font-size:20.222222px}.legacy.compact text{font-size:21.777778px}
path,rect,circle,ellipse{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:butt}
.paper{fill:var(--paper)}.stone{fill:var(--stone)}
.existing,.wall{fill:var(--stone);stroke:var(--line);stroke-width:1.1}
.line{fill:none;stroke:var(--ink);stroke-width:1.3}
.hair,.fine,.leader,.boundary{fill:none;stroke:var(--line);stroke-width:1.1}
.wall-line{fill:none;stroke:var(--ink);stroke-width:1.8}
.landscape,.mint,.light{fill:var(--mint)}
.intervention,.new,.seat{fill:var(--green);stroke:none}
.outline-green,.accent{fill:none;stroke:var(--green);stroke-width:1.5}
.glassed,.glassed-line{fill:none;stroke:var(--green);stroke-width:1.2}
.glass{fill:var(--mint);stroke:var(--green);stroke-width:1.1}
.dashed{fill:none;stroke:var(--line);stroke-width:1;stroke-dasharray:5 5}
.figure,.ink{fill:var(--ink);stroke:none}.figure-accent{fill:var(--green);stroke:none}
.plan-head{fill:var(--paper);stroke:var(--ink);stroke-width:1.2}
.ghost{fill:none;stroke:var(--green);stroke-width:1.2;stroke-dasharray:3 4}
</style>
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L8 5L1 9" fill="none" stroke="var(--green)" stroke-width="1.1"/></marker>
<marker id="arrow-neutral" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L8 5L1 9" fill="none" stroke="var(--ink)" stroke-width="1.1"/></marker>
</defs>
<rect width="720" height="560" class="paper"/>
${body}
</svg>\n`;
}
