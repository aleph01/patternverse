// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RawEntity } from '@patternverse/schema';
import type { SavedLibraryEntry, WorkspaceUsefulness } from '@patternverse/workspace';
import type { EntitySummary } from '$lib/server/commons';
import WorkspaceLibrary from './WorkspaceLibrary.svelte';
import { notifyWorkspaceChanged, WORKSPACE_DATA_TOPICS } from '$lib/client/workspace-changes';

const local = vi.hoisted(() => ({
  entities: [] as RawEntity[],
  saved: [] as SavedLibraryEntry[],
  unavailable: false,
  ratings: [] as WorkspaceUsefulness[],
  ratingsUnavailable: false,
}));
vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => {
    if (local.unavailable) throw new Error('Storage blocked');
    return {
      listEntities: async () => local.entities,
      listSavedEntries: async () => local.saved,
      listUsefulness: async () => {
        if (local.ratingsUnavailable) throw new Error('Ratings blocked');
        return local.ratings;
      },
    };
  },
}));
beforeEach(() => {
  local.entities = [];
  local.saved = [];
  local.unavailable = false;
  local.ratings = [];
  local.ratingsUnavailable = false;
  window.localStorage.clear();
});
afterEach(cleanup);

const commons: EntitySummary[] = ['observer', 'builder'].map((id) => ({
  id,
  sourceId: 'commons',
  title: id === 'observer' ? 'Observer' : 'Builder',
  type: 'pattern',
  summary: `About ${id}`,
  status: 'published',
  url: `/pattern/${id}`,
}));
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
  commonsVerses: [
    { id: 'software', sourceId: 'commons', title: 'Software', itemKeys: ['commons:observer'] },
  ],
};

