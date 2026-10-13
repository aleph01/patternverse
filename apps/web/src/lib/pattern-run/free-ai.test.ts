import { describe, expect, it, vi } from 'vitest';
import { freeGuidedAiAvailable, fulfillFreeGuidedStep, FreeGuidedAiError } from './free-ai';
import type { PatternRun } from '$lib/pattern-runtime/types';

const run: PatternRun = {
  saved: { private: 'A confirmed answer' },
  view: {
    technique_id: 'test',
    root_id: 'test',
    revision: 3,
    status: 'Waiting',
    pending: {
      effect_id: 'step',
      run_id: 'test',
      request: { kind: 'agent.generate', payload: {} },
    },
    items: [],
    outputs: {},
  },
};
describe('opt-in guided AI transport', () => {
  it('checks public availability without sending answers', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ available: true, patternIds: ['public-pattern'] }),
    );
    expect(await freeGuidedAiAvailable('public-pattern', fetcher)).toBe(true);
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/guided-ai/status');
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain('confirmed answer');
    expect(await freeGuidedAiAvailable('private-pattern', fetcher)).toBe(false);
    expect(
      await freeGuidedAiAvailable(
        'public-pattern',
        async () => new Response('not deployed', { status: 404 }),
      ),
    ).toBe(false);
  });
  it('returns a bound receipt, never retries, and includes neither a chat nor provider key', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        effectId: 'step',
        revision: 3,
        result: { kind: 'generated', value: { type: 'text', value: 'Suggestion' } },
      }),
    );
    expect(
      await fulfillFreeGuidedStep('public-pattern', run, new AbortController().signal, fetcher),
    ).toEqual({ kind: 'generated', value: { type: 'text', value: 'Suggestion' } });
    expect(fetcher).toHaveBeenCalledOnce();
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(request).toEqual({
      patternId: 'public-pattern',
      effectId: 'step',
      saved: run.saved,
      consent: 'cloudflare-guided-ai-v1',
    });
    expect(fetcher.mock.calls[0]?.[1]?.credentials).toBe('omit');
  });
  it('surfaces quota exhaustion and refuses stale outputs without changing progress', async () => {
    const before = JSON.stringify(run);
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ code: 'FREE_LIMIT' }, { status: 429 }),
    );
    await expect(
      fulfillFreeGuidedStep('public-pattern', run, new AbortController().signal, fetcher),
    ).rejects.toBeInstanceOf(FreeGuidedAiError);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.stringify(run)).toBe(before);
    await expect(
      fulfillFreeGuidedStep('public-pattern', run, new AbortController().signal, async () =>
        Response.json({
          effectId: 'other-step',
          revision: 3,
          result: { kind: 'generated', value: 'stale' },
        }),
      ),
    ).rejects.toThrow('unavailable');
  });
  it('does not issue cancelled or oversized requests', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const controller = new AbortController();
    controller.abort();
    await expect(
      fulfillFreeGuidedStep('public-pattern', run, controller.signal, fetcher),
    ).rejects.toBeDefined();
    await expect(
      fulfillFreeGuidedStep(
        'public-pattern',
        { ...run, saved: 'x'.repeat(200 * 1024) },
        new AbortController().signal,
        fetcher,
      ),
    ).rejects.toThrow('too much context');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
