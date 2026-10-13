import { createPrivateMiraStore } from '$lib/mira/private-store';
import {
  createDropboxAuthorization,
  DROPBOX_CONNECTION_STORAGE_KEY,
  DROPBOX_FLOW_STORAGE_KEY,
  readDropboxConnection,
} from './dropbox-auth';
import { dropboxSyncState, syncDropboxAccount } from './dropbox-auto-sync';
import { forgetDropboxSyncKey, hasDropboxSyncKey, syncWithDropbox } from './dropbox-sync';
import { syncWorkspaceWithDropbox } from './dropbox-workspace-sync';
import {
  DROPBOX_CONNECTION_CHANGED,
  SYNC_PREFERENCES_CHANGED,
  readAutomaticSync,
  saveAutomaticSync,
} from './sync-preferences';
import type { SyncSettingsMode, SyncSettingsPorts } from './sync-settings';
import { getLocalWorkspace } from './workspace';

/** Browser effects only. Construction is SSR-safe; effects run on mount or an
 * explicit user action. This adapter neither schedules nor reimplements sync.
 */
export function browserSyncSettings(options: {
  appKey: string;
  callbackPath: string;
  mode: () => SyncSettingsMode;
}): SyncSettingsPorts {
  return {
    mode: options.mode,
    authorizationConfigured: () => Boolean(options.appKey),
    prepareAuthorization: () =>
      createDropboxAuthorization(
        options.appKey,
        `${window.location.origin}${options.callbackPath}`,
      ),
    openAuthorization: (authorization) => {
      sessionStorage.setItem(DROPBOX_FLOW_STORAGE_KEY, JSON.stringify(authorization.flow));
      window.location.assign(authorization.url);
    },
    readConnection: () => readDropboxConnection(sessionStorage),
    clearConnection: () => sessionStorage.removeItem(DROPBOX_CONNECTION_STORAGE_KEY),
    connectionChanged: () => window.dispatchEvent(new Event(DROPBOX_CONNECTION_CHANGED)),
    hasKey: hasDropboxSyncKey,
    forgetKey: forgetDropboxSyncKey,
    readAutomaticSync,
    saveAutomaticSync,
    observePreferences: (changed) => {
      window.addEventListener(SYNC_PREFERENCES_CHANGED, changed);
      window.addEventListener('storage', changed);
      return () => {
        window.removeEventListener(SYNC_PREFERENCES_CHANGED, changed);
        window.removeEventListener('storage', changed);
      };
    },
    observeAccountSync: (changed) => dropboxSyncState.subscribe(changed),
    resetAccountSync: () => dropboxSyncState.set({ busy: false, message: '' }),
    syncAccount: syncDropboxAccount,
    syncWorkspace: async (input) =>
      syncWorkspaceWithDropbox({
        ...input,
        workspace: await getLocalWorkspace(),
        mira: createPrivateMiraStore(),
        protection: 'phrase',
      }),
    syncLegacy: async (input) =>
      syncWithDropbox({
        ...input,
        workspace: await getLocalWorkspace(),
        mira: createPrivateMiraStore(),
      }),
  };
}
