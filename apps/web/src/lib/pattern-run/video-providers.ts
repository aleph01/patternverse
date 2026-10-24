import { checkVideoDuration, vimeoEmbedSource, youtubeSource, type PatternVideo } from './video';
import type { VideoPlaybackEvents } from './video-playback';
import { loadVideoSdk } from './video-sdk';

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
const sdkWindow = () => window as SDKWindow;

/** Provider-specific URLs, readiness, captions, and SDK event mapping stay at the browser edge. */
export async function connectVideoProvider(
  element: HTMLElement,
  video: PatternVideo,
  dailyPlayerId: string,
  events: VideoPlaybackEvents,
): Promise<void> {
  const child = document.createElement('div');
  element.append(child);
  switch (video.provider) {
    case 'youtube':
      return connectYoutube(child, video, events);
    case 'vimeo':
      return connectVimeo(child, video, events);
    case 'dailymotion':
      return connectDailymotion(child, video, dailyPlayerId, events);
  }
}

async function connectYoutube(
  child: HTMLElement,
  video: PatternVideo,
  events: VideoPlaybackEvents,
) {
  await loadVideoSdk('https://www.youtube.com/iframe_api', () => Boolean(sdkWindow().YT?.Player));
  if (!events.active()) return;
  const iframe = providerFrame(
    child,
    youtubeSource(video, window.location.origin),
    video.title ?? 'YouTube video',
  );
  const yt = new (sdkWindow().YT!.Player)(iframe, {
    events: {
      onReady() {
        if (!events.active()) return;
        events.ready();
        events.run(() => {
          checkVideoDuration(video, yt.getDuration());
          if (video.muted) yt.mute();
          if (video.autoplay && events.allowed()) yt.playVideo();
        });
        events.every(100, () =>
          events.run(() => {
            checkVideoDuration(video, yt.getDuration());
            return events.position(yt.getCurrentTime());
          }),
        );
      },
      onStateChange(event) {
        if (event.data === 0) events.run(() => events.position(yt.getCurrentTime(), true));
      },
      onError() {
        events.fail(
          new Error(
            'YouTube could not play this video. It may be unavailable or embedding may be disabled.',
          ),
        );
      },
    },
  });
  events.attach({
    play: () => yt.playVideo(),
    pause: () => yt.pauseVideo(),
    seek: (seconds) => yt.seekTo(seconds, true),
    destroy: () => yt.destroy(),
  });
}

async function connectVimeo(child: HTMLElement, video: PatternVideo, events: VideoPlaybackEvents) {
  await loadVideoSdk('https://player.vimeo.com/api/player.js', () =>
    Boolean(sdkWindow().Vimeo?.Player),
  );
  if (!events.active()) return;
  const iframe = providerFrame(child, vimeoEmbedSource(video), video.title ?? 'Vimeo video');
  const vimeo = new (sdkWindow().Vimeo!.Player)(iframe, {});
  if (
    !events.attach({
      play: () => vimeo.play(),
      pause: () => vimeo.pause(),
      seek: (seconds) => vimeo.setCurrentTime(seconds),
      destroy: () => vimeo.destroy(),
    })
  )
    return;
  await vimeo.ready();
  if (!events.active()) return;
  events.ready();
  checkVideoDuration(video, await vimeo.getDuration());
  if (!events.active()) return;
  let initiallyPositioned = false;
  vimeo.on('error', () => events.fail(new Error('Vimeo could not play this video.')));
  vimeo.on('timeupdate', ({ seconds }) => events.run(() => events.position(seconds)));
  vimeo.on('play', () =>
    events.run(async () => {
      if (!events.active() || !events.allowed()) {
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
  vimeo.on('ended', ({ seconds }) => events.run(() => events.position(seconds, true)));
  if (video.captions) void vimeo.enableTextTrack(video.captions).catch(() => {});
  if (video.autoplay && events.allowed()) await vimeo.play().catch(() => {});
}

async function connectDailymotion(
  child: HTMLElement,
  video: PatternVideo,
  dailyPlayerId: string,
  events: VideoPlaybackEvents,
) {
  if (!/^[a-zA-Z0-9]+$/.test(dailyPlayerId))
    throw new Error(
      'Dailymotion playback needs a Player ID configured by this host. Open the source video to watch it.',
    );
  await loadVideoSdk(`https://geo.dailymotion.com/libs/player/${dailyPlayerId}.js`, () =>
    Boolean(sdkWindow().dailymotion?.createPlayer),
  );
  if (!events.active()) return;
  child.id = `pattern-video-${crypto.randomUUID()}`;
  const daily = await sdkWindow().dailymotion!.createPlayer(child.id, {
    video: video.id,
    params: { startTime: video.start_seconds, mute: video.muted, loop: false },
  });
  if (!events.attach(daily)) return;
  events.ready();
  const names = sdkWindow().dailymotion!.events;
  daily.on(names.PLAYER_ERROR!, () =>
    events.fail(new Error('Dailymotion could not play this video.')),
  );
  daily.on(names.VIDEO_TIMECHANGE!, (state) =>
    events.run(() => {
      checkVideoDuration(video, state.videoDuration);
      return events.position(state.videoTime);
    }),
  );
  daily.on(names.VIDEO_END!, (state) => events.run(() => events.position(state.videoTime, true)));
  if (video.captions) void daily.setSubtitles(video.captions).catch(() => {});
  if (video.autoplay && events.allowed()) await daily.play().catch(() => {});
  else await daily.pause();
}

function providerFrame(child: HTMLElement, source: string, title: string) {
  const iframe = document.createElement('iframe');
  iframe.src = source;
  iframe.title = title;
  iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  // YouTube requires an origin Referer even when the host defaults to no-referrer.
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  child.replaceWith(iframe);
  return iframe;
}
