// @vitest-environment jsdom
import type { Editor } from '@tiptap/core';
import { act, cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NovelMarkdownEditor from './NovelMarkdownEditor.svelte';

const instances = vi.hoisted(() => ({ editors: [] as Editor[] }));
vi.mock('$lib/novel-editor/instance', async (importOriginal) => {
  const original = await importOriginal<typeof import('$lib/novel-editor/instance')>();
  return {
    createMarkdownEditor: (...args: Parameters<typeof original.createMarkdownEditor>) => {
      const editor = original.createMarkdownEditor(...args);
      instances.editors.push(editor);
      return editor;
    },
  };
});
beforeEach(() => {
  instances.editors = [];
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 0),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('rich-text editor mount boundary', () => {
  it('retains the same instance, selection and undo history when layout and disabled props change', async () => {
    const onchange = vi.fn();
    const view = render(NovelMarkdownEditor, { value: 'Original.', onchange });
    await waitFor(() => expect(instances.editors).toHaveLength(1));
    const editor = instances.editors[0];
    await act(() => {
      editor.commands.setTextSelection(10);
      editor.commands.insertContent(' New thought.');
    });
    expect(onchange).toHaveBeenCalledWith('Original. New thought.');
    const selection = editor.state.selection.from;
    await view.rerender({ comfortable: true, disabled: true, value: editor.getMarkdown() });
    expect(instances.editors).toEqual([editor]);
    expect(editor.state.selection.from).toBe(selection);
    expect(editor.isEditable).toBe(false);
    await view.rerender({ comfortable: false, disabled: false });
    await act(() => {
      expect(editor.commands.undo()).toBe(true);
    });
    expect(editor.getMarkdown()).toBe('Original.');
    await act(() => {
      expect(editor.commands.redo()).toBe(true);
    });
    expect(editor.getMarkdown()).toBe('Original. New thought.');
  });
  it('destroys the editor and removes both table listeners on unmount', async () => {
    const view = render(NovelMarkdownEditor, { value: 'A note.', onchange: vi.fn() });
    await waitFor(() => expect(instances.editors).toHaveLength(1));
    const shell = view.container.querySelector('.novel-editor-shell')!;
    const remove = vi.spyOn(shell, 'removeEventListener');
    const editor = instances.editors[0],
      destroy = vi.spyOn(editor, 'destroy');
    view.unmount();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(editor.isDestroyed).toBe(true);
    expect(remove.mock.calls.map((args) => args[0])).toEqual(
      expect.arrayContaining(['pointermove', 'pointerleave']),
    );
    expect(document.querySelector('.drag-handle')).toBeNull();
  });
});
