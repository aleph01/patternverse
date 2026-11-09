// Deliberate views for mechanisms that benefit from a spatial explanation.
// All coordinates are conceptual, not production measurements or rigging plans.
const path = (d, cls = 'hair', extra = '') => `<path d="${d}" class="${cls}" ${extra}/>`;
const text = (x, y, value, anchor = 'start', cls = 'small') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}">${value}</text>`;
const rect = (x, y, w, h, cls = 'boundary') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"/>`;
const cam = (x, y, angle = 0, scale = 1) =>
  `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">${path('M-25-14H9V14H-25ZM9-8L25-14V14L9 8Z', 'figure')}</g>`;
const topPerson = (x, y, scale = 1, angle = 0, ghost = false) =>
  `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">` +
  path('M-40 24Q-33 7-15 6H15Q33 7 40 24V35Q0 49-40 35Z', ghost ? 'ghost' : 'figure') +
  `<ellipse cx="0" cy="0" rx="21" ry="25" class="${ghost ? 'ghost' : 'plan-head'}"/>` +
  path('M-5-22L0-30L5-22', ghost ? 'ghost' : 'figure') +
  '</g>';

export const filmPrecisionDrawings = {};
const draw = (id, view, body) => (filmPrecisionDrawings[id] = { view, body });

draw(
  'peppers-ghost-rays',
  'optical-plan',
  text(42, 53, 'A hidden performer', 'start', 'heading') +
    text(604, 53, 'Visible set', 'end', 'heading') +
    rect(463, 169, 185, 253, 'boundary') +
    rect(577, 188, 48, 31, 'existing') +
    topPerson(360, 146, 0.72, 180) +
    topPerson(518, 300, 0.72, -90, true) +
    cam(85, 300) +
    path('M280 380L440 220', 'glassed') +
    path('M360 194V300H115', 'accent', 'marker-end="url(#arrow)"') +
    path('M360 300H570', 'dashed') +
    path('M570 314H115', 'hair') +
    path('M302 75H360V97', 'hair') +
    text(42, 395, 'Camera') +
    path('M93 373V328', 'hair') +
    text(291, 453, 'Partly reflective glass') +
    path('M344 425L302 361', 'hair') +
    text(514, 392, 'Virtual image', 'middle') +
    text(42, 530, 'Reflected light joins the view through the glass.', 'start', 'caption'),
);

draw(
  'bullet-time-array',
  'plan',
  text(42, 53, 'One event. Many viewpoints.', 'start', 'heading') +
    path('M132 314A230 198 0 0 1 588 314', 'dashed') +
    [-165, -135, -105, -75, -45, -15]
      .map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x = 360 + 228 * Math.cos(rad),
          y = 308 + 195 * Math.sin(rad);
        return (
          path(`M${x} ${y}L360 308`, 'hair') +
          cam(x, y, (Math.atan2(308 - y, 360 - x) * 180) / Math.PI, 0.75)
        );
      })
      .join('') +
    topPerson(360, 308, 0.75) +
    path('M137 366Q360 473 583 366', 'accent', 'marker-end="url(#arrow)"') +
    text(360, 449, 'Sequence the viewpoints', 'middle') +
    text(42, 530, 'The viewing angle changes around a held moment.', 'start', 'caption'),
);

draw(
  'motion-control-passes',
  'plan-and-sequence',
  text(42, 53, 'Repeat the camera path', 'start', 'heading') +
    path('M110 230C220 120 500 120 610 230', 'accent', 'marker-end="url(#arrow)"') +
    cam(110, 230, 24, 0.8) +
    cam(360, 147.5, 90, 0.8) +
    cam(610, 230, 156, 0.8) +
    topPerson(360, 306, 0.7) +
    path('M135 241L360 306L585 241M360 172V271', 'hair') +
    [
      ['Set', 42],
      ['Performer', 266],
      ['Effect', 490],
    ]
      .map(([s, x]) => rect(x, 411, 188, 56, 'boundary') + text(x + 94, 447, s, 'middle'))
      .join('') +
    text(42, 530, 'The same viewpoints let separate passes align.', 'start', 'caption'),
);

draw(
  'cheated-contact-viewpoint',
  'plan-and-frame',
  text(42, 53, 'Depth hides the gap', 'start', 'heading') +
    path('M105 260H539', 'dashed') +
    cam(80, 260) +
    topPerson(294, 160, 0.7, 90) +
    topPerson(456, 260, 0.8) +
    path('M281 183Q317 213 343 249L352 254 351 266 338 268Q309 235 273 206Z', 'figure-accent') +
    path('M358 254V266M424 254V266M358 260H424', 'hair') +
    text(389, 204, 'Real gap', 'middle') +
    path('M389 216V244', 'hair') +
    text(42, 337, 'Camera axis') +
    path('M113 313V281', 'hair') +
    rect(426, 386, 229, 114, 'boundary') +
    path('M434 447H520L536 454 532 468H434Z', 'figure-accent') +
    path(
      'M554 416Q584 408 590 434L578 446 584 453 576 465 577 488H550L546 464Q526 455 534 435Z',
      'figure',
    ) +
    text(42, 425, 'In the frame:') +
    text(42, 460, 'shapes overlap') +
    text(42, 540, 'Viewpoint, reaction and timing imply contact.', 'start', 'caption'),
);

