import type { MusicExample, Note } from './model';

export const musicLessonIds = [
  'songwriting-pitch-and-intervals',
  'songwriting-borrow-a-chord',
  'songwriting-syncopation-and-anticipation',
] as const;
export type MusicLessonId = (typeof musicLessonIds)[number];
export type GuidedMusicLesson = {
  articleId: MusicLessonId;
  title: string;
  introduction: string;
  steps: {
    id: 'listen' | 'isolate' | 'notice' | 'try';
    label: string;
    instruction: string;
    listenFor: string;
    example: MusicExample;
  }[];
  transfer: string;
  sourceNote: string;
  references: { label: string; url: string }[];
};

const pitch = (midi: number) =>
  `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][midi % 12]}${Math.floor(midi / 12) - 1}`;
const transpose = (notes: Note[], distance: number): Note[] =>
  notes.map((note) => ({
    ...note,
    midi: note.midi + distance,
    pitch: pitch(note.midi + distance),
  }));

/** A selected voice keeps the source timing and tempo map; no silent quantization. */
function select(example: MusicExample, id: string, title: string, parts: string[]): MusicExample {
  return {
    ...example,
    id,
    title,
    description: `${title}. The audible parts are preselected for this listening step.`,
    notes: example.notes.filter((note) => parts.includes(note.part)),
    tracks: example.tracks?.filter((track) => parts.includes(track.id)),
    variants: undefined,
  };
}

function firstTwoBars(example: MusicExample, id: string, title: string): MusicExample {
  return {
    ...example,
    id,
    title,
    description:
      'The first two bars of the selected reduction. Follow the listening cue above; playback keeps the source timing.',
    beats: 8,
    notes: example.notes
      .filter((note) => note.start < 8)
      .map((note) => ({
        ...note,
        duration: Math.min(note.duration, 8 - note.start),
        ...(note.writtenDuration !== undefined
          ? { writtenDuration: Math.min(note.writtenDuration, 8 - note.start) }
          : {}),
      })),
    tempos: example.tempos?.filter((event) => event.beat < 8),
    meters: example.meters?.filter((event) => event.beat < 8),
    notices: [
      ...(example.notices ?? []),
      'This step uses the first two bars of the selected source excerpt.',
    ],
  };
}

