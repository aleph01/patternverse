// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  dropboxSyncState,
  startDropboxAutomaticSync,
  syncDropboxAccount,
} from './dropbox-auto-sync';
import { DROPBOX_CONNECTION_STORAGE_KEY } from './dropbox-auth';
import { saveAutomaticSync, DROPBOX_CONNECTION_CHANGED } from './sync-preferences';
import { notifyWorkspaceChanged } from './workspace-changes';
import { observeWorkspaceWrites } from './workspace';
import type { LocalWorkspace } from '@patternverse/workspace';

const mocks = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock('./dropbox-workspace-sync', () => ({ syncWorkspaceWithDropbox: mocks.run }));
vi.mock('./workspace', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./workspace')>()),
  getLocalWorkspace: async () => ({}),
}));
vi.mock('$lib/mira/private-store', () => ({ createPrivateMiraStore: () => ({}) }));
let stop: (() => void) | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
  localStorage.clear();
  sessionStorage.clear();
  dropboxSyncState.set({ busy: false, message: '' });
  mocks.run.mockReset().mockResolvedValue({ type: 'complete', records: 2, recovered: false });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});
function connect() {
  sessionStorage.setItem(
    DROPBOX_CONNECTION_STORAGE_KEY,
    JSON.stringify({
      accountId: 'synthetic-account',
      accessToken: 'synthetic-token',
      expiresAt: '2026-10-10T14:00:00Z',
    }),
  );
  window.dispatchEvent(new Event(DROPBOX_CONNECTION_CHANGED));
}

it('refresh notifications from remote applies never schedule an upload echo', async () => {
  connect();
  stop = startDropboxAutomaticSync();
  await vi.advanceTimersByTimeAsync(1500);
  expect(mocks.run.mock.calls[0][0].automatic).toBe(true);
  notifyWorkspaceChanged({ origin: 'sync', topics: ['entities', 'mira-sessions'] });
  await vi.advanceTimersByTimeAsync(5000);
  expect(mocks.run).toHaveBeenCalledOnce();
  await syncDropboxAccount();
  expect(mocks.run.mock.calls[1][0].automatic).toBe(false);
});

it('allows re-enabling after restore cancels a queued automatic attempt', async () => {
  mocks.run.mockImplementationOnce(async () => {
    saveAutomaticSync(false);
    return { type: 'cancelled', message: 'Automatic sync is off.' };
  });
  connect();
  stop = startDropboxAutomaticSync();
  await vi.advanceTimersByTimeAsync(1500);
  expect(get(dropboxSyncState).result?.type).toBe('cancelled');
  await vi.advanceTimersByTimeAsync(120_000);
  expect(mocks.run).toHaveBeenCalledOnce();
  saveAutomaticSync(true);
  await vi.advanceTimersByTimeAsync(1500);
  expect(mocks.run).toHaveBeenCalledTimes(2);
  expect(get(dropboxSyncState).result?.type).toBe('complete');
});

it('backup restore cancels pending saves and stays off through polling, focus, reconnect and reload', async () => {
  connect();
  stop = startDropboxAutomaticSync();
  await vi.advanceTimersByTimeAsync(1500);
  notifyWorkspaceChanged({ origin: 'local', topics: ['entities'] });
  await vi.advanceTimersByTimeAsync(500);
  const workspace = observeWorkspaceWrites({
    getWorkspace: async () => ({ id: 'synthetic-workspace' }),
    replaceFromBackup: async () => {},
  } as unknown as LocalWorkspace);
  await workspace.replaceFromBackup({} as never);
  window.dispatchEvent(new Event('focus'));
  connect();
  await vi.advanceTimersByTimeAsync(120_000);
  expect(mocks.run).toHaveBeenCalledOnce();
  stop();
  stop = startDropboxAutomaticSync();
  await vi.advanceTimersByTimeAsync(120_000);
  expect(mocks.run).toHaveBeenCalledOnce();
  await syncDropboxAccount();
  expect(mocks.run).toHaveBeenCalledTimes(2);
  saveAutomaticSync(true);
  await vi.advanceTimersByTimeAsync(1500);
  expect(mocks.run).toHaveBeenCalledTimes(3);
});

