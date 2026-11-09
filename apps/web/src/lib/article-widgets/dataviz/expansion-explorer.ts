import { plot } from '@observablehq/plot';
import { expansionManifest, type ExpansionId, type ExpansionLesson } from './expansion-manifest';
import { expansionView, type ExpansionState } from './expansion-plots';

const lesson: ExpansionLesson | undefined = expansionManifest.find(
  (d) => d.id === document.body.dataset.lesson,
);
if (!lesson) throw new Error('Unknown visualization lesson.');
const id = lesson.id as ExpansionId;
const panels = document.querySelector<HTMLElement>('#panels')!;
const readout = document.querySelector<HTMLElement>('#readout')!;
const key = document.querySelector<HTMLElement>('#key')!;
const account = document.querySelector<HTMLElement>('#text-account')!;
const state: ExpansionState = Object.fromEntries(lesson.controls.map((d) => [d.key, d.value]));
let mode: string = lesson.modes[0][0];
let lastWidth = 0;

function setMode(value: string) {
  mode = value;
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="mode"]'))
    input.checked = input.value === mode;
}
function updateControls() {
  for (const control of lesson!.controls) {
    const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(
      `#control-${control.key}`,
    )!;
    input.value = String(state[control.key]);
    const output = document.querySelector<HTMLOutputElement>(`#value-${control.key}`);
    if (output) output.value = String(state[control.key]);
  }
}
function render() {
  const width = Math.floor(panels.clientWidth);
  if (!width) return;
  lastWidth = width;
  const view = expansionView(id, mode, width, state);
  panels.replaceChildren(
    ...view.panels.map((panel, index) => {
      const figure = document.createElement('figure');
      const caption = document.createElement('figcaption');
      caption.textContent = panel.title;
      const graphic = plot({
        ...panel.options,
        ariaLabel: panel.title,
        ariaDescription: view.summary,
      });
      graphic.dataset.lesson = id;
      graphic.dataset.mode = mode;
      figure.append(caption, graphic);
      if (id === 'brushing-and-linking' && index === 0) {
        const svg = graphic as SVGSVGElement & typeof graphic;
        svg.style.touchAction = 'pan-y';
        svg.style.cursor = 'crosshair';
        const coordinate = (event: PointerEvent) => {
          const bounds = svg.getBoundingClientRect();
          const pixel = ((event.clientX - bounds.left) / bounds.width) * width;
          return Math.max(0, Math.min(10, Math.round(Number(graphic.scale('x')!.invert!(pixel)))));
        };
        let start: number | undefined;
        let preview: SVGRectElement | undefined;
        svg.addEventListener('pointerdown', (event) => {
          if (event.button !== 0) return;
          start = coordinate(event);
          svg.setPointerCapture(event.pointerId);
          preview = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          preview.setAttribute('fill', '#007a4d');
          preview.setAttribute('fill-opacity', '0.15');
          preview.setAttribute('y', '24');
          preview.setAttribute('height', String(290 - 24 - 48));
          preview.setAttribute('pointer-events', 'none');
          svg.append(preview);
        });
        svg.addEventListener('pointermove', (event) => {
          if (start === undefined || !preview) return;
          const end = coordinate(event);
          const scale = graphic.scale('x')!;
          preview.setAttribute('x', String(scale.apply(Math.min(start, end))));
          preview.setAttribute('width', String(Math.abs(scale.apply(end) - scale.apply(start))));
        });
        svg.addEventListener('pointerup', (event) => {
          if (start === undefined) return;
          const end = coordinate(event);
          state.low = Math.min(start, end);
          state.high = Math.max(start, end);
          start = undefined;
          setMode('selected');
          updateControls();
          render();
        });
        svg.addEventListener('pointercancel', () => {
          start = undefined;
          preview?.remove();
        });
      }
      return figure;
    }),
  );
  readout.textContent = view.summary;
  key.replaceChildren(
    ...(view.key ?? []).map((item) => {
      const label = document.createElement('span');
      const swatch = document.createElement('span');
      swatch.className = 'key-symbol';
      swatch.style.color = item.color;
      swatch.textContent = item.symbol ?? '━';
      swatch.setAttribute('aria-hidden', 'true');
      label.append(swatch, document.createTextNode(item.label));
      return label;
    }),
  );
  key.hidden = !view.key?.length;
  account.hidden = !view.account;
  account.querySelector('p')!.textContent = view.account ?? '';
  document.body.dataset.mode = mode;
}
for (const input of document.querySelectorAll<HTMLInputElement>('input[name="mode"]'))
  input.addEventListener('change', () => {
    if (input.checked) {
      setMode(input.value);
      render();
    }
  });
for (const control of lesson.controls) {
  const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(
    `#control-${control.key}`,
  )!;
  input.addEventListener(control.type === 'range' ? 'input' : 'change', () => {
    state[control.key] = control.type === 'range' ? Number(input.value) : input.value;
    if (id === 'brushing-and-linking') {
      if (Number(state.low) > Number(state.high))
        state[control.key === 'low' ? 'high' : 'low'] = state[control.key];
      setMode('selected');
    }
    if (id === 'details-on-demand') setMode('details');
    updateControls();
    render();
  });
}
new ResizeObserver(() => {
  if (Math.floor(panels.clientWidth) !== lastWidth) render();
}).observe(panels);
updateControls();
render();