export function createIntervalLesson(source: MusicExample): GuidedMusicLesson {
  const melody = select(source, 'lean-melody', 'Lean on Me · melody alone', ['melody']);
  const close = firstTwoBars(melody, 'lean-steps', 'Hear the size of each step');
  const higher = transpose(close.notes, 2);
  const wider = close.notes.map((note) =>
    note.midi === 65 ? { ...note, midi: 66, pitch: 'F#4' } : note,
  );
  const variations: MusicExample = {
    ...close,
    id: 'lean-transposition',
    title: 'Preserve or change the distances',
    key: 'C / D · teaching variations',
    source: { label: 'Teaching variations of the local melody reduction' },
    variants: [
      {
        id: 'a',
        label: 'C: source distances',
        description: 'The C-major source melody, without accompaniment.',
        notes: close.notes,
      },
      {
        id: 'b',
        label: 'D: same distances',
        description:
          'Every note moves up two semitones. Timing and all distances between notes stay the same.',
        notes: higher,
      },
      {
        id: 'c',
        label: 'C: wider step',
        description:
          'Each F becomes F♯. The upward/downward shape stays recognizable, but E–F becomes the larger E–F♯ step.',
        notes: wider,
      },
    ],
    notices: [
      'Versions B and C are authored teaching transformations, not performances by Bill Withers. The accompaniment is omitted so it does not need a separate transposition.',
    ],
  };
  return {
    articleId: 'songwriting-pitch-and-intervals',
    title: 'Lean on Me · preserve the melodic distances',
    introduction:
      'A short piano reduction lets you follow the melody independently of the singer’s delivery. Compare the spaces between notes before naming the intervals.',
    steps: [
      {
        id: 'listen',
        label: 'Listen',
        instruction:
          'Play the four-bar passage with both parts. Follow the upper melody as it climbs and returns.',
        listenFor:
          'Repeated notes can stay put while the phrase continues. The next distinct pitches rise C–D–E–F.',
        example: {
          ...source,
          description:
            'A four-bar source reduction with the parts preselected for this listening step.',
        },
      },
      {
        id: 'isolate',
        label: 'Isolate',
        instruction:
          'Play the same passage with the accompaniment removed. Hum the melody’s shape.',
        listenFor:
          'C–D and D–E span two semitones each. E–F spans one. “Up by a step” does not specify those distances.',
        example: melody,
      },
      {
        id: 'notice',
        label: 'Notice',
        instruction:
          'Loop the first two bars. Watch E4 and F4 in the piano roll, or switch to notation.',
        listenFor:
          'There is no keyboard pitch between E and F. Count every adjacent pitch, including white-key neighbours.',
        example: close,
      },
      {
        id: 'try',
        label: 'Try',
        instruction:
          'Compare A with B, then C. Try predicting which version preserves the melodic distances before playing it.',
        listenFor:
          'B starts higher and keeps every interval. C keeps the broad contour while changing the size of a step.',
        example: variations,
      },
    ],
    transfer:
      'Move a short melody of your own to a new starting note. Keep its rhythm and semitone distances first; then change one distance deliberately.',
    sourceNote:
      'MIDI DB provider arrangement, demo bars 6–9, in C major. The melody’s sax-program track is rendered on sampled piano. The licensed score preview supports the C-major, 4/4 setting and stepwise material; the provider’s timing and accompaniment are retained. This is a teaching reduction, not the original audio.',
    references: [
      {
        label: 'Licensed score preview · Musicnotes MN0072685',
        url: 'https://www.musicnotes.com/sheetmusic/bill-withers/lean-on-me/MN0072685',
      },
      {
        label: 'MIDI source · MIDI DB',
        url: 'https://www.mididb.com/bill-withers/lean-on-me-midi/',
      },
      {
        label: 'Bill Withers · official audio',
        url: 'https://www.youtube.com/watch?v=gOZgo8gMIoM',
      },
    ],
  };
}

function chordFrame(minor: boolean): Note[] {
  return [0, 4, 8].flatMap((start) => {
    const tones =
      start === 4
        ? [
            [46, 'Bb2', 'bass'],
            [53, 'F3', 'accompaniment'],
            [58, 'Bb3', 'accompaniment'],
            [minor ? 61 : 62, minor ? 'Db4' : 'D4', 'melody'],
          ]
        : [
            [41, 'F2', 'bass'],
            [53, 'F3', 'accompaniment'],
            [60, 'C4', 'accompaniment'],
            [69, 'A4', 'melody'],
          ];
    return tones.map(([midi, pitch, part]) => ({
      midi: midi as number,
      pitch: pitch as string,
      part: part as string,
      start,
      duration: 4,
      velocity: 0.65,
    }));
  });
}

