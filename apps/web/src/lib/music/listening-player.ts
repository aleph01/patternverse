import type { PatternVideo, VideoPlayer } from '$lib/pattern-run/video';
import { createVideoPlayback } from '$lib/pattern-run/video-playback';
import { connectVideoProvider } from '$lib/pattern-run/video-providers';

/** The course adds no second SDK loader or excerpt clock; reuse the host's video lifecycle. */
export function mountListeningPlayer(
  host: HTMLElement,
  video: PatternVideo,
  allowed: () => boolean,
  ready: () => void,
  error: (message: string) => void,
): VideoPlayer {
  return createVideoPlayback(video, {
    runningAllowed: allowed,
    error,
    connect: (events) =>
      connectVideoProvider(host, video, '', {
        ...events,
        ready() {
          events.ready();
          if (events.active()) ready();
        },
      }),
    every: (milliseconds, callback) => {
      const timer = setInterval(callback, milliseconds);
      return () => clearInterval(timer);
    },
    clear: () => host.replaceChildren(),
  });
}
