// Authored spatial compositions for relationships that benefit from depth.
// Coordinates are schematic: no spans, clearances or layer thicknesses are prescribed.
const path = (d, cls = 'line') => `<path d="${d}" class="${cls}"/>`;
const label = (x, y, value, anchor = 'start') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}">${value}</text>`;
const point = (u, v, z = 0, origin = [280, 230]) => [
  origin[0] + u - v,
  origin[1] + (u + v) * 0.45 - z,
];
const polygon = (vertices, cls) => {
  const area =
    Math.abs(
      vertices.reduce((sum, [x, y], i) => {
        const next = vertices[(i + 1) % vertices.length];
        return sum + x * next[1] - next[0] * y;
      }, 0),
    ) / 2;
  // Broad highlighted surfaces stay quiet; their green edges carry the emphasis.
  const surface = cls === 'intervention' && area > 2800 ? 'highlight-plane' : cls;
  return path(vertices.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('') + 'Z', surface);
};
const plane = (u, v, w, d, cls = 'paper', z = 0, origin) =>
  polygon(
    [
      point(u, v, z, origin),
      point(u + w, v, z, origin),
      point(u + w, v + d, z, origin),
      point(u, v + d, z, origin),
    ],
    cls,
  );
const box = (u, v, w, d, h, cls = 'existing', origin) => {
  const b = point(u + w, v, 0, origin),
    c = point(u + w, v + d, 0, origin),
    e = point(u, v + d, 0, origin);
  const A = point(u, v, h, origin),
    B = point(u + w, v, h, origin),
    C = point(u + w, v + d, h, origin),
    E = point(u, v + d, h, origin);
  return (
    polygon([b, c, C, B], cls) +
    polygon([c, e, E, C], cls) +
    polygon([A, B, C, E], cls === 'intervention' ? cls : 'paper') +
    polygon([A, B, C, E], cls === 'intervention' ? 'outline-green' : 'line') +
    path(`M${b}L${B}M${c}L${C}M${e}L${E}`, 'fine')
  );
};
const route = (vertices) =>
  `<path d="${vertices.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('')}" class="route" marker-end="url(#arrow)"/>`;
const frame = (u, v, w, h, origin) =>
  polygon(
    [
      point(u, v, 0, origin),
      point(u + w, v, 0, origin),
      point(u + w, v, h, origin),
      point(u, v, h, origin),
    ],
    'line',
  );
const record = (alt_text, draw) => ({ projection: 'axonometric', alt_text, draw });

