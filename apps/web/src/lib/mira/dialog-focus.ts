/** Shared keyboard behavior; panel opening/return-focus remains owned by its host. */
export function handleDialogKeydown(event: KeyboardEvent, node: HTMLElement, close: () => void) {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== 'Tab') return;
  const elements = [
    ...node.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
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
}

/** Trap keyboard focus in an open picker and restore its trigger when it closes. */
type PickerFocusOptions = (() => void) | { close: () => void; restoreFocus?: boolean };

export function focusPicker(node: HTMLElement, options: PickerFocusOptions) {
  let current = options;
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  node.focus();
  const keydown = (event: KeyboardEvent) =>
    handleDialogKeydown(event, node, typeof current === 'function' ? current : current.close);
  node.addEventListener('keydown', keydown);
  return {
    update: (options: PickerFocusOptions) => {
      current = options;
    },
    destroy: () => {
      node.removeEventListener('keydown', keydown);
      if (
        (typeof current === 'function' || current.restoreFocus !== false) &&
        previous?.isConnected
      )
        previous.focus();
    },
  };
}
