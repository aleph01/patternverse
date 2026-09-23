export type CorpusPath = string;
export type ContentHash = string;
export type RemoteRevision = string;

export type CorpusFile = {
  readonly path: CorpusPath;
  readonly contentHash: ContentHash;
  readonly content: Uint8Array;
};

export type CorpusSnapshot = {
  readonly revision: RemoteRevision | null;
  readonly files: readonly CorpusFile[];
};

export type CorpusChange =
  | {
      readonly type: 'create';
      readonly path: CorpusPath;
      readonly content: Uint8Array;
      readonly contentHash: ContentHash;
    }
  | {
      readonly type: 'update';
      readonly path: CorpusPath;
      readonly previousHash: ContentHash;
      readonly content: Uint8Array;
      readonly contentHash: ContentHash;
    }
  | {
      readonly type: 'delete';
      readonly path: CorpusPath;
      readonly previousHash: ContentHash;
    };

export type SyncConflict =
  | {
      readonly type: 'both-modified';
      readonly path: CorpusPath;
      readonly base: CorpusFile;
      readonly local: CorpusFile;
      readonly remote: CorpusFile;
    }
  | {
      readonly type: 'deleted-locally-modified-remotely';
      readonly path: CorpusPath;
      readonly base: CorpusFile;
      readonly remote: CorpusFile;
    }
  | {
      readonly type: 'modified-locally-deleted-remotely';
      readonly path: CorpusPath;
      readonly base: CorpusFile;
      readonly local: CorpusFile;
    }
  | {
      readonly type: 'both-created-differently';
      readonly path: CorpusPath;
      readonly local: CorpusFile;
      readonly remote: CorpusFile;
    };

export type SyncPlan = {
  readonly pull: readonly CorpusChange[];
  readonly push: readonly CorpusChange[];
  readonly conflicts: readonly SyncConflict[];
  readonly unchangedPaths: readonly CorpusPath[];
};

export type SyncConflictResolution =
  | { readonly type: 'keep-local' }
  | { readonly type: 'keep-remote' }
  | {
      readonly type: 'keep-both';
      readonly original: 'local' | 'remote';
      readonly duplicatePath: CorpusPath;
    };

export type SyncConflictResolutions = Readonly<
  Record<CorpusPath, SyncConflictResolution | undefined>
>;

export type PlanCorpusSyncInput = {
  readonly base: CorpusSnapshot;
  readonly local: CorpusSnapshot;
  readonly remote: CorpusSnapshot;
};
