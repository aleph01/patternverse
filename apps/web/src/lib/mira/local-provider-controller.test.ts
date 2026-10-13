import { describe, expect, it, vi } from 'vitest';
import { createMiraLocalProvider, type MiraLocalProviderState } from './local-provider-controller';
import type {
  LocalDownloadEvent,
  LocalModelChoice,
  LocalRuntimeStatus,
  LocalSetup,
} from './native';
import type { MiraSettings } from './private-store';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const choice = (id: string, installed = true, recommended = false): LocalModelChoice => ({
  id,
  installed,
  recommended,
  title: id,
  summary: '',
  canInstall: true,
  downloadBytes: 100,
});
function setup() {
  let settings: MiraSettings = {
    model: 'existing',
    openRouterKey: 'keep-key',
    promptOverrides: { cbt: 'keep-prompt' },
    activeSessionId: 'session',
    monthlyBudgetUsd: 10,
  };
  let state: MiraLocalProviderState = {
    runtime: { status: 'starting' },
    localChoices: [],
    modelProgress: '',
  };
  let enabled = true;
  let available = true;
  let emit: (event: LocalDownloadEvent) => void = () => {};
  let poll: () => void = () => {};
  const cancelPoll = vi.fn();
  const ports = {
    enabled: () => enabled,
    available: () => available,
    settings: () => settings,
    saveSettings: vi.fn(async (change: { model: string }) => {
      settings = { ...settings, ...change };
      return true;
    }),
    status: vi.fn(async (): Promise<LocalRuntimeStatus> => ({ status: 'ready' })),
    setup: vi.fn(async (): Promise<LocalSetup> => ({
      choices: [choice('existing'), choice('recommended', true, true)],
      selectedModelId: 'recommended',
      recommendedModelId: 'recommended',
      activeDownload: null,
    })),
    restart: vi.fn(async (): Promise<LocalRuntimeStatus> => ({ status: 'starting' })),
    select: vi.fn<(id: string) => Promise<void>>(async () => {}),
    download: vi.fn(async (_id: string, callback: (event: LocalDownloadEvent) => void) => {
      emit = callback;
    }),
    every: vi.fn((_milliseconds: number, callback: () => void) => {
      poll = callback;
      return cancelPoll;
    }),
    changed: vi.fn((change: Partial<MiraLocalProviderState>) => {
      state = { ...state, ...change };
    }),
    error: vi.fn(),
    notice: vi.fn(),
  };
  return {
    ports,
    controller: createMiraLocalProvider(ports),
    cancelPoll,
    state: () => state,
    settings: () => settings,
    setModel: (model: string) => {
      settings = { ...settings, model };
    },
    enable: (value: boolean) => {
      enabled = value;
    },
    available: (value: boolean) => {
      available = value;
    },
    emit: (event: LocalDownloadEvent) => emit(event),
    poll: () => poll(),
  };
}

