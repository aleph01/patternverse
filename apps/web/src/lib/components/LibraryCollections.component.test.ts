// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedLibraryEntry } from '@patternverse/workspace';
import type { EntitySummary } from '$lib/server/commons';
import WorkspaceLibrary from './WorkspaceLibrary.svelte';
import { notifyWorkspaceChanged } from '$lib/client/workspace-changes';

const local = vi.hoisted(() => ({ saved: [] as SavedLibraryEntry[] }));
vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => ({
    listEntities: async () => [],
    listSavedEntries: async () => local.saved,
    listUsefulness: async () => [],
    getSavedEntry: async (ref: { sourceId: string; entityId: string }) =>
      local.saved.find(
        (entry) => entry.ref.sourceId === ref.sourceId && entry.ref.entityId === ref.entityId,
      ),
    setSavedEntry: async (ref: { sourceId: string; entityId: string }, saved: boolean) => {
      local.saved = local.saved.filter(
        (entry) => entry.ref.sourceId !== ref.sourceId || entry.ref.entityId !== ref.entityId,
      );
      if (saved) local.saved.push({ ref, workspaceId: 'mine', createdAt: '2026-10-08' });
      notifyWorkspaceChanged({ origin: 'local', topics: ['saved'] });
    },
  }),
}));
beforeEach(() => {
  local.saved = [];
  window.localStorage.clear();
});
afterEach(cleanup);

const patterns: EntitySummary[] = Array.from({ length: 6 }, (_, index) => ({
  id: `pattern-${index}`,
  sourceId: 'commons',
  type: 'pattern',
  title: `Pattern ${index + 1}`,
  summary: `Description ${index + 1}`,
  status: 'published',
  url: `/pattern/pattern-${index}`,
}));
const collection = (id: string, ids: string[]): EntitySummary => ({
  id,
  sourceId: 'commons',
  type: 'collection',
  title: id,
  summary: 'Collection description',
  status: 'published',
  url: `/collection/${id}`,
  collectionItems: ids.map((entityId) => ({ sourceId: 'commons', entityId })),
});
const commons = [
  ...patterns,
  collection(
    'First collection',
    patterns.map((item) => item.id),
  ),
  collection('Second collection', ['pattern-5']),
  collection('Empty collection', []),
];
const props = {
  commons,
  initialTypes: ['collection'] as const,
  commonsSearchDocuments: commons.map((item) => ({
    ...item,
    id: `commons:${item.id}`,
    entityId: item.id,
    aliases: [],
    body: item.summary,
    verseNames: [],
    collectionNames: [],
  })),
};

