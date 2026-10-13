import type { OpenRouterKeyUsage, ZdrModel } from './openrouter';
import type { MiraSettings } from './private-store';

export type MiraOpenRouterProviderState = Readonly<{
  connectingOpenRouter: boolean;
  keyUsage: OpenRouterKeyUsage | null;
  usageCheckedAt: string | null;
  usageError: string;
  loadingUsage: boolean;
  models: readonly ZdrModel[];
  loadingModels: boolean;
  modelsChecked: boolean;
}>;

type Ports = Readonly<{
  enabled(): boolean;
  available(): boolean;
  sending(): boolean;
  settings(): MiraSettings;
  draftKey(): string;
  saveSettings(change: { openRouterKey: string; model?: string }): Promise<boolean>;
  usage(key: string): Promise<OpenRouterKeyUsage>;
  models(key: string): Promise<readonly ZdrModel[]>;
  beginConnection(): Promise<string>;
  navigate(url: string): void;
  now(): string;
  changed(change: Partial<MiraOpenRouterProviderState>): void;
  disconnected(): void;
  clearMessages(): void;
  error(message: string): void;
  notice(message: string): void;
}>;

/** Connection, discovery and usage coordination only. Credentials stay in the
 * host's existing encrypted settings; this module has no storage/URL/browser API.
 */
export function createMiraOpenRouterProvider(ports: Ports) {
  let disposed = false;
  let connecting = false;
  let usageRevision = 0;
  let modelsRevision = 0;
  const enabled = () => !disposed && ports.enabled();
  const messageOf = (cause: unknown) =>
    cause instanceof Error ? cause.message : 'Something went wrong. Please try again.';
  const invalidate = () => {
    usageRevision += 1;
    modelsRevision += 1;
  };
  const clearUsage = () =>
    ports.changed({ keyUsage: null, usageCheckedAt: null, usageError: '', loadingUsage: false });

  async function refreshUsage() {
    const key = ports.settings().openRouterKey;
    if (!enabled() || !key) return;
    const version = ++usageRevision;
    const current = () =>
      enabled() && version === usageRevision && key === ports.settings().openRouterKey;
    ports.changed({ loadingUsage: true, usageError: '' });
    try {
      const keyUsage = await ports.usage(key);
      if (current()) ports.changed({ keyUsage, usageCheckedAt: ports.now() });
    } catch (cause) {
      if (current()) ports.changed({ usageError: messageOf(cause) });
    } finally {
      if (current()) ports.changed({ loadingUsage: false });
    }
  }
  async function refreshModels(key: string) {
    if (!enabled()) return;
    const version = ++modelsRevision;
    const current = () => enabled() && version === modelsRevision && key === ports.draftKey();
    ports.changed({ loadingModels: true });
    ports.clearMessages();
    try {
      const models = await ports.models(key);
      if (!current()) return;
      ports.changed({ models, modelsChecked: true });
      if (!models.length)
        ports.notice('No zero-retention models are currently available for this key.');
    } catch (cause) {
      if (current()) ports.error(messageOf(cause));
    } finally {
      if (current()) ports.changed({ loadingModels: false });
    }
  }
  async function saveConnection(key: string, model: string) {
    if (!enabled() || !ports.available()) return;
    if (
      !(await ports.saveSettings({ openRouterKey: key.trim(), model: model.trim() })) ||
      !enabled()
    )
      return;
    invalidate();
    clearUsage();
    ports.changed({ loadingModels: false });
    if (ports.settings().openRouterKey) void refreshUsage();
    ports.notice('Provider settings saved encrypted on this device.');
    ports.error('');
  }
  async function disconnect() {
    if (!enabled() || !ports.available() || ports.sending()) return;
    if (!(await ports.saveSettings({ openRouterKey: '' })) || !enabled()) return;
    invalidate();
    ports.disconnected();
    ports.changed({ models: [], modelsChecked: false, loadingModels: false });
    clearUsage();
    ports.notice(
      'OpenRouter disconnected on this device. You can revoke its key in your OpenRouter account.',
    );
    ports.error('');
  }
  async function connect() {
    if (!enabled() || connecting || ports.sending()) return;
    connecting = true;
    ports.changed({ connectingOpenRouter: true });
    ports.clearMessages();
    try {
      const authorization = await ports.beginConnection();
      if (enabled()) ports.navigate(authorization);
    } catch {
      connecting = false;
      if (enabled()) {
        ports.changed({ connectingOpenRouter: false });
        ports.error('Could not start the connection. Allow browser storage and try again.');
      }
    }
  }
  return {
    connect,
    disconnect,
    saveConnection,
    refreshUsage,
    refreshModels,
    keyEdited() {
      if (!enabled()) return;
      modelsRevision += 1;
      ports.changed({ modelsChecked: false, models: [], loadingModels: false });
    },
    dispose() {
      disposed = true;
      invalidate();
    },
  };
}