describe('Mira local provider coordination', () => {
  it('does not probe or schedule anything until explicitly asked', () => {
    const t = setup();
    expect(t.ports.status).not.toHaveBeenCalled();
    expect(t.ports.every).not.toHaveBeenCalled();
  });

  it('retains the installed accepted model and publishes runtime/choices', async () => {
    const t = setup();
    await t.controller.refresh();
    expect(t.state().runtime.status).toBe('ready');
    expect(t.state().localChoices).toHaveLength(2);
    expect(t.ports.saveSettings).not.toHaveBeenCalled();
    expect(t.ports.select).not.toHaveBeenCalled();
  });

  it.each([
    [[choice('selected'), choice('recommended', true, true)], 'selected', 'selected'],
    [[choice('recommended', true, true), choice('fallback')], 'missing', 'recommended'],
    [[choice('not-installed', false, true), choice('fallback')], 'missing', 'fallback'],
  ])(
    'preserves the existing installed-model fallback order',
    async (choices, selected, expected) => {
      const t = setup();
      t.setModel('missing');
      t.ports.setup.mockResolvedValue({
        choices,
        selectedModelId: selected,
        recommendedModelId: '',
        activeDownload: null,
      });
      await t.controller.refresh();
      expect(t.ports.saveSettings).toHaveBeenCalledWith({ model: expected });
      expect(t.settings()).toMatchObject({
        openRouterKey: 'keep-key',
        activeSessionId: 'session',
        promptOverrides: { cbt: 'keep-prompt' },
        monthlyBudgetUsd: 10,
      });
    },
  );

  it('does not select uninstalled models or load setup for an unavailable runtime', async () => {
    const t = setup();
    t.ports.status.mockResolvedValue({ status: 'unavailable', detailCode: 'OFF' });
    await t.controller.refresh();
    expect(t.ports.setup).not.toHaveBeenCalled();
    expect(t.state().runtime).toEqual({ status: 'unavailable', detailCode: 'OFF' });
    t.ports.status.mockResolvedValue({ status: 'ready' });
    t.ports.setup.mockResolvedValue({
      choices: [choice('missing', false)],
      selectedModelId: 'missing',
      recommendedModelId: '',
      activeDownload: null,
    });
    await t.controller.refresh();
    expect(t.ports.saveSettings).not.toHaveBeenCalled();
  });

  it('polls every three seconds, coalesces slow refreshes, and cleans up once', async () => {
    const t = setup();
    const gate = deferred<LocalRuntimeStatus>();
    t.ports.status.mockReturnValue(gate.promise);
    t.controller.startPolling();
    t.controller.startPolling();
    expect(t.ports.every).toHaveBeenCalledTimes(1);
    expect(t.ports.every.mock.calls[0][0]).toBe(3000);
    t.poll();
    t.poll();
    const pending = t.controller.refresh();
    expect(t.ports.status).toHaveBeenCalledTimes(1);
    gate.resolve({ status: 'ready' });
    await pending;
    t.controller.dispose();
    t.controller.dispose();
    t.poll();
    expect(t.cancelPoll).toHaveBeenCalledTimes(1);
    expect(t.ports.status).toHaveBeenCalledTimes(1);
  });

  it('does nothing on web builds or after disposal', async () => {
    const t = setup();
    t.enable(false);
    t.controller.startPolling();
    await t.controller.refresh();
    await t.controller.retry();
    await t.controller.choose('new');
    await t.controller.install('new');
    expect(t.ports.every).not.toHaveBeenCalled();
    expect(t.ports.status).not.toHaveBeenCalled();
    expect(t.ports.restart).not.toHaveBeenCalled();
    expect(t.ports.select).not.toHaveBeenCalled();
    expect(t.ports.download).not.toHaveBeenCalled();
  });

  it('does not save late setup after a deliberate model change or disposal', async () => {
    const t = setup();
    const gate = deferred<LocalSetup>();
    t.ports.setup.mockReturnValue(gate.promise);
    const pending = t.controller.refresh();
    await vi.waitFor(() => expect(t.ports.setup).toHaveBeenCalled());
    await t.controller.choose('deliberate');
    gate.resolve({
      choices: [choice('old')],
      selectedModelId: 'old',
      recommendedModelId: '',
      activeDownload: null,
    });
    await pending;
    expect(t.settings().model).toBe('deliberate');
    expect(t.ports.saveSettings).toHaveBeenCalledTimes(1);
    const later = deferred<LocalRuntimeStatus>();
    t.ports.status.mockReturnValue(later.promise);
    const refreshing = t.controller.refresh();
    t.controller.dispose();
    t.ports.changed.mockClear();
    later.resolve({ status: 'ready' });
    await refreshing;
    expect(t.ports.changed).not.toHaveBeenCalled();
  });

  it('restarts and rechecks the local runtime, and reports restart failures', async () => {
    const t = setup();
    await t.controller.retry();
    expect(t.ports.restart).toHaveBeenCalledTimes(1);
    expect(t.ports.status).toHaveBeenCalledTimes(1);
    t.ports.restart.mockRejectedValue(new Error('Restart failed'));
    await t.controller.retry();
    expect(t.ports.error).toHaveBeenLastCalledWith('Restart failed');
  });

  it('does not follow a delayed restart after disposal', async () => {
    const t = setup();
    const gate = deferred<LocalRuntimeStatus>();
    t.ports.restart.mockReturnValue(gate.promise);
    const retrying = t.controller.retry();
    t.controller.dispose();
    t.ports.changed.mockClear();
    gate.resolve({ status: 'ready' });
    await retrying;
    expect(t.ports.changed).not.toHaveBeenCalled();
    expect(t.ports.status).not.toHaveBeenCalled();
  });

  it('waits out an obsolete poll before rechecking a restarted runtime', async () => {
    const t = setup();
    const gate = deferred<LocalRuntimeStatus>();
    t.ports.status.mockReturnValueOnce(gate.promise);
    const old = t.controller.refresh();
    const retrying = t.controller.retry();
    await vi.waitFor(() => expect(t.ports.restart).toHaveBeenCalled());
    gate.resolve({ status: 'unavailable', detailCode: 'STALE' });
    await Promise.all([old, retrying]);
    expect(t.ports.status).toHaveBeenCalledTimes(2);
    expect(t.state().runtime.status).toBe('ready');
    expect(t.ports.changed.mock.calls).not.toContainEqual([
      { runtime: { status: 'unavailable', detailCode: 'STALE' } },
    ]);
  });

  it('selects explicitly through IPC before saving, and leaves settings intact on failure', async () => {
    const t = setup();
    t.available(false);
    await t.controller.choose('new');
    expect(t.ports.select).not.toHaveBeenCalled();
    t.available(true);
    t.ports.select.mockRejectedValueOnce(new Error('Cannot select'));
    await expect(t.controller.choose('new')).rejects.toThrow('Cannot select');
    expect(t.settings().model).toBe('existing');
    await t.controller.choose('new');
    expect(t.settings().model).toBe('new');
    expect(t.ports.notice).toHaveBeenCalledWith('Local model selected.');
  });

  it('does not save a selection that completes after disposal', async () => {
    const t = setup();
    const gate = deferred<void>();
    t.ports.select.mockReturnValue(gate.promise);
    const choosing = t.controller.choose('new');
    t.controller.dispose();
    gate.resolve();
    await choosing;
    expect(t.ports.saveSettings).not.toHaveBeenCalled();
    expect(t.ports.notice).not.toHaveBeenCalled();
  });

  it('reports matching download progress, prevents duplicate starts, and selects once on completion', async () => {
    const t = setup();
    await t.controller.install('download');
    await t.controller.install('other');
    expect(t.ports.download).toHaveBeenCalledTimes(1);
    t.emit({ kind: 'progress', modelId: 'other', totalBytes: 100, completedBytes: 50 });
    expect(t.state().modelProgress).toBe('Preparing local model download…');
    t.emit({ kind: 'progress', modelId: 'download', totalBytes: 100, completedBytes: 50 });
    expect(t.state().modelProgress).toBe('Downloading local model · 50%');
    t.emit({ kind: 'complete', modelId: 'download' });
    t.emit({ kind: 'complete', modelId: 'download' });
    await vi.waitFor(() => expect(t.ports.select).toHaveBeenCalledWith('download'));
    expect(t.ports.select).toHaveBeenCalledTimes(1);
    expect(t.state().modelProgress).toBe('');
  });

  it.each(['failed', 'cancelled'])(
    'reports %s downloads and allows another attempt',
    async (kind) => {
      const t = setup();
      await t.controller.install('download');
      t.emit({ kind, modelId: 'download', detailCode: 'DOWNLOAD_ERROR' });
      expect(t.ports.error).toHaveBeenLastCalledWith('DOWNLOAD_ERROR');
      expect(t.state().modelProgress).toBe('');
      await t.controller.install('download');
      expect(t.ports.download).toHaveBeenCalledTimes(2);
    },
  );

  it('ignores late download events and performs no completion follow-up after disposal', async () => {
    const t = setup();
    await t.controller.install('download');
    t.controller.dispose();
    t.ports.changed.mockClear();
    t.emit({ kind: 'progress', modelId: 'download', totalBytes: 100, completedBytes: 80 });
    t.emit({ kind: 'failed', modelId: 'download', detailCode: 'LATE' });
    t.emit({ kind: 'complete', modelId: 'download' });
    await Promise.resolve();
    expect(t.ports.changed).not.toHaveBeenCalled();
    expect(t.ports.error).not.toHaveBeenCalled();
    expect(t.ports.status).not.toHaveBeenCalled();
    expect(t.ports.select).not.toHaveBeenCalled();
  });

  it('clears progress on IPC failure and ignores events/errors after disposal', async () => {
    const t = setup();
    t.ports.download.mockRejectedValueOnce(new Error('IPC failed'));
    await t.controller.install('download');
    expect(t.ports.error).toHaveBeenLastCalledWith('IPC failed');
    expect(t.state().modelProgress).toBe('');
    const gate = deferred<void>();
    t.ports.download.mockImplementationOnce((_id, callback) => {
      callback({ kind: 'progress', modelId: 'download', totalBytes: 100, completedBytes: 20 });
      return gate.promise;
    });
    const installing = t.controller.install('download');
    t.controller.dispose();
    t.ports.changed.mockClear();
    t.ports.error.mockClear();
    gate.reject(new Error('Late error'));
    await installing;
    expect(t.ports.changed).not.toHaveBeenCalled();
    expect(t.ports.error).not.toHaveBeenCalled();
    expect(t.ports.select).not.toHaveBeenCalled();
  });
});
