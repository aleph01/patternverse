import type { Instrument } from '../../lib/music/instruments';

export type RepertoireEntry = {
  id: string;
  file: string;
  title: string;
  focus: string;
  key?: string;
  lessons?: { id: string; title: string }[];
  patterns?: string[];
  cue: string;
  start: number;
  beats: number;
  passage: string;
  source: string;
  credit: string;
  terms: string;
  parts: { source: string; id: string; label: string; instrument?: Instrument }[];
  note?: string;
  private?: boolean;
  spellings?: Record<string, string>;
  notationParts?: string[];
};

/** Quarter-note positions refer to the source MIDI, not a recording timestamp. */
export const repertoireCatalog: RepertoireEntry[] = [
  {
    id: 'withers-lean-on-me-demo',
    file: 'withers-lean-on-me-demo.mid',
    title: 'Bill Withers — Lean on Me (demo reduction)',
    focus: 'Stepwise melody & phrasing',
    cue: 'Follow the melody climbing by steps and returning. The accompaniment supplies a steady harmonic reference.',
    start: 20,
    beats: 16,
    passage: 'Provider demo bars 6–9 · 4/4',
    source: 'https://www.mididb.com/bill-withers/lean-on-me-midi/',
    credit: 'MIDI DB provider demo',
    terms: 'Private local demo playback; file is not bundled with the application',
    parts: [
      {
        source: 'midi-17',
        id: 'melody',
        label: 'Melody',
      },
      {
        source: 'midi-2',
        id: 'accompaniment',
        label: 'Accompaniment',
      },
    ],
    private: true,
    key: 'C major',
    note: 'The provider voices the melody with an alto-sax program; it plays on sampled piano here. Extra keyboard doubling, bass and later percussion are omitted. Timing and dynamics are retained.',
    lessons: [
      {
        id: 'songwriting-pitch-and-intervals',
        title: 'Intervals and Melodic Shape',
      },
      {
        id: 'songwriting-contour-and-register',
        title: 'Give the Melody a Destination',
      },
      {
        id: 'songwriting-phrases-and-breathing',
        title: 'Let the Phrase Breathe',
      },
      {
        id: 'songwriting-melody-and-harmony',
        title: 'Support or Challenge the Melody Note',
      },
    ],
    patterns: ['melodic-contour', 'phrase-breathing'],
  },
  {
    id: 'white-stripes-seven-nation-army',
    file: 'white-stripes-seven-nation-army.mid',
    title: 'The White Stripes — Seven Nation Army (riff reduction)',
    focus: 'A hook built from a repeating motif',
    cue: 'Follow the seven-note riff through two cycles. Its pitch shape and unequal note lengths make it recognizable; the basic beat keeps its place.',
    start: 16,
    beats: 16,
    passage: 'Community MIDI bars 5–8 · 4/4',
    source: 'https://www.midis101.com/free-midi/10674-the-white-stripes-seven-nation-army',
    credit: 'Community MIDI via Midis101',
    terms: 'Private local demo playback; file is not bundled with the application',
    parts: [
      {
        source: 'midi-10',
        id: 'bass',
        label: 'Octave-down riff',
        instrument: 'bass-guitar',
      },
      {
        source: 'midi-12-drum-36',
        id: 'kick',
        label: 'Kick',
      },
      {
        source: 'midi-12-drum-44',
        id: 'hat',
        label: 'Pedal hi-hat',
      },
    ],
    private: true,
    key: 'E minor',
    note: 'Community arrangement; original transcriber not identified by this download page. The source labels the riff as guitar with octave bass; it plays with the bass sound here. Only kick and pedal hi-hat are retained from the kit; the tom part is omitted. This is not the original guitar tone.',
    lessons: [
      {
        id: 'songwriting-start-with-a-motif',
        title: 'Start with a Motif',
      },
      {
        id: 'songwriting-write-a-hook',
        title: 'Write a Hook',
      },
      {
        id: 'songwriting-write-a-bass-line',
        title: 'Write a Bass Line',
      },
      {
        id: 'songwriting-repetition-variation-surprise',
        title: 'Repeat with a Reason',
      },
    ],
    patterns: ['melodic-hook', 'rhythmic-ostinato', 'strategic-repetition'],
  },
  {
    id: 'jackson-billie-jean',
    file: 'jackson-billie-jean.mid',
    title: 'Michael Jackson — Billie Jean (bass & beat)',
    focus: 'Rhythmic ostinato',
    cue: 'Hear the eight-note bass pattern repeat against kick, snare and hi-hat. The basic drum pattern supplies the reference beneath the bass.',
    start: 16,
    beats: 16,
    passage: 'Provider demo bars 5–8 · 4/4',
    source: 'https://www.mididb.com/michael-jackson/billie-jean-midi/',
    credit: 'MIDI DB provider demo',
    terms: 'Private local demo playback; file is not bundled with the application',
    parts: [
      {
        source: 'midi-0',
        id: 'bass',
        label: 'Bass ostinato',
        instrument: 'bass-guitar',
      },
      {
        source: 'midi-8-drum-36',
        id: 'kick',
        label: 'Kick',
      },
      {
        source: 'midi-8-drum-38',
        id: 'snare',
        label: 'Snare',
      },
      {
        source: 'midi-8-drum-42',
        id: 'hat',
        label: 'Hi-hat',
      },
    ],
    private: true,
    key: 'F♯ minor',
    note: 'A bass-and-basic-drums reduction of the provider arrangement. Additional synth doubling and percussion are omitted.',
    lessons: [
      {
        id: 'songwriting-pulse-and-tempo',
        title: 'Set the Pace for the Phrase',
      },
      {
        id: 'songwriting-write-a-bass-line',
        title: 'Write a Bass Line',
      },
      {
        id: 'songwriting-interlock-the-groove',
        title: 'Interlock the Groove',
      },
      {
        id: 'songwriting-give-each-part-a-job',
        title: 'Give Each Part a Job',
      },
    ],
    patterns: ['rhythmic-ostinato', 'interlocking-layers'],
  },
  {
    id: 'daft-get-lucky',
    file: 'daft-get-lucky.mid',
    title: 'Daft Punk — Get Lucky (groove reduction)',
    focus: 'Interlocking rhythm & a four-chord loop',
    cue: 'Follow one pass through the chord loop. Compare the held chord reference with the short guitar attacks and moving bass.',
    start: 4,
    beats: 16,
    passage: 'Provider demo bars 2–5 · 4/4',
    source: 'https://www.mididb.com/daft-punk/get-lucky-midi/',
    credit: 'MIDI DB provider demo',
    terms: 'Private local demo playback; file is not bundled with the application',
    parts: [
      {
        source: 'midi-29',
        id: 'accompaniment',
        label: 'Chord reference',
      },
      {
        source: 'midi-17',
        id: 'guitar',
        label: 'Guitar rhythm',
        instrument: 'guitar',
      },
      {
        source: 'midi-4',
        id: 'bass',
        label: 'Bass',
        instrument: 'bass-guitar',
      },
      {
        source: 'midi-18-drum-36',
        id: 'kick',
        label: 'Kick',
      },
      {
        source: 'midi-18-drum-40',
        id: 'snare',
        label: 'Snare',
      },
      {
        source: 'midi-18-drum-42',
        id: 'hat',
        label: 'Closed hi-hat',
      },
    ],
    private: true,
    key: 'B-centred loop',
    note: 'The source chord and bass parts outline B minor, D major, F♯ minor and E major. The MIDI header says C major and is not used as the key label. This is a structural reduction: guitar, bass, chord reference and basic drums, without the vocal melody or the other doubled parts.',
    lessons: [
      {
        id: 'songwriting-chord-families-and-numbers',
        title: 'Think in Chord Numbers',
      },
      {
        id: 'songwriting-progressions-and-arrival',
        title: 'Decide Where the Harmony Arrives',
      },
      {
        id: 'songwriting-interlock-the-groove',
        title: 'Interlock the Groove',
      },
      {
        id: 'songwriting-give-each-part-a-job',
        title: 'Give Each Part a Job',
      },
    ],
    patterns: ['interlocking-layers', 'strategic-repetition'],
  },
  {
    id: 'aphex-avril-piano',
    file: 'aphex-avril-piano.mid',
    title: 'Aphex Twin — Avril 14th (community piano arrangement)',
    focus: 'Arpeggiated harmony & melodic space',
    cue: 'Follow the changing lower figure beneath the longer upper notes. Hear how a continuing accompaniment leaves room for the melody.',
    start: 0,
    beats: 16,
    passage: 'Community MIDI bars 1–4 · 4/4',
    source: 'https://onlinesequencer.net/4284602',
    credit: 'Online Sequencer #4284602, based on #1913583',
    terms: 'Private local demo playback; file is not bundled with the application',
    parts: [
      {
        source: 'midi-0',
        id: 'melody',
        label: 'Piano arrangement',
      },
    ],
    private: true,
    key: 'A♭ major',
    note: 'Downloaded with the page’s public Export MIDI control. This community arrangement merges all notes into one track and differs in register from a full two-staff piano transcription. Its electric-piano program is played with sampled grand piano here. Eight zero-length note events are removed in a documented playback copy; all positive-length notes are preserved. No automatic hand split or claim of recording fidelity is made.',
    lessons: [
      {
        id: 'songwriting-build-and-hear-chords',
        title: 'Choose Chords by Their Notes',
      },
      {
        id: 'songwriting-melody-and-harmony',
        title: 'Support or Challenge the Melody Note',
      },
      {
        id: 'songwriting-subdivision-and-rests',
        title: 'Make Space Part of the Rhythm',
      },
    ],
    patterns: ['arpeggiation', 'foreground-and-background'],
  },
  {
    id: 'radiohead-no-surprises',
    file: 'radiohead-no-surprises.mid',
    title: 'Radiohead — No Surprises (guitar reduction)',
    focus: 'Borrowing the minor iv chord',
    cue: 'Hear the bright F-major figure turn toward B♭ minor. Listen for D♭, the darker note in that borrowed chord, before the opening figure returns.',
    start: 4,
    beats: 16,
    passage: 'Community MIDI bars 2–5 · 4/4',
    source: 'https://www.midis101.com/free-midi/56491-radiohead-no-surprises',
    credit: 'Community MIDI via Midis101; track credit: Path B Guy @ AOL',
    terms: 'Private local demo playback; file is not bundled with the application',
    parts: [
      {
        source: 'midi-1',
        id: 'melody',
        label: 'Upper guitar figure',
      },
      {
        source: 'midi-4',
        id: 'accompaniment',
        label: 'Middle voice',
      },
      {
        source: 'midi-6',
        id: 'bass',
        label: 'Bass',
        instrument: 'bass-guitar',
      },
    ],
    private: true,
    key: 'F major',
    note: 'A piano-and-bass reduction of the community guitar arrangement. The excerpt includes the F-major A/C material and the B♭/D♭/F borrowed-chord figure. The MIDI names the D♭ pitch as C♯; the reading guide respells it here. Vocals, extra guitar doubling and later drums are omitted.',
    spellings: {
      'C#': 'Db',
    },
    lessons: [
      {
        id: 'songwriting-borrow-a-chord',
        title: 'Borrow a Chord',
      },
      {
        id: 'songwriting-inversions-and-voice-leading',
        title: 'Connect Chords with Small Moves',
      },
      {
        id: 'songwriting-melody-and-harmony',
        title: 'Support or Challenge the Melody Note',
      },
    ],
    patterns: ['borrow-a-chord', 'strategic-repetition'],
  },
  {
    id: 'simon-scarborough-fair',
    file: 'simon-scarborough-fair.mid',
    title: 'Simon & Garfunkel — Scarborough Fair (guitar demo)',
    focus: 'Modal colour',
    cue: 'Follow the picked guitar figure and its moving lower notes. Hear C♯ alongside G natural: the raised sixth and minor third in this E-centred modal setting.',
    start: 6,
    beats: 24,
    passage: 'Provider demo bars 3–10 · 3/4',
    source: 'https://www.mididb.com/simon-garfunkel/scarborough-fair-midi/',
    credit: 'MIDI DB provider demo',
    terms: 'Private local demo playback; file is not bundled with the application',
    parts: [
      {
        source: 'midi-12',
        id: 'melody',
        label: 'Picked guitar',
        instrument: 'guitar',
      },
    ],
    private: true,
    key: 'E Dorian',
    note: 'This short provider demo contains a guitar introduction, not the sung melody or Canticle counterpoint. The selected guitar pitches are E, F♯, G, A, B, C♯ and D. The header’s C-major label is replaced with a label based on these notes and the E centre. Count-in percussion and fret noise are omitted.',
    lessons: [
      {
        id: 'songwriting-modes-drones-and-key-changes',
        title: 'Change the Tonal World Deliberately',
      },
      {
        id: 'songwriting-scales-and-tonal-home',
        title: 'Establish a Tonal Home',
      },
      {
        id: 'songwriting-build-and-hear-chords',
        title: 'Choose Chords by Their Notes',
      },
    ],
    patterns: ['establish-a-tonal-home', 'arpeggiation'],
  },
  {
    id: 'desmond-take-five',
    file: 'desmond-take-five.mid',
    title: 'Paul Desmond — Take Five (5/4 reduction)',
    focus: 'Five-beat meter & phrasing',
    cue: 'Count the accompaniment in groups of three plus two. Follow the melody over that cycle without restarting your count at each melodic entrance.',
    start: 25,
    beats: 20,
    passage: 'Provider demo bars 6–9 · 5/4',
    source: 'https://www.mididb.com/paul-desmond/take-five-midi/',
    credit: 'MIDI DB provider demo',
    terms: 'Private local demo playback; file is not bundled with the application',
    parts: [
      {
        source: 'midi-6',
        id: 'melody',
        label: 'Melody',
      },
      {
        source: 'midi-1',
        id: 'accompaniment',
        label: 'Piano accompaniment',
      },
      {
        source: 'midi-5',
        id: 'bass',
        label: 'Bass',
        instrument: 'bass-guitar',
      },
    ],
    private: true,
    key: 'E♭ minor',
    note: 'Melody, piano and bass from the provider arrangement. The sax melody plays on sampled piano here. The brush/ride kit is omitted because those timbres are not reproduced by the basic drum sounds. Performance timing and the source 5/4 meter are retained.',
    lessons: [
      {
        id: 'songwriting-beats-bars-and-meter',
        title: 'Group the Beat Around the Phrase',
      },
      {
        id: 'songwriting-phrases-and-breathing',
        title: 'Let the Phrase Breathe',
      },
      {
        id: 'songwriting-subdivision-and-rests',
        title: 'Make Space Part of the Rhythm',
      },
    ],
    patterns: ['phrase-breathing', 'rhythmic-ostinato'],
  },
  {
    id: 'chopin-fantaisie-impromptu',
    file: 'chopin-fantaisie-impromptu.mid',
    title: 'F. Chopin — Fantaisie-Impromptu, Op. 66',
    focus: 'Four against three',
    cue: 'Follow four right-hand notes against three left-hand notes in each quarter-note span. Watch where the hands’ attacks meet against their shared span.',
    start: 16,
    beats: 16,
    passage: 'Source bars 5–8 · 4/4',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1693',
    credit: 'Mutopia edition by Guy D. Lederfein',
    terms: 'Public Domain label on the source edition',
    parts: [
      {
        source: 'midi-0',
        id: 'melody',
        label: 'Right hand',
      },
      {
        source: 'midi-1',
        id: 'accompaniment',
        label: 'Left hand',
      },
    ],
    key: 'C♯ minor',
    note: 'Four against three, not three against two. Key label follows the edition’s score (the parser reads its MIDI key event as E minor). The underlying MIDI timing is retained, including the triplet left-hand values. This is a fixed-tempo score realization.',
    lessons: [
      {
        id: 'songwriting-subdivision-and-rests',
        title: 'Make Space Part of the Rhythm',
      },
      {
        id: 'songwriting-interlock-the-groove',
        title: 'Interlock the Groove',
      },
    ],
    patterns: ['polyrhythms', 'interlocking-layers'],
  },
  {
    id: 'joplin-entertainer',
    file: 'joplin-entertainer.mid',
    title: 'Scott Joplin — The Entertainer',
    focus: 'Syncopation',
    cue: 'Follow the upper line across the steady accompaniment. Keep the accompaniment’s pulse while following the upper line.',
    start: 8,
    beats: 16,
    passage: 'Source bars 5–12 · 2/4',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=263',
    credit: 'Mutopia edition by Chris Sawer',
    terms: 'Public Domain label on the source edition',
    parts: [
      {
        source: 'midi-0',
        id: 'melody',
        label: 'Upper line',
      },
      {
        source: 'midi-1',
        id: 'accompaniment',
        label: 'Accompaniment',
      },
    ],
    lessons: [
      {
        id: 'songwriting-syncopation-and-anticipation',
        title: 'Pull an Entrance Across the Beat',
      },
      {
        id: 'songwriting-subdivision-and-rests',
        title: 'Make Space Part of the Rhythm',
      },
    ],
    patterns: ['syncopation'],
  },
  {
    id: 'wonder-superstition-demo',
    file: 'wonder-superstition-demo.mid',
    title: 'Stevie Wonder — Superstition (demo reduction)',
    focus: 'Interlocking groove',
    cue: 'Hear the bass and clavinet rhythms against the drums. The clavinet part plays on piano here so you can follow its notes.',
    start: 4,
    beats: 16,
    passage: 'Provider demo bars 2–5 · 4/4',
    source: 'https://www.mididb.com/stevie-wonder/superstition-midi/',
    credit: 'MIDI DB provider demo',
    terms: 'Private local demo playback; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-1',
        id: 'bass',
        label: 'Bass',
        instrument: 'bass-guitar',
      },
      {
        source: 'midi-3',
        id: 'melody',
        label: 'Clavinet rhythm',
      },
      {
        source: 'midi-12-drum-35',
        id: 'kick',
        label: 'Kick',
      },
      {
        source: 'midi-12-drum-38',
        id: 'snare',
        label: 'Snare',
      },
      {
        source: 'midi-12-drum-42',
        id: 'hat',
        label: 'Closed hi-hat',
      },
      {
        source: 'midi-12-drum-46',
        id: 'open-hat',
        label: 'Open hi-hat',
      },
    ],
    note: 'A reduction of a provider arrangement, not the original recording. Brass, guitar and extra percussion are omitted. Source pitches and timing are retained; the clavinet register still needs comparison with the recording.',
    lessons: [
      {
        id: 'songwriting-syncopation-and-anticipation',
        title: 'Pull an Entrance Across the Beat',
      },
      {
        id: 'songwriting-interlock-the-groove',
        title: 'Interlock the Groove',
      },
      {
        id: 'songwriting-give-each-part-a-job',
        title: 'Give Each Part a Job',
      },
    ],
    patterns: ['syncopation', 'interlocking-layers'],
  },
  {
    id: 'bach-invention-1',
    file: 'bach-invention-1.mid',
    title: 'J. S. Bach — Invention No. 1',
    focus: 'Imitation & independent voices',
    cue: 'Listen for the opening figure passing between the two voices. Follow the answering entrance while the first voice continues.',
    start: 0,
    beats: 16,
    passage: 'Source bars 1–4 · 4/4',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=40',
    credit: 'Mutopia edition by jeff covey',
    terms: 'Creative Commons Attribution-ShareAlike 3.0',
    parts: [
      {
        source: 'midi-0',
        id: 'melody',
        label: 'Upper voice',
      },
      {
        source: 'midi-1',
        id: 'accompaniment',
        label: 'Lower voice',
      },
    ],
    lessons: [
      {
        id: 'songwriting-start-with-a-motif',
        title: 'Start with a Motif',
      },
      {
        id: 'songwriting-develop-without-losing-the-idea',
        title: 'Develop Without Losing the Idea',
      },
      {
        id: 'songwriting-give-each-part-a-job',
        title: 'Give Each Part a Job',
      },
    ],
    patterns: ['imitation', 'countermelody', 'motivic-sequence'],
  },
  {
    id: 'bach-prelude-c',
    file: 'bach-prelude-c.mid',
    title: 'J. S. Bach — Prelude in C major, BWV 846',
    focus: 'Arpeggiation & changing harmony',
    cue: 'The broken-chord shape repeats while its pitches change. Follow the lower notes, then listen to the upper pattern over them.',
    start: 0,
    beats: 16,
    passage: 'Source bars 1–4 · 4/4',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=5',
    credit: 'Mutopia edition by Tobias Erbsland',
    terms: 'Public Domain label on the source edition',
    parts: [
      {
        source: 'midi-0',
        id: 'accompaniment',
        label: 'Lower notes',
      },
      {
        source: 'midi-1',
        id: 'melody',
        label: 'Upper pattern',
      },
    ],
    lessons: [
      {
        id: 'songwriting-build-and-hear-chords',
        title: 'Choose Chords by Their Notes',
      },
      {
        id: 'songwriting-chord-families-and-numbers',
        title: 'Think in Chord Numbers',
      },
      {
        id: 'songwriting-progressions-and-arrival',
        title: 'Decide Where the Harmony Arrives',
      },
      {
        id: 'songwriting-inversions-and-voice-leading',
        title: 'Connect Chords with Small Moves',
      },
    ],
    patterns: ['arpeggiation', 'functional-harmonic-motion'],
  },
  {
    id: 'mozart-k545-1',
    file: 'mozart-k545-1.mid',
    title: 'W. A. Mozart — Piano Sonata K. 545, I',
    focus: 'Melody & broken-chord accompaniment',
    cue: 'Hear the melody above the repeating left-hand figure. Follow the accompaniment’s low–high–middle–high shape.',
    start: 0,
    beats: 16,
    passage: 'Source bars 1–4 · 4/4',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=998',
    credit: 'Mutopia edition by Alejandro Sierra',
    terms: 'Creative Commons Attribution-ShareAlike 3.0',
    parts: [
      {
        source: 'midi-0',
        id: 'melody',
        label: 'Melody',
      },
      {
        source: 'midi-1',
        id: 'accompaniment',
        label: 'Accompaniment',
      },
    ],
    lessons: [
      {
        id: 'songwriting-melody-and-harmony',
        title: 'Support or Challenge the Melody Note',
      },
      {
        id: 'songwriting-phrases-and-breathing',
        title: 'Let the Phrase Breathe',
      },
      {
        id: 'songwriting-give-each-part-a-job',
        title: 'Give Each Part a Job',
      },
    ],
    patterns: ['arpeggiation', 'foreground-and-background', 'phrase-breathing'],
  },
  {
    id: 'debussy-clair-de-lune',
    file: 'debussy-clair-de-lune.mid',
    title: 'Claude Debussy — Clair de lune',
    focus: 'Space & compound meter',
    cue: 'Follow the sustained sonorities and the space between entrances. The nine eighth-note beats form three larger groups.',
    start: 0,
    beats: 18,
    passage: 'Source bars 1–4 · 9/8',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1778',
    credit: 'Mutopia edition by Keith OHara',
    terms: 'Public Domain label on the source edition',
    parts: [
      {
        source: 'midi-0',
        id: 'melody',
        label: 'Upper part',
      },
      {
        source: 'midi-1',
        id: 'accompaniment',
        label: 'Lower part',
      },
    ],
    note: 'This score-derived MIDI has a fixed tempo. It does not reproduce the rubato of a performed recording.',
    lessons: [
      {
        id: 'songwriting-subdivision-and-rests',
        title: 'Make Space Part of the Rhythm',
      },
      {
        id: 'songwriting-sevenths-added-notes-suspensions',
        title: 'Add Color to a Working Chord',
      },
      {
        id: 'songwriting-contour-and-register',
        title: 'Give the Melody a Destination',
      },
    ],
    patterns: ['strategic-silence', 'register-separation'],
  },

  {
    id: 'sinatra-fly-me-to-the-moon',
    file: 'sinatra-fly-me-to-the-moon.mid',
    title: 'Fly Me to the Moon · community swing arrangement',
    focus: 'Swung melody against a walking bass',
    cue: 'Follow the melody against one bass attack per beat. Offbeat melody entrances keep unequal spacing; the nylon-guitar accompaniment supplies the chord reference.',
    start: 24,
    beats: 16,
    passage: 'Community source bars 7–10 · 4/4',
    key: 'C major / A minor material',
    source: 'https://bitmidi.com/fly-me-to-the-moon-mid',
    credit: 'Community MIDI via BitMidi; original transcriber not identified',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-28',
        id: 'melody',
        label: 'Melody',
        instrument: 'piano',
      },
      {
        source: 'midi-15',
        id: 'bass',
        label: 'Walking bass',
        instrument: 'bass-guitar',
      },
      {
        source: 'midi-16',
        id: 'accompaniment',
        label: 'Chord accompaniment',
        instrument: 'guitar',
      },
    ],
    note: 'The source uses a jazz-guitar program for the familiar melody; it plays on sampled piano here. Walking-bass onsets and unequal melody placements are retained, without quantization. Sparse flute fills, brass and brush/ride drums are omitted. This community arrangement is not claimed to be an exact Sinatra/Count Basie transcription. The piano roll follows its timing; this passage needs reviewed rhythm annotation before the automatic notation view can show it.',
    lessons: [
      {
        id: 'songwriting-swing-and-timing',
        title: 'Give the Groove a Consistent Feel',
      },
      {
        id: 'songwriting-write-a-bass-line',
        title: 'Write a Bass Line',
      },
      {
        id: 'songwriting-progressions-and-arrival',
        title: 'Decide Where the Harmony Arrives',
      },
    ],
    patterns: ['swing'],
  },
  {
    id: 'jackson-man-in-the-mirror',
    notationParts: ['melody', 'return', 'accompaniment', 'bass'],
    file: 'jackson-man-in-the-mirror.mid',
    title: 'Michael Jackson · Man in the Mirror · key-change passage',
    focus: 'A G-centred passage rises to A-flat',
    cue: 'Hear the approach in G, then the new A-flat setting from excerpt bar 9. The source switches melody-guide tracks at the return; both are retained. This is an actual later passage in the arrangement, not our transposition of the earlier notes.',
    start: 260,
    beats: 64,
    passage: 'Community source bars 66–81 · 4/4; new setting near source bar 74',
    key: 'G major → A♭ major',
    source: 'https://bitmidi.com/man-in-the-mirror-2-mid',
    credit: 'Community MIDI via BitMidi; original transcriber not identified',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-28',
        id: 'melody',
        label: 'Melody before the change',
        instrument: 'piano',
      },
      {
        source: 'midi-7',
        id: 'return',
        label: 'Melody after the change',
        instrument: 'piano',
      },
      {
        source: 'midi-1',
        id: 'accompaniment',
        label: 'Keyboard harmony',
        instrument: 'piano',
      },
      {
        source: 'midi-3',
        id: 'bass',
        label: 'Bass',
        instrument: 'bass-guitar',
      },
      {
        source: 'midi-20-drum-35',
        id: 'kick',
        label: 'Kick',
      },
      {
        source: 'midi-20-drum-42',
        id: 'hat',
        label: 'Hi-hat',
      },
    ],
    note: 'The selected 16 bars cross the arranged key change. Early bass and voicings outline G, B and C material; at source beat 292 the bass starts A-flat and the keyboard uses A-flat/C/E-flat. The source clarinet and calliope melody guides play on piano. Other doubled parts and most percussion are omitted. Complete score/recording alignment remains under review; the generated notation shows pitched parts with accidentals rather than a fully edited mid-piece signature change. Detailed drums stay in playback and the beat grid.',
    lessons: [
      {
        id: 'songwriting-modes-drones-and-key-changes',
        title: 'Change the Tonal World Deliberately',
      },
      {
        id: 'songwriting-make-the-chorus-arrive',
        title: 'Make the Chorus Arrive',
      },
      {
        id: 'songwriting-shape-energy-over-time',
        title: 'Shape Energy over Time',
      },
    ],
    patterns: ['sectional-contrast'],
  },
  {
    id: 'beachboys-god-only-knows',
    file: 'beachboys-god-only-knows-demo.mid',
    title: 'The Beach Boys · God Only Knows · bass and upper chords',
    focus: 'Chord root and bass note are different choices',
    cue: 'Follow A–G-sharp–F-sharp–E in the bass while the upper chord tones change. In the second bar the upper E-major harmony has G-sharp underneath: the bass is not the chord root.',
    start: 24,
    beats: 16,
    passage: 'Provider source bars 7–10 · 4/4',
    key: 'A / E-centred introduction',
    source: 'https://www.mididb.com/the-beach-boys/god-only-knows-midi/',
    credit: 'MIDI DB provider demo',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-17',
        id: 'accompaniment',
        label: 'Upper chord tones',
        instrument: 'piano',
      },
      {
        source: 'midi-1',
        id: 'bass',
        label: 'Bass line',
        instrument: 'bass-guitar',
      },
    ],
    note: 'Only the provider keyboard and bass are retained. The provider gives the fourth bar an E bass; this reduction is not claimed to match every inversion of the original recording. Horn, guitar doubling, harpsichord and drums are omitted. The teaching claim is the explicit E-major upper tones with G-sharp in the bass, not a complete reconstruction of the record.',
    lessons: [
      {
        id: 'songwriting-inversions-and-voice-leading',
        title: 'Connect Chords with Small Moves',
      },
      {
        id: 'songwriting-write-a-bass-line',
        title: 'Write a Bass Line',
      },
      {
        id: 'songwriting-give-each-part-a-job',
        title: 'Give Each Part a Job',
      },
    ],
    patterns: ['register-separation'],
  },
  {
    id: 'abba-dancing-queen',
    notationParts: ['melody', 'accompaniment', 'strings', 'bass'],
    file: 'abba-dancing-queen.mid',
    title: 'ABBA · Dancing Queen · melody and layer contrast',
    focus: 'A longer passage with a higher melody and a string entrance',
    cue: 'Follow this 16-bar passage into its higher melodic setting. A sustained string part returns near excerpt bar 13 while the bass and basic beat keep moving. Use the four-bar navigation to inspect the approach and arrival.',
    start: 108,
    beats: 64,
    passage: 'Community source bars 28–43 · 4/4; string entrance near source bar 40',
    key: 'A major',
    source: 'https://bitmidi.com/dancing-queen-1-mid',
    credit: 'Community MIDI via BitMidi; original transcriber not identified',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-5',
        id: 'melody',
        label: 'Melody',
        instrument: 'piano',
      },
      {
        source: 'midi-7',
        id: 'accompaniment',
        label: 'Keyboard accompaniment',
        instrument: 'piano',
      },
      {
        source: 'midi-15',
        id: 'strings',
        label: 'String line on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-1',
        id: 'bass',
        label: 'Bass',
        instrument: 'bass-guitar',
      },
      {
        source: 'midi-16-drum-36',
        id: 'kick',
        label: 'Kick',
      },
      {
        source: 'midi-16-drum-40',
        id: 'snare',
        label: 'Snare',
      },
      {
        source: 'midi-16-drum-42',
        id: 'hat',
        label: 'Hi-hat',
      },
    ],
    note: 'A complete four-minute community sequence was obtained; this is a 16-bar reduction for review. Its melody rises from C-sharp4/E4 material to C-sharp5/D5, and the selected string line returns at source beat 155.958. Piano, bass and basic drums are retained; guitar, extra strings, tambourine and other percussion are omitted. String notes play on piano, so this demonstrates note/register and entrance changes, not the original string timbre. Notation shows the pitched parts; detailed drums stay in playback and the beat grid. Exact verse/chorus boundary labels require recording or complete-score alignment.',
    lessons: [
      {
        id: 'songwriting-make-the-chorus-arrive',
        title: 'Make the Chorus Arrive',
      },
      {
        id: 'songwriting-jobs-of-song-sections',
        title: 'Give Each Section a Purpose',
      },
      {
        id: 'songwriting-shape-energy-over-time',
        title: 'Shape Energy over Time',
      },
      {
        id: 'songwriting-give-each-part-a-job',
        title: 'Give Each Part a Job',
      },
    ],
    patterns: ['chorus-lift', 'sectional-contrast'],
  },
  {
    id: 'wonder-isnt-she-lovely',
    file: 'wonder-isnt-she-lovely.mid',
    title: "Stevie Wonder · Isn't She Lovely · chord color",
    focus: 'Sevenths and ninths over a moving bass',
    cue: 'Listen to four bars of melody, keyboard voicings and bass. In bar 1, B and D-sharp add a seventh and ninth above C-sharp; the bass then moves to F-sharp, B and E.',
    start: 64,
    beats: 16,
    passage: 'Community source bars 17–20 · 4/4',
    key: 'E major',
    source: 'https://bitmidi.com/isnt-she-lovely-1-mid',
    credit: 'Community MIDI via BitMidi; original transcriber not identified',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-5',
        id: 'melody',
        label: 'Melody on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-1',
        id: 'accompaniment',
        label: 'Keyboard voicings',
        instrument: 'piano',
      },
      {
        source: 'midi-2',
        id: 'bass',
        label: 'Bass',
        instrument: 'bass-guitar',
      },
    ],
    note: 'A 3:45 community arrangement was obtained; this is a four-bar reduction. The opening keyboard notes E/G-sharp/B/D-sharp sit over C-sharp bass, giving C-sharp minor ninth color. The following F-sharp bass supports A-sharp/E/G-sharp in the keyboard. The melody-guide horn plays on sampled piano. Other synth, guitar, string, harmonica and percussion parts are omitted, including two non-GM percussion lanes encoded as pitched notes. The original timing is retained; fine swing and expressive placements may require the piano-roll view. This is not an approved transcription of the album recording.',
    lessons: [
      {
        id: 'songwriting-sevenths-added-notes-suspensions',
        title: 'Add Color to a Working Chord',
      },
      {
        id: 'songwriting-melody-and-harmony',
        title: 'Support or Challenge the Melody Note',
      },
    ],
    patterns: [],
  },
  {
    id: 'daft-punk-around-the-world',
    file: 'daft-punk-around-the-world.mid',
    title: 'Daft Punk · Around the World · building layers',
    key: 'Repertoire excerpt',
    focus: 'Repeated parts enter at different moments',
    cue: 'Follow the bass and high repeating figure. A second figure enters in excerpt bar 3, a new middle part in bar 13, and the vocal line in bar 21. The parts keep their individual rhythms as the texture grows.',
    start: 48,
    beats: 96,
    passage: 'Community source bars 13–36 · 4/4',
    source: 'https://www.albinoblacksheep.com/audio/midi/?src=Daft_Punk_-_Around_The_World',
    credit: 'Kevin Hall, credited in the MIDI; hosted by Albino Blacksheep',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-0',
        id: 'bass',
        label: 'Bass ostinato',
        instrument: 'bass-guitar',
      },
      {
        source: 'midi-1',
        id: 'high',
        label: 'High repeating figure on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-2',
        id: 'second',
        label: 'Second repeating figure on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-4',
        id: 'middle',
        label: 'Middle repeating part on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-5',
        id: 'melody',
        label: 'Vocal line on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-6-drum-36',
        id: 'kick',
        label: 'Kick',
      },
      {
        source: 'midi-6-drum-38',
        id: 'snare',
        label: 'Snare',
      },
      {
        source: 'midi-6-drum-42',
        id: 'hat',
        label: 'Closed hi-hat',
      },
    ],
    notationParts: ['bass', 'high', 'second', 'middle', 'melody'],
    note: 'A seven-minute, 10,605-note community arrangement was obtained; this is a 24-bar reduction. The selected new lanes start at source beats 56, 96 and 129.5. Synth and vocal pitches play on piano, and the bass uses the bass sound; original filtering, timbres and production are not reproduced. Noise effects, later synth lanes and extra percussion are omitted. The source C-major metadata is not treated as an approved key analysis.',
    lessons: [
      {
        id: 'songwriting-write-a-bass-line',
        title: 'Write a Bass Line',
      },
      {
        id: 'songwriting-interlock-the-groove',
        title: 'Interlock the Groove',
      },
      {
        id: 'songwriting-give-each-part-a-job',
        title: 'Give Each Part a Job',
      },
      {
        id: 'songwriting-shape-energy-over-time',
        title: 'Shape Energy over Time',
      },
    ],
    patterns: ['rhythmic-ostinato', 'interlocking-layers'],
  },
  {
    id: 'queen-bohemian-rhapsody',
    file: 'queen-bohemian-rhapsody.mid',
    title: 'Queen · Bohemian Rhapsody · section transition',
    focus: 'A contrasting passage changes the pace and texture',
    cue: 'Hear the choral passage give way to a faster guitar-led setting near excerpt bar 8. The tempo changes from about 124 to 176 bpm, while new guitar parts replace the previous texture. This passage shows one boundary within the larger form.',
    start: 355,
    beats: 64,
    passage: 'Community source beats 355–419 · 16 bars in 4/4',
    source: 'https://bitmidi.com/bohemian-rhapsody-1-mid',
    credit: 'Community MIDI via BitMidi; original transcriber not identified',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-4',
        id: 'choir',
        label: 'Choral harmony on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-6',
        id: 'melody',
        label: 'Lead vocal on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-0',
        id: 'accompaniment',
        label: 'Piano',
      },
      {
        source: 'midi-2',
        id: 'bass',
        label: 'Bass',
        instrument: 'bass-guitar',
      },
      {
        source: 'midi-22',
        id: 'guitar-chords',
        label: 'Guitar chords on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-24',
        id: 'guitar-riff',
        label: 'Guitar line on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-16-drum-36',
        id: 'kick',
        label: 'Kick',
      },
      {
        source: 'midi-16-drum-38',
        id: 'snare',
        label: 'Snare',
      },
      {
        source: 'midi-16-drum-42',
        id: 'hat',
        label: 'Closed hi-hat',
      },
    ],
    notationParts: ['choir', 'melody', 'accompaniment', 'bass', 'guitar-chords', 'guitar-riff'],
    note: 'A long community arrangement with tempo and meter changes was obtained. It lasts about 7:22 and is not certified as a faithful full-song transcription. This selected passage preserves the source tempo change at beat 385.5 (excerpt beat 30.5) and the new guitar-chord entrance at beat 385.02. Choral and guitar notes use piano for clarity; doubled guitar, other choir lanes, effects and extra percussion are omitted. This 16-bar boundary study does not establish the complete song form. A full section map and recording alignment remain to be reviewed. Expressive subdivisions may require the piano-roll view.',
    lessons: [
      {
        id: 'songwriting-pacing-transitions-endings',
        title: 'Shape the Approach and the Ending',
      },
      {
        id: 'songwriting-jobs-of-song-sections',
        title: 'Give Each Section a Purpose',
      },
    ],
    patterns: ['sectional-contrast'],
  },
  {
    id: 'beatles-yesterday',
    file: 'beatles-yesterday.mid',
    title: 'The Beatles · Yesterday · a temporary destination',
    focus: 'A dominant points toward a chord inside the key',
    key: 'F major',
    cue: 'Listen for A dominant seventh harmony in the second half of excerpt bar 2, followed by D minor in bar 3. Its C-sharp points toward D even though the passage begins in F major.',
    start: 20,
    beats: 16,
    passage: 'Community source bars 6–9 · 4/4',
    source: 'https://bitmidi.com/beatles-yesterday-mid',
    credit: 'Community MIDI via BitMidi; original transcriber not identified',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-0',
        id: 'melody',
        label: 'Melody on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-2',
        id: 'accompaniment',
        label: 'Keyboard harmony',
        instrument: 'piano',
      },
      {
        source: 'midi-1',
        id: 'bass',
        label: 'Bass',
        instrument: 'bass-guitar',
      },
    ],
    spellings: {
      'A#': 'Bb',
    },
    note: 'A roughly 3:13 community arrangement was fetched. This four-bar excerpt contains F, E minor seventh, A dominant seventh and D minor harmony. At source beat 26 the accompaniment contains A/C-sharp/E/G; at 28 it contains D/F/A. The title refers to the work, not an approved transcription of the original recording. Extra accompaniment, the later flute line and drums are omitted. Expressive melody timing is retained; the piano roll remains available if notation cannot represent a fine subdivision.',
    lessons: [
      {
        id: 'songwriting-point-to-a-temporary-home',
        title: 'Point to a Temporary Home',
      },
      {
        id: 'songwriting-progressions-and-arrival',
        title: 'Decide Where the Harmony Arrives',
      },
    ],
    patterns: ['functional-harmonic-motion'],
  },
  {
    id: 'davis-so-what-arrangement',
    file: 'davis-so-what-arrangement.mid',
    title: 'Miles Davis · So What · guitar-led arrangement',
    focus: 'A modal region moves up a semitone and returns',
    key: 'D and E-flat regions',
    cue: 'Follow four bars around D, four around E-flat, then the return to D. Compare the bass notes and response figures at excerpt bars 1, 5 and 9. This is a later guitar-led arrangement, not the Kind of Blue performance.',
    start: 28,
    beats: 48,
    passage: 'Hosted arrangement source bars 8–19 · 4/4',
    source: 'https://4.penceland.com/music.html',
    credit: 'Community arrangement hosted by Penceland under Miles Davis; arranger unverified',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-2',
        id: 'melody',
        label: 'Guitar-led figure on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-4',
        id: 'bass',
        label: 'Bass',
        instrument: 'bass-guitar',
      },
      {
        source: 'midi-5',
        id: 'accompaniment',
        label: 'Piano harmony',
        instrument: 'piano',
      },
      {
        source: 'midi-11',
        id: 'response',
        label: 'Response voice on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-12-drum-35',
        id: 'kick',
        label: 'Kick',
        instrument: 'piano',
      },
      {
        source: 'midi-12-drum-42',
        id: 'hat',
        label: 'Closed hi-hat',
        instrument: 'piano',
      },
    ],
    notationParts: ['melody', 'bass', 'accompaniment', 'response'],
    spellings: {
      'D#': 'Eb',
      'G#': 'Ab',
      'A#': 'Bb',
    },
    note: 'A valid 4:15 arrangement was fetched. Its guitar-led setting and roughly 108 bpm differ from the original album arrangement; the source page does not identify the arranger. D2 is present near source beat 28, E-flat2 near 44, and D2 again near 60. The selected passage demonstrates those local changes, not a verified 32-bar map of the original head. Horn and guitar notes use piano; pads, voice effects and extra drum lanes are omitted. The source C-major metadata is not an approved analysis. A separate Jazzomat download is a trumpet solo only and was not substituted for the theme.',
    lessons: [
      {
        id: 'songwriting-modes-drones-and-key-changes',
        title: 'Change the Tonal World Deliberately',
      },
      {
        id: 'songwriting-give-each-part-a-job',
        title: 'Give Each Part a Job',
      },
    ],
    patterns: ['establish-a-tonal-home', 'question-and-answer'],
  },
  {
    id: 'eilish-happier-than-ever-demo',
    file: 'eilish-happier-than-ever-demo.mid',
    title: 'Billie Eilish · Happier Than Ever · opening demo',
    focus: 'An outside note directs the next harmonic move',
    key: 'C major material',
    cue: 'The opening C harmony gives way to E major, then A minor. Listen for G-sharp in the middle two bars and its pull toward A. This six-bar passage comes only from the quiet opening.',
    start: 16,
    beats: 24,
    passage: 'Provider demo source bars 5–10 · 4/4',
    source: 'https://www.mididb.com/billie-eilish/happier-than-ever-midi/',
    credit: 'MIDI DB / Hit Trax provider demo DW0254',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-8',
        id: 'melody',
        label: 'Melody guide on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-6',
        id: 'accompaniment',
        label: 'Guitar accompaniment on piano',
        instrument: 'piano',
      },
    ],
    note: 'The downloaded provider demo is about 56 seconds and ends before the contrasting second part. It cannot demonstrate the complete two-part form; the full arrangement remains to be acquired. The selected guitar lane spells E/G-sharp/B in its middle span, without a D seventh, so the cue names E major rather than E7. Melody and accompaniment timing are unchanged. Other melody doubling and count-in hi-hat are omitted.',
    lessons: [
      {
        id: 'songwriting-point-to-a-temporary-home',
        title: 'Point to a Temporary Home',
      },
    ],
    patterns: ['functional-harmonic-motion'],
  },
  {
    id: 'fleetwood-landslide-arrangement',
    file: 'fleetwood-landslide-arrangement.mid',
    title: 'Fleetwood Mac · Landslide · community arrangement',
    focus: 'A familiar accompaniment leads into contrasting harmony',
    key: 'E-flat major',
    cue: 'Follow the falling bass underneath the first four excerpt bars, then the new B-flat-based setting in bar 5. The melody and fingerpicked accompaniment make the change audible without a full band.',
    start: 90,
    beats: 32,
    passage: 'Community source bars 46–61 · 2/4',
    source: 'https://bitmidi.com/fleetwood-mac-s-nicks-landslide-k-mid',
    credit: 'Community MIDI via BitMidi; original transcriber and recording version unverified',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-0',
        id: 'melody',
        label: 'Melody on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-1',
        id: 'accompaniment',
        label: 'Fingerpicked accompaniment on piano',
        instrument: 'piano',
      },
    ],
    spellings: {
      'D#': 'Eb',
      'A#': 'Bb',
      'G#': 'Ab',
    },
    note: 'A valid roughly 3:19 community arrangement was fetched. The source does not identify The Dance performance; it is not labeled as that exact version. This selected local harmonic contrast is a working study, not a checked bridge-and-return map of the live recording. Two doubled guitar lanes, the later solo and backing-voice lane are omitted. Fingerpicking is played on sampled piano with its original timing intact. The exact live-version acquisition remains open.',
    lessons: [
      {
        id: 'songwriting-jobs-of-song-sections',
        title: 'Give Each Section a Purpose',
      },
      {
        id: 'songwriting-give-each-part-a-job',
        title: 'Give Each Part a Job',
      },
    ],
    patterns: ['sectional-contrast', 'arpeggiation'],
  },
  {
    id: 'radiohead-true-love-waits-live',
    file: 'radiohead-true-love-waits-live.mid',
    title: 'Radiohead · True Love Waits · 2001 live-version reduction',
    focus: 'A song supported by continuous strummed motion',
    key: 'C-centred material',
    cue: 'Follow the regular strummed attacks under the opening vocal phrase. Compare their density with the 2016 studio-version reduction in this menu. Both examples keep the source arrangement timing.',
    start: 36,
    beats: 32,
    passage: 'Archive live-version source bars 10–17 · 4/4',
    source: 'https://rppmf.com/radiohead.htm',
    credit: 'RicardoRAVB Guitar Pro tab; ElNono84 edit; GM conversion Th. Leroy, 2007/2019',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-5',
        id: 'melody',
        label: 'Vocal guide on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-1',
        id: 'accompaniment',
        label: 'Strummed guitar on piano',
        instrument: 'piano',
      },
    ],
    note: 'The archive lists this file under I Might Be Wrong (2001), as True Love Waits (Live), and credits its tab and MIDI conversion. The source runs about 4:54. One steel-string guitar lane and its vocal guide are retained; a doubled nylon-string lane is omitted. Guitar notes use piano, preserving the staggered strums. This supports a comparison of note density and timing, not original guitar timbre or a certified performance transcription. The live pickup and vocal durations differ from the studio file; the examples are not synchronized note-for-note.',
    lessons: [
      {
        id: 'songwriting-what-makes-a-song',
        title: "Protect the Song's Identity",
      },
      {
        id: 'songwriting-choose-a-sonic-setting',
        title: 'Choose the World Around the Song',
      },
      {
        id: 'songwriting-give-each-part-a-job',
        title: 'Give Each Part a Job',
      },
    ],
    patterns: ['arpeggiation', 'foreground-and-background'],
  },
  {
    id: 'radiohead-true-love-waits-studio',
    file: 'radiohead-true-love-waits-studio.mid',
    title: 'Radiohead · True Love Waits · 2016 studio-version reduction',
    focus: 'A more spacious accompaniment lets notes overlap',
    key: 'C-centred material',
    cue: 'Compare the overlapping piano pulses with the live-version reduction. The vocal phrase sits above fewer accompaniment attacks, and notes continue ringing across later entrances.',
    start: 12,
    beats: 32,
    passage: 'Archive studio-version source bars 4–11 · 4/4',
    source: 'https://rppmf.com/radiohead.htm',
    credit: 'Frenkimazzoni Guitar Pro tab; GM conversion Th. Leroy, 2016',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-4',
        id: 'melody',
        label: 'Vocal guide on piano',
        instrument: 'piano',
      },
      {
        source: 'midi-1',
        id: 'accompaniment',
        label: 'Piano accompaniment',
        instrument: 'piano',
      },
    ],
    note: 'The archive lists this file under A Moon Shaped Pool (2016), with tab and MIDI conversion credits. The source is about 4:21 and contains a piano lane plus a soprano-sax vocal guide, played here on piano. It is a simple reduction and does not reconstruct all layered pianos, recording decay or production of the album. Its overlap and timing are retained. Compare the musical setting with the separate 2001 file; original audio remains necessary for a timbre comparison.',
    lessons: [
      {
        id: 'songwriting-what-makes-a-song',
        title: "Protect the Song's Identity",
      },
      {
        id: 'songwriting-choose-a-sonic-setting',
        title: 'Choose the World Around the Song',
      },
      {
        id: 'songwriting-give-each-part-a-job',
        title: 'Give Each Part a Job',
      },
    ],
    patterns: ['foreground-and-background', 'strategic-silence'],
  },
  {
    id: 'mozart-k265-theme',
    file: 'mozart-k265.mid',
    title: 'Mozart · Ah, vous dirai-je, Maman · theme',
    focus: 'The familiar theme before it changes',
    key: 'C major',
    cue: 'Hear the simple upper melody over a steady lower part. Compare this opening eight-bar phrase with Variations I and II in the menu.',
    start: 0,
    beats: 16,
    passage: 'Opening eight bars of the theme · 2/4; expanded source beat 0',
    source: 'https://www.8notes.com/scores/28540.asp',
    credit: 'Mozart K.265 · 8notes piano MIDI edition',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-0',
        id: 'accompaniment',
        label: 'Piano (both hands)',
        instrument: 'piano',
      },
    ],
    note: 'The complete downloaded edition is about 11:52 with 6,291 notes and expanded repeats. The theme, Variation I and Variation II begin at source beats 0, 96 and 192. Each menu selection isolates the first 16 quarter-note beats, preserving the original two-beat meter and piano pitches. Both hands share one MIDI lane. These are three excerpts from one file and one composition, not three newly acquired tracks. Later variations and unusual later meter events are outside these cuts. The MIDI edition reuse terms require review even though the composition is public domain.',
    lessons: [
      {
        id: 'songwriting-develop-without-losing-the-idea',
        title: 'Develop Without Losing the Idea',
      },
      {
        id: 'songwriting-repetition-variation-surprise',
        title: 'Repeat with a Reason',
      },
    ],
    patterns: ['theme-and-variations', 'developing-variation'],
  },
  {
    id: 'mozart-k265-variation-1',
    file: 'mozart-k265.mid',
    title: 'Mozart · Ah, vous dirai-je, Maman · Variation I',
    focus: 'Keep the tune while decorating the upper line',
    key: 'C major',
    cue: 'The upper line now moves in sixteenth notes while the lower part keeps a slower pulse. Compare where this decorated phrase arrives with the theme.',
    start: 96,
    beats: 16,
    passage: 'Opening eight bars of Variation I · 2/4; expanded source beat 96',
    source: 'https://www.8notes.com/scores/28540.asp',
    credit: 'Mozart K.265 · 8notes piano MIDI edition',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-0',
        id: 'accompaniment',
        label: 'Piano (both hands)',
        instrument: 'piano',
      },
    ],
    note: 'The complete downloaded edition is about 11:52 with 6,291 notes and expanded repeats. The theme, Variation I and Variation II begin at source beats 0, 96 and 192. Each menu selection isolates the first 16 quarter-note beats, preserving the original two-beat meter and piano pitches. Both hands share one MIDI lane. These are three excerpts from one file and one composition, not three newly acquired tracks. Later variations and unusual later meter events are outside these cuts. The MIDI edition reuse terms require review even though the composition is public domain.',
    lessons: [
      {
        id: 'songwriting-develop-without-losing-the-idea',
        title: 'Develop Without Losing the Idea',
      },
      {
        id: 'songwriting-repetition-variation-surprise',
        title: 'Repeat with a Reason',
      },
    ],
    patterns: ['theme-and-variations', 'developing-variation'],
  },
  {
    id: 'mozart-k265-variation-2',
    file: 'mozart-k265.mid',
    title: 'Mozart · Ah, vous dirai-je, Maman · Variation II',
    focus: 'Keep the upper tune while making the lower part move',
    key: 'C major',
    cue: 'The upper tune returns to longer notes while sixteenth-note motion moves into the lower register. Compare which hand supplies the activity in Variation I.',
    start: 192,
    beats: 16,
    passage: 'Opening eight bars of Variation II · 2/4; expanded source beat 192',
    source: 'https://www.8notes.com/scores/28540.asp',
    credit: 'Mozart K.265 · 8notes piano MIDI edition',
    terms:
      'Private local review; public-app reuse permission not established; file is not bundled with the application',
    private: true,
    parts: [
      {
        source: 'midi-0',
        id: 'accompaniment',
        label: 'Piano (both hands)',
        instrument: 'piano',
      },
    ],
    note: 'The complete downloaded edition is about 11:52 with 6,291 notes and expanded repeats. The theme, Variation I and Variation II begin at source beats 0, 96 and 192. Each menu selection isolates the first 16 quarter-note beats, preserving the original two-beat meter and piano pitches. Both hands share one MIDI lane. These are three excerpts from one file and one composition, not three newly acquired tracks. Later variations and unusual later meter events are outside these cuts. The MIDI edition reuse terms require review even though the composition is public domain.',
    lessons: [
      {
        id: 'songwriting-develop-without-losing-the-idea',
        title: 'Develop Without Losing the Idea',
      },
      {
        id: 'songwriting-repetition-variation-surprise',
        title: 'Repeat with a Reason',
      },
    ],
    patterns: ['theme-and-variations', 'developing-variation'],
  },
];
