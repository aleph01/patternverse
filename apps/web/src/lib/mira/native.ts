import { Channel, invoke, isTauri } from '@tauri-apps/api/core';
import type { Effect, Message, ReplyProvider } from '@patternverse/companion-core';
import { conversationMessageText } from './pattern-mentions';
import { conversationSystemPrompt, type PatternContext } from './conversation-prompt';
import type { MiraSettings } from './private-store';

export type LocalRuntimeStatus = Readonly<{
  status: 'starting' | 'ready' | 'unavailable' | 'stopped';
  detailCode?: string | null;
}>;
export type LocalModel = Readonly<{ id: string; displayName: string; installed: boolean }>;
export type LocalModelChoice = Readonly<{
  id: string;
  title: string;
  summary: string;
  installed: boolean;
  canInstall: boolean;
  recommended: boolean;
  downloadBytes: number;
}>;
export type LocalSetup = Readonly<{
  choices: readonly LocalModelChoice[];
  recommendedModelId: string;
  selectedModelId: string;
  activeDownload: Readonly<{
    modelId: string;
    phase: string;
    completedBytes: number;
    totalBytes: number;
  }> | null;
}>;
export type LocalDownloadEvent = Readonly<{
  kind: string;
  modelId: string;
  phase?: string;
  completedBytes?: number;
  totalBytes?: number;
  detailCode?: string | null;
}>;

type ChatEvent = Readonly<{
  kind: 'started' | 'text' | 'done' | 'cancelled' | 'failed';
  text: string;
  detailCode: string | null;
}>;
type TranscriptionEvent = Readonly<{
  kind: 'started' | 'completed' | 'cancelled' | 'failed';
  text: string;
  detailCode: string | null;
}>;

/** Native capability is explicit; the browser version never probes a loopback service. */
export function hasNativeMira(): boolean {
  return isTauri();
}

export async function localRuntimeStatus(): Promise<LocalRuntimeStatus> {
  if (!hasNativeMira()) return { status: 'unavailable', detailCode: 'NATIVE_RUNTIME_UNAVAILABLE' };
  return invoke<LocalRuntimeStatus>('ollama_status');
}

export async function restartLocalRuntime(): Promise<LocalRuntimeStatus> {
  return invoke<LocalRuntimeStatus>('ollama_restart');
}

export async function localModels(): Promise<readonly LocalModel[]> {
  return invoke<readonly LocalModel[]>('ollama_list_models');
}

export async function localSetup(): Promise<LocalSetup> {
  return invoke<LocalSetup>('model_setup_status');
}

export async function selectLocalModel(modelId: string): Promise<void> {
  await invoke('model_select', { modelId });
}

export async function downloadLocalModel(
  modelId: string,
  onEvent: (event: LocalDownloadEvent) => void,
): Promise<void> {
  const channel = new Channel<LocalDownloadEvent>();
  channel.onmessage = onEvent;
  await invoke('model_download', { modelId, onEvent: channel });
}

/** Local replies use the same prompt contract as ZDR, but dispatch only to the app-owned runtime. */
export function createNativeReplyProvider(options: {
  settings: MiraSettings;
  patternContext: (effect: Effect) => Promise<PatternContext>;
}): ReplyProvider {
  return {
    reply: async (
      effect: Effect,
      signal: AbortSignal,
      onProgress?: (text: string) => void,
    ): Promise<Message> => {
      if (!hasNativeMira()) throw new Error('Local model is available only in the desktop app.');
      if (!options.settings.model) throw new Error('Choose a downloaded local model in Settings.');
      const context = await options.patternContext(effect);
      const messages = [
        { role: 'system', content: conversationSystemPrompt(effect, options.settings, context) },
        ...effect.messages
          .slice(-24)
          .map((item) => ({ role: item.role, content: conversationMessageText(item) })),
      ];
      const text = await requestLocalText(options.settings.model, messages, signal, onProgress);
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        text,
        createdAt: new Date().toISOString(),
      };
    },
  };
}

/** Captured audio is sent only through IPC to the bundled, local Whisper worker. */
export async function transcribeLocally(wav: Uint8Array, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted();
  if (!hasNativeMira()) throw new Error('Local dictation is available only in the desktop app.');
  const chunks: string[] = [];
  for (let offset = 0; offset < wav.length; offset += 32_768)
    chunks.push(String.fromCharCode(...wav.subarray(offset, offset + 32_768)));
  const channel = new Channel<TranscriptionEvent>();
  let resolveText!: (result: { text?: string; error?: string }) => void;
  const completed = new Promise<{ text?: string; error?: string }>((resolve) => {
    resolveText = resolve;
  });
  channel.onmessage = (event) => {
    if (event.kind === 'completed') resolveText({ text: event.text.trim() });
    if (event.kind === 'cancelled') resolveText({ error: 'Dictation cancelled.' });
    if (event.kind === 'failed')
      resolveText(
        event.detailCode === 'TRANSCRIPTION_NO_SPEECH'
          ? { text: '' }
          : { error: event.detailCode || 'Local transcription failed.' },
      );
  };
  await invoke('transcription_start', {
    audioBase64: btoa(chunks.join('')),
    mimeType: 'audio/wav',
    language: 'auto',
    onEvent: channel,
  });
  const cancel = () => {
    void invoke('transcription_cancel').catch(() => undefined);
    resolveText({ error: 'Dictation cancelled.' });
  };
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  try {
    const result = await completed;
    if (result.error) throw new Error(result.error);
    return result.text ?? '';
  } finally {
    signal?.removeEventListener('abort', cancel);
  }
}

/** Shared cancellable native generation boundary for conversation and isolated UI interpretation. */
export async function requestLocalText(
  modelId: string,
  messages: readonly { role: string; content: string }[],
  signal: AbortSignal,
  onProgress?: (text: string) => void,
): Promise<string> {
  signal.throwIfAborted();
  if (!hasNativeMira() || !modelId) throw new Error('Choose a local model in the desktop app.');
  const channel = new Channel<ChatEvent>();
  let text = '';
  let finish!: (result: { text?: string; error?: string }) => void;
  const completed = new Promise<{ text?: string; error?: string }>((resolve) => {
    finish = resolve;
  });
  channel.onmessage = (event) => {
    if (event.kind === 'text') {
      text += event.text;
      onProgress?.(text);
    }
    if (event.kind === 'done') finish({ text });
    if (event.kind === 'failed' || event.kind === 'cancelled')
      finish({ error: event.detailCode || 'Local generation did not finish.' });
  };
  const generation = await invoke<number>('conversation_chat', {
    modelId,
    messages,
    onEvent: channel,
  });
  const cancel = () => {
    void invoke('conversation_cancel', { generation }).catch(() => undefined);
    finish({ error: 'Local generation cancelled.' });
  };
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) cancel();
  try {
    const result = await completed;
    if (result.error) throw new Error(result.error);
    if (!result.text?.trim()) throw new Error('The local model returned an empty reply.');
    return result.text.trim();
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}

export async function requestNativeMicrophone(): Promise<void> {
  const status = await invoke<string>('microphone_request_permission');
  if (status !== 'granted') throw new Error('Microphone permission was not granted.');
}
