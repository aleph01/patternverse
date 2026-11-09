import { expect, it } from 'vitest';
import type { EntitySummary } from '$lib/server/commons';
import { createWorkspaceLibraryCatalog, workspaceLibraryView } from './workspace-library-view';

it('keeps Verse tags source-qualified through browsing and search, including personal entries', () => {
  const commons: EntitySummary[] = [
    {
      id: 'shared',
      sourceId: 'commons',
      type: 'pattern',
      title: 'Public pattern',
      summary: 'Public summary',
      status: 'published',
      url: '/pattern/shared',
    },
    {
      id: 'methods',
      sourceId: 'commons',
      type: 'collection',
      title: 'Public collection',
      summary: 'Public summary',
      status: 'published',
      url: '/collection/methods',
    },
  ];
  const catalog = createWorkspaceLibraryCatalog({
    commons,
    commonsSearchDocuments: commons.map((entry) => ({
      ...entry,
      id: `commons:${entry.id}`,
      entityId: entry.id,
      aliases: [],
      body: entry.summary,
      verseNames: ['Public Verse'],
      collectionNames: [],
    })),
    commonsVerses: [],
    personal: [
      {
        id: 'shared',
        sourceId: 'personal',
        type: 'pattern',
        title: 'Private pattern',
        status: 'draft',
        body: 'Private summary',
        verses: ['private-verse'],
      },
      {
        id: 'private-verse',
        sourceId: 'personal',
        type: 'verse',
        title: 'Private Verse',
        status: 'published',
        body: '',
      },
    ],
    editorHref: '/editor',
  });
  for (const query of ['', 'pattern']) {
    const view = workspaceLibraryView(catalog, {
      savedEntries: [],
      ratings: [],
      scope: 'explore',
      selectedVerse: 'all',
      query,
      category: 'all',
      initialCategory: 'all',
      ratingFilter: 'any',
      showControls: true,
      featuredRank: new Map(),
    });
    expect(
      view.results.find((entry) => entry.id === 'shared' && entry.sourceId === 'commons')
        ?.verseNames,
    ).toEqual(['Public Verse']);
    expect(
      view.results.find((entry) => entry.id === 'shared' && entry.sourceId === 'personal')
        ?.verseNames,
    ).toEqual(['Private Verse']);
    if (!query)
      expect(view.results.find((entry) => entry.type === 'collection')?.verseNames).toEqual([
        'Public Verse',
      ]);
  }
});
