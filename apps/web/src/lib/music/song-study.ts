import type { MusicExample, Note } from './model';

// A self-contained original study: the recording and the MIDI study use these same events.
const specifications = [
  {
    label: 'Intro',
    bars: 4,
    pattern: [0, 3, 0, 4],
    bass: false,
    drums: 'none',
    description: 'The piano introduces the harmony on its own.',
  },
  {
    label: 'Verse 1',
    bars: 12,
    pattern: [5, 3, 0, 4],
    bass: true,
    drums: 'light',
    description: 'A sparse groove supports the repeating progression.',
  },
  {
    label: 'Chorus 1',
    bars: 8,
    pattern: [0, 4, 5, 3],
    bass: true,
    drums: 'full',
    description: 'I–V–vi–IV arrives with a fuller drum pattern.',
  },
  {
    label: 'Verse 2',
    bars: 12,
    pattern: [5, 3, 0, 4],
    bass: true,
    drums: 'light',
    description: 'The verse harmony returns after the chorus.',
  },
  {
    label: 'Chorus 2',
    bars: 8,
    pattern: [0, 4, 5, 3],
    bass: true,
    drums: 'full',
    description: 'The familiar chorus returns.',
  },
  {
    label: 'Bridge',
    bars: 8,
    pattern: [1, 3, 5, 4],
    bass: true,
    drums: 'bridge',
    description: 'Different harmony creates a departure. Drums return in the second half.',
  },
  {
    label: 'Final chorus',
    bars: 8,
    pattern: [0, 4, 5, 3],
    bass: true,
    drums: 'full',
    description:
      'The piano moves up a register. Listen for G/B: the dominant chord with B in the bass.',
  },
  {
    label: 'Outro',
    bars: 4,
    pattern: [0, 3, 4, 0],
    bass: false,
    drums: 'none',
    description: 'The rhythm section leaves and the piano resolves to the tonic.',
  },
];
const pitches = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const pitch = (midi: number) => pitches[midi % 12] + (Math.floor(midi / 12) - 1);
const scale = [0, 2, 4, 5, 7, 9, 11];
const at = (degree: number) => 48 + scale[degree % 7] + Math.floor(degree / 7) * 12;
const notes: Note[] = [],
  harmony: NonNullable<MusicExample['harmony']> = [],
  sections: NonNullable<MusicExample['sections']> = [];
let start = 0;
for (const [sectionIndex, spec] of specifications.entries()) {
  sections.push({
    label: spec.label,
    start,
    end: start + spec.bars * 4,
    description: spec.description,
  });
  for (let bar = 0; bar < spec.bars; bar++) {
    const onset = start + bar * 4,
      degree = spec.pattern[bar % 4],
      shift = degree ? -12 : 0;
    const triad = [0, 2, 4].map((n) => at(degree + n) + shift);
    const inverted = sectionIndex === 6 && degree === 4;
    if (inverted) triad[0] += 12;
    triad.sort((a, b) => a - b);
    const name = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'][degree];
    harmony.push({
      start: onset,
      duration: 4,
      roman: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'][degree],
      name: name + (inverted ? '/B' : ''),
      root: pitches[scale[degree]],
    });
    for (const n of triad) {
      const midi = n + (sectionIndex === 6 ? 12 : 0);
      notes.push({
        midi,
        pitch: pitch(midi),
        start: onset,
        duration: 4,
        part: 'chords',
        velocity: 0.65,
      });
    }
    if (spec.bass) {
      const midi = triad[0] - 12;
      notes.push({
        midi,
        pitch: pitch(midi),
        start: onset,
        duration: 4,
        part: 'bass',
        velocity: 0.45,
      });
    }
    const groove = spec.drums === 'bridge' ? (bar >= 4 ? 'full' : 'none') : spec.drums;
    if (groove !== 'none') {
      const patterns =
        groove === 'light'
          ? { kick: [0, 5], snare: [6], hat: [0, 2, 4, 6] }
          : { kick: [0, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7] };
      for (const drum of ['kick', 'snare', 'hat'] as const)
        for (const step of patterns[drum]) {
          const midi = { kick: 36, snare: 38, hat: 42 }[drum];
          notes.push({
            midi,
            pitch: pitch(midi),
            start: onset + step / 2,
            duration: 0.08,
            part: drum,
            drum,
            velocity: drum === 'hat' ? 0.35 : 0.7,
          });
        }
    }
  }
  start += spec.bars * 4;
}
export const songStudy: MusicExample = {
  id: 'song-structure-study',
  title: 'From song structure to chords & drums',
  description:
    'Start with the whole song. Select a section to follow its harmony and drum pattern. This is an original 64-bar piano-and-drums study.',
  key: 'C major',
  tempo: 96,
  beatsPerBar: 4,
  beats: start,
  notes: notes.sort((a, b) => a.start - b.start),
  chords: [],
  harmony,
  sections,
  defaultView: 'form',
  tracks: [
    { id: 'chords', label: 'Piano', instrument: 'piano' },
    { id: 'bass', label: 'Bass', instrument: 'piano' },
    { id: 'kick', label: 'Kick', drum: 'kick' },
    { id: 'snare', label: 'Snare', drum: 'snare' },
    { id: 'hat', label: 'Hi-hat', drum: 'hat' },
  ],
  recording: { src: '/audio/music/song-study.mp3', label: 'Original study · piano & drums' },
  source: { label: 'Original Patternverse study · piano samples by Alexander Holm (CC BY 3.0)' },
};
export const recordingStudy: MusicExample = {
  ...songStudy,
  id: 'song-structure-recording',
  title: 'Follow a recording through its song structure',
  description:
    'A recording can use the same section map on its own. This view intentionally has no chord or drum transcription.',
  notes: [],
  harmony: undefined,
  tracks: [],
};
