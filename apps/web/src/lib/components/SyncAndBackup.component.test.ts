// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SyncAndBackup from './SyncAndBackup.svelte';
import { DROPBOX_CONNECTION_STORAGE_KEY } from '$lib/client/dropbox-auth';
import { dropboxSyncState } from '$lib/client/dropbox-auto-sync';
import { readAutomaticSync, AUTO_SYNC_KEY } from '$lib/client/sync-preferences';

const mocks = vi.hoisted(() => ({
  workspace: {},
  mira: {},
  sync: vi.fn(),
  legacySync: vi.fn(),
  hasKey: vi.fn(),
  forgetKey: vi.fn(),
}));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
vi.mock('$env/static/public', () => ({ PUBLIC_DROPBOX_APP_KEY: 'synthetic-public-key' }));
vi.mock('$lib/client/workspace', () => ({ getLocalWorkspace: async () => mocks.workspace }));
vi.mock('$lib/mira/private-store', () => ({ createPrivateMiraStore: () => mocks.mira }));
vi.mock('$lib/client/dropbox-workspace-sync', () => ({ syncWorkspaceWithDropbox: mocks.sync }));
vi.mock('$lib/client/dropbox-sync', () => ({
  hasDropboxSyncKey: mocks.hasKey,
  forgetDropboxSyncKey: mocks.forgetKey,
  syncWithDropbox: mocks.legacySync,
}));

beforeEach(() => {
  vi.clearAllMocks();
  dropboxSyncState.set({ busy: false, message: '' });
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem(
    DROPBOX_CONNECTION_STORAGE_KEY,
    JSON.stringify({
      accessToken: 'synthetic-token',
      accountId: 'test-account',
      expiresAt: '2099-01-01T00:00:00Z',
    }),
  );
  mocks.sync.mockResolvedValue({ type: 'complete', records: 2, recovered: false });
  mocks.legacySync.mockResolvedValue({ type: 'complete', entities: 2, sessions: 1 });
  mocks.hasKey.mockResolvedValue(false);
  mocks.forgetKey.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
});

it('defaults on, disables immediately in sync settings, and remembers after remount', async () => {
  const view = render(SyncAndBackup, { workspaceSync: true, dropboxSignInOnly: true });
  const toggle = screen.getByRole('switch', { name: /Automatic Dropbox sync/ }) as HTMLInputElement;
  await waitFor(() => expect(toggle.checked).toBe(true));
  await fireEvent.click(toggle);
  expect(readAutomaticSync()).toBe(false);
  expect(localStorage.getItem(AUTO_SYNC_KEY)).toBe('false');
  expect(mocks.sync).not.toHaveBeenCalled();
  view.unmount();
  render(SyncAndBackup, { workspaceSync: true, dropboxSignInOnly: true });
  await waitFor(() =>
    expect(
      (screen.getByRole('switch', { name: /Automatic Dropbox sync/ }) as HTMLInputElement).checked,
    ).toBe(false),
  );
});

it('allows disabling automatic sync before connecting Dropbox', async () => {
  sessionStorage.clear();
  render(SyncAndBackup, { workspaceSync: true, dropboxSignInOnly: true });
  const toggle = screen.getByRole('switch', { name: /Automatic Dropbox sync/ }) as HTMLInputElement;
  await waitFor(() => expect(toggle.checked).toBe(true));
  await fireEvent.click(toggle);
  expect(readAutomaticSync()).toBe(false);
  expect(screen.getByRole('button', { name: 'Connect Dropbox' })).toBeTruthy();
  expect(mocks.sync).not.toHaveBeenCalled();
});

it('does not ask for a phrase or sync automatically in sign-in-only mode', async () => {
  render(SyncAndBackup, { workspaceSync: true, dropboxSignInOnly: true });
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Dropbox connected' })).toBeTruthy(),
  );
  expect(screen.queryByLabelText(/Sync phrase/)).toBeNull();
  expect(
    screen.getByText(/Dropbox and anyone with access to your account can read it/),
  ).toBeTruthy();
  expect(mocks.sync).not.toHaveBeenCalled();
  expect(mocks.hasKey).not.toHaveBeenCalled();
  await fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
  await waitFor(() => expect(mocks.sync).toHaveBeenCalledOnce());
  expect(mocks.sync).toHaveBeenCalledWith(
    expect.objectContaining({
      protection: 'dropbox-account',
      workspace: mocks.workspace,
      mira: mocks.mira,
    }),
  );
  expect(mocks.sync.mock.calls[0]?.[0]?.phrase).toBeUndefined();
  await waitFor(() => expect(screen.getByText('Synced 2 private workspace records.')).toBeTruthy());
});

it('disconnects without deleting the local recovery key or syncing', async () => {
  render(SyncAndBackup, { workspaceSync: true, dropboxSignInOnly: true });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Disconnect' })).toBeTruthy());
  await fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
  expect(sessionStorage.getItem(DROPBOX_CONNECTION_STORAGE_KEY)).toBeNull();
  expect(mocks.forgetKey).not.toHaveBeenCalled();
  expect(mocks.sync).not.toHaveBeenCalled();
});

it('retains the phrase flow in builds without the explicit sign-in-only switch', async () => {
  render(SyncAndBackup, { workspaceSync: true });
  await waitFor(() => expect(screen.getByLabelText('Sync phrase')).toBeTruthy());
  expect(screen.getByRole('heading', { name: 'Encrypted cross-device sync' })).toBeTruthy();
  expect(mocks.sync).not.toHaveBeenCalled();
  expect(screen.queryByRole('switch', { name: /Automatic Dropbox sync/ })).toBeNull();
});

