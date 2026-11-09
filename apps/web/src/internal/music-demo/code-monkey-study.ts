import type { MusicExample, Note } from '../../lib/music/model';

/** Authored reading reduction against Coulton's chart and the separately released performance stems. */
export function codeMonkeyStudy(drums: Note[]): MusicExample {
  const tempo = 160;
  const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const pitch = (midi: number) => pitchNames[midi % 12] + (Math.floor(midi / 12) - 1);
  const definitions: Record<
    string,
    { roman: string; root: string; notes: number[]; bass: number }
  > = {
    E: { roman: 'I', root: 'E', notes: [52, 56, 59], bass: 40 },
    B: { roman: 'V', root: 'B', notes: [47, 51, 54], bass: 35 },
    A: { roman: 'IV', root: 'A', notes: [45, 49, 52], bass: 33 },
    'G#7/B#': { roman: 'V/vi', root: 'G#', notes: [44, 48, 51, 54], bass: 36 },
    'C#m': { roman: 'vi', root: 'C#', notes: [49, 52, 56], bass: 37 },
    'Emaj7/D#': { roman: 'I', root: 'E', notes: [52, 56, 59, 63], bass: 39 },
    'E6/C#': { roman: 'I', root: 'E', notes: [52, 56, 59, 61], bass: 37 },
    'E/B': { roman: 'I', root: 'E', notes: [52, 56, 59], bass: 35 },
    Amaj7: { roman: 'IV', root: 'A', notes: [45, 49, 52, 56], bass: 33 },
    D: { roman: '♭VII', root: 'D', notes: [50, 54, 57], bass: 38 },
    Am: { roman: 'iv', root: 'A', notes: [45, 48, 52], bass: 33 },
  };
  const notes: Note[] = [],
    harmony: NonNullable<MusicExample['harmony']> = [];
  function chord(start: number, duration: number, name: string) {
    const d = definitions[name];
    harmony.push({ start, duration, name, root: d.root, roman: d.roman });
    for (const midi of d.notes)
      notes.push({
        midi,
        pitch: name === 'G#7/B#' && midi === 48 ? 'B#2' : pitch(midi),
        start,
        duration,
        part: 'chords',
        velocity: 0.65,
      });
    if (start >= 64)
      notes.push({
        midi: d.bass,
        pitch: d.bass === 36 && name === 'G#7/B#' ? 'B#1' : pitch(d.bass),
        start,
        duration,
        part: 'bass',
        velocity: 0.45,
      });
  }
  function verse(start: number, sparse = false) {
    if (sparse) chord(start, 32, 'E');
    for (let local = sparse ? 32 : 0; local < 64; local += 8) {
      chord(start + local, 2, 'E');
      chord(start + local + 2, 2, 'B');
      chord(start + local + 4, 4, 'A');
    }
  }
  function prechorus(start: number) {
    for (const [offset, duration, name] of [
      [0, 4, 'A'],
      [4, 4, 'B'],
      [8, 4, 'G#7/B#'],
      [12, 2, 'C#m'],
      [14, 2, 'B'],
      [16, 8, 'A'],
      [24, 8, 'B'],
    ] as const)
      chord(start + offset, duration, name);
  }
  function chorus(start: number) {
    for (const [offset, duration, name] of [
      [0, 4, 'E'],
      [4, 4, 'Emaj7/D#'],
      [8, 4, 'E6/C#'],
      [12, 4, 'E/B'],
      [16, 8, 'Amaj7'],
      [24, 8, 'B'],
    ] as const)
      chord(start + offset, duration, name);
  }
  function hook(start: number, tail: number) {
    for (const local of [0, 8])
      for (const [offset, duration, name] of [
        [0, 2, 'E'],
        [2, 2, 'B'],
        [4, 2, 'A'],
        [6, 1, 'C#m'],
        [7, 1, 'B'],
      ] as const)
        chord(start + local + offset, duration, name);
    chord(start + 16, tail, 'E');
  }
  verse(0, true);
  prechorus(64);
  chorus(96);
  hook(128, 16);
  verse(160);
  prechorus(224);
  chorus(256);
  // The bridge is reduced to its principal borrowed chords; connecting guitar notes are omitted.
  for (const [offset, duration, name] of [
    [0, 4, 'D'],
    [4, 4, 'A'],
    [8, 4, 'Am'],
    [12, 4, 'E'],
    [16, 2, 'D'],
    [18, 6, 'A'],
    [24, 8, 'Am'],
    [32, 16, 'E'],
  ] as const)
    chord(288 + offset, duration, name);
  verse(336);
  prechorus(400);
  chorus(432);
  hook(464, 24);
  const sections = [
    [
      'Verse 1',
      0,
      64,
      'A tonic vamp opens the song. Drums enter halfway through, then the E–B–A movement becomes clear.',
    ],
    [
      'Pre-chorus 1',
      64,
      96,
      'A secondary dominant, G♯7, leads toward C♯ minor before returning to the dominant.',
    ],
    ['Chorus 1', 96, 128, 'The bass descends E–D♯–C♯–B beneath related tonic colors.'],
    ['Hook', 128, 160, 'The short E–B–A–C♯m–B figure answers the chorus, then settles on E.'],
    [
      'Verse 2',
      160,
      224,
      'The second verse keeps the E–B–A pattern with bass and drums underneath.',
    ],
    ['Pre-chorus 2', 224, 256, 'The same harmonic turn prepares the next chorus.'],
    ['Chorus 2', 256, 288, 'Listen again for the descending bass beneath the tonic.'],
    [
      'Bridge',
      288,
      336,
      'D major and A minor introduce borrowed harmony. The MIDI shows the principal chords rather than every guitar connection.',
    ],
    ['Verse 3', 336, 400, 'The verse returns after the contrasting bridge.'],
    ['Pre-chorus 3', 400, 432, 'The secondary dominant returns before the final chorus.'],
    ['Chorus 3', 432, 464, 'The final chorus revisits the descending bass line.'],
    ['Outro', 464, 504, 'The hook returns and the final E chord rings out.'],
  ] as const;
  return {
    id: 'coulton-code-monkey-study',
    title: 'Jonathan Coulton — Code Monkey',
    description:
      'The released recording with a timed song map and a simplified MIDI study of the harmony, bass and core drum pattern. Start with a section, then follow its parts.',
    key: 'E major',
    tempo,
    beatsPerBar: 4,
    beats: 504,
    notes: [...notes, ...drums].sort((a, b) => a.start - b.start),
    chords: [],
    harmony,
    sections: sections.map(([label, start, end, description]) => ({
      label,
      start,
      end,
      description,
    })),
    defaultView: 'form',
    defaultPlayback: 'recording',
    tracks: [
      { id: 'chords', label: 'Chord reduction', instrument: 'piano' },
      { id: 'bass', label: 'Bass guide', instrument: 'piano' },
      { id: 'kick', label: 'Kick', drum: 'kick' },
      { id: 'snare', label: 'Snare', drum: 'snare' },
      { id: 'hat', label: 'Cymbal pulse', drum: 'hat' },
    ],
    recording: {
      src: '/song-studies/code-monkey.mp3',
      label: 'Jonathan Coulton · released recording',
      offsetSeconds: 0.283625,
    },
    source: {
      label: 'Jonathan Coulton · Code Monkey · local noncommercial study',
      url: 'https://www.jonathancoulton.com/chords/code-monkey/',
    },
    notices: [
      'Recording: the artist-published Thing a Week Three MP3. The MIDI is an authored reading reduction, not the original session MIDI or a complete instrumental transcription.',
      'Timing: 160 bpm; recording offset 0.283625 s, checked against isolated performance stems at multiple positions through the song. The remaining measured offset drift is under 2 ms.',
      'Harmony follows the artist’s chart. Guitar textures, passing notes and some connecting bridge details are simplified. Kick, snare and cymbal pulses are reduced from the isolated drum track; fills and smaller subdivisions are omitted.',
      'Credits: composition, performance and recording by Jonathan Coulton. Artist recording/chart: CC BY-NC; source-track release: CC BY-NC-SA. This example and its audio/MIDI assets are served only by the local demo and are excluded from the public application.',
    ],
  };
}
