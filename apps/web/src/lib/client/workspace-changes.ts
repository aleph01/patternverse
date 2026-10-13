export type WorkspaceTopic =
  'entities' | 'saved' | 'ratings' | 'practice-runs' | 'situations' | 'workspace' | 'mira-sessions';

export type WorkspaceChange = Readonly<{
  origin: 'local' | 'sync' | 'restore';
  topics: readonly WorkspaceTopic[];
}>;

export const WORKSPACE_CHANGED = 'patternverse:workspace-changed';
export const WORKSPACE_DATA_TOPICS = [
  'entities',
  'saved',
  'ratings',
  'practice-runs',
  'situations',
  'workspace',
] as const satisfies readonly WorkspaceTopic[];

/** Invalidation only: never put answers, credentials, or private records in events. */
export function notifyWorkspaceChanged(change: WorkspaceChange): void {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new CustomEvent<WorkspaceChange>(WORKSPACE_CHANGED, { detail: change }));
}

export function subscribeWorkspaceChanges(
  topics: readonly WorkspaceTopic[],
  listener: (change: WorkspaceChange) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const receive = (event: Event) => {
    const change = (event as CustomEvent<WorkspaceChange>).detail;
    if (change.topics.some((topic) => topics.includes(topic))) listener(change);
  };
  window.addEventListener(WORKSPACE_CHANGED, receive);
  return () => window.removeEventListener(WORKSPACE_CHANGED, receive);
}
