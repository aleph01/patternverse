// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { createIndexedDbWorkspace, type LocalWorkspace } from '@patternverse/workspace';
import Situations from './Situations.svelte';
import { notifyWorkspaceChanged } from '$lib/client/workspace-changes';
const state = vi.hoisted(() => ({ workspace: null as LocalWorkspace | null }));
vi.mock('$lib/client/workspace', () => ({ getLocalWorkspace: async () => state.workspace }));
beforeEach(() => {
  state.workspace = createIndexedDbWorkspace({
    indexedDB: new IDBFactory(),
    IDBKeyRange,
    databaseName: crypto.randomUUID(),
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
});
afterEach(() => {
  cleanup();
  state.workspace?.close();
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});
it('adds situations, reorders both ways, saves context on close, and retains it after reopening the workspace', async () => {
  render(Situations);
  await screen.findByText('Leave a situation here to return to later.');
  for (const title of ['Creative work', 'Conversations']) {
    await fireEvent.input(screen.getByRole('textbox', { name: 'New situation' }), {
      target: { value: title },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await screen.findByRole('button', { name: 'Open notebook: ' + title });
  }
  await fireEvent.keyDown(screen.getByRole('button', { name: 'Reorder: Creative work' }), {
    key: 'ArrowDown',
  });
  await waitFor(async () =>
    expect((await state.workspace!.listSituations())[0]!.title).toBe('Conversations'),
  );
  await fireEvent.keyDown(screen.getByRole('button', { name: 'Reorder: Creative work' }), {
    key: 'ArrowUp',
  });
  await waitFor(async () =>
    expect((await state.workspace!.listSituations())[0]!.title).toBe('Creative work'),
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Open notebook: Creative work' }));
  const field = await screen.findByRole('textbox', { name: 'Context · optional' });
  await fireEvent.input(field, { target: { value: 'A gentler way to begin.' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  cleanup();
  render(Situations);
  await fireEvent.click(
    await screen.findByRole('button', { name: 'Open notebook: Creative work' }),
  );
  expect(await screen.findByRole('textbox', { name: 'Context · optional' })).toHaveProperty(
    'value',
    'A gentler way to begin.',
  );
});
it('keeps the notebook and unsaved text open when persistence fails', async () => {
  await state.workspace!.createSituation('Creative work');
  vi.spyOn(state.workspace!, 'updateSituation').mockRejectedValue(
    new Error('Storage unavailable.'),
  );
  render(Situations);
  await fireEvent.click(
    await screen.findByRole('button', { name: 'Open notebook: Creative work' }),
  );
  const field = await screen.findByRole('textbox', { name: 'Context · optional' });
  await fireEvent.input(field, { target: { value: 'Keep this draft.' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    expect.stringContaining('Storage unavailable.'),
  );
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(field).toHaveProperty('value', 'Keep this draft.');
});
it('saves later edits made while an earlier context save is still pending', async () => {
  await state.workspace!.createSituation('Creative work');
  const realUpdate = state.workspace!.updateSituation;
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const update = vi
    .spyOn(state.workspace!, 'updateSituation')
    .mockImplementationOnce(async (...args) => {
      await pending;
      return realUpdate(...args);
    });
  render(Situations);
  await fireEvent.click(
    await screen.findByRole('button', { name: 'Open notebook: Creative work' }),
  );
  const field = await screen.findByRole('textbox', { name: 'Context · optional' });
  await fireEvent.input(field, { target: { value: 'First thought' } });
  await waitFor(() => expect(update).toHaveBeenCalledOnce());
  await fireEvent.input(field, { target: { value: 'A fuller thought' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  release();
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect((await state.workspace!.listSituations())[0]!.context).toBe('A fuller thought');
});

it('retains a stale draft without overwriting a notebook edited in another window', async () => {
  const entry = await state.workspace!.createSituation('Creative work');
  render(Situations);
  await fireEvent.click(
    await screen.findByRole('button', { name: 'Open notebook: Creative work' }),
  );
  const field = await screen.findByRole('textbox', { name: 'Context · optional' });
  await state.workspace!.updateSituation(
    entry.id,
    { title: entry.title, context: 'Other window' },
    entry.revision,
  );
  notifyWorkspaceChanged({ origin: 'sync', topics: ['situations'] });
  await fireEvent.input(field, { target: { value: 'Keep my draft' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    expect.stringContaining('another window'),
  );
  expect(field).toHaveProperty('value', 'Keep my draft');
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect((await state.workspace!.listSituations())[0].context).toBe('Other window');
});

it('defers background refresh while the notebook is open, resumes on close, and restores focus', async () => {
  const entry = await state.workspace!.createSituation('Creative work');
  const list = vi.spyOn(state.workspace!, 'listSituations');
  render(Situations);
  const trigger = await screen.findByRole('button', { name: 'Open notebook: Creative work' });
  await fireEvent.click(trigger);
  await screen.findByRole('textbox', { name: 'Context · optional' });
  list.mockClear();
  await state.workspace!.updateSituation(
    entry.id,
    { title: entry.title, context: 'Other window' },
    entry.revision,
  );
  notifyWorkspaceChanged({ origin: 'sync', topics: ['situations'] });
  expect(list).not.toHaveBeenCalled();
  await fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(trigger).toBe(document.activeElement));
  await fireEvent.click(trigger);
  expect(await screen.findByRole('textbox', { name: 'Context · optional' })).toHaveProperty(
    'value',
    'Other window',
  );
});

it('rejects an empty title through existing validation and retains context for correction', async () => {
  await state.workspace!.createSituation('Creative work');
  render(Situations);
  await fireEvent.click(
    await screen.findByRole('button', { name: 'Open notebook: Creative work' }),
  );
  await fireEvent.input(await screen.findByRole('textbox', { name: /^Situation$/ }), {
    target: { value: '' },
  });
  const field = screen.getByRole('textbox', { name: 'Context · optional' });
  await fireEvent.input(field, { target: { value: 'Do not lose this' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    expect.stringContaining('between 1 and 180'),
  );
  expect(field).toHaveProperty('value', 'Do not lose this');
  await fireEvent.input(screen.getByRole('textbox', { name: /^Situation$/ }), {
    target: { value: 'A new title' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect((await state.workspace!.listSituations())[0]).toMatchObject({
    title: 'A new title',
    context: 'Do not lose this',
  });
});

it('restores persisted order and focus when a keyboard move fails', async () => {
  await state.workspace!.createSituation('Creative work');
  await state.workspace!.createSituation('Conversations');
  vi.spyOn(state.workspace!, 'moveSituation').mockRejectedValue(
    new Error('The queue changed. Try moving the situation again.'),
  );
  render(Situations);
  const handle = await screen.findByRole('button', { name: 'Reorder: Creative work' });
  await fireEvent.keyDown(handle, { key: 'ArrowDown' });
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    expect.stringContaining('queue changed'),
  );
  await waitFor(() => expect(handle).toBe(document.activeElement));
  expect(
    screen
      .getAllByRole('button', { name: /^Open notebook:/ })
      .map((button) => button.textContent?.trim()),
  ).toEqual(['Creative work', 'Conversations']);
});

it('flushes the latest draft on unmount without leaving a debounce timer behind', async () => {
  await state.workspace!.createSituation('Creative work');
  const update = vi.spyOn(state.workspace!, 'updateSituation');
  const view = render(Situations);
  await fireEvent.click(
    await screen.findByRole('button', { name: 'Open notebook: Creative work' }),
  );
  await fireEvent.input(await screen.findByRole('textbox', { name: 'Context · optional' }), {
    target: { value: 'Before leaving' },
  });
  view.unmount();
  await waitFor(async () =>
    expect((await state.workspace!.listSituations())[0].context).toBe('Before leaving'),
  );
  expect(update).toHaveBeenCalledOnce();
  render(Situations);
  await fireEvent.click(
    await screen.findByRole('button', { name: 'Open notebook: Creative work' }),
  );
  expect(await screen.findByRole('textbox', { name: 'Context · optional' })).toHaveProperty(
    'value',
    'Before leaving',
  );
});
