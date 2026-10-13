import type { Editor } from '@tiptap/core';

export interface TextRange {
  from: number;
  to: number;
}
export type SlashItem = {
  id: 'text' | 'h1' | 'h2' | 'h3' | 'bullet' | 'numbered' | 'quote' | 'code' | 'rule' | 'table';
  label: string;
  description: string;
  mark: string;
  keywords: string;
};

export const slashItems: readonly SlashItem[] = [
  {
    id: 'text',
    label: 'Text',
    description: 'A simple paragraph',
    mark: 'T',
    keywords: 'paragraph plain',
  },
  {
    id: 'h1',
    label: 'Heading 1',
    description: 'Large section heading',
    mark: 'H1',
    keywords: 'title heading',
  },
  {
    id: 'h2',
    label: 'Heading 2',
    description: 'Medium section heading',
    mark: 'H2',
    keywords: 'subtitle heading',
  },
  {
    id: 'h3',
    label: 'Heading 3',
    description: 'Small section heading',
    mark: 'H3',
    keywords: 'heading',
  },
  {
    id: 'bullet',
    label: 'Bullet list',
    description: 'Create an unordered list',
    mark: '•',
    keywords: 'unordered list',
  },
  {
    id: 'numbered',
    label: 'Numbered list',
    description: 'Create an ordered list',
    mark: '1.',
    keywords: 'ordered list',
  },
  {
    id: 'quote',
    label: 'Quote',
    description: 'Capture a quotation',
    mark: '“',
    keywords: 'blockquote citation',
  },
  {
    id: 'code',
    label: 'Code block',
    description: 'Write preformatted code',
    mark: '</>',
    keywords: 'code preformatted',
  },
  {
    id: 'rule',
    label: 'Divider',
    description: 'Separate sections visually',
    mark: '—',
    keywords: 'horizontal rule separator',
  },
  {
    id: 'table',
    label: 'Table',
    description: 'Insert a three-column table',
    mark: '▦',
    keywords: 'grid rows columns',
  },
];

/** Match only the text immediately before an empty caret selection, not arbitrary document text. */
export function slashTrigger(editor: Editor): { query: string; range: TextRange } | null {
  const { selection } = editor.state;
  if (!selection.empty) return null;
  const before = selection.$from.parent.textBetween(
    0,
    selection.$from.parentOffset,
    undefined,
    '\ufffc',
  );
  const match = before.match(/(?:^|\s)\/([\w ]*)$/);
  if (!match) return null;
  const query = match[1] ?? '';
  return { query, range: { from: selection.from - query.length - 1, to: selection.from } };
}
export function filterSlashItems(query: string): readonly SlashItem[] {
  const normalized = query.trim().toLowerCase();
  return slashItems.filter(
    (item) => !normalized || `${item.label} ${item.keywords}`.toLowerCase().includes(normalized),
  );
}
export function slashMenuPosition(
  caret: { left: number; bottom: number },
  shell: { left: number; top: number; width: number },
): { left: number; top: number } {
  return {
    left: Math.max(12, Math.min(caret.left - shell.left, shell.width - 312)),
    top: caret.bottom - shell.top + 10,
  };
}
export type SlashKeyAction =
  | { kind: 'select'; index: number }
  | { kind: 'run'; index: number }
  | { kind: 'close' }
  | { kind: 'ignore' };
export function slashKeyAction(key: string, index: number, count: number): SlashKeyAction {
  const length = Math.max(count, 1);
  if (key === 'ArrowDown') return { kind: 'select', index: (index + 1) % length };
  if (key === 'ArrowUp') return { kind: 'select', index: (index - 1 + length) % length };
  if (key === 'Enter' && index >= 0 && index < count) return { kind: 'run', index };
  return { kind: key === 'Escape' ? 'close' : 'ignore' };
}
/** The deletion and block command share one editor transaction and undo history. */
export function runSlashCommand(editor: Editor, id: SlashItem['id'], range: TextRange): boolean {
  const chain = editor.chain().focus().deleteRange(range);
  switch (id) {
    case 'text':
      return chain.setParagraph().run();
    case 'h1':
      return chain.setHeading({ level: 1 }).run();
    case 'h2':
      return chain.setHeading({ level: 2 }).run();
    case 'h3':
      return chain.setHeading({ level: 3 }).run();
    case 'bullet':
      return chain.toggleBulletList().run();
    case 'numbered':
      return chain.toggleOrderedList().run();
    case 'quote':
      return chain.toggleBlockquote().run();
    case 'code':
      return chain.toggleCodeBlock().run();
    case 'rule':
      return chain.setHorizontalRule().run();
    case 'table':
      return chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }
}
