/** Mira's cosmetic token layer. Compilation remains exclusively in Rust. */
export function highlightSource(source: string): { text: string; kind: string }[] {
  const expression =
    /(^[\t ]*#[^\n]*|\{\{[^}\n]*\}\}|"(?:\\.|[^"\\])*"|\[[^\]\n]*\]|^[\t ]*- [\w-]+:|[!?][\w-]+|\?~|~|^[\t ]*:[\w-]+|^[\t ]*[\w-]+:|^[\t ]*[\w-]+[\t ]*=(?!=)|^[\t ]*=|->|=>|\|>|\b(?:type|classifier|fn|flow|events|on|each|in|yield|true|false)\b)/gm;
  const tokens: { text: string; kind: string }[] = [];
  let start = 0;
  for (const match of source.matchAll(expression)) {
    if (match.index > start) tokens.push({ text: source.slice(start, match.index), kind: 'plain' });
    const text = match[0],
      trimmed = text.trimStart();
    const kind = trimmed.startsWith('#')
      ? 'comment'
      : trimmed.startsWith('{{')
        ? 'reference'
        : trimmed.startsWith('"')
          ? 'string'
          : trimmed.startsWith(':')
            ? 'metadata'
            : 'directive';
    tokens.push({ text, kind });
    start = match.index + text.length;
  }
  tokens.push({ text: source.slice(start), kind: 'plain' });
  return tokens;
}
