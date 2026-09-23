import type { LocalWorkspace } from '@patternverse/workspace';

let workspacePromise: Promise<LocalWorkspace> | undefined;

export const getLocalWorkspace = (): Promise<LocalWorkspace> => {
  workspacePromise ??= import('@patternverse/workspace').then(({ createIndexedDbWorkspace }) =>
    createIndexedDbWorkspace(),
  );
  return workspacePromise;
};
