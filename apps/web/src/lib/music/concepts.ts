import type { MusicExample, Note } from './model';
import type { MusicLessonId } from './lesson-pilot';

export type MusicConcept = {
  kind: 'intervals' | 'borrowing' | 'syncopation';
  category: 'Musical foundation' | 'Composition pattern';
  title: string;
  idea: string;
  vocabulary: string;
  takeaway: string;
  options: { label: string; explanation: string; example: MusicExample }[];
};
const note = (midi: number, pitch: string, start: number, duration = 0.8): Note => ({
  midi,
  pitch,
  start,
  duration,
  part: 'melody',
  velocity: 0.75,
});
const example = (id: string, notes: Note[], beats = 4): MusicExample => ({
  id,
  title: 'Original concept sketch',
  description: 'A short original comparison.',
  key: '',
  tempo: 84,
  beatsPerBar: 4,
  beats,
  notes,
  chords: [],
  tracks: [{ id: 'melody', label: 'Piano', instrument: 'piano' }],
  source: { label: 'Original course sketch' },
});
const groove = (shifted: boolean): MusicExample => ({
  ...example(`concept-beat-${shifted}`, []),
  notes: [
    ...Array.from({ length: 8 }, (_, i) => ({
      ...note(42, 'F#2', i / 2, 0.1),
      part: 'hat',
      drum: 'hat' as const,
      velocity: 0.4,
    })),
    ...[1, 3].map((start) => ({
      ...note(38, 'D2', start, 0.1),
      part: 'snare',
      drum: 'snare' as const,
    })),
    ...[0, shifted ? 2.5 : 2].map((start) => ({
      ...note(36, 'C2', start, 0.1),
      part: 'kick',
      drum: 'kick' as const,
    })),
  ],
  tracks: [
    { id: 'hat', label: 'Hi-hat', drum: 'hat' },
    { id: 'snare', label: 'Snare', drum: 'snare' },
    { id: 'kick', label: 'Kick', drum: 'kick' },
  ],
});
export const musicConcepts: Record<MusicLessonId, MusicConcept> = {
  'songwriting-pitch-and-intervals': {
    kind: 'intervals',
    category: 'Musical foundation',
    title: 'An interval is the space between two notes',
    idea: 'A melody has a shape: it can rise, fall or stay still. It also has distances. Two phrases can both rise while taking different-sized steps.',
    vocabulary:
      'A semitone is one adjacent keyboard step. Two semitones make a whole tone. The vertical gaps below show pitch distance; the notes sound one after another.',
    takeaway:
      'Intervals are the vocabulary. Keeping every interval while moving a phrase is transposition; changing an interval is a way to reshape the melody.',
    options: [
      {
        label: 'Starting phrase',
        explanation: 'C → D → E rises by two semitones, then two. The two gaps are equal.',
        example: example('concept-interval-start', [
          note(60, 'C4', 0),
          note(62, 'D4', 1),
          note(64, 'E4', 2, 1.5),
        ]),
      },
      {
        label: 'Move it higher',
        explanation:
          'D → E → F♯ starts higher, but still rises by two semitones, then two. The distances stay the same.',
        example: example('concept-interval-moved', [
          note(62, 'D4', 0),
          note(64, 'E4', 1),
          note(66, 'F#4', 2, 1.5),
        ]),
      },
      {
        label: 'Change one distance',
        explanation:
          'C → D → F still rises, but the second gap is now three semitones. The contour is similar; the intervals differ.',
        example: example('concept-interval-changed', [
          note(60, 'C4', 0),
          note(62, 'D4', 1),
          note(65, 'F4', 2, 1.5),
        ]),
      },
    ],
  },
  'songwriting-borrow-a-chord': {
    kind: 'borrowing',
    category: 'Composition pattern',
    title: 'Borrow a chord to change the colour',
    idea: 'A key gives you a familiar set of notes and chords. You can briefly use a chord from the parallel minor key—the minor key with the same home note—while keeping that home in place.',
    vocabulary:
      'In F major, B♭ major uses B♭–D–F. F minor offers B♭ minor: B♭–D♭–F. Only the middle note changes in this comparison. The notes sound together as a chord.',
    takeaway:
      'Try a borrowed chord where a familiar progression needs a different shade. Borrowing one chord does not by itself establish a new key.',
    options: [
      {
        label: 'B♭ major · in the key',
        explanation:
          'B♭–D–F belongs to F major. Its root-to-middle-note distance is four semitones: a major third.',
        example: example('concept-major-chord', [
          note(58, 'Bb3', 0, 3),
          note(62, 'D4', 0, 3),
          note(65, 'F4', 0, 3),
        ]),
      },
      {
        label: 'B♭ minor · borrowed',
        explanation:
          'Lower D to D♭. B♭ and F stay fixed. The three-semitone minor third changes the chord’s colour.',
        example: example('concept-minor-chord', [
          note(58, 'Bb3', 0, 3),
          note(61, 'Db4', 0, 3),
          note(65, 'F4', 0, 3),
        ]),
      },
    ],
  },
  'songwriting-syncopation-and-anticipation': {
    kind: 'syncopation',
    category: 'Composition pattern',
    title: 'Place an entrance against a steady beat',
    idea: 'A steady pulse tells you where the beats are. A note or drum hit can arrive between those beats and draw attention to the gap. That relationship creates syncopation.',
    vocabulary:
      'Count “1 and 2 and 3 and 4 and”. Here, only the second kick moves from 3 to the “and” after 3. The hi-hat and snare keep the same timing.',
    takeaway:
      'Keep a clear reference, then move one entrance. Listen to the changed relationship before adding more notes or drum hits.',
    options: [
      {
        label: 'Kick on the beat',
        explanation: 'The kick lands on 1 and 3. Its second hit lines up with the steady pulse.',
        example: groove(false),
      },
      {
        label: 'Kick between beats',
        explanation: 'The second kick lands on “3 and”. The beat has not moved; one drum hit has.',
        example: groove(true),
      },
    ],
  },
};
