import { fulfillModelEffect } from '@patternverse/guided-ai';
import type { GuidedEffect } from '$lib/mira/guided';
import { localSetup, requestLocalText } from '$lib/mira/native';
import {
  DEFAULT_OPENROUTER_MODEL,
  OpenRouterConnectionError,
  requestOpenRouterText,
} from '$lib/mira/openrouter';
import { createPrivateMiraStore, type MiraSettings } from '$lib/mira/private-store';

type Message = Readonly<{ role: string; content: string }>;
type Ports = Readonly<{
  loadSettings: () => Promise<MiraSettings>;
  selectedModel: () => Promise<string>;
  generate: (model: string, messages: readonly Message[], signal: AbortSignal) => Promise<string>;
  cloud: (
    settings: MiraSettings,
    messages: readonly Message[],
    signal: AbortSignal,
  ) => Promise<string>;
}>;

const ports: Ports = {
  loadSettings: () => createPrivateMiraStore().loadSettings(),
  selectedModel: async () => (await localSetup()).selectedModelId,
  generate: requestLocalText,
  cloud: requestOpenRouterText,
};

/** The platform boundary never falls back across local and ZDR cloud providers. */
async function requestModelText(
  messages: readonly Message[],
  desktop: boolean,
  signal: AbortSignal,
  adapters: Ports,
): Promise<string> {
  signal.throwIfAborted();
  const settings = await adapters.loadSettings();
  let reply: string;
  if (desktop) {
    const model = settings.model.trim() || (await adapters.selectedModel());
    if (!model) throw new Error('Choose and install a local model in the desktop app settings.');
    signal.throwIfAborted();
    reply = await adapters.generate(model, messages, signal);
  } else {
    if (!settings.openRouterKey.trim()) throw new OpenRouterConnectionError('connection');
    reply = await adapters.cloud(
      { ...settings, model: settings.model.trim() || DEFAULT_OPENROUTER_MODEL },
      messages,
      signal,
    );
  }
  signal.throwIfAborted();
  const text = reply.trim();
  if (!text || text.length > 30_000)
    throw new Error('The selected model did not return usable wording. Try this step again.');
  return text;
}

/** The same effect fulfillment is used by local, OpenRouter and hosted guided AI. */
export async function fulfillPatternModelEffect(
  effect: GuidedEffect,
  desktop: boolean,
  signal: AbortSignal,
  adapters: Ports = ports,
): Promise<Readonly<{ kind: string; value: unknown }>> {
  return fulfillModelEffect(effect, (messages) =>
    requestModelText(messages, desktop, signal, adapters),
  );
}

export async function realizePatternWording(
  effect: GuidedEffect,
  desktop: boolean,
  signal: AbortSignal,
  adapters: Ports = ports,
): Promise<string> {
  if (effect.request.kind !== 'language.realize')
    throw new Error('This is not a language realization step.');
  const receipt = await fulfillPatternModelEffect(effect, desktop, signal, adapters);
  return String(receipt.value);
}
