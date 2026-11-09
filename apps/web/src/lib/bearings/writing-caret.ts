type CaretShape = 'underline' | 'bar' | 'block';
export type WritingCaretPosition = {
  left: number;
  top: number;
  width: number;
  height: number;
  shape: CaretShape;
};
type CaretOptions = {
  value: string;
  shape?: CaretShape;
  thickness?: number;
  onmove: (position: WritingCaretPosition | null) => void;
};

/** Draw a mode-aware cursor without changing native editing or selection behavior. */
export function writingCaret(node: HTMLTextAreaElement, options: CaretOptions) {
  const desktop = matchMedia('(hover: hover) and (pointer: fine)');
  const forcedColors = matchMedia('(forced-colors: active)');
  let mirror: HTMLDivElement | undefined;
  let marker: HTMLSpanElement | undefined;
  let frame = 0;
  let composing = false;
  let destroyed = false;
  let visible = false;
  const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  function report(position: WritingCaretPosition | null) {
    if (position || visible) {
      visible = !!position;
      options.onmove(position);
    }
  }
  const properties = [
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'font-stretch',
    'font-variant',
    'font-feature-settings',
    'font-variation-settings',
    'font-kerning',
    'line-height',
    'letter-spacing',
    'word-spacing',
    'text-indent',
    'text-align',
    'text-transform',
    'text-rendering',
    'direction',
    'unicode-bidi',
    'tab-size',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
  ];
  function hide() {
    mirror?.remove();
    mirror = undefined;
    marker = undefined;
    if (!destroyed) report(null);
  }
  function measure() {
    frame = 0;
    if (destroyed) return;
    const shape = options.shape ?? 'underline';
    if (
      (!desktop.matches && shape !== 'block') ||
      !node.clientWidth ||
      document.activeElement !== node
    ) {
      hide();
      return;
    }
    if (!mirror) {
      mirror = document.createElement('div');
      mirror.setAttribute('aria-hidden', 'true');
      mirror.style.cssText =
        'position:absolute;left:0;top:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;box-sizing:border-box;border:0;margin:0;';
      node.parentElement!.append(mirror);
    }
    const style = getComputedStyle(node);
    for (const property of properties)
      mirror.style.setProperty(property, style.getPropertyValue(property));
    mirror.style.width = `${node.clientWidth}px`;
    mirror.style.whiteSpace = node.wrap === 'off' ? 'pre' : 'pre-wrap';
    mirror.style.overflowWrap = node.wrap === 'off' ? 'normal' : style.overflowWrap;
    const before = document.createTextNode(node.value.slice(0, node.selectionStart));
    marker = document.createElement('span');
    marker.textContent = node.value.slice(node.selectionStart) + '\u200b';
    mirror.replaceChildren(before, marker);
    const origin = mirror.getBoundingClientRect();
    const range = document.createRange();
    if (
      forcedColors.matches ||
      composing ||
      document.hidden ||
      !document.hasFocus() ||
      document.activeElement !== node ||
      node.selectionStart !== node.selectionEnd
    ) {
      report(null);
      return;
    }
    range.setStart(marker.firstChild!, 0);
    range.collapse(true);
    let rect = range.getBoundingClientRect();
    if (!rect.height) {
      // A collapsed range immediately before a newline can have no glyph box.
      const boundary = document.createElement('span');
      boundary.textContent = '\u200b';
      mirror.insertBefore(boundary, marker);
      rect = boundary.getBoundingClientRect();
    }
    let width = Math.max(11, parseFloat(style.fontSize) * 0.8);
    const thickness = Math.max(1, Math.min(6, options.thickness ?? 3));
    if (shape === 'bar') width = thickness;
    if (shape === 'block') {
      const segments = graphemes.segment(node.value.slice(node.selectionStart));
      const character = segments[Symbol.iterator]().next().value?.segment;
      if (character && character !== '\n') {
        range.setEnd(marker.firstChild!, character.length);
        rect = range.getBoundingClientRect();
      }
      width = Math.max(2, rect.width || parseFloat(style.fontSize) * 0.6);
    }
    const left = rect.left - origin.left - node.scrollLeft;
    const top =
      (shape === 'underline' ? rect.bottom - thickness + 1 : rect.top) -
      origin.top -
      node.scrollTop;
    const height = shape === 'underline' ? thickness : rect.height;
    if (
      !rect.height ||
      left < 0 ||
      left >= node.clientWidth ||
      top < 0 ||
      top + height > node.clientHeight
    ) {
      report(null);
      return;
    }
    report({
      left: node.offsetLeft + left,
      top: node.offsetTop + top,
      width: Math.min(width, node.clientWidth - left),
      height,
      shape,
    });
  }
  function schedule() {
    if (!destroyed && !frame && document.activeElement === node)
      frame = requestAnimationFrame(measure);
  }
  function startComposition() {
    composing = true;
    hide();
  }
  function endComposition() {
    composing = false;
    schedule();
  }
  const events = ['focus', 'input', 'keyup', 'click', 'select', 'scroll'] as const;
  for (const event of events) node.addEventListener(event, schedule);
  node.addEventListener('blur', hide);
  node.addEventListener('compositionstart', startComposition);
  node.addEventListener('compositionend', endComposition);
  document.addEventListener('selectionchange', schedule);
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('blur', hide);
  window.addEventListener('focus', schedule);
  window.addEventListener('resize', schedule);
  desktop.addEventListener('change', schedule);
  forcedColors.addEventListener('change', schedule);
  const observer = new ResizeObserver(schedule);
  observer.observe(node);
  void document.fonts.ready.then(schedule);
  schedule();
  return {
    update(next: CaretOptions) {
      options = next;
      schedule();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      mirror?.remove();
      for (const event of events) node.removeEventListener(event, schedule);
      node.removeEventListener('blur', hide);
      node.removeEventListener('compositionstart', startComposition);
      node.removeEventListener('compositionend', endComposition);
      document.removeEventListener('selectionchange', schedule);
      document.removeEventListener('visibilitychange', schedule);
      window.removeEventListener('blur', hide);
      window.removeEventListener('focus', schedule);
      window.removeEventListener('resize', schedule);
      desktop.removeEventListener('change', schedule);
      forcedColors.removeEventListener('change', schedule);
    },
  };
}
