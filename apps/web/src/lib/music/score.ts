import type { MusicExample, MusicTrack, Note } from './model';
import type { Measure } from './timing';

export type ScoreEvent = {
  start: number;
  duration: number;
  pitches: string[];
  tieFrom?: boolean;
  tieTo?: boolean;
};
const EPS = 0.002;

/** Score rhythms are a view of the data, never a destructive quantization of playback. */
export function scoreVoices(
  example: MusicExample,
  track: MusicTrack,
  bar: Measure,
): ScoreEvent[][] {
  const source = example.notes
    .filter((n) => n.part === track.id)
    .map((n) => ({ ...n, duration: n.writtenDuration ?? n.duration }))
    .filter((n) => n.start < bar.end - EPS && n.start + n.duration > bar.start + EPS);
  const thirds =
    !track.drum &&
    source.some((n) => Math.abs(n.start * 4 - Math.round(n.start * 4)) > 0.01) &&
    source.every(
      (n) =>
        Math.abs(n.start * 3 - Math.round(n.start * 3)) < 0.02 &&
        Math.abs((n.start + n.duration) * 3 - Math.round((n.start + n.duration) * 3)) < 0.02,
    );
  const resolution = track.drum ? 24 : thirds ? 3 : 8;
  const quantize = (value: number) => Math.round(value * resolution) / resolution;
  const groups: { start: number; end: number; notes: Note[] }[] = [];
  for (const note of source) {
    const start = quantize(Math.max(bar.start, note.start)),
      end = quantize(Math.min(bar.end, note.start + note.duration));
    const group = groups.find((g) => g.start === start && g.end === end);
    if (group) group.notes.push(note);
    else groups.push({ start, end, notes: [note] });
  }
  groups.sort((a, b) => a.start - b.start || b.end - a.end);
  if (track.drum) {
    // Drum sounds decay independently of their written rhythmic value.
    const starts = [...new Set(groups.map((g) => g.start))];
    const triplet = starts.some((start) => Math.abs(start * 2 - Math.round(start * 2)) > EPS);
    const value = triplet ? 2 / 3 : 0.5;
    return [
      fillRests(
        starts.map((start) => ({
          start,
          duration: Math.min(
            value,
            (starts[starts.indexOf(start) + 1] ?? bar.end) - start,
            bar.end - start,
          ),
          pitches: [track.drum === 'hat' ? 'G5' : track.drum === 'snare' ? 'C5' : 'F4'],
        })),
        bar,
      ),
    ];
  }
  const voices: ScoreEvent[][] = [];
  for (const group of groups) {
    if (group.end <= group.start) continue;
    let voice = voices.find((v) => v.at(-1)!.start + v.at(-1)!.duration <= group.start + EPS);
    if (!voice) {
      voice = [];
      voices.push(voice);
    }
    voice.push({
      start: group.start,
      duration: group.end - group.start,
      pitches: group.notes.map((n) => n.pitch),
      tieFrom: group.notes.some((n) => n.start < bar.start - EPS),
      tieTo: group.notes.some((n) => n.start + n.duration > bar.end + EPS),
    });
  }
  if (voices.length > 4)
    throw new Error(
      'This part needs more than four written voices. Use the piano roll or isolate a simpler part.',
    );
  return (voices.length ? voices : [[]]).map((voice) => fillRests(voice, bar));
}
function fillRests(events: ScoreEvent[], bar: Measure) {
  const result: ScoreEvent[] = [];
  let cursor = bar.start;
  for (const event of events) {
    if (event.start > cursor + EPS)
      result.push({ start: cursor, duration: event.start - cursor, pitches: [] });
    result.push(event);
    cursor = event.start + event.duration;
  }
  if (cursor < bar.end - EPS)
    result.push({ start: cursor, duration: bar.end - cursor, pitches: [] });
  return result;
}

export type ScorePiece = ScoreEvent & { value: string; dots: number; triplet: boolean };
const lengths = [
  { duration: 4, value: 'w', dots: 0 },
  { duration: 3, value: 'h', dots: 1 },
  { duration: 2, value: 'h', dots: 0 },
  { duration: 1.5, value: 'q', dots: 1 },
  { duration: 1, value: 'q', dots: 0 },
  { duration: 0.75, value: '8', dots: 1 },
  { duration: 0.5, value: '8', dots: 0 },
  { duration: 0.375, value: '16', dots: 1 },
  { duration: 0.25, value: '16', dots: 0 },
  { duration: 0.125, value: '32', dots: 0 },
];

export function splitRhythm(event: ScoreEvent): ScorePiece[] {
  const result: ScorePiece[] = [];
  let remaining = event.duration,
    start = event.start;
  // Triplet values retain their exact musical duration rather than becoming dotted notes.
  if (Math.abs(remaining - 2 / 3) < EPS || Math.abs(remaining - 1 / 3) < EPS)
    return [{ ...event, value: remaining > 0.5 ? 'q' : '8', dots: 0, triplet: true }];
  while (remaining > 0.03) {
    const value = lengths.find((item) => item.duration <= remaining + EPS);
    if (!value)
      throw new Error(
        'This rhythm needs a finer written subdivision. Use the piano roll to follow its exact timing.',
      );
    result.push({
      ...event,
      start,
      duration: value.duration,
      value: value.value,
      dots: value.dots,
      triplet: false,
      tieFrom: event.tieFrom || result.length > 0,
      tieTo: event.tieTo || remaining - value.duration > EPS,
    });
    remaining -= value.duration;
    start += value.duration;
  }
  return result;
}