export function createBorrowingLesson(source: MusicExample): GuidedMusicLesson {
  const close = firstTwoBars(source, 'surprises-two-bars', 'No Surprises · one opening cycle');
  const outline = select(close, 'surprises-outline', 'Upper figure and bass', ['melody', 'bass']);
  const diatonic = close.notes.map((note) =>
    note.midi === 73 ? { ...note, midi: 74, pitch: 'D5' } : note,
  );
  const harmony = (minor: boolean) => [
    { start: 0, duration: 4, roman: 'I', name: 'F' },
    { start: 4, duration: 4, roman: minor ? 'iv' : 'IV', name: minor ? 'B♭m' : 'B♭' },
    { start: 8, duration: 4, roman: 'I', name: 'F' },
  ];
  const frame: MusicExample = {
    id: 'borrow-third',
    title: 'Change the third of the chord',
    description: 'An original F–B♭–F comparison isolates the changed chord tone.',
    key: 'F major',
    tempo: 84,
    beatsPerBar: 4,
    beats: 12,
    notes: chordFrame(true),
    chords: [],
    tracks: [
      { id: 'melody', label: 'Third of the chord', instrument: 'piano' },
      { id: 'accompaniment', label: 'Other chord tones', instrument: 'piano' },
      { id: 'bass', label: 'Bass', instrument: 'piano' },
    ],
    source: { label: 'Original chord comparison · F–B♭–F / F–B♭m–F' },
    variants: [
      {
        id: 'a',
        label: 'IV: B♭ major',
        description: 'The middle chord has D natural. Bass, other notes and timing are fixed.',
        notes: chordFrame(false),
        harmony: harmony(false),
      },
      {
        id: 'b',
        label: 'iv: B♭ minor',
        description: 'Only D lowers to D♭ in the middle chord. F and B♭ stay fixed.',
        notes: chordFrame(true),
        harmony: harmony(true),
      },
    ],
    notices: [
      'This deliberately spaced chord frame is original course music. It is not a transcription of Radiohead’s arrangement.',
    ],
  };
  const variations: MusicExample = {
    ...close,
    id: 'borrow-in-context',
    title: 'Try the changed third in the phrase',
    variants: [
      {
        id: 'a',
        label: 'D: diatonic alternative',
        description:
          'Our alternative raises the source D♭ to D. Every other note, entrance and duration stays fixed.',
        notes: diatonic,
      },
      {
        id: 'b',
        label: 'D♭: borrowed colour',
        description: 'The local source version keeps D♭ in the B♭–D♭–F figure.',
        notes: close.notes,
      },
    ],
    notices: [
      ...(close.notices ?? []),
      'Version A is an authored major-IV alternative. Version B retains the selected community arrangement. This comparison is not two Radiohead recordings.',
    ],
  };
  return {
    articleId: 'songwriting-borrow-a-chord',
    title: 'No Surprises · hear the borrowed third',
    introduction:
      'Keep F as home. A single D♭ in the B♭-minor figure supplies colour outside the F-major scale.',
    steps: [
      {
        id: 'listen',
        label: 'Listen',
        instruction:
          'Play the four-bar reduction and hear the opening figure repeat. Notice where its bright major colour turns.',
        listenFor: 'The B♭–D♭–F figure introduces the minor iv colour within the F-major setting.',
        example: {
          ...source,
          description:
            'A four-bar source reduction with the parts preselected for this listening step.',
        },
      },
      {
        id: 'isolate',
        label: 'Isolate',
        instruction:
          'Hear one cycle with the middle voice removed. Follow the upper figure against the bass.',
        listenFor:
          'B♭ in the bass establishes the chord’s root. The upper D♭ gives it a minor third.',
        example: outline,
      },
      {
        id: 'notice',
        label: 'Notice',
        instruction:
          'Compare the two deliberately spaced chord frames. Listen to the middle chord; all other notes and durations stay fixed.',
        listenFor:
          'B♭–D–F becomes B♭–D♭–F. The root is unchanged. This is one altered chord tone, not a new tonic.',
        example: frame,
      },
      {
        id: 'try',
        label: 'Try',
        instruction:
          'Return to the phrase. Compare the diatonic D alternative with the source D♭ version, keeping your attention on that pitch.',
        listenFor:
          'The changed third alters the local colour while the phrase, bass motion and timing remain the same.',
        example: variations,
      },
    ],
    transfer:
      'In an F-major sketch, compare B♭ with B♭ minor at the same moment. Check any held melody note against D♭ before deciding which version belongs.',
    sourceNote:
      'Community guitar MIDI, source bars 2–5. The opening F-major setting and altered D♭ pitch were compared with Faber’s Josh Cohen sample. That piano arrangement has its own metre/rubato choices, so it is not used to certify the community MIDI’s timing. The middle voice and original register differ between arrangements. D♭ is respelled from the imported C♯ without changing its sounding pitch.',
    references: [
      {
        label: 'Publisher’s score sample · Faber / Josh Cohen',
        url: 'https://www.fabermusic.com/shop/no-surprises-d38661',
      },
      {
        label: 'Community MIDI source · Midis101',
        url: 'https://www.midis101.com/free-midi/56491-radiohead-no-surprises',
      },
      {
        label: 'Modal mixture · Open Music Theory',
        url: 'https://viva.pressbooks.pub/openmusictheory/chapter/modal-mixture/',
      },
    ],
  };
}

