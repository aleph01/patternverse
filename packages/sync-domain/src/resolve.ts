import { normalizeCorpusPath } from './path.js';
import { changeBetween } from './planner.js';
import { cloneCorpusFile } from './snapshot.js';
import type {
  CorpusChange,
  CorpusFile,
  SyncConflict,
  SyncConflictResolution,
  SyncConflictResolutions,
  SyncPlan,
} from './types.js';

const byPath = <T extends { readonly path: string }>(left: T, right: T): number =>
  left.path.localeCompare(right.path);

const resolveOneSide = (
  conflict: SyncConflict,
  resolution: Exclude<SyncConflictResolution, { readonly type: 'keep-both' }>,
): { readonly pull?: CorpusChange; readonly push?: CorpusChange } => {
  switch (conflict.type) {
    case 'both-modified':
    case 'both-created-differently':
      return resolution.type === 'keep-local'
        ? { push: changeBetween(conflict.remote, conflict.local) }
        : { pull: changeBetween(conflict.local, conflict.remote) };
    case 'deleted-locally-modified-remotely':
      return resolution.type === 'keep-local'
        ? { push: changeBetween(conflict.remote, undefined) }
        : { pull: changeBetween(undefined, conflict.remote) };
    case 'modified-locally-deleted-remotely':
      return resolution.type === 'keep-local'
        ? { push: changeBetween(undefined, conflict.local) }
        : { pull: changeBetween(conflict.local, undefined) };
  }
};

const versionsForKeepBoth = (
  conflict: Extract<SyncConflict, { readonly type: 'both-modified' | 'both-created-differently' }>,
  original: 'local' | 'remote',
): { readonly originalFile: CorpusFile; readonly duplicateFile: CorpusFile } =>
  original === 'local'
    ? { originalFile: conflict.local, duplicateFile: conflict.remote }
    : { originalFile: conflict.remote, duplicateFile: conflict.local };

export const resolveSyncConflicts = (
  plan: SyncPlan,
  resolutions: SyncConflictResolutions,
): SyncPlan => {
  const pull = [...plan.pull];
  const push = [...plan.push];
  const reservedPaths = new Set([
    ...plan.pull.map(({ path }) => path),
    ...plan.push.map(({ path }) => path),
    ...plan.conflicts.map(({ path }) => path),
    ...plan.unchangedPaths,
  ]);

  for (const conflict of plan.conflicts) {
    const resolution = resolutions[conflict.path];
    if (!resolution) throw new Error(`A resolution is required for conflict "${conflict.path}".`);

    if (resolution.type !== 'keep-both') {
      const changes = resolveOneSide(conflict, resolution);
      if (changes.pull) pull.push(changes.pull);
      if (changes.push) push.push(changes.push);
      continue;
    }

    if (
      conflict.type === 'deleted-locally-modified-remotely' ||
      conflict.type === 'modified-locally-deleted-remotely'
    ) {
      throw new Error(`Keep both is not valid for deletion conflict "${conflict.path}".`);
    }

    const duplicatePath = normalizeCorpusPath(resolution.duplicatePath);
    if (reservedPaths.has(duplicatePath)) {
      throw new Error(`Keep-both path "${duplicatePath}" is already present in the plan.`);
    }
    reservedPaths.add(duplicatePath);

    const { originalFile, duplicateFile } = versionsForKeepBoth(conflict, resolution.original);
    if (resolution.original === 'local') {
      push.push(changeBetween(conflict.remote, originalFile));
    } else {
      pull.push(changeBetween(conflict.local, originalFile));
    }

    const duplicate = cloneCorpusFile(duplicateFile, duplicatePath);
    pull.push(changeBetween(undefined, duplicate));
    push.push(changeBetween(undefined, duplicate));
  }

  return {
    pull: pull.sort(byPath),
    push: push.sort(byPath),
    conflicts: [],
    unchangedPaths: [...plan.unchangedPaths].sort((left, right) => left.localeCompare(right)),
  };
};
