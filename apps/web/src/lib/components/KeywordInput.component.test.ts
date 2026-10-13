// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import KeywordInput from './KeywordInput.svelte';

afterEach(cleanup);
const props = {
  id: 'topics',
  label: 'Topics',
  description: 'Keywords for finding this later.',
  placeholder: 'e.g. learning',
  values: ['Learning'],
};
describe('optional keyword chips', () => {
  it('adds multiple keywords using the existing list convention without duplicates', async () => {
    const onchange = vi.fn();
    const onpendingchange = vi.fn();
    render(KeywordInput, { ...props, onchange, onpendingchange });
    const input = screen.getByRole('textbox', { name: 'Topics' });
    await fireEvent.input(input, { target: { value: 'learning, testing, Decisions' } });
    expect(onpendingchange).toHaveBeenLastCalledWith(true);
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(onchange).toHaveBeenLastCalledWith(['Learning', 'testing', 'Decisions']);
    expect(onpendingchange).toHaveBeenLastCalledWith(false);
    expect((input as HTMLInputElement).value).toBe('');
  });
  it('commits pending input before save or blur and removes individual chips', async () => {
    const onchange = vi.fn();
    const view = render(KeywordInput, { ...props, onchange });
    const input = screen.getByRole('textbox', { name: 'Topics' });
    await fireEvent.input(input, { target: { value: 'testing' } });
    await act(() => view.component.commitPending());
    expect(onchange).toHaveBeenLastCalledWith(['Learning', 'testing']);
    await fireEvent.input(input, { target: { value: 'decisions' } });
    await fireEvent.blur(input);
    expect(onchange).toHaveBeenLastCalledWith(['Learning', 'decisions']);
    await fireEvent.click(screen.getByRole('button', { name: 'Remove topics: Learning' }));
    expect(onchange).toHaveBeenLastCalledWith([]);
  });
  it('supports the explicit add button and preserves empty optional fields', async () => {
    const onchange = vi.fn();
    render(KeywordInput, { ...props, values: [], onchange });
    await fireEvent.click(screen.getByRole('button', { name: 'Add topics' }));
    expect(onchange).not.toHaveBeenCalled();
    const input = screen.getByRole('textbox', { name: 'Topics' });
    await fireEvent.input(input, { target: { value: 'testing' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Add topics' }));
    expect(onchange).toHaveBeenLastCalledWith(['testing']);
  });
  it('supports pasting newline-separated keywords', async () => {
    const onchange = vi.fn();
    render(KeywordInput, { ...props, onchange });
    await fireEvent.paste(screen.getByRole('textbox', { name: 'Topics' }), {
      clipboardData: { getData: () => 'testing\nDecisions' },
    });
    expect(onchange).toHaveBeenLastCalledWith(['Learning', 'testing', 'Decisions']);
  });
  it('does not submit while composing or when disabled', async () => {
    const onchange = vi.fn();
    const view = render(KeywordInput, { ...props, onchange });
    const input = screen.getByRole('textbox', { name: 'Topics' });
    await fireEvent.input(input, { target: { value: 'testing' } });
    await fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onchange).not.toHaveBeenCalled();
    await view.rerender({ ...props, onchange, disabled: true });
    view.component.commitPending();
    expect(onchange).not.toHaveBeenCalled();
  });
});
