// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntitySummary } from '$lib/server/commons';
import type { LibrarySearchDocument } from '@patternverse/workspace/library';
import PaginatedEntityList from './PaginatedEntityList.svelte';
import WorkspaceLibrary from './WorkspaceLibrary.svelte';

vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => ({
    listEntities: async () => [],
    listSavedEntries: async () => [],
    listUsefulness: async () => [],
  }),
}));

beforeEach(() => {
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const items: EntitySummary[] = Array.from({ length: 53 }, (_, index) => ({
  id: `entry-${index + 1}`,
  sourceId: 'commons',
  title: `Entry ${String(index + 1).padStart(2, '0')}`,
  type: 'pattern',
  summary: index < 30 ? 'Group A' : 'Group B',
  status: 'published',
  url: `/pattern/entry-${index + 1}`,
}));
const documents: LibrarySearchDocument[] = items.map((item) => ({
  ...item,
  id: `commons:${item.id}`,
  entityId: item.id,
  aliases: [],
  body: item.summary,
  verseNames: ['Example Verse'],
  collectionNames: [],
}));

describe('Paginated entity browsing', () => {
  it('pages in authored order, announces the range and disables boundary controls', async () => {
    render(PaginatedEntityList, { items, label: 'Collection entries' });
    expect(screen.getAllByRole('link')).toHaveLength(20);
    expect(screen.getByRole('button', { name: 'Previous page' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.getByRole('button', { name: 'Go to page 1' }).getAttribute('aria-current')).toBe(
      'page',
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getAllByRole('link')[0].getAttribute('href')).toBe('/pattern/entry-21');
    expect(screen.getByRole('status').textContent).toContain('21–40 of 53 entries');
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Collection entries' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Go to page 3' }));
    expect(screen.getAllByRole('link')).toHaveLength(13);
    expect(screen.getAllByRole('link')[12].getAttribute('href')).toBe('/pattern/entry-53');
    expect(screen.getByRole('button', { name: 'Next page' }).hasAttribute('disabled')).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(screen.getByRole('status').textContent).toContain('page 2 of 3');
  });

  it('hides unnecessary controls for short lists and preserves compact numbering', async () => {
    const view = render(PaginatedEntityList, { items, compact: true });
    await fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    expect(view.container.querySelector('ol')?.getAttribute('start')).toBe('21');
    expect(view.container.querySelector('.index')?.textContent).toBe('21');
    await view.rerender({ items: items.slice(0, 3), compact: true });
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(view.container.querySelector('ol')?.getAttribute('start')).toBe('1');
  });

  it('preserves the library page across layout changes and resets when search or filters change', async () => {
    render(WorkspaceLibrary, {
      commons: items,
      commonsSearchDocuments: documents,
      initialTypes: ['pattern'],
      commonsVerses: [
        {
          id: 'example',
          sourceId: 'commons',
          title: 'Example Verse',
          itemKeys: items.map((item) => `commons:${item.id}`),
        },
      ],
    });
    const results = () => screen.getByRole('region', { name: 'Library results' });
    await fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(within(results()).getAllByRole('link')[0].getAttribute('href')).toBe(
      '/pattern/entry-21',
    );
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'Group A' } });
    expect(screen.getByRole('status').textContent).toContain('page 1 of 2');
    await fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: '' } });
    expect(screen.getByRole('status').textContent).toContain('page 1 of 3');
    await fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Example Verse' }));
    expect(screen.getByRole('status').textContent).toContain('page 1 of 3');
    await fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Library categories' })).getByRole('button', {
        name: 'All',
      }),
    );
    expect(screen.getByRole('status').textContent).toContain('page 1 of 3');
    await fireEvent.click(screen.getByRole('button', { name: /^My library/ }));
    expect(screen.queryByRole('region', { name: 'Library results' })).toBeNull();
    await fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Library scope' })).getByRole('button', {
        name: 'Explore',
      }),
    );
    expect(screen.getByRole('status').textContent).toContain('page 1 of 3');
  });

  it('leaves the homepage featured preview unpaginated', () => {
    render(WorkspaceLibrary, {
      commons: items,
      commonsSearchDocuments: documents,
      initialTypes: ['pattern'],
      showControls: false,
      limit: 6,
    });
    expect(screen.getAllByRole('link')).toHaveLength(6);
    expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull();
  });
});
