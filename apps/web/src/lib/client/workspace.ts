import type { LocalWorkspace } from '@patternverse/workspace';
import {
  notifyWorkspaceChanged,
  WORKSPACE_DATA_TOPICS,
  type WorkspaceTopic,
} from './workspace-changes';
import { saveAutomaticSync } from './sync-preferences';
import { browserSyncExclusive, workspaceSyncAttemptLock } from './sync-lock';

// Exhaustive API classification: adding a storage method requires deciding
// whether it changes persisted content, rather than silently missing a save.
const writeTopics = {
  listSituations: null,
  listPracticeRuns: null,
  getPracticeRun: null,
  getWorkspace: null,
  readWorkspaceData: null,
  getRecoveryBackup: null,
  listSavedEntries: null,
  getSavedEntry: null,
  listFavorites: null,
  getFavorite: null,
  getEntity: null,
  listEntities: null,
  getUsefulness: null,
  listUsefulness: null,
  close: null,
  createEntity: ['entities'],
  updateEntity: ['entities'],
  deleteEntity: ['entities'],
  mutateEntities: ['entities'],
  renameWorkspace: ['workspace'],
  setSavedEntry: ['saved'],
  setFavorite: ['saved'],
  setUsefulness: ['ratings'],
  savePracticeRun: ['practice-runs'],
  renamePracticeRun: ['practice-runs'],
  deletePracticeRun: ['practice-runs'],
  createSituation: ['situations'],
  updateSituation: ['situations'],
  moveSituation: ['situations'],
  applySyncData: WORKSPACE_DATA_TOPICS,
  replaceFromBackup: WORKSPACE_DATA_TOPICS,
} satisfies Record<keyof LocalWorkspace, readonly WorkspaceTopic[] | null>;

/** All persisted writes invalidate views, but only local edits schedule uploads. */
export function observeWorkspaceWrites(workspace: LocalWorkspace): LocalWorkspace {
  return new Proxy(workspace, {
    get(target, property) {
      const value = Reflect.get(target, property);
      const topics = Object.hasOwn(writeTopics, property)
        ? writeTopics[property as keyof LocalWorkspace]
        : null;
      if (!topics || typeof value !== 'function') return value;
      return async (...args: unknown[]) => {
        const write = () => value.apply(target, args);
        let result;
        if (property === 'replaceFromBackup') {
          // Disable before waiting for an in-flight attempt. Queued automatic
          // attempts recheck the preference inside this same cross-tab lock.
          // Fail closed if the preference cannot be persisted.
          saveAutomaticSync(false);
          const identity = await target.getWorkspace();
          result = globalThis.navigator?.locks
            ? await browserSyncExclusive(workspaceSyncAttemptLock(identity.id), write)
            : await write(); // Sync itself cannot run without Web Locks.
        } else result = await write();
        notifyWorkspaceChanged({
          origin:
            property === 'applySyncData'
              ? 'sync'
              : property === 'replaceFromBackup'
                ? 'restore'
                : 'local',
          topics,
        });
        return result;
      };
    },
  });
}

let workspacePromise: Promise<LocalWorkspace> | undefined;

export const getLocalWorkspace = (): Promise<LocalWorkspace> => {
  workspacePromise ??= import('@patternverse/workspace').then(({ createIndexedDbWorkspace }) =>
    observeWorkspaceWrites(createIndexedDbWorkspace()),
  );
  return workspacePromise;
};
