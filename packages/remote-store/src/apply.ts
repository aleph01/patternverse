import {
  createCorpusSnapshot,
  indexCorpusSnapshot,
  normalizeCorpusPath,
  type CorpusChange,
  type CorpusFile,
  type CorpusSnapshot,
  type RemoteRevision,
} from '@patternverse/sync-domain';

export class CorpusChangePreconditionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorpusChangePreconditionError';
  }
}

const fileFromChange = (
  change: Extract<CorpusChange, { readonly type: 'create' | 'update' }>,
): CorpusFile => ({
  path: normalizeCorpusPath(change.path),
  contentHash: change.contentHash,
  content: new Uint8Array(change.content),
});

export const applyCorpusChanges = (
  snapshot: CorpusSnapshot,
  changes: readonly CorpusChange[],
  revision: RemoteRevision | null = snapshot.revision,
): CorpusSnapshot => {
  const files = new Map(indexCorpusSnapshot(snapshot));
  const changedPaths = new Set<string>();

  for (const change of changes) {
    const path = normalizeCorpusPath(change.path);
    if (changedPaths.has(path)) {
      throw new CorpusChangePreconditionError(`Multiple changes target "${path}".`);
    }
    changedPaths.add(path);
    const current = files.get(path);

    switch (change.type) {
      case 'create':
        if (current) {
          throw new CorpusChangePreconditionError(`Cannot create existing file "${path}".`);
        }
        files.set(path, fileFromChange(change));
        break;
      case 'update':
        if (!current || current.contentHash !== change.previousHash) {
          throw new CorpusChangePreconditionError(`Update precondition failed for "${path}".`);
        }
        files.set(path, fileFromChange(change));
        break;
      case 'delete':
        if (!current || current.contentHash !== change.previousHash) {
          throw new CorpusChangePreconditionError(`Delete precondition failed for "${path}".`);
        }
        files.delete(path);
        break;
    }
  }

  return createCorpusSnapshot({ revision, files: [...files.values()] });
};

export const snapshotsHaveSameContent = (left: CorpusSnapshot, right: CorpusSnapshot): boolean => {
  const leftFiles = createCorpusSnapshot(left).files;
  const rightFiles = createCorpusSnapshot(right).files;
  return (
    leftFiles.length === rightFiles.length &&
    leftFiles.every(
      (file, index) =>
        file.path === rightFiles[index]?.path &&
        file.contentHash === rightFiles[index]?.contentHash,
    )
  );
};
