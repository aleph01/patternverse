import { describe, expect, it, vi } from 'vitest';
import { fulfillModelEffect } from '../src/index.js';
const reference = {
  library: 'commons:materials',
  revision: `data-v1:${'a'.repeat(64)}`,
  ids: ['wood', 'steel'],
};
const returns = { list: { record: { item: { reference }, reason: 'text' } } };
const effect = {
  effect_id: 'e',
  run_id: 'r',
  request: {
    kind: 'agent.generate',
    payload: {
      prompt: 'Find matching materials.',
      contract: { returns, min: 0, max: 2 },
      context: {
        materials: {
          type: 'catalog',
          value: {
            schema: { reference, record_type: { record: { id: 'text', name: 'text' } } },
            records: [
              {
                type: 'record',
                value: {
                  id: { type: 'text', value: 'wood' },
                  name: { type: 'text', value: 'Wood' },
                },
              },
              {
                type: 'record',
                value: {
                  id: { type: 'text', value: 'steel' },
                  name: { type: 'text', value: 'Steel' },
                },
              },
            ],
          },
        },
      },
    },
  },
};
describe('structured model contracts', () => {
  it('transports reference context as plain records and returns typed values', async () => {
    const request = vi.fn(async () => JSON.stringify([{ item: 'wood', reason: 'Lighter.' }]));
    const receipt = await fulfillModelEffect(effect, request);
    expect(receipt).toMatchObject({
      kind: 'generated',
      value: {
        type: 'list',
        value: {
          element_type: returns.list,
          items: [
            {
              type: 'record',
              value: {
                item: { type: 'reference', value: { schema: reference, id: 'wood' } },
                reason: { type: 'text', value: 'Lighter.' },
              },
            },
          ],
        },
      },
    });
    const messages = request.mock.calls[0] as unknown as [Array<{ content: string }>];
    expect(JSON.parse(messages[0][1].content).context.materials).toEqual([
      { id: 'wood', name: 'Wood' },
      { id: 'steel', name: 'Steel' },
    ]);
    expect(messages[0][0].content).toContain('wood');
  });
  it('accepts an empty list without inventing a fallback match', async () => {
    expect(await fulfillModelEffect(effect, async () => '[]')).toMatchObject({
      value: { type: 'list', value: { items: [] } },
    });
  });
  it.each([
    'not json',
    '[{"item":"invented","reason":"x"}]',
    '[{"item":"wood","reason":3}]',
    '[{"item":"wood","reason":"x","extra":true}]',
    '[{"item":"wood"}]',
    '[{"item":"wood","reason":"a"},{"item":"steel","reason":"b"},{"item":"wood","reason":"c"}]',
  ])('rejects an invalid receipt: %s', async (reply) => {
    await expect(fulfillModelEffect(effect, async () => reply)).rejects.toThrow();
  });
  it('handles nested records, optional values and scalar lists generally', async () => {
    const nested = {
      effect_id: 'e',
      run_id: 'r',
      request: {
        kind: 'agent.generate',
        payload: {
          prompt: 'Return a structured observation.',
          contract: {
            returns: {
              record: { score: 'number', note: { optional: 'text' }, tags: { list: 'text' } },
            },
          },
        },
      },
    };
    const result = await fulfillModelEffect(
      nested,
      async () => '{"score":2.5,"note":null,"tags":[]}',
    );
    expect(result).toMatchObject({
      value: {
        type: 'record',
        value: {
          score: { type: 'number', value: 2.5 },
          note: { type: 'optional', value: { value: null } },
          tags: { type: 'list', value: { items: [] } },
        },
      },
    });
  });
});
