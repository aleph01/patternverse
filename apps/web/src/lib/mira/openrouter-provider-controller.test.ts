import { describe, expect, it, vi } from 'vitest';
import {
  createMiraOpenRouterProvider,
  type MiraOpenRouterProviderState,
} from './openrouter-provider-controller';
import type { MiraSettings } from './private-store';
import type { OpenRouterKeyUsage, ZdrModel } from './openrouter';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const usage = (monthlyUsd = 2): OpenRouterKeyUsage => ({
  monthlyUsd,
  providerLimitUsd: null,
  providerRemainingUsd: null,
  providerLimitReset: null,
});
function setup() {
  let settings: MiraSettings = {
    model: 'saved-model',
    openRouterKey: 'saved-key',
    promptOverrides: { cbt: 'private-prompt' },
    activeSessionId: 'session',
    monthlyBudgetUsd: 10,
  };
  let draftKey = 'saved-key';
  let enabled = true;
  let available = true;
  let sending = false;
  let state: MiraOpenRouterProviderState = {
    connectingOpenRouter: false,
    keyUsage: null,
    usageCheckedAt: null,
    usageError: '',
    loadingUsage: false,
    models: [],
    loadingModels: false,
    modelsChecked: false,
  };
  const ports = {
    enabled: () => enabled,
    available: () => available,
    sending: () => sending,
    settings: () => settings,
    draftKey: () => draftKey,
    saveSettings: vi.fn(async (change: { openRouterKey: string; model?: string }) => {
      settings = { ...settings, ...change };
      return true;
    }),
    usage: vi.fn<(key: string) => Promise<OpenRouterKeyUsage>>(async () => usage()),
    models: vi.fn<(key: string) => Promise<readonly ZdrModel[]>>(async () => [
      { id: 'zdr-model', name: 'ZDR model' },
    ]),
    beginConnection: vi.fn(async () => 'https://openrouter.test/authorize'),
    navigate: vi.fn(),
    now: () => '2026-10-11T12:00:00.000Z',
    changed: vi.fn((change: Partial<MiraOpenRouterProviderState>) => {
      state = { ...state, ...change };
    }),
    disconnected: vi.fn(() => {
      draftKey = '';
    }),
    clearMessages: vi.fn(),
    error: vi.fn(),
    notice: vi.fn(),
  };
  return {
    ports,
    controller: createMiraOpenRouterProvider(ports),
    state: () => state,
    settings: () => settings,
    key: (key: string) => {
      settings = { ...settings, openRouterKey: key };
    },
    draft: (key: string) => {
      draftKey = key;
    },
    enable: (value: boolean) => {
      enabled = value;
    },
    available: (value: boolean) => {
      available = value;
    },
    sending: (value: boolean) => {
      sending = value;
    },
  };
}

