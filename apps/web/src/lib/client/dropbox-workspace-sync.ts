import type { LocalWorkspace } from '@patternverse/workspace';
import {
  hashCorpusContent,
  type CorpusFile,
  type SyncConflictResolutions,
} from '@patternverse/sync-domain';
import {
  synchronizeWorkspace,
  syncConflictReviewToken,
  type RemoteCorpusError,
} from '@patternverse/remote-store';
import type { PrivateMiraStore } from '$lib/mira/private-store';
import type { DropboxConnection } from './dropbox-auth';
import { claimDropboxWorkspace } from './dropbox-account';
import { loadKey, saveKey, loadBase } from './dropbox-sync';
import {
  createDropboxWorkspaceStore,
  readDropboxWorkspaceDocument,
  createDropboxArchiveClient,
  type DropboxSyncProtection,
} from './dropbox-workspace-store';
import { getDropboxDeviceStateKey } from './dropbox-device-key';
import { deriveSyncKey, randomSyncBytes, syncBase64 } from './sync-envelope';
import { createEncryptedSyncStateStore } from './sync-state';
import { createRecoverableWorkspaceCorpusStore } from './sync-local-store';
import { browserSyncExclusive, workspaceSyncAttemptLock, type SyncExclusive } from './sync-lock';
import { readAutomaticSync } from './sync-preferences';
import { openWorkspaceSyncSnapshot, captureWorkspaceSyncSnapshot } from './sync-snapshot';
import { syncSnapshotToCorpus } from './sync-corpus';
import { createSyncRecoveryReview } from './sync-recovery-review';
import {
  readDropboxUpgradeSource,
  upgradeDropboxArchive,
  DropboxUpgradeError,
} from './dropbox-upgrade';

export type WorkspaceSyncReviewItem = Readonly<{
  path: string;
  title: string;
  kind: string;
  local: string;
  remote: string;
  protectedReason?: string;
}>;
export type WorkspaceSyncChoice = 'local' | 'remote';
export type WorkspaceDropboxSyncResult =
  | {
      type: 'upgrade';
      token: string;
      items: number;
      sessions: number;
      resumed: boolean;
      stale: boolean;
    }
  | { type: 'upgraded'; message: string }
  | { type: 'complete'; records: number; recovered: boolean }
  | { type: 'cancelled'; message: string }
  | { type: 'review'; items: readonly WorkspaceSyncReviewItem[]; token: string; stale: boolean }
  | {
      type: 'blocked';
      message: string;
      items: readonly WorkspaceSyncReviewItem[];
      recoveryAvailable: boolean;
      token?: string;
      stale?: boolean;
    }
  | {
      type: 'error';
      message: string;
      recoveryAvailable: boolean;
      retryAfterMs?: number;
      retryable?: boolean;
    };

const kinds: Record<string, string> = {
  entities: 'Library item',
  saved: 'Saved item',
  usefulness: 'Rating',
  'practice-runs': 'Practice responses',
  situations: 'Situation',
  sessions: 'Mira conversation',
  workspace: 'Workspace',
};
function reviewItem(
  path: string,
  local?: CorpusFile,
  remote?: CorpusFile,
): WorkspaceSyncReviewItem {
  const decode = (file?: CorpusFile): Record<string, unknown> | undefined =>
    file
      ? (JSON.parse(new TextDecoder().decode(file.content)) as Record<string, unknown>)
      : undefined;
  const here = decode(local),
    there = decode(remote);
  const row = here ?? there;
  const ref = row?.ref as { entityId?: string } | undefined;
  return {
    path,
    title: String(row?.title ?? row?.patternTitle ?? row?.name ?? ref?.entityId ?? row?.id ?? path),
    kind: kinds[path.split('/')[0] ?? ''] ?? 'Workspace record',
    local: here ? JSON.stringify(here, null, 2) : 'Deleted / not present',
    remote: there ? JSON.stringify(there, null, 2) : 'Deleted / not present',
  };
}
function remoteMessage(error: RemoteCorpusError): string {
  switch (error.type) {
    case 'not-authenticated':
    case 'authorization-expired':
      return 'Reconnect Dropbox, then retry sync.';
    case 'permission-denied':
      return 'Dropbox denied access. Check the app folder permissions before retrying.';
    case 'revision-conflict':
      return 'Dropbox changed during sync. Retry to review the latest versions.';
    case 'rate-limited':
      return 'Dropbox is temporarily limiting requests. Wait before retrying.';
    case 'quota-exceeded':
      return 'Your Dropbox is full. Free some space before retrying.';
    case 'network-error':
    case 'temporarily-unavailable':
      return 'Dropbox could not be reached. Retry when the connection is available.';
    case 'invalid-remote-corpus':
      return error.details;
    default:
      return 'Dropbox sync could not finish. Your recovery data was kept; retry later.';
  }
}

