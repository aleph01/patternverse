import { getContext, setContext } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { createPrivateMiraStore } from '$lib/mira/private-store';
import {
  requestOpenRouterText,
  DEFAULT_OPENROUTER_MODEL,
  listZdrModels,
} from '$lib/mira/openrouter';
import { localSetup, requestLocalText } from '$lib/mira/native';
import {
  aiPreferencesKey,
  aiPromptsKey,
  parseAiPreferences,
  parsePrompts,
  type AiScope,
  type AiStyle,
  type SavedPrompt,
} from './ai';

const contextKey = Symbol('bearings-ai');
export class BearingsAi {
  enabled = $state(true);
  model = $state('');
  style = $state<AiStyle>('Concise');
  prompts = $state<SavedPrompt[]>([]);
  tab = $state<'patterns' | 'prompts'>('patterns');
  storageError = $state('');
  notice = $state('');
  promptDraft = $state<{ body: string; trigger: HTMLElement } | null>(null);
  showLibrary: (() => void) | undefined;
  settingsOpen = $state(false);
  target = $state<{ cellId: string; scope: AiScope; prompt: string } | null>(null);
  connected = $state(false);
  desktop = $state(false);
  models = $state<{ id: string; name: string }[]>([]);
  loadingModels = $state(false);
  connectionError = $state('');
  private requests = new SvelteSet<AbortController>();
  private modelGeneration = 0;
  private promptsReadable = true;
  init() {
    this.desktop = '__TAURI_INTERNALS__' in window;
    try {
      Object.assign(this, parseAiPreferences(localStorage.getItem(aiPreferencesKey)));
      this.prompts = parsePrompts(localStorage.getItem(aiPromptsKey));
    } catch (cause) {
      this.promptsReadable = false;
      this.storageError =
        cause instanceof Error ? cause.message : 'AI preferences could not be loaded.';
    }
    void this.refreshConnection();
  }
  loadExternal(key: string | null) {
    if (key === aiPreferencesKey || key === null) {
      const next = parseAiPreferences(localStorage.getItem(aiPreferencesKey));
      if (!next.enabled) this.abort();
      Object.assign(this, next);
    }
    if (key === aiPromptsKey || key === null) {
      try {
        this.prompts = parsePrompts(localStorage.getItem(aiPromptsKey));
        this.promptsReadable = true;
      } catch {
        this.promptsReadable = false;
        this.storageError = 'The saved prompt library could not be read.';
      }
    }
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.abort();
    this.savePreferences();
  }
  setModel(model: string) {
    this.model = model;
    this.savePreferences();
  }
  setStyle(style: AiStyle) {
    this.style = style;
    this.savePreferences();
  }
  private savePreferences() {
    try {
      localStorage.setItem(
        aiPreferencesKey,
        JSON.stringify({ enabled: this.enabled, model: this.model, style: this.style }),
      );
      this.storageError = '';
    } catch {
      this.storageError =
        'AI preferences apply for this visit but could not be saved on this device.';
    }
  }
  savePrompt(prompt: SavedPrompt) {
    if (!this.promptsReadable) {
      this.storageError =
        'Your existing prompt library could not be read. Reload before making changes.';
      return false;
    }
    try {
      const latest = parsePrompts(localStorage.getItem(aiPromptsKey));
      const next = latest.some((item) => item.id === prompt.id)
        ? latest.map((item) => (item.id === prompt.id ? prompt : item))
        : [...latest, prompt];
      this.prompts = parsePrompts(JSON.stringify(next));
      localStorage.setItem(aiPromptsKey, JSON.stringify(next));
      this.storageError = '';
      return true;
    } catch (cause) {
      this.storageError = cause instanceof Error ? cause.message : 'The prompt could not be saved.';
      return false;
    }
  }
  removePrompt(id: string) {
    if (!this.promptsReadable) return false;
    try {
      const next = parsePrompts(localStorage.getItem(aiPromptsKey)).filter(
        (item) => item.id !== id,
      );
      localStorage.setItem(aiPromptsKey, JSON.stringify(next));
      this.prompts = next;
      this.storageError = '';
      return true;
    } catch {
      this.storageError = 'The prompt could not be removed.';
      return false;
    }
  }
  open(cellId: string, scope: AiScope, prompt = '') {
    if (this.enabled) {
      this.abort();
      this.target = { cellId, scope, prompt };
    }
  }
  close() {
    this.abort();
    this.target = null;
  }
  abort() {
    for (const request of this.requests) request.abort();
    this.requests.clear();
  }
  async refreshConnection(loadModels = false) {
    const generation = ++this.modelGeneration;
    this.connectionError = '';
    this.loadingModels = loadModels;
    try {
      if (this.desktop) {
        const setup = await localSetup();
        if (generation !== this.modelGeneration) return;
        this.models = setup.choices
          .filter((choice) => choice.installed)
          .map((choice) => ({ id: choice.id, name: choice.title }));
        this.connected = this.models.length > 0;
        if (!this.model && setup.selectedModelId) this.model = setup.selectedModelId;
      } else {
        const settings = await createPrivateMiraStore().loadSettings();
        if (generation !== this.modelGeneration) return;
        this.connected = !!settings.openRouterKey.trim();
        if (!this.model) this.model = settings.model || DEFAULT_OPENROUTER_MODEL;
        if (loadModels && this.connected) {
          const models = await listZdrModels(settings.openRouterKey);
          if (generation === this.modelGeneration)
            this.models = models.map(({ id, name }) => ({ id, name }));
        }
      }
    } catch (cause) {
      if (generation === this.modelGeneration)
        this.connectionError =
          cause instanceof Error ? cause.message : 'The AI connection could not be checked.';
    } finally {
      if (generation === this.modelGeneration) this.loadingModels = false;
    }
  }
  async disconnect() {
    if (this.desktop) return;
    this.abort();
    ++this.modelGeneration;
    try {
      const store = createPrivateMiraStore();
      const current = await store.loadSettings();
      await store.saveSettings({ ...current, openRouterKey: '' });
      this.connected = false;
      this.models = [];
    } catch {
      this.connectionError = 'The connection could not be removed from this device.';
    }
  }
  async request(messages: readonly { role: string; content: string }[], signal: AbortSignal) {
    if (!this.enabled) throw new Error('AI is switched off. Enable it in the top bar to continue.');
    const controller = new AbortController();
    this.requests.add(controller);
    const combined = AbortSignal.any([signal, controller.signal, AbortSignal.timeout(90_000)]);
    try {
      combined.throwIfAborted();
      let reply: string;
      if (this.desktop) {
        const model = this.model || (await localSetup()).selectedModelId;
        combined.throwIfAborted();
        reply = await requestLocalText(model, messages, combined);
      } else {
        const settings = await createPrivateMiraStore().loadSettings();
        combined.throwIfAborted();
        if (!this.enabled) throw new Error('AI is switched off.');
        reply = await requestOpenRouterText(
          { ...settings, model: this.model || settings.model || DEFAULT_OPENROUTER_MODEL },
          messages,
          combined,
        );
      }
      combined.throwIfAborted();
      if (!this.enabled) throw new Error('AI is switched off.');
      if (!reply.trim() || reply.length > 30000)
        throw new Error('The model did not return a usable reply. Try again.');
      return reply;
    } finally {
      this.requests.delete(controller);
    }
  }
  dispose() {
    this.abort();
    ++this.modelGeneration;
  }
}
export function provideBearingsAi() {
  const ai = new BearingsAi();
  setContext(contextKey, ai);
  return ai;
}
export function useBearingsAi() {
  return getContext<BearingsAi | undefined>(contextKey);
}
