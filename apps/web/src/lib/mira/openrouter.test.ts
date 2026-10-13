import { describe, expect, it, vi } from 'vitest';
import {
  createOpenRouterReplyProvider,
  getOpenRouterKeyUsage,
  listZdrModels,
  interpretOpenRouterVoiceCommand,
  requestOpenRouterText,
  OpenRouterConnectionError,
} from './openrouter';

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
  it.each([
    [401, 'connection'],
    [402, 'credits'],
  ] as const)(
    'turns HTTP %s into an actionable connection failure without retrying',
    async (status, reason) => {
      const transport = vi.fn(
        async () => new Response('{"error":{"message":"provider detail"}}', { status }),
      );
      const failure = await requestOpenRouterText(
        settings,
        [],
        new AbortController().signal,
        transport,
      ).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(OpenRouterConnectionError);
      expect(failure).toMatchObject({ reason });
      expect(String(failure)).toContain('OpenRouter');
      expect(transport).toHaveBeenCalledOnce();
    },
  );

  it('recognizes a credit error delivered in a successful HTTP envelope', async () => {
    const transport = vi.fn(
      async () => new Response('{"error":{"code":402,"message":"No credits"}}'),
    );
    await expect(
      requestOpenRouterText(settings, [], new AbortController().signal, transport),
    ).rejects.toMatchObject({ reason: 'credits' });
  });

  it('keeps a rate limit separate from exhausted credit and does not reconnect automatically', async () => {
    const transport = vi.fn(async () => new Response('{}', { status: 429 }));
    await expect(
      requestOpenRouterText(settings, [], new AbortController().signal, transport),
    ).rejects.toThrow('Wait a little');
    expect(transport).toHaveBeenCalledOnce();
  });
  it.each([
    [
      {
        choices: [
          { message: { content: null, reasoning: 'private reasoning' }, finish_reason: 'length' },
        ],
      },
      'response limit',
    ],
    [{ choices: [{ message: { content: '' }, finish_reason: 'stop' }] }, 'no visible reply'],
    [{ error: { message: 'Provider unavailable' } }, 'Provider unavailable'],
  ])(
    'explains unsuccessful responses without displaying reasoning or retrying',
    async (payload, error) => {
      const transport = vi.fn(async () => new Response(JSON.stringify(payload)));
      const provider = createOpenRouterReplyProvider({
        settings,
        patternContext: async () => null,
        fetch: transport,
      });
      await expect(provider.reply(effect, new AbortController().signal)).rejects.toThrow(error);
      expect(transport).toHaveBeenCalledOnce();
    },
  );

  it('reads visible text blocks while retaining a bounded reasoning budget and ZDR', async () => {
    const transport = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              { message: { content: [{ type: 'text', text: 'Hello.' }], reasoning: 'private' } },
            ],
          }),
        ),
    );
    const provider = createOpenRouterReplyProvider({
      settings,
      patternContext: async () => null,
      fetch: transport as typeof fetch,
    });
    expect((await provider.reply(effect, new AbortController().signal)).text).toBe('Hello.');
    const body = JSON.parse(String(vi.mocked(transport as typeof fetch).mock.calls[0]![1]!.body));
    expect(body).toMatchObject({
      max_tokens: 4096,
      reasoning: { effort: 'low', exclude: true },
      provider: { zdr: true, allow_fallbacks: false },
    });
  });
  it('streams visible reply text without exposing reasoning fragments', async () => {
    const encoder = new TextEncoder();
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"choices":[{"delta":{"reasoning":"private","content":"Hello"}}]}\n\n',
            ),
          );
          controller.enqueue(
            encoder.encode(
              'data: {"choices":[{"delta":{"content":" there."},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
            ),
          );
          controller.close();
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream' } },
    );
    const transport = vi.fn(async () => response) as unknown as typeof fetch;
    const progress: string[] = [];
    const provider = createOpenRouterReplyProvider({
      settings,
      patternContext: async () => null,
      fetch: transport,
    });
    const reply = await provider.reply(effect, new AbortController().signal, (text) =>
      progress.push(text),
    );
    expect(reply.text).toBe('Hello there.');
    expect(progress).toEqual(['Hello', 'Hello there.']);
    expect(progress.join(' ')).not.toContain('private');
    const body = JSON.parse(String(vi.mocked(transport).mock.calls[0]![1]!.body));
    expect(body.stream).toBe(true);
  });
  it('keeps command interpretation on the selected model with mandatory ZDR', async () => {
    const transport = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: '{"type":"patterns","query":""}' } }] }),
        ),
    ) as unknown as typeof fetch;
    const messages = [{ role: 'user', content: 'show patterns' }];
    const signal = new AbortController().signal;
    await interpretOpenRouterVoiceCommand(settings, messages, signal, transport);
    const request = vi.mocked(transport).mock.calls[0]![1]!;
    expect(request.signal).toBe(signal);
    expect(JSON.parse(request.body as string)).toMatchObject({
      model: settings.model,
      messages,
      provider: { zdr: true, data_collection: 'deny', allow_fallbacks: false },
    });
    expect(transport).toHaveBeenCalledOnce();
  });
  it('reads OpenRouter-reported monthly key charges and provider limits', async () => {
    const transport = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              usage_monthly: 1.2345,
              limit: 10,
              limit_remaining: 8.7655,
              limit_reset: 'monthly',
            },
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;
    expect(await getOpenRouterKeyUsage('private-key', transport)).toEqual({
      monthlyUsd: 1.2345,
      providerLimitUsd: 10,
      providerRemainingUsd: 8.7655,
      providerLimitReset: 'monthly',
    });
    expect(vi.mocked(transport).mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/key');
  });

  it('does not turn a missing or invalid provider usage report into zero spend', async () => {
    const transport = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: { usage_monthly: 'unknown' } }), { status: 200 }),
    ) as unknown as typeof fetch;
    await expect(getOpenRouterKeyUsage('private-key', transport)).rejects.toThrow(
      'invalid monthly usage',
    );
  });
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
