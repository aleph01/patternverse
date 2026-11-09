import { expect, it } from 'vitest';
import { createLibrarySearch, type Library } from '../src/library.js';

it('does not read the full corpus for browsing and indexes it once for repeated full-text queries', () => {
  let reads = 0;
  const entry = {
    id: 'example',
    sourceId: 'commons',
    type: 'pattern' as const,
    status: 'published' as const,
    title: 'Example',
    summary: 'Summary',
  };
  const library: Library = {
    entries: [entry],
    sources: [],
    get searchDocuments() {
      reads++;
      return [
        {
          ...entry,
          id: 'commons:example',
          entityId: 'example',
          aliases: ['Alternate'],
          tags: ['tagged'],
          body: 'A body-only nebula',
          verseNames: ['Learning'],
          collectionNames: ['Methods'],
        },
      ];
    },
  };
  const search = createLibrarySearch(library);
  expect(search.search('').map(({ id }) => id)).toEqual(['example']);
  expect(reads).toBe(0);
  for (const query of ['nebula', 'Alternate', 'tagged', 'Learning', 'Methods'])
    expect(search.search(query).map(({ id }) => id)).toEqual(['example']);
  expect(reads).toBe(1);
});
