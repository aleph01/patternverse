// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import type { SavedLibraryEntry } from '@patternverse/workspace';
import { resolve } from 'node:path';
import WorkspaceLibrary from './WorkspaceLibrary.svelte';
import { libraryBrowsingData } from '$lib/server/library-search';

const local = vi.hoisted(() => ({ saved: [] as SavedLibraryEntry[] }));
vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => ({
    listEntities: async () => [],
    listSavedEntries: async () => local.saved,
    listUsefulness: async () => [],
  }),
}));
let props: Record<string, unknown>;
let indexes: ReturnType<typeof libraryBrowsingData>['entities'];
beforeAll(async () => {
  const root = resolve(process.cwd(), '../..');
  const corpus = await loadAndCompileCorpus(
    {
      manifestPath: resolve(root, 'patternverse.yaml'),
      contentDirectory: resolve(root, 'content'),
      readonly: true,
    },
    { includeDrafts: false },
  );
  const browsing = libraryBrowsingData(corpus);
  const entities = browsing.entities.filter(
    (e) => e.id.startsWith('stats-') || e.id.startsWith('statistics'),
  );
  indexes = entities.filter(
    (e) => e.id === 'statistics-field-guide' || e.id.startsWith('statistics-section-'),
  );
  props = {
    commons: entities,
    commonsSearchDocuments: entities.map((e) => ({
      ...e,
      id: `${e.sourceId}:${e.id}`,
      entityId: e.id,
      aliases: [],
      body: e.summary,
      collectionNames: [],
      verseNames: [],
    })),
    commonsVerses: browsing.verses,
    mobileCollections: true,
    initialTypes: ['collection'],
  };
});
beforeEach(() => {
  local.saved = [];
  window.localStorage.clear();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  Element.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Nested statistics collections on mobile', () => {
  it('preserves all six indexes, child order, labels, and collection links', async () => {
    render(WorkspaceLibrary, props);
    expect(indexes).toHaveLength(6);
    for (const index of indexes) {
      const toggle = await screen.findByRole('button', {
        name: `${index.title} ${index.collectionItems!.length} collections`,
      });
      if (toggle.getAttribute('aria-expanded') !== 'true') await fireEvent.click(toggle);
      const contents = within(screen.getByRole('region', { name: `${index.title} collections` }));
      expect(contents.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(
        index.collectionItems!.map(
          (ref) => `/collection/${ref.entityId}?collection=commons%3A${index.id}`,
        ),
      );
      expect(contents.queryByText(/No available items/)).toBeNull();
    }
  });

  it('keeps unsaved child collection links inside a saved guide', async () => {
    local.saved = [
      {
        ref: { sourceId: 'commons', entityId: 'statistics-field-guide' },
        workspaceId: 'mine',
        createdAt: '2026-10-24',
      },
    ];
    render(WorkspaceLibrary, props);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'My library' }).getAttribute('aria-pressed')).toBe(
        'true',
      ),
    );
    const toggle = await screen.findByRole('button', {
      name: 'Statistics Field Guide 8 collections',
    });
    if (toggle.getAttribute('aria-expanded') !== 'true') await fireEvent.click(toggle);
    expect(
      within(
        screen.getByRole('region', { name: 'Statistics Field Guide collections' }),
      ).getAllByRole('link'),
    ).toHaveLength(8);
  });

  it('keeps pattern search results free of collection entries', async () => {
    render(WorkspaceLibrary, props);
    await fireEvent.click(await screen.findByRole('button', { name: 'Open search' }));
    await fireEvent.input(screen.getByRole('textbox', { name: 'Search Commons' }), {
      target: { value: 'uncertainty' },
    });
    await fireEvent.click(screen.getByRole('button', { name: /^Search$/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Filter library' }));
    await fireEvent.click(screen.getByRole('button', { name: /^Patterns$/ }));
    const results = within(screen.getByRole('region', { name: 'Library results' })).getAllByRole(
      'link',
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((a) => a.getAttribute('href')!.startsWith('/pattern/'))).toBe(true);
  });
});
