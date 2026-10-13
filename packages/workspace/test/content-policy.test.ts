import { describe, expect, it } from 'vitest';
import type { EntityType, RawEntity } from '@patternverse/schema';
import {
  assertPersonal,
  assertVerseHome,
  isPersonalCreationType,
  validVerseIds,
} from '../src/authoring.js';
import {
  createBrowsableLibrary,
  createLibrary,
  createLibrarySearch,
  createPersonalSource,
  legacyRelationshipIndex,
  libraryEntryKey,
  libraryRefKey,
  type LibraryEntry,
} from '../src/library.js';

const pattern: RawEntity = {
  id: 'shared',
  sourceId: 'personal',
  type: 'pattern',
  title: 'Private pattern',
  status: 'draft',
  body: 'A private article',
  verses: ['home'],
};
const home: RawEntity = {
  id: 'home',
  sourceId: 'personal',
  type: 'verse',
  title: 'Private home',
  status: 'draft',
  body: '',
};
const external = (id: string, type: EntityType): LibraryEntry => ({
  id,
  type,
  sourceId: 'commons',
  title: `Public ${id}`,
  summary: '',
  status: 'published',
});

describe('authoring and browsing policy', () => {
  it('keeps creation separate from legacy schema support', () => {
    for (const type of ['pattern', 'collection', 'verse'])
      expect(isPersonalCreationType(type)).toBe(true);
    for (const type of ['concept', 'practice', 'unknown', '', null])
      expect(isPersonalCreationType(type)).toBe(false);
    for (const type of ['concept', 'practice'] as const) {
      const old: RawEntity = { ...pattern, type, verses: [] };
      expect(() => assertVerseHome(old, [], [])).not.toThrow();
      expect(createPersonalSource([old]).entries[0]?.type).toBe(type);
    }
  });

  it('protects public records even when their IDs match private records', () => {
    expect(() => assertPersonal({ ...pattern, sourceId: 'commons' })).toThrow('read-only');
    expect(() => assertVerseHome({ ...pattern, sourceId: 'commons' }, [home], [])).toThrow(
      'read-only',
    );
    expect(() => assertVerseHome(pattern, [home], [])).not.toThrow();
  });

  it('resolves legacy IDs before checking their type and requires every specified home', () => {
    const commons = [external('home', 'verse'), external('second', 'verse')];
    expect([...validVerseIds([home], commons)].sort()).toEqual(['home', 'second']);
    expect(() => assertVerseHome(pattern, [], commons)).not.toThrow();
    expect(() => assertVerseHome(pattern, [{ ...pattern, id: 'home' }], commons)).toThrow('Choose');
    expect(() =>
      assertVerseHome({ ...pattern, verses: ['home', 'missing'] }, [home], commons),
    ).toThrow('Choose');
    expect(() => assertVerseHome({ ...pattern, verses: [] }, [home], commons)).toThrow('Choose');
    const collection: RawEntity = { ...pattern, type: 'collection', items: [] };
    expect(() => assertVerseHome(collection, [home], commons)).not.toThrow();
    expect(() => assertVerseHome({ ...collection, verses: [] }, [home], commons)).toThrow('Choose');
  });

  it('keeps stable qualified keys distinct from legacy private-first relationship resolution', () => {
    const publicPattern = external('shared', 'pattern');
    expect(libraryEntryKey(pattern)).toBe('personal:shared');
    expect(libraryEntryKey(publicPattern)).toBe('commons:shared');
    expect(libraryRefKey({ sourceId: 'commons', entityId: 'shared' })).toBe('commons:shared');
    const local = [pattern, home];
    const commons = [publicPattern, external('fallback', 'pattern')];
    const index = legacyRelationshipIndex(local, commons);
    expect(index.get('shared')).toBe(pattern);
    expect(index.get('fallback')).toBe(commons[1]);
    expect(index.get('missing')).toBeUndefined();
    expect(local).toEqual([pattern, home]);
    expect(commons[0]).toBe(publicPattern);
  });

  it('uses the same private-first titles in search metadata without changing relationship storage', () => {
    const publicHome = external('home', 'verse');
    const source = createPersonalSource([pattern, home], [publicHome]);
    expect(
      source.searchDocuments.find((entry) => entry.entityId === pattern.id)?.verseNames,
    ).toEqual(['Private home']);
    expect(pattern.verses).toEqual(['home']);
    expect(createPersonalSource([pattern], [publicHome]).searchDocuments[0]?.verseNames).toEqual([
      'Public home',
    ]);
    const secondaryHome = { ...publicHome, sourceId: 'another-source', title: 'Secondary home' };
    expect(
      createPersonalSource([pattern], [publicHome, secondaryHome]).searchDocuments[0]?.verseNames,
    ).toEqual(['Public home']);
    expect(
      createPersonalSource([pattern], [secondaryHome, publicHome]).searchDocuments[0]?.verseNames,
    ).toEqual(['Secondary home']);
  });

  it('filters both entries and search documents in the browsing projection, leaving general readers unchanged', () => {
    const all: RawEntity[] = [
      pattern,
      home,
      { ...pattern, id: 'collection', type: 'collection', items: ['shared'] },
      { ...pattern, id: 'concept', type: 'concept' },
      { ...pattern, id: 'practice', type: 'practice' },
    ];
    const source = createPersonalSource(all);
    const general = createLibrary([source]);
    expect(general.entries).toHaveLength(5);
    const browsable = createBrowsableLibrary([source]);
    expect(browsable.entries.map((entry) => entry.type)).toEqual(['pattern', 'collection']);
    expect(browsable.searchDocuments.map((document) => document.type)).toEqual([
      'pattern',
      'collection',
    ]);
    expect(
      createLibrarySearch(browsable)
        .search('private')
        .map((entry) => entry.type),
    ).toEqual(expect.arrayContaining(['pattern', 'collection']));
    expect(createLibrarySearch(general).search('private')).toHaveLength(5);
    expect(source.entries).toHaveLength(5);
  });
});