describe('Mira OpenRouter provider coordination', () => {
  it('does not access adapters or navigate during construction', () => {
    const t = setup();
    expect(t.ports.usage).not.toHaveBeenCalled();
    expect(t.ports.models).not.toHaveBeenCalled();
    expect(t.ports.beginConnection).not.toHaveBeenCalled();
  });

  it('reads saved-key usage and timestamp without changing accepted settings', async () => {
    const t = setup();
    await t.controller.refreshUsage();
    expect(t.ports.usage).toHaveBeenCalledWith('saved-key');
    expect(t.state()).toMatchObject({
      keyUsage: usage(),
      loadingUsage: false,
      usageError: '',
      usageCheckedAt: '2026-10-11T12:00:00.000Z',
    });
    expect(t.ports.saveSettings).not.toHaveBeenCalled();
  });

  it('reports usage failures without blocking the caller or changing connection', async () => {
    const t = setup();
    t.ports.usage.mockRejectedValue(new Error('Usage unavailable'));
    await t.controller.refreshUsage();
    expect(t.state()).toMatchObject({ loadingUsage: false, usageError: 'Usage unavailable' });
    expect(t.settings().openRouterKey).toBe('saved-key');
    expect(t.ports.error).not.toHaveBeenCalled();
  });

  it('ignores older usage responses, including their busy/error cleanup', async () => {
    const t = setup();
    const first = deferred<OpenRouterKeyUsage>();
    const second = deferred<OpenRouterKeyUsage>();
    t.ports.usage.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const old = t.controller.refreshUsage();
    const latest = t.controller.refreshUsage();
    first.reject(new Error('Old failure'));
    await old;
    expect(t.state().loadingUsage).toBe(true);
    expect(t.state().usageError).toBe('');
    second.resolve(usage(5));
    await latest;
    expect(t.state().keyUsage?.monthlyUsd).toBe(5);
    expect(t.state().loadingUsage).toBe(false);
  });

  it('does not show usage for a different accepted key', async () => {
    const t = setup();
    const gate = deferred<OpenRouterKeyUsage>();
    t.ports.usage.mockReturnValue(gate.promise);
    const pending = t.controller.refreshUsage();
    t.key('different');
    gate.resolve(usage(99));
    await pending;
    expect(t.state().keyUsage).toBeNull();
    expect(t.state().usageCheckedAt).toBeNull();
  });

  it('discovers models using the editable key without replacing the saved model', async () => {
    const t = setup();
    t.draft('draft-key');
    await t.controller.refreshModels('draft-key');
    expect(t.ports.models).toHaveBeenCalledWith('draft-key');
    expect(t.state()).toMatchObject({
      modelsChecked: true,
      loadingModels: false,
      models: [{ id: 'zdr-model', name: 'ZDR model' }],
    });
    expect(t.settings().model).toBe('saved-model');
    expect(t.ports.saveSettings).not.toHaveBeenCalled();
  });

  it('invalidates discovery immediately on key edits and ignores an old response', async () => {
    const t = setup();
    const gate = deferred<readonly ZdrModel[]>();
    t.ports.models.mockReturnValue(gate.promise);
    const pending = t.controller.refreshModels('saved-key');
    t.draft('new-key');
    t.controller.keyEdited();
    gate.resolve([{ id: 'stale', name: 'Stale' }]);
    await pending;
    expect(t.state()).toMatchObject({ models: [], modelsChecked: false, loadingModels: false });
  });

  it('only publishes the latest discovery and distinguishes empty/error responses', async () => {
    const t = setup();
    const gate = deferred<readonly ZdrModel[]>();
    t.ports.models.mockReturnValueOnce(gate.promise);
    const old = t.controller.refreshModels('saved-key');
    await t.controller.refreshModels('saved-key');
    gate.resolve([]);
    await old;
    expect(t.state().models).toHaveLength(1);
    expect(t.ports.notice).not.toHaveBeenCalled();
    t.ports.models.mockResolvedValueOnce([]);
    await t.controller.refreshModels('saved-key');
    expect(t.ports.notice).toHaveBeenCalledWith(
      'No zero-retention models are currently available for this key.',
    );
    t.ports.models.mockRejectedValueOnce(new Error('Discovery failed'));
    await t.controller.refreshModels('saved-key');
    expect(t.ports.error).toHaveBeenCalledWith('Discovery failed');
    expect(t.state().loadingModels).toBe(false);
  });

  it('saves trimmed connection fields only and refreshes usage', async () => {
    const t = setup();
    await t.controller.saveConnection(' new-key ', ' new-model ');
    expect(t.ports.saveSettings).toHaveBeenCalledWith({
      openRouterKey: 'new-key',
      model: 'new-model',
    });
    expect(t.settings()).toMatchObject({
      activeSessionId: 'session',
      monthlyBudgetUsd: 10,
      promptOverrides: { cbt: 'private-prompt' },
    });
    expect(t.ports.usage).toHaveBeenCalledWith('new-key');
    expect(t.ports.notice).toHaveBeenCalledWith(
      'Provider settings saved encrypted on this device.',
    );
  });

  it('does not publish successful saves when persistence fails or declines', async () => {
    const t = setup();
    t.ports.saveSettings.mockRejectedValueOnce(new Error('Storage failed'));
    await expect(t.controller.saveConnection('new', 'model')).rejects.toThrow('Storage failed');
    expect(t.settings().openRouterKey).toBe('saved-key');
    expect(t.ports.notice).not.toHaveBeenCalled();
    expect(t.ports.usage).not.toHaveBeenCalled();
    t.ports.saveSettings.mockResolvedValueOnce(false);
    await t.controller.saveConnection('new', 'model');
    expect(t.ports.notice).not.toHaveBeenCalled();
  });

  it('disconnects without removing sessions, model, prompts or budget; clears pending results', async () => {
    const t = setup();
    const usageGate = deferred<OpenRouterKeyUsage>();
    const modelsGate = deferred<readonly ZdrModel[]>();
    t.ports.usage.mockReturnValue(usageGate.promise);
    t.ports.models.mockReturnValue(modelsGate.promise);
    const reading = t.controller.refreshUsage();
    const discovery = t.controller.refreshModels('saved-key');
    await t.controller.disconnect();
    usageGate.resolve(usage(99));
    modelsGate.resolve([{ id: 'old', name: 'Old' }]);
    await Promise.all([reading, discovery]);
    expect(t.settings()).toMatchObject({
      openRouterKey: '',
      model: 'saved-model',
      activeSessionId: 'session',
      monthlyBudgetUsd: 10,
      promptOverrides: { cbt: 'private-prompt' },
    });
    expect(t.state()).toMatchObject({
      keyUsage: null,
      usageCheckedAt: null,
      usageError: '',
      loadingUsage: false,
      models: [],
      modelsChecked: false,
      loadingModels: false,
    });
    expect(t.ports.disconnected).toHaveBeenCalledTimes(1);
  });

  it('uses the host authorization/navigation ports and avoids duplicate connections', async () => {
    const t = setup();
    const gate = deferred<string>();
    t.ports.beginConnection.mockReturnValue(gate.promise);
    const pending = t.controller.connect();
    await t.controller.connect();
    expect(t.state().connectingOpenRouter).toBe(true);
    expect(t.ports.beginConnection).toHaveBeenCalledTimes(1);
    gate.resolve('https://openrouter.test/authorize');
    await pending;
    expect(t.ports.navigate).toHaveBeenCalledWith('https://openrouter.test/authorize');
  });

  it('reports authorization failure without exposing details and permits retry', async () => {
    const t = setup();
    t.ports.beginConnection.mockRejectedValueOnce(new Error('secret-details'));
    await t.controller.connect();
    expect(t.state().connectingOpenRouter).toBe(false);
    expect(t.ports.error).toHaveBeenCalledWith(
      'Could not start the connection. Allow browser storage and try again.',
    );
    await t.controller.connect();
    expect(t.ports.navigate).toHaveBeenCalledTimes(1);
  });

  it('does not connect or disconnect during replies', async () => {
    const t = setup();
    t.sending(true);
    await t.controller.connect();
    await t.controller.disconnect();
    expect(t.ports.beginConnection).not.toHaveBeenCalled();
    expect(t.ports.saveSettings).not.toHaveBeenCalled();
  });

  it('does not use cloud adapters on desktop, without a key, or save without storage', async () => {
    const t = setup();
    t.key('');
    await t.controller.refreshUsage();
    expect(t.ports.usage).not.toHaveBeenCalled();
    t.available(false);
    await t.controller.saveConnection('key', 'model');
    await t.controller.disconnect();
    expect(t.ports.saveSettings).not.toHaveBeenCalled();
    t.enable(false);
    await t.controller.connect();
    await t.controller.refreshModels('saved-key');
    expect(t.ports.beginConnection).not.toHaveBeenCalled();
    expect(t.ports.models).not.toHaveBeenCalled();
  });

  it('suppresses late usage, discovery, redirect and all subsequent actions after disposal', async () => {
    const t = setup();
    const usageGate = deferred<OpenRouterKeyUsage>();
    const modelsGate = deferred<readonly ZdrModel[]>();
    const authGate = deferred<string>();
    t.ports.usage.mockReturnValue(usageGate.promise);
    t.ports.models.mockReturnValue(modelsGate.promise);
    t.ports.beginConnection.mockReturnValue(authGate.promise);
    const pending = [
      t.controller.refreshUsage(),
      t.controller.refreshModels('saved-key'),
      t.controller.connect(),
    ];
    t.controller.dispose();
    t.ports.changed.mockClear();
    t.ports.error.mockClear();
    t.ports.notice.mockClear();
    usageGate.reject(new Error('Late usage'));
    modelsGate.reject(new Error('Late discovery'));
    authGate.resolve('https://openrouter.test/authorize');
    await Promise.all(pending);
    await t.controller.refreshUsage();
    await t.controller.refreshModels('saved-key');
    await t.controller.connect();
    await t.controller.disconnect();
    await t.controller.saveConnection('new', 'model');
    t.controller.keyEdited();
    expect(t.ports.changed).not.toHaveBeenCalled();
    expect(t.ports.error).not.toHaveBeenCalled();
    expect(t.ports.notice).not.toHaveBeenCalled();
    expect(t.ports.navigate).not.toHaveBeenCalled();
    expect(t.ports.saveSettings).not.toHaveBeenCalled();
  });
});
