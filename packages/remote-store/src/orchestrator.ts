import {
  createCorpusSnapshot,
  planCorpusSync,
  resolveSyncConflicts,
  type SyncPlan,
} from '@patternverse/sync-domain';

import { snapshotsHaveSameContent } from './apply.js';
import { executeSyncPlan } from './executor.js';
import type {
  RemoteCorpusError,
  SyncExecutionJournal,
  SynchronizeWorkspaceInput,
  SynchronizeWorkspaceResult,
} from './types.js';

const remoteFailure = (
  error: RemoteCorpusError,
  recoveryAvailable: boolean,
): SynchronizeWorkspaceResult => ({ type: 'remote-error', error, recoveryAvailable });

const resolvedPlanFor = (plan: SyncPlan, input: SynchronizeWorkspaceInput): SyncPlan | null => {
  if (plan.conflicts.length === 0) return plan;
  if (!input.conflictResolutions) return null;
  return resolveSyncConflicts(plan, input.conflictResolutions);
};

export const synchronizeWorkspace = async (
  input: SynchronizeWorkspaceInput,
): Promise<SynchronizeWorkspaceResult> => {
  const previousJournal = await input.stateStore.readJournal();
  const recovered = previousJournal !== null;
  const base = await input.stateStore.readBase();
  const maxRevisionRetries = input.maxRevisionRetries ?? 2;
  const now = (): string => (input.now ?? (() => new Date()))().toISOString();
  const createJournalId = input.createJournalId ?? (() => globalThis.crypto.randomUUID());

  for (let attempt = 0; attempt <= maxRevisionRetries; attempt += 1) {
    let local;
    try {
      local = await input.localStore.readSnapshot();
    } catch (error) {
      return {
        type: 'local-error',
        error: { type: 'local-unavailable', cause: error },
        recoveryAvailable: recovered,
      };
    }

    const remoteResult = await input.remoteStore.readSnapshot(input.connection);
    if (!remoteResult.ok) return remoteFailure(remoteResult.error, recovered);

    const plan = planCorpusSync({ base, local, remote: remoteResult.snapshot });
    const resolvedPlan = resolvedPlanFor(plan, input);
    if (!resolvedPlan) return { type: 'conflict', plan, recovered };

    const timestamp = now();
    let journal: SyncExecutionJournal = {
      id: previousJournal?.id ?? createJournalId(),
      providerId: input.remoteStore.providerId,
      phase: 'planned',
      remoteRevision: remoteResult.snapshot.revision,
      plan: resolvedPlan,
      startedAt: previousJournal?.startedAt ?? timestamp,
      updatedAt: timestamp,
    };
    const executed = await executeSyncPlan({
      journal,
      localStore: input.localStore,
      remoteStore: input.remoteStore,
      connection: input.connection,
      stateStore: input.stateStore,
      now,
    });
    if (!executed.ok) {
      if (
        executed.boundary === 'remote' &&
        executed.error.type === 'revision-conflict' &&
        attempt < maxRevisionRetries
      ) {
        continue;
      }
      return executed.boundary === 'remote'
        ? remoteFailure(executed.error, true)
        : {
            type: 'local-error',
            error: executed.error,
            recoveryAvailable: true,
          };
    }

    journal = { ...executed.journal, phase: 'verifying', updatedAt: now() };
    await input.stateStore.writeJournal(journal);

    const verifiedRemote = await input.remoteStore.readSnapshot(input.connection);
    if (!verifiedRemote.ok) return remoteFailure(verifiedRemote.error, true);

    let verifiedLocal;
    try {
      verifiedLocal = await input.localStore.readSnapshot();
    } catch (error) {
      return {
        type: 'local-error',
        error: { type: 'local-unavailable', cause: error },
        recoveryAvailable: true,
      };
    }

    if (!snapshotsHaveSameContent(verifiedLocal, verifiedRemote.snapshot)) {
      if (attempt < maxRevisionRetries) continue;
      return remoteFailure({ type: 'revision-conflict' }, true);
    }

    const nextBase = createCorpusSnapshot({
      revision: verifiedRemote.snapshot.revision,
      files: verifiedLocal.files,
    });
    await input.stateStore.writeBase(nextBase);
    await input.stateStore.clearJournal();
    return { type: 'synchronized', base: nextBase, recovered };
  }

  return remoteFailure({ type: 'revision-conflict' }, true);
};
