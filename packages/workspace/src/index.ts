import {
  entityRefSchema,
  rawEntitySchema,
  usefulnessSchema,
  type EntityRef,
  type EntityStatus,
  type RawEntity,
  type Usefulness,
} from '@patternverse/schema';
import { Dexie, type EntityTable } from 'dexie';

export * from './library.js';
export type { EntityRef, RawEntity, Usefulness } from '@patternverse/schema';

export const PERSONAL_SOURCE_ID = 'personal' as const;
export const DEFAULT_WORKSPACE_DATABASE = 'patternverse-workspace-v1';

type DistributiveCreateInput<T extends RawEntity> = T extends RawEntity
  ? Omit<T, 'sourceId' | 'sourcePath' | 'status'> & { readonly status?: EntityStatus }
  : never;

export type CreatePersonalEntityInput = DistributiveCreateInput<RawEntity>;

type StoredPersonalEntity = RawEntity & {
  readonly createdAt: string;
  readonly updatedAt: string;
};

type UsefulnessRecord = {
  readonly refKey: string;
  readonly sourceId: string;
  readonly entityId: string;
  readonly usefulness: Exclude<Usefulness, null>;
  readonly updatedAt: string;
};

type WorkspaceDatabase = Dexie & {
  entities: EntityTable<StoredPersonalEntity, 'id'>;
  usefulness: EntityTable<UsefulnessRecord, 'refKey'>;
};

export type WorkspaceOptions = {
  readonly databaseName?: string;
  readonly indexedDB?: IDBFactory;
  readonly IDBKeyRange?: typeof IDBKeyRange;
  readonly now?: () => Date;
};

export type LocalWorkspace = {
  readonly createEntity: (input: CreatePersonalEntityInput) => Promise<RawEntity>;
  readonly getEntity: (id: string) => Promise<RawEntity | undefined>;
  readonly listEntities: () => Promise<readonly RawEntity[]>;
  readonly updateEntity: (
    id: string,
    transform: (current: RawEntity) => RawEntity,
  ) => Promise<RawEntity>;
  readonly deleteEntity: (id: string) => Promise<boolean>;
  readonly getUsefulness: (ref: EntityRef) => Promise<Usefulness>;
  readonly setUsefulness: (ref: EntityRef, usefulness: Usefulness) => Promise<void>;
  readonly close: () => void;
};

const usefulnessKey = (ref: EntityRef): string => `${ref.sourceId}:${ref.entityId}`;

const asPersonalEntity = (candidate: unknown): RawEntity => {
  const parsed = rawEntitySchema.parse(candidate);
  if (parsed.sourceId !== PERSONAL_SOURCE_ID) {
    throw new Error(`Personal workspace entities must use sourceId "${PERSONAL_SOURCE_ID}".`);
  }
  return parsed;
};

const rawFromStored = (stored: StoredPersonalEntity): RawEntity => {
  const candidate = Object.fromEntries(
    Object.entries(stored).filter(([key]) => key !== 'createdAt' && key !== 'updatedAt'),
  );
  return asPersonalEntity(candidate);
};

const storedFromRaw = (
  entity: RawEntity,
  timestamps: { readonly createdAt: string; readonly updatedAt: string },
): StoredPersonalEntity => ({ ...entity, ...timestamps });

const createDatabase = (options: WorkspaceOptions): WorkspaceDatabase => {
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

  return database;
};

export const createIndexedDbWorkspace = (options: WorkspaceOptions = {}): LocalWorkspace => {
  const database = createDatabase(options);
  const now = (): string => (options.now ?? (() => new Date()))().toISOString();

  const getEntity = async (id: string): Promise<RawEntity | undefined> => {
    const stored = await database.entities.get(id);
    return stored ? rawFromStored(stored) : undefined;
  };

  const listEntities = async (): Promise<readonly RawEntity[]> => {
    const stored = await database.entities.orderBy('updatedAt').reverse().toArray();
    return stored.map(rawFromStored);
  };

  const createEntity = async (input: CreatePersonalEntityInput): Promise<RawEntity> => {
    const entity = asPersonalEntity({
      ...input,
      sourceId: PERSONAL_SOURCE_ID,
      status: input.status ?? 'draft',
    });
    if (await database.entities.get(entity.id)) {
      throw new Error(`A personal entity with ID "${entity.id}" already exists.`);
    }
    const timestamp = now();
    await database.entities.add(
      storedFromRaw(entity, { createdAt: timestamp, updatedAt: timestamp }),
    );
    return entity;
  };

  const updateEntity = async (
    id: string,
    transform: (current: RawEntity) => RawEntity,
  ): Promise<RawEntity> =>
    database.transaction('rw', database.entities, async () => {
      const stored = await database.entities.get(id);
      if (!stored) throw new Error(`Personal entity "${id}" does not exist.`);

      const current = rawFromStored(stored);
      const transformed = transform(structuredClone(current));
      if (transformed.id !== id) {
        throw new Error('Entity IDs are stable and cannot be changed during an update.');
      }
      const entity = asPersonalEntity({ ...transformed, sourceId: PERSONAL_SOURCE_ID });
      await database.entities.put(
        storedFromRaw(entity, { createdAt: stored.createdAt, updatedAt: now() }),
      );
      return entity;
    });

  const deleteEntity = async (id: string): Promise<boolean> => {
    const existed = (await database.entities.get(id)) !== undefined;
    if (existed) await database.entities.delete(id);
    return existed;
  };

  const getUsefulness = async (ref: EntityRef): Promise<Usefulness> => {
    const parsedRef = entityRefSchema.parse(ref);
    const record = await database.usefulness.get(usefulnessKey(parsedRef));
    return record?.usefulness ?? null;
  };

  const setUsefulness = async (ref: EntityRef, usefulness: Usefulness): Promise<void> => {
    const parsedRef = entityRefSchema.parse(ref);
    const parsedUsefulness = usefulnessSchema.parse(usefulness);
    const refKey = usefulnessKey(parsedRef);
    if (parsedUsefulness === null) {
      await database.usefulness.delete(refKey);
      return;
    }
    await database.usefulness.put({
      refKey,
      sourceId: parsedRef.sourceId,
      entityId: parsedRef.entityId,
      usefulness: parsedUsefulness,
      updatedAt: now(),
    });
  };

  return {
    createEntity,
    getEntity,
    listEntities,
    updateEntity,
    deleteEntity,
    getUsefulness,
    setUsefulness,
    close: () => database.close(),
  };
};
