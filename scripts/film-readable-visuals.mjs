// Readability revisions: time, viewpoint and exposure are named explicitly.
// Invented explanatory setups; no production measurements or rigging instructions.
const t = (x, y, value, anchor = 'start') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}">${value}</text>`;
const p = (d, cls = 'hair', extra = '') => `<path d="${d}" class="${cls}" ${extra}/>`;
const r = (x, y, w, h, cls = 'boundary') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"/>`;
const cam = (x, y, ghost = false) =>
  `<g transform="translate(${x} ${y}) rotate(-90)">${p('M-23-13H8V13H-23ZM8-8L24-13V13L8 8Z', ghost ? 'ghost' : 'figure')}</g>`;
const dot = (x, y, radius = 9, cls = 'intervention') =>
  `<circle cx="${x}" cy="${y}" r="${radius}" class="${cls}"/>`;
const arrow = (d) => p(d, 'accent', 'marker-end="url(#arrow)"');
export const filmReadableDrawings = {
  'motion-control-passes': {
    view: 'successive-passes-and-frames',
    body:
      [0, 1]
        .map((i) => {
          const x = 42 + i * 348;
          return (
            t(x, 53, `Pass ${i + 1}`) +
            r(x, 85, 288, 215) +
            r(x + 150, 119, 92, 42, 'existing') +
            dot(x + (i ? 185 : 100), 202, 17) +
            cam(x + 48, 245, true) +
            arrow(`M${x + 78} 245H${x + 182}`) +
            cam(x + 218, 245) +
            t(x, 342, i ? 'Same actor, role B' : 'Actor, role A')
          );
        })
        .join('') +
      t(42, 391, 'One camera; repeat the path and timing.') +
      [0, 1, 2]
        .map((i) => {
          const x = 42 + i * 224;
          return (
            r(x, 420, 188, 91) +
            r(x + 100, 438, 58, 23, 'existing') +
            (i !== 1 ? dot(x + 58, 481, 13) : '') +
            (i !== 0 ? dot(x + 115, 481, 13) : '') +
            t(x + 94, 548, ['Role A', 'Role B', 'Combined'][i], 'middle')
          );
        })
        .join(''),
  },
  'camera-parallax-agreement': {
    view: 'successive-camera-positions-and-view',
    body:
      t(42, 53, 'One camera, two positions') +
      cam(220, 280, true) +
      cam(400, 280) +
      arrow('M252 280H365') +
      dot(310, 151, 10) +
      dot(310, 79, 10, 'existing') +
      p('M220 256L310 151L400 256', 'accent') +
      p('M220 256L310 79L400 256') +
      t(340, 166, 'Near') +
      t(340, 89, 'Far') +
      t(42, 321, 'The same fixed details in each image:') +
      [0, 1]
        .map((i) => {
          const x = 42 + i * 348;
          return (
            r(x, 353, 288, 146) +
            dot(x + (i ? 80 : 210), 443, 14) +
            dot(x + (i ? 105 : 185), 395, 10, 'existing') +
            t(x + 144, 537, `View ${i + 1}`, 'middle')
          );
        })
        .join(''),
  },
  'slit-scan-exposure': {
    view: 'one-exposure-and-next-frame',
    body:
      t(42, 50, 'One frame stays exposed') +
      p('M42 83V70H678V83') +
      [0, 1, 2]
        .map((i) => {
          const x = 42 + i * 224;
          return (
            t(x + 94, 123, ['Early', 'Middle', 'Late'][i], 'middle') +
            r(x, 149, 188, 125) +
            r(x + 103 + i * 23, 205 - i * 19, 6, 22 + i * 38, 'intervention') +
            r(x + 79 - i * 23, 205 - i * 19, 6, 22 + i * 38, 'intervention') +
            p(`M${x + 66} 286H${x + 123}`, 'hair')
          );
        })
        .join('') +
      t(42, 332, 'Movement builds a streak during exposure.') +
      [0, 1]
        .map((i) => {
          const x = 108 + i * 348;
          return (
            r(x, 377, 156, 112) +
            Array.from({ length: 10 }, (_, j) =>
              p(
                `M${x + 78 - 10 - j * 5} ${423 - j * 4 + i * 4}V${445 + j * 4 - i * 4}M${x + 78 + 10 + j * 5} ${423 - j * 4 + i * 4}V${445 + j * 4 - i * 4}`,
                'accent',
              ),
            ).join('') +
            t(x + 78, 531, `Frame ${i + 1}`, 'middle')
          );
        })
        .join(''),
  },
  'bullet-time-array': {
    view: 'multiple-cameras-and-exposure-timing',
    body:
      t(42, 53, 'Several cameras around one event') +
      [-165, -135, -105, -75, -45, -15]
        .map((angle, i) => {
          const rad = (angle * Math.PI) / 180,
            x = 360 + 230 * Math.cos(rad),
            y = 270 + 155 * Math.sin(rad);
          return (
            p(`M${x} ${y}L360 270`) +
            `<g transform="translate(${x} ${y}) rotate(${(Math.atan2(270 - y, 360 - x) * 180) / Math.PI + 90})">${cam(0, 0)}</g>` +
            t(x, y - 27, String(i + 1), 'middle')
          );
        })
        .join('') +
      dot(360, 270, 24) +
      t(252, 360, 'Together') +
      t(476, 360, 'Staggered') +
      arrow('M242 389H431') +
      arrow('M476 389H665') +
      [0, 1, 2]
        .map((i) => {
          const y = 427 + i * 48;
          return (
            t(42, y + 8, `Camera ${i + 1}`) +
            p(`M242 ${y}H431M476 ${y}H665`) +
            dot(300, y, 8) +
            dot(501 + i * 62, y, 8)
          );
        })
        .join('') +
      t(42, 389, 'Time →'),
  },
  'hdr-capture-to-light': {
    view: 'exposure-series-and-material-response',
    body:
      t(42, 49, 'Exposure time') +
      ['Short', 'Medium', 'Long']
        .map((label, i) => {
          const x = 42 + i * 224;
          return (
            t(x + 94, 100, label, 'middle') +
            r(x, 126, 188, 116) +
            r(x + 12, 138, 164, 92, i === 2 ? 'paper' : 'existing') +
            r(x + 133, 142, 35, 73, i === 0 ? 'intervention' : 'mint') +
            p(`M${x + 94} 251L360 286`)
          );
        })
        .join('') +
      arrow('M360 286V312') +
      r(179, 325, 362, 57, 'mint') +
      t(360, 362, 'HDR light map', 'middle') +
      p('M360 392L188 431M360 392L532 431') +
      dot(188, 456, 29, 'existing') +
      dot(532, 456, 29, 'existing') +
      r(537, 435, 10, 19, 'intervention') +
      t(188, 532, 'Matte surface', 'middle') +
      t(532, 532, 'Reflective surface', 'middle'),
  },
};
