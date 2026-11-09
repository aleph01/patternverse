import type { Instrument } from './instruments';

/** Positions and durations are quarter-note beats, independent of displayed meter. */
export type Part = string;
export type DrumSound = 'kick' | 'snare' | 'hat' | 'click';
export type Note = {
  pitch: string;
  midi: number;
  start: number;
  duration: number;
  /** Note-off time for notation when sustain pedal extends the sounding duration. */
  writtenDuration?: number;
  part: Part;
  velocity?: number;
  drum?: DrumSound;
};
export type MusicTrack = {
  id: Part;
  label: string;
  instrument?: Instrument;
  drum?: DrumSound;
};
export type Harmony = {
  start: number;
  /** A key centre over a riff is not an invented, sounding chord. */
  kind?: 'tonal-centre';
  /** Quarter-note beats. Legacy labels may omit this; the next onset supplies the boundary. */
  duration?: number;
  roman: string;
  name: string;
  /** Optional root spelling and track scope for authored MIDI harmony annotations. */
  root?: string;
  parts?: Part[];
  /** Collect attacks of the authored chord tones across a broken-chord figure. */
  voicingWindow?: number;
  /** Use the bass instrument rather than a guitar's lower register for inversion analysis. */
  bassPart?: Part;
};
export type MusicSection = { label: string; start: number; end: number; description?: string };
export type BeatRange = { start: number; end: number };
/** Beat zero in the authored tempo map corresponds to this position in the recording. */
export type MusicRecording = {
  src: string;
  label: string;
  offsetSeconds?: number;
  /** An official visible YouTube embed; src remains its source link, never an audio stream. */
  youtubeId?: string;
  /** Absolute recording seconds at musical positions; covers beat zero through the song end. */
  alignment?: { beat: number; seconds: number }[];
  alignmentStatus?: 'draft' | 'reviewed';
};
export type MusicComparison = {
  changed: string;
  invariant: string;
  effect: string;
  useWhen: string;
};
export type MusicVariant = {
  id: string;
  label: string;
  description: string;
  notes: Note[];
  harmony?: Harmony[];
  sections?: MusicSection[];
};
export type MusicExample = {
  id: string;
  title: string;
  description: string;
  key: string;
  tempo: number;
  beatsPerBar: number;
  beatUnit?: number;
  beats: number;
  notes: Note[];
  chords: string[];
  harmony?: Harmony[];
  tracks?: MusicTrack[];
  variants?: MusicVariant[];
  defaultView?: 'form' | 'harmony' | 'grid' | 'roll' | 'score';
  defaultPlayback?: 'midi' | 'recording';
  /** Optional authored score scope; playback and roll still retain all selected parts. */
  notationParts?: Part[];
  tempos?: { beat: number; bpm: number }[];
  meters?: { beat: number; numerator: number; denominator: number }[];
  sections?: MusicSection[];
  comparison?: MusicComparison;
  recording?: MusicRecording;
  source?: { label: string; detail?: string; url?: string };
  notices?: string[];
};

export function tracksFor(example: MusicExample): MusicTrack[] {
  const legacy: Record<string, MusicTrack> = {
    melody: { id: 'melody', label: 'Melody', instrument: 'piano' },
    chords: { id: 'chords', label: 'Chords', instrument: 'guitar' },
    bass: { id: 'bass', label: 'Bass', instrument: 'bass-guitar' },
  };
  const ids = [
    ...new Set([
      ...(example.tracks ?? []).map((track) => track.id),
      ...example.notes.map((note) => note.part),
    ]),
  ];
  return ids.map(
    (id) =>
      example.tracks?.find((track) => track.id === id) ??
      legacy[id] ?? { id, label: id, instrument: 'piano' },
  );
}

export function withVariant(example: MusicExample, id: string): MusicExample {
  const variant = example.variants?.find((item) => item.id === id);
  return variant
    ? {
        ...example,
        ...variant,
        id: example.id,
        title: example.title,
        harmony: variant.harmony ?? example.harmony,
      }
    : example;
}
