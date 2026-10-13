import type { DropboxConnection, DropboxOAuthFlow } from './dropbox-auth';
import type { SyncChoice, SyncConflict, SyncResult } from './dropbox-sync';
import type {
  syncWorkspaceWithDropbox,
  WorkspaceDropboxSyncResult,
  WorkspaceSyncChoice,
} from './dropbox-workspace-sync';

export type SyncSettingsMode = 'legacy-phrase' | 'workspace-phrase' | 'dropbox-account';
type WorkspaceInput = Parameters<typeof syncWorkspaceWithDropbox>[0];
export type SyncSettingsActions = Pick<
  WorkspaceInput,
  'choices' | 'reviewedToken' | 'recovery' | 'upgrade'
>;
export type AccountSyncStatus = {
  busy: boolean;
  result?: WorkspaceDropboxSyncResult;
  message: string;
  lastSyncedAt?: string;
};
export type SyncSettingsState = {
  connection?: DropboxConnection;
  connecting: boolean;
  connectionMessage: string;
  syncPhrase: string;
  syncing: boolean;
  remembered: boolean;
  conflicts: readonly SyncConflict[];
  choices: Record<string, SyncChoice>;
  conflictToken?: string;
  workspaceReview?: Extract<WorkspaceDropboxSyncResult, { type: 'review' | 'blocked' }>;
  workspaceUpgrade?: Extract<WorkspaceDropboxSyncResult, { type: 'upgrade' }>;
  automaticSync: boolean;
  lastSyncedAt?: string;
  preferenceMessage: string;
  preferenceError: string;
};

export const initialSyncSettings = (): SyncSettingsState => ({
  connecting: false,
  connectionMessage: '',
  syncPhrase: '',
  syncing: false,
  remembered: false,
  conflicts: [],
  choices: {},
  automaticSync: false,
  preferenceMessage: '',
  preferenceError: '',
});

type Authorization = { readonly flow: DropboxOAuthFlow; readonly url: string };
export type SyncSettingsPorts = {
  mode: () => SyncSettingsMode;
  authorizationConfigured: () => boolean;
  prepareAuthorization: () => Promise<Authorization>;
  openAuthorization: (authorization: Authorization) => void;
  readConnection: () => DropboxConnection | undefined;
  clearConnection: () => void;
  connectionChanged: () => void;
  hasKey: (accountId: string) => Promise<boolean>;
  forgetKey: (accountId: string) => Promise<void>;
  readAutomaticSync: () => boolean;
  saveAutomaticSync: (enabled: boolean) => void;
  observePreferences: (changed: () => void) => () => void;
  observeAccountSync: (changed: (status: AccountSyncStatus) => void) => () => void;
  resetAccountSync: () => void;
  syncAccount: (actions: Omit<SyncSettingsActions, 'upgrade'>) => Promise<unknown>;
  syncWorkspace: (
    input: SyncSettingsActions & { connection: DropboxConnection; phrase?: string },
  ) => Promise<WorkspaceDropboxSyncResult>;
  syncLegacy: (input: {
    connection: DropboxConnection;
    phrase?: string;
    choices: Record<string, SyncChoice>;
    expectedConflictToken?: string;
  }) => Promise<SyncResult>;
};

/** Settings orchestration only. Transport, merge, recovery, account binding and
 * scheduling remain in the existing services. No browser or Svelte dependency.
 */
