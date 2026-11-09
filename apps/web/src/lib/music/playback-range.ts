import type { BeatRange, MusicExample, Note } from './model';

export function playbackRange(example: MusicExample, range?: BeatRange): BeatRange {
  const start = Math.max(0, range?.start ?? 0);
  const end = Math.min(example.beats, range?.end ?? example.beats);
  return Number.isFinite(start) && Number.isFinite(end) && start < end
    ? { start, end }
    : { start: 0, end: example.beats };
}

/** Crop held notes at both loop boundaries, including notes that began before the section. */
export function notesInRange(notes: Note[], range: BeatRange): Note[] {
  return notes
    .filter((note) => note.start < range.end && note.start + note.duration > range.start)
    .filter((note) => !note.drum || note.start >= range.start)
    .map((note) => {
      const start = Math.max(note.start, range.start);
      return { ...note, start, duration: Math.min(note.start + note.duration, range.end) - start };
    })
    .sort((a, b) => a.start - b.start);
}
