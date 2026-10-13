import type { Session } from '@patternverse/companion-core';
import type { MiraPatternSummary } from './context';
import type { MiraSettings, PrivateMiraStore } from './private-store';

type Ports = Readonly<{
  desktop(): boolean;
  defaultModel: string;
  openStore(): Pick<PrivateMiraStore, 'loadSettings' | 'saveSettings'>;
  restoreSessions(): Promise<readonly Session[]>;
  entry(): Readonly<{ sessionId: string | null; settings: boolean }>;
  settingsChanged(settings: MiraSettings): void;
  listPersonal(signal: AbortSignal): Promise<readonly MiraPatternSummary[]>;
  personalChanged(patterns: readonly MiraPatternSummary[]): void;
  refreshUsage(): void;
  refreshNativeRuntime(): Promise<void>;
  openSettings(): Promise<void>;
  startPolling(): void;
  subscriptions: readonly (() => () => void)[];
  cleanup: readonly (() => void)[];
  cleanupFailed(cause: unknown): void;
  error(message: string): void;
  ready(): void;
}>;

/** One page lifetime. Existing controllers still own their individual operations;
 * the host supplies browser subscriptions, storage and UI publication.
 */
export function createMiraLifecycle(ports: Ports) {
  const controller = new AbortController();
  const detach: (() => void)[] = [];
  let disposed = false;
  let started: Promise<void> | undefined;

  async function initialize() {
    if (disposed) return;
    const store = ports.openStore();
    const [restored, preferences] = await Promise.all([
      ports.restoreSessions(),
      store.loadSettings(),
    ]);
    if (disposed) return;
    const entry = ports.entry();
    const requested = restored.some((item) => item.id === entry.sessionId);
    const defaultModel = !ports.desktop() && !preferences.model;
    const settings = {
      ...preferences,
      model: defaultModel ? ports.defaultModel : preferences.model,
      activeSessionId: requested
        ? entry.sessionId
        : restored.some((item) => item.id === preferences.activeSessionId)
          ? preferences.activeSessionId
          : (restored[0]?.id ?? null),
    };
    // Both startup corrections belong in the same existing encrypted settings write.
    if (requested || defaultModel) {
      await store.saveSettings(settings);
      if (disposed) return;
    }
    ports.settingsChanged(settings);
    if (disposed) return;
    // Native polls may choose and persist a model; they must see restored preferences first.
    ports.startPolling();
    if (!ports.desktop() && settings.openRouterKey && settings.monthlyBudgetUsd != null)
      ports.refreshUsage();
    if (ports.desktop()) {
      await ports.refreshNativeRuntime();
      if (disposed) return;
    }
    if (entry.settings) await ports.openSettings();
  }

  async function loadPersonal() {
    if (disposed) return;
    try {
      const entries = await ports.listPersonal(controller.signal);
      if (!disposed) ports.personalChanged(entries.filter((entry) => entry.type === 'pattern'));
    } catch {
      // Private lookup is optional; never substitute a public same-ID pattern.
    }
  }

  async function start() {
    try {
      for (const subscribe of ports.subscriptions) {
        if (disposed) return;
        detach.push(subscribe());
      }
      if (disposed) return;
      await initialize();
    } catch (cause) {
      if (!disposed)
        ports.error(
          `Private Mira storage could not be opened: ${cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'}`,
        );
    } finally {
      if (!disposed) ports.ready();
    }
  }

  return {
    get disposed() {
      return disposed;
    },
    signal: controller.signal,
    start(): Promise<void> {
      if (disposed) return Promise.resolve();
      if (!started) started = Promise.all([start(), loadPersonal()]).then(() => undefined);
      return started;
    },
    dispose() {
      if (disposed) return;
      // Invalidate all host continuations before cancellation can trigger device callbacks.
      disposed = true;
      controller.abort();
      for (const stop of [...detach, ...ports.cleanup]) {
        try {
          stop();
        } catch (cause) {
          // A failed device cleanup must not strand another microphone, timer or listener.
          ports.cleanupFailed(cause);
        }
      }
      detach.length = 0;
    },
  };
}