export const spatialDrawings = {
  'arcades:0': record(
    'Axonometric portico shows a continuous sheltered walking route beneath a roof, with columns and a seat beside it.',
    () => {
      const o = [257, 246];
      return (
        plane(-140, -65, 280, 130, 'boundary', 0, o) +
        box(-140, -62, 280, 12, 100, 'existing', o) +
        [-115, -35, 45, 125].map((u) => box(u, 43, 7, 7, 100, 'existing', o)).join('') +
        plane(-140, -62, 280, 115, 'intervention', 102, o) +
        box(-55, -37, 54, 18, 16, 'existing', o) +
        route([point(-145, 17, 0, o), point(147, 17, 0, o)]) +
        label(55, 30, 'Continuous shelter') +
        label(280, 374, 'A clear route beside places to pause.', 'middle')
      );
    },
  ),
  'entrance-transition:1': record(
    'Open-sided entrance drawing shows a sheltered landing and a continuous level route through a visible doorway into the interior.',
    () => {
      const o = [280, 266];
      return (
        plane(-140, -75, 280, 150, 'boundary', 0, o) +
        plane(0, -65, 130, 130, 'path-surface', 0, o) +
        box(0, -65, 10, 34, 100, 'existing', o) +
        box(0, 31, 10, 34, 100, 'existing', o) +
        plane(0, -65, 10, 130, 'existing', 100, o) +
        box(0, -31, 10, 62, 0, 'paper', o) +
        frame(10, -31, 0, 85, o) +
        plane(-60, -65, 70, 130, 'intervention', 101, o) +
        route([point(-142, 0, 0, o), point(120, 0, 0, o)]) +
        label(42, 75, 'Shelter at the door') +
        label(280, 382, 'One level through the threshold.', 'middle')
      );
    },
  ),
  'building-edge:1': record(
    'Spatial fragment separates the passing route from a sheltered sitting place beside the building, with private interior beyond the wall.',
    () => {
      const o = [270, 242];
      return (
        plane(-140, -70, 280, 160, 'boundary', 0, o) +
        box(-135, -65, 270, 12, 100, 'existing', o) +
        plane(-135, -52, 270, 60, 'landscape', 0, o) +
        plane(-135, -65, 270, 76, 'intervention', 103, o) +
        box(-75, -29, 65, 18, 19, 'existing', o) +
        route([point(-143, 58, 0, o), point(145, 58, 0, o)]) +
        label(45, 30, 'A sheltered pause') +
        label(280, 380, 'Keep passing and staying distinct.', 'middle')
      );
    },
  ),
  'wings-of-light:0': record(
    'Two axonometric building forms compare a deep block with shallow connected wings around an open garden, showing their different exposed edges.',
    () => {
      const a = [145, 233],
        b = [419, 233];
      return (
        box(-50, -47, 100, 94, 58, 'existing', a) +
        plane(-61, -58, 122, 116, 'boundary', 0, b) +
        plane(-11, -8, 72, 66, 'landscape', 0, b) +
        box(-61, -58, 50, 116, 58, 'existing', b) +
        box(-11, -58, 72, 50, 58, 'existing', b) +
        plane(-61, -58, 50, 116, 'intervention', 59, b) +
        label(145, 323, 'Deep block', 'middle') +
        label(414, 323, 'Shallow wings', 'middle') +
        label(280, 381, 'More edge changes more than daylight.', 'middle')
      );
    },
  ),
  'staircase-as-a-stage:0': record(
    'Open-sided spatial drawing shows a stair rising from a shared hall to a visible landing, with the lift arriving at the same upper level.',
    () => {
      const o = [274, 269];
      return (
        plane(-145, -72, 290, 144, 'boundary', 0, o) +
        plane(-15, -65, 150, 65, 'path-surface', 81, o) +
        Array.from({ length: 9 }, (_, i) =>
          box(-126 + i * 13, -23, 13, 43, (i + 1) * 9, 'existing', o),
        ).join('') +
        plane(-9, -23, 44, 43, 'intervention', 81, o) +
        box(89, -63, 43, 43, 102, 'existing', o) +
        path('M432 199V125H461', 'leader') +
        label(46, 72, 'Visible landing') +
        label(461, 110, 'Lift', 'end') +
        label(280, 385, 'Share the upper destination.', 'middle')
      );
    },
  ),
  'alcoves:0': record(
    'Open-sided room drawing shows a smaller sitting pocket defined by a return wall while remaining connected to the larger shared room.',
    () => {
      const o = [270, 247];
      return (
        plane(-140, -75, 280, 150, 'boundary', 0, o) +
        box(-140, -75, 280, 8, 95, 'existing', o) +
        box(-140, -67, 8, 142, 95, 'existing', o) +
        plane(-125, -57, 85, 85, 'landscape', 0, o) +
        box(-42, -67, 8, 69, 55, 'existing', o) +
        box(-108, -45, 43, 25, 18, 'intervention', o) +
        route([point(-80, 31, 0, o), point(88, 31, 0, o)]) +
        label(49, 30, 'A smaller setting') +
        label(280, 383, 'Shelter without closing off the room.', 'middle')
      );
    },
  ),
  'ceiling-height-variety:1': record(
    'Cutaway spatial drawing contrasts a lower canopy over a sitting edge with the taller open volume of the same room.',
    () => {
      const o = [273, 269];
      return (
        plane(-140, -75, 280, 150, 'boundary', 0, o) +
        box(-140, -75, 280, 7, 140, 'existing', o) +
        box(-140, -68, 7, 143, 140, 'existing', o) +
        plane(-133, -68, 78, 137, 'intervention', 80, o) +
        box(-116, -25, 42, 26, 18, 'existing', o) +
        box(31, -12, 68, 38, 28, 'existing', o) +
        label(45, 30, 'Lower sitting edge') +
        label(510, 30, 'Taller volume', 'end') +
        label(280, 389, 'Different scales within one room.', 'middle')
      );
    },
  ),
  'prospect:0': record(
    'Spatial drawing places a seat behind a wide framed opening toward a landscape, with a clear line of outlook from the occupied position.',
    () => {
      const o = [270, 250];
      return (
        plane(-130, -65, 260, 130, 'boundary', 0, o) +
        plane(-130, -134, 260, 64, 'landscape', 0, o) +
        frame(-130, -65, 260, 92, o) +
        box(-55, 13, 42, 29, 18, 'intervention', o) +
        path(`M${point(-33, 18, 30, o)}L${point(-33, -122, 30, o)}`, 'fine') +
        label(49, 62, 'A useful outlook') +
        label(280, 379, 'Check the view from the occupied seat.', 'middle')
      );
    },
  ),
  'refuge:0': record(
    'Open-sided room drawing places a seat against a protective return wall, with a visible outlook and an unobstructed route into the shared room.',
    () => {
      const o = [273, 244];
      return (
        plane(-140, -75, 280, 150, 'boundary', 0, o) +
        box(-110, -51, 94, 7, 69, 'existing', o) +
        box(-110, -44, 7, 74, 69, 'existing', o) +
        box(-84, -19, 40, 28, 18, 'intervention', o) +
        path(`M${point(-64, -5, 30, o)}L${point(96, -5, 30, o)}`, 'fine') +
        route([point(-62, 25, 0, o), point(-21, 54, 0, o), point(115, 54, 0, o)]) +
        label(50, 72, 'A protected back') +
        label(280, 379, 'An outlook and a clear way out.', 'middle')
      );
    },
  ),
  'external-solar-shading:2': record(
    'Three spatial window fragments compare an overhead shade, projecting vertical fins and an exterior screen, each placed outside the glazing.',
    () => {
      const origins = [
        [101, 242],
        [280, 242],
        [459, 242],
      ];
      return (
        origins.map((o) => frame(-41, 0, 82, 108, o)).join('') +
        plane(-48, -28, 96, 30, 'intervention', 110, origins[0]) +
        polygon(
          [
            point(-43, -28, 0, origins[1]),
            point(-43, 0, 0, origins[1]),
            point(-43, 0, 110, origins[1]),
            point(-43, -28, 110, origins[1]),
          ],
          'intervention',
        ) +
        polygon(
          [
            point(43, -28, 0, origins[1]),
            point(43, 0, 0, origins[1]),
            point(43, 0, 110, origins[1]),
            point(43, -28, 110, origins[1]),
          ],
          'intervention',
        ) +
        polygon(
          [
            point(-41, -22, 0, origins[2]),
            point(41, -22, 0, origins[2]),
            point(41, -22, 108, origins[2]),
            point(-41, -22, 108, origins[2]),
          ],
          'intervention',
        ) +
        label(102, 320, 'Overhang', 'middle') +
        label(282, 320, 'Fins', 'middle') +
        label(459, 320, 'Screen', 'middle') +
        label(280, 379, 'Match the device to the exposure.', 'middle')
      );
    },
  ),
  'structural-bay-rhythm:0': record(
    'Open structural frame shows repeated columns and beams above several possible room divisions, with one bay highlighted independently of partitions.',
    () => {
      const o = [280, 260];
      return (
        plane(-126, -64, 252, 128, 'boundary', 0, o) +
        [-126, 0, 126]
          .flatMap((u) => [-64, 64].map((v) => box(u - 3, v - 3, 6, 6, 103, 'existing', o)))
          .join('') +
        [-64, 64].map((v) => box(-129, v - 4, 258, 8, 7, 'existing', [o[0], o[1] - 103])).join('') +
        [-126, 0, 126]
          .map((u) => box(u - 4, -68, 8, 136, 7, 'existing', [o[0], o[1] - 103]))
          .join('') +
        plane(-120, -58, 114, 116, 'landscape', 0, o) +
        path(
          `M${point(-60, -58, 0, o)}L${point(-60, 58, 0, o)}M${point(6, 0, 0, o)}L${point(120, 0, 0, o)}`,
          'dashed',
        ) +
        label(48, 52, 'Frame + room layouts') +
        label(280, 388, 'Test several uses within the rhythm.', 'middle')
      );
    },
  ),
  'drained-ventilated-rainscreen:0': record(
    'Exploded wall fragment shows partial outer cladding, an open drainage cavity and a green drainage surface beside the protected inner wall, with water directed down and out.',
    () => {
      const o = [290, 286];
      return (
        box(-110, -75, 160, 16, 170, 'existing', o) +
        box(-110, -58, 160, 2, 170, 'intervention', o) +
        box(-110, 43, 95, 12, 170, 'existing', o) +
        route([point(30, 12, 146, o), point(30, 12, 8, o), point(30, 63, 8, o)]) +
        label(40, 30, 'Drainage surface') +
        label(515, 76, 'Open cavity', 'end') +
        label(280, 372, 'Cladding / cavity / protected wall', 'middle') +
        label(280, 399, 'Concept only; coordinate fire provisions.', 'middle')
      );
    },
  ),
  'repairable-connections:0': record(
    'Exploded spatial fragment separates one replaceable panel from its retained support, exposing the interface and the direction of access.',
    () => {
      const o = [280, 267];
      return (
        box(-95, -55, 180, 16, 142, 'existing', o) +
        [-65, 55].map((u) => box(u, -33, 9, 8, 125, 'existing', o)).join('') +
        box(-95, 54, 180, 9, 142, 'intervention', o) +
        route([point(0, 6, 70, o), point(0, 49, 70, o)]) +
        label(47, 35, 'Retain the support') +
        label(280, 382, 'Access the part and its connections.', 'middle')
      );
    },
  ),
  'loose-fit-layers:0': record(
    'Exploded building diagram separates the durable structural floor, an accessible services zone and changeable room divisions to show different rates of change.',
    () => {
      const o = [280, 299];
      return (
        box(-120, -65, 240, 130, 9, 'existing', o) +
        plane(-120, -65, 240, 130, 'boundary', 72, o) +
        path(
          `M${point(-98, 0, 72, o)}L${point(98, 0, 72, o)}M${point(0, -50, 72, o)}L${point(0, 50, 72, o)}`,
          'outline-green',
        ) +
        plane(-120, -65, 240, 130, 'boundary', 148, o) +
        polygon(
          [
            point(-30, -55, 148, o),
            point(-30, 55, 148, o),
            point(-30, 55, 194, o),
            point(-30, -55, 194, o),
          ],
          'existing',
        ) +
        label(46, 44, 'Changeable divisions') +
        label(494, 138, 'Services', 'end') +
        label(280, 399, 'Durable support; accessible interfaces.', 'middle')
      );
    },
  ),
  'design-for-disassembly:0': record(
    'Exploded assembly shows a component separated from retained supports, with a conceptual removal path that requires a designed stability and handling sequence.',
    () => {
      const o = [280, 286];
      return (
        [-97, 83].map((u) => box(u, -53, 14, 106, 70, 'existing', o)).join('') +
        plane(-97, -53, 194, 106, 'boundary', 72, o) +
        box(-97, -53, 194, 106, 12, 'intervention', [o[0], o[1] - 158]) +
        route([point(0, 0, 82, o), point(0, 0, 146, o)]) +
        label(46, 30, 'A recoverable assembly') +
        label(280, 379, 'Plan support, release and handling.', 'middle')
      );
    },
  ),
};
