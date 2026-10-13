/** Input affordances only. The Pattern Language runtime still validates submitted results. */
export function selectionWithinBounds(
  values: readonly string[],
  min: number,
  max: number,
): boolean {
  return values.length >= min && values.length <= max;
}

export function moveSelection(values: readonly string[], index: number, delta: -1 | 1): string[] {
  const next = [...values];
  const destination = index + delta;
  if (index >= 0 && index < next.length && destination >= 0 && destination < next.length)
    [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}
