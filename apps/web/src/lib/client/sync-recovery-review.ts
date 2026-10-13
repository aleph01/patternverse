import type { LocalWorkspace } from '@patternverse/workspace';
import {
  changeBetween,
  planCorpusSync,
  hashCorpusContent,
  type CorpusFile,
} from '@patternverse/sync-domain';
import { applyCorpusChanges, syncConflictReviewToken } from '@patternverse/remote-store';
import type { PrivateMiraStore } from '$lib/mira/private-store';
import { captureWorkspaceSyncSnapshot } from './sync-snapshot';
import { corpusToSyncSnapshot, syncSnapshotToCorpus } from './sync-corpus';
import type { LocalSyncRecoveryStateStore } from './sync-state';
import { browserSyncExclusive, type SyncExclusive } from './sync-lock';

export type RecoveryChoice = 'local' | 'remote';
type RecoveryRecord = {
  path: string;
  local?: CorpusFile;
  remote?: CorpusFile;
  protectedReason?: string;
};
export type RecoveryReview = { token: string; records: readonly RecoveryRecord[] };

/** Review the remaining intent, not a second merge engine. Database CAS remains the
 * authority after selection. Live/cache protection is included in the review token.
 */
export function createSyncRecoveryReview(options: {
  workspace: Pick<LocalWorkspace, 'getWorkspace' | 'readWorkspaceData'>;
  mira: Pick<PrivateMiraStore, 'list' | 'loadRun'>;
  stateStore: LocalSyncRecoveryStateStore;
  exclusive?: SyncExclusive;
}) {
  const locked = async <T>(work: () => Promise<T>) => {
    const identity = await options.workspace.getWorkspace();
    return (options.exclusive ?? browserSyncExclusive)(
      `patternverse-local-sync:${identity.id}`,
      work,
    );
  };
  const inspect = async () => {
    const pending = await options.stateStore.readApply();
    if (!pending) return null;
    const current = await captureWorkspaceSyncSnapshot(options.workspace, options.mira);
    if (
      pending.expected.workspace.workspace.id !== current.workspace.workspace.id ||
      pending.expected.workspace.workspace.createdAt !== current.workspace.workspace.createdAt
    )
      throw new Error('Pending recovery belongs to a different workspace identity.');
    const [base, desired, local] = await Promise.all([
      syncSnapshotToCorpus(pending.expected),
      syncSnapshotToCorpus(pending.desired),
      syncSnapshotToCorpus(current),
    ]);
    const next = new Map(desired.files.map((file) => [file.path, file])),
      live = new Map(local.files.map((file) => [file.path, file]));
    const sessions = await options.mira.list();
    const protections: [string, string | null, string | null][] = [];
    const records: RecoveryRecord[] = [];
    for (const change of planCorpusSync({ base, local: base, remote: desired }).pull) {
      if (live.get(change.path)?.contentHash === next.get(change.path)?.contentHash) continue;
      const record: RecoveryRecord = {
        path: change.path,
        local: live.get(change.path),
        remote: next.get(change.path),
      };
      if (change.path.startsWith('sessions/')) {
        const id = decodeURIComponent(change.path.slice('sessions/'.length, -'.json'.length));
        const session = sessions.find((row) => row.id === id),
          run = await options.mira.loadRun(id);
        protections.push([id, session?.pendingReplyId ?? null, run?.token ?? null]);
        if (session?.pendingReplyId != null || run !== null)
          record.protectedReason =
            'Keep this device while a Mira reply or device-local practice is stored.';
      }
      records.push(record);
    }
    const contentToken = await syncConflictReviewToken({ base, local, remote: desired });
    const token = await hashCorpusContent(
      new TextEncoder().encode(JSON.stringify([contentToken, protections])),
    );
    return { pending, current, local, records, token };
  };
  return {
    inspect: (): Promise<RecoveryReview | null> =>
      locked(async () => {
        const review = await inspect();
        return review ? { token: review.token, records: review.records } : null;
      }),
    resolve: (input: {
      token: string;
      choices: Readonly<Record<string, RecoveryChoice>>;
      confirmed: boolean;
    }): Promise<{ type: 'prepared' } | { type: 'stale' }> =>
      locked(async () => {
        if (!input.confirmed)
          throw new Error('Confirm your recovery choices before applying them.');
        const review = await inspect();
        if (!review || review.token !== input.token) return { type: 'stale' };
        const paths = new Set(review.records.map((row) => row.path));
        if (Object.keys(input.choices).some((path) => !paths.has(path)))
          throw new Error('Review the current pending records.');
        const changes = [];
        for (const record of review.records) {
          const choice = input.choices[record.path];
          if (choice !== 'local' && choice !== 'remote')
            throw new Error('Choose a version for every pending record.');
          if (choice === 'remote' && record.protectedReason)
            throw new Error(record.protectedReason);
          if (choice === 'remote')
            changes.push(changeBetween(record.local, record.remote, record.path));
        }
        const desired = await corpusToSyncSnapshot(
          applyCorpusChanges(review.local, changes),
          review.current.workspace.workspace,
        );
        // Persist the original encrypted recovery copy and the replacement in one
        // transaction. The regular recovery adapter executes it, never a UI writer.
        await options.stateStore.replaceApplyForReview(review.pending, {
          expected: review.current,
          desired,
        });
        return { type: 'prepared' };
      }),
  };
}
