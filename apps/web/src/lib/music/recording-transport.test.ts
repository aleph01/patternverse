import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRecordingTransport } from './recording-transport';
import { songStudy } from './song-study';
import type { Playback } from './transport';
vi.mock('$app/paths', () => ({ base: '/app' }));

class Media extends EventTarget {
  currentTime = 0;
  volume = 1;
  playbackRate = 1;
  preload = '';
  play = vi.fn(async () => {});
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
}
let media: Media[], transports: ReturnType<typeof createRecordingTransport>[], state: Playback;
function make(offsetSeconds = 0) {
  const transport = createRecordingTransport(
    songStudy,
    { src: '/song.mp3', label: 'Original recording', offsetSeconds },
    (value) => (state = value),
  );
  transports.push(transport);
  return transport;
}
beforeEach(() => {
  vi.useFakeTimers();
  media = [];
  transports = [];
  state = { playing: false, beat: 0 };
  vi.stubGlobal(
    'Audio',
    vi.fn(function () {
      const item = new Media();
      media.push(item);
      return item;
    }),
  );
});
afterEach(() => {
  transports.forEach((t) => t.dispose());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('recording playback follows the media clock', () => {
  it('loads on demand and maps an offset, pauses, seeks and resumes at musical positions', async () => {
    const transport = make(2);
    expect(Audio).not.toHaveBeenCalled();
    await transport.seek(64);
    await transport.play();
    expect(Audio).toHaveBeenCalledWith('/app/song.mp3');
    expect(media[0].currentTime).toBe(42);
    media[0].currentTime = 43.25;
    vi.advanceTimersByTime(25);
    expect(state).toEqual({ playing: true, beat: 66 });
    transport.pause();
    media[0].currentTime = 90;
    vi.advanceTimersByTime(100);
    expect(state).toEqual({ playing: false, beat: 66 });
    await transport.play();
    expect(media[0].currentTime).toBe(43.25);
    await transport.seek(208);
    expect(media[0].currentTime).toBe(132);
    expect(state.playing).toBe(true);
  });
  it('loops exactly the selected section and restores the full-song boundary when minimized', async () => {
    const transport = make();
    await transport.configure({ loop: true, loopRange: { start: 64, end: 96 } });
    await transport.seek(64);
    await transport.play();
    media[0].currentTime = 60.125;
    vi.advanceTimersByTime(25);
    expect(media[0].currentTime).toBeCloseTo(40.125);
    expect(state.beat).toBeCloseTo(64.2);
    await transport.configure({ loopRange: undefined });
    media[0].currentTime = 60.5;
    vi.advanceTimersByTime(25);
    expect(state.beat).toBeCloseTo(96.8);
    media[0].currentTime = 160.5;
    vi.advanceTimersByTime(25);
    expect(state.beat).toBeCloseTo(0.8);
  });
  it('keeps a tempo map aligned to recording time, including inside a section loop', async () => {
    const example = { ...songStudy, tempos: [{ beat: 4, bpm: 60 }] };
    const transport = createRecordingTransport(
      example,
      { src: 'blob:study', label: 'Tempo map' },
      (value) => (state = value),
    );
    transports.push(transport);
    await transport.configure({ loop: true, loopRange: { start: 2, end: 6 } });
    await transport.seek(2);
    await transport.play();
    media[0].currentTime = 4.75;
    vi.advanceTimersByTime(25);
    expect(media[0].currentTime).toBeCloseTo(1.5);
    expect(state.beat).toBeCloseTo(2.4);
  });
  it('reports a short or failed recording without inventing MIDI annotations', async () => {
    const transport = make();
    await transport.play();
    media[0].currentTime = 3;
    media[0].dispatchEvent(new Event('ended'));
    expect(state.playing).toBe(false);
    expect(state.error).toContain('ends before');
    media[0].dispatchEvent(new Event('error'));
    expect(state.error).toContain('could not load');
  });
  it('stops another source and cancels a pending play on navigation', async () => {
    const first = make(),
      second = make();
    await first.play();
    await second.play();
    expect(media[0].pause).toHaveBeenCalled();
    second.pause();
    let complete!: () => void;
    media[1].play.mockImplementation(() => new Promise<void>((resolve) => (complete = resolve)));
    const pending = second.play();
    second.dispose();
    complete();
    await pending;
    expect(state.playing).toBe(false);
    expect(media[1].removeAttribute).toHaveBeenCalledWith('src');
  });
  it('recovers from rejected playback and stops at the map boundary', async () => {
    const transport = make();
    await transport.play();
    transport.pause();
    media[0].play.mockRejectedValueOnce(new Error('Blocked'));
    await expect(transport.play()).rejects.toThrow('Blocked');
    expect(state.playing).toBe(false);
    await transport.play();
    media[0].currentTime = 160.2;
    vi.advanceTimersByTime(25);
    expect(state).toEqual({ playing: false, beat: 256 });
  });
});