it('starts after sign-in, syncs saves off the backup page, and shares manual status', async () => {
  stop = startDropboxAutomaticSync();
  await vi.advanceTimersByTimeAsync(2000);
  expect(mocks.run).not.toHaveBeenCalled();
  connect();
  await vi.advanceTimersByTimeAsync(1500);
  expect(mocks.run).toHaveBeenCalledOnce();
  expect(get(dropboxSyncState).message).toBe('Synced 2 private workspace records.');
  notifyWorkspaceChanged({ origin: 'local', topics: ['entities'] });
  await vi.advanceTimersByTimeAsync(1500);
  expect(mocks.run).toHaveBeenCalledTimes(2);
  saveAutomaticSync(false);
  notifyWorkspaceChanged({ origin: 'local', topics: ['entities'] });
  await vi.advanceTimersByTimeAsync(120_000);
  expect(mocks.run).toHaveBeenCalledTimes(2);
  await syncDropboxAccount();
  expect(mocks.run).toHaveBeenCalledTimes(3);
});

it('polls remote updates only online and visible; returning online triggers a check', async () => {
  connect();
  stop = startDropboxAutomaticSync();
  await vi.advanceTimersByTimeAsync(1500);
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  window.dispatchEvent(new Event('offline'));
  await vi.advanceTimersByTimeAsync(120_000);
  expect(mocks.run).toHaveBeenCalledOnce();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  window.dispatchEvent(new Event('online'));
  await vi.advanceTimersByTimeAsync(1500);
  expect(mocks.run).toHaveBeenCalledTimes(2);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(120_000);
  expect(mocks.run).toHaveBeenCalledTimes(2);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  document.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(1500);
  expect(mocks.run).toHaveBeenCalledTimes(3);
});

it('keeps unresolved reviews available across page changes and does not auto-select', async () => {
  mocks.run.mockResolvedValueOnce({
    type: 'review',
    items: [],
    token: 'synthetic-review',
    stale: false,
  });
  connect();
  stop = startDropboxAutomaticSync();
  await vi.advanceTimersByTimeAsync(1500);
  expect(get(dropboxSyncState).result?.type).toBe('review');
  window.dispatchEvent(new Event('focus'));
  notifyWorkspaceChanged({ origin: 'local', topics: ['entities'] });
  await vi.advanceTimersByTimeAsync(120_000);
  expect(mocks.run).toHaveBeenCalledOnce();
  expect(mocks.run.mock.calls[0]?.[0]?.choices).toBeUndefined();
  await syncDropboxAccount({
    choices: { 'synthetic-path': 'local' },
    reviewedToken: 'synthetic-review',
  });
  expect(get(dropboxSyncState).result?.type).toBe('complete');
});

it('stops future attempts after disconnect or credential expiry; does not persist tokens', async () => {
  connect();
  stop = startDropboxAutomaticSync();
  await vi.advanceTimersByTimeAsync(1500);
  sessionStorage.removeItem(DROPBOX_CONNECTION_STORAGE_KEY);
  window.dispatchEvent(new Event(DROPBOX_CONNECTION_CHANGED));
  notifyWorkspaceChanged({ origin: 'local', topics: ['entities'] });
  await vi.advanceTimersByTimeAsync(120_000);
  expect(mocks.run).toHaveBeenCalledOnce();
  connect();
  vi.setSystemTime(new Date('2026-10-10T15:00:00Z'));
  await vi.advanceTimersByTimeAsync(120_000);
  expect(mocks.run).toHaveBeenCalledOnce();
  expect(sessionStorage.getItem(DROPBOX_CONNECTION_STORAGE_KEY)).toBeNull();
  expect(Object.values(localStorage).join('')).not.toContain('synthetic-token');
});
