import type { Harmony, MusicExample, Note } from '../../lib/music/model';

type Source = {
  notes: Note[];
  tempos: { beat: number; bpm: number }[];
  markers: { beat: number; label: string }[];
};
const sourceStart = 4,
  sourceEnd = 288;
const pitched: Record<string, string> = {
  'source-1': 'figure',
  'source-3': 'lead',
  'source-4': 'middle',
  'source-5': 'chords',
  'source-6': 'bass',
  'source-8': 'bells',
  'source-9': 'strings',
  'source-10': 'bells',
  'source-12': 'countermelody',
  'source-13': 'melody',
};
const drums: Record<number, 'kick' | 'snare' | 'hat'> = {
  36: 'kick',
  38: 'snare',
  42: 'hat',
  46: 'hat',
  49: 'hat',
};
/** A full-song reading of the supplied arrangement, with its own markers and tempo map. */
export function noSurprisesStudy(source: Source): MusicExample {
  const notes = source.notes
    .flatMap((note): Note[] => {
      const start = Math.max(sourceStart, note.start),
        end = Math.min(sourceEnd, note.start + note.duration);
      const drum = note.part === 'source-11' ? drums[note.midi] : undefined;
      const part = drum ?? pitched[note.part];
      if (!part || end <= start) return [];
      return [
        {
          ...note,
          part,
          start: start - sourceStart,
          duration: end - start,
          pitch: note.pitch
            .replace(/^C#/, 'Db')
            .replace(/^D#/, 'Eb')
            .replace(/^G#/, 'Ab')
            .replace(/^A#/, 'Bb'),
          ...(drum ? { drum } : {}),
        },
      ];
    })
    .sort((a, b) => a.start - b.start);
  const harmony: Harmony[] = [];
  function chord(
    at: number,
    duration: number,
    name: string,
    roman: string,
    parts = ['chords', 'bass'],
    voicingWindow?: number,
    root = name.split('/')[0].replace(/(?:maj.*|m.*|\d.*)$/, ''),
  ) {
    harmony.push({
      start: at - sourceStart,
      duration,
      name,
      roman,
      root,
      parts,
      bassPart: 'bass',
      ...(voicingWindow ? { voicingWindow } : {}),
    });
  }
  function opening(at: number) {
    chord(at, 6, 'F', 'I', ['figure', 'middle', 'bass'], 1.5);
    chord(at + 6, 2, 'Bbm', 'iv', ['figure', 'bass'], 1.5);
  }
  for (const at of [4, 12, 20, 28, 60, 92, 140, 148, 196, 268, 276]) opening(at);
  for (const at of [36, 68]) {
    chord(at, 8, 'F', 'I');
    chord(at + 8, 8, 'Bb', 'IV');
    chord(at + 16, 4, 'Gm', 'ii');
    chord(at + 20, 4, 'C', 'V');
  }
  chord(100, 8, 'F', 'I');
  chord(108, 8, 'Bb', 'IV');
  for (const at of [116, 172, 244])
    for (let i = 0; i < 3; i++) {
      chord(at + i * 8, 3.5, 'Gm', 'ii');
      chord(at + i * 8 + 3.5, 4.5, 'C5', 'V');
    }
  chord(156, 6, 'F', 'I', ['figure', 'middle', 'bass'], 1.5);
  chord(162, 2, 'Fmaj7/E', 'I', ['figure', 'middle', 'bass'], 1.5, 'F');
  chord(164, 8, 'Bbmaj9/D', 'IV', ['figure', 'middle', 'bass', 'strings'], 1.5, 'Bb');
  for (const at of [204, 212]) {
    chord(at, 4, 'C', 'V');
    chord(at + 4, 4, 'Bbm', 'iv');
  }
  chord(220, 4, 'Gm', 'ii');
  chord(224, 4, 'Bbm', 'iv');
  chord(228, 8, 'F', 'I', ['figure', 'middle', 'bass'], 1.5);
  chord(236, 8, 'F/Bb', 'I', ['figure', 'middle', 'bass'], 1.5, 'F');
  chord(284, 4, 'F', 'I', ['figure', 'middle', 'bass'], 1.5);
  harmony.sort((a, b) => a.start - b.start);

  const counts = new Map<string, number>();
  const markers = [
    { beat: sourceStart, label: 'Intro' },
    ...source.markers.filter(
      (m) => m.beat > sourceStart && m.beat < sourceEnd && m.label !== 'from OK Computer',
    ),
  ];
  const totals = new Map<string, number>();
  for (const marker of markers) totals.set(marker.label, (totals.get(marker.label) ?? 0) + 1);
  const descriptions: Record<string, string> = {
    Intro:
      'The bright F-major figure turns toward B♭ minor. That borrowed minor iv supplies D♭, a note outside F major.',
    'Verse 1':
      'The opening figure continues over changing accompaniment. Follow the chord roots separately from the melody notes.',
    'Verse 2':
      'The verse harmony returns. Listen for how the bass and inner voices support the repeating upper figure.',
    'Pre-Chorus':
      'A short build leads toward the chorus. In the later build, the F-major figure remains above a B♭ bass, shown as F/B♭.',
    Chorus:
      'G minor alternates with a C–G guitar shell. The C chord arrives half a beat early; the widths preserve that anticipation. The ribbon labels the shell C5 rather than inventing a third.',
    Bridge:
      'The opening figure stays above a moving bass: F, E, then D. The guide shows Fmaj7/E and B♭maj9/D from those actual voices.',
    Interlude:
      'C major and borrowed B♭ minor alternate before the harmony moves through G minor and B♭ minor.',
    Outro:
      'The opening figure returns, including borrowed B♭ minor. The arrangement slows down through its ending; playback follows the source tempo map.',
  };
  const sections = markers.map((marker, i) => {
    const count = (counts.get(marker.label) ?? 0) + 1;
    counts.set(marker.label, count);
    const name = marker.label === 'Pre-Chorus' ? 'Pre-chorus' : marker.label;
    return {
      start: marker.beat - sourceStart,
      end: (markers[i + 1]?.beat ?? sourceEnd) - sourceStart,
      label: name + ((totals.get(marker.label) ?? 0) > 1 ? ` ${count}` : ''),
      description: descriptions[marker.label],
    };
  });
  const tempo = source.tempos.findLast((t) => t.beat <= sourceStart)?.bpm ?? 73;
  return {
    id: 'radiohead-no-surprises-study',
    title: 'Radiohead — No Surprises · MIDI study',
    description:
      'Explore the complete MIDI arrangement. Click a section to follow its chords, melody and drums, from the borrowed minor iv in the intro to the slowing outro.',
    key: 'F major',
    tempo,
    tempos: [
      { beat: 0, bpm: tempo },
      ...source.tempos
        .filter((t) => t.beat > sourceStart && t.beat < sourceEnd)
        .map((t) => ({ ...t, beat: t.beat - sourceStart })),
    ],
    beatsPerBar: 4,
    beats: sourceEnd - sourceStart,
    chords: [],
    harmony,
    notes,
    sections,
    tracks: [
      { id: 'figure', label: 'Upper guitar figure', instrument: 'piano' },
      { id: 'middle', label: 'Inner guitar voice', instrument: 'piano' },
      { id: 'chords', label: 'Chord accompaniment', instrument: 'piano' },
      { id: 'bass', label: 'Bass', instrument: 'piano' },
      { id: 'bells', label: 'Bell / vibraphone figures', instrument: 'piano' },
      { id: 'strings', label: 'Sustained harmony', instrument: 'piano' },
      { id: 'melody', label: 'Vocal melody · piano guide', instrument: 'piano' },
      { id: 'countermelody', label: 'Ending counterline', instrument: 'piano' },
      { id: 'lead', label: 'Interlude guitar', instrument: 'piano' },
      { id: 'kick', label: 'Kick', drum: 'kick' },
      { id: 'snare', label: 'Snare', drum: 'snare' },
      { id: 'hat', label: 'Hat / cymbal', drum: 'hat' },
    ],
    defaultView: 'form',
    defaultPlayback: 'midi',
    notationParts: ['figure', 'middle', 'melody', 'bass'],
    source: {
      label: 'Community MIDI · J. Aldridge / Path B Guy',
      url: 'https://www.midis101.com/free-midi/56491-radiohead-no-surprises',
      detail: 'Credits preserved from the MIDI header and track names. Private local review.',
    },
    notices: [
      'Complete 71-bar community MIDI arrangement. One silent count-in bar is removed; note pitch/timing and the ending tempo changes are preserved. Section boundaries follow the source MIDI markers, not timestamps from a recording.',
      'Pitched parts use sampled piano, including the vocal melody. Duplicate sustained guitar, octave bass and vocal doubling are omitted; the distinctive figures, harmony, lead guitar and basic kit remain.',
      'Chord labels describe selected accompaniment voices. Arpeggiated voicings are read across their note attacks; bass is read at the chord onset. Melody passing notes are not treated as new chord extensions.',
      'The chorus C5 label reflects the guitar shell without a third. The later build is labeled F/B♭; the bridge retains the changing bass and the seventh/ninth tones actually present in its selected voices.',
      'The basic kit keeps source kick, snare and hat/cymbal timing, including sixteenths and triplets. Tom fills are omitted; cymbals use the simple hat sound.',
      'Private local review only; public redistribution permission has not been established. Source MIDI and generated study data stay outside the public build.',
    ],
  };
}
