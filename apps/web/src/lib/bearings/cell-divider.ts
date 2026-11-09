/** Enter on a Markdown divider splits writing, except within fenced or indented code. */
export function cellDivider(text: string, start: number, end = start) {
  if (start !== end || start < 0 || start > text.length) return null;
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = text.indexOf('\n', start);
  const lineEnd = nextBreak < 0 ? text.length : nextBreak;
  if (!/^ {0,3}-{3,}[\t ]*$/.test(text.slice(lineStart, lineEnd))) return null;
  let fence: { marker: string; length: number } | null = null;
  for (const line of text.slice(0, lineStart).split('\n')) {
    const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (!match) continue;
    if (fence) {
      if (match[1]![0] === fence.marker && match[1]!.length >= fence.length && !match[2]!.trim())
        fence = null;
    } else if (match[1]![0] !== '`' || !match[2]!.includes('`')) {
      fence = { marker: match[1]![0]!, length: match[1]!.length };
    }
  }
  if (fence) return null;
  return {
    before: text.slice(0, Math.max(0, lineStart - 1)),
    after: nextBreak < 0 ? '' : text.slice(nextBreak + 1),
  };
}
