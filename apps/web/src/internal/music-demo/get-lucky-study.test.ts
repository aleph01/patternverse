import { describe, expect, it } from 'vitest';
import { getLuckyStudy } from './get-lucky-study';
import { displayChords } from '../../lib/music/chord-display';
import type { MusicExample } from '../../lib/music/model';
import { repertoireCatalog } from './catalog';
const entry = repertoireCatalog.find((e) => e.id === 'daft-get-lucky')!;
const source: MusicExample = {
  id: 'source',
  title: 'Private fixture',
  description: '',
  key: 'C major',
  tempo: 116.05,
  beats: 84,
  beatsPerBar: 4,
  chords: [],
  tracks: entry.parts.map((p) => ({ id: p.source, label: p.label })),
  notes: [
    ...Array.from({ length: 8 }, (_, i) =>
      [
        [47, 50, 54],
        [50, 54, 57],
        [54, 57, 61],
        [52, 56, 59],
      ][i % 4].map((midi) => ({
        midi,
        pitch:
          ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][midi % 12] +
          (Math.floor(midi / 12) - 1),
        start: 4 + i * 4,
        duration: 8,
        part: 'midi-29',
      })),
    ).flat(),
    { midi: 36, pitch: 'C2', start: 4, duration: 0.1, part: 'midi-18-drum-36', drum: 'kick' },
    { midi: 42, pitch: 'F#2', start: 4.27, duration: 0.1, part: 'midi-18-drum-42', drum: 'hat' },
  ],
};
describe('Get Lucky official opening study', () => {
  it('bounds the passage and keeps chord identity free of reference-pedal tails', () => {
    const study = getLuckyStudy(source);
    expect(study.beats).toBe(32);
    expect(study.sections?.map((s) => [s.start, s.end])).toEqual([
      [0, 16],
      [16, 32],
    ]);
    expect(study.notes.every((n) => n.start >= 0 && n.start + n.duration <= 32)).toBe(true);
    expect(displayChords(study).map((c) => c.name)).toEqual([
      'Bm',
      'D',
      'F♯m',
      'E',
      'Bm',
      'D',
      'F♯m',
      'E',
    ]);
    expect(study.notes.filter((n) => n.drum)).toHaveLength(1);
    expect(study.defaultPlayback).toBe('midi');
    expect(study.recording).toBeUndefined();
    expect(study.notices?.join(' ')).toContain('Eight-bar');
  });
});
