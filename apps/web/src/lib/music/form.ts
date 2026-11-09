import { tracksFor, type MusicExample } from './model';
import { measuresFor } from './timing';

/** Use the transport's quarter-note coordinates for the complete passage, independent of paging. */
export function formSections(example: MusicExample) {
  return (example.sections ?? [])
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end))
    .map((s) => ({ ...s, start: Math.max(0, s.start), end: Math.min(example.beats, s.end) }))
    .filter((s) => s.start < s.end)
    .sort((a, b) => a.start - b.start);
}

export function formLayers(example: MusicExample) {
  const tracks = tracksFor(example);
  const meters = [
    { beat: 0, numerator: example.beatsPerBar, denominator: example.beatUnit ?? 4 },
    ...(example.meters ?? []),
  ].sort((a, b) => a.beat - b.beat);
  const drumIds = new Set([
    ...tracks.filter((track) => track.drum).map((track) => track.id),
    ...example.notes.filter((note) => note.drum).map((note) => note.part),
  ]);
  const firstDrum = tracks.find((track) => drumIds.has(track.id))?.id;
  return tracks
    .filter((track) => !drumIds.has(track.id) || track.id === firstDrum)
    .map((track) => {
      const combinedDrums = drumIds.has(track.id);
      const notes = example.notes
        .filter(
          (n) => (combinedDrums ? drumIds.has(n.part) : n.part === track.id) && n.duration > 0,
        )
        .map((n) => ({
          start: Math.max(0, n.start),
          end: Math.min(example.beats, n.start + n.duration),
        }))
        .filter((n) => n.start < n.end)
        .sort((a, b) => a.start - b.start);
      const spans: { start: number; end: number }[] = [];
      for (const note of notes) {
        const last = spans.at(-1);
        const meter = last ? meters.findLast((m) => m.beat <= last.end + 1e-7)! : meters[0];
        const barBeats = (meter.numerator * 4) / meter.denominator;
        // Show passages of instrumental presence, bridging note articulation and short rhythmic rests.
        // A break of a full bar or longer still separates blocks; playback notes remain untouched.
        if (last && note.start - last.end < barBeats - 1e-7)
          last.end = Math.max(last.end, note.end);
        else spans.push({ ...note });
      }
      return {
        id: track.id,
        label: combinedDrums ? 'Drums' : track.label,
        parts: combinedDrums ? [...drumIds] : [track.id],
        spans,
      };
    });
}

/** Observable note activity, deliberately not a loudness, intensity or emotion estimate. */
export function formActivity(example: MusicExample) {
  return measuresFor(example).map((bar) => ({
    ...bar,
    count: example.notes.filter((n) => n.start >= bar.start && n.start < bar.end).length,
  }));
}
