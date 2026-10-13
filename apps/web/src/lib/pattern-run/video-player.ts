import {
  checkVideoDuration,
  clipPosition,
  vimeoEmbedSource,
  youtubeSource,
  type PatternVideo,
  type VideoPlayer,
} from './video';

interface YoutubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allow: boolean): void;
  mute(): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}
interface VimeoPlayer {
  ready(): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  setCurrentTime(seconds: number): Promise<number>;
  getDuration(): Promise<number>;
  enableTextTrack(language: string): Promise<unknown>;
  destroy(): Promise<void>;
  on(event: string, callback: (data: { seconds: number }) => void): void;
}
interface DailyPlayer {
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(seconds: number): Promise<void>;
  destroy(): Promise<void>;
  setSubtitles(language: string): Promise<void>;
  on(event: string, callback: (state: { videoTime: number; videoDuration: number }) => void): void;
}
interface SDKWindow extends Window {
  YT?: {
    Player: new (
      element: HTMLIFrameElement,
      options: {
        events: { onReady(): void; onStateChange(event: { data: number }): void; onError(): void };
      },
    ) => YoutubePlayer;
  };
  Vimeo?: { Player: new (element: HTMLElement, options: Record<string, unknown>) => VimeoPlayer };
  dailymotion?: {
    createPlayer(id: string, options: Record<string, unknown>): Promise<DailyPlayer>;
    events: Record<string, string>;
  };
}
const scripts = new Map<string, Promise<void>>();
const sdkWindow = () => window as SDKWindow;

function loadSdk(source: string, ready: () => boolean): Promise<void> {
  if (ready()) return Promise.resolve();
  const existing = scripts.get(source);
  if (existing) return existing;
  const result = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = source;
    script.async = true;
    const finish = (error?: Error) => {
      clearInterval(poll);
      clearTimeout(timeout);
      script.onerror = null;
      if (error) {
        script.remove();
        scripts.delete(source);
        reject(error);
      } else resolve();
    };
    const timeout = setTimeout(
      () => finish(new Error('The video provider did not respond.')),
      15000,
    );
    const poll = setInterval(() => {
      if (ready()) finish();
    }, 50);
    script.onerror = () => finish(new Error('Could not load the video player.'));
    document.head.append(script);
  });
  scripts.set(source, result);
  return result;
}

