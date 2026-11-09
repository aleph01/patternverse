import { plot } from '@observablehq/plot';
import { isLessonId, lessonManifest } from './lesson-manifest';
import { lessonView } from './lesson-plots';

const id = document.body.dataset.lesson ?? '';
if (!isLessonId(id)) throw new Error('Unknown visual lesson.');
const lesson = lessonManifest.find((item) => item.id === id)!;
const panels = document.querySelector<HTMLElement>('#panels')!;
const readout = document.querySelector<HTMLElement>('#readout')!;
const key = document.querySelector<HTMLElement>('#key')!;
const account = document.querySelector<HTMLElement>('#text-account')!;
const grayscale = document.querySelector<HTMLInputElement>('#grayscale');
let mode: string = lesson.modes[0][0];
let lastWidth = 0;

function render() {
  const width = Math.floor(panels.clientWidth);
  if (!width) return;
  lastWidth = width;
  const view = lessonView(id as Parameters<typeof lessonView>[0], mode, width, grayscale?.checked);
  panels.replaceChildren(
    ...view.panels.map((panel) => {
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
  for (const element of [panels, key])
    element.style.filter = grayscale?.checked ? 'grayscale(1)' : '';
  account.hidden = !view.account;
  account.querySelector('p')!.textContent = view.account ?? '';
  document.body.dataset.mode = mode;
  document.body.dataset.grayscale = String(grayscale?.checked ?? false);
}

document.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach((input) => {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    mode = input.value;
    render();
  });
});
grayscale?.addEventListener('change', render);
new ResizeObserver(() => {
  if (Math.floor(panels.clientWidth) !== lastWidth) render();
}).observe(panels);
render();
