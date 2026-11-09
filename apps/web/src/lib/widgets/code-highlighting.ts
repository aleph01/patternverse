import { tokenize, type ShjLanguage, type ShjToken } from '@speed-highlight/core';

export type CodeToken = { text: string; kind?: ShjToken };
const languages: Record<string, { id: ShjLanguage; label: string }> = {
  html: { id: 'html', label: 'HTML' },
  htm: { id: 'html', label: 'HTML' },
  css: { id: 'css', label: 'CSS' },
  js: { id: 'js', label: 'JavaScript' },
  mjs: { id: 'js', label: 'JavaScript' },
  cjs: { id: 'js', label: 'JavaScript' },
  ts: { id: 'ts', label: 'TypeScript' },
  json: { id: 'json', label: 'JSON' },
  svg: { id: 'xml', label: 'SVG' },
  txt: { id: 'plain', label: 'Plain text' },
};
export function codeLanguage(filename: string) {
  return (
    languages[filename.split('.').at(-1)?.toLowerCase() ?? ''] ?? {
      id: 'plain' as const,
      label: 'Plain text',
    }
  );
}
/** Render tokens as text nodes; authored code is never inserted as HTML or executed. */
export async function highlightCode(source: string, filename: string): Promise<CodeToken[]> {
  const tokens: CodeToken[] = [];
  // Keep large bundled data editable without tokenizing an unbounded amount per keystroke.
  const prefix = source.slice(0, 200_000);
  await tokenize(prefix, codeLanguage(filename).id, (text, kind) => {
    if (text) tokens.push({ text, kind });
  });
  if (source.length > prefix.length) tokens.push({ text: source.slice(prefix.length) });
  return tokens;
}
