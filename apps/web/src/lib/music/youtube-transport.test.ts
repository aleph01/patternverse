import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createYoutubeTransport } from './youtube-transport';
import { connectVideoProvider } from '../pattern-run/video-providers';
import type { VideoPlaybackEvents } from '../pattern-run/video-playback';
import { songStudy } from './song-study';
import type { Playback } from './transport';
vi.mock('../pattern-run/video-providers', () => ({ connectVideoProvider: vi.fn() }));
let events: VideoPlaybackEvents, state: Playback;
let transports: ReturnType<typeof createYoutubeTransport>[];
const player = { play: vi.fn(), pause: vi.fn(), seek: vi.fn(), destroy: vi.fn() };
const host = { replaceChildren: vi.fn() } as unknown as HTMLElement;
function make(offsetSeconds = 2) {
  const transport = createYoutubeTransport(
    songStudy,
    {
      src: 'https://www.youtube.com/watch?v=5NV6Rdv1a3I',
      youtubeId: '5NV6Rdv1a3I',
      label: 'Official',
      offsetSeconds,
    },
    () => host,
    (value) => {
      state = value;
    },
  );
  transports.push(transport);
  return transport;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  transports = [];
  state = { playing: false, beat: 0 };
  vi.mocked(connectVideoProvider).mockImplementation(async (_host, _video, _id, value) => {
    events = value;
    value.attach(player);
    value.ready();
  });
});
afterEach(() => {
  transports.forEach((t) => t.dispose());
  vi.useRealTimers();
});

describe('official recording transport', () => {
  it('loads only on play and follows reported positions and native controls, not elapsed time', async () => {
    const transport = make();
    await transport.seek(64);
    expect(connectVideoProvider).not.toHaveBeenCalled();
    await transport.play();
    expect(player.seek).toHaveBeenLastCalledWith(42);
    expect(state.playing).toBe(false);
    events.state!(1);
    await events.position(42);
    await events.position(43.25);
    expect(state).toEqual({ playing: true, beat: 66 });
    vi.advanceTimersByTime(5000);
    expect(state.beat).toBe(66);
    events.state!(2);
    expect(state.playing).toBe(false);
    await transport.seek(208);
    expect(player.seek).toHaveBeenLastCalledWith(132);
    await transport.play();
    events.state!(1);
    await events.position(132);
    await events.position(133.25);
    expect(state).toEqual({ playing: true, beat: 210 });
  });
  it('loops the selected section, ignores stale seek reports and restores the song boundary', async () => {
    const transport = make(0);
    await transport.configure({ loop: true, loopRange: { start: 64, end: 96 } });
    await transport.play();
    events.state!(1);
    await events.position(40);
    await events.position(60.1);
    expect(player.seek).toHaveBeenLastCalledWith(40);
    expect(state.beat).toBe(64);
    await events.position(60.15);
    expect(state.beat).toBe(64);
    await events.position(40.125);
    expect(state.beat).toBeCloseTo(64.2);
    await transport.configure({ loop: false, loopRange: undefined });
    await events.position(160.1);
    expect(state).toEqual({ playing: false, beat: 256 });
    expect(player.pause).toHaveBeenCalled();
  });
  it('cancels late initialization and destroys providers arriving after source switching', async () => {
    vi.mocked(connectVideoProvider).mockImplementation(async (_h, _v, _i, value) => {
      events = value;
    });
    const transport = make(),
      pending = transport.play();
    transport.dispose();
    await pending;
    expect(events.active()).toBe(false);
    expect(events.attach(player)).toBe(false);
    expect(player.destroy).toHaveBeenCalled();
    events.ready();
    events.state!(1);
    await events.position(10);
    expect(player.play).not.toHaveBeenCalled();
    expect(state.playing).toBe(false);
  });
  it('reports provider errors, allows retry and ignores callbacks from failed connections', async () => {
    const transport = make();
    await transport.play();
    const old = events;
    events.fail(new Error('Embedding disabled'));
    expect(state.error).toContain('MIDI study');
    expect(state.playing).toBe(false);
    await transport.play();
    events.state!(1);
    await events.position(2);
    old.fail(new Error('Late failure'));
    old.state!(2);
    await old.position(90);
    expect(state).toEqual({ playing: true, beat: 0 });
  });
  it('times out unavailable embeds and makes the failure actionable', async () => {
    vi.mocked(connectVideoProvider).mockImplementation(async (_h, _v, _i, value) => {
      events = value;
    });
    const transport = make();
    const result = expect(transport.play()).rejects.toThrow('MIDI study');
    await vi.advanceTimersByTimeAsync(20000);
    await result;
    expect(state.playing).toBe(false);
    expect(events.active()).toBe(false);
  });
  it('keeps a tempo map and offset aligned and gives playback focus to another source', async () => {
    const first = make();
    await first.play();
    events.state!(1);
    const second = createYoutubeTransport(
      { ...songStudy, tempos: [{ beat: 4, bpm: 60 }] },
      { src: 'official', youtubeId: '5NV6Rdv1a3I', label: 'Official', offsetSeconds: 3 },
      () => host,
      (value) => {
        state = value;
      },
    );
    transports.push(second);
    await second.seek(6);
    await second.play();
    expect(player.pause).toHaveBeenCalled();
    expect(player.seek).toHaveBeenLastCalledWith(7.5);
    events.state!(1);
    await events.position(8.5);
    expect(state.beat).toBeCloseTo(7);
  });
  it('uses recording anchors for native seeking and section loops, and freezes during buffering', async () => {
    const transport = createYoutubeTransport(
      { ...songStudy, beats: 12 },
      {
        src: 'official',
        youtubeId: '7TDeBi34OtE',
        label: 'Official',
        alignment: [
          { beat: 0, seconds: 1 },
          { beat: 4, seconds: 5 },
          { beat: 12, seconds: 17 },
        ],
      },
      () => host,
      (value) => {
        state = value;
      },
    );
    transports.push(transport);
    await transport.seek(4);
    await transport.play();
    expect(player.seek).toHaveBeenLastCalledWith(5);
    events.state!(1);
    await events.position(5);
    await events.position(8);
    expect(state).toEqual({ playing: true, beat: 6 });
    events.state!(3);
    vi.advanceTimersByTime(6000);
    expect(state).toEqual({ playing: false, beat: 6 });
    events.state!(1);
    await events.position(14);
    expect(state).toEqual({ playing: true, beat: 10 });
    await transport.configure({ loop: true, loopRange: { start: 4, end: 8 } });
    await events.position(12);
    expect(player.seek).toHaveBeenLastCalledWith(5);
    expect(state.beat).toBe(4);
  });
  it('loops at the provider end and reports a short video rather than jumping to the full song end', async () => {
    const transport = make(0);
    await transport.configure({ loop: true });
    await transport.play();
    events.state!(1);
    await events.position(0);
    events.state!(0);
    await events.position(160, true);
    expect(player.seek).toHaveBeenLastCalledWith(0);
    expect(player.play).toHaveBeenCalledTimes(2);
    await events.position(0);
    events.state!(1);
    await events.position(10, true);
    expect(state.error).toContain('ends before');
    expect(state.playing).toBe(false);
    expect(state.beat).toBe(16);
  });
});
