import { describe, expect, it, vi } from 'vitest';
import { createVideoPlayback, type VideoPlaybackEvents } from './video-playback';
import type { PatternVideo } from './video';

const video: PatternVideo = {
  provider: 'vimeo',
  url: 'https://vimeo.com/123',
  id: '123',
  title: null,
  start_seconds: 10,
  end_seconds: 30,
  autoplay: false,
  muted: false,
  loop_video: false,
  captions: null,
};

function setup(config: Partial<PatternVideo> = {}) {
  let events!: VideoPlaybackEvents;
  let allowed = true;
  const sdk = { play: vi.fn(), pause: vi.fn(), seek: vi.fn(), destroy: vi.fn() };
  const cancel = vi.fn();
  const error = vi.fn();
  const clear = vi.fn();
  const every = vi.fn(() => cancel);
  const player = createVideoPlayback(
    { ...video, ...config },
    {
      runningAllowed: () => allowed,
      connect: async (next) => {
        events = next;
      },
      every,
      clear,
      error,
    },
  );
  return {
    player,
    sdk,
    events,
    cancel,
    every,
    error,
    clear,
    allow: (value: boolean) => {
      allowed = value;
    },
    ready: () => {
      events.attach(sdk);
      events.ready();
    },
  };
}

describe('embedded clip lifecycle', () => {
  it('gates controls on readiness, permission and lifetime', () => {
    const t = setup();
    t.player.play();
    t.player.pause();
    t.player.seek(15);
    expect(t.sdk.play).not.toHaveBeenCalled();
    expect(t.sdk.pause).not.toHaveBeenCalled();
    expect(t.sdk.seek).not.toHaveBeenCalled();
    t.ready();
    t.player.play();
    t.player.seek(15);
    expect(t.sdk.play).toHaveBeenCalledOnce();
    expect(t.sdk.seek).toHaveBeenCalledWith(15);
    t.allow(false);
    t.player.play();
    t.player.pause();
    expect(t.sdk.play).toHaveBeenCalledOnce();
    expect(t.sdk.pause).toHaveBeenCalledOnce();
    t.player.destroy();
    t.allow(true);
    t.player.play();
    t.player.pause();
    t.player.seek(20);
    expect(t.sdk.play).toHaveBeenCalledOnce();
    expect(t.sdk.pause).toHaveBeenCalledOnce();
    expect(t.sdk.seek).toHaveBeenCalledOnce();
  });

  it('enforces excerpt bounds and resets ended clips without implicit replay', async () => {
    const t = setup();
    t.ready();
    await t.events.position(5);
    expect(t.sdk.seek).toHaveBeenLastCalledWith(10);
    await t.events.position(20);
    expect(t.sdk.seek).toHaveBeenCalledOnce();
    await t.events.position(30);
    await t.events.position(20, true);
    expect(t.sdk.pause).toHaveBeenCalledTimes(2);
    expect(t.sdk.seek).toHaveBeenCalledTimes(3);
    expect(t.sdk.play).not.toHaveBeenCalled();
    t.allow(false);
    await t.events.position(30);
    expect(t.sdk.pause).toHaveBeenCalledTimes(3);
    expect(t.sdk.seek).toHaveBeenCalledTimes(3);
  });

  it('does not repeatedly seek YouTube keyframes below the lower bound', async () => {
    const t = setup({ provider: 'youtube' });
    t.ready();
    await t.events.position(9);
    expect(t.sdk.seek).not.toHaveBeenCalled();
    await t.events.position(30);
    expect(t.sdk.seek).toHaveBeenCalledWith(10);
  });

  it('coalesces boundary events and checks permission again before looping', async () => {
    const t = setup({ loop_video: true });
    t.ready();
    let resume!: () => void;
    t.sdk.pause.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resume = resolve;
        }),
    );
    const pending = t.events.position(30);
    await t.events.position(31);
    expect(t.sdk.pause).toHaveBeenCalledOnce();
    t.allow(false);
    resume();
    await pending;
    expect(t.sdk.play).not.toHaveBeenCalled();
    t.allow(true);
    await t.events.position(30);
    expect(t.sdk.play).toHaveBeenCalledOnce();
  });

  it('cancels scheduling and destroys late players without publishing late errors', async () => {
    const t = setup();
    t.events.every(100, () => {});
    t.player.destroy();
    t.player.destroy();
    expect(t.cancel).toHaveBeenCalledOnce();
    expect(t.clear).toHaveBeenCalledOnce();
    expect(t.events.attach(t.sdk)).toBe(false);
    expect(t.sdk.destroy).toHaveBeenCalledOnce();
    t.events.ready();
    t.events.every(100, () => {});
    t.events.fail(new Error('late'));
    const late = vi.fn();
    t.events.run(late);
    await t.events.position(30);
    expect(late).not.toHaveBeenCalled();
    expect(t.every).toHaveBeenCalledOnce();
    expect(t.error).not.toHaveBeenCalled();
    expect(t.sdk.pause).not.toHaveBeenCalled();
  });

  it('stops a pending boundary sequence at disposal', async () => {
    const t = setup({ loop_video: true });
    t.ready();
    let resume!: () => void;
    t.sdk.pause.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resume = resolve;
        }),
    );
    const pending = t.events.position(30);
    t.player.destroy();
    resume();
    await pending;
    expect(t.sdk.seek).not.toHaveBeenCalled();
    expect(t.sdk.play).not.toHaveBeenCalled();
  });

  it('reports synchronous and asynchronous provider failures and recovers after a failed seek', async () => {
    const t = setup();
    t.ready();
    t.events.run(() => {
      throw new Error('sync');
    });
    t.events.run(() => Promise.reject(new Error('async')));
    await Promise.resolve();
    expect(t.error.mock.calls).toEqual([['sync'], ['async']]);
    t.sdk.seek.mockImplementationOnce(() => {
      throw new Error('seek');
    });
    await expect(t.events.position(30)).rejects.toThrow('seek');
    await t.events.position(30);
    expect(t.sdk.seek).toHaveBeenCalledTimes(2);
  });
});
