// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SaveToLibrary from './SaveToLibrary.svelte';
import { notifyWorkspaceChanged } from '$lib/client/workspace-changes';

const state = vi.hoisted(() => ({
  favorites: new Set<string>(),
  unavailable: false,
  failWrite: false,
  writes: [] as { ref: { sourceId: string; entityId: string }; favorite: boolean }[],
}));
vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => {
    if (state.unavailable) throw new Error('Storage blocked');
    return {
      getSavedEntry: async (ref: { sourceId: string; entityId: string }) =>
        state.favorites.has(`${ref.sourceId}:${ref.entityId}`) ? { ref } : undefined,
      setSavedEntry: async (ref: { sourceId: string; entityId: string }, favorite: boolean) => {
        if (state.failWrite) throw new Error('Write failed');
        state.writes.push({ ref, favorite });
        const key = `${ref.sourceId}:${ref.entityId}`;
        if (favorite) state.favorites.add(key);
        else state.favorites.delete(key);
      },
    };
  },
}));
beforeEach(() => {
  state.favorites.clear();
  state.writes = [];
  state.unavailable = false;
  state.failWrite = false;
});
afterEach(cleanup);

describe('private saved article references', () => {
  it('refreshes remote saved references and backup replacements while the article stays open', async () => {
    render(SaveToLibrary, { sourceId: 'commons', entityId: 'observer' });
    const button = screen.getByRole('button', { name: 'Add to my library' }) as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    state.favorites.add('commons:observer');
    notifyWorkspaceChanged({ origin: 'sync', topics: ['saved'] });
    await screen.findByRole('button', { name: 'In my library' });
    state.favorites.clear();
    notifyWorkspaceChanged({ origin: 'restore', topics: ['saved'] });
    await screen.findByRole('button', { name: 'Add to my library' });
    expect(state.writes).toEqual([]);
  });
  it('saves from the icon, then requires an explicit removal action', async () => {
    render(SaveToLibrary, { sourceId: 'commons', entityId: 'observer' });
    const button = screen.getByRole('button', { name: 'Add to my library' }) as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    expect(screen.getByText('Private · saved on this device')).toBeTruthy();
    await fireEvent.click(button);
    await waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'));
    expect(state.writes).toEqual([
      { ref: { sourceId: 'commons', entityId: 'observer' }, favorite: true },
    ]);
    expect(screen.getByRole('status').textContent).toContain('saved on this device');
    expect(screen.queryByRole('button', { name: 'Remove from my library' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'In my library' }));
    expect(state.writes).toHaveLength(1);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(screen.getByRole('button', { name: 'Remove from my library' }));
    await waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('false'));
    await waitFor(() => expect(document.activeElement).toBe(button));
    expect(screen.queryByRole('button', { name: 'Remove from my library' })).toBeNull();
    expect(state.writes[1]).toEqual({
      ref: { sourceId: 'commons', entityId: 'observer' },
      favorite: false,
    });
  });

  it('loads persisted favorites and follows a new article when its props change', async () => {
    state.favorites.add('commons:observer');
    const view = render(SaveToLibrary, { sourceId: 'commons', entityId: 'observer' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'In my library' })).toBeTruthy());
    await fireEvent.click(screen.getByRole('button', { name: 'In my library' }));
    await view.rerender({ sourceId: 'commons', entityId: 'builder' });
    const button = screen.getByRole('button', { name: 'Add to my library' }) as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    expect(screen.queryByRole('button', { name: 'Remove from my library' })).toBeNull();
    await fireEvent.click(button);
    await waitFor(() => expect(state.writes[0]?.ref.entityId).toBe('builder'));
  });

  it('dismisses removal options with Escape and outside clicks without changing storage', async () => {
    state.favorites.add('commons:observer');
    render(SaveToLibrary, { sourceId: 'commons', entityId: 'observer' });
    const button = await screen.findByRole('button', { name: 'In my library' });
    await fireEvent.click(button);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Remove from my library' }),
    );
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Remove from my library' })).toBeNull();
    expect(document.activeElement).toBe(button);
    await fireEvent.click(button);
    await fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('button', { name: 'Remove from my library' })).toBeNull();
    expect(state.writes).toEqual([]);
  });

  it('keeps the saved state and removal option after a failed removal', async () => {
    state.favorites.add('commons:observer');
    state.failWrite = true;
    render(SaveToLibrary, { sourceId: 'commons', entityId: 'observer' });
    const button = await screen.findByRole('button', { name: 'In my library' });
    await fireEvent.click(button);
    await fireEvent.click(screen.getByRole('button', { name: 'Remove from my library' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Could not update'),
    );
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Remove from my library' })).toBeTruthy();
  });

  it('keeps reading usable when storage is unavailable', async () => {
    state.unavailable = true;
    render(SaveToLibrary, { sourceId: 'commons', entityId: 'observer' });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('unavailable'));
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    expect(state.writes).toEqual([]);
  });

  it('does not claim a successful save after a persistence failure', async () => {
    state.failWrite = true;
    render(SaveToLibrary, { sourceId: 'commons', entityId: 'observer' });
    const button = screen.getByRole('button') as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    await fireEvent.click(button);
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Could not update'),
    );
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.disabled).toBe(false);
  });
});