export function createSyncSettings(
  ports: SyncSettingsPorts,
  changed: (state: SyncSettingsState) => void,
) {
  let state = initialSyncSettings();
  let disposed = false;
  let mounted = false;
  let generation = 0;
  let disconnecting = false;
  let manualSync = false;
  const cleanups: (() => void)[] = [];
  const update = (patch: Partial<SyncSettingsState>) => {
    if (disposed) return;
    state = { ...state, ...patch };
    changed(state);
  };
  const current = (version: number) => !disposed && generation === version;
  const clearLegacyReview = () => ({ conflicts: [], choices: {}, conflictToken: undefined });
  const clearReviews = () => ({
    ...clearLegacyReview(),
    workspaceReview: undefined,
    workspaceUpgrade: undefined,
  });

  function receiveAccountStatus(status: AccountSyncStatus) {
    if (disposed) return;
    update({ syncing: manualSync || status.busy });
    if (!status.result) return;
    const connection = ports.readConnection();
    if (!connection && !state.connection) return; // Do not reopen a disconnected review.
    update({
      connection,
      connectionMessage: status.message,
      workspaceReview:
        status.result.type === 'review' || status.result.type === 'blocked'
          ? status.result
          : undefined,
      lastSyncedAt: status.lastSyncedAt,
    });
  }

  function receiveWorkspaceResult(result: WorkspaceDropboxSyncResult) {
    update({ workspaceUpgrade: result.type === 'upgrade' ? result : undefined });
    if (result.type === 'upgrade') {
      update({ workspaceReview: undefined });
    } else if (result.type === 'review' || result.type === 'blocked') {
      update({ workspaceReview: result });
    } else {
      update({ workspaceReview: undefined });
      if (result.type === 'complete') {
        update({
          syncPhrase: '',
          remembered: true,
          connectionMessage: `Synced ${result.records} private workspace records${result.recovered ? ' and recovered the interrupted update' : ''}.`,
        });
      } else {
        update({
          connectionMessage: result.message,
          ...(result.type === 'upgraded' ? { syncPhrase: '', remembered: true } : {}),
        });
      }
    }
  }

  const controller = {
    mount() {
      if (mounted || disposed) return;
      mounted = true;
      update({ automaticSync: ports.readAutomaticSync(), connection: ports.readConnection() });
      cleanups.push(
        ports.observePreferences(() => update({ automaticSync: ports.readAutomaticSync() })),
      );
      if (ports.mode() === 'dropbox-account') {
        cleanups.push(ports.observeAccountSync(receiveAccountStatus));
      } else if (state.connection) {
        const version = generation;
        const accountId = state.connection.accountId;
        void ports
          .hasKey(accountId)
          .then((remembered) => {
            if (current(version) && state.connection?.accountId === accountId)
              update({ remembered });
          })
          .catch(() => {
            if (current(version))
              update({
                connectionMessage: 'Saved sync keys could not be read. Local data was preserved.',
              });
          });
      }
    },
    setPhrase(syncPhrase: string) {
      update({ syncPhrase });
    },
    chooseLegacy(key: string, choice: SyncChoice) {
      update({ choices: { ...state.choices, [key]: choice } });
    },
    setAutomaticSync(enabled: boolean): boolean {
      if (disposed) return state.automaticSync;
      update({ preferenceMessage: '', preferenceError: '' });
      try {
        ports.saveAutomaticSync(enabled);
        update({
          automaticSync: enabled,
          preferenceMessage: enabled
            ? 'Automatic sync is on for this device.'
            : 'Automatic sync is off. Use “Sync now” when you want to sync.',
        });
      } catch {
        update({
          automaticSync: ports.readAutomaticSync(),
          preferenceError: 'The sync preference could not be saved. Please retry.',
        });
      }
      return state.automaticSync;
    },
    async connect() {
      if (disposed || state.connecting || disconnecting) return;
      if (!ports.authorizationConfigured()) {
        update({ connectionMessage: 'Dropbox authorization is not configured in this build.' });
        return;
      }
      const version = generation;
      update({ connecting: true, connectionMessage: '' });
      try {
        const authorization = await ports.prepareAuthorization();
        if (current(version)) ports.openAuthorization(authorization);
      } catch (cause) {
        if (current(version))
          update({
            connecting: false,
            connectionMessage:
              cause instanceof Error
                ? cause.message
                : 'Dropbox authorization could not start. Please retry.',
          });
      }
    },
    async disconnect() {
      if (disposed || disconnecting || state.syncing) return;
      disconnecting = true;
      const version = ++generation;
      const connection = state.connection;
      const accountOnly = ports.mode() === 'dropbox-account';
      let warning = '';
      try {
        try {
          if (connection && !accountOnly) await ports.forgetKey(connection.accountId);
        } catch {
          warning = ' Saved sync keys could not be removed safely; local data was preserved.';
        }
        if (!current(version)) return;
        ports.clearConnection();
        if (accountOnly) ports.resetAccountSync();
        ports.connectionChanged();
        update({
          connection: undefined,
          connecting: false,
          remembered: false,
          ...clearReviews(),
          connectionMessage:
            'Dropbox was disconnected. Local data stays on this device and remains tied to the original Dropbox account. Use a separate browser profile for another person.' +
            warning,
        });
      } catch (cause) {
        if (current(version))
          update({
            connectionMessage:
              cause instanceof Error
                ? cause.message
                : 'Dropbox could not be disconnected. Local data was preserved.',
          });
      } finally {
        disconnecting = false;
      }
    },
    async synchronize(actions: SyncSettingsActions = {}) {
      if (disposed || disconnecting || !state.connection || state.syncing || manualSync) return;
      const version = generation;
      const mode = ports.mode();
      const connection = state.connection;
      const phrase = state.syncPhrase || undefined;
      const choices = { ...state.choices };
      const expectedConflictToken = state.conflictToken;
      const reviewed = {
        ...actions,
        ...(actions.choices ? { choices: { ...actions.choices } } : {}),
        ...(actions.recovery
          ? { recovery: { ...actions.recovery, choices: { ...actions.recovery.choices } } }
          : {}),
        ...(actions.upgrade ? { upgrade: { ...actions.upgrade } } : {}),
      };
      manualSync = true;
      update({ syncing: true, connectionMessage: '' });
      try {
        if (mode === 'dropbox-account') {
          await ports.syncAccount({
            choices: reviewed.choices,
            reviewedToken: reviewed.reviewedToken,
            recovery: reviewed.recovery,
          });
        } else if (mode === 'workspace-phrase') {
          const result = await ports.syncWorkspace({ connection, phrase, ...reviewed });
          if (current(version)) receiveWorkspaceResult(result);
        } else {
          const result = await ports.syncLegacy({
            connection,
            phrase,
            choices,
            expectedConflictToken,
          });
          if (!current(version)) return;
          if (result.type === 'conflicts') {
            update({
              conflicts: result.conflicts,
              conflictToken: result.token,
              connectionMessage: 'Changes on both devices need a choice before syncing.',
            });
          } else {
            update({
              ...clearLegacyReview(),
              syncPhrase: '',
              remembered: true,
              connectionMessage: `Synced ${result.entities} library items and ${result.sessions} Mira sessions.`,
            });
          }
        }
      } catch (cause) {
        if (!current(version)) return;
        const connectionMessage = cause instanceof Error ? cause.message : 'Sync could not finish.';
        update({
          connectionMessage,
          ...(mode === 'dropbox-account' ? { connection: ports.readConnection() } : {}),
          ...(connectionMessage.includes('changed after you reviewed') ? clearLegacyReview() : {}),
        });
      } finally {
        manualSync = false;
        if (current(version)) update({ syncing: false });
      }
    },
    resolve(choices: Record<string, WorkspaceSyncChoice>, reviewedToken: string) {
      return controller.synchronize({ choices, reviewedToken });
    },
    recover(choices: Record<string, WorkspaceSyncChoice>, token: string) {
      return controller.synchronize({ recovery: { choices, token, confirmed: true } });
    },
    upgrade(token: string) {
      return controller.synchronize({ upgrade: { token, confirmed: true } });
    },
    cancelReview() {
      update({
        workspaceReview: undefined,
        connectionMessage: 'Review closed. No choices were applied; recovery data was kept.',
      });
    },
    cancelUpgrade() {
      update({
        workspaceUpgrade: undefined,
        connectionMessage: 'Upgrade review closed. No further changes were made.',
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation++;
      for (const cleanup of cleanups.splice(0)) cleanup();
      // An already-started sync finishes through its existing safe coordinator;
      // unmount only releases subscriptions and suppresses stale UI callbacks.
    },
  };
  return controller;
}
