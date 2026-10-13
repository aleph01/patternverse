import { Editor, type EditorOptions } from '@tiptap/core';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';

type MarkdownEditorOptions = Pick<
  EditorOptions,
  | 'element'
  | 'editable'
  | 'onCreate'
  | 'onTransaction'
  | 'onSelectionUpdate'
  | 'onUpdate'
  | 'onBlur'
> & {
  value: string;
  handleKeyDown: NonNullable<NonNullable<EditorOptions['editorProps']>['handleKeyDown']>;
};

/** One configured Tiptap instance per mount. Controls never recreate it or replace its content. */
export function createMarkdownEditor({
  value,
  handleKeyDown,
  ...options
}: MarkdownEditorOptions): Editor {
  return new Editor({
    ...options,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
        dropcursor: { color: '#007a4d', width: 3 },
      }),
      Markdown.configure({ indentation: { style: 'space', size: 2 } }),
      Placeholder.configure({
        placeholder: 'Start writing, or press / for commands…',
        showOnlyWhenEditable: true,
      }),
      TableKit.configure({ table: { resizable: true } }),
      GlobalDragHandle.configure({ dragHandleWidth: 24, scrollTreshold: 80 }),
    ],
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'novel-prose',
        'aria-label': 'Visual Markdown editor',
        spellcheck: 'true',
      },
      handleKeyDown,
    },
  });
}
