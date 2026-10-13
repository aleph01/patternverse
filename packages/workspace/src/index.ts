import type { LocalWorkspace, WorkspaceOptions } from './api.js';
import { createDatabase } from './persistence/database.js';
import { createWorkspaceMetadata } from './persistence/metadata.js';
import { createEntityOperations } from './persistence/entities.js';
import { createLibraryAnnotationOperations } from './persistence/library-annotations.js';
import { createPracticeRunOperations } from './persistence/practice-runs.js';
import { createSituationOperations } from './persistence/situations.js';
import { createWorkspaceTransferOperations } from './persistence/transfer.js';
import type { PersistenceContext } from './persistence/context.js';

export * from './api.js';
export * from './conditional-write.js';
export * from './situations.js';
export * from './library.js';
export * from './ownership.js';
export * from './authoring.js';
export * from './practice-history.js';
export type { EntityRef, RawEntity, Usefulness } from '@patternverse/schema';

/** Compose the existing persistence operations around one connection; no storage/schema migration. */
export const createIndexedDbWorkspace = (options: WorkspaceOptions = {}): LocalWorkspace => {
  const database = createDatabase(options);
  const metadata = createWorkspaceMetadata(database, options);
  const context: PersistenceContext = {
    database,
    metadata: metadata.read,
    now: () => (options.now ?? (() => new Date()))().toISOString(),
  };

  return {
    ...createEntityOperations(context),
    ...createLibraryAnnotationOperations(context),
    ...createPracticeRunOperations(context),
    ...createSituationOperations(context),
    ...createWorkspaceTransferOperations(context, metadata),
    getWorkspace: metadata.getWorkspace,
    renameWorkspace: metadata.renameWorkspace,
    close: () => database.close(),
  };
};
