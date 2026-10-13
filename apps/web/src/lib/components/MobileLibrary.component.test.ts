// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RawEntity } from '@patternverse/schema';
import type { SavedLibraryEntry, WorkspaceUsefulness } from '@patternverse/workspace';
import type { EntitySummary } from '$lib/server/commons';
import WorkspaceLibrary from './WorkspaceLibrary.svelte';

const local = vi.hoisted(() => ({
  entities: [] as RawEntity[],
  saved: [] as SavedLibraryEntry[],
  ratings: [] as WorkspaceUsefulness[],
  blocked: false,
}));
vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => {
    if (local.blocked) throw new Error('Storage blocked');
    return {
      listEntities: async () => local.entities,
      listSavedEntries: async () => local.saved,
      listUsefulness: async () => local.ratings,
      getSavedEntry: async (ref: { sourceId: string; entityId: string }) =>
        local.saved.find(
          (entry) => entry.ref.sourceId === ref.sourceId && entry.ref.entityId === ref.entityId,
        ),
    };
  },
}));
let resize: ((event: MediaQueryListEvent) => void) | undefined;
let media: {
  matches: boolean;
  addEventListener: (name: string, callback: typeof resize) => void;
  removeEventListener: () => void;
};
beforeEach(() => {
  local.entities = [];
  local.saved = [];
  local.ratings = [];
  local.blocked = false;
  window.localStorage.clear();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  media = {
    matches: true,
    addEventListener: (_name: string, callback: typeof resize) => {
      resize = callback;
    },
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  );
  Element.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const patterns: EntitySummary[] = Array.from({ length: 31 }, (_, i) => ({
  id: `pattern-${i}`,
  sourceId: 'commons',
  type: 'pattern',
  title: `Pattern ${i + 1}`,
  summary: `Description ${i + 1}`,
  status: 'published',
  url: `/pattern/pattern-${i}`,
}));
const collections: EntitySummary[] = Array.from({ length: 5 }, (_, i) => ({
  id: `collection-${i}`,
  sourceId: 'commons',
  type: 'collection',
  title: `Collection ${i + 1}`,
  summary: '',
  status: 'published',
  url: `/collection/collection-${i}`,
  collectionItems: [patterns[30 - i], patterns[i]].map((p) => ({
    sourceId: p.sourceId,
    entityId: p.id,
  })),
}));
const commons = [...patterns, ...collections];
const props = {
  commons,
  commonsSearchDocuments: commons.map((entry) => ({
    ...entry,
    id: `commons:${entry.id}`,
    entityId: entry.id,
    aliases: [],
    body: entry.summary,
    verseNames: [],
    collectionNames: [],
  })),
  initialTypes: ['pattern'] as const,
  mobileCollections: true,
};
const results = () => within(screen.getByRole('region', { name: 'Library results' }));

describe('Mobile collection library', () => {
  it('renders every matching pattern without pagination and restores desktop pagination on resize', async () => {
    render(WorkspaceLibrary, props);
    await screen.findByRole('button', { name: 'Filter library' });
    expect(results().getAllByRole('link')).toHaveLength(31);
    expect(results().getAllByRole('link')[30].getAttribute('href')).toBe('/pattern/pattern-30');
    expect(screen.queryByRole('button', { name: /Next page|Show more patterns/ })).toBeNull();
    const groups = screen.getAllByRole('group', { name: /^Collection group/ });
    expect(groups.map((group) => within(group).getAllByRole('button').length)).toEqual([4, 2]);
    media.matches = false;
    resize?.({ matches: false } as MediaQueryListEvent);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next page' })).toBeTruthy());
    expect(results().getAllByRole('link')).toHaveLength(20);
  });

  it('opens a collection in authored order with contextual links and combines search and ratings', async () => {
    local.ratings = [
      {
        ref: { sourceId: 'commons', entityId: 'pattern-30' },
        workspaceId: 'mine',
        usefulness: 2,
        updatedAt: '2026-10-12',
      },
    ];
    render(WorkspaceLibrary, props);
    await screen.findByRole('button', { name: 'Filter library' });
    await fireEvent.click(screen.getByRole('button', { name: 'Collection 1 2 patterns' }));
    expect(
      results()
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual([
      '/pattern/pattern-30?collection=commons%3Acollection-0',
      '/pattern/pattern-0?collection=commons%3Acollection-0',
    ]);
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'Pattern 31' } });
    expect(results().getAllByRole('link')).toHaveLength(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Filter library' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Your rating:/ }).hasAttribute('disabled')).toBe(
        false,
      ),
    );
    await fireEvent.click(screen.getByRole('button', { name: /^Your rating:/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Very useful only' }));
    expect(results().getAllByRole('link')).toHaveLength(1);
    expect(results().getByRole('link', { name: /Pattern 31/ })).toBeTruthy();
  });

  it('shows unsaved members of a saved collection without confusing colliding private IDs', async () => {
    local.saved = [
      {
        ref: { sourceId: 'commons', entityId: 'collection-0' },
        workspaceId: 'mine',
        createdAt: '2026-10-12',
      },
    ];
    local.entities = [
      {
        id: 'pattern-30',
        sourceId: 'personal',
        type: 'pattern',
        title: 'Private collision',
        status: 'draft',
        body: '',
      },
    ];
    render(WorkspaceLibrary, props);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^My library/ }).getAttribute('aria-pressed')).toBe(
        'true',
      ),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Collection 1 2 patterns' }));
    expect(results().getAllByRole('link')).toHaveLength(2);
    expect(results().queryByRole('link', { name: /Private collision/ })).toBeNull();
    expect(results().getAllByRole('link')[0].getAttribute('href')).toContain(
      '/pattern/pattern-30?collection=commons',
    );
    await fireEvent.click(screen.getByRole('button', { name: 'View all' }));
    expect(results().getAllByRole('link')).toHaveLength(1);
    expect(results().getByRole('link', { name: /Private collision/ })).toBeTruthy();
  });

  it('keeps the complete catalog browsable when local storage is unavailable', async () => {
    local.blocked = true;
    render(WorkspaceLibrary, props);
    await screen.findByText(/local workspace is unavailable/);
    expect(results().getAllByRole('link')).toHaveLength(31);
    expect(screen.getByRole('button', { name: 'Filter library' })).toBeTruthy();
  });
});
