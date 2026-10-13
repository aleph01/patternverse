import { env } from 'cloudflare:workers';
import { evictDurableObject, reset, runInDurableObject } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import manifest from '../dist/practices.json' with { type: 'json' };
import type { PracticeManifest } from '../src/manifest.js';
import { invokeRuntime } from '../src/runtime.js';
import { createHandler, networkIdentity } from '../src/handler.js';
import type { GuidedAiQuota } from '../src/quota.js';
import { REQUESTS_PER_SHARD, SHARDS, RESERVED_NEURONS_PER_REQUEST } from '../src/limits.js';
import { z } from 'zod';

const runSchema = z.object({
  saved: z.unknown(),
  view: z.object({
    revision: z.number(),
    pending: z.object({ effect_id: z.string(), run_id: z.string() }),
  }),
});
const publicManifest = manifest as PracticeManifest;
const quotas: DurableObjectNamespace<GuidedAiQuota> = env.QUOTAS;
const handler = createHandler(publicManifest, invokeRuntime);
function initialRun() {
  return runSchema.parse(
    invokeRuntime('catalog', {
      version: 1,
      operation: 'start',
      technique_id: 'reframing.frame-problem',
      root_id: 'test',
      inputs: { problem: { type: 'text', value: 'A project feels stuck' } },
    }),
  );
}
function body() {
  const run = initialRun();
  return {
    patternId: 'reframing-frame-problem',
    effectId: run.view.pending.effect_id,
    consent: 'cloudflare-guided-ai-v1',
    saved: run.saved,
  };
}
function request(value: unknown = body(), origin = 'https://patternverse.org') {
  return new Request('https://patternverse.org/api/guided-ai/step', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'CF-Connecting-IP': '192.0.2.1',
    },
    body: JSON.stringify(value),
  });
}
function ports() {
  return {
    enabled: true,
    origins: ['https://patternverse.org'],
    salt: 'synthetic-local-test-salt-not-a-secret',
    reserve: vi.fn(async () => ({ allowed: true as const })),
    infer: vi.fn(async () => ({ response: 'The project is not moving as expected.' })),
  };
}
afterEach(async () => {
  vi.restoreAllMocks();
  await reset();
});

describe('public guided AI admission and bounded inference', () => {
  it('uses the shared Rust runtime to derive a public effect and validate its receipt', async () => {
    const adapters = ports();
    const response = await handler(request(), adapters);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      revision: 0,
      result: {
        kind: 'generated',
        value: { type: 'text', value: 'The project is not moving as expected.' },
      },
    });
    expect(adapters.infer).toHaveBeenCalledOnce();
    expect(adapters.infer).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ content: expect.stringContaining('A project feels stuck') }),
      ]),
      512,
    );
    expect(adapters.reserve).toHaveBeenCalledWith(
      expect.any(Number),
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
  });

  it('status accepts browser GETs without Origin and never sends answers to inference', async () => {
    const adapters = ports();
    const status = await handler(
      new Request('https://patternverse.org/api/guided-ai/status'),
      adapters,
    );
    expect(await status.json()).toMatchObject({ available: true });
    expect(adapters.infer).not.toHaveBeenCalled();
  });

  it('rejects arbitrary prompts, private identities, missing consent and forged effects before reserving', async () => {
    for (const value of [
      { ...body(), messages: [{ role: 'user', content: 'Arbitrary chat' }] },
      { ...body(), consent: undefined },
      { ...body(), patternId: 'private-pattern' },
      { ...body(), effectId: 'forged' },
    ]) {
      const adapters = ports();
      expect((await handler(request(value), adapters)).status).toBeGreaterThanOrEqual(400);
      expect(adapters.infer).not.toHaveBeenCalled();
      expect(adapters.reserve).not.toHaveBeenCalled();
    }
  });

  it('rejects tampered root or child sources and checkpoint state before inference', async () => {
    const payload = body();
    const saved = JSON.parse(JSON.stringify(payload.saved));
    saved.manager.snapshot.sources['reframing.frame-problem'] += '\n# malicious revision';
    const adapters = ports();
    expect((await handler(request({ ...payload, saved }), adapters)).status).toBe(422);
    const forged = JSON.parse(JSON.stringify(payload.saved));
    forged.manager.snapshot.sources['untrusted-child'] = '-> end';
    expect((await handler(request({ ...payload, saved: forged }), adapters)).status).toBe(422);
    const broken = JSON.parse(JSON.stringify(payload.saved));
    broken.manager.accepted = [{ run_id: 'test', event: 'Cancel' }];
    expect((await handler(request({ ...payload, saved: broken }), adapters)).status).toBe(422);
    expect(adapters.infer).not.toHaveBeenCalled();
  });

  it('rejects non-model participant steps and disallowed origins', async () => {
    const run = runSchema.parse(
      invokeRuntime('catalog', {
        version: 1,
        operation: 'start',
        technique_id: 'cbt.thought-record',
        root_id: 'test',
        inputs: {},
      }),
    );
    const adapters = ports();
    expect(
      (
        await handler(
          request({
            patternId: 'cbt-thought-record',
            effectId: run.view.pending.effect_id,
            consent: 'cloudflare-guided-ai-v1',
            saved: run.saved,
          }),
          adapters,
        )
      ).status,
    ).toBe(422);
    expect((await handler(request(body(), 'https://evil.example'), adapters)).status).toBe(403);
    expect(adapters.infer).not.toHaveBeenCalled();
  });

  it('hard-stops on quota denial; no automatic retries or provider fallback', async () => {
    for (const code of ['FREE_LIMIT', 'RATE_LIMIT'] as const) {
      const adapters = {
        ...ports(),
        reserve: vi.fn(async () => ({
          allowed: false as const,
          code,
          resetAt: Date.now() + 60_000,
        })),
      };
      const response = await handler(request(), adapters);
      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({ code });
      expect(response.headers.get('Retry-After')).toBeTruthy();
      expect(adapters.infer).not.toHaveBeenCalled();
    }
  });

  it('maps account quota separately from capacity failure, without leaking errors or retrying', async () => {
    for (const [providerCode, expectedCode] of [
      [3036, 'FREE_LIMIT'],
      [3040, 'PROVIDER_UNAVAILABLE'],
    ] as const) {
      const adapters = {
        ...ports(),
        infer: vi.fn(async () => {
          throw new Error(`Provider ${providerCode} secret user context`);
        }),
      };
      const response = await handler(request(), adapters);
      expect(await response.json()).toEqual({ code: expectedCode });
      expect(adapters.infer).toHaveBeenCalledOnce();
    }
  });

  it('bounds body and prompt sizes without truncating or reserving', async () => {
    const adapters = ports();
    const oversized = await handler(
      request({ ...body(), extra: 'x'.repeat(192 * 1024) }),
      adapters,
    );
    expect(oversized.status).toBe(413);
    const run = runSchema.parse(
      invokeRuntime('catalog', {
        version: 1,
        operation: 'start',
        technique_id: 'reframing.frame-problem',
        root_id: 'test',
        inputs: { problem: { type: 'text', value: 'x'.repeat(9000) } },
      }),
    );
    expect(
      (
        await handler(
          request({ ...body(), saved: run.saved, effectId: run.view.pending.effect_id }),
          adapters,
        )
      ).status,
    ).toBe(413);
    expect(adapters.reserve).not.toHaveBeenCalled();
  });

  it('rejects invalid outputs and defaults to disabled with an absent salt', async () => {
    const adapters = { ...ports(), infer: vi.fn(async () => ({ response: '' })) };
    expect((await handler(request(), adapters)).status).toBe(502);
    expect((await handler(request(), { ...ports(), enabled: false })).status).toBe(503);
    expect((await handler(request(), { ...ports(), salt: '' })).status).toBe(503);
    expect(adapters.infer).toHaveBeenCalledOnce();
  });

  it('normalizes IPv6 addresses to their network and rejects untrusted malformed identities', () => {
    expect(networkIdentity('2001:db8::1234')).toBe(networkIdentity('2001:0db8:0:0:abcd::1'));
    expect(networkIdentity('not-an-ip')).toBeNull();
  });
});

