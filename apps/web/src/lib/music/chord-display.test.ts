import { describe, expect, it } from 'vitest';
import { chordStudies } from '../../internal/music-demo/chord-studies';
import { chordTimelineMinimum, displayChords } from './chord-display';
import type { Harmony, MusicExample } from './model';

const score = (harmony: Harmony[]): MusicExample => ({
  id: 'legacy',
  title: 'Legacy',
  description: '',
  key: 'C major',
  tempo: 100,
  beatsPerBar: 4,
  beats: 16,
  chords: [],
  notes: [],
  harmony,
});

describe('shared chord display model', () => {
  it('uses actual unequal durations, with a readable minimum for the entire time axis', () => {
    const chords = displayChords(chordStudies[0]);
    expect(chords.map((c) => [c.roman, c.start, c.duration])).toEqual([
      ['I', 0, 1],
      ['V', 1, 2],
      ['vi', 3, 4],
      ['IV', 7, 1],
    ]);
    expect(chordTimelineMinimum(chords, 0, 8)).toBe(800);
    expect(chordTimelineMinimum(chords, 4, 8)).toBe(400);
    expect(chordTimelineMinimum([], 0, 8)).toBe(0);
  });
  it('retains root identity while deriving slash chords and figures from the actual bass', () => {
    const chords = displayChords(chordStudies[1]);
    expect(chords.map((c) => [c.roman, c.romanLabel, c.name, c.bass, c.inversion])).toEqual([
      ['V', 'V', 'G', 'G', 0],
      ['V', 'V⁶', 'G/B', 'B', 1],
      ['I', 'I⁶₄', 'C/G', 'G', 2],
    ]);
    expect(chords[1].layers).toEqual([
      { kind: 'base', label: 'Base triad', notes: ['G', 'B', 'D'] },
    ]);
  });
  it('keeps the triad, major seventh and ninth as separate layers of equal-duration chords', () => {
    const chords = displayChords(chordStudies[2]);
    expect(chords.map((c) => c.name)).toEqual(['C', 'Cmaj7', 'Cmaj9']);
    expect(chords.map((c) => c.duration)).toEqual([4, 4, 4]);
    expect(chords[2].layers).toEqual([
      { kind: 'base', label: 'Base triad', notes: ['C', 'E', 'G'] },
      { kind: 'seventh', label: 'Major seventh', notes: ['B'] },
      { kind: 'ninth', label: 'Added ninth', notes: ['D'] },
    ]);
  });
  it('never adds a seventh to add9, and distinguishes dominant from major sevenths', () => {
    const [add, major, dominant] = displayChords(chordStudies[3]);
    expect(add.name).toBe('Cadd9');
    expect(add.romanLabel).toBe('I(add9)');
    expect(add.layers.map((l) => l.kind)).toEqual(['base', 'ninth']);
    expect(major.layers.find((l) => l.kind === 'seventh')?.notes).toEqual(['B']);
    expect(dominant.name).toBe('C7');
    expect(dominant.layers.find((l) => l.kind === 'seventh')).toEqual({
      kind: 'seventh',
      label: 'Minor seventh',
      notes: ['B♭'],
    });
  });
  it('fills missing or unusable durations from the next onset and the end of the passage', () => {
    const chords = displayChords(
      score([
        { start: 8, roman: 'vi', name: 'Am', duration: Number.NaN },
        { start: 0, roman: 'I', name: 'C' },
        { start: 4, roman: 'V', name: 'G', duration: 0 },
      ]),
    );
    expect(chords.map((c) => [c.start, c.duration])).toEqual([
      [0, 4],
      [4, 4],
      [8, 8],
    ]);
    expect(chords[0].source).toBe('symbol');
  });
  it.each(['C', 'Cmaj7', 'C7', 'Cadd9', 'Cmaj9', 'G/B'])(
    'preserves legacy %s labels without notes',
    (name) => {
      const [chord] = displayChords(
        score([{ start: 0, duration: 4, name, roman: name === 'G/B' ? 'V' : 'I' }]),
      );
      expect(chord.name).toBe(name);
      expect(chord.layers.some((l) => l.kind === 'seventh')).toBe(
        ['Cmaj7', 'C7', 'Cmaj9'].includes(name),
      );
    },
  );
  it('uses an explicitly scoped MIDI part and separate bass, ignoring melody and drums', () => {
    const example = structuredClone(chordStudies[1]);
    example.notes = example.notes.map((n) => ({ ...n, part: 'piano-1' }));
    example.notes.push(
      { pitch: 'C1', midi: 24, start: 0, duration: 4, part: 'melody' },
      { pitch: 'C1', midi: 24, start: 0, duration: 4, part: 'kick', drum: 'kick' },
      { pitch: 'B1', midi: 35, start: 0, duration: 4, part: 'bass' },
    );
    example.harmony![0].parts = ['piano-1', 'bass', 'kick'];
    expect(displayChords(example)[0]).toMatchObject({
      name: 'G/B',
      bass: 'B',
      romanLabel: 'V⁶',
      source: 'notes',
    });
  });
  it('handles seventh-chord inversions without relabeling the root or secondary target', () => {
    const [chord] = displayChords(score([{ start: 0, name: 'G7/B', roman: 'V7/V' }]));
    expect(chord).toMatchObject({ roman: 'V/V', romanLabel: 'V⁶₅/V', name: 'G7/B', bass: 'B' });
  });
  it('does not guess harmony for unannotated MIDI or invent unsupported chord stacks', () => {
    expect(displayChords({ ...chordStudies[0], harmony: undefined })).toEqual([]);
    const [chord] = displayChords(score([{ start: 0, name: 'Csus4', roman: 'I' }]));
    expect(chord.layers).toEqual([]);
    expect(chord.name).toBe('Csus4');
  });
});
