// @vitest-environment jsdom
import type { Editor } from '@tiptap/core';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMarkdownEditor } from './instance';
import { applyEditorLink, linkDraft, removeEditorLink, restoreLinkSelection } from './links';
import {
  filterSlashItems,
  runSlashCommand,
  slashItems,
  slashKeyAction,
  slashMenuPosition,
  slashTrigger,
} from './slash';
import { createTableControls, tableActionPosition } from './tables';

const editors: Editor[] = [];
beforeEach(() => {
  // Document transactions use the real engine. Native focus/layout are covered in browser tests.
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 0),
  );
});
afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function setup(value = '', editable = true) {
  const shell = document.createElement('div');
  const element = document.createElement('div');
  shell.append(element);
  document.body.append(shell);
  const onUpdate = vi.fn();
  const editor = createMarkdownEditor({
    element,
    value,
    editable,
    handleKeyDown: () => false,
    onCreate: vi.fn(),
    onTransaction: vi.fn(),
    onSelectionUpdate: vi.fn(),
    onUpdate,
    onBlur: vi.fn(),
  });
  editors.push(editor);
  return { editor, shell, element, onUpdate };
}

describe('rich-text slash controls', () => {
  it.each([
    ['/', ''],
    ['/head', 'head'],
    ['Café 🙂 /bullet', 'bullet'],
    ['word/head', null],
    ['https://example.org/path', null],
    ['/heading!', null],
    ['/heading 2', 'heading 2'],
  ])('inspects the existing document caret for %s', (text, query) => {
    const { editor } = setup(text);
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    const trigger = slashTrigger(editor);
    if (query === null) expect(trigger).toBeNull();
    else {
      expect(trigger?.query).toBe(query);
      expect(editor.state.doc.textBetween(trigger!.range.from, trigger!.range.to)).toBe(
        '/' + query,
      );
    }
  });
  it('does not treat a selected range as a slash trigger', () => {
    const { editor } = setup('/head');
    editor.commands.setTextSelection({ from: 1, to: 6 });
    expect(slashTrigger(editor)).toBeNull();
  });
  it('filters the existing labels and keywords case-insensitively', () => {
    expect(filterSlashItems(' HEADING ').map((i) => i.id)).toEqual(['h1', 'h2', 'h3']);
    expect(filterSlashItems('grid').map((i) => i.id)).toEqual(['table']);
    expect(filterSlashItems('not-a-command')).toEqual([]);
    expect(filterSlashItems('')).toEqual(slashItems);
  });
  it('wraps keyboard selection and declines Enter when no result is present', () => {
    expect(slashKeyAction('ArrowUp', 0, 3)).toEqual({ kind: 'select', index: 2 });
    expect(slashKeyAction('ArrowDown', 2, 3)).toEqual({ kind: 'select', index: 0 });
    expect(slashKeyAction('ArrowDown', 0, 0)).toEqual({ kind: 'select', index: 0 });
    expect(slashKeyAction('Enter', 0, 0)).toEqual({ kind: 'ignore' });
    expect(slashKeyAction('Enter', 1, 2)).toEqual({ kind: 'run', index: 1 });
    expect(slashKeyAction('Escape', 0, 0)).toEqual({ kind: 'close' });
    expect(slashKeyAction('Tab', 0, 3)).toEqual({ kind: 'ignore' });
  });
  it('keeps generated keyboard indices and menu positions within their existing bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 320, max: 2000 }),
        (count, position, width) => {
          const index = count ? position % count : 0;
          for (const key of ['ArrowUp', 'ArrowDown']) {
            const action = slashKeyAction(key, index, count);
            expect(action.kind).toBe('select');
            if (action.kind === 'select') {
              expect(action.index).toBeGreaterThanOrEqual(0);
              expect(action.index).toBeLessThan(Math.max(count, 1));
            }
          }
          const menu = slashMenuPosition(
            { left: position, bottom: 60 },
            { left: 20, top: 10, width },
          );
          expect(menu.left).toBeGreaterThanOrEqual(12);
          expect(menu.left).toBeLessThanOrEqual(Math.max(12, width - 312));
          expect(menu.top).toBe(60);
        },
      ),
      { numRuns: 100 },
    );
  });
  it.each(slashItems.map((item) => item.id))(
    'executes %s through the same editor and undo history',
    (id) => {
      const { editor, onUpdate } = setup('/command');
      editor.commands.setTextSelection(9);
      onUpdate.mockClear();
      // setParagraph reports false for an existing paragraph, but the chained deletion still runs.
      expect(runSlashCommand(editor, id, { from: 1, to: 9 })).toBe(id !== 'text');
      expect(editor.getMarkdown()).not.toContain('/command');
      expect(onUpdate).toHaveBeenCalledTimes(1);
      const expected = {
        text: 'paragraph',
        h1: 'heading',
        h2: 'heading',
        h3: 'heading',
        bullet: 'bulletList',
        numbered: 'orderedList',
        quote: 'blockquote',
        code: 'codeBlock',
        rule: 'horizontalRule',
        table: 'table',
      }[id];
      let found = false;
      editor.state.doc.descendants((node) => {
        if (node.type.name === expected) found = true;
      });
      expect(found).toBe(true);
      const after = editor.getJSON();
      expect(editor.commands.undo()).toBe(true);
      expect(editor.getMarkdown()).toBe('/command');
      expect(editor.commands.redo()).toBe(true);
      expect(editor.getJSON()).toEqual(after);
    },
  );
});

