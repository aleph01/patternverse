import { Dexie, type EntityTable } from 'dexie';
import type { SavedPracticeRun } from '../practice-history.js';
import type { Situation } from '../situations.js';
import { DEFAULT_WORKSPACE_DATABASE, type WorkspaceOptions } from '../api.js';
import {
  newWorkspace,
  type StoredPersonalEntity,
  type StoredFavorite,
  type StoredWorkspace,
  type UsefulnessRecord,
} from './records.js';

export type WorkspaceDatabase = Dexie & {
  entities: EntityTable<StoredPersonalEntity, 'id'>;
  usefulness: EntityTable<UsefulnessRecord, 'refKey'>;
  workspaces: EntityTable<StoredWorkspace, 'id'>;
  favorites: EntityTable<StoredFavorite, 'refKey'>;
  practiceRuns: EntityTable<SavedPracticeRun, 'id'>;
  situations: EntityTable<Situation, 'id'>;
  recoveryBackups: EntityTable<{ key: 'before-restore'; bytes: Uint8Array }, 'key'>;
};

export const createDatabase = (options: WorkspaceOptions): WorkspaceDatabase => {
  const dependencies =
    options.indexedDB && options.IDBKeyRange
      ? { indexedDB: options.indexedDB, IDBKeyRange: options.IDBKeyRange }
      : undefined;
  const database = new Dexie(
    options.databaseName ?? DEFAULT_WORKSPACE_DATABASE,
    dependencies,
  ) as WorkspaceDatabase;

  database.version(1).stores({
    entities: 'id, type, status, updatedAt',
    usefulness: 'refKey, sourceId, entityId, updatedAt',
  });
  database
    .version(2)
    .stores({
      entities: 'id, workspaceId, type, status, updatedAt',
      usefulness: 'refKey, workspaceId, sourceId, entityId, updatedAt',
      workspaces: 'id, &localKey',
      favorites: 'refKey, workspaceId, createdAt',
    })
    .upgrade(async (transaction) => {
      const workspace = newWorkspace(options);
      await transaction.table('workspaces').add(workspace);
      // Assign ownership without rewriting article data, references, status or timestamps.
      await transaction.table('entities').toCollection().modify({ workspaceId: workspace.id });
      await transaction.table('usefulness').toCollection().modify({ workspaceId: workspace.id });
    });

  database.version(3).stores({ practiceRuns: 'id, workspaceId, updatedAt, status' });
  database.version(4).stores({ recoveryBackups: 'key' });
  database.version(5).stores({ situations: 'id, workspaceId, position' });
  return database;
};