draw(
  'rear-projection-layout',
  'optical-plan',
  text(42, 53, 'Photograph both layers together', 'start', 'heading') +
    cam(86, 291) +
    topPerson(304, 291, 0.75, -90) +
    path('M439 151V400', 'glassed') +
    path('M602 291L441 168V384Z', 'mint') +
    cam(626, 291, 180) +
    path('M113 291H270M343 291H437', 'hair') +
    text(43, 430, 'Camera') +
    text(259, 430, 'Actor') +
    text(426, 475, 'Screen', 'middle') +
    path('M438 449V410', 'hair') +
    text(665, 430, 'Projector', 'end') +
    text(42, 530, 'Camera and projector face opposite sides of the screen.', 'start', 'caption'),
);

draw(
  'front-projection-layout',
  'optical-plan',
  text(42, 53, 'Align projection with the camera', 'start', 'heading') +
    cam(78, 291) +
    cam(330, 126, 90) +
    path('M259 362L401 220', 'glassed') +
    path('M617 166V410', 'line') +
    path('M330 152V291H614', 'accent', 'marker-end="url(#arrow)"') +
    path('M615 305H106', 'hair') +
    topPerson(483, 292, 0.7, -90) +
    text(42, 423, 'Camera') +
    text(377, 139, 'Projector') +
    text(272, 471, 'Beam splitter') +
    path('M320 446L293 337', 'hair') +
    text(664, 471, 'Screen', 'end') +
    path('M617 444V419', 'hair') +
    text(42, 530, 'The screen returns the background toward the lens.', 'start', 'caption'),
);

draw(
  'miniature-shot-layers',
  'cutaway-and-frame',
  text(42, 53, 'A small model. A full-sized world.', 'start', 'heading') +
    path('M170 390L290 280H660L540 390Z', 'stone') +
    path('M170 390V407H540V390M540 407L660 297V280', 'hair') +
    path('M280 330V190H445V330Z', 'existing') +
    path('M445 190L500 160V300L445 330Z', 'mint') +
    path('M280 190L335 160H500L445 190Z', 'paper', 'stroke="var(--line)"') +
    [213, 248, 283].map((y) => path(`M298 ${y}H427`, 'hair')).join('') +
    [317, 361, 405].map((x) => path(`M${x} 205V312`, 'hair')).join('') +
    path('M352 330V296H378V330', 'line') +
    cam(110, 330, -14) +
    path('M134 324L280 190M134 324L280 330', 'accent') +
    text(42, 449, 'Low camera position') +
    path('M132 421V352', 'hair') +
    text(638, 444, 'Model stage', 'end') +
    text(42, 505, 'Perspective and light establish scale.', 'start', 'caption') +
    text(42, 540, 'Atmosphere and added figures complete the image.', 'start', 'caption'),
);

draw(
  'cloud-tank-layers',
  'tank-cutaway',
  text(42, 53, 'A plume meets a density boundary', 'start', 'heading') +
    path('M128 179L208 129H612V369L532 419H128Z', 'boundary') +
    path('M128 279L208 229H612V369L532 419H128Z', 'mint') +
    path('M128 279H532L612 229H208Z', 'paper', 'stroke="var(--line)"') +
    path('M128 179H532V419M532 179L612 129M532 279L612 229', 'hair') +
    path('M128 279H532', 'accent') +
    path(
      'M351 111V221Q345 250 296 257Q228 253 206 276Q257 299 311 281Q342 300 369 284Q425 308 487 278Q465 254 396 258Q374 242 371 222V111',
      'stone',
      'stroke="var(--line)" stroke-width="1.2"',
    ) +
    path('M361 157V229', 'accent', 'marker-end="url(#arrow)"') +
    text(152, 224, 'Upper water') +
    text(151, 379, 'Denser layer') +
    text(42, 530, 'The interface encourages the plume to spread.', 'start', 'caption'),
);

draw(
  'animatronic-control-chain',
  'mechanism-cutaway',
  text(42, 53, 'A control becomes a performance', 'start', 'heading') +
    path(
      'M236 337Q212 204 336 179L543 229Q589 260 549 300L391 311L529 352Q432 401 328 372Q263 386 236 337Z',
      'existing',
    ) +
    path('M351 304L550 298L522 324L388 321Z', 'paper') +
    path('M353 315L519 353', 'accent') +
    path('M353 315L418 250', 'accent') +
    rect(397, 233, 60, 29, 'mint') +
    `<circle cx="353" cy="315" r="9" class="intervention"/>` +
    path('M507 370Q549 352 548 321', 'accent', 'marker-end="url(#arrow)"') +
    text(42, 177, 'Control input') +
    path('M112 195V247H390', 'hair') +
    text(491, 132, 'Mechanism') +
    path('M528 148V204L451 231', 'hair') +
    text(42, 429, 'Jaw pivot') +
    path('M166 418H292L344 323', 'hair') +
    text(42, 530, 'Internal movement must carry the outer surface.', 'start', 'caption'),
);

// A cross section is clearer than a perspective view for the relay optics.
draw(
  'probe-relay-paths',
  'optical-section',
  text(42, 53, 'Straight probe', 'start', 'heading') +
    cam(92, 155) +
    rect(118, 147, 398, 16, 'mint') +
    path('M117 155H520', 'accent') +
    `<circle cx="563" cy="155" r="19" class="existing"/>` +
    text(42, 286, 'Periscope head', 'start', 'heading') +
    cam(92, 391) +
    rect(118, 383, 352, 16, 'mint') +
    rect(454, 307, 16, 84, 'mint') +
    path('M118 391H462V303', 'accent') +
    path('M447 404L479 372', 'line') +
    `<circle cx="462" cy="265" r="19" class="existing"/>` +
    text(42, 530, 'The optical head sets the viewpoint.', 'start', 'caption'),
);