/** Dispose synchronously even when a provider SDK is still loading. */
export function mountVideoPlayer(
  element: HTMLElement,
  video: PatternVideo,
  runningAllowed: () => boolean,
  onerror: (message: string) => void,
  dailyPlayerId = '',
): VideoPlayer {
  let disposed = false;
  let player: VideoPlayer | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let boundaryBusy = false;
  let ready = false;
  const fail = (cause: unknown) => {
    if (!disposed) onerror(cause instanceof Error ? cause.message : 'Could not play this video.');
  };
  const invoke = (action: () => unknown) => {
    try {
      void Promise.resolve(action()).catch(fail);
    } catch (e) {
      fail(e);
    }
  };
  async function position(seconds: number, ended = false) {
    if (disposed || !player || boundaryBusy) return;
    if (!runningAllowed()) {
      await player.pause();
      return;
    }
    const boundary = ended ? 'end' : clipPosition(video, seconds);
    // YouTube seeks to keyframes: repeated lower-bound seeks can prevent playback.
    if (boundary === 'start' && video.provider === 'youtube') return;
    if (!boundary) return;
    boundaryBusy = true;
    try {
      if (boundary === 'start') await player.seek(video.start_seconds);
      else {
        await player.pause();
        // Reset for replay while preserving the participant's explicit play control.
        await player.seek(video.start_seconds);
        if (video.loop_video && runningAllowed() && !disposed) await player.play();
      }
    } finally {
      boundaryBusy = false;
    }
  }
  async function initialize() {
    const child = document.createElement('div');
    element.append(child);
    if (video.provider === 'youtube') {
      await loadSdk('https://www.youtube.com/iframe_api', () => Boolean(sdkWindow().YT?.Player));
      if (disposed) return;
      const iframe = document.createElement('iframe');
      iframe.src = youtubeSource(video, window.location.origin);
      iframe.title = video.title ?? 'YouTube video';
      iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      // YouTube requires an origin Referer even when the host defaults to no-referrer.
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      child.replaceWith(iframe);
      const yt = new (sdkWindow().YT!.Player)(iframe, {
        events: {
          onReady() {
            if (disposed) return;
            ready = true;
            invoke(() => {
              checkVideoDuration(video, yt.getDuration());
              if (video.muted) yt.mute();
              if (video.autoplay && runningAllowed()) yt.playVideo();
            });
            timer = setInterval(
              () =>
                invoke(() => {
                  checkVideoDuration(video, yt.getDuration());
                  return position(yt.getCurrentTime());
                }),
              100,
            );
          },
          onStateChange(event) {
            if (event.data === 0) invoke(() => position(yt.getCurrentTime(), true));
          },
          onError() {
            fail(
              new Error(
                'YouTube could not play this video. It may be unavailable or embedding may be disabled.',
              ),
            );
          },
        },
      });
      player = {
        play: () => yt.playVideo(),
        pause: () => yt.pauseVideo(),
        seek: (s) => yt.seekTo(s, true),
        destroy: () => yt.destroy(),
      };
    } else if (video.provider === 'vimeo') {
      await loadSdk('https://player.vimeo.com/api/player.js', () =>
        Boolean(sdkWindow().Vimeo?.Player),
      );
      if (disposed) return;
      const iframe = document.createElement('iframe');
      iframe.src = vimeoEmbedSource(video);
      iframe.title = video.title ?? 'Vimeo video';
      iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      child.replaceWith(iframe);
      const vimeo = new (sdkWindow().Vimeo!.Player)(iframe, {});
      player = {
        play: () => vimeo.play(),
        pause: () => vimeo.pause(),
        seek: (s) => vimeo.setCurrentTime(s),
        destroy: () => vimeo.destroy(),
      };
      await vimeo.ready();
      if (disposed) return;
      ready = true;
      checkVideoDuration(video, await vimeo.getDuration());
      if (disposed) return;
      let initiallyPositioned = false;
      vimeo.on('error', () => fail(new Error('Vimeo could not play this video.')));
      vimeo.on('timeupdate', ({ seconds }) => invoke(() => position(seconds)));
      vimeo.on('play', () =>
        invoke(async () => {
          if (disposed || !runningAllowed()) {
            await vimeo.pause();
            return;
          }
          if (!initiallyPositioned) {
            initiallyPositioned = true;
            // Seeking before the first play would itself enable Vimeo autoplay.
            await vimeo.setCurrentTime(video.start_seconds);
          }
        }),
      );
      vimeo.on('ended', ({ seconds }) => invoke(() => position(seconds, true)));
      if (video.captions) void vimeo.enableTextTrack(video.captions).catch(() => {});
      if (video.autoplay && runningAllowed()) await vimeo.play().catch(() => {});
    } else if (video.provider === 'dailymotion') {
      if (!/^[a-zA-Z0-9]+$/.test(dailyPlayerId))
        throw new Error(
          'Dailymotion playback needs a Player ID configured by this host. Open the source video to watch it.',
        );
      await loadSdk(`https://geo.dailymotion.com/libs/player/${dailyPlayerId}.js`, () =>
        Boolean(sdkWindow().dailymotion?.createPlayer),
      );
      if (disposed) return;
      child.id = `pattern-video-${crypto.randomUUID()}`;
      const daily = await sdkWindow().dailymotion!.createPlayer(child.id, {
        video: video.id,
        params: { startTime: video.start_seconds, mute: video.muted, loop: false },
      });
      if (disposed) {
        await daily.destroy();
        return;
      }
      player = daily;
      ready = true;
      const events = sdkWindow().dailymotion!.events;
      daily.on(events.PLAYER_ERROR!, () =>
        fail(new Error('Dailymotion could not play this video.')),
      );
      daily.on(events.VIDEO_TIMECHANGE!, (state) =>
        invoke(() => {
          checkVideoDuration(video, state.videoDuration);
          return position(state.videoTime);
        }),
      );
      daily.on(events.VIDEO_END!, (state) => invoke(() => position(state.videoTime, true)));
      if (video.captions) void daily.setSubtitles(video.captions).catch(() => {});
      if (video.autoplay && runningAllowed()) await daily.play().catch(() => {});
      else await daily.pause();
    }
  }
  void initialize().catch(fail);
  return {
    play: () => {
      if (ready && runningAllowed()) invoke(() => player?.play());
    },
    pause: () => {
      if (ready) invoke(() => player?.pause());
    },
    seek: (s) => {
      if (ready) invoke(() => player?.seek(s));
    },
    destroy: () => {
      if (disposed) return;
      disposed = true;
      clearInterval(timer);
      invoke(() => player?.destroy());
      element.replaceChildren();
    },
  };
}
