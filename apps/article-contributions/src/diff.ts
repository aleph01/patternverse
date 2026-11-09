export type TextChange = { kind: 'same' | 'added' | 'removed'; text: string };
/** Bounded word comparison: large rewrites fall back to a whole-passage replacement. */
export function wordDiff(before: string, after: string): TextChange[] {
  const a = before.match(/\s+|[^\s]+/g) ?? [],
    b = after.match(/\s+|[^\s]+/g) ?? [];
  if (a.length * b.length > 250000)
    return [
      { kind: 'removed', text: before },
      { kind: 'added', text: after },
    ];
  const table = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      table[i]![j] =
        a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
  const changes: TextChange[] = [];
  let i = 0,
    j = 0;
  const push = (kind: TextChange['kind'], text: string) => {
    const previous = changes.at(-1);
    if (previous?.kind === kind) previous.text += text;
    else changes.push({ kind, text });
  };
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      push('same', a[i++]!);
      j++;
    } else if (i < a.length && (j === b.length || table[i + 1]![j]! >= table[i]![j + 1]!))
      push('removed', a[i++]!);
    else push('added', b[j++]!);
  }
  return changes;
}
