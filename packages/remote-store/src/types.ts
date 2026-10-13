import type {
  CorpusChange,
  CorpusSnapshot,
  RemoteRevision,
  SyncConflictResolutions,
  SyncPlan,
} from '@patternverse/sync-domain';

export type RemoteProviderId = string;

export type RemoteConnection = {
  readonly providerId: RemoteProviderId;
  readonly connectionId: string;
  readonly accountLabel?: string;
  readonly remoteLabel?: string;
};

export type RemoteCorpusCapabilities = {
  readonly supportsAtomicBatchWrite: boolean;
  readonly supportsChangeCursor: boolean;
  readonly supportsVisibleFiles: boolean;
  readonly supportsRevisionHistory: boolean;
  readonly supportsFolderSelection: boolean;
};

export type RemoteCorpusError =
  | { readonly type: 'not-authenticated' }
  | { readonly type: 'authorization-expired' }
  | { readonly type: 'permission-denied' }
  | { readonly type: 'not-found' }
  | { readonly type: 'revision-conflict' }
  | { readonly type: 'rate-limited'; readonly retryAfterMs?: number }
  | { readonly type: 'temporarily-unavailable' }
  | { readonly type: 'quota-exceeded' }
  | { readonly type: 'invalid-remote-corpus'; readonly details: string }
  | { readonly type: 'network-error' }
  | { readonly type: 'unknown'; readonly cause?: unknown };

export type RemoteSnapshotResult =
  | { readonly ok: true; readonly snapshot: CorpusSnapshot }
  | { readonly ok: false; readonly error: RemoteCorpusError };

export type ApplyRemoteChangesRequest = {
  readonly expectedRevision: RemoteRevision | null;
  readonly changes: readonly CorpusChange[];
};

export type ApplyRemoteChangesResult =
  | { readonly ok: true; readonly revision: RemoteRevision }
  | { readonly ok: false; readonly error: RemoteCorpusError };

export type RemoteOperationResult =
  { readonly ok: true } | { readonly ok: false; readonly error: RemoteCorpusError };

export type RemoteCorpusStore = {
  readonly providerId: RemoteProviderId;
  readonly capabilities: RemoteCorpusCapabilities;
  readonly readSnapshot: (connection: RemoteConnection) => Promise<RemoteSnapshotResult>;
  readonly applyChanges: (
    connection: RemoteConnection,
    request: ApplyRemoteChangesRequest,
  ) => Promise<ApplyRemoteChangesResult>;
  readonly disconnect: (connection: RemoteConnection) => Promise<RemoteOperationResult>;
};

export type PersonalCorpusStore = {
  readonly readSnapshot: () => Promise<CorpusSnapshot>;
  readonly applyChanges: (changes: readonly CorpusChange[]) => Promise<CorpusSnapshot>;
};

export type SyncExecutionPhase = 'planned' | 'local-applied' | 'remote-applied' | 'verifying';

export type SyncExecutionJournal = {
  readonly id: string;
  readonly providerId: RemoteProviderId;
  readonly phase: SyncExecutionPhase;
  readonly remoteRevision: RemoteRevision | null;
  readonly plan: SyncPlan;
  readonly startedAt: string;
  readonly updatedAt: string;
};

export type SyncStateStore = {
  readonly readBase: () => Promise<CorpusSnapshot>;
  readonly writeBase: (snapshot: CorpusSnapshot) => Promise<void>;
  readonly readJournal: () => Promise<SyncExecutionJournal | null>;
  readonly writeJournal: (journal: SyncExecutionJournal) => Promise<void>;
  readonly clearJournal: () => Promise<void>;
};

export type LocalCorpusError =
  | { readonly type: 'local-changed'; readonly details: string }
  | { readonly type: 'local-unavailable'; readonly cause?: unknown };

export type SynchronizeWorkspaceResult =
  | {
      readonly type: 'synchronized';
      readonly base: CorpusSnapshot;
      readonly recovered: boolean;
    }
  | {
      readonly type: 'conflict';
      readonly plan: SyncPlan;
      readonly reviewToken: string;
      readonly recovered: boolean;
    }
  | {
      readonly type: 'review-outdated';
      readonly plan: SyncPlan;
      readonly reviewToken: string;
      readonly recovered: boolean;
    }
  | {
      readonly type: 'remote-error';
      readonly error: RemoteCorpusError;
      readonly recoveryAvailable: boolean;
    }
  | {
      readonly type: 'local-error';
      readonly error: LocalCorpusError;
      readonly recoveryAvailable: boolean;
    };

export type SynchronizeWorkspaceInput = {
  readonly localStore: PersonalCorpusStore;
  readonly remoteStore: RemoteCorpusStore;
  readonly connection: RemoteConnection;
  readonly stateStore: SyncStateStore;
  readonly conflictResolutions?: SyncConflictResolutions;
  /** UI callers must pass the token returned with the conflicts they reviewed. */
  readonly reviewedConflictToken?: string;
  readonly maxRevisionRetries?: number;
  readonly now?: () => Date;
  readonly createJournalId?: () => string;
};
