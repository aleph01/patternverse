import { describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { transcribeLocally } from './native';

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => true,
  Channel: class {
    onmessage = () => undefined;
  },
  invoke: vi.fn(),
}));

describe('local speech results', () => {
  it('treats no speech as an empty result so continuous listening can continue', async () => {
    vi.mocked(invoke).mockImplementationOnce(async (_command, args) => {
      const channel = (args as { onEvent: { onmessage(event: unknown): void } }).onEvent;
      channel.onmessage({ kind: 'failed', detailCode: 'TRANSCRIPTION_NO_SPEECH' });
    });
    await expect(transcribeLocally(new Uint8Array([1]))).resolves.toBe('');
  });

  it('preserves real transcription failures', async () => {
    vi.mocked(invoke).mockImplementationOnce(async (_command, args) => {
      const channel = (args as { onEvent: { onmessage(event: unknown): void } }).onEvent;
      channel.onmessage({ kind: 'failed', detailCode: 'WHISPER_SIDECAR_START_FAILED' });
    });
    await expect(transcribeLocally(new Uint8Array([1]))).rejects.toThrow(
      'WHISPER_SIDECAR_START_FAILED',
    );
  });
});
