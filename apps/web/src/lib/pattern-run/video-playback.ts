import { clipPosition, type PatternVideo, type VideoPlayer } from './video';

/** Provider setup reports through one lifetime, including players created after disposal. */
export interface VideoPlaybackEvents {
  active(): boolean;
  allowed(): boolean;
  attach(player: VideoPlayer): boolean;
  ready(): void;
  run(action: () => unknown): void;
  position(seconds: number, ended?: boolean): Promise<void>;
  every(milliseconds: number, callback: () => void): void;
  fail(cause: unknown): void;
}

interface VideoPlaybackPorts {
  runningAllowed(): boolean;
  connect(events: VideoPlaybackEvents): Promise<void>;
  every(milliseconds: number, callback: () => void): () => void;
  clear(): void;
  error(message: string): void;
}

/** Shared excerpt enforcement has no DOM, provider SDK, or ambient timer dependency. */
export function createVideoPlayback(video: PatternVideo, ports: VideoPlaybackPorts): VideoPlayer {
  let disposed = false;
  let player: VideoPlayer | undefined;
  let ready = false;
  let boundaryBusy = false;
  const timers: (() => void)[] = [];

  void ports
    .connect({
      active: () => !disposed,
      allowed: () => !disposed && ports.runningAllowed(),
      attach: (next) => {
        if (disposed) {
          invoke(() => next.destroy());
          return false;
        }
        player = next;
        return true;
      },
      ready: () => {
        if (!disposed) ready = true;
      },
      run: (action) => {
        if (!disposed) invoke(action);
      },
      position,
      every: (milliseconds, callback) => {
        if (!disposed) timers.push(ports.every(milliseconds, callback));
      },
      fail,
    })
    .catch(fail);

  return {
    play: () => {
      if (!disposed && ready && ports.runningAllowed()) invoke(() => player?.play());
    },
    pause: () => {
      if (!disposed && ready) invoke(() => player?.pause());
    },
    seek: (seconds) => {
      if (!disposed && ready) invoke(() => player?.seek(seconds));
    },
    destroy: () => {
      if (disposed) return;
      disposed = true;
      for (const cancel of timers) cancel();
      invoke(() => player?.destroy());
      ports.clear();
    },
  };

  async function position(seconds: number, ended = false) {
    if (disposed || !player || boundaryBusy) return;
    if (!ports.runningAllowed()) {
      await player.pause();
      return;
    }
    const boundary = ended ? 'end' : clipPosition(video, seconds);
    // YouTube seeks to keyframes: repeated lower-bound seeks can prevent playback.
    if (!boundary || (boundary === 'start' && video.provider === 'youtube')) return;
    boundaryBusy = true;
    try {
      if (boundary === 'start') await player.seek(video.start_seconds);
      else {
        await player.pause();
        if (disposed) return;
        // Reset for replay while preserving the participant's explicit play control.
        await player.seek(video.start_seconds);
        if (video.loop_video && ports.runningAllowed() && !disposed) await player.play();
      }
    } finally {
      boundaryBusy = false;
    }
  }

  function invoke(action: () => unknown) {
    try {
      void Promise.resolve(action()).catch(fail);
    } catch (cause) {
      fail(cause);
    }
  }

  function fail(cause: unknown) {
    if (!disposed)
      ports.error(cause instanceof Error ? cause.message : 'Could not play this video.');
  }
}
