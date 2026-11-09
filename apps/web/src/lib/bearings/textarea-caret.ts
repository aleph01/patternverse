/** Viewport coordinates for the native textarea caret, including wrapping and scrolling. */
export function textareaCaretRect(node: HTMLTextAreaElement): DOMRect {
  const style = getComputedStyle(node);
  const mirror = document.createElement('div');
  mirror.style.cssText =
    'position:fixed;left:0;top:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;box-sizing:border-box;border:0;margin:0;';
  for (const property of [
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
    'word-break',
  ])
    mirror.style.setProperty(property, style.getPropertyValue(property));
  mirror.style.width = `${node.clientWidth}px`;
  mirror.style.whiteSpace = node.wrap === 'off' ? 'pre' : 'pre-wrap';
  mirror.style.overflowWrap = node.wrap === 'off' ? 'normal' : style.overflowWrap;
  const marker = document.createElement('span');
  marker.textContent = node.value.slice(node.selectionStart) + '\u200b';
  mirror.append(document.createTextNode(node.value.slice(0, node.selectionStart)), marker);
  document.body.append(mirror);
  try {
    const origin = mirror.getBoundingClientRect();
    const range = document.createRange();
    range.setStart(marker.firstChild!, 0);
    range.collapse(true);
    let caret = range.getBoundingClientRect();
    if (!caret.height) {
      const boundary = document.createElement('span');
      boundary.textContent = '\u200b';
      mirror.insertBefore(boundary, marker);
      caret = boundary.getBoundingClientRect();
    }
    const field = node.getBoundingClientRect();
    return new DOMRect(
      field.left + node.clientLeft + caret.left - origin.left - node.scrollLeft,
      field.top + node.clientTop + caret.top - origin.top - node.scrollTop,
      0,
      caret.height || parseFloat(style.fontSize) * 1.2,
    );
  } finally {
    mirror.remove();
  }
}
