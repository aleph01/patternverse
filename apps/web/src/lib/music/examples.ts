import score from '../../../../../docs/songwriting-course/examples.json';

import type { MusicExample, Note, Part } from './model';
export type { MusicExample, Note, Part } from './model';

export function midiPitch(pitch: string): number {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(pitch);
  if (!match) throw new Error(`Invalid note: ${pitch}`);
  const semitones: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const semitone = semitones[match[1]]!;
  return (
    (Number(match[3]) + 1) * 12 + semitone + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0)
  );
}

export const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export const pitchLabel = (midi: number) =>
  `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][midi % 12]}${Math.floor(midi / 12) - 1}`;

function line(events: { pitch: string; duration: number }[], part: Part, start = 0): Note[] {
  let cursor = start;
  return events.flatMap(({ pitch, duration }) => {
    const beat = cursor;
    cursor += duration;
    return pitch === 'rest' ? [] : [{ pitch, midi: midiPitch(pitch), start: beat, duration, part }];
  });
}

const voicings: Record<string, string[]> = {
  C: ['C3', 'E3', 'G3'],
  Am: ['A2', 'C3', 'E3'],
  F: ['F3', 'A3', 'C4'],
  G: ['G3', 'B3', 'D4'],
  Dm: ['D3', 'F3', 'A3'],
};
const porch = score.porch_light;
function section(id: 'verse' | 'chorus' | 'bridge', description: string): MusicExample {
  const chords = porch[`${id}_chords`];
  return {
    id,
    title: `Porch Light · ${id}`,
    description,
    key: 'C major',
    tempo: porch.tempo,
    beatsPerBar: 4,
    beats: chords.length * 4,
    chords,
    harmony: chords.map((name, bar) => ({
      start: bar * 4,
      duration: 4,
      name,
      roman: ({ C: 'I', Am: 'vi', F: 'IV', G: 'V', Dm: 'ii' } as Record<string, string>)[name],
    })),
    notes: [
      ...porch[`${id}_melody`].flatMap((bar, i) => line(bar, 'melody', i * 4)),
      ...chords.flatMap((chord, i) =>
        voicings[chord].map((pitch) => ({
          pitch,
          midi: midiPitch(pitch),
          start: i * 4,
          duration: 4,
          part: 'chords' as const,
        })),
      ),
    ].sort((a, b) => a.start - b.start),
  };
}

