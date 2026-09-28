import { afterEach, describe, expect, it, vi } from 'vitest';
import { startNativeVoiceControl } from './native-voice-listener';
import { transcribeLocally } from './native';

vi.mock('./native', () => ({
  requestNativeMicrophone: vi.fn(async () => undefined),
  transcribeLocally: vi.fn(async () => 'open patterns'),
}));
vi.mock('./audio', () => ({ recordedBlobToWhisperWav: vi.fn(async () => new Uint8Array([1, 2])) }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('continuous native capture', () => {
  it('transcribes speech locally, keeps recording, and releases the mic on stop', async () => {
    vi.useFakeTimers();
    let volume = 0.1;
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
        resume = async () => undefined;
        close = close;
        createAnalyser = () => ({
          fftSize: 2048,
          getFloatTimeDomainData: (array: Float32Array) => array.fill(volume),
        });
        createMediaStreamSource = () => ({ connect: vi.fn() });
      },
    );
    const created: { state: string }[] = [];
    vi.stubGlobal(
      'MediaRecorder',
      class {
        static isTypeSupported = () => true;
        state = 'inactive';
        mimeType = 'audio/mp4';
        onstop?: () => void;
        ondataavailable?: (event: { data: Blob }) => void;
        constructor() {
          created.push(this);
        }
        start() {
          this.state = 'recording';
        }
        stop() {
          this.state = 'inactive';
          this.ondataavailable?.({ data: new Blob(['audio']) });
          this.onstop?.();
        }
      },
    );
    const onFinal = vi.fn();
    const listener = await startNativeVoiceControl({
      onFinal,
      onInterim: vi.fn(),
      onError: vi.fn(),
    });
    await vi.advanceTimersByTimeAsync(300);
    volume = 0;
    await vi.advanceTimersByTimeAsync(1000);
    expect(onFinal).toHaveBeenCalledExactlyOnceWith('open patterns');
    expect(transcribeLocally).toHaveBeenCalledOnce();
    expect(created.at(-1)?.state).toBe('recording');
    const signal = vi.mocked(transcribeLocally).mock.calls[0]![1]!;
    listener.stop();
    expect(signal.aborted).toBe(true);
    expect(track.stop).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(transcribeLocally).toHaveBeenCalledOnce();
  });
});
