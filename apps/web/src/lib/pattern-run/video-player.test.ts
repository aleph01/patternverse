// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountVideoPlayer } from './video-player';
import type { PatternVideo } from './video';

const video: PatternVideo = {
  url: 'https://youtu.be/M7lc1UVf-VE',
  provider: 'youtube',
  id: 'M7lc1UVf-VE',
  title: 'Clip',
  start_seconds: 10,
  end_seconds: 30,
  autoplay: true,
  muted: true,
  loop_video: false,
  captions: null,
};
let seconds = 10;
let events: { onReady(): void; onStateChange(e: { data: number }): void };
const play = vi.fn(),
  pause = vi.fn(),
  seek = vi.fn(),
  destroy = vi.fn(),
  mute = vi.fn();
const mounts: ReturnType<typeof mountVideoPlayer>[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  seconds = 10;
  vi.stubGlobal('YT', {
    Player: class {
      constructor(_element: unknown, options: { events: typeof events }) {
        events = options.events;
        queueMicrotask(() => events.onReady());
      }
      playVideo = play;
      pauseVideo = pause;
      seekTo = seek;
      destroy = destroy;
      mute = mute;
      getCurrentTime() {
        return seconds;
      }
      getDuration() {
        return 100;
      }
    },
  });
});
afterEach(() => {
  mounts.splice(0).forEach((p) => p.destroy());
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});
function mount(config = video, allowed = () => true) {
  const host = document.createElement('div');
  document.body.append(host);
  const error = vi.fn();
  const player = mountVideoPlayer(host, config, allowed, error);
  mounts.push(player);
  return { host, error, player };
}

describe('YouTube adapter lifecycle', () => {
  it('mutes, autoplays and stops at the excerpt end, resetting for replay', async () => {
    const { host, error } = mount();
    await vi.advanceTimersByTimeAsync(1);
    expect(host.querySelector('iframe')?.referrerPolicy).toBe('strict-origin-when-cross-origin');
    expect(play).toHaveBeenCalledOnce();
    expect(mute).toHaveBeenCalledOnce();
    seconds = 30;
    await vi.advanceTimersByTimeAsync(100);
    expect(pause).toHaveBeenCalled();
    expect(seek).toHaveBeenCalledWith(10, true);
    expect(play).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
  });
  it('loops only the selected excerpt and stops when the practice pauses', async () => {
    let allowed = true;
    const { player } = mount({ ...video, loop_video: true }, () => allowed);
    await vi.advanceTimersByTimeAsync(1);
    seconds = 30;
    await vi.advanceTimersByTimeAsync(100);
    expect(play).toHaveBeenCalledTimes(2);
    allowed = false;
    player.play();
    await vi.advanceTimersByTimeAsync(100);
    expect(play).toHaveBeenCalledTimes(2);
    expect(pause).toHaveBeenCalled();
  });
  it('restarts from the authored start after an ended event and destroys polling', async () => {
    const { player, host } = mount();
    await vi.advanceTimersByTimeAsync(1);
    events.onStateChange({ data: 0 });
    await vi.advanceTimersByTimeAsync(1);
    expect(seek).toHaveBeenCalledWith(10, true);
    player.destroy();
    expect(destroy).toHaveBeenCalled();
    expect(host.children.length).toBe(0);
    pause.mockClear();
    await vi.advanceTimersByTimeAsync(1000);
    expect(pause).not.toHaveBeenCalled();
  });
  it('does not create a player if disposed while its SDK is loading', async () => {
    vi.stubGlobal('YT', undefined);
    const { player, host } = mount();
    player.destroy();
    vi.stubGlobal('YT', { Player: vi.fn() });
    await vi.advanceTimersByTimeAsync(100);
    expect(host.querySelector('iframe')).toBeNull();
    expect((window as unknown as { YT: { Player: unknown } }).YT.Player).not.toHaveBeenCalled();
  });
});

describe('other provider adapters', () => {
  it('positions Vimeo on its first play and honors its end boundary', async () => {
    let update: (data: { seconds: number }) => void = () => {};
    let firstPlay: (data: { seconds: number }) => void = () => {};
    const vimeoSeek = vi.fn().mockResolvedValue(10);
    vi.stubGlobal('Vimeo', {
      Player: class {
        ready = vi.fn().mockResolvedValue(undefined);
        getDuration = vi.fn().mockResolvedValue(100);
        setCurrentTime = vimeoSeek;
        play = play;
        pause = pause;
        destroy = destroy;
        on(name: string, callback: typeof update) {
          if (name === 'timeupdate') update = callback;
          if (name === 'play') firstPlay = callback;
        }
      },
    });
    mount({ ...video, provider: 'vimeo', id: '123', url: 'https://vimeo.com/123' });
    await vi.advanceTimersByTimeAsync(1);
    expect(vimeoSeek).not.toHaveBeenCalled();
    firstPlay({ seconds: 0 });
    await vi.advanceTimersByTimeAsync(1);
    expect(vimeoSeek).toHaveBeenCalledWith(10);
    update({ seconds: 30 });
    await vi.advanceTimersByTimeAsync(1);
    expect(pause).toHaveBeenCalled();
    expect(vimeoSeek).toHaveBeenLastCalledWith(10);
  });
  it('explains the Dailymotion configuration requirement', async () => {
    const { error } = mount({ ...video, provider: 'dailymotion', id: 'x84sh87' });
    await vi.advanceTimersByTimeAsync(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Player ID'));
  });
});
