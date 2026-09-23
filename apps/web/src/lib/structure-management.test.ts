import { describe, expect, it, vi } from 'vitest';
import type { LocalWorkspace, RawEntity } from '@patternverse/workspace';
import {
  deletePersonalStructure,
  removeStructureReference,
  structureDependents,
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
};

describe('personal structure management', () => {
  it('finds and removes Verse memberships without changing the stable entity ID', () => {
    expect(structureDependents([verse, pattern, parentCollection], verse)).toEqual([pattern]);
    expect(removeStructureReference(pattern, verse)).toEqual({ ...pattern, verses: undefined });
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

  it('cleans dependents before deleting the structure', async () => {
    const calls: string[] = [];
    const workspace = {
      updateEntity: vi.fn(async (id: string, transform: (entity: RawEntity) => RawEntity) => {
        calls.push(`update:${id}`);
        return transform(pattern);
      }),
      deleteEntity: vi.fn(async (id: string) => {
        calls.push(`delete:${id}`);
        return true;
      }),
    } as unknown as LocalWorkspace;

    await expect(deletePersonalStructure(workspace, [verse, pattern], verse)).resolves.toBe(1);
    expect(calls).toEqual(['update:worry-exposure', 'delete:therapy']);
  });
});
