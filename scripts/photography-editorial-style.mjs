// The light editorial palette shared with Architecture, Filmmaking and ML.
// Photographic pixels and deliberate image filters stay outside this treatment.
export const photographyEditorialStyle = `<style>
:root{color-scheme:only light;--paper:#fff;--ink:#252c28;--panel:#f1f2ef;--line:#a6aca3;--mint:#edf5f0;--accent:#00855b}
svg{background:#fff;color:var(--ink)}
text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}
path,rect,circle,ellipse,line,polyline,polygon{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:butt}
.paper{fill:var(--paper)}.panel{fill:var(--panel);stroke:var(--line);stroke-width:1.1}
.line{fill:none;stroke:var(--ink);stroke-width:1.3}
.fine{fill:none;stroke:var(--line);stroke-width:1.1}
.route{fill:none;stroke:var(--accent);stroke-width:1.4}
.subject{fill:var(--mint);stroke:var(--accent);stroke-width:1.3}
.camera{fill:var(--ink);stroke:none}
.source{fill:var(--panel);stroke:var(--ink);stroke-width:1.1}
</style>`;

export const editorialModification =
  'Light editorial presentation: fixed white paper, regular Helvetica labels, fine charcoal lines and restrained green accents.';

export const cameraPlan = (x, y) =>
  `<g class="camera"><rect x="${x - 20}" y="${y}" width="40" height="25"/><path d="M${x - 11} ${y}v-10h22v10Z"/></g>`;
