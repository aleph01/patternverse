import type { MusicExample, MusicRecording } from './model';
import { clockFor } from './timing';

/** Bidirectional, recording-specific timing. MIDI tempo and notes remain unchanged. */
export function recordingClock(example: MusicExample, recording: MusicRecording) {
  const score = clockFor(example);
  const offset = Number.isFinite(recording.offsetSeconds)
    ? Math.max(0, recording.offsetSeconds!)
    : 0;
  const anchors = recording.alignment;
  if (!anchors?.length)
    return {
      seconds: (beat: number) => offset + score.seconds(beat),
      beat: (seconds: number) => score.beat(Math.max(0, seconds - offset)),
    };
  if (
    anchors.length < 2 ||
    anchors[0].beat !== 0 ||
    anchors.at(-1)!.beat !== example.beats ||
    anchors.some(
      (a, i) =>
        !Number.isFinite(a.beat) ||
        !Number.isFinite(a.seconds) ||
        a.beat < 0 ||
        a.seconds < 0 ||
        (i > 0 && (a.beat <= anchors[i - 1].beat || a.seconds <= anchors[i - 1].seconds)),
    )
  )
    throw new Error('Recording timing anchors must increase and cover the complete song.');
  const points = anchors.map((a) => ({ ...a, score: score.seconds(a.beat) }));
  return {
    seconds(beat: number) {
      beat = Math.max(0, Math.min(example.beats, beat));
      const i = Math.min(
        points.length - 2,
        points.findLastIndex((a) => a.beat <= beat),
      );
      const a = points[i],
        b = points[i + 1];
      return (
        a.seconds +
        ((score.seconds(beat) - a.score) / (b.score - a.score)) * (b.seconds - a.seconds)
      );
    },
    beat(seconds: number) {
      seconds = Math.max(points[0].seconds, Math.min(points.at(-1)!.seconds, seconds));
      const i = Math.min(
        points.length - 2,
        points.findLastIndex((a) => a.seconds <= seconds),
      );
      const a = points[i],
        b = points[i + 1];
      return score.beat(
        a.score + ((seconds - a.seconds) / (b.seconds - a.seconds)) * (b.score - a.score),
      );
    },
  };
}
