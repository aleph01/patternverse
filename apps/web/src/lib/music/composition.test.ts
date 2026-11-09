import { describe, expect, it } from 'vitest';
import { compositionExamples } from './composition-examples';
import { tracksFor, withVariant, type MusicExample } from './model';
import { clockFor, measuresFor, positionLabel } from './timing';
import { scoreVoices, splitRhythm } from './score';

const example = (id: string) => compositionExamples.find((e) => e.id === id)!;
describe('musical time across views', () => {
  const mixed: MusicExample = {
    ...example('sequence'),
    beats: 12,
    tempos: [
      { beat: 0, bpm: 120 },
      { beat: 4, bpm: 60 },
    ],
    meters: [
      { beat: 0, numerator: 3, denominator: 4 },
      { beat: 6, numerator: 6, denominator: 8 },
    ],
  };
  it('retains meter changes and uses denominator beats in the readout', () => {
    expect(measuresFor(mixed).map((m) => [m.start, m.end, m.numerator, m.denominator])).toEqual([
      [0, 3, 3, 4],
      [3, 6, 3, 4],
      [6, 9, 6, 8],
      [9, 12, 6, 8],
    ]);
    expect(positionLabel(mixed, 6.5)).toBe('Bar 3 · beat 2.0');
  });
  it('integrates tempo changes and repeats the complete tempo map when looping', () => {
    const clock = clockFor(mixed);
    expect(clock.seconds(4)).toBe(2);
    expect(clock.seconds(8)).toBe(6);
    expect(clock.seconds(12)).toBe(10);
    expect(clock.seconds(16)).toBe(12);
    for (const beat of [0, 0.5, 3.7, 4, 6, 11, 12, 17, 24])
      expect(clock.beat(clock.seconds(beat))).toBeCloseTo(beat);
    expect(clockFor(mixed, mixed.tempo * 2).seconds(8)).toBe(3);
  });
});
describe('composition comparisons and score rhythms', () => {
  it('moves only the kick in the syncopation pair and preserves the authored reference', () => {
    const source = example('syncopation'),
      a = withVariant(source, 'a'),
      b = withVariant(source, 'b');
    expect(a.notes.filter((n) => n.part === 'hat')).toEqual(
      b.notes.filter((n) => n.part === 'hat'),
    );
    expect(a.notes.filter((n) => n.part === 'kick').map((n) => n.start)).toEqual([0, 2, 4, 6]);
    expect(b.notes.filter((n) => n.part === 'kick').map((n) => n.start)).toEqual([0, 2.5, 4, 6.5]);
    expect(source.notes).toEqual(b.notes);
  });
  it('keeps three-against-two exact in playback and in written tuplet values', () => {
    const source = example('polyrhythm');
    const upper = tracksFor(source).find((t) => t.id === 'upper')!;
    const events = scoreVoices(source, upper, measuresFor(source)[0])[0];
    expect(events).toHaveLength(6);
    expect(events.reduce((n, e) => n + e.duration, 0)).toBeCloseTo(4);
    expect(events.flatMap(splitRhythm).every((p) => p.triplet && p.value === 'q')).toBe(true);
    expect(
      source.notes
        .filter((n) => n.part === 'upper')
        .map((n) => n.start)
        .slice(0, 3),
    ).toEqual([0, 2 / 3, 4 / 3]);
  });
  it('writes a tied note crossing a barline and fills counted rests', () => {
    const source: MusicExample = {
      ...example('sequence'),
      notes: [{ pitch: 'C4', midi: 60, start: 3, duration: 2, part: 'lead' }],
    };
    const track = tracksFor(source)[0],
      bars = measuresFor(source);
    expect(scoreVoices(source, track, bars[0])[0]).toEqual([
      { start: 0, duration: 3, pitches: [] },
      { start: 3, duration: 1, pitches: ['C4'], tieFrom: false, tieTo: true },
    ]);
    expect(scoreVoices(source, track, bars[1])[0][0].tieFrom).toBe(true);
    const pieces = splitRhythm({ start: 0, duration: 2.5, pitches: ['C4'] });
    expect(pieces.map((p) => [p.duration, p.tieFrom, p.tieTo])).toEqual([
      [2, false, true],
      [0.5, true, false],
    ]);
  });
  it('separates overlapping unequal note lengths instead of silently collapsing them into a chord', () => {
    const source: MusicExample = {
      ...example('sequence'),
      notes: [
        { pitch: 'C4', midi: 60, start: 0, duration: 4, part: 'lead' },
        { pitch: 'E4', midi: 64, start: 1, duration: 1, part: 'lead' },
      ],
    };
    expect(scoreVoices(source, tracksFor(source)[0], measuresFor(source)[0])).toHaveLength(2);
  });
});
