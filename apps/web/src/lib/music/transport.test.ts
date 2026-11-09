import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTransport, type Playback } from './transport';
import { frequency, midiPitch, musicExamples } from './examples';
vi.mock('$app/paths', () => ({ base: '' }));

const parameter = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
  setTargetAtTime: vi.fn(),
});
function fakeContext() {
  return {
    state: 'running',
    currentTime: 10,
    sampleRate: 48000,
    destination: {},
    resume: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    decodeAudioData: vi.fn(async () => ({ duration: 10 })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      playbackRate: parameter(),
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      onended: null,
    })),
    createGain: vi.fn(() => ({ gain: parameter(), connect: vi.fn(), disconnect: vi.fn() })),
    createPeriodicWave: vi.fn((real: Float32Array, imaginary: Float32Array) => ({
      real,
      imaginary,
    })),
    createBiquadFilter: vi.fn(() => ({
      type: 'lowpass',
      frequency: parameter(),
      Q: parameter(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createOscillator: vi.fn(() => ({
      type: 'sine',
      frequency: parameter(),
      setPeriodicWave: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      onended: null,
    })),
  };
}
let context: ReturnType<typeof fakeContext>;
let transports: ReturnType<typeof createTransport>[];
let playback: Playback;
const make = (id = 'seed') => {
  const transport = createTransport(
    musicExamples.find((item) => item.id === id)!,
    (state) => {
      playback = state;
    },
  );
  transports.push(transport);
  return transport;
};
function advance(seconds: number) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.025) {
    context.currentTime += 0.025;
    vi.advanceTimersByTime(25);
  }
}
beforeEach(() => {
  vi.useFakeTimers();
  context = fakeContext();
  transports = [];
  playback = { playing: false, beat: 0 };
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })),
  );
  vi.stubGlobal(
    'AudioContext',
    vi.fn(function () {
      return context;
    }),
  );
});
afterEach(() => {
  transports.forEach((transport) => transport.dispose());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('musical playback transport', () => {
  it('loops a selected tempo-map span, crops held notes and leaves outside notes silent', async () => {
    const example = {
      ...musicExamples[0],
      tempo: 120,
      beats: 12,
      tempos: [{ beat: 4, bpm: 60 }],
      tracks: [{ id: 'melody', label: 'Piano', instrument: 'piano' as const }],
      notes: [
        { pitch: 'C3', midi: 48, start: 0, duration: 3, part: 'melody' },
        { pitch: 'E3', midi: 52, start: 4, duration: 4, part: 'melody' },
        { pitch: 'G5', midi: 79, start: 8, duration: 4, part: 'melody' },
      ],
    };
    const transport = createTransport(example, (value) => (playback = value));
    transports.push(transport);
    await transport.configure({ loop: true, loopRange: { start: 2, end: 6 } });
    await transport.seek(2);
    await transport.play();
    const first = context.createBufferSource.mock.results[0].value;
    expect(first.stop.mock.calls[0][0] - first.start.mock.calls[0][0]).toBeCloseTo(0.5 + 0.12);
    advance(3.3);
    expect(playback.playing).toBe(true);
    expect(playback.beat).toBeGreaterThan(2);
    expect(playback.beat).toBeLessThan(3);
    expect(
      context.createBufferSource.mock.results.every((r) => r.value.playbackRate.value < 2),
    ).toBe(true);
    await transport.configure({ loopRange: undefined });
    advance(5);
    expect(playback.beat).toBeGreaterThan(6);
  });
  it('waits for Play and schedules the documented pitch against the audio clock', async () => {
    const transport = make();
    expect(AudioContext).not.toHaveBeenCalled();
    await transport.play();
    const voice = context.createBufferSource.mock.results[0].value;
    expect(voice.playbackRate.value).toBeCloseTo(2 ** (1 / 12));
    expect(voice.start).toHaveBeenCalledWith(10.03);
    expect(voice.stop.mock.calls[0][0]).toBeCloseTo(10.03 + 60 / 84 + 0.12);
    expect(playback.playing).toBe(true);
    expect(context.createGain.mock.results[0].value.gain.value).toBe(0.35);
  });
  it('pauses, silences scheduled notes and resumes a held note for only its remaining duration', async () => {
    const transport = make();
    await transport.play();
    advance(1.1);
    const first = context.createBufferSource.mock.results[0].value;
    transport.pause();
    const paused = playback.beat;
    expect(first.disconnect).toHaveBeenCalled();
    expect(playback.playing).toBe(false);
    advance(1);
    expect(playback.beat).toBe(paused);
    await transport.seek(2.5);
    await transport.play();
    const held = context.createBufferSource.mock.results.at(-1)!.value;
    expect(held.playbackRate.value).toBe(1);
    expect(held.stop.mock.calls[0][0] - held.start.mock.calls[0][0]).toBeCloseTo(
      (1.5 * 60) / 84 + 0.12,
    );
  });
  it('changes tempo without losing the musical position and stops at the exact end', async () => {
    const transport = make();
    await transport.play();
    advance(0.75);
    const before = playback.beat;
    await transport.configure({ tempo: 120 });
    expect(playback.beat).toBeCloseTo(before);
    advance(2);
    expect(playback).toEqual({ playing: false, beat: 4 });
    await transport.play();
    expect(playback.beat).toBe(0);
  });
  it('loops the notes and rests without ending or accumulating another full clip of voices', async () => {
    const transport = make('bass');
    await transport.configure({ loop: true });
    await transport.play();
    advance(4.8);
    expect(playback.playing).toBe(true);
    expect(playback.beat).toBeLessThan(4);
    expect(context.createOscillator.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(context.createOscillator.mock.calls.length).toBeLessThanOrEqual(6);
  });
  it('immediately mutes a part and changes volume without restarting playback', async () => {
    const transport = make('verse');
    await transport.play();
    const voices = [
      ...context.createOscillator.mock.results,
      ...context.createBufferSource.mock.results,
    ].map((result) => result.value);
    await transport.configure({ parts: ['melody'] });
    expect(voices.every((voice) => voice.disconnect.mock.calls.length === 0)).toBe(true);
    const count =
      context.createOscillator.mock.calls.length + context.createBufferSource.mock.calls.length;
    await transport.configure({ volume: 0.1 });
    expect(
      context.createOscillator.mock.calls.length + context.createBufferSource.mock.calls.length,
    ).toBe(count);
    expect(context.createGain.mock.results[0].value.gain.value).toBe(0.1);
    expect(playback.playing).toBe(true);
  });
  it('fades only the chosen part, keeps held notes in time, and unmutes without replaying them', async () => {
    const changes: Playback[] = [];
    const transport = createTransport(
      {
        ...musicExamples[0],
        tempo: 60,
        beats: 8,
        tracks: [
          { id: 'upper', label: 'Upper', instrument: 'piano' },
          { id: 'lower', label: 'Lower', instrument: 'piano' },
        ],
        notes: [
          { part: 'upper', midi: 60, pitch: 'C4', start: 0, duration: 8 },
          { part: 'lower', midi: 48, pitch: 'C3', start: 0, duration: 8 },
        ],
      },
      (state) => {
        playback = state;
        changes.push(state);
      },
    );
    transports.push(transport);
    await transport.configure({ parts: ['upper'] });
    await transport.play();
    advance(0.5);
    const before = playback.beat;
    const voices = context.createBufferSource.mock.results.map((result) => result.value);
    const buses = voices.map((voice) => {
      const filter = voice.connect.mock.calls[0][0];
      const envelope = filter.connect.mock.calls[0][0];
      return envelope.connect.mock.calls[0][0];
    });
    expect(buses[0].gain.value).toBe(1);
    expect(buses[1].gain.value).toBe(0);
    await transport.configure({ parts: ['upper', 'lower'] });
    expect(buses[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(1, context.currentTime, 0.005);
    changes.length = 0;
    await transport.configure({ parts: ['upper'] });
    expect(buses[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(1, context.currentTime, 0.005);
    expect(buses[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(0, context.currentTime, 0.005);
    advance(0.5);
    await transport.configure({ parts: [] });
    advance(0.5);
    await transport.configure({ parts: ['upper', 'lower'] });
    expect(buses[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(1, context.currentTime, 0.005);
    expect(playback.beat).toBeGreaterThan(before + 0.9);
    expect(changes.every((state) => state.playing)).toBe(true);
    expect(context.createBufferSource).toHaveBeenCalledTimes(2);
    expect(
      voices.every(
        (voice) => voice.stop.mock.calls.length === 1 && !voice.disconnect.mock.calls.length,
      ),
    ).toBe(true);
    transport.pause();
    expect(voices.every((voice) => voice.disconnect.mock.calls.length === 1)).toBe(true);
  });
  it('never starts after a pending audio unlock was cancelled by pause or navigation', async () => {
    context.state = 'suspended';
    let unlock: () => void;
    context.resume.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          unlock = resolve;
        }),
    );
    const transport = make();
    const starting = transport.play();
    transport.dispose();
    context.state = 'running';
    unlock!();
    await starting;
    expect(context.createOscillator).not.toHaveBeenCalled();
    expect(context.createBufferSource).not.toHaveBeenCalled();
    expect(context.close).toHaveBeenCalledOnce();
  });
  it('stops the previous player before a different player begins', async () => {
    const first = make(),
      second = make('bass');
    await first.play();
    const voice = context.createBufferSource.mock.results[0].value;
    await second.play();
    expect(voice.disconnect).toHaveBeenCalled();
  });
  it('ignores an unlock rejection after a score edit disposed the previous player', async () => {
    context.state = 'suspended';
    let rejectUnlock: (error: Error) => void;
    context.resume.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectUnlock = reject;
        }),
    );
    const transport = make();
    const starting = transport.play();
    transport.dispose();
    rejectUnlock!(new Error('Context closed during edit'));
    await expect(starting).resolves.toBeUndefined();
    expect(context.createOscillator).not.toHaveBeenCalled();
    expect(context.createBufferSource).not.toHaveBeenCalled();
  });
  it('recovers after audio startup fails', async () => {
    context.state = 'suspended';
    context.resume.mockRejectedValueOnce(new Error('Blocked'));
    const transport = make();
    await expect(transport.play()).rejects.toThrow('Blocked');
    expect(playback.playing).toBe(false);
    context.state = 'running';
    await transport.play();
    expect(playback.playing).toBe(true);
  });
  it('changes an instrument during playback without changing pitch or musical position', async () => {
    const transport = make();
    await transport.play();
    advance(0.2);
    const before = playback.beat;
    const old = context.createBufferSource.mock.results[0].value;
    const filter = context.createBiquadFilter.mock.results[0].value;
    await transport.configure({
      instrumentation: { melody: 'guitar', chords: 'piano', bass: 'bass-guitar' },
    });
    const next = context.createOscillator.mock.results.at(-1)!.value;
    expect(playback.playing).toBe(true);
    expect(playback.beat).toBeCloseTo(before);
    expect(next.frequency.value).toBeCloseTo(frequency(midiPitch('E4')));
    expect(old.playbackRate.value).toBeCloseTo(2 ** (1 / 12));
    expect(next.setPeriodicWave).toHaveBeenCalled();
    expect(old.disconnect).toHaveBeenCalled();
    expect(filter.disconnect).toHaveBeenCalled();
    expect(next.stop.mock.calls[0][0] - next.start.mock.calls[0][0]).toBeCloseTo(
      ((1 - before) * 60) / 84,
    );
  });
  it('uses a bass timbre for the bass part and releases its filter when paused', async () => {
    const transport = make('bass');
    await transport.play();
    expect(context.createOscillator.mock.results[0].value.frequency.value).toBeCloseTo(
      frequency(midiPitch('D2')),
    );
    const filter = context.createBiquadFilter.mock.results[0].value;
    const voice = context.createOscillator.mock.results[0].value;
    transport.dispose();
    expect(filter.disconnect).toHaveBeenCalled();
    expect(voice.stop).toHaveBeenCalled();
    expect(context.close).toHaveBeenCalled();
  });
});

it('preserves the canonical melody events and leaves the bass rests silent', () => {
  expect(midiPitch('C4')).toBe(60);
  expect(midiPitch('F#4')).toBe(66);
  expect(midiPitch('Bb3')).toBe(58);
  expect(frequency(69)).toBe(440);
  expect(musicExamples.slice(0, 5).map((example) => example.beats)).toEqual([4, 32, 32, 16, 4]);
  for (const example of musicExamples) {
    for (const note of example.notes) {
      expect(note.start).toBeGreaterThanOrEqual(0);
      expect(note.duration).toBeGreaterThan(0);
      expect(note.start + note.duration).toBeLessThanOrEqual(example.beats);
    }
  }
  expect(
    musicExamples
      .find((example) => example.id === 'bass')!
      .notes.map((note) => [note.start, note.duration]),
  ).toEqual([
    [0, 1],
    [2.5, 0.5],
  ]);
});
