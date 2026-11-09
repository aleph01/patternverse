// The light editorial drawing language shared with Architecture and Filmmaking.
// This adapter changes presentation; every label, plotted value and coordinate stays intact.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const colors = {
  '#24372f': '#252c28',
  '#28684d': '#00855b',
  '#b4c7b9': '#a6aca3',
  '#f2f6f2': '#f1f2ef',
  '#c8e1d2': '#edf5f0',
  '#53685b': '#626962',
  '#f3f6f2': '#f1f2ef',
  '#b8c8bd': '#a6aca3',
  '#cb8155': '#8c938b',
  '#dfe9e1': '#edf5f0',
  '#fff0d8': '#edf5f0',
  '#936020': '#00855b',
};
export function lightEditorial(source) {
  source = source.replaceAll('Orange', 'Gray').replaceAll('orange', 'gray');
  for (const [from, to] of Object.entries(colors)) source = source.replaceAll(from, to);
  const dom = new JSDOM(source, { contentType: 'image/svg+xml' });
  try {
    const d = dom.window.document,
      root = d.documentElement;
    root.setAttribute('data-ml-style', 'light-editorial');
    for (const el of d.querySelectorAll('text')) {
      el.setAttribute('font-family', 'Helvetica Neue, Helvetica, Arial, sans-serif');
      el.setAttribute('font-weight', '400');
    }
    for (const el of d.querySelectorAll('rect[rx],rect[ry]')) {
      el.removeAttribute('rx');
      el.removeAttribute('ry');
    }
    const style = d.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `:root{color-scheme:only light;--ink:#252c28;--muted:#626962;--paper:#fff;--panel:#f1f2ef;--line:#a6aca3;--band:#edf5f0;--accent:#00855b;--shared:#edf5f0;--shared-line:#00855b}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif!important;font-weight:400!important;letter-spacing:0}path,rect,circle,ellipse,line,polyline,polygon{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:butt}`;
    root.append(style);
    return root.outerHTML + '\n';
  } finally {
    dom.window.close();
  }
}
