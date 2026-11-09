import { connectVideoProvider } from '../pattern-run/video-providers';
import type { VideoPlayer } from '../pattern-run/video';
import type { MusicExample, MusicRecording } from './model';
import type { Playback, PlaybackOptions } from './transport';
import { recordingClock } from './recording-timing';
import { playbackRange } from './playback-range';
import { claimMusicPlayback, releaseMusicPlayback } from './playback-focus';

/** Follow the visible provider's reported clock, including native controls and buffering. */
export function createYoutubeTransport(
  example: MusicExample,
  recording: MusicRecording,
  host: () => HTMLElement | undefined,
  changed: (state: Playback) => void,
) {
  const clock = recordingClock(example, recording);
  let player: VideoPlayer | undefined, initialization: Promise<void> | undefined;
  let playing = false,
    disposed = false,
    requested = false,
    beat = 0,
    generation = 0,
    connection = 0;
  let options: Partial<PlaybackOptions> = { loop: false };
  let settle: (() => void) | undefined, reject: ((cause: Error) => void) | undefined;
  const timers: ReturnType<typeof setInterval>[] = [];
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let pendingSeek: { seconds: number; expires: number } | undefined;
  const range = () => playbackRange(example, options.loop ? options.loopRange : undefined);
  const emit = (error?: string) => changed({ playing, beat, ...(error ? { error } : {}) });
  function pause() {
    generation++;
    requested = playing = false;
    player?.pause();
    releaseMusicPlayback(pause);
    emit();
  }
  function clear() {
    timers.splice(0).forEach(clearInterval);
    clearTimeout(timeout);
    player?.destroy();
    player = undefined;
    host()?.replaceChildren();
  }
  function fail(cause: unknown) {
    if (disposed) return;
    const error = new Error(
      `${cause instanceof Error ? cause.message : 'The official recording could not load.'} You can still use the MIDI study.`,
    );
    error.name = 'MusicRecordingError';
    pause();
    connection++;
    clear();
    reject?.(error);
    settle = reject = undefined;
    initialization = undefined;
    emit(error.message);
  }
  function positionAt(value: number) {
    beat = Math.max(0, Math.min(example.beats, value));
    const seconds = clock.seconds(beat);
    pendingSeek = { seconds, expires: Date.now() + 2000 };
    player?.seek(seconds);
    emit();
  }
  function initialize() {
    if (initialization) return initialization;
    const element = host();
    if (!element)
      return Promise.reject(new Error('The recording player is not ready. Try Play again.'));
    if (!/^[\w-]{11}$/.test(recording.youtubeId ?? ''))
      return Promise.reject(new Error('Invalid YouTube recording.'));
    const id = ++connection;
    const active = () => !disposed && id === connection;
    initialization = new Promise<void>((resolve, decline) => {
      settle = resolve;
      reject = decline;
    });
    timeout = setTimeout(() => fail(new Error('YouTube did not become ready.')), 20000);
    void connectVideoProvider(
      element,
      {
        url: recording.src,
        provider: 'youtube',
        id: recording.youtubeId!,
        title: recording.label,
        start_seconds: Math.floor(clock.seconds(0)),
        end_seconds: null,
        autoplay: false,
        muted: false,
        loop_video: false,
        captions: null,
      },
      '',
      {
        active,
        allowed: () => !disposed && requested,
        attach(next) {
          if (!active()) {
            next.destroy();
            return false;
          }
          player = next;
          return true;
        },
        ready() {
          if (!active()) return;
          clearTimeout(timeout);
          settle?.();
          settle = reject = undefined;
        },
        run(action) {
          if (!active()) return;
          try {
            void Promise.resolve(action()).catch(fail);
          } catch (cause) {
            fail(cause);
          }
        },
        every(ms, callback) {
          if (active()) timers.push(setInterval(callback, ms));
        },
        state(state) {
          if (!active()) return;
          if (state === 1) {
            if (!requested) {
              requested = true;
              claimMusicPlayback(pause);
            }
            playing = true;
          } else if (state === 2 || state === 0) {
            playing = requested = false;
            releaseMusicPlayback(pause);
          } else if (state === 3 || state === -1 || state === 5) {
            playing = false;
          }
          emit();
        },
        async position(seconds, ended) {
          if (!active() || !Number.isFinite(seconds)) return;
          // Ignore stale provider reports while an API seek is being acknowledged.
          if (
            pendingSeek &&
            Math.abs(seconds - pendingSeek.seconds) > 1 &&
            Date.now() < pendingSeek.expires
          )
            return;
          pendingSeek = undefined;
          beat = Math.max(0, Math.min(example.beats, clock.beat(seconds)));
          if (ended && beat < example.beats - 0.05) {
            fail(new Error('The recording ends before the mapped song.'));
            return;
          }
          if ((playing || ended) && (beat >= range().end || ended)) {
            if (options.loop) {
              positionAt(range().start);
              if (ended) {
                requested = true;
                claimMusicPlayback(pause);
                await player?.play();
              }
            } else {
              pause();
              beat = example.beats;
            }
          }
          emit();
        },
        fail: (cause) => {
          if (active()) fail(cause);
        },
      },
    ).catch((cause) => {
      if (active()) fail(cause);
    });
    return initialization;
  }
  async function play() {
    if (disposed || requested) return;
    const token = ++generation;
    requested = true;
    claimMusicPlayback(pause);
    try {
      await initialize();
      if (disposed || token !== generation) return;
      const bounds = range();
      positionAt(beat < bounds.start || beat >= bounds.end ? bounds.start : beat);
      await player?.play();
      // onStateChange, rather than the play request, confirms actual playback.
    } catch (cause) {
      if (!disposed && token === generation) pause();
      throw cause;
    }
  }
  return {
    play,
    pause,
    async seek(value: number) {
      positionAt(value);
    },
    async configure(next: Partial<PlaybackOptions>) {
      options = { ...options, ...next };
    },
    dispose() {
      disposed = true;
      connection++;
      pause();
      settle?.();
      settle = reject = undefined;
      clear();
    },
  };
}
