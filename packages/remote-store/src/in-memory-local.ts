import {
  createCorpusSnapshot,
  type CorpusChange,
  type CorpusSnapshot,
} from '@patternverse/sync-domain';

import { applyCorpusChanges } from './apply.js';
import type { PersonalCorpusStore } from './types.js';

export type InMemoryPersonalCorpusStore = PersonalCorpusStore & {
  readonly replaceSnapshot: (snapshot: CorpusSnapshot) => Promise<void>;
};

export const createInMemoryPersonalCorpusStore = (
  initial: CorpusSnapshot = createCorpusSnapshot({ revision: null, files: [] }),
): InMemoryPersonalCorpusStore => {
  let revision = 0;
  let current = createCorpusSnapshot(initial);

  const nextRevision = (): string => `local:${++revision}`;

  return {
    readSnapshot: async () => createCorpusSnapshot(current),
    applyChanges: async (changes: readonly CorpusChange[]) => {
      current = applyCorpusChanges(current, changes, nextRevision());
      return createCorpusSnapshot(current);
    },
    replaceSnapshot: async (snapshot: CorpusSnapshot) => {
      current = createCorpusSnapshot({ revision: nextRevision(), files: snapshot.files });
    },
  };
};
