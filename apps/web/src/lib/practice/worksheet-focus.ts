/** Move to the newly revealed step without moving focus on validation errors. */
export function focusWorksheetStep(element: HTMLElement | null): void {
  if (!element) return;
  const heading = element.querySelector<HTMLElement>('h2');
  heading?.focus({ preventScroll: true });
  element.scrollIntoView?.({
    block: 'start',
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth',
  });
}