describe('rich-text link selection', () => {
  it('restores the captured range and adds a trimmed URL without losing surrounding text', () => {
    const { editor } = setup('Read this note.');
    editor.commands.setTextSelection({ from: 6, to: 10 });
    const draft = linkDraft(editor);
    expect(draft).toEqual({ range: { from: 6, to: 10 }, href: '', wasActive: false });
    editor.commands.setTextSelection(1);
    expect(applyEditorLink(editor, { ...draft, href: ' https://example.org ' })).toBe(true);
    expect(editor.getMarkdown()).toBe('Read [this](https://example.org) note.');
    editor.commands.undo();
    expect(editor.getMarkdown()).toBe('Read this note.');
  });
  it('extends an existing link when applying or removing from a caret', () => {
    const { editor } = setup('[Entire link](https://example.org) suffix');
    editor.commands.setTextSelection(4);
    const draft = linkDraft(editor);
    expect(draft.wasActive).toBe(true);
    applyEditorLink(editor, { ...draft, href: 'https://new.example.org' });
    expect(editor.getMarkdown()).toBe('[Entire link](https://new.example.org) suffix');
    removeEditorLink(editor, draft.range);
    expect(editor.getMarkdown()).toBe('Entire link suffix');
    editor.commands.undo();
    expect(editor.getMarkdown()).toBe('[Entire link](https://new.example.org) suffix');
  });
  it('unsets an existing link for an empty URL and cancels without modifying the document', () => {
    const { editor, onUpdate } = setup('[Entire link](https://example.org) suffix');
    editor.commands.setTextSelection(4);
    const draft = linkDraft(editor),
      original = editor.getJSON();
    editor.commands.setTextSelection(1);
    onUpdate.mockClear();
    restoreLinkSelection(editor, draft.range);
    expect(editor.state.selection.from).toBe(4);
    expect(editor.getJSON()).toEqual(original);
    expect(onUpdate).not.toHaveBeenCalled();
    applyEditorLink(editor, { ...draft, href: '  ' });
    expect(editor.getMarkdown()).toBe('Entire link suffix');
  });
});

describe('editor instance and table boundary', () => {
  it('keeps the configured extensions, Markdown content and disabled-state changes on one instance', () => {
    const { editor, element } = setup('## Café 🙂\n\n**Keep this.**', false);
    expect(editor.isEditable).toBe(false);
    expect(element.querySelector('.novel-prose')?.getAttribute('aria-label')).toBe(
      'Visual Markdown editor',
    );
    expect(editor.getMarkdown()).toContain('## Café 🙂');
    expect(editor.isActive('heading', { level: 2 })).toBe(true);
    editor.setEditable(true);
    expect(editor.isEditable).toBe(true);
    expect(editor.getMarkdown()).toContain('**Keep this.**');
    expect(editor.extensionManager.extensions.map((e) => e.name)).toEqual(
      expect.arrayContaining([
        'markdown',
        'table',
        'link',
        'placeholder',
        'undoRedo',
        'globalDragHandle',
      ]),
    );
  });
  it('uses the same 72-pixel breakpoint for side placement and keeps above placement outside the table', () => {
    expect(
      tableActionPosition({ left: 20, top: -10, right: 500 }, { top: 40, right: 428 }),
    ).toEqual({ placement: 'side', left: 416, top: 50 });
    expect(
      tableActionPosition({ left: 20, top: -100, right: 500 }, { top: -20, right: 450 }),
    ).toEqual({ placement: 'above', left: 430, top: 72 });
    expect(
      tableActionPosition({ left: 0, top: -100, right: 600 }, { top: -90, right: 500 }).top,
    ).toBe(108);
  });
  it('follows table selection, deletes in the existing history, and detaches both pointer listeners', () => {
    const { editor, shell, element } = setup('| First | Second |\n| --- | --- |\n| One | Two |');
    const publish = vi.fn();
    const remove = vi.spyOn(shell, 'removeEventListener');
    const controls = createTableControls(shell, () => editor, publish);
    editor.commands.setTextSelection(4);
    controls.selection(editor);
    expect(publish).toHaveBeenLastCalledWith(
      expect.objectContaining({ visible: true, placement: 'above' }),
    );
    const cell = element.querySelector('th')!;
    cell.dispatchEvent(new Event('pointermove', { bubbles: true }));
    controls.blur();
    expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }));
    controls.deleteTable();
    expect(editor.getMarkdown()).not.toContain('|');
    expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }));
    expect(editor.commands.undo()).toBe(true);
    expect(element.querySelector('table')).not.toBeNull();
    controls.dispose();
    expect(remove.mock.calls.map((args) => args[0])).toEqual(['pointermove', 'pointerleave']);
    publish.mockClear();
    shell.dispatchEvent(new Event('pointerleave'));
    controls.selection(editor);
    controls.blur();
    controls.deleteTable();
    expect(publish).not.toHaveBeenCalled();
    expect(element.querySelector('table')).not.toBeNull();
  });
  it('retains a hover action while the pointer moves onto the button, then hides it outside the table', () => {
    const { editor, shell, element } = setup(
      'Paragraph.\n\n| First | Second |\n| --- | --- |\n| One | Two |',
    );
    const publish = vi.fn(),
      controls = createTableControls(shell, () => editor, publish);
    editor.commands.setTextSelection(1);
    const cell = element.querySelector('th')!;
    cell.dispatchEvent(new Event('pointermove', { bubbles: true }));
    expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }));
    controls.selection(editor);
    expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }));
    const action = document.createElement('div');
    action.className = 'table-hover-action';
    shell.append(action);
    action.dispatchEvent(new Event('pointermove', { bubbles: true }));
    controls.blur();
    expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }));
    shell.dispatchEvent(new Event('pointerleave'));
    expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }));
    controls.dispose();
  });
});
