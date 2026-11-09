// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import type { Writable } from 'svelte/store';
import PwaStatus from './PwaStatus.svelte';
import { applyPwaUpdate, pwaState, type PwaState } from '$lib/client/pwa';

vi.mock('$lib/client/pwa', async () => {
  const { writable } = await import('svelte/store');
  return {
    applyPwaUpdate: vi.fn(),
    pwaState: writable({ online: true, offlineReady: true, reloadRequired: false }),
  };
});

const state = pwaState as Writable<PwaState>;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.set({ online: true, offlineReady: true, reloadRequired: false });
});

it('keeps normal online visits free of update prompts', () => {
  render(PwaStatus);
  expect(screen.queryByRole('complementary')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});

it('keeps the offline notice available', () => {
  state.set({
    online: false,
    offlineReady: true,
    reloadRequired: false,
  });
  render(PwaStatus);
  expect(screen.getByText('Offline.')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});

it('keeps the update notice hidden without automatically reloading unfinished work', () => {
  state.set({
    online: true,
    offlineReady: true,
    reloadRequired: true,
  });
  render(PwaStatus);
  expect(screen.queryByRole('complementary')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
  expect(applyPwaUpdate).not.toHaveBeenCalled();
});
