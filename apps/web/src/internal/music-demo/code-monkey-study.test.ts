import { describe, expect, it } from 'vitest';
import { codeMonkeyStudy } from './code-monkey-study';
import { displayChords } from '../../lib/music/chord-display';
import { clockFor } from '../../lib/music/timing';

describe('Code Monkey real-recording study', () => {
  const study = codeMonkeyStudy([]);
  it('maps the released recording onto the independently checked performance grid', () => {
    expect(study.defaultPlayback).toBe('recording');
    expect(study.recording?.offsetSeconds).toBeCloseTo(0.283625);
    expect(study.sections).toHaveLength(12);
    const clock = clockFor(study);
    for (const [label, seconds] of [
      ['Verse 1', 0],
      ['Pre-chorus 1', 24],
      ['Chorus 1', 36],
      ['Verse 2', 60],
      ['Bridge', 108],
      ['Verse 3', 126],
      ['Chorus 3', 162],
      ['Outro', 174],
    ] as const) {
      const section = study.sections!.find((s) => s.label === label)!;
      expect(clock.seconds(section.start)).toBe(seconds);
    }
    expect(clock.seconds(study.beats) + study.recording!.offsetSeconds!).toBeLessThan(189.3094);
  });
  it('preserves a descending bass without changing the tonic identity', () => {
    const chords = displayChords(study).filter((c) => c.start >= 96 && c.start < 112);
    expect(chords.map((c) => c.roman)).toEqual(['I', 'I', 'I', 'I']);
    expect(chords.map((c) => c.bass)).toEqual(['E', 'D♯', 'C♯', 'B']);
    expect(chords[1].name).toBe('Emaj7/D♯');
    expect(chords[2].name).toBe('E6/C♯');
    expect(chords[2].position).toBe('Added sixth in bass');
    expect(chords[3].inversion).toBe(2);
  });
  it('retains the artist-chart secondary dominant and borrowed bridge harmony', () => {
    const chords = displayChords(study);
    const applied = chords.find((c) => c.start === 72)!;
    expect(applied.roman).toBe('V/vi');
    expect(applied.functionLabel).toBe('Secondary dominant');
    expect(applied.layers.find((l) => l.kind === 'base')?.notes).toContain('B♯');
    expect(chords.find((c) => c.start === 288)?.roman).toBe('♭VII');
    expect(chords.find((c) => c.start === 296)?.roman).toBe('iv');
  });
  it('has complete harmonic coverage, bounded notes, and no public audio asset', () => {
    for (let i = 0; i < study.harmony!.length; i++) {
      const c = study.harmony![i],
        next = study.harmony![i + 1];
      expect(c.start + c.duration!).toBe(next?.start ?? study.beats);
    }
    expect(
      study.notes.every(
        (n) => n.start >= 0 && n.duration > 0 && n.start + n.duration <= study.beats,
      ),
    ).toBe(true);
    expect(study.recording?.src).toBe('/song-studies/code-monkey.mp3');
    expect(study.source?.label).toContain('local noncommercial');
  });
});
