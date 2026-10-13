// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import WorkspaceSyncReview from './WorkspaceSyncReview.svelte';
import type { WorkspaceDropboxSyncResult } from '$lib/client/dropbox-workspace-sync';

afterEach(cleanup);
const item = {
  path: 'entities/one.json',
  title: 'One',
  kind: 'Library item',
  local: 'Local text',
  remote: 'Dropbox text',
};
const review: Extract<WorkspaceDropboxSyncResult, { type: 'review' }> = {
  type: 'review',
  token: 'reviewed-version',
  stale: false,
  items: [item],
};
function props(
  result: Extract<WorkspaceDropboxSyncResult, { type: 'review' | 'blocked' }> = review,
) {
  return { result, onresolve: vi.fn(), onretry: vi.fn(), oncancel: vi.fn() };
}
it('requires a deliberate choice for each record and submits the reviewed token', async () => {
  const handlers = props({
    ...review,
    items: [item, { ...item, path: 'sessions/two.json', title: 'Two' }],
  });
  render(WorkspaceSyncReview, handlers);
  const apply = screen.getByRole('button', { name: 'Apply choices and sync' });
  expect(apply.hasAttribute('disabled')).toBe(true);
  expect(screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(
    true,
  );
  await fireEvent.click(screen.getAllByRole('radio', { name: 'This device' })[0]!);
  expect(apply.hasAttribute('disabled')).toBe(true);
  await fireEvent.click(screen.getAllByRole('radio', { name: 'Dropbox' })[1]!);
  expect(apply.hasAttribute('disabled')).toBe(false);
  await fireEvent.click(apply);
  expect(handlers.onresolve).toHaveBeenCalledWith(
    { 'entities/one.json': 'local', 'sessions/two.json': 'remote' },
    'reviewed-version',
  );
});
it('resets choices when a fresh review arrives and explains stale choices', async () => {
  const handlers = props();
  const view = render(WorkspaceSyncReview, handlers);
  await fireEvent.click(screen.getByRole('radio', { name: 'Dropbox' }));
  await view.rerender({ ...handlers, result: { ...review, stale: true, token: 'newer-version' } });
  expect(screen.getByRole('status').textContent).toContain('earlier choices were not applied');
  expect(
    screen.getByRole('button', { name: 'Apply choices and sync' }).hasAttribute('disabled'),
  ).toBe(true);
});
it('compares deletions and escaped text without rendering article HTML', async () => {
  render(
    WorkspaceSyncReview,
    props({
      ...review,
      items: [
        { ...item, local: 'Deleted / not present', remote: '<script>private answer</script>' },
      ],
    }),
  );
  await fireEvent.click(screen.getByText('Compare versions'));
  expect(screen.getByText('Deleted / not present')).toBeTruthy();
  expect(screen.getByText('<script>private answer</script>')).toBeTruthy();
  expect(document.querySelector('.sync-review script')).toBeNull();
});
it('cancels without submitting choices and prevents writes to blocked local recovery', async () => {
  const handlers = props({
    type: 'blocked',
    message: 'Newer local work exists.',
    recoveryAvailable: true,
    items: [item],
  });
  render(WorkspaceSyncReview, handlers);
  expect(screen.queryByRole('radio')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Apply choices and sync' })).toBeNull();
  expect(screen.getByRole('status').textContent).toContain('leaves recovery unchanged');
  await fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  expect(handlers.oncancel).toHaveBeenCalledOnce();
  expect(handlers.onresolve).not.toHaveBeenCalled();
  await fireEvent.click(screen.getByRole('button', { name: 'Retry sync' }));
  expect(handlers.onretry).toHaveBeenCalledOnce();
});
it('offers retry without resolutions when a stale review no longer has conflicts', async () => {
  const handlers = props({ ...review, stale: true, items: [] });
  render(WorkspaceSyncReview, handlers);
  await fireEvent.click(screen.getByRole('button', { name: 'Retry sync' }));
  expect(handlers.onretry).toHaveBeenCalledOnce();
  expect(handlers.onresolve).not.toHaveBeenCalled();
});
it('disables all actions while syncing', () => {
  render(WorkspaceSyncReview, { ...props(), busy: true });
  expect(
    screen.getAllByRole('button').every((button) => (button as HTMLButtonElement).disabled),
  ).toBe(true);
  expect(screen.getAllByRole('radio').every((radio) => radio.closest('fieldset')?.disabled)).toBe(
    true,
  );
});
it('requires recovery confirmation and preserves protected Mira work', async () => {
  const result: Extract<WorkspaceDropboxSyncResult, { type: 'blocked' }> = {
    type: 'blocked',
    token: 'pending-version',
    message: 'Newer local work exists.',
    recoveryAvailable: true,
    items: [
      item,
      {
        ...item,
        path: 'sessions/chat.json',
        title: 'Chat',
        protectedReason: 'Active Mira work must stay on this device.',
      },
    ],
  };
  const handlers = { ...props(result), onrecover: vi.fn() };
  const view = render(WorkspaceSyncReview, handlers);
  const apply = screen.getByRole('button', { name: 'Apply recovery choices' });
  expect(
    screen.getAllByRole('radio', { name: 'Pending update' })[1]!.hasAttribute('disabled'),
  ).toBe(true);
  await fireEvent.click(screen.getAllByRole('radio', { name: 'Pending update' })[0]!);
  await fireEvent.click(screen.getAllByRole('radio', { name: 'This device' })[1]!);
  expect(apply.hasAttribute('disabled')).toBe(true);
  await fireEvent.click(screen.getByRole('checkbox'));
  await fireEvent.click(apply);
  expect(handlers.onrecover).toHaveBeenCalledWith(
    { 'entities/one.json': 'remote', 'sessions/chat.json': 'local' },
    'pending-version',
  );
  expect(handlers.onresolve).not.toHaveBeenCalled();
  await view.rerender({
    ...handlers,
    result: { ...result, token: 'updated-pending-version', stale: true },
  });
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  expect(apply.hasAttribute('disabled')).toBe(true);
});
