/** Trap keyboard focus in an open picker and restore its trigger when it closes. */
export function focusPicker(node: HTMLElement, close: () => void) {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  node.focus();
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const elements = [
      ...node.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
      ),
    ];
    const first = elements[0];
    const last = elements.at(-1);
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || document.activeElement === node)
    ) {
      event.preventDefault();
      first.focus();
    }
  };
  node.addEventListener('keydown', keydown);
  return {
    destroy: () => {
      node.removeEventListener('keydown', keydown);
      if (previous?.isConnected) previous.focus();
    },
  };
}
