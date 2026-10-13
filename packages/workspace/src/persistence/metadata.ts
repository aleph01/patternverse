import type { LocalWorkspace, WorkspaceOptions } from '../api.js';
import type { PersonalWorkspaceMetadata } from '../ownership.js';
import type { WorkspaceDatabase } from './database.js';
import { newWorkspace } from './records.js';

export function createWorkspaceMetadata(database: WorkspaceDatabase, options: WorkspaceOptions) {
  let metadataPromise: Promise<PersonalWorkspaceMetadata> | undefined;
  const metadata = (): Promise<PersonalWorkspaceMetadata> => {
    metadataPromise ??= database.transaction('rw', database.workspaces, async () => {
      const stored = await database.workspaces.where('localKey').equals('personal').first();
      const workspace = stored ?? newWorkspace(options);
      if (!stored) await database.workspaces.add(workspace);
      // Explicit projection: internal/device fields cannot accidentally become workspace data.
      return {
        id: workspace.id,
        name: workspace.name,
        kind: workspace.kind,
        visibility: workspace.visibility,
        owner: { kind: workspace.owner.kind, actorId: workspace.owner.actorId },
        createdAt: workspace.createdAt,
      };
    });
    return metadataPromise;
  };

  const renameWorkspace: LocalWorkspace['renameWorkspace'] = async (value) => {
    const name = value.trim();
    if (!name || name.length > 120)
      throw new Error('Enter a workspace name between 1 and 120 characters.');
    const workspace = await metadata();
    await database.workspaces.update(workspace.id, { name });
    // Keep subsequent readers on this instance in step with the persisted metadata.
    metadataPromise = Promise.resolve({ ...workspace, name });
    return structuredClone(await metadataPromise);
  };

  return {
    read: metadata,
    getWorkspace: async () => structuredClone(await metadata()),
    renameWorkspace,
    accept: (workspace: PersonalWorkspaceMetadata) => {
      metadataPromise = Promise.resolve(workspace);
    },
    invalidate: () => {
      metadataPromise = undefined;
    },
  };
}
