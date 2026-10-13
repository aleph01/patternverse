import { describe, expect, it, vi } from 'vitest';
import {
  beginOpenRouterConnection,
  finishOpenRouterConnection,
  OPENROUTER_FLOW_KEY,
} from './openrouter-auth';

function fixture() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const preferences = {
    model: 'chosen/model',
    openRouterKey: 'old-key',
    promptOverrides: { cbt: 'custom' },
    activeSessionId: 'session-1',
    monthlyBudgetUsd: 5,
  };
  const store = {
    loadSettings: vi.fn(async () => preferences),
    saveSettings: vi.fn(async () => {}),
  };
  const transport = vi.fn(
    async () => new Response(JSON.stringify({ key: 'new-key' })),
  ) as unknown as typeof fetch;
  return { storage, store, transport, preferences };
}

async function start(f: ReturnType<typeof fixture>) {
  const auth = new URL(
    await beginOpenRouterConnection({
      callbackUrl: 'https://patternverse.org/auth/openrouter/callback',
      returnUrl: 'https://patternverse.org/mira?session=session-1',
      storage: f.storage,
      now: 1000,
    }),
  );
  const url = new URL(auth.searchParams.get('callback_url')!);
  url.searchParams.set('code', 'single-use-code');
  return { auth, url };
}

describe('OpenRouter sign-in', () => {
  it('returns a practice connection to its dedicated tab without sending answers or navigating the practice', async () => {
    const f = fixture();
    const auth = new URL(
      await beginOpenRouterConnection({
        callbackUrl: 'https://patternverse.org/auth/openrouter/callback',
        returnUrl: 'https://patternverse.org/auth/openrouter/connect?untrusted=ignored',
        storage: f.storage,
        now: 1000,
      }),
    );
    expect(auth.searchParams.get('key_label')).toBe('Patternverse practices');
    const url = new URL(auth.searchParams.get('callback_url')!);
    url.searchParams.set('code', 'single-use-code');
    expect(await finishOpenRouterConnection({ ...f, url, now: 2000 })).toBe(
      '/auth/openrouter/connect?connected=1',
    );
    expect(f.store.saveSettings).toHaveBeenCalledWith({
      ...f.preferences,
      openRouterKey: 'new-key',
    });
  });

  it.each([
    'https://evil.example/auth/openrouter/connect',
    'https://patternverse.org/pattern/example/run',
    'https://patternverse.org/auth/openrouter/connect-other',
  ])('rejects unsupported return path %s before starting authorization', async (returnUrl) => {
    const f = fixture();
    await expect(
      beginOpenRouterConnection({
        callbackUrl: 'https://patternverse.org/auth/openrouter/callback',
        returnUrl,
        storage: f.storage,
      }),
    ).rejects.toThrow('return address');
    expect(f.storage.getItem(OPENROUTER_FLOW_KEY)).toBeNull();
  });
  it('uses random S256 PKCE and a tab-bound callback nonce, without storing a key', async () => {
    const f = fixture();
    const { auth, url } = await start(f);
    const flow = JSON.parse(f.storage.getItem(OPENROUTER_FLOW_KEY)!);
    expect(auth.origin).toBe('https://openrouter.ai');
    expect(auth.searchParams.get('code_challenge_method')).toBe('S256');
    expect(auth.searchParams.get('code_challenge')).toMatch(/^[\w-]{43}$/);
    expect(url.searchParams.get('state')).toBe(flow.state);
    expect(flow.verifier).toMatch(/^[\w-]{43}$/);
    expect(auth.href).not.toContain(flow.verifier);
    expect(f.storage.getItem(OPENROUTER_FLOW_KEY)).not.toContain('old-key');
    const next = await start(f);
    expect(next.auth.searchParams.get('code_challenge')).not.toBe(
      auth.searchParams.get('code_challenge'),
    );
  });

  it('exchanges once and saves the key with all existing settings preserved', async () => {
    const f = fixture();
    const { url } = await start(f);
    expect(await finishOpenRouterConnection({ ...f, url, now: 2000 })).toBe(
      '/mira?session=session-1&panel=settings',
    );
    expect(f.store.saveSettings).toHaveBeenCalledWith({
      ...f.preferences,
      openRouterKey: 'new-key',
    });
    const [endpoint, request] = vi.mocked(f.transport).mock.calls[0]!;
    expect(endpoint).toBe('https://openrouter.ai/api/v1/auth/keys');
    expect(request?.method).toBe('POST');
    expect(JSON.parse(request!.body as string)).toMatchObject({
      code: 'single-use-code',
      code_challenge_method: 'S256',
    });
    expect(f.storage.getItem(OPENROUTER_FLOW_KEY)).toBeNull();
    await expect(finishOpenRouterConnection({ ...f, url, now: 2000 })).rejects.toThrow(
      'No pending',
    );
    expect(f.transport).toHaveBeenCalledTimes(1);
  });

  it.each(['expired', 'nonce', 'origin', 'cancelled', 'malformed', 'unsafe-return'])(
    'rejects %s callbacks without changing the connection',
    async (reason) => {
      const f = fixture();
      const { url } = await start(f);
      let now = 2000;
      if (reason === 'expired') now = 700_000;
      if (reason === 'nonce') url.searchParams.set('state', 'wrong');
      if (reason === 'origin') url.hostname = 'other.example';
      if (reason === 'cancelled') url.searchParams.set('error', 'access_denied');
      if (reason === 'malformed') f.storage.setItem(OPENROUTER_FLOW_KEY, '{}');
      if (reason === 'unsafe-return') {
        const flow = JSON.parse(f.storage.getItem(OPENROUTER_FLOW_KEY)!);
        f.storage.setItem(
          OPENROUTER_FLOW_KEY,
          JSON.stringify({ ...flow, returnTo: 'https://evil.example/mira' }),
        );
      }
      await expect(finishOpenRouterConnection({ ...f, url, now })).rejects.toThrow();
      expect(f.transport).not.toHaveBeenCalled();
      expect(f.store.saveSettings).not.toHaveBeenCalled();
      expect(f.storage.getItem(OPENROUTER_FLOW_KEY)).toBeNull();
    },
  );

  it.each(['network', 'denied', 'empty-key', 'invalid-json'])(
    'handles %s exchange failure without exposing provider response data',
    async (reason) => {
      const f = fixture();
      const { url } = await start(f);
      const transport = vi.fn(async () => {
        if (reason === 'network') throw new Error('private-provider-details');
        if (reason === 'denied') return new Response('private-provider-details', { status: 403 });
        return new Response(reason === 'empty-key' ? '{"key":""}' : 'private-provider-details');
      }) as unknown as typeof fetch;
      await expect(
        finishOpenRouterConnection({ ...f, transport, url, now: 2000 }),
      ).rejects.not.toThrow('private-provider-details');
      expect(f.store.saveSettings).not.toHaveBeenCalled();
    },
  );
});
