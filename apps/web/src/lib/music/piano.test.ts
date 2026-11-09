import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('$app/paths', () => ({ base: '' }));

const parameter = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
});
function context() {
  return {
    decodeAudioData: vi.fn(async () => ({ duration: 8 })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      playbackRate: parameter(),
      connect: vi.fn(),
    })),
    createBiquadFilter: vi.fn(() => ({ type: '', frequency: { value: 0 }, connect: vi.fn() })),
    createGain: vi.fn(() => ({ gain: parameter(), connect: vi.fn() })),
  };
}
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })),
  );
});
afterEach(() => vi.unstubAllGlobals());
describe('recorded piano', () => {
  it('covers the acoustic piano range with nearby recordings', async () => {
    const { pianoSamples, nearestPianoSample } = await import('./piano');
    expect(pianoSamples).toHaveLength(30);
    expect(pianoSamples[0]).toEqual({ midi: 21, file: 'A0.mp3' });
    expect(pianoSamples.at(-1)).toEqual({ midi: 108, file: 'C8.mp3' });
    for (let midi = 21; midi <= 108; midi++)
      expect(Math.abs(nearestPianoSample(midi).midi - midi)).toBeLessThanOrEqual(1);
  });
  it('fetches only needed pitches, shares downloads, and decodes once per audio context', async () => {
    const { preparePiano } = await import('./piano');
    const first = context(),
      second = context();
    await preparePiano(first as unknown as BaseAudioContext, [60, 61, 62, 60]);
    await preparePiano(first as unknown as BaseAudioContext, [60, 62]);
    await preparePiano(second as unknown as BaseAudioContext, [60, 62]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(first.decodeAudioData).toHaveBeenCalledTimes(2);
    expect(second.decodeAudioData).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls.map((call) => call[0])).toEqual([
      '/audio/piano/salamander/C4.mp3',
      '/audio/piano/salamander/Ds4.mp3',
    ]);
  });
  it('plays the recording at the correct pitch with a natural release instead of synthesizing a piano', async () => {
    const { preparePiano, pianoVoice } = await import('./piano');
    const audio = context();
    await preparePiano(audio as unknown as BaseAudioContext, [64]);
    const voice = pianoVoice(
      audio as unknown as BaseAudioContext,
      {} as AudioNode,
      440 * 2 ** ((64 - 69) / 12),
      10,
      1,
      0.2,
    );
    expect(voice.oscillator.buffer).toEqual({ duration: 8 });
    expect(voice.oscillator.playbackRate.value).toBeCloseTo(2 ** (1 / 12));
    expect(voice.seconds).toBe(1.12);
    expect(voice.envelope.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, 11.12);
  });
  it('retries a failed download and never falls back to a synthetic piano', async () => {
    const { preparePiano, pianoVoice } = await import('./piano');
    const audio = context();
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
    await expect(preparePiano(audio as unknown as BaseAudioContext, [60])).rejects.toMatchObject({
      name: 'PianoSampleError',
    });
    expect(() =>
      pianoVoice(audio as unknown as BaseAudioContext, {} as AudioNode, 261.625565, 0, 1, 0.2),
    ).toThrow(/piano recordings/);
    await preparePiano(audio as unknown as BaseAudioContext, [60]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