export function createSyncopationLesson(
  source: MusicExample,
  comparison: MusicExample,
): GuidedMusicLesson {
  const close = firstTwoBars(
    source,
    'superstition-groove',
    'Superstition · provider groove reduction',
  );
  const lifted: MusicExample = {
    ...close,
    key: 'E♭ minor',
    notes: close.notes.map((note) =>
      note.part === 'melody'
        ? {
            ...note,
            midi: note.midi + 24,
            pitch: pitch(note.midi + 24)
              .replace('D#', 'Eb')
              .replace('F#', 'Gb')
              .replace('G#', 'Ab')
              .replace('A#', 'Bb')
              .replace('C#', 'Db'),
          }
        : note,
    ),
    source: { label: 'Provider groove · keyboard raised two octaves for this piano reduction' },
    notices: [
      ...(close.notices ?? []),
      'The keyboard part is raised two octaves for clarity on sampled piano. This is an authored register choice, not a correction claimed to match the record. The provider’s note timing is retained.',
    ],
  };
  const drums = lifted.tracks?.filter((track) => track.drum).map((track) => track.id) ?? [];
  const reference = select(lifted, 'superstition-beat', 'Keep the reference beat', drums);
  const interlock = select(
    lifted,
    'superstition-riff-and-beat',
    'Keyboard attacks against the beat',
    ['melody', ...drums],
  );
  const original: MusicExample = {
    ...comparison,
    id: 'try-syncopation',
    source: { label: 'Original course beat · move one kick' },
    notices: [
      'This two-bar A/B beat is original course music. It isolates one timing change and does not transcribe Stevie Wonder’s drum performance.',
    ],
  };
  return {
    articleId: 'songwriting-syncopation-and-anticipation',
    title: 'Superstition · hear an entrance against the beat',
    introduction:
      'Use a short provider groove to separate the reference beat from the keyboard’s displaced attacks. The piano reduction highlights timing rather than the record’s clavinet sound.',
    steps: [
      {
        id: 'listen',
        label: 'Listen',
        instruction:
          'Play the two-bar groove with keyboard, bass and basic drums. Follow the steady reference beneath the moving notes.',
        listenFor:
          'Several keyboard attacks arrive between the quarter-note beats. Their placement has meaning because the other parts keep your place.',
        example: lifted,
      },
      {
        id: 'isolate',
        label: 'Isolate',
        instruction:
          'Play the drum reference alone. Count four beats per bar; keep counting through the second bar.',
        listenFor:
          'Kick, snare and hi-hat give you a reference. You will keep that same count when the keyboard returns.',
        example: reference,
      },
      {
        id: 'notice',
        label: 'Notice',
        instruction:
          'Bring back the keyboard without the bass. Loop the passage and follow its attacks in the piano roll.',
        listenFor:
          'The beat continues through the gaps. An attack between beats does not move the underlying count. The source includes finer and uneven placements, not only straight eighths.',
        example: interlock,
      },
      {
        id: 'try',
        label: 'Try',
        instruction:
          'In this original beat, compare A and B. Only the kick on beat three moves to the following “and”.',
        listenFor:
          'The unchanged hi-hat and snare make the moved kick easy to hear. Shift one event before making a whole part busier.',
        example: original,
      },
    ],
    transfer:
      'Keep a clear accompaniment in a short sketch. Move one entrance half a beat earlier or later, then decide whether the new relationship helps the phrase.',
    sourceNote:
      'MIDI DB provider demo, source bars 2–3. Bass, selected keyboard part and basic drum lanes are retained; the keyboard is raised two octaves for the piano rendering. Victoria Theodore’s published Pianote lesson and Southern Cross University’s analysis support the syncopated-keyboard/reference-beat relationship. This checks the teaching mechanism, not a note-for-note transcription of the layered 1972 recording. The Try beat is original.',
    references: [
      {
        label: 'Victoria Theodore’s lesson · Pianote',
        url: 'https://www.pianote.com/blog/stevie-wonder-superstition/',
      },
      {
        label: 'Groove and instrumentation analysis · Southern Cross University',
        url: 'https://www.scu.edu.au/news/2022/dissecting-stevie-wonders-superstition-50-years-after-we-first-heard-its-infectious-grooves.php',
      },
      {
        label: 'Provider MIDI source · MIDI DB',
        url: 'https://www.mididb.com/stevie-wonder/superstition-midi/',
      },
    ],
  };
}
