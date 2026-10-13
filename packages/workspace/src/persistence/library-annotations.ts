import {
  entityRefSchema,
  usefulnessSchema,
  type EntityRef,
  type Usefulness,
} from '@patternverse/schema';
import type { WorkspaceFavorite, WorkspaceUsefulness } from '../ownership.js';
import type { LocalWorkspace } from '../api.js';
import { libraryRefKey as usefulnessKey } from '../library.js';
import { favoriteFromStored, usefulnessFromStored } from './records.js';
import type { PersistenceContext } from './context.js';
export function createLibraryAnnotationOperations(
  context: PersistenceContext,
): Pick<
  LocalWorkspace,
  | 'getUsefulness'
  | 'listUsefulness'
  | 'setUsefulness'
  | 'listFavorites'
  | 'getFavorite'
  | 'setFavorite'
  | 'listSavedEntries'
  | 'getSavedEntry'
  | 'setSavedEntry'
> {
  const { database, metadata, now } = context;
  const getUsefulness = async (ref: EntityRef): Promise<Usefulness> => {
    const workspace = await metadata();
    const parsedRef = entityRefSchema.parse(ref);
    const record = await database.usefulness.get(usefulnessKey(parsedRef));
    return record?.workspaceId === workspace.id ? record.usefulness : null;
  };

  const listUsefulness = async (): Promise<readonly WorkspaceUsefulness[]> => {
    const workspace = await metadata();
    return (await database.usefulness.where('workspaceId').equals(workspace.id).toArray()).map(
      usefulnessFromStored,
    );
  };

  const setUsefulness = async (ref: EntityRef, usefulness: Usefulness): Promise<void> => {
    const workspace = await metadata();
    const parsedRef = entityRefSchema.parse(ref);
    const parsedUsefulness = usefulnessSchema.parse(usefulness);
    const refKey = usefulnessKey(parsedRef);
    if (parsedUsefulness === null) {
      await database.usefulness.delete(refKey);
      return;
    }
    await database.usefulness.put({
      workspaceId: workspace.id,
      refKey,
      sourceId: parsedRef.sourceId,
      entityId: parsedRef.entityId,
      usefulness: parsedUsefulness,
      updatedAt: now(),
    });
  };

  const listFavorites = async (): Promise<readonly WorkspaceFavorite[]> => {
    const workspace = await metadata();
    const stored = await database.favorites
      .where('workspaceId')
      .equals(workspace.id)
      .sortBy('createdAt');
    return stored.reverse().map(favoriteFromStored);
  };

  const getFavorite = async (ref: EntityRef): Promise<WorkspaceFavorite | undefined> => {
    const workspace = await metadata();
    const stored = await database.favorites.get(usefulnessKey(entityRefSchema.parse(ref)));
    return stored?.workspaceId === workspace.id ? favoriteFromStored(stored) : undefined;
  };

  const setFavorite = async (ref: EntityRef, favorite: boolean): Promise<void> => {
    const workspace = await metadata();
    const parsedRef = entityRefSchema.parse(ref);
    if (typeof favorite !== 'boolean') throw new Error('Favorite must be true or false.');
    const refKey = usefulnessKey(parsedRef);
    await database.transaction('rw', database.favorites, async () => {
      if (!favorite) {
        await database.favorites.delete(refKey);
      } else if (!(await database.favorites.get(refKey))) {
        await database.favorites.add({
          refKey,
          workspaceId: workspace.id,
          ref: parsedRef,
          createdAt: now(),
        });
      }
    });
  };

  return {
    getUsefulness,
    listUsefulness,
    setUsefulness,
    listFavorites,
    getFavorite,
    setFavorite,
    listSavedEntries: listFavorites,
    getSavedEntry: getFavorite,
    setSavedEntry: setFavorite,
  };
}
