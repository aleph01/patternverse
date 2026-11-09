import { midiPitch, type MusicExample } from './examples';

export type ScaleMode = 'major' | 'minor';
export type ChordCell = { degree: number; beats: number };
export type ChordSketch = { version: 1; tonic: number; mode: ScaleMode; cells: ChordCell[] };
export const SKETCH_STORAGE_KEY = 'patternverse:chord-sketch:v1';
export const MAX_CHORDS = 16;
export const durations = [1, 2, 4, 8] as const;
const tonics = {
  major: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  minor: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
};
const intervals = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const numerals = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  minor: ['i', 'ii°', '♭III', 'iv', 'v', '♭VI', '♭VII'],
};
const qualities = {
  major: ['', 'm', 'm', '', '', 'm', 'dim'],
  minor: ['m', 'dim', '', 'm', 'm', '', ''],
};
export const displayAccidentals = (name: string) => name.replaceAll('b', '♭').replaceAll('#', '♯');
export const tonicName = (tonic: number, mode: ScaleMode) =>
  displayAccidentals(tonics[mode][tonic]);

/** Spell by scale letter as well as pitch class: F-sharp major needs E-sharp, not F. */
export function scaleNotes(tonic: number, mode: ScaleMode): string[] {
  const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const naturals = [0, 2, 4, 5, 7, 9, 11];
  const first = letters.indexOf(tonics[mode][tonic][0]);
  return intervals[mode].map((offset, degree) => {
    const letter = (first + degree) % 7;
    let accidental = (((tonic + offset - naturals[letter]) % 12) + 12) % 12;
    if (accidental > 6) accidental -= 12;
    return letters[letter] + (accidental > 0 ? '#'.repeat(accidental) : 'b'.repeat(-accidental));
  });
}

export function chordPalette(tonic: number, mode: ScaleMode) {
  const scale = scaleNotes(tonic, mode);
  return scale.map((root, i) => ({
    degree: i + 1,
    roman: numerals[mode][i],
    name: displayAccidentals(root + qualities[mode][i]),
    tones: [scale[i], scale[(i + 2) % 7], scale[(i + 4) % 7]].map(displayAccidentals),
    midi: [0, 2, 4].map((third) => {
      const degree = i + third;
      return 48 + tonic + intervals[mode][degree % 7] + Math.floor(degree / 7) * 12;
    }),
  }));
}

export const defaultSketch = (): ChordSketch => ({
  version: 1,
  tonic: 0,
  mode: 'major',
  cells: [1, 4, 5, 1].map((degree) => ({ degree, beats: 4 })),
});
export const cloneSketch = (sketch: ChordSketch): ChordSketch => ({
  ...sketch,
  cells: sketch.cells.map((cell) => ({ ...cell })),
});

/** Treat browser storage/imports as data; only bounded, supported scores can load. */
export function parseSketch(input: string): ChordSketch | undefined {
  try {
    const value = JSON.parse(input);
    if (
      !value ||
      value.version !== 1 ||
      !Number.isInteger(value.tonic) ||
      value.tonic < 0 ||
      value.tonic > 11 ||
      !['major', 'minor'].includes(value.mode) ||
      !Array.isArray(value.cells) ||
      value.cells.length < 1 ||
      value.cells.length > MAX_CHORDS
    )
      return;
    if (
      !value.cells.every(
        (cell: ChordCell) =>
          cell &&
          Number.isInteger(cell.degree) &&
          cell.degree >= 1 &&
          cell.degree <= 7 &&
          durations.some((duration) => duration === cell.beats),
      )
    )
      return;
    return {
      version: 1,
      tonic: value.tonic,
      mode: value.mode,
      cells: value.cells.map((cell: ChordCell) => ({ degree: cell.degree, beats: cell.beats })),
    };
  } catch {
    return;
  }
}

export function sketchExample(sketch: ChordSketch): MusicExample {
  const palette = chordPalette(sketch.tonic, sketch.mode);
  let start = 0;
  const notes = sketch.cells.flatMap((cell) => {
    const chord = palette[cell.degree - 1];
    const onset = start;
    start += cell.beats;
    return chord.midi.map((midi, i) => {
      const spelling = chord.tones[i].replaceAll('♭', 'b').replaceAll('♯', '#');
      // Derive the octave from the spelled pitch (e.g. B-sharp crosses C).
      const octave = 4 + (midi - midiPitch(`${spelling}4`)) / 12;
      return {
        pitch: `${chord.tones[i]}${octave}`,
        midi,
        start: onset,
        duration: cell.beats,
        part: 'chords' as const,
      };
    });
  });
  return {
    id: 'chord-sketch',
    title: 'Your chord progression',
    key: `${tonicName(sketch.tonic, sketch.mode)} ${sketch.mode === 'major' ? 'major' : 'natural minor'}`,
    description:
      'Listen to the relationships you arranged above. Change the tempo, loop the sketch, or follow the notes as they sound.',
    tempo: 84,
    beatsPerBar: 4,
    beats: start,
    notes,
    chords: [],
    harmony: sketch.cells.map((cell, i) => ({
      start: sketch.cells.slice(0, i).reduce((sum, previous) => sum + previous.beats, 0),
      duration: cell.beats,
      roman: palette[cell.degree - 1].roman,
      name: palette[cell.degree - 1].name,
    })),
  };
}

export const sketchPresets = [
  { id: 'home', title: 'I–IV–V–I · home and return', sketch: defaultSketch() },
  {
    id: 'verse',
    title: 'Porch Light · verse',
    sketch: {
      version: 1,
      tonic: 0,
      mode: 'major',
      cells: [1, 1, 6, 6, 4, 4, 5, 5].map((degree) => ({ degree, beats: 4 })),
    } as ChordSketch,
  },
  {
    id: 'chorus',
    title: 'Porch Light · chorus',
    sketch: {
      version: 1,
      tonic: 0,
      mode: 'major',
      cells: [4, 5, 1, 6, 4, 5, 1, 1].map((degree) => ({ degree, beats: 4 })),
    } as ChordSketch,
  },
  {
    id: 'minor',
    title: 'i–♭VI–♭III–♭VII · minor loop',
    sketch: {
      version: 1,
      tonic: 9,
      mode: 'minor',
      cells: [1, 6, 3, 7].map((degree) => ({ degree, beats: 4 })),
    } as ChordSketch,
  },
];
