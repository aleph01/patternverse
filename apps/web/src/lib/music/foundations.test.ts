import { describe, expect, it } from 'vitest';
import { exampleForChapter, midiPitch, musicExamples } from './examples';

const example = (id: string) => musicExamples.find((item) => item.id === id)!;

describe('Beginner foundation listening comparisons', () => {
  it('preserves both intervals when moving a motif, and changes them in the contrast', () => {
    const notes = example('foundation-intervals').notes;
    const gaps = (offset: number) => [
      notes[offset + 1].midi - notes[offset].midi,
      notes[offset + 2].midi - notes[offset + 1].midi,
    ];
    expect(gaps(0)).toEqual([3, 2]);
    expect(gaps(3)).toEqual(gaps(0));
    expect(gaps(6)).toEqual([2, 1]);
    expect(notes.map((note) => note.duration)).toEqual([1, 1, 2, 1, 1, 2, 1, 1, 2]);
  });

  it('moves the complete major scale without changing its step pattern or timing', () => {
    const notes = example('foundation-major-scales').notes;
    for (let index = 0; index < 8; index += 1) {
      expect(notes[index + 8].midi - notes[index].midi).toBe(2);
      expect(notes[index + 8].start - notes[index].start).toBe(8);
      expect(notes[index].duration).toBe(1);
      expect(notes[index + 8].duration).toBe(1);
    }
    expect(notes.slice(1, 8).map((note, index) => note.midi - notes[index].midi)).toEqual([
      2, 2, 1, 2, 2, 2, 1,
    ]);
  });

  it('changes only degrees three, six, and seven in the parallel natural-minor comparison', () => {
    const notes = example('foundation-scale-color').notes;
    expect(notes.slice(8).map((note, index) => note.midi - notes[index].midi)).toEqual([
      0, 0, -1, 0, 0, -1, -1, 0,
    ]);
  });

  it('keeps the opening fixed while changing both the bass reference and the final note', () => {
    const c = example('foundation-home-c');
    const a = example('foundation-home-a');
    const melody = (id: typeof c) => id.notes.filter((note) => note.part === 'melody');
    expect(melody(c).slice(0, 4)).toEqual(melody(a).slice(0, 4));
    for (const [item, home, bass] of [
      [c, 'C4', 'C3'],
      [a, 'A4', 'A2'],
    ] as const) {
      expect(melody(item).at(-1)).toMatchObject({ midi: midiPitch(home), start: 4, duration: 4 });
      expect(item.notes.filter((note) => note.part === 'bass')).toEqual([
        { pitch: bass, midi: midiPitch(bass), start: 0, duration: 8, part: 'bass' },
      ]);
    }
  });

  it('plays each triad separately and together, lowering only the third in the second half', () => {
    const notes = example('foundation-chord-notes').notes;
    const majors = notes.filter((note) => note.start < 8);
    const minors = notes.filter((note) => note.start >= 8);
    expect(majors.map((note) => note.midi)).toEqual([60, 64, 67, 60, 64, 67]);
    expect(minors.map((note) => note.midi)).toEqual([60, 63, 67, 60, 63, 67]);
    expect(majors.map((note) => [note.start, note.duration, note.part])).toEqual([
      [0, 1, 'melody'],
      [1, 1, 'melody'],
      [2, 1, 'melody'],
      [4, 4, 'chords'],
      [4, 4, 'chords'],
      [4, 4, 'chords'],
    ]);
    expect(minors.map((note) => [note.start - 8, note.duration, note.part])).toEqual(
      majors.map((note) => [note.start, note.duration, note.part]),
    );
  });

  it('opens each foundation article on its own playable comparison', () => {
    for (const [chapter, comparison] of [
      ['songwriting-pitch-and-intervals', 'foundation-intervals'],
      ['songwriting-build-a-scale', 'foundation-major-scales'],
      ['songwriting-scales-and-tonal-home', 'foundation-home-c'],
      ['songwriting-build-and-hear-chords', 'foundation-chord-notes'],
    ]) {
      expect(exampleForChapter(chapter)).toBe(comparison);
      expect(example(comparison)).toBeDefined();
    }
  });
});
