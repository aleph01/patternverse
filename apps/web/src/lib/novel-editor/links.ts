import type { Editor } from '@tiptap/core';
import type { TextRange } from './slash';

export interface LinkDraft {
  range: TextRange;
  href: string;
  wasActive: boolean;
}

/** Capture before the toolbar takes focus so link editing uses the original selection. */
export function linkDraft(editor: Editor): LinkDraft {
  const { from, to } = editor.state.selection;
  return {
    range: { from, to },
    href: String(editor.getAttributes('link').href ?? ''),
    wasActive: editor.isActive('link'),
  };
}
export function restoreLinkSelection(editor: Editor, range: TextRange): boolean {
  return editor.chain().focus().setTextSelection(range).run();
}
export function applyEditorLink(editor: Editor, draft: LinkDraft): boolean {
  const chain = editor.chain().focus().setTextSelection(draft.range);
  if (draft.wasActive) chain.extendMarkRange('link');
  const href = draft.href.trim();
  return href ? chain.setLink({ href }).run() : chain.unsetLink().run();
}
export function removeEditorLink(editor: Editor, range: TextRange): boolean {
  return editor.chain().focus().setTextSelection(range).extendMarkRange('link').unsetLink().run();
}
