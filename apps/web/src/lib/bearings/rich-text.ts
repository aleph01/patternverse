import type { Editor } from '@tiptap/core';
import { Fragment, Slice, type Node as ProseMirrorNode } from '@tiptap/pm/model';

const editors = new WeakMap<HTMLElement, Editor>();
export function registerRichEditor(element: HTMLElement, editor: Editor) {
  editors.set(element, editor);
  return () => editors.delete(element);
}
export function richEditor(element: HTMLElement | null) {
  const field = element?.closest<HTMLElement>('.cell-text');
  return field
    ? (editors.get(field) ?? (field as HTMLElement & { editor?: Editor }).editor)
    : undefined;
}
/** A plain-text cursor map for Vim motions; document edits retain their rich marks. */
export function richTextMap(doc: ProseMirrorNode) {
  let text = '';
  const positions: number[] = [];
  let end = 1;
  let first = true;
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    if (!first) {
      positions.push(end);
      text += '\n';
    }
    first = false;
    node.descendants((child, relative) => {
      if (child.isText) {
        for (let i = 0; i < child.text!.length; i++) positions.push(pos + 1 + relative + i);
        text += child.text;
      } else if (child.type.name === 'hardBreak') {
        positions.push(pos + 1 + relative);
        text += '\n';
      }
    });
    end = pos + node.nodeSize - 1;
    return false;
  });
  positions.push(end);
  return {
    text,
    positions,
    index: (position: number) => {
      let at = positions.findIndex((value) => value >= position);
      if (at < 0) at = positions.length - 1;
      return at;
    },
  };
}
export function setRichSelection(element: HTMLElement | null | undefined, offset: number) {
  if (!element) return;
  const editor = richEditor(element);
  if (editor) {
    const map = richTextMap(editor.state.doc);
    editor.commands.setTextSelection(map.positions[Math.min(offset, map.text.length)] ?? 1);
  } else if (element instanceof HTMLTextAreaElement) element.setSelectionRange(offset, offset);
}
export function replaceRichText(editor: Editor, text: string, cursor: number) {
  const previous = richTextMap(editor.state.doc);
  if (text !== previous.text) {
    let start = 0,
      end = 0;
    while (
      start < Math.min(text.length, previous.text.length) &&
      text[start] === previous.text[start]
    )
      start++;
    while (
      end < Math.min(text.length - start, previous.text.length - start) &&
      text[text.length - end - 1] === previous.text[previous.text.length - end - 1]
    )
      end++;
    const from = previous.positions[start] ?? 1;
    const to = previous.positions[previous.text.length - end] ?? from;
    const inserted = text.slice(start, text.length - end);
    const tr = editor.state.tr;
    if (!inserted.includes('\n') || editor.state.doc.resolve(from).parent.type.spec.code)
      tr.insertText(inserted, from, to);
    else {
      const marks = editor.state.doc.resolve(from).marks();
      const blocks = inserted
        .split('\n')
        .map((line) =>
          editor.schema.nodes.paragraph!.create(
            null,
            line ? editor.schema.text(line, marks) : undefined,
          ),
        );
      tr.replaceRange(from, to, new Slice(Fragment.from(blocks), 1, 1));
    }
    editor.view.dispatch(tr);
  }
  const current = richTextMap(editor.state.doc);
  editor.commands.setTextSelection(current.positions[Math.min(cursor, current.text.length)] ?? 1);
  if (editor.view.dom.isConnected) editor.commands.scrollIntoView();
}
export function richCaretRect(element: HTMLElement): DOMRect | null {
  const editor = richEditor(element);
  if (!editor) return null;
  const rect = editor.view.coordsAtPos(editor.state.selection.from);
  return new DOMRect(
    rect.left,
    rect.top,
    Math.max(0, rect.right - rect.left),
    rect.bottom - rect.top,
  );
}