describe('My library and Explore', () => {
  it('keeps legacy concepts and practices out of browsing and search without hiding private patterns', async () => {
    const base: RawEntity = {
      id: 'legacy',
      sourceId: 'personal',
      type: 'pattern',
      title: 'Kept private pattern',
      status: 'draft',
      body: 'Shared search term',
    };
    local.entities = [
      base,
      { ...base, id: 'old-concept', title: 'Old concept', type: 'concept' },
      { ...base, id: 'old-practice', title: 'Old practice', type: 'practice' },
    ];
    render(WorkspaceLibrary, props);
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Kept private pattern/ })).toBeTruthy(),
    );
    await fireEvent.input(screen.getByRole('searchbox'), {
      target: { value: 'Shared search term' },
    });
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByRole('link', { name: /Old concept|Old practice/ })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Explore' }));
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(local.entities).toHaveLength(3);
  });
  it('filters while typing and clears without changing the current filters or losing input focus', async () => {
    render(WorkspaceLibrary, props);
    await waitFor(() => expect(screen.getByText('2 entries')).toBeTruthy());
    const search = screen.getByRole('searchbox');
    const form = screen.getByRole('search');
    expect(within(form).queryByRole('button')).toBeNull();
    await fireEvent.input(search, { target: { value: 'Observer' } });
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Observer/ })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Software' }));
    await fireEvent.click(within(form).getByRole('button', { name: 'Clear search' }));
    expect((search as HTMLInputElement).value).toBe('');
    expect(document.activeElement).toBe(search);
    expect(screen.getByRole('button', { name: 'Software' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(within(form).queryByRole('button')).toBeNull();
    await fireEvent.input(search, { target: { value: 'no matches' } });
    expect(screen.queryByRole('link')).toBeNull();
    await fireEvent.keyDown(search, { key: 'Escape' });
    expect((search as HTMLInputElement).value).toBe('');
    expect(document.activeElement).toBe(search);
    expect(screen.getByRole('link', { name: /Observer/ })).toBeTruthy();
  });

  const rating = (
    entityId: string,
    usefulness: 0 | 1 | 2,
    sourceId = 'commons',
  ): WorkspaceUsefulness => ({
    ref: { sourceId, entityId },
    workspaceId: 'mine',
    usefulness,
    updatedAt: '2026-10-06',
  });
  async function chooseRating(label: string) {
    await fireEvent.click(screen.getByRole('button', { name: /^Your rating:/ }));
    await fireEvent.click(screen.getByRole('button', { name: label }));
  }

  it('combines useful thresholds with verse, search, scopes, and view switching', async () => {
    local.ratings = [rating('observer', 2), rating('builder', 1)];
    local.saved = [
      {
        ref: { sourceId: 'commons', entityId: 'builder' },
        workspaceId: 'mine',
        createdAt: '2026-10-06',
      },
    ];
    render(WorkspaceLibrary, props);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Your rating:/ }).hasAttribute('disabled')).toBe(
        false,
      ),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Explore' }));
    await chooseRating('Useful or better');
    expect(screen.getAllByRole('link')).toHaveLength(2);
    await chooseRating('Very useful only');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Observer/ })).toBeTruthy();
    await chooseRating('Useful or better');
    await fireEvent.click(screen.getByRole('button', { name: /^My library/ }));
    expect(screen.getByRole('link', { name: /Builder/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Observer/ })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Explore' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Software' }));
    expect(screen.getAllByRole('link')).toHaveLength(1);
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'Observer' } });
    await fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByRole('link', { name: /Observer/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Your rating:/ }).textContent).toContain('Useful +');
  });

  it('defaults to any, excludes unrated/negative ratings, and separates source identities', async () => {
    local.ratings = [rating('observer', 2, 'personal'), rating('builder', 0)];
    render(WorkspaceLibrary, props);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Your rating:/ }).hasAttribute('disabled')).toBe(
        false,
      ),
    );
    expect(screen.getAllByRole('link')).toHaveLength(2);
    await chooseRating('Useful or better');
    expect(screen.queryByRole('link')).toBeNull();
    await chooseRating('Any rating');
    expect(screen.getAllByRole('link')).toHaveLength(2);
    local.ratings = [rating('observer', 1)];
    notifyWorkspaceChanged({ origin: 'local', topics: WORKSPACE_DATA_TOPICS });
    await chooseRating('Useful or better');
    await waitFor(() => expect(screen.getByRole('link', { name: /Observer/ })).toBeTruthy());
  });

  it('keeps browsing available if only rating storage fails', async () => {
    local.ratingsUnavailable = true;
    render(WorkspaceLibrary, props);
    await waitFor(() => expect(screen.getByText('2 entries')).toBeTruthy());
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /^Your rating:/ }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('browses without save buttons and retains verse/search/layout across scopes', async () => {
    const view = render(WorkspaceLibrary, props);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^My library/ }).hasAttribute('disabled')).toBe(
        false,
      ),
    );
    expect(screen.queryByRole('button', { name: /Add .*my library/ })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Software' }));
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'Observer' } });
    // Saving happens on an opened article; browsing refreshes from the same notification.
    local.saved = [
      {
        ref: { sourceId: 'commons', entityId: 'observer' },
        workspaceId: 'mine',
        createdAt: '2026-10-06',
      },
    ];
    notifyWorkspaceChanged({ origin: 'local', topics: WORKSPACE_DATA_TOPICS });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^My library/ }).textContent).toContain('1'),
    );
    await fireEvent.click(screen.getByRole('button', { name: /^My library/ }));
    expect(screen.getByRole('searchbox').getAttribute('placeholder')).toBe('Search your library');
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Observer');
    expect(screen.getByRole('button', { name: 'Software' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByText('In my library')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(view.container.querySelector('.card-grid')).toBeNull();
    expect(screen.queryByRole('button', { name: /Remove .*my library/ })).toBeNull();
    local.saved = [];
    notifyWorkspaceChanged({ origin: 'local', topics: WORKSPACE_DATA_TOPICS });
    await waitFor(() => expect(screen.queryByRole('link')).toBeNull());
  });

  it('defaults to My library with existing favorites and private patterns, without source collisions', async () => {
    local.saved = [
      {
        ref: { sourceId: 'commons', entityId: 'builder' },
        workspaceId: 'mine',
        createdAt: '2026-10-06',
      },
    ];
    local.entities = [
      {
        id: 'observer',
        sourceId: 'personal',
        title: 'My Observer',
        type: 'pattern',
        status: 'draft',
        body: 'Private',
        sourcePath: 'observer.md',
        verses: ['software'],
      },
    ];
    render(WorkspaceLibrary, props);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^My library/ }).getAttribute('aria-pressed')).toBe(
        'true',
      ),
    );
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /My Observer/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /commons Observer/ })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Software' }));
    expect(screen.getAllByRole('link')).toHaveLength(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Explore' }));
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('shows only verses containing a saved pattern or collection in My library, independently of search and category filters', async () => {
    const collection: EntitySummary = {
      id: 'methods',
      sourceId: 'commons',
      title: 'Methods collection',
      type: 'collection',
      summary: 'Useful methods',
      status: 'published',
      url: '/collection/methods',
    };
    local.saved = ['observer', 'methods'].map((entityId) => ({
      ref: { sourceId: 'commons', entityId },
      workspaceId: 'mine',
      createdAt: '2026-10-08',
    }));
    render(WorkspaceLibrary, {
      ...props,
      initialTypes: ['pattern'],
      commons: [...commons, collection],
      commonsSearchDocuments: [
        ...props.commonsSearchDocuments,
        {
          ...collection,
          id: 'commons:methods',
          entityId: 'methods',
          aliases: [],
          body: collection.summary,
          verseNames: [],
          collectionNames: [],
        },
      ],
      commonsVerses: [
        ...props.commonsVerses,
        {
          id: 'methods-verse',
          sourceId: 'commons',
          title: 'Methods',
          itemKeys: ['commons:methods'],
        },
        { id: 'building', sourceId: 'commons', title: 'Building', itemKeys: ['commons:builder'] },
        { id: 'empty', sourceId: 'commons', title: 'Empty verse', itemKeys: [] },
      ],
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^My library/ }).getAttribute('aria-pressed')).toBe(
        'true',
      ),
    );
    const sidebar = within(screen.getByRole('complementary', { name: 'Browse verses' }));
    expect(sidebar.getByRole('button', { name: 'Software' })).toBeTruthy();
    expect(sidebar.getByRole('button', { name: 'Methods' })).toBeTruthy();
    expect(sidebar.queryByRole('button', { name: 'Building' })).toBeNull();
    expect(sidebar.queryByRole('button', { name: 'Empty verse' })).toBeNull();
    expect(
      Array.from((screen.getByLabelText('Verse') as HTMLSelectElement).options).map(
        ({ text }) => text,
      ),
    ).toEqual(['All verses', 'Software', 'Methods']);
    await fireEvent.input(screen.getByRole('searchbox'), {
      target: { value: 'No matching title' },
    });
    expect(sidebar.getByRole('button', { name: 'Methods' })).toBeTruthy();
    expect(sidebar.getByRole('button', { name: 'Software' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Explore' }));
    expect(sidebar.getByRole('button', { name: 'Building' })).toBeTruthy();
    expect(sidebar.getByRole('button', { name: 'Empty verse' })).toBeTruthy();
    await fireEvent.click(sidebar.getByRole('button', { name: 'Building' }));
    await fireEvent.click(screen.getByRole('button', { name: /^My library/ }));
    await waitFor(() =>
      expect(sidebar.getByRole('button', { name: 'All verses' }).getAttribute('aria-pressed')).toBe(
        'true',
      ),
    );
  });

  it('removes a verse when its last saved entry is removed and resets that verse filter', async () => {
    local.saved = commons.map(({ id }) => ({
      ref: { sourceId: 'commons', entityId: id },
      workspaceId: 'mine',
      createdAt: '2026-10-08',
    }));
    render(WorkspaceLibrary, {
      ...props,
      commonsVerses: [
        ...props.commonsVerses,
        { id: 'building', sourceId: 'commons', title: 'Building', itemKeys: ['commons:builder'] },
      ],
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^My library/ }).getAttribute('aria-pressed')).toBe(
        'true',
      ),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Software' }));
    local.saved = local.saved.filter(({ ref }) => ref.entityId !== 'observer');
    notifyWorkspaceChanged({ origin: 'local', topics: WORKSPACE_DATA_TOPICS });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Software' })).toBeNull());
    expect(screen.getByRole('button', { name: 'All verses' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('link', { name: /Builder/ })).toBeTruthy();
    local.saved = [];
    notifyWorkspaceChanged({ origin: 'local', topics: WORKSPACE_DATA_TOPICS });
    await waitFor(() =>
      expect(screen.queryByRole('complementary', { name: 'Browse verses' })).toBeNull(),
    );
    expect(screen.queryByLabelText('Verse')).toBeNull();
  });

  it('keeps catalog browsing available when local storage is blocked', async () => {
    local.unavailable = true;
    render(WorkspaceLibrary, props);
    await waitFor(() => expect(screen.getByText(/local workspace is unavailable/)).toBeTruthy());
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Add .*my library/ })).toBeNull();
  });

  it('keeps colliding private/public verse selections distinct after catalog projection', async () => {
    local.entities = [
      {
        id: 'software',
        sourceId: 'personal',
        title: 'My software',
        type: 'verse',
        status: 'draft',
        body: '',
      },
      {
        id: 'observer',
        sourceId: 'personal',
        title: 'Private observer',
        type: 'pattern',
        status: 'draft',
        body: '',
        verses: ['software'],
      },
    ];
    local.saved = [
      {
        ref: { sourceId: 'commons', entityId: 'observer' },
        workspaceId: 'mine',
        createdAt: '2026-10-11',
      },
    ];
    render(WorkspaceLibrary, props);
    await screen.findByRole('link', { name: /Private observer/ });
    await fireEvent.click(screen.getByRole('button', { name: 'My software · Mine' }));
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Private observer/ }).getAttribute('href')).toBe(
      '/editor?id=observer',
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Software' }));
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Observer/ }).getAttribute('href')).toBe(
      '/pattern/observer',
    );
  });

  it('rebuilds relationship search metadata after personal content changes without changing the chosen scope', async () => {
    render(WorkspaceLibrary, props);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Your rating:/ }).hasAttribute('disabled')).toBe(
        false,
      ),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Explore' }));
    local.entities = [
      {
        id: 'private',
        sourceId: 'personal',
        title: 'Private idea',
        type: 'pattern',
        status: 'draft',
        body: '',
        verses: ['software'],
      },
      {
        id: 'methods',
        sourceId: 'personal',
        title: 'Nebula methods',
        type: 'collection',
        status: 'draft',
        body: '',
        items: ['private'],
        verses: ['software'],
      },
    ];
    notifyWorkspaceChanged({ origin: 'sync', topics: ['entities'] });
    await screen.findByRole('link', { name: /Private idea/ });
    expect(screen.getByRole('button', { name: 'Explore' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Patterns' }));
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'Nebula methods' } });
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Private idea/ })).toBeTruthy();
    local.entities = local.entities.filter((entry) => entry.id !== 'methods');
    notifyWorkspaceChanged({ origin: 'sync', topics: ['entities'] });
    await waitFor(() => expect(screen.queryByRole('link')).toBeNull());
  });
});
