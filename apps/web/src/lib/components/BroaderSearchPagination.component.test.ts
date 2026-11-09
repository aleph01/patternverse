// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import type { EntitySummary } from '$lib/server/commons';
import PaginatedEntityList from './PaginatedEntityList.svelte';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

it('keeps strict results first and repeats the broader heading on subsequent pages', async () => {
  localStorage.clear();
  const items: EntitySummary[] = Array.from({ length: 23 }, (_, i) => ({
    id: `result-${i}`,
    sourceId: 'commons',
    type: 'pattern',
    status: 'published',
    title: `Result ${i}`,
    summary: '',
    url: `/pattern/result-${i}`,
  }));
  render(PaginatedEntityList, {
    items,
    label: 'Library results',
    broaderMatchKeys: new Set(items.slice(2).map((entry) => `commons:${entry.id}`)),
  });
  const region = screen.getByRole('region', { name: 'Library results' });
  const first = within(region).getAllByRole('link');
  expect(first).toHaveLength(20);
  const heading = screen.getByRole('heading', { name: 'Broader matches' });
  expect(first[1].compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(heading.compareDocumentPosition(first[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByText(/1–20 of 23 entries/)).toBeTruthy();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  await fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(
    within(region)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href')),
  ).toEqual(['/pattern/result-20', '/pattern/result-21', '/pattern/result-22']);
  expect(screen.getByRole('heading', { name: 'Broader matches' })).toBeTruthy();
  expect(screen.getByText(/21–23 of 23 entries/)).toBeTruthy();
});
