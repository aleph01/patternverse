// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { richTextMap, replaceRichText } from './rich-text';

describe('Vim edits in a rich Markdown document', () => {
  it('maps empty paragraphs and Unicode text to stable document positions', () => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: [StarterKit, Markdown],
      content: {
        type: 'doc',
        content: [
          { type: 'paragraph' },
          { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
          { type: 'paragraph' },
          { type: 'paragraph', content: [{ type: 'text', text: 'Last 🌱' }] },
        ],
      },
    });
    try {
      const map = richTextMap(editor.state.doc);
      expect(map.text).toBe('\nFirst\n\nLast 🌱');
      expect(map.positions).toHaveLength(map.text.length + 1);
      expect(map.index(map.positions[1]!)).toBe(1);
      expect(map.positions.at(-1)).toBe(editor.state.doc.content.size - 1);
    } finally {
      editor.destroy();
    }
  });
  it('retains untouched formatting when replacing text and adding paragraphs', () => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: [StarterKit, Markdown],
      content: 'A **bold** thought.',
      contentType: 'markdown',
    });
    try {
      replaceRichText(editor, 'A bold idea.\nAnother line.', 12);
      expect(editor.getText({ blockSeparator: '\n' })).toBe('A bold idea.\nAnother line.');
      expect(editor.getMarkdown()).toContain('**bold**');
      expect(editor.state.doc.childCount).toBe(2);
      replaceRichText(editor, 'A bold idea.', 12);
      expect(editor.getText()).toBe('A bold idea.');
      expect(editor.getMarkdown()).toContain('**bold**');
    } finally {
      editor.destroy();
    }
  });
});
