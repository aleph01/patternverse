import { describe, expect, it, vi } from 'vitest';
import { createOpenRouterReplyProvider, listZdrModels } from './openrouter';

const settings = {
  model: 'example/model',
  openRouterKey: 'private-key',
  promptOverrides: {},
  activeSessionId: null,
};
const effect = {
  type: 'request-reply' as const,
  sessionId: 's1',
  replyId: 'r1',
  modalityId: 'narm',
  activePattern: null,
  messages: [{ id: 'm1', role: 'user' as const, text: 'Hello', createdAt: '2026-09-24T10:00:00Z' }],
};

describe('OpenRouter adapter', () => {
  it('discovers only returned zero-retention endpoints', async () => {
    const transport = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: [
              { model_id: 'a/model', model_name: 'Model A' },
              { model_id: 'a/model', model_name: 'Model A' },
              { model_id: 'b/model', model_name: 'Model B' },
            ],
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;
    expect(await listZdrModels('private-key', transport)).toEqual([
      { id: 'a/model', name: 'Model A' },
      { id: 'b/model', name: 'Model B' },
    ]);
  });

  it('requires ZDR and denies data collection with no provider fallback', async () => {
    const transport = vi.fn(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: 'Welcome.' } }] }), {
          status: 200,
        }),
    ) as unknown as typeof fetch;
    const provider = createOpenRouterReplyProvider({
      settings,
      patternContext: async () => ({ title: 'A pattern', summary: 'A summary' }),
      fetch: transport,
      now: () => '2026-09-24T10:00:01Z',
      randomId: () => 'm2',
    });
    expect(await provider.reply(effect, new AbortController().signal)).toEqual({
      id: 'm2',
      role: 'assistant',
      text: 'Welcome.',
      createdAt: '2026-09-24T10:00:01Z',
    });
    const [, request] = vi.mocked(transport).mock.calls[0];
    const body = JSON.parse(String(request?.body));
    expect(body.provider).toEqual({ zdr: true, data_collection: 'deny', allow_fallbacks: false });
    expect(body.messages[0].content).toContain('untrusted reference material');
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'Hello' });
  });

  it('fails closed if a ZDR route is unavailable', async () => {
    const transport = vi.fn(
      async () => new Response(JSON.stringify({ error: { message: 'No route' } }), { status: 503 }),
    ) as unknown as typeof fetch;
    const provider = createOpenRouterReplyProvider({
      settings,
      patternContext: async () => null,
      fetch: transport,
    });
    await expect(provider.reply(effect, new AbortController().signal)).rejects.toThrow(
      'No non-ZDR or alternate-provider fallback',
    );
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
