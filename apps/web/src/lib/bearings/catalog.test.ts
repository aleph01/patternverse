// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { rawEntitySchema } from '@patternverse/schema';
import { bearingsCatalog, personalBearingsCatalog, mergeBearingsCatalog } from './catalog';
import { compileCorpus } from '@patternverse/compiler/references';
import { filterLibrary, libraryGroups } from './library';

it('keeps private patterns source-qualified and finds their authored practices', () => {
  const pattern = rawEntitySchema.parse({
    sourceId: 'personal',
    id: 'a-pause',
    type: 'pattern',
    title: 'My pause',
    summary: 'Private pattern',
    status: 'draft',
    body: 'A way to make room.',
  });
  const practice = rawEntitySchema.parse({
    sourceId: 'personal',
    id: 'try-a-pause',
    type: 'practice',
    title: 'Try my pause',
    summary: 'A private exercise',
    status: 'draft',
    implements: ['a-pause'],
    body: '```patternverse-language\n:language 1\n!ask {\nWhat helps?\n}\n-> end\n```',
  });
  const catalog = personalBearingsCatalog([pattern, practice]);
  expect(catalog).toHaveLength(1);
  expect(catalog[0]).toMatchObject({
    sourceId: 'personal',
    id: 'a-pause',
    practices: [{ sourceId: 'personal', id: 'try-a-pause', title: 'Try my pause' }],
  });
  expect(catalog[0]?.practices[0]?.source).toContain('What helps?');
});

it('includes published patterns in private collections without losing their executable practices', () => {
  const published = rawEntitySchema.parse({
    sourceId: 'commons',
    id: 'a-pause',
    type: 'pattern',
    title: 'Published pause',
    summary: 'Take a pause',
    status: 'published',
    body: '',
  });
  const publicCollection = rawEntitySchema.parse({
    sourceId: 'commons',
    id: 'pauses',
    type: 'collection',
    title: 'Pauses',
    summary: 'Pausing patterns',
    status: 'published',
    items: ['a-pause'],
    body: '',
  });
  const refs = compileCorpus(
    [published, publicCollection].map((entity) => ({ ...entity, wikiLinks: [] })),
    [{ id: 'commons', name: 'Commons', readonly: true }],
  ).entities;
  const practice = {
    sourceId: 'commons',
    id: 'pause-practice',
    title: 'Try pausing',
    source: ':language 1\n!ask {\nWhat helps?\n}\n-> end',
  };
  const publishedCatalog = bearingsCatalog(refs).map((pattern) => ({
    ...pattern,
    practices: [practice],
  }));
  const own = rawEntitySchema.parse({
    sourceId: 'personal',
    id: 'my-other-pause',
    type: 'pattern',
    title: 'My different pause',
    summary: 'A private pattern',
    status: 'draft',
    body: '',
  });
  const collection = rawEntitySchema.parse({
    sourceId: 'personal',
    id: 'mine',
    type: 'collection',
    title: 'My collection',
    summary: 'My chosen patterns',
    status: 'draft',
    items: ['pauses'],
    body: '',
  });
  const catalog = mergeBearingsCatalog(
    publishedCatalog,
    personalBearingsCatalog([own, collection], refs),
  );
  expect(filterLibrary(catalog, '', 'personal:mine').map((pattern) => pattern.sourceId)).toEqual([
    'commons',
  ]);
  expect(filterLibrary(catalog, '', 'personal:mine')[0]?.practices).toEqual([practice]);
});

it('browses by verse and nested collection without mixing source-qualified groups', () => {
  const entity = (value: Record<string, unknown>) =>
    rawEntitySchema.parse({
      sourceId: 'personal',
      status: 'draft',
      summary: 'A library group',
      body: '',
      ...value,
    });
  const catalog = personalBearingsCatalog([
    entity({ id: 'work', type: 'verse', title: 'Work' }),
    entity({ id: 'life', type: 'verse', title: 'Life' }),
    entity({
      id: 'all-work',
      type: 'collection',
      title: 'Work collection',
      items: ['small-steps'],
      verses: ['work'],
    }),
    entity({ id: 'small-steps', type: 'collection', title: 'Small steps', items: ['a-pause'] }),
    entity({ id: 'a-pause', type: 'pattern', title: 'A pause', verses: ['work'] }),
    entity({ id: 'rest', type: 'pattern', title: 'Rest', verses: ['life'] }),
  ]);
  expect(filterLibrary(catalog, 'personal:work', 'personal:all-work').map((p) => p.id)).toEqual([
    'a-pause',
  ]);
  expect(filterLibrary(catalog, 'personal:life', 'personal:all-work')).toEqual([]);
  expect(filterLibrary(catalog, 'commons:work', '')).toEqual([]);
  expect(libraryGroups(catalog, 'collections').map((g) => [g.key, g.count])).toEqual([
    ['personal:small-steps', 1],
    ['personal:all-work', 1],
  ]);
  expect(filterLibrary(catalog, 'personal:work', '', 'missing')).toEqual([]);
});
