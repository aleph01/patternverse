export type SyncExclusive = <T>(name: string, work: () => Promise<T>) => Promise<T>;
export const workspaceSyncAttemptLock = (workspaceId: string): string =>
  `patternverse-dropbox-attempt:${workspaceId}`;

/** Fail closed without a real cross-tab lock; per-component flags are insufficient. */
export const browserSyncExclusive: SyncExclusive = (name, work) => {
  if (!globalThis.navigator?.locks) throw new Error('Safe sync requires browser locking support.');
  return navigator.locks.request(name, { mode: 'exclusive' }, work);
};
