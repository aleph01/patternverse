// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import WorkspaceSyncUpgrade from './WorkspaceSyncUpgrade.svelte';

afterEach(cleanup);
const result = {
  type: 'upgrade' as const,
  token: 'archive-version',
  items: 2,
  sessions: 1,
  resumed: false,
  stale: false,
};
const props = () => ({ result, onupgrade: vi.fn(), oncancel: vi.fn() });
it('requires an explicit compatibility confirmation before archive writes', async () => {
  const handlers = props();
  render(WorkspaceSyncUpgrade, handlers);
  const apply = screen.getByRole('button', { name: 'Back up and upgrade' });
  expect(apply.hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('status').textContent).toContain('No local content is replaced');
  await fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  expect(handlers.oncancel).toHaveBeenCalledOnce();
  expect(handlers.onupgrade).not.toHaveBeenCalled();
  await fireEvent.click(screen.getByRole('checkbox'));
  await fireEvent.click(apply);
  expect(handlers.onupgrade).toHaveBeenCalledWith('archive-version');
});
it('resets confirmation for a stale or resumed upgrade', async () => {
  const handlers = props(),
    view = render(WorkspaceSyncUpgrade, handlers);
  await fireEvent.click(screen.getByRole('checkbox'));
  await view.rerender({
    ...handlers,
    result: { ...result, token: 'new-version', resumed: true, stale: true },
  });
  expect(screen.getByRole('status').textContent).toContain('Review and confirm');
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  expect(screen.getByRole('button', { name: 'Resume upgrade' }).hasAttribute('disabled')).toBe(
    true,
  );
});
it('prevents further actions while an upgrade is running', () => {
  render(WorkspaceSyncUpgrade, { ...props(), busy: true });
  expect(
    screen.getAllByRole('button').every((button) => (button as HTMLButtonElement).disabled),
  ).toBe(true);
  expect(screen.getByRole('checkbox').hasAttribute('disabled')).toBe(true);
});
