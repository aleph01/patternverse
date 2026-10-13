import { afterEach, describe, expect, it, vi } from 'vitest';
import { startNativeVoiceControl } from './native-voice-listener';
import { transcribeLocally } from './native';

vi.mock('$app/paths', () => ({ base: '' }));

vi.mock('./native', () => ({
  requestNativeMicrophone: vi.fn(async () => undefined),
  transcribeLocally: vi.fn(async () => 'I am thinking'),
}));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function setup(previewIntervalMs?: number) {
  vi.useFakeTimers();
  let now = 0;
  vi.stubGlobal('performance', { now: () => now });
  const track = { stop: vi.fn(), addEventListener: vi.fn() };
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [track],
        getAudioTracks: () => [track],
      })),
    },
  });
  const close = vi.fn(async () => undefined);
  vi.stubGlobal(
    'AudioContext',
    class {
      sampleRate = 16000;
      destination = {};
      audioWorklet = { addModule: vi.fn(async () => undefined) };
      resume = async () => undefined;
      close = close;
      createMediaStreamSource = () => ({ connect: vi.fn() });
    },
  );
  const port: { onmessage: ((event: { data: Float32Array }) => void) | null } = { onmessage: null };
  vi.stubGlobal(
    'AudioWorkletNode',
    class {
      port = port;
      connect = vi.fn();
      disconnect = vi.fn();
    },
  );
  const callbacks = { onFinal: vi.fn(), onInterim: vi.fn(), onError: vi.fn() };
  const listener = await startNativeVoiceControl(callbacks, { previewIntervalMs });
  const feed = async (volume: number, count: number) => {
    for (let i = 0; i < count; i++) {
      now += 64;
      port.onmessage?.({ data: new Float32Array(1024).fill(volume) });
      await vi.advanceTimersByTimeAsync(0);
    }
  };
  return { listener, feed, callbacks, track, close };
}

describe('continuous native capture', () => {
  it('recognizes a short command without requiring a long phrase', async () => {
    vi.mocked(transcribeLocally).mockResolvedValueOnce('sent');
    const test = await setup();
    await test.feed(0.1, 4);
    await test.feed(0, 16);
    expect(test.callbacks.onFinal).toHaveBeenCalledExactlyOnceWith('sent');
    test.listener.stop();
  });
  it('previews ongoing speech before silence, then delivers the final only once', async () => {
    const test = await setup(800);
    await test.feed(0.1, 13);
    expect(test.callbacks.onInterim).toHaveBeenCalledWith('I am thinking');
    expect(test.callbacks.onFinal).not.toHaveBeenCalled();
    await test.feed(0, 16);
    expect(test.callbacks.onFinal).toHaveBeenCalledExactlyOnceWith('I am thinking');
    expect(test.callbacks.onError).not.toHaveBeenCalled();
    test.listener.stop();
    expect(test.track.stop).toHaveBeenCalledOnce();
    expect(test.close).toHaveBeenCalledOnce();
  });
  it('commits speech in progress when dictation is explicitly finished', async () => {
    const test = await setup(800);
    await test.feed(0.1, 6);
    await test.listener.finish?.();
    expect(test.callbacks.onFinal).toHaveBeenCalledExactlyOnceWith('I am thinking');
    expect(test.callbacks.onInterim).toHaveBeenLastCalledWith('');
    expect(test.track.stop).toHaveBeenCalledOnce();
    expect(test.close).toHaveBeenCalledOnce();
  });
  it('discards transcription that finishes after capture is stopped', async () => {
    let finish!: (text: string) => void;
    vi.mocked(transcribeLocally).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const test = await setup();
    await test.feed(0.1, 28);
    const signal = vi.mocked(transcribeLocally).mock.calls[0]![1]!;
    test.listener.stop();
    finish('sent');
    await vi.advanceTimersByTimeAsync(0);
    expect(signal.aborted).toBe(true);
    expect(test.callbacks.onFinal).not.toHaveBeenCalled();
    expect(test.callbacks.onInterim).not.toHaveBeenCalled();
  });
});
