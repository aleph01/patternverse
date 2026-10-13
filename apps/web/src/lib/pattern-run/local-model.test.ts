import { describe, expect, it, vi } from 'vitest';
import type { GuidedEffect } from '$lib/mira/guided';
import type { MiraSettings } from '$lib/mira/private-store';
import { fulfillPatternModelEffect, realizePatternWording } from './local-model';

const effect: GuidedEffect = {
  effect_id: 'wording',
  run_id: 'run',
  request: {
    kind: 'language.realize',
    payload: {
      specification: 'Ask one short question about {{worry}}.',
      inputs: { worry: 'rain' },
    },
  },
};
const settings: MiraSettings = {
  model: 'selected-model',
  openRouterKey: 'private-key',
  promptOverrides: {},
  activeSessionId: null,
};

describe('standalone pattern wording route', () => {
  it('converts a declared choice contract to a typed generated receipt', async () => {
    const result = await fulfillPatternModelEffect(
      {
        effect_id: 'options',
        run_id: 'run',
        request: {
          kind: 'agent.generate',
          payload: {
            prompt: 'Return different frames',
            contract: { returns: 'choices', min: 3, max: 6 },
          },
        },
      },
      false,
      new AbortController().signal,
      {
        loadSettings: async () => settings,
        selectedModel: async () => '',
        generate: async () => 'local',
        cloud: async () =>
          JSON.stringify({
            choices: [
              { value: 'need', label: 'Different need' },
              { value: 'boundary', label: 'Different boundary' },
              { value: 'goal', label: 'Different goal' },
            ],
          }),
      },
    );
    expect(result).toEqual({
      kind: 'generated',
      value: {
        type: 'choices',
        value: [
          { value: 'need', label: 'Different need' },
          { value: 'boundary', label: 'Different boundary' },
          { value: 'goal', label: 'Different goal' },
        ],
      },
    });
  });

  it('rejects duplicate choices and undeclared semantic categories', async () => {
    const adapters = {
      loadSettings: async () => settings,
      selectedModel: async () => '',
      generate: async () => 'local',
      cloud: async () =>
        JSON.stringify({
          choices: [
            { value: 'same', label: 'One' },
            { value: 'same', label: 'Two' },
            { value: 'third', label: 'Three' },
          ],
        }),
    };
    await expect(
      fulfillPatternModelEffect(
        {
          effect_id: 'options',
          run_id: 'run',
          request: {
            kind: 'agent.generate',
            payload: {
              prompt: 'Options',
              contract: { returns: 'choices', min: 3, max: 6 },
            },
          },
        },
        false,
        new AbortController().signal,
        adapters,
      ),
    ).rejects.toThrow('outside the pattern contract');
    await expect(
      fulfillPatternModelEffect(
        {
          effect_id: 'classify',
          run_id: 'run',
          request: {
            kind: 'semantic.classify',
            payload: {
              definition: {
                name: 'form',
                output: { name: 'Form', variants: ['pain', 'goal'] },
                rules: {},
                fallback: 'pain',
                context: {},
              },
              input: { type: 'text', value: 'I feel stuck' },
              context: {},
            },
          },
        },
        false,
        new AbortController().signal,
        {
          ...adapters,
          cloud: async () => '{"variant":"solution"}',
        },
      ),
    ).rejects.toThrow('outside the pattern contract');
  });

  it('returns only a declared semantic category', async () => {
    const result = await fulfillPatternModelEffect(
      {
        effect_id: 'classify',
        run_id: 'run',
        request: {
          kind: 'semantic.classify',
          payload: {
            definition: {
              name: 'form',
              output: { name: 'Form', variants: ['pain', 'solution'] },
              rules: { solution: 'A proposed intervention is embedded in the request.' },
              fallback: 'pain',
              context: {},
            },
            input: { type: 'text', value: 'We need an app' },
            context: {},
          },
        },
      },
      false,
      new AbortController().signal,
      {
        loadSettings: async () => settings,
        selectedModel: async () => '',
        generate: async () => 'local',
        cloud: async () => '{"variant":"solution"}',
      },
    );
    expect(result).toEqual({ kind: 'classified', value: 'solution' });
  });

  it('uses only the selected local model on desktop', async () => {
    const local = vi.fn(async () => ' What might happen? ');
    const cloud = vi.fn(async () => 'cloud');
    const reply = await realizePatternWording(effect, true, new AbortController().signal, {
      loadSettings: async () => settings,
      selectedModel: async () => 'fallback-local',
      generate: local,
      cloud,
    });
    expect(reply).toBe('What might happen?');
    expect(local).toHaveBeenCalledWith('selected-model', expect.any(Array), expect.anything());
    expect(cloud).not.toHaveBeenCalled();
  });

  it('uses only the selected OpenRouter model on web', async () => {
    const local = vi.fn(async () => 'local');
    const cloud = vi.fn(async () => 'Next question');
    const reply = await realizePatternWording(effect, false, new AbortController().signal, {
      loadSettings: async () => settings,
      selectedModel: async () => 'fallback-local',
      generate: local,
      cloud,
    });
    expect(reply).toBe('Next question');
    expect(cloud).toHaveBeenCalledWith(
      settings,
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: expect.stringContaining('rain') }),
      ]),
      expect.anything(),
    );
    expect(local).not.toHaveBeenCalled();
  });

  it('does not send the web step without an OpenRouter key', async () => {
    const cloud = vi.fn(async () => 'cloud');
    await expect(
      realizePatternWording(effect, false, new AbortController().signal, {
        loadSettings: async () => ({ ...settings, openRouterKey: '' }),
        selectedModel: async () => '',
        generate: async () => 'local',
        cloud,
      }),
    ).rejects.toThrow('Connect with OpenRouter');
    expect(cloud).not.toHaveBeenCalled();
  });

  it('never falls back to OpenRouter if local generation fails', async () => {
    const cloud = vi.fn(async () => 'cloud');
    await expect(
      realizePatternWording(effect, true, new AbortController().signal, {
        loadSettings: async () => settings,
        selectedModel: async () => 'fallback-local',
        generate: async () => {
          throw new Error('Local runtime unavailable');
        },
        cloud,
      }),
    ).rejects.toThrow('Local runtime unavailable');
    expect(cloud).not.toHaveBeenCalled();
  });
});
