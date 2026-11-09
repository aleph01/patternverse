// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { LibrarySearchDocument } from '@patternverse/workspace/library';
import WorkspaceLibrary from './WorkspaceLibrary.svelte';

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('$lib/client/library-search', () => ({ loadLibrarySearch: mocks.load }));
vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => ({
    listEntities: async () => [
      {
        id: 'observer',
        sourceId: 'personal',
        type: 'pattern',
        status: 'draft',
        title: 'Private observer',
        body: 'A private supernova',
        summary: '',
      },
    ],
    listSavedEntries: async () => [],
    listUsefulness: async () => [],
  }),
}));

const commons = ['observer', 'builder'].map((id) => ({
  id,
  sourceId: 'commons',
  type: 'pattern' as const,
  status: 'published' as const,
  title: id === 'observer' ? 'Observer' : 'Builder',
  summary: `About ${id}`,
  url: `/pattern/${id}`,
  collectionNames: ['Methods'],
  verseNames: ['Learning'],
}));
const documents: LibrarySearchDocument[] = commons.map((entry) => ({
  ...entry,
  id: `commons:${entry.id}`,
  entityId: entry.id,
  aliases: [],
  body: 'A public quasar',
}));
const asset = { path: `/library/search/${'a'.repeat(64)}.json`, sha256: 'a'.repeat(64) };
const props = { commons, searchAsset: asset };
beforeEach(() => {
  mocks.load.mockReset();
  localStorage.clear();
});
afterEach(cleanup);

it('browses before search intent and applies delayed data to the current query and filters', async () => {
  let release!: (value: readonly LibrarySearchDocument[]) => void;
  mocks.load.mockReturnValue(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  render(WorkspaceLibrary, props);
  await screen.findByRole('link', { name: /Builder/ });
  await fireEvent.click(screen.getByRole('button', { name: 'Patterns' }));
  expect(mocks.load).not.toHaveBeenCalled();
  const input = screen.getByRole('searchbox') as HTMLInputElement;
  await fireEvent.focus(input);
  await fireEvent.input(input, { target: { value: 'quasar' } });
  await screen.findByText(/Loading full library search/);
  await fireEvent.click(screen.getByRole('button', { name: 'Patterns' }));
  expect(screen.queryByRole('heading', { name: 'No matching patterns' })).toBeNull();
  await fireEvent.input(input, { target: { value: 'builder' } });
  release(documents);
  await waitFor(() => expect(screen.queryByText(/Loading full library search/)).toBeNull());
  expect(input.value).toBe('builder');
  expect(screen.getByRole('button', { name: 'Patterns' }).getAttribute('aria-pressed')).toBe(
    'true',
  );
  expect(screen.getByRole('link', { name: /Builder/ })).toBeTruthy();
  expect(screen.queryByRole('link', { name: /Observer/ })).toBeNull();
  await fireEvent.input(input, { target: { value: 'quasar' } });
  await screen.findByRole('link', { name: /Observer/ });
  await fireEvent.focus(input);
  expect(mocks.load).toHaveBeenCalledExactlyOnceWith(asset);
});

it('keeps private full-text and public summary search useful offline without retry loops', async () => {
  mocks.load.mockRejectedValue(new Error('Offline'));
  render(WorkspaceLibrary, props);
  const input = screen.getByRole('searchbox') as HTMLInputElement;
  await fireEvent.input(input, { target: { value: 'supernova' } });
  await screen.findByRole('link', { name: /Private observer/ });
  await screen.findByText(/Full library search is unavailable/);
  await fireEvent.focus(input);
  await fireEvent.input(input, { target: { value: 'builder' } });
  await screen.findByRole('link', { name: /Builder/ });
  expect(mocks.load).toHaveBeenCalledOnce();
  mocks.load.mockResolvedValue(documents);
  await fireEvent.click(screen.getByRole('button', { name: 'Retry full search' }));
  await waitFor(() => expect(screen.queryByText(/Full library search is unavailable/)).toBeNull());
  expect(input.value).toBe('builder');
  expect(mocks.load).toHaveBeenCalledTimes(2);
});

it('loads a restored query without focus and does not restore it after the user clears it', async () => {
  let release!: (value: readonly LibrarySearchDocument[]) => void;
  mocks.load.mockReturnValue(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  render(WorkspaceLibrary, { ...props, query: 'quasar' });
  await waitFor(() => expect(mocks.load).toHaveBeenCalledOnce());
  const input = screen.getByRole('searchbox') as HTMLInputElement;
  await fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
  release(documents);
  await waitFor(() => expect(screen.queryByText(/Loading full library search/)).toBeNull());
  expect(input.value).toBe('');
  expect(screen.getByRole('link', { name: /Builder/ })).toBeTruthy();
});

it('ignores a late response for superseded page data', async () => {
  let old!: (value: readonly LibrarySearchDocument[]) => void;
  mocks.load
    .mockReturnValueOnce(
      new Promise((resolve) => {
        old = resolve;
      }),
    )
    .mockResolvedValue(documents);
  const view = render(WorkspaceLibrary, { ...props, query: 'quasar' });
  await waitFor(() => expect(mocks.load).toHaveBeenCalledOnce());
  await view.rerender({
    ...props,
    query: 'quasar',
    searchAsset: { path: `/library/search/${'b'.repeat(64)}.json`, sha256: 'b'.repeat(64) },
  });
  await screen.findByRole('link', { name: /Observer/ });
  old([]);
  await Promise.resolve();
  expect(screen.getByRole('link', { name: /Observer/ })).toBeTruthy();
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('quasar');
});