it('forwards encrypted workspace conflict choices only after explicit review', async () => {
  mocks.sync.mockResolvedValueOnce({
    type: 'review',
    token: 'review-token',
    stale: false,
    items: [
      {
        path: 'entities/one',
        title: 'One',
        kind: 'Library item',
        local: 'Local',
        remote: 'Remote',
      },
    ],
  });
  render(SyncAndBackup, { workspaceSync: true });
  await screen.findByLabelText('Sync phrase');
  await fireEvent.input(screen.getByLabelText('Sync phrase'), {
    target: { value: 'private phrase' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
  const apply = await screen.findByRole('button', { name: 'Apply choices and sync' });
  expect((apply as HTMLButtonElement).disabled).toBe(true);
  expect(mocks.sync).toHaveBeenCalledOnce();
  await fireEvent.click(screen.getByRole('radio', { name: /^Dropbox$/ }));
  await fireEvent.click(apply);
  await screen.findByText('Synced 2 private workspace records.');
  expect(mocks.sync.mock.calls[1]![0]).toMatchObject({
    protection: 'phrase',
    phrase: 'private phrase',
    choices: { 'entities/one': 'remote' },
    reviewedToken: 'review-token',
  });
  expect(
    (screen.getByLabelText('Sync phrase (only if unlocking again)') as HTMLInputElement).value,
  ).toBe('');
});

it('keeps the legacy conflict layout and sends selected versions with its original token', async () => {
  mocks.legacySync.mockResolvedValueOnce({
    type: 'conflicts',
    conflicts: [{ key: 'entities:one', title: 'One' }],
    token: 'legacy-token',
  });
  render(SyncAndBackup);
  await screen.findByLabelText('Sync phrase');
  await fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
  const group = await screen.findByRole('group', { name: 'Sync conflicts' });
  expect(group.className).toBe('sync-conflicts');
  const apply = screen.getByRole('button', { name: 'Resolve and sync' }) as HTMLButtonElement;
  expect(apply.disabled).toBe(true);
  await fireEvent.change(screen.getByRole('combobox'), { target: { value: 'local' } });
  await fireEvent.click(apply);
  await screen.findByText('Synced 2 library items and 1 Mira sessions.');
  expect(mocks.legacySync.mock.calls[1]![0]).toMatchObject({
    choices: { 'entities:one': 'local' },
    expectedConflictToken: 'legacy-token',
  });
  expect(mocks.sync).not.toHaveBeenCalled();
});

it('requires confirmation before forwarding an archive upgrade and can dismiss it without writes', async () => {
  const result = {
    type: 'upgrade',
    token: 'upgrade-token',
    items: 2,
    sessions: 1,
    resumed: false,
    stale: false,
  };
  mocks.sync.mockResolvedValueOnce(result);
  const view = render(SyncAndBackup, { workspaceSync: true });
  await screen.findByRole('button', { name: 'Sync now' });
  await fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
  const apply = await screen.findByRole('button', { name: 'Back up and upgrade' });
  expect((apply as HTMLButtonElement).disabled).toBe(true);
  await fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  expect(mocks.sync).toHaveBeenCalledOnce();
  await screen.findByText('Upgrade review closed. No further changes were made.');
  mocks.sync.mockResolvedValueOnce(result);
  await fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
  await screen.findByRole('button', { name: 'Back up and upgrade' });
  await fireEvent.click(screen.getByRole('checkbox', { name: /I will use the updated sync/ }));
  await fireEvent.click(screen.getByRole('button', { name: 'Back up and upgrade' }));
  await screen.findByText('Synced 2 private workspace records.');
  expect(mocks.sync.mock.calls[2]![0].upgrade).toEqual({ token: 'upgrade-token', confirmed: true });
  view.unmount();
});

it('restores the switch and shows an error if the device preference cannot be saved', async () => {
  render(SyncAndBackup, { workspaceSync: true, dropboxSignInOnly: true });
  const toggle = (await screen.findByRole('switch', {
    name: /Automatic Dropbox sync/,
  })) as HTMLInputElement;
  await waitFor(() => expect(toggle.checked).toBe(true));
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage unavailable');
  });
  try {
    await fireEvent.click(toggle);
    await screen.findByRole('alert');
    expect(toggle.checked).toBe(true);
    expect(readAutomaticSync()).toBe(true);
    expect(mocks.sync).not.toHaveBeenCalled();
  } finally {
    write.mockRestore();
  }
});

it('receives shared account reviews again after navigating away and back', async () => {
  const result = { type: 'review' as const, token: 'review-token', stale: false, items: [] };
  const view = render(SyncAndBackup, { workspaceSync: true, dropboxSignInOnly: true });
  dropboxSyncState.set({ busy: false, result, message: 'Review changes' });
  await screen.findByRole('region', { name: 'Review workspace sync' });
  await fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  await screen.findByText('Review closed. No choices were applied; recovery data was kept.');
  expect(mocks.sync).not.toHaveBeenCalled();
  view.unmount();
  render(SyncAndBackup, { workspaceSync: true, dropboxSignInOnly: true });
  await screen.findByRole('region', { name: 'Review workspace sync' });
  expect(mocks.sync).not.toHaveBeenCalled();
});
