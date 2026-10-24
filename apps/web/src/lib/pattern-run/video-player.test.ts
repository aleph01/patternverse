// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { mountVideoPlayer } from './video-player';
import type { PatternVideo } from './video';

const video: PatternVideo = {
  provider: 'youtube',
  url: 'https://youtu.be/abc',
  id: 'abc',
  title: 'Excerpt',
  start_seconds: 10,
  end_seconds: 30,
  autoplay: false,
  muted: true,
  loop_video: false,
  captions: 'en',
};
const mounted: ReturnType<typeof mountVideoPlayer>[] = [];

function mount(config: Partial<PatternVideo> = {}, dailyId = '') {
  const host = document.createElement('div');
  document.body.append(host);
  const error = vi.fn();
  let allowed = true;
  const player = mountVideoPlayer(host, { ...video, ...config }, () => allowed, error, dailyId);
  mounted.push(player);
  return {
    host,
    error,
    player,
    allow: (value: boolean) => {
      allowed = value;
    },
  };
}

afterEach(() => {
  for (const player of mounted.splice(0)) player.destroy();
  document.body.replaceChildren();
  document.head.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it('maps YouTube readiness, captions, origin, polling and excerpt replay', async () => {
  let callbacks!: {
    onReady(): void;
    onStateChange(event: { data: number }): void;
    onError(): void;
  };
  const sdk = {
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    seekTo: vi.fn(),
    mute: vi.fn(),
    getDuration: () => 60,
    getCurrentTime: () => 30,
    destroy: vi.fn(),
  };
  vi.stubGlobal('YT', {
    Player: class {
      constructor(_frame: HTMLElement, options: { events: typeof callbacks }) {
        callbacks = options.events;
        return sdk;
      }
    },
  });
  const t = mount();
  await vi.waitFor(() => expect(t.host.querySelector('iframe')).not.toBeNull());
  const frame = t.host.querySelector('iframe')!;
  const source = new URL(frame.src);
  expect(source.hostname).toBe('www.youtube-nocookie.com');
  expect(source.searchParams.get('origin')).toBe(location.origin);
  expect(source.searchParams.get('start')).toBe('10');
  expect(source.searchParams.get('end')).toBe('30');
  expect(source.searchParams.get('cc_lang_pref')).toBe('en');
  expect(frame.referrerPolicy).toBe('strict-origin-when-cross-origin');
  callbacks.onReady();
  expect(sdk.mute).toHaveBeenCalledOnce();
  expect(sdk.playVideo).not.toHaveBeenCalled();
  callbacks.onStateChange({ data: 0 });
  await vi.waitFor(() => expect(sdk.seekTo).toHaveBeenCalledWith(10, true));
  callbacks.onError();
  expect(t.error).toHaveBeenCalledWith(expect.stringContaining('YouTube could not'));
  t.player.destroy();
  callbacks.onReady();
  callbacks.onError();
  expect(sdk.destroy).toHaveBeenCalledOnce();
  expect(t.host.children).toHaveLength(0);
  expect(t.error).toHaveBeenCalledOnce();
});

function vimeoSdk() {
  const handlers: Record<string, (data: { seconds: number }) => void> = {};
  const sdk = {
    ready: vi.fn().mockResolvedValue(undefined),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn().mockResolvedValue(undefined),
    setCurrentTime: vi.fn().mockResolvedValue(10),
    getDuration: vi.fn().mockResolvedValue(60),
    enableTextTrack: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    on: (name: string, callback: (data: { seconds: number }) => void) => {
      handlers[name] = callback;
    },
  };
  vi.stubGlobal('Vimeo', {
    Player: class {
      constructor() {
        return sdk;
      }
    },
  });
  return { sdk, handlers };
}

it('does not seek or autoplay Vimeo before explicit playback and sets captions', async () => {
  const { sdk, handlers } = vimeoSdk();
  const t = mount({ provider: 'vimeo', id: '123', url: 'https://vimeo.com/123/private' });
  await vi.waitFor(() => expect(handlers.play).toBeTypeOf('function'));
  expect(t.host.querySelector('iframe')!.src).toContain('h=private');
  expect(t.host.querySelector('iframe')!.src).toContain('#t=10s');
  expect(sdk.enableTextTrack).toHaveBeenCalledWith('en');
  expect(sdk.setCurrentTime).not.toHaveBeenCalled();
  expect(sdk.play).not.toHaveBeenCalled();
  handlers.play({ seconds: 0 });
  await vi.waitFor(() => expect(sdk.setCurrentTime).toHaveBeenCalledWith(10));
  handlers.play({ seconds: 11 });
  expect(sdk.setCurrentTime).toHaveBeenCalledOnce();
  t.allow(false);
  handlers.play({ seconds: 11 });
  expect(sdk.pause).toHaveBeenCalledOnce();
});

it('destroys Vimeo during readiness and suppresses late duration and autoplay work', async () => {
  const { sdk, handlers } = vimeoSdk();
  let ready!: () => void;
  sdk.ready.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        ready = resolve;
      }),
  );
  const t = mount({ provider: 'vimeo', autoplay: true });
  await vi.waitFor(() => expect(sdk.ready).toHaveBeenCalled());
  t.player.destroy();
  ready();
  await Promise.resolve();
  expect(sdk.destroy).toHaveBeenCalledOnce();
  expect(sdk.getDuration).not.toHaveBeenCalled();
  expect(sdk.play).not.toHaveBeenCalled();
  expect(handlers).toEqual({});
});

it('reports an impossible Vimeo duration without starting autoplay', async () => {
  const { sdk } = vimeoSdk();
  sdk.getDuration.mockResolvedValue(20);
  const t = mount({ provider: 'vimeo', autoplay: true });
  await vi.waitFor(() => expect(t.error).toHaveBeenCalledWith(expect.stringContaining('outside')));
  expect(sdk.play).not.toHaveBeenCalled();
});

it('validates the Dailymotion host player and releases a player arriving after disposal', async () => {
  const invalid = mount({ provider: 'dailymotion' });
  await vi.waitFor(() =>
    expect(invalid.error).toHaveBeenCalledWith(expect.stringContaining('Player ID')),
  );
  let finish!: (value: typeof sdk) => void;
  const sdk = {
    play: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    destroy: vi.fn().mockResolvedValue(undefined),
    setSubtitles: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };
  const createPlayer = vi.fn(
    () =>
      new Promise<typeof sdk>((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal('dailymotion', { createPlayer, events: {} });
  const t = mount({ provider: 'dailymotion' }, 'host123');
  await vi.waitFor(() => expect(createPlayer).toHaveBeenCalledOnce());
  expect(createPlayer).toHaveBeenCalledWith(expect.stringMatching(/^pattern-video-/), {
    video: 'abc',
    params: { startTime: 10, mute: true, loop: false },
  });
  t.player.destroy();
  finish(sdk);
  await vi.waitFor(() => expect(sdk.destroy).toHaveBeenCalledOnce());
  expect(sdk.on).not.toHaveBeenCalled();
  expect(sdk.play).not.toHaveBeenCalled();
  expect(t.error).not.toHaveBeenCalled();
});
