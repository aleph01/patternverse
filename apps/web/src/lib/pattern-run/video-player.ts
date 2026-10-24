import type { PatternVideo, VideoPlayer } from './video';
import { connectVideoProvider } from './video-providers';
import { createVideoPlayback } from './video-playback';

/** Compose browser providers at the boundary; callers retain synchronous disposal. */
export function mountVideoPlayer(
  element: HTMLElement,
  video: PatternVideo,
  runningAllowed: () => boolean,
  onerror: (message: string) => void,
  dailyPlayerId = '',
): VideoPlayer {
  return createVideoPlayback(video, {
    runningAllowed,
    error: onerror,
    connect: (events) => connectVideoProvider(element, video, dailyPlayerId, events),
    every: (milliseconds, callback) => {
      const timer = setInterval(callback, milliseconds);
      return () => clearInterval(timer);
    },
    clear: () => element.replaceChildren(),
  });
}
