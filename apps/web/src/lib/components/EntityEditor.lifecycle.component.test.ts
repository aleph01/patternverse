// @vitest-environment jsdom
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createIndexedDbWorkspace, type LocalWorkspace } from '@patternverse/workspace';
import EntityEditor from './EntityEditor.svelte';

const adapters = vi.hoisted(() => ({
  workspace: vi.fn(),
  navigation: undefined as undefined | ((event: { cancel: () => void }) => void),
}));
vi.mock('$app/navigation', () => ({
  beforeNavigate: (handler: typeof adapters.navigation) => {
    adapters.navigation = handler;
  },
}));
vi.mock('$app/paths', () => ({ base: '', resolve: (path: string) => path }));
vi.mock('$lib/client/workspace', () => ({ getLocalWorkspace: adapters.workspace }));

const commonsEntities = [
  {
    id: 'learning',
    type: 'verse' as const,
    sourceId: 'commons',
    title: 'Learning',
    summary: '',
    status: 'published' as const,
    url: '/verse/learning',
  },
];
const workspaces: LocalWorkspace[] = [];
function workspace() {
  const store = createIndexedDbWorkspace({
    indexedDB,
    IDBKeyRange,
    databaseName: `editor-component-${crypto.randomUUID()}`,
  });
  workspaces.push(store);
  return store;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
async function openEditor() {
  const store = workspace();
  adapters.workspace.mockResolvedValue(store);
  const view = render(EntityEditor, { commonsEntities });
  const title = await screen.findByRole('textbox', { name: 'Title' });
  await fireEvent.input(title, { target: { value: 'Private draft' } });
  return { store, view, title, save: screen.getByRole('button', { name: 'Save pattern' }) };
}
beforeEach(() => {
  vi.clearAllMocks();
  adapters.navigation = undefined;
  window.history.replaceState({}, '', '/editor?type=pattern&verse=learning');
});
afterEach(() => {
  cleanup();
  workspaces.splice(0).forEach((store) => store.close());
  vi.restoreAllMocks();
});

describe('editor save host lifecycle', () => {
  it('commits unsubmitted keyword drafts and marks a normalized private save clean', async () => {
    const test = await openEditor();
    await fireEvent.input(screen.getByLabelText('Topics'), {
      target: { value: 'testing, learning' },
    });
    await fireEvent.input(screen.getByLabelText('Also known as'), {
      target: { value: 'Other name' },
    });
    await fireEvent.click(test.save);
    await screen.findByText('Saved “Private draft” as draft.');
    expect(await test.store.getEntity('private-draft')).toMatchObject({
      sourceId: 'personal',
      tags: ['testing', 'learning'],
      aliases: ['Other name'],
    });
    expect(window.location.search).toBe('?id=private-draft');
    expect(screen.queryByText('Unsaved changes')).toBeNull();
    const cancel = vi.fn();
    adapters.navigation?.({ cancel });
    expect(cancel).not.toHaveBeenCalled();
  });

  it('keeps the writing and navigation guard after failed storage, then permits retry', async () => {
    const test = await openEditor();
    vi.spyOn(test.store, 'createEntity').mockRejectedValueOnce(
      new Error('Synthetic storage failure'),
    );
    await fireEvent.click(test.save);
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain('Synthetic storage failure');
    expect((test.title as HTMLInputElement).value).toBe('Private draft');
    expect((test.save as HTMLButtonElement).disabled).toBe(false);
    expect(window.location.search).toBe('?type=pattern&verse=learning');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const cancel = vi.fn();
    adapters.navigation?.({ cancel });
    expect(cancel).toHaveBeenCalledTimes(1);
    await fireEvent.click(test.save);
    await screen.findByText('Saved “Private draft” as draft.');
    expect(await test.store.listEntities()).toHaveLength(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('retains the saved identity and clean baseline when only the post-save catalog refresh fails', async () => {
    const test = await openEditor();
    const create = vi.spyOn(test.store, 'createEntity');
    const update = vi.spyOn(test.store, 'updateEntity');
    vi.spyOn(test.store, 'listEntities')
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('Synthetic refresh failure'));
    await fireEvent.click(test.save);
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain(
      'Saved “Private draft”, but the editor could not refresh',
    );
    expect(screen.getByText('Saved “Private draft” as draft.')).toBeTruthy();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
    expect(window.location.search).toBe('?id=private-draft');
    await fireEvent.click(test.save);
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((test.save as HTMLButtonElement).disabled).toBe(false));
    expect(create).toHaveBeenCalledTimes(1);
    expect(await test.store.listEntities()).toHaveLength(1);
  });

  it('keeps newer writing dirty instead of replacing it with an older completed save', async () => {
    const test = await openEditor();
    const gate = deferred<void>();
    const write = test.store.createEntity;
    vi.spyOn(test.store, 'createEntity').mockImplementation(async (input) => {
      await gate.promise;
      return write(input);
    });
    await fireEvent.click(test.save);
    await waitFor(() => expect(test.store.createEntity).toHaveBeenCalledTimes(1));
    // Simulate a child reporting its final edit while the save's disabled state is being applied.
    await fireEvent.input(test.title, { target: { value: 'Newer private title' } });
    await fireEvent.input(screen.getByLabelText('In one sentence'), {
      target: { value: 'Keep this newer sentence.' },
    });
    await act(() => gate.resolve());
    await screen.findByText('Saved “Private draft” as draft.');
    expect((test.title as HTMLInputElement).value).toBe('Newer private title');
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
    expect(window.location.search).toBe('?id=private-draft');
    expect(await test.store.getEntity('private-draft')).toMatchObject({ title: 'Private draft' });
    await fireEvent.click(test.save);
    await screen.findByText('Saved “Newer private title” as draft.');
    expect(await test.store.getEntity('private-draft')).toMatchObject({
      title: 'Newer private title',
      summary: 'Keep this newer sentence.',
    });
    expect(await test.store.getEntity('newer-private-title')).toBeUndefined();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('does not navigate or publish a save that finishes after unmount, and removes reload protection', async () => {
    const test = await openEditor();
    const gate = deferred<void>();
    const write = test.store.createEntity;
    vi.spyOn(test.store, 'createEntity').mockImplementation(async (input) => {
      await gate.promise;
      return write(input);
    });
    const history = vi.spyOn(window.history, 'replaceState');
    const before = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(true);
    await fireEvent.click(test.save);
    await waitFor(() => expect(test.store.createEntity).toHaveBeenCalledTimes(1));
    test.view.unmount();
    await act(() => gate.resolve());
    await waitFor(async () => expect(await test.store.getEntity('private-draft')).toBeDefined());
    expect(history).not.toHaveBeenCalled();
    expect(screen.queryByText('Saved “Private draft” as draft.')).toBeNull();
    const after = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it('does not initialize a workspace whose acquisition finishes after unmount', async () => {
    const store = workspace();
    const gate = deferred<LocalWorkspace>();
    adapters.workspace.mockReturnValue(gate.promise);
    const metadata = vi.spyOn(store, 'getWorkspace');
    const catalog = vi.spyOn(store, 'listEntities');
    const view = render(EntityEditor, { commonsEntities });
    view.unmount();
    await act(() => gate.resolve(store));
    expect(metadata).not.toHaveBeenCalled();
    expect(catalog).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
