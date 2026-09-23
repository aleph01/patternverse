import { CorpusChangePreconditionError } from './apply.js';
import type {
  LocalCorpusError,
  PersonalCorpusStore,
  RemoteConnection,
  RemoteCorpusError,
  RemoteCorpusStore,
  SyncExecutionJournal,
  SyncStateStore,
} from './types.js';

export type ExecuteSyncPlanInput = {
  readonly journal: SyncExecutionJournal;
  readonly localStore: PersonalCorpusStore;
  readonly remoteStore: RemoteCorpusStore;
  readonly connection: RemoteConnection;
  readonly stateStore: SyncStateStore;
  readonly now: () => string;
};

export type ExecuteSyncPlanResult =
  | { readonly ok: true; readonly journal: SyncExecutionJournal }
  | {
      readonly ok: false;
      readonly boundary: 'local';
      readonly error: LocalCorpusError;
    }
  | {
      readonly ok: false;
      readonly boundary: 'remote';
      readonly error: RemoteCorpusError;
    };

const withPhase = (
  journal: SyncExecutionJournal,
  phase: SyncExecutionJournal['phase'],
  updatedAt: string,
): SyncExecutionJournal => ({ ...journal, phase, updatedAt });

export const executeSyncPlan = async (
  input: ExecuteSyncPlanInput,
): Promise<ExecuteSyncPlanResult> => {
  let journal = structuredClone(input.journal);
  await input.stateStore.writeJournal(journal);

  try {
    if (journal.plan.pull.length > 0) {
      await input.localStore.applyChanges(journal.plan.pull);
    }
  } catch (error) {
    return {
      ok: false,
      boundary: 'local',
      error:
        error instanceof CorpusChangePreconditionError
          ? { type: 'local-changed', details: error.message }
          : { type: 'local-unavailable', cause: error },
    };
  }

  journal = withPhase(journal, 'local-applied', input.now());
  await input.stateStore.writeJournal(journal);

  if (journal.plan.push.length > 0) {
    const applied = await input.remoteStore.applyChanges(input.connection, {
      expectedRevision: journal.remoteRevision,
      changes: journal.plan.push,
    });
    if (!applied.ok) return { ok: false, boundary: 'remote', error: applied.error };
  }

  journal = withPhase(journal, 'remote-applied', input.now());
  await input.stateStore.writeJournal(journal);
  return { ok: true, journal };
};
