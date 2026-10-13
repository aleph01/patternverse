import {
  entityRefSchema,
  rawEntitySchema,
  type RawEntity,
  type Usefulness,
} from '@patternverse/schema';
import type {
  PersonalWorkspaceMetadata,
  WorkspaceFavorite,
  WorkspaceUsefulness,
} from '../ownership.js';
import { PERSONAL_SOURCE_ID, type WorkspaceOptions } from '../api.js';

export type StoredPersonalEntity = RawEntity & {
  readonly workspaceId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type UsefulnessRecord = {
  readonly workspaceId: string;
  readonly refKey: string;
  readonly sourceId: string;
  readonly entityId: string;
  readonly usefulness: Exclude<Usefulness, null>;
  readonly updatedAt: string;
};

export type StoredWorkspace = PersonalWorkspaceMetadata & { readonly localKey: 'personal' };
export type StoredFavorite = WorkspaceFavorite & { readonly refKey: string };

export const asPersonalEntity = (candidate: unknown): RawEntity => {
  const parsed = rawEntitySchema.parse(candidate);
  if (parsed.sourceId !== PERSONAL_SOURCE_ID) {
    throw new Error(`Personal workspace entities must use sourceId "${PERSONAL_SOURCE_ID}".`);
  }
  return parsed;
};

export const rawFromStored = (stored: StoredPersonalEntity): RawEntity => {
  const candidate = Object.fromEntries(
    Object.entries(stored).filter(
      ([key]) => key !== 'workspaceId' && key !== 'createdAt' && key !== 'updatedAt',
    ),
  );
  return asPersonalEntity(candidate);
};

export const storedFromRaw = (
  entity: RawEntity,
  timestamps: {
    readonly workspaceId: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  },
): StoredPersonalEntity => ({ ...entity, ...timestamps });

export const newWorkspace = (options: WorkspaceOptions): StoredWorkspace => ({
  id: globalThis.crypto.randomUUID(),
  localKey: 'personal',
  name: 'My Workspace',
  kind: 'personal',
  visibility: 'private',
  owner: { kind: 'local', actorId: globalThis.crypto.randomUUID() },
  createdAt: (options.now ?? (() => new Date()))().toISOString(),
});

export const favoriteFromStored = (stored: StoredFavorite): WorkspaceFavorite => ({
  workspaceId: stored.workspaceId,
  ref: entityRefSchema.parse(stored.ref),
  createdAt: stored.createdAt,
});

export const usefulnessFromStored = (stored: UsefulnessRecord): WorkspaceUsefulness => ({
  workspaceId: stored.workspaceId,
  ref: entityRefSchema.parse({ sourceId: stored.sourceId, entityId: stored.entityId }),
  usefulness: stored.usefulness,
  updatedAt: stored.updatedAt,
});
