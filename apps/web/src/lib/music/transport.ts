import { frequency, type MusicExample, type Note, type Part } from './examples';
import { defaultInstrumentation, instrumentVoice, type Instrumentation } from './instruments';
import { tracksFor, type BeatRange } from './model';
import { notesInRange, playbackRange } from './playback-range';
import { clockFor } from './timing';
import { preparePiano } from './piano';
import { percussionVoice } from './percussion';
import { claimMusicPlayback, releaseMusicPlayback } from './playback-focus';

export type Playback = { playing: boolean; beat: number; error?: string };
export type PlaybackOptions = {
  tempo: number;
  loop: boolean;
  loopRange?: BeatRange;
  parts: Part[];
  volume: number;
  instrumentation: Instrumentation;
};

/** A short look-ahead schedules against the audio clock, not animation frames. */
export function createTransport(example: MusicExample, changed: (state: Playback) => void) {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  const partGains = new Map<Part, GainNode>();
  let options: PlaybackOptions = {
    tempo: example.tempo,
    loop: false,
    parts: tracksFor(example).map((track) => track.id),
    volume: 0.35,
    instrumentation: { ...defaultInstrumentation },
  };
  let playing = false,
    beat = 0,
    anchorBeat = 0,
    anchorTime = 0;
  let generation = 0,
    disposed = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  let cycle = 0,
    index = 0;
  const tracks = tracksFor(example);
  const notes: Note[] = example.notes
    .map((note) => ({
      ...note,
      drum: note.drum ?? tracks.find((track) => track.id === note.part)?.drum,
    }))
    .sort((a, b) => a.start - b.start);
  let clock = clockFor(example);
  const voices = new Set<{
    oscillator: AudioScheduledSourceNode;
    filter: BiquadFilterNode;
    envelope: GainNode;
  }>();
  const emit = () => changed({ playing, beat });
  const range = () => playbackRange(example, options.loop ? options.loopRange : undefined);
  const rangeSeconds = () => clock.seconds(range().end) - clock.seconds(range().start);
  const scheduledNotes = () => (options.loop ? notesInRange(notes, range()) : notes);
  let scheduled = notes;
  const absoluteSeconds = () =>
    clock.seconds(anchorBeat) + Math.max(0, (context?.currentTime ?? 0) - anchorTime);
  function position(seconds: number) {
    if (!options.loop) return Math.min(clock.beat(seconds), example.beats);
    const start = clock.seconds(range().start),
      length = rangeSeconds();
    return clock.beat(start + ((((seconds - start) % length) + length) % length));
  }
  function silence() {
    for (const voice of voices) {
      voice.oscillator.stop();
      voice.oscillator.disconnect();
      voice.filter.disconnect();
      voice.envelope.disconnect();
    }
    voices.clear();
  }
  function pause() {
    generation += 1;
    if (playing) {
      beat = position(absoluteSeconds());
    }
    playing = false;
    clearInterval(timer);
    silence();
    releaseMusicPlayback(pause);
    emit();
  }
  function tone(note: Note, startBeat: number, duration = note.duration, cycleSeconds = 0) {
    if (!context || !master) return;
    let destination = partGains.get(note.part);
    if (!destination) {
      destination = context.createGain();
      destination.gain.value = options.parts.includes(note.part) ? 1 : 0;
      destination.connect(master);
      partGains.set(note.part, destination);
    }
    const start = Math.max(
      context.currentTime,
      anchorTime + cycleSeconds + clock.seconds(startBeat) - clock.seconds(anchorBeat),
    );
    const seconds = clock.seconds(startBeat + duration) - clock.seconds(startBeat);
    const drum = note.drum ?? tracks.find((track) => track.id === note.part)?.drum;
    const level =
      (note.part === 'chords' || note.part === 'accompaniment' ? 0.085 : 0.22) *
      (note.velocity ?? 1);
    const voice = drum
      ? percussionVoice(context, destination, drum, start, level)
      : instrumentVoice(
          context,
          destination,
          options.instrumentation[note.part] ??
            tracks.find((track) => track.id === note.part)?.instrument ??
            'piano',
          frequency(note.midi),
          start,
          seconds,
          level,
        );
    const { oscillator, filter, envelope } = voice;
    voices.add(voice);
    oscillator.onended = () => {
      voices.delete(voice);
      oscillator.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + ('seconds' in voice ? voice.seconds : seconds));
  }
  function tick() {
    if (!playing || !context) return;
    if (context.state !== 'running') {
      pause();
      return;
    }
    const seconds = absoluteSeconds();
    beat = position(seconds);
    if (!options.loop && seconds >= clock.seconds(example.beats)) {
      playing = false;
      clearInterval(timer);
      releaseMusicPlayback(pause);
      emit();
      return;
    }
    const length = rangeSeconds();
    const currentCycle = options.loop
      ? Math.floor((seconds - clock.seconds(range().start)) / length)
      : 0;
    if (cycle < currentCycle) {
      cycle = currentCycle;
      index = scheduled.findIndex((note) => note.start >= beat);
      if (index < 0) index = scheduled.length;
    }
    // The same seconds offset repeats the selected tempo-map span, including its rests.
    for (let count = 0; count < 256 && scheduled.length; count += 1) {
      if (index >= scheduled.length) {
        if (!options.loop) break;
        index = 0;
        cycle += 1;
      }
      const note = scheduled[index];
      const offset = cycle * length;
      const startSeconds = offset + clock.seconds(note.start);
      if (startSeconds > seconds + 0.15) break;
      if (startSeconds >= seconds - 0.05) tone(note, note.start, note.duration, offset);
      index += 1;
    }
    emit();
  }
  async function play() {
    if (disposed || playing) return;
    const token = ++generation;
    claimMusicPlayback(pause);
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = options.volume;
        master.connect(context.destination);
      }
      if (context.state !== 'running') await context.resume();
      if (disposed || token !== generation) return;
      if (context.state !== 'running') throw new Error('Audio is unavailable.');
      await preparePiano(
        context,
        notes
          .filter(
            (note) =>
              !note.drum &&
              !tracks.find((track) => track.id === note.part)?.drum &&
              (options.instrumentation[note.part] ??
                tracks.find((track) => track.id === note.part)?.instrument ??
                'piano') === 'piano',
          )
          .map((note) => note.midi),
      );
      if (disposed || token !== generation) return;
      const bounds = range();
      if (beat >= bounds.end || beat < bounds.start) beat = bounds.start;
      scheduled = scheduledNotes();
      anchorBeat = beat;
      anchorTime = context.currentTime + 0.03;
      cycle = 0;
      index = scheduled.findIndex((note) => note.start >= beat);
      if (index < 0) index = scheduled.length;
      for (const note of scheduled) {
        if (
          !note.drum &&
          !tracks.find((track) => track.id === note.part)?.drum &&
          note.start < beat &&
          note.start + note.duration > beat
        ) {
          tone(note, beat, note.start + note.duration - beat);
        }
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
      beat = Math.max(0, Math.min(value, example.beats));
      emit();
      if (resume) await play();
    },
    async configure(next: Partial<PlaybackOptions>) {
      const resume = playing;
      const restart =
        next.tempo !== undefined ||
        next.loop !== undefined ||
        'loopRange' in next ||
        next.instrumentation !== undefined;
      if (restart) pause();
      options = {
        ...options,
        ...next,
        instrumentation: { ...(next.instrumentation ?? options.instrumentation) },
      };
      options.tempo = Math.max(10, Math.min(400, options.tempo));
      clock = clockFor(example, options.tempo);
      options.volume = Math.max(0, Math.min(1, options.volume));
      if (master) master.gain.value = options.volume;
      // Keep the audio clock and held/scheduled notes running. A short fade avoids clicks,
      // and silent voices stay in time so unmuting can reveal an already sounding note.
      if (next.parts && context)
        for (const [part, destination] of partGains)
          destination.gain.setTargetAtTime(
            options.parts.includes(part) ? 1 : 0,
            context.currentTime,
            0.005,
          );
      if (restart && resume) await play();
    },
    dispose() {
      disposed = true;
      pause();
      for (const destination of partGains.values()) destination.disconnect();
      partGains.clear();
      void context?.close().catch(() => {});
    },
  };
}
