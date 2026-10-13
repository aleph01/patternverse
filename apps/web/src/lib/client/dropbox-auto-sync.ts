import { writable } from 'svelte/store';
import { createAutomaticSync } from './automatic-sync';
import { DROPBOX_CONNECTION_STORAGE_KEY, readDropboxConnection } from './dropbox-auth';
import { getLocalWorkspace } from './workspace';
import { createPrivateMiraStore } from '$lib/mira/private-store';
import {
  syncWorkspaceWithDropbox,
  type WorkspaceDropboxSyncResult,
} from './dropbox-workspace-sync';
import {
  AUTO_SYNC_KEY,
  DROPBOX_CONNECTION_CHANGED,
  readAutomaticSync,
  SYNC_PREFERENCES_CHANGED,
} from './sync-preferences';
import { subscribeWorkspaceChanges, WORKSPACE_DATA_TOPICS } from './workspace-changes';

type SyncInput = Parameters<typeof syncWorkspaceWithDropbox>[0];
export type AccountSyncActions = Pick<SyncInput, 'choices' | 'reviewedToken' | 'recovery'>;
export const dropboxSyncState = writable<{
  busy: boolean;
  result?: WorkspaceDropboxSyncResult;
  message: string;
  lastSyncedAt?: string;
}>({ busy: false, message: '' });

let controller:
  | ReturnType<typeof createAutomaticSync<WorkspaceDropboxSyncResult, AccountSyncActions>>
  | undefined;

function connectionAvailable(): boolean {
  const hadConnection = sessionStorage.getItem(DROPBOX_CONNECTION_STORAGE_KEY) !== null;
  const connected = !!readDropboxConnection(sessionStorage);
  if (hadConnection && !connected) {
    const message =
      'Dropbox sign-in expired. Reconnect in Sync & backup; your local work is saved.';
    dropboxSyncState.update((state) => ({
      ...state,
      message,
      result: { type: 'error', message, recoveryAvailable: false },
    }));
  }
  return connected;
}

function accountSyncController() {
  controller ??= createAutomaticSync<WorkspaceDropboxSyncResult, AccountSyncActions>({
    eligible: () =>
      navigator.onLine &&
      document.visibilityState !== 'hidden' &&
      !window.location.pathname.startsWith('/auth/') &&
      connectionAvailable(),
    enabled: readAutomaticSync,
    run: async (actions, manual) => {
      const connection = readDropboxConnection(sessionStorage);
      if (!connection) throw new Error('Reconnect Dropbox, then retry sync.');
      return syncWorkspaceWithDropbox({
        connection,
        workspace: await getLocalWorkspace(),
        mira: createPrivateMiraStore(),
        protection: 'dropbox-account',
        automatic: !manual,
        ...actions,
      });
    },
    busy: (busy) => dropboxSyncState.update((state) => ({ ...state, busy })),
    failed: () =>
      dropboxSyncState.update((state) => ({
        ...state,
        result: {
          type: 'error',
          recoveryAvailable: true,
          message: 'Automatic sync paused. Open Sync & backup to retry; your local work was kept.',
        },
        message: 'Automatic sync paused. Open Sync & backup to retry; your local work was kept.',
      })),
    completed: (result) => {
      const message =
        result.type === 'complete'
          ? `Synced ${result.records} private workspace records${result.recovered ? ' and recovered the interrupted update' : ''}.`
          : result.type === 'review'
            ? 'Sync paused: choose which versions to keep in Sync & backup.'
            : 'message' in result
              ? result.message
              : 'Sync paused: review the update in Sync & backup.';
      dropboxSyncState.update((state) => ({
        ...state,
        result,
        message,
        ...(result.type === 'complete' ? { lastSyncedAt: new Date().toISOString() } : {}),
      }));
    },
  });
  return controller;
}

/** Mounted once at the application boundary, not only on the backup page. No
 * service-worker upload, credential persistence, or new provider permissions.
 */
export function startDropboxAutomaticSync(): () => void {
  const scheduler = accountSyncController();
  const refresh = () => scheduler.refresh();
  const connectionChanged = () => {
    if (readDropboxConnection(sessionStorage)) scheduler.reconnected();
    else refresh();
  };
  const unsubscribe = subscribeWorkspaceChanges(
    [...WORKSPACE_DATA_TOPICS, 'mira-sessions'],
    (change) => {
      if (change.origin === 'local') scheduler.changed();
    },
  );
  const storage = (event: StorageEvent) => {
    if (event.key === AUTO_SYNC_KEY || event.key === null) refresh();
  };
  window.addEventListener(SYNC_PREFERENCES_CHANGED, refresh);
  window.addEventListener(DROPBOX_CONNECTION_CHANGED, connectionChanged);
  window.addEventListener('online', refresh);
  window.addEventListener('offline', refresh);
  window.addEventListener('focus', refresh);
  window.addEventListener('storage', storage);
  document.addEventListener('visibilitychange', refresh);
  const poll = setInterval(refresh, 60_000);
  refresh();
  return () => {
    scheduler.stop();
    controller = undefined;
    clearInterval(poll);
    unsubscribe();
    window.removeEventListener(SYNC_PREFERENCES_CHANGED, refresh);
    window.removeEventListener(DROPBOX_CONNECTION_CHANGED, connectionChanged);
    window.removeEventListener('online', refresh);
    window.removeEventListener('offline', refresh);
    window.removeEventListener('focus', refresh);
    window.removeEventListener('storage', storage);
    document.removeEventListener('visibilitychange', refresh);
  };
}

export const syncDropboxAccount = (actions?: AccountSyncActions) =>
  accountSyncController().sync(actions);
