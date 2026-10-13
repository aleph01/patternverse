// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import UsefulnessControl from './UsefulnessControl.svelte';
import { notifyWorkspaceChanged } from '$lib/client/workspace-changes';
import type { Usefulness } from '@patternverse/workspace';

const local = vi.hoisted(() => ({ ratings: new Map<string, Usefulness>() }));
vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => ({
    getUsefulness: async (ref: { entityId: string }) => local.ratings.get(ref.entityId) ?? null,
    setUsefulness: async (ref: { entityId: string }, value: Usefulness) => {
      local.ratings.set(ref.entityId, value);
    },
  }),
}));
beforeEach(() => {
  local.ratings.clear();
});
afterEach(cleanup);

it('follows article changes and remote rating updates without writing', async () => {
  local.ratings.set('one', 2);
  const view = render(UsefulnessControl, { sourceId: 'commons', entityId: 'one' });
  const veryUseful = screen.getByRole('button', { name: 'Very useful' });
  await waitFor(() => expect(veryUseful.getAttribute('aria-pressed')).toBe('true'));
  local.ratings.set('one', 1);
  notifyWorkspaceChanged({ origin: 'sync', topics: ['ratings'] });
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Useful' }).getAttribute('aria-pressed')).toBe(
      'true',
    ),
  );
  await view.rerender({ sourceId: 'commons', entityId: 'two' });
  await waitFor(() => expect((veryUseful as HTMLButtonElement).disabled).toBe(false));
  expect(veryUseful.getAttribute('aria-pressed')).toBe('false');
  expect(local.ratings.has('two')).toBe(false);
  await fireEvent.click(veryUseful);
  await waitFor(() => expect(local.ratings.get('two')).toBe(2));
  local.ratings.delete('two');
  notifyWorkspaceChanged({ origin: 'restore', topics: ['ratings'] });
  await waitFor(() => expect(veryUseful.getAttribute('aria-pressed')).toBe('false'));
});
