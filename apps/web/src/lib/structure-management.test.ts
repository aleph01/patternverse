import { describe, expect, it } from 'vitest';
import { createIndexedDbWorkspace, type RawEntity } from '@patternverse/workspace';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import {
  deletePersonalStructure,
  removeStructureReference,
  structureDependents,
  planStructureDeletion,
  assertVerseHome,
  type PersonalStructure,
} from './structure-management';

const verse: PersonalStructure = {
  id: 'therapy',
  title: 'Therapy',
  type: 'verse',
  status: 'draft',
  sourceId: 'personal',
  body: '',
};

const collection: PersonalStructure = {
  id: 'starter-kit',
  title: 'Starter Kit',
  type: 'collection',
  status: 'draft',
  sourceId: 'personal',
  body: '',
  items: [],
  verses: ['therapy'],
};

const pattern: RawEntity = {
  id: 'worry-exposure',
  title: 'Worry Exposure',
  type: 'pattern',
  status: 'draft',
  sourceId: 'personal',
  body: '',
  verses: ['therapy'],
};

const parentCollection: RawEntity = {
  id: 'all-favorites',
  title: 'All Favorites',
  type: 'collection',
  status: 'draft',
  sourceId: 'personal',
  body: '',
  items: ['starter-kit', 'worry-exposure'],
  verses: ['therapy'],
};

describe('personal structure management', () => {
  it('refuses to remove the last verse home', () => {
    expect(structureDependents([verse, pattern, parentCollection], verse)).toEqual([
      pattern,
      parentCollection,
    ]);
    expect(() => removeStructureReference(pattern, verse)).toThrow('Move');
    expect(
      removeStructureReference({ ...pattern, verses: ['therapy', 'creativity'] }, verse),
    ).toEqual({ ...pattern, verses: ['creativity'] });
  });

  it('finds and removes nested Collection references while preserving order', () => {
    expect(structureDependents([collection, pattern, parentCollection], collection)).toEqual([
      parentCollection,
    ]);
    expect(removeStructureReference(parentCollection, collection)).toEqual({
      ...parentCollection,
      items: ['worry-exposure'],
    });
  });

  it('requires a real destination, and moves patterns and collections without changing their content', () => {
    const commons = [{ id: 'creativity', type: 'verse', sourceId: 'commons' }];
    expect(() => planStructureDeletion([verse, pattern], verse, commons)).toThrow('Choose another');
    expect(() => planStructureDeletion([verse, pattern], verse, commons, 'therapy')).toThrow(
      'Choose another',
    );
    expect(() => planStructureDeletion([verse, pattern], verse, commons, 'missing')).toThrow(
      'Choose another',
    );
    const next = planStructureDeletion([verse, collection, pattern], verse, commons, 'creativity');
    expect(next).toEqual([
      { ...collection, verses: ['creativity'] },
      { ...pattern, verses: ['creativity'] },
    ]);
  });

  it('deletes a collection reference without deleting its patterns or their homes', () => {
    const next = planStructureDeletion(
      [verse, collection, pattern, parentCollection],
      collection,
      [],
    );
    expect(next).toContainEqual(pattern);
    expect(next).toContainEqual({ ...parentCollection, items: ['worry-exposure'] });
  });

  it('protects Commons even with a matching personal ID', () => {
    expect(() =>
      planStructureDeletion([verse, pattern], { ...verse, sourceId: 'commons' }, []),
    ).toThrow('read-only');
  });

  it('requires valid homes for personal authoring while allowing direct verse membership', () => {
    expect(() => assertVerseHome({ ...pattern, verses: [] }, [verse], [])).toThrow('Choose');
    expect(() => assertVerseHome(pattern, [], [])).toThrow('Choose');
    expect(() => assertVerseHome(pattern, [verse], [])).not.toThrow();
    expect(() => assertVerseHome(pattern, [], [{ ...verse, sourceId: 'commons' }])).not.toThrow();
    expect(() =>
      assertVerseHome(
        pattern,
        [{ ...pattern, id: 'therapy' }],
        [{ ...verse, sourceId: 'commons' }],
      ),
    ).toThrow('Choose');
  });

  it('moves and deletes atomically using the latest database snapshot', async () => {
    const workspace = createIndexedDbWorkspace({ indexedDB: new IDBFactory(), IDBKeyRange });
    await workspace.createEntity(verse);
    await workspace.createEntity(pattern);
    const another: RawEntity = { ...pattern, id: 'new-member' };
    await workspace.createEntity(another);
    await expect(deletePersonalStructure(workspace, verse, [])).rejects.toThrow('Choose another');
    await expect(workspace.getEntity(verse.id)).resolves.toEqual(verse);
    await expect(workspace.getEntity(pattern.id)).resolves.toEqual(pattern);
    await deletePersonalStructure(
      workspace,
      verse,
      [{ id: 'creativity', type: 'verse', sourceId: 'commons' }],
      'creativity',
    );
    await expect(workspace.getEntity(verse.id)).resolves.toBeUndefined();
    await expect(workspace.getEntity(another.id)).resolves.toEqual({
      ...another,
      verses: ['creativity'],
    });
    workspace.close();
  });
});
