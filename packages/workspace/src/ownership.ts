import type { EntityRef, RawEntity, Usefulness } from '@patternverse/schema';
import type { Situation } from './situations.js';
import type { SavedPracticeRun } from './practice-history.js';

/** Ownership is separate from the publication/source identity of an article. */
export type WorkspaceKind = 'personal' | 'team' | 'organization';

/** This first slice creates only a local, private personal workspace. */
export type PersonalWorkspaceMetadata = Readonly<{
  id: string;
  name: string;
  kind: 'personal';
  visibility: 'private';
  owner: Readonly<{ kind: 'local'; actorId: string }>;
  createdAt: string;
}>;

/** A saved library entry keeps a source-qualified reference, never a copy of public content. */
export type SavedLibraryEntry = Readonly<{
  workspaceId: string;
  ref: EntityRef;
  createdAt: string;
}>;

/** @deprecated Favorites are now saved library entries. Retained for archive/API compatibility. */
export type WorkspaceFavorite = SavedLibraryEntry;

export type WorkspaceUsefulness = Readonly<{
  workspaceId: string;
  ref: EntityRef;
  usefulness: Exclude<Usefulness, null>;
  updatedAt: string;
}>;

/**
 * The allowlisted workspace read model; backup.ts validates its portable archive envelope.
 * Device identity, provider connections, Mira history and secrets are excluded.
 */
export type LocalWorkspaceData = Readonly<{
  workspace: Omit<PersonalWorkspaceMetadata, 'owner'>;
  entities: readonly RawEntity[];
  /** Legacy archive field name: contains saved library references, not a separate favorites list. */
  favorites: readonly SavedLibraryEntry[];
  usefulness: readonly WorkspaceUsefulness[];
  practiceRuns: readonly SavedPracticeRun[];
  situations: readonly Situation[];
}>;

/** Local terminology only; the underlying publication schema remains compatible. */
export const personalStatusLabel = (status: RawEntity['status']): string =>
  ({ draft: 'draft', published: 'ready', deprecated: 'archived' })[status];
