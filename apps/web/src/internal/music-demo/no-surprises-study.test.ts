import { describe, expect, it } from 'vitest';
import { noSurprisesStudy } from './no-surprises-study';
import { displayChords } from '../../lib/music/chord-display';
import { clockFor, measuresFor } from '../../lib/music/timing';
import type { Note } from '../../lib/music/model';
const n = (pitch: string, midi: number, start: number, duration: number, track: number): Note => ({
  pitch,
  midi,
  start,
  duration,
  part: `source-${track}`,
});
const figure = (start: number) => [
  n('A5', 81, start, 1, 1),
  n('F5', 77, start + 1, 1, 1),
  n('C5', 72, start + 0.5, 1, 4),
];
const source: Parameters<typeof noSurprisesStudy>[0] = {
  notes: [
    n('F2', 41, 4, 2, 6),
    ...figure(4),
    n('C5', 72, 9.5, 2.5, 4),
    n('A#2', 46, 10, 0.75, 6),
    n('A#4', 70, 10, 0.5, 1),
    n('C#5', 73, 10.5, 0.5, 1),
    n('F5', 77, 11, 0.5, 1),
    n('G5', 79, 11.5, 0.5, 1),
    n('G2', 43, 11.5, 0.5, 6),
    n('G2', 43, 56, 1, 5),
    n('C4', 60, 56, 1, 5),
    n('E4', 64, 56, 1, 5),
    n('C3', 48, 56, 1.5, 6),
    n('F3', 53, 156, 6, 6),
    ...figure(156),
    n('E3', 52, 162, 2, 6),
    ...figure(162),
    n('D3', 50, 164, 8, 6),
    ...figure(164),
    n('A#3', 58, 164, 6, 9),
    ...figure(276),
    n('F2', 41, 284, 4, 6),
    ...figure(284),
    n('C2', 36, 35.75, 0.125, 11),
    n('C2', 36, 121 + 2 / 3, 0.125, 11),
    n('F2', 41, 36, 0.125, 11),
    n('A5', 81, 4, 2, 2),
    n('F2', 41, 4, 2, 7),
    n('A4', 69, 35.5, 1, 14),
    n('A4', 69, 35.5, 1, 13),
  ],
  tempos: [
    { beat: 0, bpm: 73 },
    { beat: 268, bpm: 73 },
    { beat: 280, bpm: 65 },
    { beat: 284, bpm: 50 },
  ],
  markers: [
    [4, 'from OK Computer'],
    [36, 'Verse 1'],
    [68, 'Verse 2'],
    [100, 'Pre-Chorus'],
    [116, 'Chorus'],
    [156, 'Bridge'],
    [172, 'Chorus'],
    [204, 'Interlude'],
    [228, 'Pre-Chorus'],
    [244, 'Chorus'],
    [268, 'Outro'],
  ].map(([beat, label]) => ({ beat: Number(beat), label: String(label) })),
};
describe('No Surprises full MIDI study', () => {
  it('uses the source section markers, trims the silent count-in and preserves its complete ending', () => {
    const study = noSurprisesStudy(source);
    expect(study.sections?.map((s) => s.label)).toEqual([
      'Intro',
      'Verse 1',
      'Verse 2',
      'Pre-chorus 1',
      'Chorus 1',
      'Bridge',
      'Chorus 2',
      'Interlude',
      'Pre-chorus 2',
      'Chorus 3',
      'Outro',
    ]);
    expect(study.sections?.map((s) => [s.start, s.end])).toEqual([
      [0, 32],
      [32, 64],
      [64, 96],
      [96, 112],
      [112, 152],
      [152, 168],
      [168, 200],
      [200, 224],
      [224, 240],
      [240, 264],
      [264, 284],
    ]);
    expect(measuresFor(study)).toHaveLength(71);
    expect(study.harmony).toHaveLength(62);
    expect(
      study.harmony?.every(
        (h, i) =>
          h.duration! > 0 && h.start + h.duration! === (study.harmony?.[i + 1]?.start ?? 284),
      ),
    ).toBe(true);
    expect(study.notes.find((n) => n.start === 280 && n.part === 'bass')?.duration).toBe(4);
    expect(study.tempos?.at(-1)).toEqual({ beat: 280, bpm: 50 });
    expect(clockFor(study).seconds(284) - clockFor(study).seconds(280)).toBeCloseTo(4.8);
    expect(study.defaultPlayback).toBe('midi');
    expect(study.recording).toBeUndefined();
  });
  it('reads the borrowed arpeggio without inventing passing-note extensions or bass inversions', () => {
    const chords = displayChords(noSurprisesStudy(source));
    const borrowed = chords.find((c) => c.start === 6)!;
    expect(borrowed.name).toBe('B♭m');
    expect(borrowed.roman).toBe('iv');
    expect(borrowed.layers.flatMap((l) => l.notes)).toEqual(['B♭', 'D♭', 'F']);
    expect(borrowed.functionLabel).toBe('Borrowed subdominant');
    expect(chords.find((c) => c.start === 52)?.name).toBe('C'); // Bass C, despite the guitar's lower G.
    expect(chords.find((c) => c.start === 272)?.name).toBe('F'); // A begins the arpeggio; no bass is sounding.
    expect(chords.find((c) => c.start === 272)?.bass).toBeUndefined();
  });
  it('derives the bridge bass, seventh and ninth from the actual selected voices', () => {
    const chords = displayChords(noSurprisesStudy(source));
    expect(chords.find((c) => c.start === 158)).toMatchObject({
      name: 'Fmaj7/E',
      roman: 'I',
      bass: 'E',
      inversion: 3,
    });
    const ninth = chords.find((c) => c.start === 160)!;
    expect(ninth).toMatchObject({ name: 'B♭maj9/D', roman: 'IV', bass: 'D', inversion: 1 });
    expect(ninth.layers.find((l) => l.kind === 'seventh')?.notes).toEqual(['A']);
    expect(ninth.layers.find((l) => l.kind === 'ninth')?.notes).toEqual(['C']);
  });
  it('retains melody pickups and exact drum timing while omitting doubled parts and tom fills', () => {
    const study = noSurprisesStudy(source);
    expect(study.notes.find((n) => n.part === 'melody')).toMatchObject({ start: 31.5, midi: 69 });
    expect(study.notes.filter((n) => n.drum).map((n) => n.start)).toEqual([31.75, 117 + 2 / 3]);
    expect(study.notes.filter((n) => n.midi === 81 && n.start === 0)).toHaveLength(1);
    expect(study.notes.some((n) => n.part.startsWith('source-'))).toBe(false);
  });
});
