// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import type { LocalWorkspace } from '@patternverse/workspace';
import { observeWorkspaceWrites } from './workspace';
import { readAutomaticSync, saveAutomaticSync, AUTO_SYNC_KEY } from './sync-preferences';
import {
  notifyWorkspaceChanged,
  subscribeWorkspaceChanges,
  WORKSPACE_DATA_TOPICS,
} from './workspace-changes';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each([
  ['createEntity', 'entities'],
  ['updateEntity', 'entities'],
  ['deleteEntity', 'entities'],
  ['mutateEntities', 'entities'],
  ['renameWorkspace', 'workspace'],
  ['setSavedEntry', 'saved'],
  ['setFavorite', 'saved'],
  ['setUsefulness', 'ratings'],
  ['savePracticeRun', 'practice-runs'],
  ['renamePracticeRun', 'practice-runs'],
  ['deletePracticeRun', 'practice-runs'],
  ['createSituation', 'situations'],
  ['updateSituation', 'situations'],
  ['moveSituation', 'situations'],
] as const)('classifies %s as a %s local write exactly once', async (method, topic) => {
  const listener = vi.fn();
  const stop = subscribeWorkspaceChanges([topic], listener);
  const target = { [method]: vi.fn().mockResolvedValue('result') };
  const workspace = observeWorkspaceWrites(target as unknown as LocalWorkspace);
  try {
    expect(await (workspace[method] as (...args: unknown[]) => Promise<unknown>)('synthetic')).toBe(
      'result',
    );
    expect(listener).toHaveBeenCalledExactlyOnceWith({ origin: 'local', topics: [topic] });
  } finally {
    stop();
  }
});

it('disables automatic sync before waiting for the same cross-tab attempt lock', async () => {
  let unlock!: () => Promise<unknown>;
  const request = vi.fn(
    async (_name, _options, callback: () => Promise<unknown>) =>
      new Promise((resolve, reject) => {
        unlock = async () => {
          try {
            resolve(await callback());
          } catch (error) {
            reject(error);
          }
        };
      }),
  );
  vi.stubGlobal('navigator', { locks: { request } });
  const replaceFromBackup = vi.fn().mockResolvedValue(undefined);
  const workspace = observeWorkspaceWrites({
    getWorkspace: async () => ({ id: 'synthetic-workspace' }),
    replaceFromBackup,
  } as unknown as LocalWorkspace);
  const pending = workspace.replaceFromBackup({} as never);
  expect(readAutomaticSync()).toBe(false);
  await vi.waitFor(() => expect(request).toHaveBeenCalled());
  expect(request.mock.calls[0][0]).toBe('patternverse-dropbox-attempt:synthetic-workspace');
  expect(replaceFromBackup).not.toHaveBeenCalled();
  await unlock();
  await pending;
  expect(replaceFromBackup).toHaveBeenCalledOnce();
});

it('defaults on, persists off, and fails closed if preferences cannot be read', () => {
  expect(readAutomaticSync()).toBe(true);
  saveAutomaticSync(false);
  expect(readAutomaticSync()).toBe(false);
  expect(localStorage.getItem(AUTO_SYNC_KEY)).toBe('false');
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied');
  });
  expect(readAutomaticSync()).toBe(false);
});

it('classifies persisted writes once; excludes reads and failed writes', async () => {
  const listener = vi.fn();
  const stop = subscribeWorkspaceChanges(WORKSPACE_DATA_TOPICS, listener);
  const mock = {
    createEntity: vi.fn().mockResolvedValue({ id: 'test' }),
    updateEntity: vi.fn().mockRejectedValue(new Error('Not saved')),
    getWorkspace: vi.fn().mockResolvedValue({ id: 'test-workspace' }),
    applySyncData: vi.fn().mockResolvedValue(undefined),
    savePracticeRun: vi.fn().mockResolvedValue({}),
    setUsefulness: vi.fn().mockResolvedValue(undefined),
    replaceFromBackup: vi.fn().mockResolvedValue(undefined),
  };
  const workspace = observeWorkspaceWrites(mock as unknown as LocalWorkspace);
  try {
    await workspace.createEntity({ type: 'verse', id: 'test', title: 'Test', body: '' });
    expect(listener).toHaveBeenLastCalledWith({ origin: 'local', topics: ['entities'] });
    await expect(workspace.updateEntity('test', (value) => value)).rejects.toThrow('Not saved');
    await workspace.getWorkspace();
    await workspace.applySyncData({} as never, {} as never);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith({ origin: 'sync', topics: WORKSPACE_DATA_TOPICS });
    await workspace.savePracticeRun({} as never);
    await workspace.setUsefulness({} as never, 1);
    await workspace.replaceFromBackup({} as never);
    expect(listener).toHaveBeenCalledTimes(5);
    expect(listener.mock.calls.map(([change]) => change.origin)).toEqual([
      'local',
      'sync',
      'local',
      'local',
      'restore',
    ]);
    expect(readAutomaticSync()).toBe(false);
  } finally {
    stop();
  }
});

it('filters topics and unsubscribes without exposing records', () => {
  const listener = vi.fn();
  const stop = subscribeWorkspaceChanges(['saved'], listener);
  notifyWorkspaceChanged({ origin: 'local', topics: ['ratings'] });
  expect(listener).not.toHaveBeenCalled();
  notifyWorkspaceChanged({ origin: 'sync', topics: ['saved'] });
  expect(listener).toHaveBeenCalledExactlyOnceWith({ origin: 'sync', topics: ['saved'] });
  stop();
  notifyWorkspaceChanged({ origin: 'restore', topics: WORKSPACE_DATA_TOPICS });
  expect(listener).toHaveBeenCalledOnce();
});

it('keeps restore local even if replacement fails and fails closed if disabling sync fails', async () => {
  const replaceFromBackup = vi.fn().mockRejectedValue(new Error('Storage full'));
  const workspace = observeWorkspaceWrites({
    replaceFromBackup,
    getWorkspace: async () => ({ id: 'test' }),
  } as unknown as LocalWorkspace);
  const listener = vi.fn();
  const stop = subscribeWorkspaceChanges(WORKSPACE_DATA_TOPICS, listener);
  try {
    await expect(workspace.replaceFromBackup({} as never)).rejects.toThrow('Storage full');
    expect(readAutomaticSync()).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    await expect(workspace.replaceFromBackup({} as never)).rejects.toThrow('denied');
    expect(replaceFromBackup).toHaveBeenCalledOnce();
  } finally {
    stop();
  }
});
