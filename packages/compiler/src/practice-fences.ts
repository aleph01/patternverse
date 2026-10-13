/** Shared article slicing only; no practice format or execution semantics. */
export type PracticeFenceRange = {
  readonly start: number;
  readonly end: number;
};

export const articleWithoutFence = (body: string, fence?: PracticeFenceRange): string => {
  if (!fence) return body;
  const before = body.slice(0, fence.start);
  const after = body.slice(fence.end);

  if (!after) {
    if (before.endsWith('\r\n\r\n')) return before.slice(0, -4);
    if (before.endsWith('\n\n')) return before.slice(0, -2);
    if (before.endsWith('\r\n')) return before.slice(0, -2);
    if (before.endsWith('\n')) return before.slice(0, -1);
    return before;
  }

  if (!before) {
    if (after.startsWith('\r\n')) return after.slice(2);
    if (after.startsWith('\n')) return after.slice(1);
    return after;
  }

  if (before.endsWith('\r\n') && after.startsWith('\r\n')) {
    return `${before}${after.slice(2)}`;
  }
  if (before.endsWith('\n') && after.startsWith('\n')) {
    return `${before}${after.slice(1)}`;
  }
  return `${before}${after}`;
};
