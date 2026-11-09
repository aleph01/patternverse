import type {
  EntityRef,
  EntityStatus,
  RawEntity,
  RawPatternEntity,
  RawPracticeEntity,
  Usefulness,
} from '@patternverse/schema';
import type { WorkspaceBackup } from './backup.js';
import type { PracticeRunInput, SavedPracticeRun } from './practice-history.js';
import type {
  LocalWorkspaceData,
  PersonalWorkspaceMetadata,
  SavedLibraryEntry,
  WorkspaceFavorite,
  WorkspaceUsefulness,
} from './ownership.js';
import type { Situation, SituationPriority } from './situations.js';
import type { BearingsNotebook } from './bearings.js';
import type { SituationConnectionChange, SituationMapPosition } from './situation-graph.js';

export const PERSONAL_SOURCE_ID = 'personal' as const;
export const DEFAULT_WORKSPACE_DATABASE = 'patternverse-workspace-v1';

type DistributiveCreateInput<T extends RawEntity> = T extends RawEntity
  ? Omit<T, 'sourceId' | 'sourcePath' | 'status'> & { readonly status?: EntityStatus }
  : never;

export type CreatePersonalEntityInput = DistributiveCreateInput<RawEntity>;

export type WorkspaceOptions = {
  readonly databaseName?: string;
  readonly indexedDB?: IDBFactory;
  readonly IDBKeyRange?: typeof IDBKeyRange;
  readonly now?: () => Date;
};

export type LocalWorkspace = import('./widgets.js').WidgetOperations & {
  /** Save a pattern and its practice drafts together; removed practices are unlinked, never deleted. */
  readonly savePatternWithPractices: (input: {
    pattern: RawPatternEntity;
    practices: readonly RawPracticeEntity[];
    originalPracticeIds: readonly string[];
    create: boolean;
  }) => Promise<readonly RawEntity[]>;
  readonly listSituations: () => Promise<readonly Situation[]>;
  readonly createSituation: (
    title: string,
    parent?: Readonly<{ id: string; revision: number }>,
    mapPosition?: SituationMapPosition,
  ) => Promise<Situation>;
  readonly changeSituationConnection: (
    change: SituationConnectionChange,
  ) => Promise<readonly Situation[]>;
  readonly positionSituationOnMap: (
    id: string,
    position: SituationMapPosition | null,
    revision: number,
  ) => Promise<Situation>;
  readonly updateSituation: (
    id: string,
    content: {
      title: string;
      context: string;
      notebook?: BearingsNotebook;
      /** Omit to preserve the priority, or pass null to clear it. */
      priority?: SituationPriority | null;
    },
    revision: number,
  ) => Promise<Situation>;
  /** Delete only the revision the user reviewed, preserving newer edits from another window. */
  readonly deleteSituation: (id: string, revision: number) => Promise<void>;
  /** Move a single entry before another (or to the end), using the latest queue. */
  readonly moveSituation: (id: string, beforeId: string | null) => Promise<readonly Situation[]>;
  readonly listPracticeRuns: () => Promise<readonly SavedPracticeRun[]>;
  readonly getPracticeRun: (id: string) => Promise<SavedPracticeRun | undefined>;
  readonly savePracticeRun: (run: PracticeRunInput) => Promise<SavedPracticeRun>;
  readonly renamePracticeRun: (id: string, title: string) => Promise<void>;
  readonly deletePracticeRun: (id: string) => Promise<void>;
  readonly getWorkspace: () => Promise<PersonalWorkspaceMetadata>;
  readonly renameWorkspace: (name: string) => Promise<PersonalWorkspaceMetadata>;
  /** Atomically update/delete existing private records using the latest stored snapshot. */
  readonly mutateEntities: (
    transform: (current: readonly RawEntity[]) => readonly RawEntity[],
  ) => Promise<readonly RawEntity[]>;
  readonly readWorkspaceData: () => Promise<LocalWorkspaceData>;
  /** Atomic record-level CAS; idempotent for recovery, never a backup restore. */
  readonly applySyncData: (
    expected: LocalWorkspaceData,
    desired: LocalWorkspaceData,
  ) => Promise<void>;
  /** Validated, atomic replacement; saves the previous workspace before deleting any rows. */
  readonly replaceFromBackup: (backup: WorkspaceBackup) => Promise<void>;
  readonly getRecoveryBackup: () => Promise<WorkspaceBackup | undefined>;
  readonly listSavedEntries: () => Promise<readonly SavedLibraryEntry[]>;
  readonly getSavedEntry: (ref: EntityRef) => Promise<SavedLibraryEntry | undefined>;
  readonly setSavedEntry: (ref: EntityRef, saved: boolean) => Promise<void>;
  /** @deprecated Compatibility aliases for saved library entries; no separate favorites semantics. */
  readonly listFavorites: () => Promise<readonly WorkspaceFavorite[]>;
  readonly getFavorite: (ref: EntityRef) => Promise<WorkspaceFavorite | undefined>;
  readonly setFavorite: (ref: EntityRef, favorite: boolean) => Promise<void>;
  readonly createEntity: (input: CreatePersonalEntityInput) => Promise<RawEntity>;
  readonly getEntity: (id: string) => Promise<RawEntity | undefined>;
  readonly listEntities: () => Promise<readonly RawEntity[]>;
  readonly updateEntity: (
    id: string,
    transform: (current: RawEntity) => RawEntity,
  ) => Promise<RawEntity>;
  readonly deleteEntity: (id: string) => Promise<boolean>;
  readonly getUsefulness: (ref: EntityRef) => Promise<Usefulness>;
  readonly listUsefulness: () => Promise<readonly WorkspaceUsefulness[]>;
  readonly setUsefulness: (ref: EntityRef, usefulness: Usefulness) => Promise<void>;
  readonly close: () => void;
};
