import {
  conditionalRecordWrites,
  LocalSyncConflictError,
  type LocalWorkspace,
} from '@patternverse/workspace';
import {
  CorpusChangePreconditionError,
  type PersonalCorpusStore,
} from '@patternverse/remote-store';
import type { PrivateMiraStore } from '$lib/mira/private-store';
import { captureWorkspaceSyncSnapshot, parseWorkspaceSyncSnapshot } from './sync-snapshot';
import { createWorkspaceCorpusStore, syncSnapshotToCorpus } from './sync-corpus';
import type { LocalSyncApplyStateStore, PendingLocalSyncApply } from './sync-state';
import { browserSyncExclusive, type SyncExclusive } from './sync-lock';

/** Recoverable commit across two databases, not a fictitious cross-DB transaction.
 * Persist intent before writes, CAS each database, clear only after both succeed.
 * Recovery is idempotent and refuses conflicting intervening edits. Unrelated local
 * edits survive. A sync reader settles pending intent before exposing a snapshot.
 */
export function createRecoverableWorkspaceCorpusStore(options: {
  workspace: Pick<LocalWorkspace, 'getWorkspace' | 'readWorkspaceData' | 'applySyncData'>;
  mira: Pick<PrivateMiraStore, 'list' | 'applySyncSessions'>;
  stateStore: LocalSyncApplyStateStore;
  /** Tests can supply a deterministic lock; production requires cross-tab Web Locks. */
  exclusive?: SyncExclusive;
}): PersonalCorpusStore {
  const exclusive = options.exclusive ?? browserSyncExclusive;
  const locked = async <T>(work: () => Promise<T>): Promise<T> => {
    const workspace = await options.workspace.getWorkspace();
    return exclusive(`patternverse-local-sync:${workspace.id}`, async () => {
      try {
        return await work();
      } catch (error) {
        if (error instanceof LocalSyncConflictError)
          throw new CorpusChangePreconditionError(error.message);
        throw error;
      }
    });
  };
  const apply = async (pending: PendingLocalSyncApply) => {
    const expected = parseWorkspaceSyncSnapshot(pending.expected);
    const desired = parseWorkspaceSyncSnapshot(pending.desired);
    const local = await options.workspace.getWorkspace();
    for (const snapshot of [expected, desired])
      if (
        snapshot.workspace.workspace.id !== local.id ||
        snapshot.workspace.workspace.createdAt !== local.createdAt
      )
        throw new Error('Pending sync update cannot replace this device’s workspace identity.');
    await options.workspace.applySyncData(expected.workspace, desired.workspace);
    await options.mira.applySyncSessions(expected.sessions, desired.sessions);
    await options.stateStore.clearApply();
  };
  const recover = async () => {
    const pending = await options.stateStore.readApply();
    if (pending) await apply(pending);
  };
  return createWorkspaceCorpusStore({
    read: () =>
      locked(async () => {
        await recover();
        return captureWorkspaceSyncSnapshot(options.workspace, options.mira);
      }),
    commit: (expected, desired) =>
      locked(async () => {
        await recover();
        // Reject an already-stale intent before persisting it. Database CAS below still
        // guards edits racing with this preflight; a partial apply keeps its WAL.
        const current = await captureWorkspaceSyncSnapshot(options.workspace, options.mira);
        const [old, next, live] = await Promise.all(
          [expected, desired, current].map((snapshot) => syncSnapshotToCorpus(snapshot)),
        );
        const records = (snapshot: typeof old) =>
          snapshot.files.map(({ path, contentHash }) => ({ path, contentHash }));
        conditionalRecordWrites(records(old), records(next), records(live), (file) => file.path);
        await options.stateStore.writeApply({ expected, desired });
        await apply({ expected, desired });
        return captureWorkspaceSyncSnapshot(options.workspace, options.mira);
      }),
  });
}