function retryable(error: RemoteCorpusError): boolean {
  return ['network-error', 'temporarily-unavailable', 'rate-limited', 'revision-conflict'].includes(
    error.type,
  );
}

/** Opt-in workspace entry point. Uses the existing planner, journal and recoverable
 * database adapter for both phrase-encrypted and sign-in-only archives.
 */
export async function syncWorkspaceWithDropbox(input: {
  connection: DropboxConnection;
  workspace: LocalWorkspace;
  mira: PrivateMiraStore;
  phrase?: string;
  protection?: DropboxSyncProtection;
  choices?: Readonly<Record<string, WorkspaceSyncChoice>>;
  reviewedToken?: string;
  recovery?: {
    token: string;
    choices: Readonly<Record<string, WorkspaceSyncChoice>>;
    confirmed: boolean;
  };
  upgrade?: { token: string; confirmed: boolean };
  fetcher?: typeof fetch;
  exclusive?: SyncExclusive;
  /** Rechecked under the attempt lock; backup restore can disable a queued upload. */
  automatic?: boolean;
  /** Isolated test checkpoint database; production uses the existing encrypted store. */
  stateDatabaseName?: string;
}): Promise<WorkspaceDropboxSyncResult> {
  const identity = await input.workspace.getWorkspace();
  const exclusive = input.exclusive ?? browserSyncExclusive;
  // Different from the local-apply lock: hold this across read/plan/apply/verification.
  return exclusive(workspaceSyncAttemptLock(identity.id), async () => {
    if (input.automatic && !readAutomaticSync())
      return {
        type: 'cancelled',
        message:
          'Automatic sync is off. Review your workspace, then choose Sync now or enable automatic sync.',
      };
    await claimDropboxWorkspace(input.connection.accountId);
    if (input.recovery && input.choices)
      throw new Error('Review recovery and Dropbox conflicts separately.');
    if (input.choices && !input.reviewedToken)
      throw new Error('Review the current versions before choosing which to keep.');
    const resolutions: Record<string, SyncConflictResolutions[string]> = {};
    for (const [path, choice] of Object.entries(input.choices ?? {})) {
      if (choice !== 'local' && choice !== 'remote')
        throw new Error('Choose a valid version for each conflict.');
      resolutions[path] = { type: choice === 'local' ? 'keep-local' : 'keep-remote' };
    }
    const accountOnly = input.protection === 'dropbox-account';
    if (accountOnly && (input.phrase || input.upgrade))
      throw new Error('Sign-in-only sync does not use a phrase or upgrade encrypted archives.');
    const options = {
      getCredentials: () => input.connection,
      fetcher: input.fetcher,
      protection: input.protection,
    };
    const document = await readDropboxWorkspaceDocument({ ...options, allowLegacy: true });
    if (!document.ok)
      return {
        type: 'error',
        message: remoteMessage(document.error),
        retryable: retryable(document.error),
        recoveryAvailable: false,
        ...(document.error.type === 'rate-limited'
          ? { retryAfterMs: document.error.retryAfterMs }
          : {}),
      };
    const archives = createDropboxArchiveClient(options);
    let legacySource;
    try {
      legacySource = document.value.legacyPresent
        ? await readDropboxUpgradeSource(archives)
        : undefined;
    } catch (error) {
      if (error instanceof DropboxUpgradeError)
        return {
          type: 'error',
          message: remoteMessage(error.remoteError),
          recoveryAvailable: true,
        };
      throw error;
    }
    if (input.upgrade && !legacySource)
      return {
        type: 'error',
        message:
          'The archive was already upgraded or changed. Sync again to inspect its current contents.',
        recoveryAvailable: true,
      };
    const deviceKey = accountOnly
      ? await getDropboxDeviceStateKey(input.connection.accountId)
      : undefined;
    const saved = accountOnly ? undefined : await loadKey(input.connection.accountId);
    const salt =
      deviceKey?.salt ??
      legacySource?.envelope.salt ??
      document.value.envelope?.salt ??
      saved?.salt ??
      syncBase64(randomSyncBytes(16));
    const key =
      deviceKey?.key ??
      (input.phrase
        ? await deriveSyncKey(input.phrase, salt)
        : saved?.salt === salt
          ? saved.key
          : undefined);
    if (!key) throw new Error('Enter your sync phrase to link this device.');
    // Validate the phrase before remembering it or opening local recovery checkpoints.
    if (document.value.envelope) await openWorkspaceSyncSnapshot(document.value.envelope, key);
    const legacy = legacySource
      ? await openWorkspaceSyncSnapshot(legacySource.envelope, key)
      : undefined;
    if (legacy && legacy.version !== 1)
      throw new Error('The legacy archive has an invalid version.');
    // A changed remote key must not replace the remembered key before the existing
    // v1 deletion history has also been successfully unlocked.
    const legacyAncestor = legacy ? await loadBase(input.connection.accountId, key) : undefined;
    const stateStore = createEncryptedSyncStateStore({
      scope: {
        providerId: 'dropbox',
        accountId: input.connection.accountId,
        workspaceId: identity.id,
      },
      key,
      salt,
      databaseName:
        input.stateDatabaseName ??
        (accountOnly ? 'patternverse-dropbox-account-recovery-v1' : undefined),
    });
    await Promise.all([stateStore.readBase(), stateStore.readJournal(), stateStore.readApply()]);
    if (!accountOnly && (input.phrase || !saved))
      await saveKey(input.connection.accountId, salt, key);
    if (legacySource && legacy?.version === 1) {
      if (input.recovery || input.choices)
        throw new Error('Review the archive upgrade separately from sync choices.');
      if ((await stateStore.readApply()) || (await stateStore.readJournal()))
        return {
          type: 'error',
          message:
            'An interrupted workspace sync exists. Inspect its recovery data before upgrading an older archive.',
          recoveryAvailable: true,
        };
      const ancestor = await syncSnapshotToCorpus(
        legacyAncestor ?? {
          version: 1,
          entities: [],
          sessions: [],
        },
      );
      const currentBase = await stateStore.readBase();
      if (
        currentBase.files.some(
          (file) => !file.path.startsWith('entities/') && !file.path.startsWith('sessions/'),
        )
      )
        return {
          type: 'error',
          message:
            'This device already has newer workspace sync history. Inspect and back up both archives before upgrading an older one.',
          recoveryAvailable: true,
        };
      const local = await syncSnapshotToCorpus(
        await captureWorkspaceSyncSnapshot(input.workspace, input.mira),
      );
      const remote = await syncSnapshotToCorpus(legacy, legacySource.revision);
      const contentToken = await syncConflictReviewToken({ base: ancestor, local, remote });
      const token = await hashCorpusContent(
        new TextEncoder().encode(
          JSON.stringify([
            contentToken,
            legacySource.checksum,
            legacySource.marker,
            await syncConflictReviewToken({ base: currentBase, local, remote }),
          ]),
        ),
      );
      if (!input.upgrade || input.upgrade.token !== token)
        return {
          type: 'upgrade',
          token,
          items: legacy.entities.length,
          sessions: legacy.sessions.length,
          resumed: legacySource.marker !== null,
          stale: input.upgrade !== undefined,
        };
      if (!input.upgrade.confirmed)
        throw new Error('Confirm that other devices will use the updated sync before upgrading.');
      // Preserve the actual v1 common ancestor, not the remote or local snapshot.
      // Initialize before remote writes so a restart cannot forget deletion history.
      // A failed pre-parking upgrade can be followed by another successful v1
      // sync. Prefer that real, newer v1 ancestor on the next confirmation.
      if (currentBase.files.length === 0 || legacyAncestor) await stateStore.writeBase(ancestor);
      try {
        await upgradeDropboxArchive({
          client: archives,
          source: legacySource,
          legacy,
          key,
          identity,
        });
      } catch (error) {
        if (error instanceof DropboxUpgradeError)
          return {
            type: 'error',
            message: remoteMessage(error.remoteError),
            recoveryAvailable: true,
          };
        throw error;
      }
      return {
        type: 'upgraded',
        message:
          'Archive upgraded. The encrypted original backup was kept. Sync now to review and merge your workspace; no local content was replaced.',
      };
    }
    const localStore = createRecoverableWorkspaceCorpusStore({
      workspace: input.workspace,
      mira: input.mira,
      stateStore,
      exclusive,
    });
    const recovery = createSyncRecoveryReview({
      workspace: input.workspace,
      mira: input.mira,
      stateStore,
      exclusive,
    });
    const blocked = async (
      message: string,
      recoveryAvailable: boolean,
      stale = false,
    ): Promise<WorkspaceDropboxSyncResult> => {
      const review = await recovery.inspect();
      return {
        type: 'blocked',
        message,
        recoveryAvailable: recoveryAvailable || review !== null,
        stale,
        token: review?.token,
        items:
          review?.records.map((row) => ({
            ...reviewItem(row.path, row.local, row.remote),
            protectedReason: row.protectedReason,
          })) ?? [],
      };
    };
    if (input.recovery) {
      const resolved = await recovery.resolve(input.recovery);
      if (resolved.type === 'stale')
        return blocked(
          'The pending update or local work changed. Review the latest versions.',
          true,
          true,
        );
    }
    const result = await synchronizeWorkspace({
      connection: { providerId: 'dropbox', connectionId: input.connection.accountId },
      localStore,
      stateStore,
      remoteStore: createDropboxWorkspaceStore({ ...options, key, salt, identity }),
      conflictResolutions: input.choices ? resolutions : undefined,
      reviewedConflictToken: input.reviewedToken,
    });
    switch (result.type) {
      case 'synchronized':
        return { type: 'complete', records: result.base.files.length, recovered: result.recovered };
      case 'conflict':
      case 'review-outdated':
        return {
          type: 'review',
          token: result.reviewToken,
          stale: result.type === 'review-outdated',
          items: result.plan.conflicts.map((conflict) =>
            reviewItem(
              conflict.path,
              'local' in conflict ? conflict.local : undefined,
              'remote' in conflict ? conflict.remote : undefined,
            ),
          ),
        };
      case 'remote-error':
        return {
          type: 'error',
          message: remoteMessage(result.error),
          retryable: retryable(result.error),
          recoveryAvailable: result.recoveryAvailable,
          ...(result.error.type === 'rate-limited'
            ? { retryAfterMs: result.error.retryAfterMs }
            : {}),
        };
      case 'local-error': {
        return blocked(
          result.error.type === 'local-changed'
            ? result.error.details
            : 'Local storage could not finish the update. Your recovery data was kept.',
          result.recoveryAvailable,
        );
      }
    }
  });
}
