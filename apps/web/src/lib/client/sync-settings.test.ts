import { describe, expect, it, vi } from 'vitest';
import {
  createSyncSettings,
  initialSyncSettings,
  type AccountSyncStatus,
  type SyncSettingsMode,
  type SyncSettingsPorts,
  type SyncSettingsState,
} from './sync-settings';
import type { WorkspaceDropboxSyncResult } from './dropbox-workspace-sync';

const connection = {
  accountId: 'synthetic-account',
  accessToken: 'synthetic-token',
  expiresAt: '2099-01-01T00:00:00Z',
};
const authorization = {
  flow: { codeVerifier: 'verifier', redirectUri: 'https://example.test/callback', state: 'state' },
  url: 'https://example.test/authorize',
};
const review: WorkspaceDropboxSyncResult = {
  type: 'review',
  items: [],
  token: 'review-token',
  stale: false,
};
const upgrade: WorkspaceDropboxSyncResult = {
  type: 'upgrade',
  token: 'upgrade-token',
  items: 2,
  sessions: 1,
  resumed: false,
  stale: false,
};
const complete: WorkspaceDropboxSyncResult = { type: 'complete', records: 2, recovered: false };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function fixture(mode: SyncSettingsMode = 'workspace-phrase') {
  let state: SyncSettingsState = initialSyncSettings();
  let preferenceChanged = () => {};
  let accountChanged: (status: AccountSyncStatus) => void = () => {};
  const preferenceCleanup = vi.fn();
  const accountCleanup = vi.fn();
  const changed = vi.fn((next: SyncSettingsState) => {
    state = next;
  });
  const ports = {
    mode: vi.fn(() => mode),
    authorizationConfigured: vi.fn(() => true),
    prepareAuthorization: vi.fn(async () => authorization),
    openAuthorization: vi.fn(),
    readConnection: vi.fn(() => connection as SyncSettingsState['connection']),
    clearConnection: vi.fn(() => {
      ports.readConnection.mockReturnValue(undefined);
    }),
    connectionChanged: vi.fn(),
    hasKey: vi.fn(async () => false),
    forgetKey: vi.fn(async () => {}),
    readAutomaticSync: vi.fn(() => true),
    saveAutomaticSync: vi.fn(),
    observePreferences: vi.fn((listener: () => void) => {
      preferenceChanged = listener;
      return preferenceCleanup;
    }),
    observeAccountSync: vi.fn((listener: (status: AccountSyncStatus) => void) => {
      accountChanged = listener;
      return accountCleanup;
    }),
    resetAccountSync: vi.fn(),
    syncAccount: vi.fn(async (actions: Parameters<SyncSettingsPorts['syncAccount']>[0]) => {
      void actions;
      return undefined as unknown;
    }),
    syncWorkspace: vi.fn(async (input: Parameters<SyncSettingsPorts['syncWorkspace']>[0]) => {
      void input;
      return complete;
    }),
    syncLegacy: vi.fn(async (input: Parameters<SyncSettingsPorts['syncLegacy']>[0]) => {
      void input;
      return { type: 'complete' as const, entities: 2, sessions: 1 } as Awaited<
        ReturnType<SyncSettingsPorts['syncLegacy']>
      >;
    }),
  } satisfies SyncSettingsPorts;
  const controller = createSyncSettings(ports, changed);
  return {
    controller,
    ports,
    changed,
    preferenceCleanup,
    accountCleanup,
    get state() {
      return state;
    },
    preferences: () => preferenceChanged(),
    account: (status: AccountSyncStatus) => accountChanged(status),
  };
}

