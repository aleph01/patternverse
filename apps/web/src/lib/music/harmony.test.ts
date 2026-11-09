import { describe, expect, it } from 'vitest';
import { midiPitch, musicExamples } from './examples';
import {
  chordPalette,
  defaultSketch,
  parseSketch,
  scaleNotes,
  sketchExample,
  sketchPresets,
  type ScaleMode,
} from './harmony';

describe('key-relative chord sketches', () => {
  it('labels and spells the seven major-key triads', () => {
    const palette = chordPalette(0, 'major');
    expect(palette.map((chord) => chord.roman)).toEqual([
      'I',
      'ii',
      'iii',
      'IV',
      'V',
      'vi',
      'vii°',
    ]);
    expect(palette.map((chord) => chord.name)).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
    expect(palette[6].tones).toEqual(['B', 'D', 'F']);
    expect(chordPalette(7, 'major').map((chord) => chord.name)).toEqual([
      'G',
      'Am',
      'Bm',
      'C',
      'D',
      'Em',
      'F♯dim',
    ]);
  });
  it('uses explicit major-relative numerals for natural minor and preserves its minor v', () => {
    const palette = chordPalette(9, 'minor');
    expect(palette.map((chord) => chord.roman)).toEqual([
      'i',
      'ii°',
      '♭III',
      'iv',
      'v',
      '♭VI',
      '♭VII',
    ]);
    expect(palette.map((chord) => chord.name)).toEqual(['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']);
  });
  it('spells flat and sharp keys by scale letter, including enharmonic boundary notes', () => {
    expect(scaleNotes(1, 'major')).toEqual(['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C']);
    expect(scaleNotes(6, 'major')).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']);
    expect(scaleNotes(3, 'minor')).toEqual(['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'Db']);
    expect(scaleNotes(1, 'minor')).toEqual(['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B']);
  });
  it.each(['major', 'minor'] as ScaleMode[])(
    'transposes every chord and spells every sounding pitch correctly in all 12 %s keys',
    (mode) => {
      const reference = chordPalette(0, mode);
      for (let tonic = 0; tonic < 12; tonic += 1) {
        const palette = chordPalette(tonic, mode);
        for (const [i, chord] of palette.entries()) {
          expect(chord.roman).toBe(reference[i].roman);
          expect(chord.midi).toEqual(reference[i].midi.map((pitch) => pitch + tonic));
        }
        const score = sketchExample({
          version: 1,
          tonic,
          mode,
          cells: palette.map((chord) => ({ degree: chord.degree, beats: 4 })),
        });
        for (const note of score.notes) {
          expect(midiPitch(note.pitch.replaceAll('♭', 'b').replaceAll('♯', '#'))).toBe(note.midi);
        }
      }
    },
  );
  it('accounts for beat durations independently of bar boundaries', () => {
    const sketch = defaultSketch();
    sketch.cells = [
      { degree: 1, beats: 1 },
      { degree: 4, beats: 2 },
      { degree: 5, beats: 8 },
    ];
    const score = sketchExample(sketch);
    expect(score.beats).toBe(11);
    expect(score.harmony?.map((chord) => [chord.start, chord.duration])).toEqual([
      [0, 1],
      [1, 2],
      [3, 8],
    ]);
    expect(score.notes.map((note) => note.start)).toEqual([0, 0, 0, 1, 1, 1, 3, 3, 3]);
    expect(score.notes.at(-1)!.start + score.notes.at(-1)!.duration).toBe(11);
  });
  it('keeps the Porch Light presets consistent with the original course score', () => {
    for (const id of ['verse', 'chorus']) {
      const preset = sketchPresets.find((item) => item.id === id)!;
      const score = sketchExample(preset.sketch);
      expect(score.harmony?.map((chord) => chord.name)).toEqual(
        musicExamples.find((item) => item.id === id)!.chords,
      );
      expect(score.beats).toBe(32);
    }
  });
  it('only loads bounded supported sketches and discards unrecognized fields', () => {
    const valid = defaultSketch();
    expect(parseSketch(JSON.stringify({ ...valid, extra: '<script>' }))).toEqual(valid);
    for (const value of [
      null,
      {},
      { ...valid, version: 2 },
      { ...valid, tonic: 12 },
      { ...valid, tonic: 1.2 },
      { ...valid, mode: 'lydian' },
      { ...valid, cells: [] },
      { ...valid, cells: Array(17).fill(valid.cells[0]) },
      { ...valid, cells: [{ degree: 0, beats: 4 }] },
      { ...valid, cells: [{ degree: 1, beats: 0 }] },
      { ...valid, cells: [{ degree: 1, beats: '4' }] },
      { ...valid, cells: [null] },
    ]) {
      expect(parseSketch(JSON.stringify(value))).toBeUndefined();
    }
    expect(parseSketch('broken')).toBeUndefined();
  });
});
