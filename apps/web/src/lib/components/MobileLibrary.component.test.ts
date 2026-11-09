// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RawEntity } from '@patternverse/schema';
import type { SavedLibraryEntry, WorkspaceUsefulness } from '@patternverse/workspace';
import type { EntitySummary } from '$lib/server/commons';
import WorkspaceLibrary from './WorkspaceLibrary.svelte';
import { notifyWorkspaceChanged } from '$lib/client/workspace-changes';

const local = vi.hoisted(() => ({
  entities: [] as RawEntity[],
  saved: [] as SavedLibraryEntry[],
  ratings: [] as WorkspaceUsefulness[],
  blocked: false,
  savedRead: undefined as (() => Promise<SavedLibraryEntry[]>) | undefined,
}));
vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => {
    if (local.blocked) throw new Error('Storage blocked');
    return {
      listEntities: async () => local.entities,
      listSavedEntries: async () => (local.savedRead ? local.savedRead() : local.saved),
      listUsefulness: async () => local.ratings,
      getSavedEntry: async (ref: { sourceId: string; entityId: string }) =>
        local.saved.find(
          (entry) => entry.ref.sourceId === ref.sourceId && entry.ref.entityId === ref.entityId,
        ),
      setSavedEntry: async (ref: { sourceId: string; entityId: string }, saved: boolean) => {
        local.saved = local.saved.filter(
          (entry) => entry.ref.sourceId !== ref.sourceId || entry.ref.entityId !== ref.entityId,
        );
        if (saved) local.saved.push({ ref, workspaceId: 'mine', createdAt: '2026-11-01' });
        notifyWorkspaceChanged({ origin: 'local', topics: ['saved'] });
      },
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
  local.savedRead = undefined;
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
  initialTypes: ['collection'] as const,
  mobileCollections: true,
};
const results = () => within(screen.getByRole('region', { name: 'Library results' }));

describe('Mobile collection library', () => {
  it.each([true, false])(
    'labels broader results after strict matches within the selected Verse (mobile: %s)',
    async (mobile) => {
      media.matches = mobile;
      const entries: EntitySummary[] = [
        {
          ...patterns[0],
          id: 'strict',
          title: 'Compare difficult options',
          summary: '',
          url: '/pattern/strict',
        },
        {
          ...patterns[1],
          id: 'partial',
          title: 'Compare options',
          summary: '',
          url: '/pattern/partial',
        },
        {
          ...patterns[2],
          id: 'excluded',
          title: 'Difficult options',
          summary: '',
          url: '/pattern/excluded',
        },
        {
          ...collections[0],
          title: 'Methods',
          collectionItems: [{ sourceId: 'commons', entityId: 'excluded' }],
        },
      ];
      render(WorkspaceLibrary, {
        ...props,
        commons: entries,
        commonsSearchDocuments: entries.map((entry) => ({
          ...entry,
          id: `commons:${entry.id}`,
          entityId: entry.id,
          aliases: [],
          body: '',
          verseNames: [],
          collectionNames: [],
        })),
        commonsVerses: [
          {
            id: 'chosen',
            sourceId: 'commons',
            title: 'Chosen',
            itemKeys: ['commons:strict', 'commons:partial', 'commons:collection-0'],
          },
        ],
        selectedVerse: 'commons:chosen',
        query: 'compare difficult options',
      });
      if (mobile)
        await fireEvent.click(await screen.findByRole('button', { name: 'Filter library' }));
      await fireEvent.click(screen.getByRole('button', { name: 'Patterns' }));
      const heading = await screen.findByRole('heading', { name: 'Broader matches' });
      const links = results().getAllByRole('link');
      expect(links.map((link) => link.getAttribute('href'))).toEqual([
        '/pattern/strict',
        '/pattern/partial',
      ]);
      expect(
        links[0].compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        heading.compareDocumentPosition(links[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.getByText('1 match · 1 broader match')).toBeTruthy();
      expect(screen.queryByRole('heading', { name: /No matching/ })).toBeNull();
    },
  );

  it.each([true, false])(
    'keeps Commons selected after delayed local loading (mobile: %s)',
    async (mobile) => {
      media.matches = mobile;
      local.saved = [
        {
          ref: { sourceId: 'commons', entityId: 'pattern-30' },
          workspaceId: 'mine',
          createdAt: '2026-11-02',
        },
      ];
      let release!: (saved: SavedLibraryEntry[]) => void;
      const pending = new Promise<SavedLibraryEntry[]>((resolve) => {
        release = resolve;
      });
      local.savedRead = () => pending;
      render(WorkspaceLibrary, props);
      const commonsButton = await screen.findByRole('button', { name: 'Commons' });
      expect(commonsButton.getAttribute('aria-pressed')).toBe('true');
      release(local.saved);
      await waitFor(() => expect(commonsButton.hasAttribute('disabled')).toBe(false));
      expect(commonsButton.getAttribute('aria-pressed')).toBe('true');

      // A deliberate scope choice also survives focus and workspace refreshes.
      await fireEvent.click(screen.getByRole('button', { name: /^My library/ }));
      local.saved = [];
      local.savedRead = undefined;
      await fireEvent.focus(window);
      notifyWorkspaceChanged({ origin: 'sync', topics: ['saved'] });
      await screen.findByRole('heading', { name: 'Nothing saved yet' });
      expect(screen.getByRole('button', { name: /^My library/ }).getAttribute('aria-pressed')).toBe(
        'true',
      );
    },
  );

  it('shows a bookmarked collection member in My library without saving its collection', async () => {
    const view = render(WorkspaceLibrary, props);
    const contents = await screen.findByRole('region', { name: 'Collection 1 patterns' });
    const save = within(contents).getAllByRole('button', { name: 'Add to my library' })[0];
    await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false));
    await fireEvent.click(save);
    await fireEvent.click(screen.getByRole('button', { name: 'My library' }));
    await waitFor(() => expect(results().getAllByRole('link')).toHaveLength(1));
    expect(results().getByRole('link', { name: /Pattern 31/ })).toBeTruthy();
    expect(local.saved.map((entry) => entry.ref.entityId)).toEqual(['pattern-30']);
    view.unmount();
    render(WorkspaceLibrary, props);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Commons' }).hasAttribute('disabled')).toBe(false),
    );
    expect(screen.getByRole('button', { name: 'Commons' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    await fireEvent.click(screen.getByRole('button', { name: 'My library' }));
    expect(results().getByRole('link', { name: /Pattern 31/ })).toBeTruthy();
  });

  it('includes concepts and practices in authored collection contents', async () => {
    const members: EntitySummary[] = [
      {
        ...patterns[0],
        id: 'concept-example',
        type: 'concept',
        title: 'Concept example',
        url: '/concept/concept-example',
      },
      {
        ...patterns[1],
        id: 'practice-example',
        type: 'practice',
        title: 'Practice example',
        url: '/practice/practice-example',
      },
      patterns[2],
    ];
    const collection: EntitySummary = {
      ...collections[0],
      title: 'Mixed field guide',
      collectionItems: members.map((entry) => ({ sourceId: entry.sourceId, entityId: entry.id })),
    };
    render(WorkspaceLibrary, { ...props, commons: [...members, collection] });
    const toggle = await screen.findByRole('button', { name: 'Mixed field guide 3 items' });
    if (toggle.getAttribute('aria-expanded') !== 'true') await fireEvent.click(toggle);
    const contents = within(screen.getByRole('region', { name: 'Mixed field guide items' }));
    expect(contents.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(
      members.map((entry) => `${entry.url}?collection=commons%3Acollection-0`),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Filter library' }));
    await fireEvent.click(screen.getByRole('button', { name: /^Patterns$/ }));
    expect(
      results()
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual([patterns[2].url]);
  });

  it('labels collections correctly, keeps categories distinct, and preserves the choice on resize', async () => {
    const view = render(WorkspaceLibrary, props);
    await screen.findByRole('button', { name: 'Filter library' });
    expect(screen.getByRole('heading', { name: /^Collections$/ })).toBeTruthy();
    expect(screen.getByText('5 collections')).toBeTruthy();
    const buttons = screen
      .getByRole('region', { name: /^Collections$/ })
      .querySelectorAll('.collection-toggle');
    expect(buttons).toHaveLength(5);
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(buttons[1]);
    expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(screen.getByRole('button', { name: 'Filter library' }));
    expect(screen.getByRole('button', { name: /^Collections$/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    await fireEvent.click(screen.getByRole('button', { name: /^Patterns$/ }));
    expect(screen.getByRole('heading', { name: /^Patterns$/ })).toBeTruthy();
    expect(screen.getByText('31 patterns')).toBeTruthy();
    expect(results().getAllByRole('link')).toHaveLength(31);
    await fireEvent.click(screen.getByRole('button', { name: /^Collections$/ }));
    media.matches = false;
    resize?.({ matches: false } as MediaQueryListEvent);
    await waitFor(() => expect(view.container.querySelectorAll('.card-grid > li')).toHaveLength(5));
    expect(screen.getByRole('button', { name: /^Collections$/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(results().getAllByRole('link')).toHaveLength(5);
  });

  it('keeps the Verse picker above desktop results and filters collections with it', async () => {
    media.matches = false;
    const view = render(WorkspaceLibrary, {
      ...props,
      commonsVerses: [
        {
          id: 'learning',
          sourceId: 'commons',
          title: 'Learning',
          itemKeys: ['commons:collection-0'],
        },
      ],
    });
    const picker = await screen.findByRole('region', { name: /^Choose a Verse$/ });
    const resultRegion = screen.getByRole('region', { name: 'Library results' });
    expect(
      picker.compareDocumentPosition(resultRegion) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(view.container.querySelector('.verse-sidebar')).toBeNull();
    expect(view.container.querySelector('.feed-layout')).toBeNull();
    await fireEvent.click(within(picker).getByRole('button', { name: /^Learning$/ }));
    expect(results().getAllByRole('link')).toHaveLength(1);
    expect(results().getByRole('link', { name: /Collection 1/ })).toBeTruthy();
  });

  it('shows direct collection search results and labels explicitly filtered empty results correctly', async () => {
    const view = render(WorkspaceLibrary, { ...props, query: 'Collection 1' });
    await screen.findByRole('heading', { name: 'Search results' });
    expect(screen.getByText('1 entry')).toBeTruthy();
    expect(results().getAllByRole('link')).toHaveLength(1);
    expect(
      results()
        .getByRole('link', { name: /Collection 1/ })
        .getAttribute('href'),
    ).toBe('/collection/collection-0');
    expect(screen.queryByRole('region', { name: 'Collection 1 patterns' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Filter library' }));
    await fireEvent.click(screen.getByRole('button', { name: /^Collections$/ }));
    await view.rerender({ query: 'missing collection' });
    await screen.findByRole('heading', { name: 'No matching collections' });
    expect(screen.queryByRole('heading', { name: 'No matching patterns' })).toBeNull();
  });

  it('finds individual patterns from collection browsing and returns to the collection on clearing', async () => {
    render(WorkspaceLibrary, props);
    await screen.findByRole('button', { name: 'Open search' });
    await fireEvent.click(screen.getByRole('button', { name: 'Open search' }));
    await fireEvent.input(screen.getByRole('textbox', { name: 'Search Commons' }), {
      target: { value: 'Pattern 31' },
    });
    await fireEvent.click(screen.getByRole('button', { name: /^Search$/ }));
    expect(screen.getByRole('heading', { name: 'Search results' })).toBeTruthy();
    expect(results().getAllByRole('link')).toHaveLength(1);
    expect(
      results()
        .getByRole('link', { name: /Pattern 31/ })
        .getAttribute('href'),
    ).toBe('/pattern/pattern-30');
    expect(results().getByText('pattern')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('heading', { name: /^Collections$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Collection 1 2 patterns' })).toBeTruthy();
  });

  it('keeps a multiline draft until Search is applied and restores focus when closing', async () => {
    render(WorkspaceLibrary, { ...props, initialTypes: ['pattern'] });
    await screen.findByRole('button', { name: 'Open search' });
    expect(screen.queryByRole('textbox', { name: 'Search Commons' })).toBeNull();
    const initialCount = results().getAllByRole('link').length;
    await fireEvent.click(screen.getByRole('button', { name: 'Open search' }));
    const input = screen.getByRole('textbox', { name: 'Search Commons' }) as HTMLTextAreaElement;
    await waitFor(() => expect(document.activeElement).toBe(input));
    await fireEvent.input(input, { target: { value: 'Pattern\n31' } });
    expect(results().getAllByRole('link')).toHaveLength(initialCount);
    await fireEvent.keyDown(input, { key: 'Enter', isComposing: true, ctrlKey: true });
    expect(screen.getByRole('textbox', { name: 'Search Commons' })).toBe(input);
    await fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open search' })),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Open search' }));
    expect(input.value).toBe('Pattern\n31');
    await fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
    await screen.findByRole('button', { name: 'Edit search: Pattern 31' });
    expect(results().getAllByRole('link')).toHaveLength(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Edit search: Pattern 31' }));
    expect(input.value).toBe('Pattern\n31');
    await fireEvent.click(screen.getByRole('button', { name: 'Close search' }));
    await fireEvent.click(screen.getByRole('button', { name: /^Clear search$/ }));
    expect(results().getAllByRole('link')).toHaveLength(initialCount);
  });

  it('renders every matching pattern without pagination and restores desktop pagination on resize', async () => {
    render(WorkspaceLibrary, { ...props, initialTypes: ['pattern'] });
    await screen.findByRole('button', { name: 'Filter library' });
    expect(results().getAllByRole('link')).toHaveLength(31);
    expect(results().getByText('Description 31')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Next page|Show more patterns/ })).toBeNull();
    expect(screen.queryByRole('region', { name: /^Collections$/ })).toBeNull();
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
    const collection = screen.getByRole('button', { name: 'Collection 1 2 patterns' });
    if (collection.getAttribute('aria-expanded') !== 'true') await fireEvent.click(collection);
    const contents = () => within(screen.getByRole('region', { name: 'Collection 1 patterns' }));
    expect(
      contents()
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual([
      '/pattern/pattern-30?collection=commons%3Acollection-0',
      '/pattern/pattern-0?collection=commons%3Acollection-0',
    ]);
    await fireEvent.click(screen.getByRole('button', { name: 'Filter library' }));
    await fireEvent.click(screen.getByRole('button', { name: /^Patterns$/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Filter library' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Open search' }));
    await fireEvent.input(screen.getByRole('textbox', { name: 'Search Commons' }), {
      target: { value: 'Pattern\n31' },
    });
    await fireEvent.click(screen.getByRole('button', { name: /^Search$/ }));
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
    render(WorkspaceLibrary, { ...props, scope: 'saved' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'My library' }).getAttribute('aria-pressed')).toBe(
        'true',
      ),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Filter library' }));
    await fireEvent.click(screen.getByRole('button', { name: /^Collections$/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Filter library' }));
    const collection = screen.getByRole('button', { name: 'Collection 1 2 patterns' });
    if (collection.getAttribute('aria-expanded') !== 'true') await fireEvent.click(collection);
    const contents = within(screen.getByRole('region', { name: 'Collection 1 patterns' }));
    expect(contents.getAllByRole('link')).toHaveLength(2);
    expect(contents.queryByRole('link', { name: /Private collision/ })).toBeNull();
    expect(results().getAllByRole('link')[0].getAttribute('href')).toContain(
      '/pattern/pattern-30?collection=commons',
    );
    await fireEvent.click(collection);
    expect(results().queryAllByRole('link')).toHaveLength(0);
    await fireEvent.click(screen.getByRole('button', { name: 'Filter library' }));
    await fireEvent.click(screen.getByRole('button', { name: /^Patterns$/ }));
    expect(results().getAllByRole('link')).toHaveLength(1);
    expect(results().getByRole('link', { name: /Private collision/ })).toBeTruthy();
  });

  it('uses the Verse to choose collections without dropping their cross-Verse members', async () => {
    render(WorkspaceLibrary, {
      ...props,
      commonsVerses: [
        {
          id: 'learning',
          sourceId: 'commons',
          title: 'Learning',
          itemKeys: ['commons:collection-0', 'commons:pattern-0'],
        },
        {
          id: 'creativity',
          sourceId: 'commons',
          title: 'Creativity',
          itemKeys: ['commons:pattern-30'],
        },
      ],
    });
    await screen.findByRole('button', { name: 'Filter library' });
    await fireEvent.click(
      within(screen.getByRole('region', { name: /^Choose a Verse$/ })).getByRole('button', {
        name: /^Learning$/,
      }),
    );
    const contents = await screen.findByRole('region', { name: 'Collection 1 patterns' });
    expect(within(contents).getAllByRole('link')).toHaveLength(2);
    expect(within(contents).getByText('Description 31')).toBeTruthy();
  });

  it('keeps the complete catalog browsable when local storage is unavailable', async () => {
    local.blocked = true;
    render(WorkspaceLibrary, props);
    await screen.findByText(/local workspace is unavailable/);
    expect(results().getAllByRole('link')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Filter library' })).toBeTruthy();
  });
});
