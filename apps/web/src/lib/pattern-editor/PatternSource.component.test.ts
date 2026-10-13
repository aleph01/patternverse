// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PatternSource from './PatternSource.svelte';

afterEach(cleanup);

function setup(source: string, disabled = false) {
  const onchange = vi.fn((next: string) => void view.rerender({ source: next }));
  const view = render(PatternSource, { source, disabled, onchange });
  const field = screen.getByRole('textbox', { name: 'Practice source' }) as HTMLTextAreaElement;
  const open = async (position = field.value.length) => {
    field.focus();
    field.setSelectionRange(position, position);
    await fireEvent.keyDown(field, { ctrlKey: true, code: 'Space', key: ' ' });
  };
  return { ...view, field, open, onchange };
}
const selected = () =>
  screen.getAllByRole('option').find((option) => option.getAttribute('aria-selected') === 'true')!;

describe('Pattern source completion controls', () => {
  it.each(['Enter', 'Tab'])(
    'inserts with %s and restores the single snippet caret',
    async (key) => {
      const { field, open, onchange } = setup('  !as');
      await open();
      expect(screen.getByRole('listbox', { name: 'Pattern suggestions' })).toBeTruthy();
      expect(field.getAttribute('aria-activedescendant')).toBe(selected().id);
      await fireEvent.keyDown(field, { key });
      await waitFor(() =>
        expect(field.value).toBe('  !ask response {\n    What comes to mind?\n  }'),
      );
      expect(field.value.slice(field.selectionStart).startsWith('What comes')).toBe(true);
      expect(field.selectionStart).toBe(field.selectionEnd);
      expect(onchange).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('listbox')).toBeNull();
    },
  );

  it('wraps arrow selection and dismisses without modifying source', async () => {
    const { field, open, onchange } = setup('!');
    await open();
    const options = screen.getAllByRole('option');
    expect(selected()).toBe(options[0]);
    await fireEvent.keyDown(field, { key: 'ArrowUp' });
    expect(selected()).toBe(options.at(-1));
    await fireEvent.keyDown(field, { key: 'ArrowDown' });
    expect(selected()).toBe(options[0]);
    await fireEvent.keyDown(field, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });

  it('accepts a pointer-selected suggestion and replaces the suffix after the caret', async () => {
    const source = '# café 🙂\n  !askkk\n-> end';
    const { field, open } = setup(source);
    await open(source.indexOf('!askkk') + 3);
    const option = screen.getByRole('option');
    // Preventing mousedown keeps the textarea focus so blur cannot close the list first.
    expect(await fireEvent.mouseDown(option)).toBe(false);
    await fireEvent.click(option);
    await waitFor(() =>
      expect(field.value).toBe(
        '# café 🙂\n  !ask response {\n    What comes to mind?\n  }\n-> end',
      ),
    );
    expect(field.value.slice(field.selectionStart).startsWith('What comes')).toBe(true);
  });

  it('treats snippet insertion as one undoable edit and supports redo', async () => {
    const { field, open } = setup('!as');
    await open();
    await fireEvent.keyDown(field, { key: 'Enter' });
    await waitFor(() => expect(field.value).toContain('!ask response'));
    const inserted = field.value,
      caret = field.selectionStart;
    await fireEvent.keyDown(field, { ctrlKey: true, key: 'z' });
    await waitFor(() => expect(field.value).toBe('!as'));
    expect(field.selectionStart).toBe(3);
    await fireEvent.keyDown(field, { ctrlKey: true, shiftKey: true, key: 'z' });
    await waitFor(() => expect(field.value).toBe(inserted));
    expect(field.selectionStart).toBe(caret);
  });

  it('opens on ordinary typing but never accepts suggestions during IME composition', async () => {
    const { field, open, onchange } = setup('!');
    await fireEvent.input(field, { target: { value: '!as', selectionStart: 3 } });
    expect(screen.getByRole('listbox')).toBeTruthy();
    await fireEvent.compositionStart(field);
    expect(screen.queryByRole('listbox')).toBeNull();
    await open();
    await fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
    expect(onchange).toHaveBeenCalledTimes(1);
    await fireEvent.compositionEnd(field);
    await open();
    await fireEvent.keyDown(field, { key: 'Enter' });
    await waitFor(() => expect(field.value).toContain('!ask response'));
    expect(onchange).toHaveBeenCalledTimes(2);
  });

  it('does not expose or accept suggestions while disabled', async () => {
    const { field, open, onchange, rerender } = setup('!as');
    await open();
    await rerender({ disabled: true });
    expect(field.readOnly).toBe(true);
    expect(screen.queryByRole('listbox')).toBeNull();
    await open();
    await fireEvent.keyDown(field, { key: 'Tab' });
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each(['blur', 'scroll'])('closes suggestions on %s without changing source', async (event) => {
    const { field, open, onchange } = setup('!as');
    await open();
    await fireEvent(field, new Event(event));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });

  it('rejects an insertion exceeding the UTF-8 source limit', async () => {
    const source = '# ' + '🙂'.repeat(16380) + '\n!as';
    const { field, open, onchange } = setup(source);
    expect(new TextEncoder().encode(source).length).toBeLessThan(65536);
    await open();
    await fireEvent.keyDown(field, { key: 'Enter' });
    expect(onchange).not.toHaveBeenCalled();
    expect(field.value).toBe(source);
    expect(screen.getByRole('listbox')).toBeTruthy();
  });
});
