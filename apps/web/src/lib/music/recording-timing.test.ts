import { describe, expect, it } from 'vitest';
import { recordingClock } from './recording-timing';
import { songStudy } from './song-study';
import type { MusicRecording } from './model';
import { clockFor } from './timing';

const example = { ...songStudy, beats: 12, tempo: 120, tempos: [{ beat: 4, bpm: 60 }] };
const recording: MusicRecording = {
  src: 'https://www.youtube.com/watch?v=7TDeBi34OtE',
  label: 'Test',
  alignment: [
    { beat: 0, seconds: 2 },
    { beat: 8, seconds: 20 },
    { beat: 12, seconds: 26 },
  ],
};
describe('recording-specific time alignment', () => {
  it('preserves the legacy tempo map and intro offset when no anchors exist', () => {
    const clock = recordingClock(example, { src: 'song.mp3', label: 'Legacy', offsetSeconds: 3 });
    expect(clock.seconds(6)).toBe(7);
    expect(clock.beat(7)).toBe(6);
    expect(clock.beat(1)).toBe(0);
  });
  it('hits every anchor and respects tempo changes between them, in both directions', () => {
    const clock = recordingClock(example, recording);
    for (const a of recording.alignment!) {
      expect(clock.seconds(a.beat)).toBeCloseTo(a.seconds);
      expect(clock.beat(a.seconds)).toBeCloseTo(a.beat);
    }
    expect(clock.seconds(4)).toBe(8);
    expect(clock.seconds(6)).toBe(14);
    expect(clock.seconds(10)).toBe(23);
    for (let beat = 0; beat <= 12; beat += 0.125)
      expect(clock.beat(clock.seconds(beat))).toBeCloseTo(beat);
    expect(clockFor(example).seconds(12)).toBe(10);
  });
  it('clamps pre-roll and tail positions, and gives anchor timestamps precedence over legacy offset', () => {
    const clock = recordingClock(example, { ...recording, offsetSeconds: 80 });
    expect(clock.beat(0)).toBe(0);
    expect(clock.beat(100)).toBe(12);
    expect(clock.seconds(-5)).toBe(2);
    expect(clock.seconds(50)).toBe(26);
  });
  it('rejects partial, nonfinite, reversed and repeated anchor maps', () => {
    for (const alignment of [
      [{ beat: 0, seconds: 0 }],
      [
        { beat: 1, seconds: 0 },
        { beat: 12, seconds: 5 },
      ],
      [
        { beat: 0, seconds: 0 },
        { beat: 11, seconds: 5 },
      ],
      [
        { beat: 0, seconds: 0 },
        { beat: 12, seconds: NaN },
      ],
      [
        { beat: 0, seconds: 0 },
        { beat: 8, seconds: 5 },
        { beat: 12, seconds: 5 },
      ],
      [
        { beat: 0, seconds: 0 },
        { beat: 8, seconds: 10 },
        { beat: 7, seconds: 15 },
        { beat: 12, seconds: 20 },
      ],
    ])
      expect(() => recordingClock(example, { ...recording, alignment })).toThrow('timing anchors');
  });
});
