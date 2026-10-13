import type { Effect, Message, ReplyProvider } from '@patternverse/companion-core';
import { conversationMessageText } from './pattern-mentions';
import { conversationSystemPrompt, type PatternContext } from './conversation-prompt';
import type { MiraSettings } from './private-store';

const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ZDR_URL = 'https://openrouter.ai/api/v1/endpoints/zdr';
const KEY_URL = 'https://openrouter.ai/api/v1/key';

/** Connection/credit failures need an explicit user action, never a silent provider switch. */
export class OpenRouterConnectionError extends Error {
  constructor(public readonly reason: 'connection' | 'credits') {
    super(
      reason === 'credits'
        ? 'Your OpenRouter credits or account limit have been reached. Manage your credits or connect with OpenRouter to continue.'
        : 'Connect with OpenRouter to continue this AI step.',
    );
    this.name = 'OpenRouterConnectionError';
  }
}

/** Short, non-streaming text requests share Mira's mandatory ZDR route. */
export async function requestOpenRouterText(
  settings: MiraSettings,
  messages: readonly { role: string; content: string }[],
  signal: AbortSignal,
  transport: typeof fetch = fetch,
): Promise<string> {
  if (!settings.openRouterKey.trim() || !settings.model.trim())
    throw new OpenRouterConnectionError('connection');
  const response = await transport(CHAT_URL, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${settings.openRouterKey.trim()}`,
      'Content-Type': 'application/json',
      'X-OpenRouter-Title': 'Patternverse Mira',
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      stream: false,
      max_tokens: 2048,
      reasoning: { effort: 'low', exclude: true },
      provider: { zdr: true, data_collection: 'deny', allow_fallbacks: false },
    }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || (isRecord(payload) && payload.error))
    throw providerError(payload, response.status);
  return extractReply(payload);
}
/** Command interpretation follows the same mandatory ZDR policy as conversational replies. */
export const interpretOpenRouterVoiceCommand = requestOpenRouterText;
export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-3.8-flash';

export type ZdrModel = Readonly<{
  id: string;
  name: string;
  inputUsdPerMillion?: number;
  outputUsdPerMillion?: number;
}>;
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
  if (!apiKey.trim()) throw new Error('Connect with OpenRouter first.');
  const response = await transport(ZDR_URL, {
    headers: { Authorization: `Bearer ${apiKey.trim()}` },
  });
  const payload: unknown = await response.json();
  if (!response.ok) throw providerError(payload, response.status);
  if (!isRecord(payload) || !Array.isArray(payload.data))
    throw new Error('OpenRouter returned an invalid model list.');
  const models = new Map<string, ZdrModel>();
  for (const item of payload.data) {
    if (!isRecord(item) || typeof item.model_id !== 'string' || !item.model_id.trim()) continue;
    const pricing = isRecord(item.pricing) ? item.pricing : null;
    const input =
      pricing && typeof pricing.prompt === 'string' ? Number(pricing.prompt) * 1_000_000 : NaN;
    const output =
      pricing && typeof pricing.completion === 'string'
        ? Number(pricing.completion) * 1_000_000
        : NaN;
    const previous = models.get(item.model_id);
    models.set(item.model_id, {
      id: item.model_id,
      name: typeof item.model_name === 'string' ? item.model_name : item.model_id,
      ...(Number.isFinite(input) && input >= 0
        ? { inputUsdPerMillion: Math.max(previous?.inputUsdPerMillion ?? 0, input) }
        : {}),
      ...(Number.isFinite(output) && output >= 0
        ? { outputUsdPerMillion: Math.max(previous?.outputUsdPerMillion ?? 0, output) }
        : {}),
    });
  }
  return [...models.values()].sort((left, right) => left.name.localeCompare(right.name));
}

/** Read OpenRouter's billed usage for the current key, including usage outside Mira. */
export async function getOpenRouterKeyUsage(
  apiKey: string,
  transport: typeof fetch = fetch,
): Promise<OpenRouterKeyUsage> {
  if (!apiKey.trim()) throw new Error('Connect with OpenRouter first.');
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
    reply: async (
      effect: Effect,
      signal: AbortSignal,
      onProgress?: (text: string) => void,
    ): Promise<Message> => {
      const { openRouterKey, model } = options.settings;
      if (!openRouterKey.trim() || !model.trim()) {
        throw new Error(
          'Connect with OpenRouter and choose a zero-retention model in Mira settings.',
        );
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
              .map((message) => ({
                role: message.role,
                content: conversationMessageText(message),
              })),
          ],
          stream: true,
          max_tokens: 4096,
          reasoning: { effort: 'low', exclude: true },
          provider: { zdr: true, data_collection: 'deny', allow_fallbacks: false },
        }),
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        throw providerError(payload, response.status);
      }
      const text = await readReplyStream(response, onProgress);
      return {
        id: (options.randomId ?? (() => crypto.randomUUID()))(),
        role: 'assistant',
        text,
        createdAt: (options.now ?? (() => new Date().toISOString()))(),
      };
    },
  };
}

/** Read OpenRouter's SSE response while ignoring private reasoning fields entirely. */
async function readReplyStream(
  response: Response,
  onProgress?: (text: string) => void,
): Promise<string> {
  if (!response.body) throw new Error('OpenRouter returned an empty response stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let raw = '';
  let text = '';
  let finishReason: unknown;
  let streamed = false;

  const consume = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    streamed = true;
    const data = trimmed.slice(5).trim();
    if (!data || data === '[DONE]') return;
    const payload: unknown = JSON.parse(data);
    if (isRecord(payload) && payload.error) throw providerError(payload, response.status);
    const first = isRecord(payload) && Array.isArray(payload.choices) ? payload.choices[0] : null;
    const delta = isRecord(first) && isRecord(first.delta) ? first.delta : null;
    const addition = visibleContent(delta?.content);
    if (addition) {
      text += addition;
      onProgress?.(text);
    }
    if (isRecord(first) && first.finish_reason != null) finishReason = first.finish_reason;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    raw += chunk;
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    lines.forEach(consume);
  }
  const tail = buffer + decoder.decode();
  if (tail) consume(tail);
  if (!streamed) {
    const completed: unknown = JSON.parse(raw);
    if (isRecord(completed) && completed.error) throw providerError(completed, response.status);
    const result = extractReply(completed);
    onProgress?.(result);
    return result;
  }
  return requireVisibleReply(text, finishReason);
}

function extractReply(payload: unknown): string {
  const first = isRecord(payload) && Array.isArray(payload.choices) ? payload.choices[0] : null;
  const message = isRecord(first) && isRecord(first.message) ? first.message : null;
  const text = visibleContent(message?.content);
  if (text.trim()) return text.trim();
  return requireVisibleReply(
    '',
    isRecord(first) ? first.finish_reason : undefined,
    message?.refusal,
  );
}

function visibleContent(content: unknown): string {
  return typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content
          .filter((part) => isRecord(part) && part.type === 'text' && typeof part.text === 'string')
          .map((part) => String(part.text))
          .join('\n')
      : '';
}

function requireVisibleReply(text: string, finishReason: unknown, refusal?: unknown): string {
  const completed = text.trim();
  if (completed) return completed;
  if (finishReason === 'length')
    throw new Error(
      'The model reached its response limit before writing a reply. Try again or choose another model in Settings.',
    );
  if (finishReason === 'content_filter' || refusal)
    throw new Error(
      'The provider declined to produce a reply. You can rephrase your message or choose another model in Settings.',
    );
  throw new Error(
    'OpenRouter returned no visible reply. Try again or choose another model in Settings. Zero-retention routing is still enabled.',
  );
}

function providerError(payload: unknown, status: number): Error {
  const code = isRecord(payload) && isRecord(payload.error) ? payload.error.code : undefined;
  if (status === 401 || code === 401) return new OpenRouterConnectionError('connection');
  if (status === 402 || code === 402) return new OpenRouterConnectionError('credits');
  if (status === 429 || code === 429)
    return new Error(
      'OpenRouter is receiving too many requests. Wait a little, then retry this step.',
    );
  const detail =
    isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === 'string'
      ? payload.error.message
      : `OpenRouter returned ${status}.`;
  return new Error(`${detail} No non-ZDR or alternate-provider fallback was used.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
