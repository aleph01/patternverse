import type { WorkspaceDatabase } from './database.js';
import type { PersonalWorkspaceMetadata } from '../ownership.js';

/** One concrete IndexedDB connection and workspace identity, shared by its operation groups. */
export type PersistenceContext = Readonly<{
  database: WorkspaceDatabase;
  metadata: () => Promise<PersonalWorkspaceMetadata>;
  now: () => string;
}>;
