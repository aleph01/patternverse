import { cloneCorpusFile, indexCorpusSnapshot } from './snapshot.js';
import type {
  CorpusChange,
  CorpusFile,
  PlanCorpusSyncInput,
  SyncConflict,
  SyncPlan,
} from './types.js';

const hashOf = (file: CorpusFile | undefined): string | undefined => file?.contentHash;

export const changeBetween = (
  target: CorpusFile | undefined,
  source: CorpusFile | undefined,
  path = source?.path ?? target?.path,
): CorpusChange => {
  if (!path) throw new Error('A corpus change requires a path.');
  if (!target && source) {
    return {
      type: 'create',
      path,
      contentHash: source.contentHash,
      content: new Uint8Array(source.content),
    };
  }
  if (target && !source) {
    return { type: 'delete', path, previousHash: target.contentHash };
  }
  if (target && source) {
    return {
      type: 'update',
      path,
      previousHash: target.contentHash,
      contentHash: source.contentHash,
      content: new Uint8Array(source.content),
    };
  }
  throw new Error(`Cannot create an empty change for "${path}".`);
};

const conflictFor = (
  path: string,
  base: CorpusFile | undefined,
  local: CorpusFile | undefined,
  remote: CorpusFile | undefined,
): SyncConflict => {
  if (!base && local && remote) {
    return {
      type: 'both-created-differently',
      path,
      local: cloneCorpusFile(local),
      remote: cloneCorpusFile(remote),
    };
  }
  if (base && !local && remote) {
    return {
      type: 'deleted-locally-modified-remotely',
      path,
      base: cloneCorpusFile(base),
      remote: cloneCorpusFile(remote),
    };
  }
  if (base && local && !remote) {
    return {
      type: 'modified-locally-deleted-remotely',
      path,
      base: cloneCorpusFile(base),
      local: cloneCorpusFile(local),
    };
  }
  if (base && local && remote) {
    return {
      type: 'both-modified',
      path,
      base: cloneCorpusFile(base),
      local: cloneCorpusFile(local),
      remote: cloneCorpusFile(remote),
    };
  }
  throw new Error(`Unsupported conflict state for "${path}".`);
};

export const planCorpusSync = ({ base, local, remote }: PlanCorpusSyncInput): SyncPlan => {
  const baseFiles = indexCorpusSnapshot(base);
  const localFiles = indexCorpusSnapshot(local);
  const remoteFiles = indexCorpusSnapshot(remote);
  const paths = [
    ...new Set([...baseFiles.keys(), ...localFiles.keys(), ...remoteFiles.keys()]),
  ].sort((left, right) => left.localeCompare(right));

  const pull: CorpusChange[] = [];
  const push: CorpusChange[] = [];
  const conflicts: SyncConflict[] = [];
  const unchangedPaths: string[] = [];

  for (const path of paths) {
    const baseFile = baseFiles.get(path);
    const localFile = localFiles.get(path);
    const remoteFile = remoteFiles.get(path);
    const baseHash = hashOf(baseFile);
    const localHash = hashOf(localFile);
    const remoteHash = hashOf(remoteFile);

    if (localHash === remoteHash) {
      unchangedPaths.push(path);
      continue;
    }
    if (localHash === baseHash) {
      pull.push(changeBetween(localFile, remoteFile, path));
      continue;
    }
    if (remoteHash === baseHash) {
      push.push(changeBetween(remoteFile, localFile, path));
      continue;
    }
    conflicts.push(conflictFor(path, baseFile, localFile, remoteFile));
  }

  return { pull, push, conflicts, unchangedPaths };
};