describe('sync settings controller', () => {
  it('does no browser, storage, subscription or provider work during construction', () => {
    const f = fixture();
    expect(f.state).toEqual(initialSyncSettings());
    for (const port of Object.values(f.ports)) expect(port).not.toHaveBeenCalled();
    expect(f.changed).not.toHaveBeenCalled();
  });

  it.each(['legacy-phrase', 'workspace-phrase', 'dropbox-account'] as const)(
    'mounts %s once without starting a sync',
    async (mode) => {
      const f = fixture(mode);
      f.controller.mount();
      f.controller.mount();
      await Promise.resolve();
      expect(f.state.connection).toEqual(connection);
      expect(f.state.automaticSync).toBe(true);
      expect(f.ports.observePreferences).toHaveBeenCalledOnce();
      expect(f.ports.observeAccountSync).toHaveBeenCalledTimes(mode === 'dropbox-account' ? 1 : 0);
      expect(f.ports.hasKey).toHaveBeenCalledTimes(mode === 'dropbox-account' ? 0 : 1);
      expect(f.ports.syncAccount).not.toHaveBeenCalled();
      expect(f.ports.syncWorkspace).not.toHaveBeenCalled();
      expect(f.ports.syncLegacy).not.toHaveBeenCalled();
    },
  );

  it('updates the device-only preference while disconnected and reads external changes', () => {
    const f = fixture('dropbox-account');
    f.ports.readConnection.mockReturnValue(undefined);
    f.controller.mount();
    expect(f.controller.setAutomaticSync(false)).toBe(false);
    expect(f.ports.saveAutomaticSync).toHaveBeenCalledWith(false);
    expect(f.state.preferenceMessage).toContain('Automatic sync is off');
    f.ports.readAutomaticSync.mockReturnValue(false);
    f.preferences();
    expect(f.state.automaticSync).toBe(false);
    f.ports.readAutomaticSync.mockReturnValue(true);
    f.preferences();
    expect(f.state.automaticSync).toBe(true);
    expect(f.ports.syncAccount).not.toHaveBeenCalled();
  });

  it('restores the actual preference on storage failure without claiming it was saved', () => {
    const f = fixture();
    f.controller.mount();
    f.ports.saveAutomaticSync.mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    f.ports.readAutomaticSync.mockReturnValue(false);
    expect(f.controller.setAutomaticSync(true)).toBe(false);
    expect(f.state.preferenceMessage).toBe('');
    expect(f.state.preferenceError).toContain('could not be saved');
  });

  it('rejects unconfigured authorization without preparing a flow', async () => {
    const f = fixture();
    f.ports.authorizationConfigured.mockReturnValue(false);
    await f.controller.connect();
    expect(f.state.connectionMessage).toContain('not configured');
    expect(f.state.connecting).toBe(false);
    expect(f.ports.prepareAuthorization).not.toHaveBeenCalled();
  });

  it('opens one prepared authorization flow and ignores repeated clicks', async () => {
    const f = fixture();
    const pending = deferred<typeof authorization>();
    f.ports.prepareAuthorization.mockReturnValue(pending.promise);
    const connecting = f.controller.connect();
    await f.controller.connect();
    expect(f.state.connecting).toBe(true);
    pending.resolve(authorization);
    await connecting;
    expect(f.ports.prepareAuthorization).toHaveBeenCalledOnce();
    expect(f.ports.openAuthorization).toHaveBeenCalledExactlyOnceWith(authorization);
    expect(f.ports.syncWorkspace).not.toHaveBeenCalled();
  });

  it.each(['prepare', 'open'] as const)(
    'makes failed %s authorization retryable',
    async (phase) => {
      const f = fixture();
      if (phase === 'prepare')
        f.ports.prepareAuthorization.mockRejectedValueOnce(new Error('Try again'));
      else
        f.ports.openAuthorization.mockImplementationOnce(() => {
          throw new Error('Try again');
        });
      await f.controller.connect();
      expect(f.state.connecting).toBe(false);
      expect(f.state.connectionMessage).toBe('Try again');
      await f.controller.connect();
      expect(f.ports.prepareAuthorization).toHaveBeenCalledTimes(2);
    },
  );

  it('never navigates or publishes a delayed authorization after unmount', async () => {
    const f = fixture();
    const pending = deferred<typeof authorization>();
    f.ports.prepareAuthorization.mockReturnValue(pending.promise);
    const attempt = f.controller.connect();
    f.controller.dispose();
    const calls = f.changed.mock.calls.length;
    pending.resolve(authorization);
    await attempt;
    expect(f.ports.openAuthorization).not.toHaveBeenCalled();
    expect(f.changed).toHaveBeenCalledTimes(calls);
  });

  it.each(['legacy-phrase', 'workspace-phrase', 'dropbox-account'] as const)(
    'uses only the existing %s service',
    async (mode) => {
      const f = fixture(mode);
      f.controller.mount();
      f.controller.setPhrase('private phrase');
      await f.controller.synchronize();
      expect(f.ports.syncLegacy).toHaveBeenCalledTimes(mode === 'legacy-phrase' ? 1 : 0);
      expect(f.ports.syncWorkspace).toHaveBeenCalledTimes(mode === 'workspace-phrase' ? 1 : 0);
      expect(f.ports.syncAccount).toHaveBeenCalledTimes(mode === 'dropbox-account' ? 1 : 0);
      if (mode === 'dropbox-account')
        expect(f.ports.syncAccount).toHaveBeenCalledWith({
          choices: undefined,
          reviewedToken: undefined,
          recovery: undefined,
        });
      else
        expect(
          (mode === 'legacy-phrase' ? f.ports.syncLegacy : f.ports.syncWorkspace).mock.calls[0]![0],
        ).toMatchObject({ connection, phrase: 'private phrase' });
      expect(f.state.syncing).toBe(false);
    },
  );

  it('does not start disconnected, repeated or automatic-busy attempts', async () => {
    const f = fixture('dropbox-account');
    await f.controller.synchronize();
    expect(f.ports.syncAccount).not.toHaveBeenCalled();
    f.controller.mount();
    f.account({ busy: true, message: '' });
    await f.controller.synchronize();
    expect(f.ports.syncAccount).not.toHaveBeenCalled();
    f.account({ busy: false, message: '' });
    const pending = deferred<unknown>();
    f.ports.syncAccount.mockReturnValue(pending.promise);
    const attempt = f.controller.synchronize();
    f.account({ busy: false, message: '' }); // A store emission must not unlock a manual attempt.
    await f.controller.synchronize();
    await f.controller.disconnect();
    expect(f.ports.syncAccount).toHaveBeenCalledOnce();
    expect(f.ports.clearConnection).not.toHaveBeenCalled();
    pending.resolve(undefined);
    await attempt;
  });

  it.each([
    complete,
    { ...complete, recovered: true },
    review,
    {
      type: 'blocked',
      message: 'Recovery needed',
      items: [],
      recoveryAvailable: true,
      token: 'recovery-token',
    },
    upgrade,
    { type: 'upgraded', message: 'Archive upgraded' },
    { type: 'cancelled', message: 'Not applied' },
    { type: 'error', message: 'Retry later', recoveryAvailable: true },
  ] satisfies WorkspaceDropboxSyncResult[])(
    'projects workspace result $type without interpreting merge semantics',
    async (result) => {
      const f = fixture();
      f.controller.mount();
      f.controller.setPhrase('private phrase');
      f.ports.syncWorkspace.mockResolvedValue(result);
      await f.controller.synchronize();
      expect(f.state.syncing).toBe(false);
      expect(f.state.workspaceReview).toEqual(
        result.type === 'review' || result.type === 'blocked' ? result : undefined,
      );
      expect(f.state.workspaceUpgrade).toEqual(result.type === 'upgrade' ? result : undefined);
      if (result.type === 'complete') {
        expect(f.state.connectionMessage).toBe(
          `Synced 2 private workspace records${result.recovered ? ' and recovered the interrupted update' : ''}.`,
        );
        expect(f.state.syncPhrase).toBe('');
        expect(f.state.remembered).toBe(true);
      } else if (result.type === 'upgraded') {
        expect(f.state.syncPhrase).toBe('');
        expect(f.state.remembered).toBe(true);
        expect(f.state.connectionMessage).toBe(result.message);
      } else expect(f.state.syncPhrase).toBe('private phrase');
    },
  );

  it.each(['workspace-phrase', 'dropbox-account'] as const)(
    'passes explicit conflict/recovery choices and review tokens in %s mode',
    async (mode) => {
      const f = fixture(mode);
      f.controller.mount();
      await f.controller.resolve({ 'entities/one': 'remote' }, 'review-token');
      await f.controller.recover({ 'entities/two': 'local' }, 'recovery-token');
      const calls = (mode === 'dropbox-account' ? f.ports.syncAccount : f.ports.syncWorkspace).mock
        .calls;
      expect(calls[0]![0]).toMatchObject({
        choices: { 'entities/one': 'remote' },
        reviewedToken: 'review-token',
      });
      expect(calls[1]![0]).toMatchObject({
        recovery: {
          choices: { 'entities/two': 'local' },
          token: 'recovery-token',
          confirmed: true,
        },
      });
      expect(calls[1]![0].choices).toBeUndefined();
    },
  );

  it('requires explicit upgrade action and cancellation only dismisses local UI', async () => {
    const f = fixture();
    f.controller.mount();
    f.ports.syncWorkspace.mockResolvedValueOnce(upgrade);
    await f.controller.synchronize();
    expect(f.ports.syncWorkspace.mock.calls[0]![0].upgrade).toBeUndefined();
    f.controller.cancelUpgrade();
    expect(f.state.workspaceUpgrade).toBeUndefined();
    expect(f.ports.syncWorkspace).toHaveBeenCalledOnce();
    await f.controller.upgrade('upgrade-token');
    expect(f.ports.syncWorkspace.mock.calls[1]![0].upgrade).toEqual({
      token: 'upgrade-token',
      confirmed: true,
    });
    f.ports.syncWorkspace.mockResolvedValueOnce(review);
    await f.controller.synchronize();
    f.controller.cancelReview();
    expect(f.state.workspaceReview).toBeUndefined();
    expect(f.state.connectionMessage).toContain('recovery data was kept');
    expect(f.ports.syncWorkspace).toHaveBeenCalledTimes(3);
  });

  it('snapshots phrase, choices and recovery arguments before asynchronous work', async () => {
    const f = fixture();
    f.controller.mount();
    f.controller.setPhrase('original phrase');
    const pending = deferred<WorkspaceDropboxSyncResult>();
    f.ports.syncWorkspace.mockReturnValue(pending.promise);
    const choices = { one: 'local' as const };
    const recovery = { token: 'original-token', choices, confirmed: true };
    const attempt = f.controller.synchronize({ recovery });
    recovery.token = 'changed-token';
    delete (choices as Partial<typeof choices>).one;
    f.controller.setPhrase('different phrase');
    expect(f.ports.syncWorkspace.mock.calls[0]![0]).toMatchObject({
      phrase: 'original phrase',
      recovery: { token: 'original-token', choices: { one: 'local' } },
    });
    pending.resolve(complete);
    await attempt;
  });

  it('keeps legacy review tokens with choices and discards them when the review becomes stale', async () => {
    const f = fixture('legacy-phrase');
    f.controller.mount();
    f.ports.syncLegacy.mockResolvedValueOnce({
      type: 'conflicts',
      conflicts: [{ key: 'entities:one', title: 'One' }],
      token: 'legacy-token',
    });
    await f.controller.synchronize();
    f.controller.chooseLegacy('entities:one', 'remote');
    f.ports.syncLegacy.mockRejectedValueOnce(
      new Error('Data changed after you reviewed the conflicts.'),
    );
    await f.controller.synchronize();
    expect(f.ports.syncLegacy.mock.calls[1]![0]).toMatchObject({
      choices: { 'entities:one': 'remote' },
      expectedConflictToken: 'legacy-token',
    });
    expect(f.state.conflicts).toEqual([]);
    expect(f.state.choices).toEqual({});
    expect(f.state.conflictToken).toBeUndefined();
    await f.controller.synchronize();
    expect(f.state.remembered).toBe(true);
    expect(f.state.connectionMessage).toBe('Synced 2 library items and 1 Mira sessions.');
  });

  it('releases the busy guard on unknown failures so the user can retry', async () => {
    const f = fixture();
    f.controller.mount();
    f.ports.syncWorkspace.mockRejectedValueOnce('failure');
    await f.controller.synchronize();
    expect(f.state.connectionMessage).toBe('Sync could not finish.');
    expect(f.state.syncing).toBe(false);
    await f.controller.synchronize();
    expect(f.ports.syncWorkspace).toHaveBeenCalledTimes(2);
  });

  it('uses the shared account status, including expiration and last-sync time', async () => {
    const f = fixture('dropbox-account');
    f.controller.mount();
    f.account({
      busy: false,
      result: review,
      message: 'Review changes',
      lastSyncedAt: '2026-10-11T10:00:00Z',
    });
    expect(f.state.workspaceReview).toEqual(review);
    expect(f.state.lastSyncedAt).toBe('2026-10-11T10:00:00Z');
    f.ports.readConnection.mockReturnValue(undefined);
    f.account({
      busy: false,
      result: { type: 'error', message: 'Reconnect Dropbox', recoveryAvailable: false },
      message: 'Reconnect Dropbox',
    });
    expect(f.state.connection).toBeUndefined();
    expect(f.state.workspaceReview).toBeUndefined();
    expect(f.state.connectionMessage).toBe('Reconnect Dropbox');
  });

  it('refreshes expired account connection on failed manual sync', async () => {
    const f = fixture('dropbox-account');
    f.controller.mount();
    f.ports.readConnection.mockReturnValue(undefined);
    f.ports.syncAccount.mockRejectedValueOnce(new Error('Reconnect Dropbox'));
    await f.controller.synchronize();
    expect(f.state.connection).toBeUndefined();
    expect(f.state.connectionMessage).toBe('Reconnect Dropbox');
  });

  it('disconnects sign-in-only without forgetting the recovery key or syncing', async () => {
    const f = fixture('dropbox-account');
    f.controller.mount();
    f.account({ busy: false, result: review, message: 'Review changes' });
    await f.controller.disconnect();
    expect(f.ports.forgetKey).not.toHaveBeenCalled();
    expect(f.ports.resetAccountSync).toHaveBeenCalledOnce();
    expect(f.ports.connectionChanged).toHaveBeenCalledOnce();
    expect(f.state.connection).toBeUndefined();
    expect(f.state.workspaceReview).toBeUndefined();
    expect(f.state.choices).toEqual({});
    const message = f.state.connectionMessage;
    f.account({ busy: false, result: review, message: 'Late review' });
    expect(f.state.connectionMessage).toBe(message);
    expect(f.state.workspaceReview).toBeUndefined();
  });

  it.each(['legacy-phrase', 'workspace-phrase'] as const)(
    'disconnects %s with the existing key cleanup, even if cleanup fails',
    async (mode) => {
      const f = fixture(mode);
      f.controller.mount();
      f.ports.forgetKey.mockRejectedValueOnce(new Error('Key unavailable'));
      await f.controller.disconnect();
      expect(f.ports.forgetKey).toHaveBeenCalledWith(connection.accountId);
      expect(f.ports.clearConnection).toHaveBeenCalledOnce();
      expect(f.ports.resetAccountSync).not.toHaveBeenCalled();
      expect(f.state.connectionMessage).toContain('Saved sync keys could not be removed safely');
    },
  );

  it('does not report disconnection when credential storage cannot be cleared', async () => {
    const f = fixture('dropbox-account');
    f.controller.mount();
    f.ports.clearConnection.mockImplementation(() => {
      throw new Error('Cannot clear storage');
    });
    await f.controller.disconnect();
    expect(f.state.connection).toEqual(connection);
    expect(f.state.connectionMessage).toBe('Cannot clear storage');
    expect(f.ports.connectionChanged).not.toHaveBeenCalled();
  });

  it('ignores a remembered-key read that finishes after disconnect', async () => {
    const f = fixture();
    const pending = deferred<boolean>();
    f.ports.hasKey.mockReturnValue(pending.promise);
    f.controller.mount();
    await f.controller.disconnect();
    pending.resolve(true);
    await Promise.resolve();
    expect(f.state.remembered).toBe(false);
  });

  it('handles remembered-key read failure without an unhandled rejection', async () => {
    const f = fixture();
    f.ports.hasKey.mockRejectedValueOnce(new Error('Key unavailable'));
    f.controller.mount();
    await vi.waitFor(() =>
      expect(f.state.connectionMessage).toContain('Saved sync keys could not be read'),
    );
  });

  it.each([false, true])(
    'lets an already-started sync settle quietly after unmount (reject=%s)',
    async (reject) => {
      const f = fixture();
      f.controller.mount();
      const pending = deferred<WorkspaceDropboxSyncResult>();
      f.ports.syncWorkspace.mockReturnValue(pending.promise);
      const attempt = f.controller.synchronize();
      f.controller.dispose();
      const calls = f.changed.mock.calls.length;
      if (reject) pending.reject(new Error('Late error'));
      else pending.resolve(review);
      await attempt;
      expect(f.changed).toHaveBeenCalledTimes(calls);
      await f.controller.connect();
      await f.controller.disconnect();
      await f.controller.synchronize();
      f.controller.setAutomaticSync(false);
      expect(f.ports.syncWorkspace).toHaveBeenCalledOnce();
      expect(f.ports.clearConnection).not.toHaveBeenCalled();
      expect(f.ports.saveAutomaticSync).not.toHaveBeenCalled();
    },
  );

  it('releases subscriptions once and never republishes account state after disposal', () => {
    const f = fixture('dropbox-account');
    f.controller.mount();
    f.controller.dispose();
    f.controller.dispose();
    expect(f.preferenceCleanup).toHaveBeenCalledOnce();
    expect(f.accountCleanup).toHaveBeenCalledOnce();
    const calls = f.changed.mock.calls.length;
    f.account({ busy: false, result: review, message: 'Late review' });
    f.preferences();
    f.controller.mount();
    expect(f.changed).toHaveBeenCalledTimes(calls);
    expect(f.ports.observeAccountSync).toHaveBeenCalledOnce();
  });
});
