// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntitySummary } from '$lib/server/commons';
import { LIBRARY_LAYOUT_KEY, LIBRARY_PAGE_SIZE_KEY } from '$lib/client/library-preferences';
import UnifiedVerseGroups from './UnifiedVerseGroups.svelte';

vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => ({ listEntities: async () => [] }),
}));
beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const collections: EntitySummary[] = Array.from({ length: 53 }, (_, i) => ({
  id: `collection-${i + 1}`,
  type: 'collection',
  sourceId: 'commons',
  title: `Collection ${i + 1}`,
  summary: 'A useful set of patterns.',
  status: 'published',
  url: `/collection/collection-${i + 1}`,
}));

describe('Verse collection browsing', () => {
  it('opens collections in cards and keeps pagination intact when switching views', async () => {
    const view = render(UnifiedVerseGroups, {
      verseId: 'example',
      commonsMembers: [
        ...collections,
        { ...collections[0]!, id: 'example-pattern', type: 'pattern' },
      ],
    });
    const regions = view.container.querySelectorAll('details');
    expect(regions[0]!.open).toBe(true);
    expect(regions[1]!.open).toBe(false);
    const region = within(view.container.querySelector('.collection-browse')!).getByRole('region', {
      name: 'Collections',
    });
    expect(within(region).getAllByRole('link')).toHaveLength(20);
    expect(region.querySelector('.card-grid')).toBeTruthy();
    await fireEvent.click(within(region).getByRole('button', { name: 'Go to page 2' }));
    await fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(region.querySelector('.card-grid')).toBeNull();
    expect(within(region).getByRole('status').textContent).toContain('page 2 of 3');
    expect(within(region).getAllByRole('link')[0]!.getAttribute('href')).toBe(
      '/collection/collection-21',
    );
    expect(localStorage.getItem(LIBRARY_LAYOUT_KEY)).toBe('list');
    await fireEvent.click(screen.getByRole('button', { name: 'Cards' }));
    expect(region.querySelector('.card-grid.mobile-cards')).toBeTruthy();
    expect(within(region).getByRole('status').textContent).toContain('page 2 of 3');
    await fireEvent.click(within(region).getByRole('button', { name: 'Go to page 3' }));
    expect(within(region).getAllByRole('link')).toHaveLength(13);
  });

  it('restores the existing library layout and page-size preferences', async () => {
    localStorage.setItem(LIBRARY_LAYOUT_KEY, 'list');
    localStorage.setItem(LIBRARY_PAGE_SIZE_KEY, '50');
    const view = render(UnifiedVerseGroups, { verseId: 'example', commonsMembers: collections });
    const region = within(view.container.querySelector('.collection-browse')!).getByRole('region', {
      name: 'Collections',
    });
    await waitFor(() => expect(within(region).getAllByRole('link')).toHaveLength(50));
    expect(region.querySelector('.card-grid')).toBeNull();
    expect(screen.getByRole('button', { name: 'List' }).getAttribute('aria-pressed')).toBe('true');
    await fireEvent.click(within(region).getByRole('button', { name: 'Next page' }));
    expect(within(region).getAllByRole('link')).toHaveLength(3);
  });
});
