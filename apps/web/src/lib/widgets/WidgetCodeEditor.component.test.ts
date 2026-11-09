// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import WidgetCodeEditor from './WidgetCodeEditor.svelte';
import { highlightCode } from './code-highlighting';
afterEach(cleanup);
it.each([
  ['widget.js', 'const count = 3; // comment'],
  ['widget.css', 'body { color: #28654e; }'],
  ['widget.html', '<button aria-label="Choose">Choose</button>'],
  ['catalogue.json', '{"choices":[],"enabled":true}'],
])('highlights %s without changing the authored source', async (filename, source) => {
  const tokens = await highlightCode(source, filename);
  expect(tokens.map((t) => t.text).join('')).toBe(source);
  expect(tokens.some((t) => t.kind)).toBe(true);
});
it('keeps HTML source inert and keeps highlighted text synchronized with edits', async () => {
  const original = '<img src=x onerror="window.widgetEditorEscaped=true">';
  const onchange = vi.fn((source: string) => void view.rerender({ source }));
  const view = render(WidgetCodeEditor, { source: original, filename: 'widget.html', onchange });
  const field = screen.getByRole('textbox', { name: 'widget.html source' }) as HTMLTextAreaElement;
  await waitFor(() =>
    expect(view.container.querySelector('.syntax-layer')?.textContent).toBe(original + '\n'),
  );
  expect(view.container.querySelector('img')).toBeNull();
  expect(field.value).toBe(original);
  const next = '<p>Next & final</p>';
  await fireEvent.input(field, { target: { value: next } });
  await waitFor(() =>
    expect(view.container.querySelector('.syntax-layer')?.textContent).toBe(next + '\n'),
  );
  expect(onchange).toHaveBeenCalledWith(next);
  expect(view.container.querySelector('.line-gutter')?.getAttribute('aria-hidden')).toBe('true');
});
it('retains a selectable, read-only source field when inspecting a release', () => {
  render(WidgetCodeEditor, {
    source: '{"version":1}',
    filename: 'widget.json',
    readonly: true,
    onchange: vi.fn(),
  });
  const field = screen.getByRole('textbox', { name: 'widget.json source' }) as HTMLTextAreaElement;
  expect(field.readOnly).toBe(true);
  expect(field.disabled).toBe(false);
});