export const musicExamples: MusicExample[] = [
  {
    id: 'seed',
    title: 'Porch Light · three-note seed',
    description: 'E rises to G, then A lasts twice as long. Listen for the open ending.',
    key: 'C major',
    tempo: porch.tempo,
    beatsPerBar: 4,
    beats: 4,
    notes: line(porch.seed, 'melody'),
    chords: [],
  },
  section(
    'verse',
    'Compare the steady quarter-note melody with one sustained chord per bar. The chord voicings are a simple listening arrangement.',
  ),
  section(
    'chorus',
    'Longer notes give the opening room; shorter notes later bring movement. Switch the chords off to hear the melody alone.',
  ),
  section(
    'bridge',
    'Eighth notes create a compact contrast to the longer chorus notes. Slow the tempo to follow each event.',
  ),
  {
    id: 'bass',
    title: 'Platform Three · bass groove',
    description:
      'A one-bar loop: D, a long rest, a short A, then another rest. Silence is part of the groove.',
    key: 'D Dorian',
    tempo: score.platform_three.tempo,
    beatsPerBar: 4,
    beats: 4,
    notes: line(score.platform_three.bass, 'bass'),
    chords: [],
  },
  {
    id: 'foundation-intervals',
    title: 'Melodic distances · preserve or change',
    description:
      'Three four-beat phrases: E–G–A, A–C–D, then A–B–C. The first two preserve distances of 3 then 2 semitones; the last keeps only the rising direction.',
    key: 'Interval comparison',
    tempo: 84,
    beatsPerBar: 4,
    beats: 12,
    notes: line(
      ['E4', 'G4', 'A4', 'A4', 'C5', 'D5', 'A4', 'B4', 'C5'].map((pitch, index) => ({
        pitch,
        duration: index % 3 === 2 ? 2 : 1,
      })),
      'melody',
    ),
    chords: [],
  },
  {
    id: 'foundation-major-scales',
    title: 'Major scale · same shape on C and D',
    description:
      'Eight one-beat notes in C major, then eight in D major. Every note moves up 2 semitones; the whole- and half-step shape stays the same.',
    key: 'C major / D major',
    tempo: 84,
    beatsPerBar: 4,
    beats: 16,
    notes: line(
      [
        'C4',
        'D4',
        'E4',
        'F4',
        'G4',
        'A4',
        'B4',
        'C5',
        'D4',
        'E4',
        'F#4',
        'G4',
        'A4',
        'B4',
        'C#5',
        'D5',
      ].map((pitch) => ({ pitch, duration: 1 })),
      'melody',
    ),
    chords: [],
  },
  {
    id: 'foundation-scale-color',
    title: 'Scale color · C major and C natural minor',
    description:
      'The same starting pitch, rhythm, and ascending direction. Natural minor lowers E, A, and B to E-flat, A-flat, and B-flat.',
    key: 'C major / C natural minor',
    tempo: 84,
    beatsPerBar: 4,
    beats: 16,
    notes: line(
      [
        'C4',
        'D4',
        'E4',
        'F4',
        'G4',
        'A4',
        'B4',
        'C5',
        'C4',
        'D4',
        'Eb4',
        'F4',
        'G4',
        'Ab4',
        'Bb4',
        'C5',
      ].map((pitch) => ({ pitch, duration: 1 })),
      'melody',
    ),
    chords: [],
  },
  ...(['C', 'A'] as const).map((home): MusicExample => ({
    id: `foundation-home-${home.toLowerCase()}`,
    title: `Tonal home · settle on ${home}`,
    description: `The opening E–G–A–G stays fixed. A sustained ${home} bass and a four-beat ${home} ending establish the reference. Mute Bass to hear the phrase alone.`,
    key: home === 'C' ? 'C-centered' : 'A-centered',
    tempo: 84,
    beatsPerBar: 4,
    beats: 8,
    notes: [
      ...line(
        [
          ...['E4', 'G4', 'A4', 'G4'].map((pitch) => ({ pitch, duration: 1 })),
          { pitch: `${home}4`, duration: 4 },
        ],
        'melody',
      ),
      ...line([{ pitch: home === 'C' ? 'C3' : 'A2', duration: 8 }], 'bass'),
    ].sort((a, b) => a.start - b.start),
    chords: [],
  })),
  {
    id: 'foundation-chord-notes',
    title: 'Chord notes · C major and C minor',
    description:
      'C–E–G one note at a time, one beat of space, then together for four beats. Repeat with E-flat: only the third changes.',
    key: 'C major / C minor triads',
    tempo: 84,
    beatsPerBar: 4,
    beats: 16,
    notes: ['E4', 'Eb4']
      .flatMap((third, index) => {
        const pitches = ['C4', third, 'G4'];
        const start = index * 8;
        return [
          ...line(
            [...pitches.map((pitch) => ({ pitch, duration: 1 })), { pitch: 'rest', duration: 1 }],
            'melody',
            start,
          ),
          ...pitches.map((pitch): Note => ({
            pitch,
            midi: midiPitch(pitch),
            start: start + 4,
            duration: 4,
            part: 'chords',
          })),
        ];
      })
      .sort((a, b) => a.start - b.start),
    chords: ['C', 'Cm'],
    harmony: [
      { start: 4, duration: 4, roman: '', name: 'C' },
      { start: 12, duration: 4, roman: '', name: 'Cm' },
    ],
  },
];

const chapterExamples: Record<string, string> = {
  'songwriting-course': 'seed',
  'songwriting-example-songbook': 'verse',
  'songwriting-what-makes-a-song': 'seed',
  'songwriting-start-with-a-motif': 'seed',
  'songwriting-pulse-and-tempo': 'seed',
  'songwriting-melody-and-harmony': 'verse',
  'songwriting-make-the-chorus-arrive': 'chorus',
  'songwriting-earn-the-bridge': 'bridge',
  'songwriting-write-a-bass-line': 'bass',
  'songwriting-interlock-the-groove': 'bass',
  'songwriting-syncopation-and-anticipation': 'syncopation',
  'songwriting-swing-and-timing': 'swing',
  'songwriting-develop-without-losing-the-idea': 'sequence',
  'songwriting-pitch-and-intervals': 'foundation-intervals',
  'songwriting-build-a-scale': 'foundation-major-scales',
  'songwriting-scales-and-tonal-home': 'foundation-home-c',
  'songwriting-build-and-hear-chords': 'foundation-chord-notes',
  'songwriting-choose-a-song-form': 'form-layered-entry',
  'songwriting-shape-energy-over-time': 'form-layered-entry',
};
export const exampleForChapter = (id: string): string | undefined => chapterExamples[id];
