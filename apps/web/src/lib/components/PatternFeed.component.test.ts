// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EntityList from './EntityList.svelte';
import WorkspaceLibrary from './WorkspaceLibrary.svelte';
import type { EntitySummary } from '$lib/server/commons';
import type { LibrarySearchDocument } from '@patternverse/workspace/library';
import type { RawEntity } from '@patternverse/schema';

const local = vi.hoisted(() => ({ entities: [] as RawEntity[] }));

vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => ({
    listEntities: async () => local.entities,
    listSavedEntries: async () => [],
    listUsefulness: async () => [],
  }),
}));
beforeEach(() => {
  local.entities = [];
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const items: EntitySummary[] = ['observer', 'builder'].map((id) => ({
  id,
  title: id === 'observer' ? 'Observer' : 'Builder',
  type: 'pattern',
  sourceId: 'commons',
  summary: `About ${id}`,
  status: 'published',
  url: `/pattern/${id}`,
}));
const docs: LibrarySearchDocument[] = items.map((item) => ({
  ...item,
  id: `commons:${item.id}`,
  entityId: item.id,
  aliases: [],
  body: item.summary,
  verseNames: ['Software Engineering'],
  collectionNames: ['GoF Design Patterns'],
}));

describe('Pattern feed', () => {
  it('excludes Commons and personal verses/concepts/practices from All, search and My library', async () => {
    const hidden = (['verse', 'concept', 'practice'] as const).map((type) => ({
      ...items[0],
      id: `hidden-${type}`,
      title: `Hidden ${type}`,
      type,
      url: `/${type}/hidden-${type}`,
    }));
    local.entities = hidden.map((entry) => ({
      ...entry,
      sourceId: 'personal',
      body: entry.summary,
      sourcePath: `${entry.id}.md`,
    }));
    render(WorkspaceLibrary, {
      commons: [...items, ...hidden],
      commonsSearchDocuments: [
        ...docs,
        ...hidden.map((entry) => ({
          ...docs[0],
          ...entry,
          id: `commons:${entry.id}`,
          entityId: entry.id,
        })),
      ],
    });
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(2));
    const categories = screen.getByRole('navigation', { name: 'Library categories' });
    expect(
      within(categories)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['All', 'Collections', 'Patterns']);
    expect(within(categories).queryByRole('button', { name: 'Concepts' })).toBeNull();
    expect(within(categories).queryByRole('button', { name: 'Practices' })).toBeNull();
    expect(screen.getByText('2 entries · 0 mine · 2 commons')).toBeTruthy();
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'Hidden' } });
    await waitFor(() => expect(screen.getByText('No matching patterns')).toBeTruthy());
    expect(screen.queryByRole('link')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    await fireEvent.click(screen.getByRole('button', { name: /^My library/ }));
    expect(screen.queryByRole('link')).toBeNull();
    expect(local.entities).toHaveLength(3);
  });
  it('shows Explore without a redundant clear action for an empty personal library', async () => {
    render(WorkspaceLibrary, { commons: items, commonsSearchDocuments: docs });
    await screen.findByRole('link', { name: /Observer/ });
    await fireEvent.click(screen.getByRole('button', { name: /^My library/ }));
    expect(screen.getByRole('heading', { name: 'Nothing saved yet' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Explore' }));
    expect(screen.getByRole('link', { name: /Observer/ })).toBeTruthy();
  });
  it('shows collections and patterns within a selected Verse, without the Verse itself', async () => {
    const verse: EntitySummary = {
      ...items[0],
      id: 'software',
      title: 'Software Engineering',
      type: 'verse',
      url: '/verse/software',
    };
    const collection: EntitySummary = {
      ...items[0],
      id: 'gof',
      title: 'GoF Design Patterns',
      type: 'collection',
      url: '/collection/gof',
    };
    render(WorkspaceLibrary, {
      commons: [...items, collection, verse],
      commonsSearchDocuments: [
        ...docs,
        ...[collection, verse].map((entry) => ({
          ...docs[0],
          ...entry,
          id: `commons:${entry.id}`,
          entityId: entry.id,
        })),
      ],
      commonsVerses: [
        {
          ...verse,
          itemKeys: ['commons:observer', 'commons:gof'],
        },
      ],
    });
    const results = () => within(screen.getByRole('region', { name: 'Library results' }));
    await waitFor(() => expect(results().getAllByRole('link')).toHaveLength(3));
    expect(results().queryByRole('link', { name: /Software Engineering/ })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Software Engineering' }));
    expect(results().getAllByRole('link')).toHaveLength(2);
    expect(results().getByRole('link', { name: /Observer/ })).toBeTruthy();
    expect(results().getByRole('link', { name: /GoF Design Patterns/ })).toBeTruthy();
    expect(results().queryByRole('link', { name: /Software Engineering/ })).toBeNull();
    await fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Library categories' })).getByRole('button', {
        name: 'Collections',
      }),
    );
    expect(results().getAllByRole('link')).toHaveLength(1);
    await fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Library categories' })).getByRole('button', {
        name: 'All',
      }),
    );
    expect(results().getAllByRole('link')).toHaveLength(2);
    await fireEvent.change(screen.getByRole('combobox', { name: 'Verse' }), {
      target: { value: 'all' },
    });
    expect(results().getAllByRole('link')).toHaveLength(3);
  });
  it('has whole-row article links, small decorative marks, and no save/preview controls', () => {
    const { container } = render(EntityList, { items });
    expect(screen.getByRole('link', { name: /Observer/ }).getAttribute('href')).toBe(
      '/pattern/observer',
    );
    expect(container.querySelectorAll('.feed-mark')).toHaveLength(2);
    expect(container.querySelectorAll('.feed-mark svg[aria-hidden="true"]')).toHaveLength(2);
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('.index')).toBeNull();
  });
  it('preserves compact article relationship lists', () => {
    const { container } = render(EntityList, { items, compact: true });
    expect(container.querySelector('.entity-list.compact')).toBeTruthy();
    expect(container.querySelector('.feed-mark')).toBeNull();
  });
  it('filters actual verse membership and combines it with search on either layout', async () => {
    render(WorkspaceLibrary, {
      commons: items,
      commonsSearchDocuments: docs,
      initialTypes: ['pattern'],
      commonsVerses: [
        {
          id: 'behavioral',
          sourceId: 'commons',
          title: 'Behavioral',
          itemKeys: ['commons:observer'],
        },
        {
          id: 'creational',
          sourceId: 'commons',
          title: 'Creational',
          itemKeys: ['commons:builder'],
        },
      ],
    });
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(2));
    await fireEvent.click(screen.getByRole('button', { name: 'Behavioral' }));
    expect(
      within(screen.getByRole('navigation', { name: 'Library categories' })).queryByRole('button', {
        name: 'Verses',
      }),
    ).toBeNull();
    expect(screen.getByRole('link', { name: /Observer/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Builder/ })).toBeNull();
    await fireEvent.change(screen.getByRole('combobox', { name: 'Verse' }), {
      target: { value: 'commons:creational' },
    });
    expect(screen.getByRole('link', { name: /Builder/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Observer/ })).toBeNull();
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'Observer' } });
    expect(screen.queryByRole('link')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(
      within(screen.getByRole('navigation', { name: 'Library categories' }))
        .getByRole('button', { name: 'Patterns' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
  it('defaults to cards, switches without resetting filters, and remembers the choice', async () => {
    const props = {
      commons: items,
      commonsSearchDocuments: docs,
      initialTypes: ['pattern'] as const,
      commonsVerses: [
        {
          id: 'software',
          sourceId: 'commons',
          title: 'Software Engineering',
          itemKeys: ['commons:observer'],
        },
      ],
    };
    const first = render(WorkspaceLibrary, props);
    expect(screen.getByRole('button', { name: 'Cards' }).getAttribute('aria-pressed')).toBe('true');
    expect(first.container.querySelector('.card-grid')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Software Engineering' }));
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'Observer' } });
    await fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(first.container.querySelector('.card-grid')).toBeNull();
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Observer');
    expect(
      screen.getByRole('button', { name: 'Software Engineering' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    await fireEvent.click(screen.getByRole('button', { name: /^My library/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Cards' }));
    expect(screen.getByRole('button', { name: /^My library/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.queryByRole('link')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'List' }));
    first.unmount();
    const second = render(WorkspaceLibrary, props);
    expect(screen.getByRole('button', { name: 'List' }).getAttribute('aria-pressed')).toBe('true');
    expect(second.container.querySelector('.card-grid')).toBeNull();
  });
  it('keeps browsing usable when saving preferences is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { container } = render(WorkspaceLibrary, {
      commons: items,
      commonsSearchDocuments: docs,
    });
    expect(container.querySelector('.card-grid')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(container.querySelector('.card-grid')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
  it('keeps homepage recommendations in their existing list layout', () => {
    const { container } = render(WorkspaceLibrary, {
      commons: items,
      commonsSearchDocuments: docs,
      showControls: false,
    });
    expect(container.querySelector('.pattern-feed')).toBeTruthy();
    expect(container.querySelector('.card-grid')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Library view' })).toBeNull();
  });
  it('keeps card links and marks accessible without adding save or preview controls', () => {
    const { container } = render(EntityList, { items, layout: 'cards' });
    expect(container.querySelectorAll('.card-grid > li > a')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Observer/ }).getAttribute('href')).toBe(
      '/pattern/observer',
    );
    expect(container.querySelectorAll('.feed-mark svg[aria-hidden="true"]')).toHaveLength(2);
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('uses source-qualified verse memberships for personal and Commons content without listing verses', async () => {
    local.entities = [
      {
        id: 'software',
        title: 'My software',
        type: 'verse',
        sourceId: 'personal',
        status: 'draft',
        body: '',
        sourcePath: 'software.md',
      },
      {
        id: 'observer',
        title: 'My observer',
        type: 'pattern',
        sourceId: 'personal',
        status: 'draft',
        body: '',
        sourcePath: 'observer.md',
        verses: ['software'],
      },
      {
        id: 'extra',
        title: 'Shared-verse note',
        type: 'pattern',
        sourceId: 'personal',
        status: 'draft',
        body: '',
        sourcePath: 'extra.md',
        verses: ['commons-only'],
      },
    ];
    render(WorkspaceLibrary, {
      commons: [
        ...items,
        {
          id: 'software',
          title: 'Software Engineering',
          type: 'verse',
          summary: 'Patterns for software design.',
          sourceId: 'commons',
          status: 'published',
          url: '/verse/software',
        },
      ],
      commonsSearchDocuments: docs,
      commonsVerses: [
        {
          id: 'software',
          title: 'Software Engineering',
          sourceId: 'commons',
          itemKeys: ['commons:observer'],
        },
        {
          id: 'commons-only',
          title: 'Shared verse',
          sourceId: 'commons',
          itemKeys: ['commons:builder'],
        },
      ],
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'My software · Mine' })).toBeTruthy(),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Explore' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Software Engineering' }));
    expect(screen.getByRole('link', { name: /commons Observer/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Software Engineering/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /My observer/ })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'My software · Mine' }));
    expect(screen.getByRole('link', { name: /My observer/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /My software/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /commons Observer/ })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Shared verse' }));
    expect(screen.getByRole('link', { name: /Builder/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Shared-verse note/ })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: /^My library/ }));
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
});
