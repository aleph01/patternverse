import { base } from '$app/paths';
import type { MusicExample, MusicRecording } from './model';
import type { Playback, PlaybackOptions } from './transport';
import { recordingClock } from './recording-timing';
import { playbackRange } from './playback-range';
import { claimMusicPlayback, releaseMusicPlayback } from './playback-focus';

/** The media clock is authoritative: the map follows the recording, never a parallel timer. */
export function createRecordingTransport(
  example: MusicExample,
  recording: MusicRecording,
  changed: (state: Playback) => void,
) {
  const clock = recordingClock(example, recording);
  let audio: HTMLAudioElement | undefined;
  let playing = false,
    disposed = false,
    beat = 0,
    generation = 0;
  let options: Partial<PlaybackOptions> = { loop: false, volume: 0.8, tempo: example.tempo };
  let timer: ReturnType<typeof setInterval> | undefined;
  const range = () => playbackRange(example, options.loop ? options.loopRange : undefined);
  const emit = (error?: string) => changed({ playing, beat, ...(error ? { error } : {}) });
  function read() {
    if (audio) beat = Math.min(example.beats, clock.beat(audio.currentTime));
  }
  function pause() {
    generation += 1;
    if (playing) read();
    playing = false;
    clearInterval(timer);
    audio?.pause();
    releaseMusicPlayback(pause);
    emit();
  }
  function tick() {
    if (!audio || !playing) return;
    read();
    const bounds = range();
    if (beat >= bounds.end) {
      if (options.loop) {
        const start = clock.seconds(bounds.start),
          length = clock.seconds(bounds.end) - start;
        audio.currentTime = start + ((audio.currentTime - start) % length);
        read();
      } else {
        pause();
        beat = example.beats;
      }
    }
    emit();
  }
  function ensureAudio() {
    if (audio) return audio;
    const src =
      recording.src.startsWith('/') && !recording.src.startsWith('//')
        ? base + recording.src
        : recording.src;
    audio = new Audio(src);
    audio.preload = 'metadata';
    audio.addEventListener('ended', () => {
      if (!playing) return;
      read();
      if (options.loop && beat >= range().end - 0.05) {
        pause();
        beat = range().start;
        void play().catch(() => emit('This recording could not resume. Press Play to try again.'));
      } else {
        pause();
        emit(
          beat < example.beats - 0.05
            ? 'The recording ends before the authored song map.'
            : undefined,
        );
      }
    });
    audio.addEventListener('error', () => {
      if (disposed) return;
      pause();
      emit('The recording could not load. Try the MIDI study or another recording source.');
    });
    return audio;
  }
  async function play() {
    if (disposed || playing) return;
    const token = ++generation;
    claimMusicPlayback(pause);
    // claimMusicPlayback only pauses a previous owner; this transport is not yet playing.
    const media = ensureAudio(),
      bounds = range();
    if (beat < bounds.start || beat >= bounds.end) beat = bounds.start;
    media.volume = options.volume ?? 0.8;
    media.playbackRate = (options.tempo ?? example.tempo) / example.tempo;
    media.currentTime = clock.seconds(beat);
    try {
      await media.play();
      if (disposed || token !== generation) {
        if (!playing) media.pause();
        return;
      }
      playing = true;
      tick();
      timer = setInterval(tick, 25);
    } catch (error) {
      if (disposed || token !== generation) return;
      pause();
      throw error;
    }
  }
  return {
    play,
    pause,
    async seek(value: number) {
      const resume = playing;
      pause();
      beat = Math.max(0, Math.min(example.beats, value));
      if (audio) audio.currentTime = clock.seconds(beat);
      emit();
      if (resume) await play();
    },
    async configure(next: Partial<PlaybackOptions>) {
      const resume = playing;
      pause();
      options = { ...options, ...next };
      options.volume = Math.max(0, Math.min(1, options.volume ?? 0.8));
      options.tempo = Math.max(10, Math.min(400, options.tempo ?? example.tempo));
      if (audio) {
        audio.volume = Math.max(0, Math.min(1, options.volume ?? 0.8));
        audio.playbackRate = Math.max(
          0.1,
          Math.min(4, (options.tempo ?? example.tempo) / example.tempo),
        );
      }
      if (resume) await play();
    },
    dispose() {
      disposed = true;
      pause();
      audio?.removeAttribute('src');
      audio?.load();
      audio = undefined;
    },
  };
}