describe('durable free-tier quota partitions', () => {
  it('reserves atomically under concurrency and retains the cap across eviction', async () => {
    const stub = quotas.getByName('concurrency');
    const results = await Promise.all(
      Array.from({ length: 24 }, (_, index) => stub.reserve(index.toString(16).padStart(64, '0'))),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(REQUESTS_PER_SHARD);
    await evictDurableObject(stub);
    expect(await stub.reserve('f'.repeat(64))).toMatchObject({
      allowed: false,
      code: 'FREE_LIMIT',
    });
    expect(SHARDS * REQUESTS_PER_SHARD * RESERVED_NEURONS_PER_REQUEST).toBeLessThan(10_000);
  });

  it('enforces network burst limits and stores no practice contents', async () => {
    const stub = quotas.getByName('burst');
    const id = 'a'.repeat(64);
    expect((await stub.reserve(id)).allowed).toBe(true);
    expect((await stub.reserve(id)).allowed).toBe(true);
    expect(await stub.reserve(id)).toMatchObject({ allowed: false, code: 'RATE_LIMIT' });
    await runInDurableObject(stub, (_object, state) => {
      const tables = state.storage.sql
        .exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
        .toArray();
      expect(tables.map((table) => table.name)).toContain('counters');
      const counters = state.storage.sql.exec('SELECT * FROM counters').toArray();
      expect(JSON.stringify(counters)).not.toMatch(/stuck|project|pattern|answer|prompt/);
    });
  });

  it('resets at UTC midnight and expires stored daily identities', async () => {
    const stub = quotas.getByName('reset');
    await stub.reserve('a'.repeat(64));
    await runInDurableObject(stub, async (object, state) => {
      state.storage.sql.exec('UPDATE day SET value = value - 1');
      await object.alarm!();
      expect(state.storage.sql.exec('SELECT * FROM counters').toArray()).toHaveLength(0);
    });
    expect((await stub.reserve('a'.repeat(64))).allowed).toBe(true);
  });

  it('enforces the daily network allowance even across separate bursts', async () => {
    const stub = quotas.getByName('daily-network');
    const id = 'b'.repeat(64);
    for (let i = 0; i < 12; i += 1) {
      expect((await stub.reserve(id)).allowed).toBe(true);
      await runInDurableObject(stub, (_object, state) => {
        state.storage.sql.exec('UPDATE counters SET minute = -1 WHERE key = ?', id);
      });
    }
    expect(await stub.reserve(id)).toMatchObject({ allowed: false, code: 'FREE_LIMIT' });
  });
});