describe('Inline collection browsing', () => {
  it('shows a bookmarked collection member when switching to My library and after reopening', async () => {
    const view = render(WorkspaceLibrary, props);
    await fireEvent.click(
      screen.getByRole('button', { name: 'Show 6 patterns in First collection' }),
    );
    const contents = screen.getByRole('region', { name: 'First collection contents' });
    const save = within(contents).getAllByRole('button', { name: 'Add to my library' })[0];
    await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false));
    await fireEvent.click(save);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^My library/ }).textContent).toContain('1'),
    );
    await fireEvent.click(screen.getByRole('button', { name: /^My library/ }));
    expect(screen.getByRole('link', { name: /Pattern 1/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true');
    expect(local.saved.map((entry) => entry.ref.entityId)).toEqual(['pattern-0']);
    await fireEvent.click(screen.getByRole('button', { name: 'Patterns' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Commons' }));
    expect(screen.getByRole('button', { name: 'Collections' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    await fireEvent.click(screen.getByRole('button', { name: /^My library/ }));
    expect(screen.getByRole('button', { name: 'Patterns' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    view.unmount();
    render(WorkspaceLibrary, props);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^My library/ }).hasAttribute('disabled')).toBe(
        false,
      ),
    );
    await fireEvent.click(screen.getByRole('button', { name: /^My library/ }));
    expect(screen.getByRole('link', { name: /Pattern 1/ })).toBeTruthy();
  });

  it('expands every pattern at once in list view and keeps collection links in authored order', async () => {
    localStorage.setItem('patternverse:library-layout', 'list');
    render(WorkspaceLibrary, props);
    const toggle = await screen.findByRole('button', {
      name: 'Show 6 patterns in First collection',
    });
    await fireEvent.click(toggle);
    const contents = screen.getByRole('region', { name: 'First collection contents' });
    expect(
      within(contents)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(patterns.map((item) => `${item.url}?collection=commons%3AFirst+collection`));
    expect(within(contents).queryByRole('button', { name: /Show all/ })).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(toggle);
    expect(screen.queryByRole('region', { name: 'First collection contents' })).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('searches patterns from the collections-first default and restores browsing when cleared', async () => {
    const view = render(WorkspaceLibrary, props);
    await screen.findByRole('link', { name: /First collection/ });
    expect(screen.getByRole('button', { name: 'Collections' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    const input = screen.getByRole('searchbox');
    await fireEvent.input(input, { target: { value: 'Pattern 6' } });
    const results = within(screen.getByRole('region', { name: 'Library results' }));
    expect(results.getAllByRole('link')).toHaveLength(1);
    expect(results.getByRole('link', { name: /Pattern 6/ }).getAttribute('href')).toBe(
      '/pattern/pattern-5',
    );
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true');
    expect(view.container.querySelector('.card-grid, .mobile-cards')).toBeNull();
    expect(results.getByText('pattern')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('button', { name: 'Collections' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(view.container.querySelector('.card-grid')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Show 6 patterns in First collection' }),
    ).toBeTruthy();
  });

  it('opens matching collections directly and lets search categories change without altering browsing', async () => {
    render(WorkspaceLibrary, { ...props, query: 'collection' });
    const results = within(screen.getByRole('region', { name: 'Library results' }));
    expect(results.getAllByRole('link')).toHaveLength(3);
    expect(results.queryByRole('button', { name: /Show .*patterns in/ })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Patterns' }));
    await screen.findByRole('heading', { name: 'No matching patterns' });
    await fireEvent.click(screen.getByRole('button', { name: 'Collections' }));
    expect(
      within(screen.getByRole('region', { name: 'Library results' })).getAllByRole('link'),
    ).toHaveLength(3);
    await fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'Pattern 6' } });
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('link', { name: /Pattern 6/ })).toBeTruthy();
  });

  it('reveals ordered, contextual contents, keeps multiple collections open across layouts, and shows all on request', async () => {
    const view = render(WorkspaceLibrary, props);
    const first = screen.getByRole('button', { name: 'Show 6 patterns in First collection' });
    expect(first.textContent?.trim()).toBe('6 patterns');
    expect(first.getAttribute('aria-expanded')).toBe('false');
    expect(first.closest('a')).toBeNull();
    expect(screen.queryByRole('region', { name: 'First collection contents' })).toBeNull();
    await fireEvent.click(first);
    const contents = screen.getByRole('region', { name: 'First collection contents' });
    expect(
      within(contents)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(
      patterns.slice(0, 4).map((item) => `${item.url}?collection=commons%3AFirst+collection`),
    );
    expect(within(contents).getByText('Description 1')).toBeTruthy();
    expect(contents.querySelector('.item-number')?.textContent).toBe('01');
    expect(contents.querySelector('a[href$="/run"]')).toBeNull();
    await fireEvent.click(
      screen.getByRole('button', { name: 'Show 1 pattern in Second collection' }),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByRole('region', { name: 'First collection contents' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Second collection contents' })).toBeTruthy();
    expect(view.container.querySelector('.card-grid')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Cards' }));
    expect(view.container.querySelector('.card-grid')).toBeTruthy();
    await fireEvent.click(within(contents).getByRole('button', { name: 'Show all 6 patterns' }));
    expect(within(contents).getAllByRole('link')).toHaveLength(6);
    await fireEvent.click(first);
    expect(screen.queryByRole('region', { name: 'First collection contents' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Second collection contents' })).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: 'Show 0 patterns in Empty collection',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('shows unsaved items inside a saved collection and bookmarks them without closing the collection', async () => {
    local.saved = [
      {
        ref: { sourceId: 'commons', entityId: 'First collection' },
        workspaceId: 'mine',
        createdAt: '2026-10-08',
      },
    ];
    render(WorkspaceLibrary, props);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^My library/ }).hasAttribute('disabled')).toBe(
        false,
      ),
    );
    await fireEvent.click(screen.getByRole('button', { name: /^My library/ }));
    await fireEvent.click(
      screen.getByRole('button', { name: 'Show 6 patterns in First collection' }),
    );
    const contents = screen.getByRole('region', { name: 'First collection contents' });
    const firstRow = within(contents).getAllByRole('listitem')[0];
    const save = within(firstRow).getByRole('button', { name: 'Add to my library' });
    await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false));
    await fireEvent.click(save);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^My library/ }).textContent).toContain('2'),
    );
    expect(screen.getByRole('region', { name: 'First collection contents' })).toBe(contents);
    await fireEvent.click(within(firstRow).getByRole('button', { name: 'In my library' }));
    await fireEvent.click(within(firstRow).getByRole('button', { name: 'Remove from my library' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^My library/ }).textContent).toContain('1'),
    );
    expect(local.saved.map((entry) => entry.ref.entityId)).toEqual(['First collection']);
    expect(screen.getByRole('region', { name: 'First collection contents' })).toBe(contents);
  });
});
