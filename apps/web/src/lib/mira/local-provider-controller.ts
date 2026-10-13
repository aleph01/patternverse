import type {
  LocalDownloadEvent,
  LocalModelChoice,
  LocalRuntimeStatus,
  LocalSetup,
} from './native';
import type { MiraSettings } from './private-store';

export type MiraLocalProviderState = Readonly<{
  runtime: LocalRuntimeStatus;
  localChoices: readonly LocalModelChoice[];
  modelProgress: string;
}>;

type Ports = Readonly<{
  enabled(): boolean;
  available(): boolean;
  settings(): MiraSettings;
  saveSettings(change: { model: string }): Promise<boolean>;
  status(): Promise<LocalRuntimeStatus>;
  setup(): Promise<LocalSetup>;
  restart(): Promise<LocalRuntimeStatus>;
  select(id: string): Promise<void>;
  download(id: string, onEvent: (event: LocalDownloadEvent) => void): Promise<void>;
  every(milliseconds: number, callback: () => void): () => void;
  changed(change: Partial<MiraLocalProviderState>): void;
  error(message: string): void;
  notice(message: string): void;
}>;

/** Native setup coordination, not another runtime/provider implementation.
 * The host owns accepted settings, display state, scheduling and the IPC adapter.
 */
export function createMiraLocalProvider(ports: Ports) {
  let disposed = false;
  let revision = 0;
  let pendingRefresh: Promise<void> | undefined;
  let stopPolling: (() => void) | undefined;
  let downloadActive = false;
  let downloadRevision = 0;
  const enabled = () => !disposed && ports.enabled();
  const current = (version: number) => enabled() && version === revision;
  const fail = (cause: unknown) => {
    if (enabled())
      ports.error(
        cause instanceof Error ? cause.message : 'Something went wrong. Please try again.',
      );
  };

  async function readRuntime(version: number) {
    const runtime = await ports.status();
    if (!current(version)) return;
    ports.changed({ runtime });
    if (runtime.status !== 'ready') return;
    const setup = await ports.setup();
    if (!current(version)) return;
    ports.changed({ localChoices: setup.choices });
    const chosen =
      setup.choices.find((item) => item.id === ports.settings().model && item.installed) ??
      setup.choices.find((item) => item.id === setup.selectedModelId && item.installed) ??
      setup.choices.find((item) => item.recommended && item.installed) ??
      setup.choices.find((item) => item.installed);
    if (chosen && chosen.id !== ports.settings().model && ports.available())
      await ports.saveSettings({ model: chosen.id });
  }
  function refresh(): Promise<void> {
    if (!enabled()) return Promise.resolve();
    // A slow IPC call must not accumulate a second request every three seconds.
    if (!pendingRefresh) {
      pendingRefresh = readRuntime(revision).finally(() => {
        pendingRefresh = undefined;
      });
    }
    return pendingRefresh;
  }
  async function choose(id: string) {
    if (!enabled() || !ports.available()) return;
    const version = ++revision;
    await ports.select(id);
    if (!current(version)) return;
    if (await ports.saveSettings({ model: id })) {
      if (current(version)) ports.notice('Local model selected.');
    }
  }
  async function retry() {
    if (!enabled()) return;
    ports.error('');
    const version = ++revision;
    try {
      const runtime = await ports.restart();
      if (!current(version)) return;
      ports.changed({ runtime });
      // Any previous poll is obsolete; wait for it before starting a fresh read.
      await pendingRefresh?.catch(() => undefined);
      if (current(version)) await refresh();
    } catch (cause) {
      if (current(version)) fail(cause);
    }
  }
  async function install(id: string) {
    if (!enabled() || downloadActive) return;
    downloadActive = true;
    const version = ++downloadRevision;
    const currentDownload = () => enabled() && downloadActive && version === downloadRevision;
    ports.changed({ modelProgress: 'Preparing local model download…' });
    try {
      await ports.download(id, (event) => {
        if (!currentDownload() || event.modelId !== id) return;
        if (event.kind === 'progress' && event.totalBytes && event.completedBytes !== undefined) {
          ports.changed({
            modelProgress: `Downloading local model · ${Math.floor((event.completedBytes / event.totalBytes) * 100)}%`,
          });
        } else if (event.kind === 'complete') {
          downloadActive = false;
          ports.changed({ modelProgress: '' });
          void refresh()
            .then(() => {
              if (enabled() && version === downloadRevision) return choose(id);
            })
            .catch((cause) => {
              if (version === downloadRevision) fail(cause);
            });
        } else if (event.kind === 'failed' || event.kind === 'cancelled') {
          downloadActive = false;
          ports.changed({ modelProgress: '' });
          ports.error(event.detailCode || 'Local model download did not finish.');
        }
      });
    } catch (cause) {
      if (!currentDownload()) return;
      downloadActive = false;
      ports.changed({ modelProgress: '' });
      fail(cause);
    }
  }
  return {
    refresh,
    retry,
    choose,
    install,
    startPolling() {
      if (!enabled() || stopPolling) return;
      stopPolling = ports.every(3000, () => {
        void refresh().catch(() => undefined);
      });
    },
    dispose() {
      disposed = true;
      revision += 1;
      downloadRevision += 1;
      stopPolling?.();
      stopPolling = undefined;
    },
  };
}
