import type { Effect, Message, ReplyProvider } from '@patternverse/companion-core';
import { conversationSystemPrompt, type PatternContext } from './conversation-prompt';
import type { MiraSettings } from './private-store';

const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ZDR_URL = 'https://openrouter.ai/api/v1/endpoints/zdr';
const KEY_URL = 'https://openrouter.ai/api/v1/key';
export const DEFAULT_OPENROUTER_MODEL = 'openrouter/auto';

export type ZdrModel = Readonly<{ id: string; name: string }>;
export type OpenRouterKeyUsage = Readonly<{
  monthlyUsd: number;
  providerLimitUsd: number | null;
  providerRemainingUsd: number | null;
  providerLimitReset: string | null;
}>;
export type { PatternContext } from './conversation-prompt';
export type OpenRouterOptions = Readonly<{
  settings: MiraSettings;
  patternContext: (effect: Effect) => Promise<PatternContext>;
  fetch?: typeof fetch;
  now?: () => string;
  randomId?: () => string;
}>;

/** Obtain currently routable ZDR models; no hardcoded model is presumed available. */
export async function listZdrModels(
  apiKey: string,
  transport: typeof fetch = fetch,
): Promise<readonly ZdrModel[]> {
  if (!apiKey.trim()) throw new Error('Connect an OpenRouter API key first.');
  const response = await transport(ZDR_URL, {
    headers: { Authorization: `Bearer ${apiKey.trim()}` },
  });
  const payload: unknown = await response.json();
  if (!response.ok) throw new Error(providerError(payload, response.status));
  if (!isRecord(payload) || !Array.isArray(payload.data))
    throw new Error('OpenRouter returned an invalid model list.');
  const models = new Map<string, ZdrModel>();
  for (const item of payload.data) {
    if (!isRecord(item) || typeof item.model_id !== 'string' || !item.model_id.trim()) continue;
    models.set(item.model_id, {
      id: item.model_id,
      name: typeof item.model_name === 'string' ? item.model_name : item.model_id,
    });
  }
  return [...models.values()].sort((left, right) => left.name.localeCompare(right.name));
}

/** Read OpenRouter's billed usage for the current key, including usage outside Mira. */
export async function getOpenRouterKeyUsage(
  apiKey: string,
  transport: typeof fetch = fetch,
): Promise<OpenRouterKeyUsage> {
  if (!apiKey.trim()) throw new Error('Connect an OpenRouter API key first.');
  const response = await transport(KEY_URL, {
    headers: { Authorization: `Bearer ${apiKey.trim()}` },
    cache: 'no-store',
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Could not load OpenRouter usage (HTTP ${response.status}).`);
  const data = isRecord(payload) ? payload.data : null;
  if (!isRecord(data) || !nonnegativeFinite(data.usage_monthly)) {
    throw new Error('OpenRouter returned an invalid monthly usage report.');
  }
  return {
    monthlyUsd: data.usage_monthly,
    providerLimitUsd: nonnegativeFinite(data.limit) ? data.limit : null,
    providerRemainingUsd: nonnegativeFinite(data.limit_remaining) ? data.limit_remaining : null,
    providerLimitReset: typeof data.limit_reset === 'string' ? data.limit_reset : null,
  };
}

function nonnegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Explicit cloud adapter: request-level ZDR is mandatory and there is no fallback provider. */
export function createOpenRouterReplyProvider(options: OpenRouterOptions): ReplyProvider {
  const transport = options.fetch ?? fetch;
  return {
    reply: async (effect: Effect, signal: AbortSignal): Promise<Message> => {
      const { openRouterKey, model } = options.settings;
      if (!openRouterKey.trim() || !model.trim()) {
        throw new Error('Choose a zero-retention model and connect OpenRouter in Mira settings.');
      }
      const context = await options.patternContext(effect);
      const system = conversationSystemPrompt(effect, options.settings, context);
      const response = await transport(CHAT_URL, {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${openRouterKey.trim()}`,
          'Content-Type': 'application/json',
          'X-OpenRouter-Title': 'Patternverse Mira',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            ...effect.messages
              .slice(-24)
              .map((message) => ({ role: message.role, content: message.text })),
          ],
          stream: false,
          max_tokens: 700,
          provider: { zdr: true, data_collection: 'deny', allow_fallbacks: false },
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(providerError(payload, response.status));
      const text = extractReply(payload);
      if (!text) throw new Error('The model returned an empty reply. No cloud fallback was used.');
      return {
        id: (options.randomId ?? (() => crypto.randomUUID()))(),
        role: 'assistant',
        text,
        createdAt: (options.now ?? (() => new Date().toISOString()))(),
      };
    },
  };
}

function extractReply(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return '';
  const first = payload.choices[0];
  return isRecord(first) && isRecord(first.message) && typeof first.message.content === 'string'
    ? first.message.content.trim()
    : '';
}

function providerError(payload: unknown, status: number): string {
  const detail =
    isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === 'string'
      ? payload.error.message
      : `OpenRouter returned ${status}.`;
  return `${detail} No non-ZDR or alternate-provider fallback was used.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
