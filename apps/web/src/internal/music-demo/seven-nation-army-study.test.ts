import { describe, expect, it } from 'vitest';
import { sevenNationArmyStudy } from './seven-nation-army-study';
import { displayChords } from '../../lib/music/chord-display';
import { clockFor, measuresFor } from '../../lib/music/timing';
import type { Note } from '../../lib/music/model';
const note = (midi: number, pitch: string, start: number, duration: number, track = 2): Note => ({
  midi,
  pitch,
  start,
  duration,
  part: `source-${track}`,
});
const source = [
  note(40, 'E2', 0, 1.5, 10),
  note(43, 'G2', 2, 0.25, 10),
  note(36, 'C2', 16, 1, 12),
  note(41, 'F2', 16, 1, 12),
  note(44, 'G#2', 16, 1, 12),
  note(43, 'G2', 96, 4),
  note(50, 'D3', 96, 4),
  note(40, 'E2', 100, 4),
  note(45, 'A2', 100, 4),
  note(61, 'C#4', 102.5, 1.5),
  note(52, 'E3', 104, 1.5),
  note(59, 'B3', 104, 1.5),
  note(64, 'E4', 104, 1.5),
  note(45, 'A2', 109.9375, 0.06),
  note(64, 'E4', 248, 1.5, 7),
  note(52, 'E3', 448, 4),
  note(59, 'B3', 448, 4),
  note(64, 'E4', 448, 4),
  note(68, 'G#4', 448, 4),
];
describe('full-song MIDI study', () => {
  it('covers the entire arrangement with contiguous sections and a matching musical clock', () => {
    const study = sevenNationArmyStudy(source);
    expect(study.sections).toHaveLength(8);
    expect(study.sections?.map((s) => [s.start, s.end])).toEqual([
      [0, 32],
      [32, 96],
      [96, 144],
      [144, 160],
      [160, 240],
      [240, 320],
      [320, 408],
      [408, 452],
    ]);
    expect(measuresFor(study)).toHaveLength(113);
    expect(clockFor(study).seconds(study.beats)).toBe(226);
    expect(study.defaultPlayback).toBe('midi');
    expect(study.recording).toBeUndefined();
  });
  it('distinguishes a tonal centre from sounding chords and keeps A rooted on A over E bass', () => {
    const chords = displayChords(sevenNationArmyStudy(source));
    const centre = chords.find((c) => c.start === 0)!;
    expect(centre.kind).toBe('tonal-centre');
    expect(centre.layers).toEqual([]);
    expect(centre.bass).toBeUndefined();
    expect(centre.roman).toBe('i');
    const power = chords.find((c) => c.start === 104)!;
    expect(power.name).toBe('E5');
    expect(power.layers.flatMap((l) => l.notes)).toEqual(['E', 'B']);
    const inversion = chords.find((c) => c.start === 102.5)!;
    expect(inversion.name).toBe('A/E');
    expect(inversion.roman).toBe('IV');
    expect(inversion.inversion).toBe(2);
    expect(chords.find((c) => c.start === 448)?.name).toBe('E');
    expect(chords.find((c) => c.start === 448)?.roman).toBe('I');
    expect(chords.some((c) => c.start === 109.9375)).toBe(false);
  });
  it('retains source pitch/timing, leaves grace notes audible, and maps only the basic kit', () => {
    const study = sevenNationArmyStudy(source);
    expect(study.notes.find((n) => n.start === 109.9375)?.duration).toBe(0.06);
    expect(study.notes.find((n) => n.start === 248)).toMatchObject({
      part: 'lead',
      midi: 64,
      duration: 1.5,
    });
    expect(study.notes.filter((n) => n.drum).map((n) => n.drum)).toEqual(['kick', 'hat']);
    expect(study.notes.some((n) => n.midi === 41)).toBe(false);
    expect(
      study.harmony!.every((h) => h.start >= 0 && h.duration! > 0 && h.start + h.duration! <= 452),
    ).toBe(true);
  });
});
