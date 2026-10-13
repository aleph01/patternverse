import { describe, expect, it, vi } from 'vitest';
import { createSession, type Session } from '@patternverse/companion-core';
import type { MiraSettings } from './private-store';
import type { MiraPatternSummary } from './context';
import { createMiraLifecycle } from './lifecycle';

const at = '2026-10-11T12:00:00Z';
const preferences: MiraSettings = {
  model: 'chosen-model',
  openRouterKey: 'synthetic-key',
  promptOverrides: { cbt: 'Private prompt' },
  activeSessionId: 'one',
  preferredModalityId: 'cbt',
  autoSpeak: true,
  monthlyBudgetUsd: 5,
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function setup() {
  const store = {
    loadSettings: vi.fn(async (): Promise<MiraSettings> => preferences),
    saveSettings: vi.fn<(settings: MiraSettings) => Promise<void>>(async () => {}),
  };
  const detachShortcut = vi.fn(),
    detachVisibility = vi.fn();
  const cleanup = [vi.fn(), vi.fn(), vi.fn()];
  const ports = {
    desktop: vi.fn(() => false),
    defaultModel: 'default-model',
    openStore: vi.fn(() => store),
    restoreSessions: vi.fn(async (): Promise<readonly Session[]> => [
      createSession('one', 'cbt', at),
      createSession('two', 'dbt', at),
    ]),
    entry: vi.fn((): { sessionId: string | null; settings: boolean } => ({
      sessionId: null,
      settings: false,
    })),
    settingsChanged: vi.fn(),
    listPersonal: vi.fn<(signal: AbortSignal) => Promise<readonly MiraPatternSummary[]>>(
      async () => [
        { sourceId: 'personal', id: 'private-pattern', type: 'pattern', title: 'Private pattern' },
        {
          sourceId: 'personal',
          id: 'private-collection',
          type: 'collection',
          title: 'Private collection',
        },
      ],
    ),
    personalChanged: vi.fn(),
    refreshUsage: vi.fn(),
    refreshNativeRuntime: vi.fn(async () => {}),
    openSettings: vi.fn(async () => {}),
    startPolling: vi.fn(),
    subscriptions: [vi.fn(() => detachShortcut), vi.fn(() => detachVisibility)],
    cleanup,
    cleanupFailed: vi.fn(),
    error: vi.fn(),
    ready: vi.fn(),
  };
  return {
    store,
    ports,
    detachShortcut,
    detachVisibility,
    cleanup,
    lifecycle: createMiraLifecycle(ports),
  };
}

describe('Mira page startup', () => {
  it('does not poll native setup with temporary empty settings while preferences are loading', async () => {
    const test = setup();
    const gate = deferred<MiraSettings>();
    test.ports.desktop.mockReturnValue(true);
    test.store.loadSettings.mockReturnValue(gate.promise);
    const work = test.lifecycle.start();
    expect(test.ports.startPolling).not.toHaveBeenCalled();
    expect(test.ports.refreshNativeRuntime).not.toHaveBeenCalled();
    gate.resolve(preferences);
    await work;
    expect(test.ports.settingsChanged.mock.invocationCallOrder[0]).toBeLessThan(
      test.ports.startPolling.mock.invocationCallOrder[0],
    );
    expect(test.ports.startPolling).toHaveBeenCalledTimes(1);
  });
  it('starts once, restores existing preferences and loads only personal patterns', async () => {
    const test = setup();
    const first = test.lifecycle.start();
    expect(test.lifecycle.start()).toBe(first);
    await first;
    expect(test.ports.openStore).toHaveBeenCalledTimes(1);
    expect(test.ports.restoreSessions).toHaveBeenCalledTimes(1);
    expect(test.ports.startPolling).toHaveBeenCalledTimes(1);
    expect(test.ports.subscriptions[0]).toHaveBeenCalledTimes(1);
    expect(test.ports.subscriptions[1]).toHaveBeenCalledTimes(1);
    expect(test.ports.settingsChanged).toHaveBeenCalledWith(preferences);
    expect(test.store.saveSettings).not.toHaveBeenCalled();
    expect(test.ports.personalChanged).toHaveBeenCalledWith([
      { sourceId: 'personal', id: 'private-pattern', type: 'pattern', title: 'Private pattern' },
    ]);
    expect(test.ports.listPersonal).toHaveBeenCalledWith(test.lifecycle.signal);
    expect(test.ports.refreshUsage).toHaveBeenCalledTimes(1);
    expect(test.ports.refreshNativeRuntime).not.toHaveBeenCalled();
    expect(test.ports.ready).toHaveBeenCalledTimes(1);
  });

  it('honors valid session and settings links without changing other preferences', async () => {
    const test = setup();
    test.ports.entry.mockReturnValue({ sessionId: 'two', settings: true });
    await test.lifecycle.start();
    const expected = { ...preferences, activeSessionId: 'two' };
    expect(test.store.saveSettings).toHaveBeenCalledWith(expected);
    expect(test.ports.settingsChanged).toHaveBeenCalledWith(expected);
    expect(test.ports.openSettings).toHaveBeenCalledTimes(1);
  });

  it.each(['unknown', null])(
    'ignores invalid session=%s and falls back to the first restored session',
    async (sessionId) => {
      const test = setup();
      test.store.loadSettings.mockResolvedValue({ ...preferences, activeSessionId: 'missing' });
      test.ports.entry.mockReturnValue({ sessionId, settings: false });
      await test.lifecycle.start();
      expect(test.ports.settingsChanged).toHaveBeenCalledWith({
        ...preferences,
        activeSessionId: 'one',
      });
      expect(test.store.saveSettings).not.toHaveBeenCalled();
    },
  );

  it('keeps the active choice empty when there are no sessions', async () => {
    const test = setup();
    test.ports.restoreSessions.mockResolvedValue([]);
    await test.lifecycle.start();
    expect(test.ports.settingsChanged).toHaveBeenCalledWith({
      ...preferences,
      activeSessionId: null,
    });
  });

  it('applies the web default model and session link in one encrypted write', async () => {
    const test = setup();
    test.store.loadSettings.mockResolvedValue({ ...preferences, model: '' });
    test.ports.entry.mockReturnValue({ sessionId: 'two', settings: false });
    await test.lifecycle.start();
    expect(test.store.saveSettings).toHaveBeenCalledTimes(1);
    expect(test.store.saveSettings).toHaveBeenCalledWith({
      ...preferences,
      model: 'default-model',
      activeSessionId: 'two',
    });
  });

  it('does not select a web model or request web usage on the desktop', async () => {
    const test = setup();
    test.ports.desktop.mockReturnValue(true);
    test.store.loadSettings.mockResolvedValue({ ...preferences, model: '' });
    await test.lifecycle.start();
    expect(test.ports.settingsChanged).toHaveBeenCalledWith({ ...preferences, model: '' });
    expect(test.store.saveSettings).not.toHaveBeenCalled();
    expect(test.ports.refreshUsage).not.toHaveBeenCalled();
    expect(test.ports.refreshNativeRuntime).toHaveBeenCalledTimes(1);
  });

  it.each([{ openRouterKey: '' }, { monthlyBudgetUsd: null }, { monthlyBudgetUsd: undefined }])(
    'avoids unnecessary startup usage requests for %j',
    async (override) => {
      const test = setup();
      test.store.loadSettings.mockResolvedValue({ ...preferences, ...override });
      await test.lifecycle.start();
      expect(test.ports.refreshUsage).not.toHaveBeenCalled();
    },
  );

  it('reports initialization failures while leaving controls ready for recovery', async () => {
    const test = setup();
    test.store.loadSettings.mockRejectedValue(new Error('Storage blocked'));
    await test.lifecycle.start();
    expect(test.ports.error).toHaveBeenCalledWith(
      'Private Mira storage could not be opened: Storage blocked',
    );
    expect(test.ports.ready).toHaveBeenCalledTimes(1);
    expect(test.ports.settingsChanged).not.toHaveBeenCalled();
    expect(test.ports.personalChanged).toHaveBeenCalledTimes(1);
  });

  it('makes private lookup failure optional without a Commons fallback', async () => {
    const test = setup();
    test.ports.listPersonal.mockRejectedValue(new Error('Private lookup blocked'));
    await test.lifecycle.start();
    expect(test.ports.personalChanged).not.toHaveBeenCalled();
    expect(test.ports.error).not.toHaveBeenCalled();
    expect(test.ports.ready).toHaveBeenCalledTimes(1);
  });

  it('does not wait for the optional private catalog before making Mira ready', async () => {
    const test = setup();
    const gate = deferred<readonly MiraPatternSummary[]>();
    test.ports.listPersonal.mockReturnValue(gate.promise);
    const work = test.lifecycle.start();
    await vi.waitFor(() => expect(test.ports.ready).toHaveBeenCalledTimes(1));
    expect(test.ports.personalChanged).not.toHaveBeenCalled();
    gate.resolve([]);
    await work;
  });
});

describe('Mira page disposal', () => {
  it('invalidates the host and aborts requests before detaching listeners and stopping controllers exactly once', async () => {
    const test = setup();
    await test.lifecycle.start();
    const order: string[] = [];
    test.lifecycle.signal.addEventListener('abort', () => order.push('abort'));
    test.detachShortcut.mockImplementation(() => order.push('shortcut'));
    test.detachVisibility.mockImplementation(() => order.push('visibility'));
    test.cleanup.forEach((stop, index) =>
      stop.mockImplementation(() => {
        expect(test.lifecycle.disposed).toBe(true);
        expect(test.lifecycle.signal.aborted).toBe(true);
        order.push(`controller-${index}`);
      }),
    );
    test.lifecycle.dispose();
    test.lifecycle.dispose();
    await test.lifecycle.start();
    expect(order).toEqual([
      'abort',
      'shortcut',
      'visibility',
      'controller-0',
      'controller-1',
      'controller-2',
    ]);
    expect(test.ports.openStore).toHaveBeenCalledTimes(1);
  });

  it('does not start storage, subscriptions or optional lookups if disposed before mounting', async () => {
    const test = setup();
    test.lifecycle.dispose();
    await test.lifecycle.start();
    expect(test.ports.openStore).not.toHaveBeenCalled();
    expect(test.ports.subscriptions[0]).not.toHaveBeenCalled();
    expect(test.ports.listPersonal).not.toHaveBeenCalled();
    expect(test.ports.ready).not.toHaveBeenCalled();
  });

  it.each([false, true])('ignores late restoration with failure=%s', async (fail) => {
    const test = setup();
    const gate = deferred<readonly Session[]>();
    test.ports.restoreSessions.mockReturnValue(gate.promise);
    test.ports.entry.mockReturnValue({ sessionId: 'one', settings: true });
    const work = test.lifecycle.start();
    test.lifecycle.dispose();
    if (fail) gate.reject(new Error('Late failure'));
    else gate.resolve([createSession('one', 'cbt', at)]);
    await work;
    expect(test.store.saveSettings).not.toHaveBeenCalled();
    expect(test.ports.settingsChanged).not.toHaveBeenCalled();
    expect(test.ports.openSettings).not.toHaveBeenCalled();
    expect(test.ports.ready).not.toHaveBeenCalled();
    expect(test.ports.error).not.toHaveBeenCalled();
    expect(test.ports.startPolling).not.toHaveBeenCalled();
  });

  it('allows an already-started settings write to finish but starts no follow-up work', async () => {
    const test = setup();
    const gate = deferred<void>();
    test.store.loadSettings.mockResolvedValue({ ...preferences, model: '' });
    test.store.saveSettings.mockReturnValue(gate.promise);
    test.ports.entry.mockReturnValue({ sessionId: 'one', settings: true });
    const work = test.lifecycle.start();
    await vi.waitFor(() => expect(test.store.saveSettings).toHaveBeenCalledTimes(1));
    test.lifecycle.dispose();
    gate.resolve();
    await work;
    expect(test.ports.settingsChanged).not.toHaveBeenCalled();
    expect(test.ports.refreshUsage).not.toHaveBeenCalled();
    expect(test.ports.openSettings).not.toHaveBeenCalled();
    expect(test.ports.ready).not.toHaveBeenCalled();
  });

  it('does not open settings or publish readiness after a late native setup completes', async () => {
    const test = setup();
    const gate = deferred<void>();
    test.ports.desktop.mockReturnValue(true);
    test.ports.entry.mockReturnValue({ sessionId: null, settings: true });
    test.ports.refreshNativeRuntime.mockReturnValue(gate.promise);
    const work = test.lifecycle.start();
    await vi.waitFor(() => expect(test.ports.refreshNativeRuntime).toHaveBeenCalledTimes(1));
    test.lifecycle.dispose();
    gate.resolve();
    await work;
    expect(test.ports.openSettings).not.toHaveBeenCalled();
    expect(test.ports.ready).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'suppresses late optional catalog completion with failure=%s',
    async (fail) => {
      const test = setup();
      const gate = deferred<readonly MiraPatternSummary[]>();
      test.ports.listPersonal.mockReturnValue(gate.promise);
      const work = test.lifecycle.start();
      await vi.waitFor(() => expect(test.ports.ready).toHaveBeenCalledTimes(1));
      test.lifecycle.dispose();
      if (fail) gate.reject(new Error('Late private lookup failure'));
      else
        gate.resolve([{ sourceId: 'personal', id: 'private', type: 'pattern', title: 'Private' }]);
      await work;
      expect(test.ports.personalChanged).not.toHaveBeenCalled();
      expect(test.ports.error).not.toHaveBeenCalled();
    },
  );

  it('continues teardown if one subscription or controller fails', async () => {
    const test = setup();
    await test.lifecycle.start();
    test.detachShortcut.mockImplementation(() => {
      throw new Error('Listener failure');
    });
    test.cleanup[0].mockImplementation(() => {
      throw new Error('Device failure');
    });
    test.lifecycle.dispose();
    expect(test.ports.cleanupFailed).toHaveBeenCalledTimes(2);
    expect(test.detachVisibility).toHaveBeenCalledTimes(1);
    expect(test.cleanup[1]).toHaveBeenCalledTimes(1);
    expect(test.cleanup[2]).toHaveBeenCalledTimes(1);
  });
});
