import type { MusicExample, Note } from './model';
import { midiPitch } from './examples';
import { formExample } from './form-examples';

const note = (pitch: string, start: number, duration: number, part: string): Note => ({
  pitch,
  midi: midiPitch(pitch),
  start,
  duration,
  part,
});
const drums = (shift: boolean, swing = false): Note[] =>
  Array.from({ length: 2 }, (_, bar) => [
    ...[0, shift ? 2.5 : 2].map((t) => ({
      ...note('C2', bar * 4 + t, 0.18, 'kick'),
      drum: 'kick' as const,
      velocity: 0.85,
    })),
    ...[1, 3].map((t) => ({
      ...note('D2', bar * 4 + t, 0.18, 'snare'),
      drum: 'snare' as const,
      velocity: 0.7,
    })),
    ...Array.from({ length: 8 }, (_, i) => ({
      ...note(
        'F#2',
        bar * 4 + Math.floor(i / 2) + (i % 2 ? (swing ? 2 / 3 : 0.5) : 0),
        0.08,
        'hat',
      ),
      drum: 'hat' as const,
      velocity: i % 2 ? 0.45 : 0.6,
    })),
  ])
    .flat()
    .sort((a, b) => a.start - b.start);
const tracks = [
  { id: 'kick', label: 'Kick', drum: 'kick' as const },
  { id: 'snare', label: 'Snare', drum: 'snare' as const },
  { id: 'hat', label: 'Hi-hat', drum: 'hat' as const },
];
const source = { label: 'Original teaching example' };
const pulse = (three: boolean): Note[] =>
  Array.from({ length: 4 }, (_, cycle) => [
    ...[0, 1].map((t) => ({ ...note('C2', cycle * 2 + t, 0.1, 'lower'), drum: 'kick' as const })),
    ...Array.from({ length: three ? 3 : 2 }, (_, i) => ({
      ...note('F#2', cycle * 2 + (i * 2) / (three ? 3 : 2), 0.08, 'upper'),
      drum: 'hat' as const,
    })),
  ])
    .flat()
    .sort((a, b) => a.start - b.start);
const phrase = (sequence: boolean) =>
  [
    ...[0, 1].flatMap((bar) =>
      (bar && sequence ? ['D4', 'F4', 'A4'] : ['C4', 'E4', 'G4']).map((p, i) =>
        note(p, bar * 4 + i, i === 2 ? 2 : 1, 'lead'),
      ),
    ),
    ...[0, 1].flatMap((bar) =>
      (bar && sequence ? ['D3', 'F3', 'A3'] : ['C3', 'E3', 'G3']).map((p) =>
        note(p, bar * 4, 4, 'accompaniment'),
      ),
    ),
  ].sort((a, b) => a.start - b.start);

export const compositionExamples: MusicExample[] = [
  {
    id: 'syncopation',
    title: 'Syncopation · make the beat lean forward',
    description: 'Move the kick from beat 3 to the and after 3. The hi-hat keeps your place.',
    key: 'Percussion',
    tempo: 96,
    beatsPerBar: 4,
    beats: 8,
    chords: [],
    notes: drums(true),
    tracks,
    defaultView: 'grid',
    source,
    variants: [
      {
        id: 'a',
        label: 'On the beat',
        description: 'The kick lands on beats 1 and 3. Listen to the steady reference.',
        notes: drums(false),
      },
      {
        id: 'b',
        label: 'Syncopated',
        description: 'The kick moves from beat 3 to the and after 3. The other parts stay fixed.',
        notes: drums(true),
      },
    ],
  },
  {
    id: 'swing',
    title: 'Swing · change the space between hits',
    description:
      'Compare straight eighths with an illustrative long–short pair. This ratio is one example, not a rule for every swing performance.',
    key: 'Percussion',
    tempo: 96,
    beatsPerBar: 4,
    beats: 8,
    chords: [],
    notes: drums(false, true),
    tracks,
    defaultView: 'grid',
    source,
    variants: [
      {
        id: 'a',
        label: 'Straight',
        description: 'The hi-hat divides each beat evenly.',
        notes: drums(false),
      },
      {
        id: 'b',
        label: 'Long–short',
        description: 'The second hi-hat comes later, while the quarter-note reference stays fixed.',
        notes: drums(false, true),
      },
    ],
  },
  {
    id: 'polyrhythm',
    title: 'Polyrhythm · let two rhythms meet',
    description:
      'Three evenly spaced hits against two. Listen for the shared return every two beats.',
    key: 'Two percussion parts',
    tempo: 88,
    beatsPerBar: 4,
    beats: 8,
    chords: [],
    notes: pulse(true),
    tracks: [
      { id: 'lower', label: 'Lower pulse', drum: 'kick' },
      { id: 'upper', label: 'Upper pulse', drum: 'hat' },
    ],
    defaultView: 'grid',
    source,
    variants: [
      {
        id: 'a',
        label: 'Two with two',
        description: 'Both parts divide the same cycle into two.',
        notes: pulse(false),
      },
      {
        id: 'b',
        label: 'Three with two',
        description: 'The upper part divides each two-beat cycle into three. Both return together.',
        notes: pulse(true),
      },
    ],
  },
  {
    id: 'sequence',
    title: 'Sequence · move an idea, keep its rhythm',
    description: 'C–E–G becomes D–F–A in bar 2. Its rhythm stays the same.',
    key: 'C-major notes',
    tempo: 84,
    beatsPerBar: 4,
    beats: 8,
    chords: [],
    notes: phrase(true),
    tracks: [
      { id: 'lead', label: 'Melody', instrument: 'piano' },
      { id: 'accompaniment', label: 'Chords', instrument: 'guitar' },
    ],
    source,
    variants: [
      {
        id: 'a',
        label: 'Repeat',
        description: 'The same C–E–G idea returns in bar 2.',
        notes: phrase(false),
      },
      {
        id: 'b',
        label: 'Sequence',
        description: 'The second bar moves through the scale: C–E–G becomes D–F–A.',
        notes: phrase(true),
      },
    ],
  },
  formExample,
];
