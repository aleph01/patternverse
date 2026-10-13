import { describe, expect, it } from 'vitest';
import { fulfillModelEffect } from '../src/index.js';

describe('provider-independent model effect fulfillment', () => {
  it('preserves typed text receipts and rejects unsupported effects', async () => {
    const request = async () => ' A provisional statement. ';
    expect(
      await fulfillModelEffect(
        {
          effect_id: 'e',
          run_id: 'r',
          request: {
            kind: 'agent.generate',
            payload: { prompt: 'Restate the concern', contract: { returns: 'text' } },
          },
        },
        request,
      ),
    ).toEqual({ kind: 'generated', value: { type: 'text', value: 'A provisional statement.' } });
    await expect(
      fulfillModelEffect(
        { effect_id: 'e', run_id: 'r', request: { kind: 'interaction.ask', payload: {} } },
        request,
      ),
    ).rejects.toThrow('supported model effect');
  });
  it('rejects malformed JSON, duplicate choices, and blank or oversized answers', async () => {
    const effect = {
      effect_id: 'e',
      run_id: 'r',
      request: {
        kind: 'agent.generate',
        payload: { prompt: 'Options', contract: { returns: 'choices', min: 2, max: 3 } },
      },
    };
    await expect(fulfillModelEffect(effect, async () => 'not JSON')).rejects.toThrow(
      'valid choices',
    );
    await expect(
      fulfillModelEffect(
        effect,
        async () => '{"choices":[{"value":"a","label":"A"},{"value":"a","label":"B"}]}',
      ),
    ).rejects.toThrow('outside the pattern contract');
    await expect(fulfillModelEffect(effect, async () => ' ')).rejects.toThrow('usable wording');
    await expect(fulfillModelEffect(effect, async () => 'x'.repeat(30_001))).rejects.toThrow(
      'usable wording',
    );
  });
});
