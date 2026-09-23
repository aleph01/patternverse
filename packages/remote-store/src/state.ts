import { createCorpusSnapshot, type CorpusSnapshot } from '@patternverse/sync-domain';

import type { SyncExecutionJournal, SyncStateStore } from './types.js';

const cloneJournal = (journal: SyncExecutionJournal): SyncExecutionJournal =>
  structuredClone(journal);

export type InMemorySyncStateStore = SyncStateStore;

export const createInMemorySyncStateStore = (
  initialBase: CorpusSnapshot = createCorpusSnapshot({ revision: null, files: [] }),
): InMemorySyncStateStore => {
  let base = createCorpusSnapshot(initialBase);
  let journal: SyncExecutionJournal | null = null;

  return {
    readBase: async () => createCorpusSnapshot(base),
    writeBase: async (snapshot) => {
      base = createCorpusSnapshot(snapshot);
    },
    readJournal: async () => (journal ? cloneJournal(journal) : null),
    writeJournal: async (nextJournal) => {
      journal = cloneJournal(nextJournal);
    },
    clearJournal: async () => {
      journal = null;
    },
  };
};
