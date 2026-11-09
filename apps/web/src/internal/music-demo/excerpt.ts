import type { MusicExample, MusicTrack } from '../../lib/music/model';
import type { RepertoireEntry } from './catalog';

/** Trim only at authored boundaries; keep overlap, dynamics and musical time. */
export function repertoireExcerpt(source: MusicExample, entry: RepertoireEntry): MusicExample {
  const end = entry.start + entry.beats;
  if (entry.start < 0 || entry.beats <= 0 || end > source.beats + 0.001)
    throw new Error('The selected passage is outside this MIDI.');
  const parts = new Map(entry.parts.map((part) => [part.source, part]));
  const tracks: MusicTrack[] = entry.parts.map((part) => {
    const original = source.tracks?.find((track) => track.id === part.source);
    if (!original) throw new Error(`The source is missing the ${part.label} part.`);
    return {
      ...original,
      id: part.id,
      label: part.label,
      instrument: part.instrument ?? original.instrument,
    };
  });
  const notes = source.notes.flatMap((note) => {
    const part = parts.get(note.part);
    const start = Math.max(entry.start, note.start);
    const stop = Math.min(end, note.start + note.duration);
    return !part || stop <= start
      ? []
      : [
          {
            ...note,
            pitch: note.pitch.replace(
              /^([A-G][#b]?)/,
              (pitch) => entry.spellings?.[pitch] ?? pitch,
            ),
            part: part.id,
            start: start - entry.start,
            duration: stop - start,
            ...(note.writtenDuration !== undefined
              ? {
                  writtenDuration: Math.max(
                    0,
                    Math.min(end, note.start + note.writtenDuration) - start,
                  ),
                }
              : {}),
          },
        ];
  });
  if (!notes.length) throw new Error('The selected passage has no notes.');
  const tempo = source.tempos?.findLast((event) => event.beat <= entry.start)?.bpm ?? source.tempo;
  const meter = source.meters?.findLast((event) => event.beat <= entry.start) ?? {
    numerator: source.beatsPerBar,
    denominator: source.beatUnit ?? 4,
  };
  return {
    id: entry.id,
    title: entry.title,
    description: `${entry.focus} · ${entry.passage}. ${entry.cue}`,
    key: entry.key ?? (source.key === 'Imported MIDI' ? 'Repertoire excerpt' : source.key),
    tempo,
    beatsPerBar: meter.numerator,
    beatUnit: meter.denominator,
    beats: entry.beats,
    notes,
    tracks,
    chords: [],
    defaultView: 'roll',
    notationParts: entry.notationParts,
    tempos: [
      { beat: 0, bpm: tempo },
      ...(source.tempos ?? [])
        .filter((event) => event.beat > entry.start && event.beat < end)
        .map((event) => ({ ...event, beat: event.beat - entry.start })),
    ],
    meters: [
      { beat: 0, numerator: meter.numerator, denominator: meter.denominator },
      ...(source.meters ?? [])
        .filter((event) => event.beat > entry.start && event.beat < end)
        .map((event) => ({ ...event, beat: event.beat - entry.start })),
    ],
    source: { label: `${entry.credit} · excerpt`, detail: entry.terms },
    notices: [
      'Working repertoire excerpt. Selected parts, passage boundaries and the stated musical relationship have been checked in the MIDI data. Fidelity to the recording or a complete score is not yet approved for publication.',
      'Notation is an automatically generated reading guide. Pitch spelling and voice assignment still need review.',
      `${entry.passage}. Excerpt bars are numbered from 1 in the player. Notes crossing an excerpt boundary are trimmed at that boundary.`,
      entry.terms,
      ...(entry.note ? [entry.note] : []),
    ],
  };
}
