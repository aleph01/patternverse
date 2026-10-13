// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TenderWilds from './TenderWilds.svelte';
import { act, newGame, type Action, type Game } from './game';
const storage = vi.hoisted(() => ({ saved: null as Game | null, fail: false }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => ({ listEntities: async () => [] }),
}));
vi.mock('./store', () => ({
  createGardenStore: () => ({
    load: async () => structuredClone(storage.saved),
    dispatch: async (action: Action) => {
      if (storage.fail) throw new Error('Storage unavailable.');
      storage.saved = act(storage.saved!, action, Date.now());
      return structuredClone(storage.saved);
    },
  }),
}));
const patterns = [
  { key: 'commons:learn', title: 'Learn deliberately', sourceId: 'commons', entityId: 'learn' },
];
beforeEach(() => {
  storage.saved = newGame(Date.now() - 4 * 24 * 3_600_000);
  storage.fail = false;
});
afterEach(() => cleanup());
it('recognizes progress, harvests materials and builds a visible object that survives reopening', async () => {
  storage.saved!.materials.wood = 3;
  render(TenderWilds, { patterns });
  await screen.findByRole('button', { name: 'Harvest +2 fibre' });
  await fireEvent.click(screen.getByRole('button', { name: 'Focus' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Add Learn deliberately to focus' }));
  await fireEvent.click(await screen.findByRole('button', { name: 'XL: 5 points' }));
  await fireEvent.click(screen.getByRole('button', { name: /Recognize progress/ }));
  await waitFor(() => expect(storage.saved!.points).toBe(5));
  await fireEvent.click(screen.getByRole('button', { name: 'Garden' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Harvest +2 fibre' }));
  await waitFor(() => expect(storage.saved!.materials.fibre).toBe(2));
  expect(screen.queryByRole('button', { name: 'Harvest +2 fibre' })).toBeNull();
  await fireEvent.click(screen.getByRole('button', { name: 'World' }));
  await fireEvent.click(screen.getAllByRole('button', { name: 'Build' })[0]);
  await screen.findByRole('button', { name: 'Built' });
  expect(storage.saved!.structures).toEqual([{ island: 0, recipe: 'bench' }]);
  cleanup();
  render(TenderWilds, { patterns });
  await screen.findByRole('button', { name: 'World' });
  await fireEvent.click(screen.getByRole('button', { name: 'World' }));
  expect(await screen.findByRole('button', { name: 'Built' })).toBeTruthy();
});
it('shows saving failures without granting a harvest or replacing the garden', async () => {
  render(TenderWilds, { patterns });
  const harvest = await screen.findByRole('button', { name: 'Harvest +2 fibre' });
  storage.fail = true;
  await fireEvent.click(harvest);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Storage unavailable.');
  expect(storage.saved!.materials.fibre).toBe(0);
  expect(screen.getByRole('button', { name: 'Harvest +2 fibre' })).toBeTruthy();
});
