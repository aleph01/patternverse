import type { Harmony, MusicExample, Note } from '../../lib/music/model';

const endBeat = 452;
const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const degree: Record<number, string> = { 0: 'VI', 2: 'VII', 4: 'i', 7: 'III', 9: 'IV', 11: 'V' };
const drumPart: Record<number, 'kick' | 'snare' | 'hat'> = {
  36: 'kick',
  38: 'snare',
  42: 'hat',
  44: 'hat',
  57: 'hat',
};

/** Source positions are musical beats in the complete community MIDI, not recording time. */
export function sevenNationArmyStudy(source: Note[]): MusicExample {
  const notes = source
    .flatMap((note): Note[] => {
      if (note.start < 0 || note.start >= endBeat) return [];
      const part =
        note.part === 'source-10'
          ? 'riff'
          : ['source-2', 'source-3'].includes(note.part)
            ? 'guitar'
            : ['source-6', 'source-7'].includes(note.part)
              ? 'lead'
              : note.part === 'source-12'
                ? drumPart[note.midi]
                : undefined;
      if (!part) return [];
      const drum = ['kick', 'snare', 'hat'].includes(part)
        ? (part as 'kick' | 'snare' | 'hat')
        : undefined;
      return [
        {
          ...note,
          part,
          duration: Math.min(note.duration, endBeat - note.start),
          ...(drum ? { drum } : {}),
        },
      ];
    })
    .sort((a, b) => a.start - b.start);

  const harmony: Harmony[] = [
    {
      start: 0,
      duration: 96,
      roman: 'i',
      kind: 'tonal-centre',
      name: 'E minor',
      root: 'E',
      parts: ['riff'],
    },
    {
      start: 144,
      duration: 96,
      roman: 'i',
      kind: 'tonal-centre',
      name: 'E minor',
      root: 'E',
      parts: ['riff'],
    },
    {
      start: 320,
      duration: 88,
      roman: 'i',
      kind: 'tonal-centre',
      name: 'E minor',
      root: 'E',
      parts: ['riff'],
    },
  ];
  // Read chord roots from the rhythm guitar's actual voicings. A/E must stay rooted on A.
  const guitar = source.filter((n) => n.part === 'source-2' && n.duration >= 0.1);
  for (const [start, end] of [
    [96, 144],
    [240, 320],
    [408, 452],
  ]) {
    const events: Harmony[] = [];
    for (const onset of [
      ...new Set(guitar.filter((n) => n.start >= start && n.start < end).map((n) => n.start)),
    ].sort((a, b) => a - b)) {
      const sounding = guitar.filter(
        (n) => n.start <= onset + 1e-7 && n.start + n.duration > onset + 1e-7,
      );
      const pcs = new Set(sounding.map((n) => n.midi % 12));
      const root =
        [...pcs].find(
          (pc) => pcs.has((pc + 7) % 12) && (pcs.has((pc + 4) % 12) || pcs.has((pc + 3) % 12)),
        ) ?? [...pcs].find((pc) => pcs.has((pc + 7) % 12));
      if (root === undefined || !degree[root]) continue;
      const major = pcs.has((root + 4) % 12),
        minor = pcs.has((root + 3) % 12);
      const name = pitchNames[root] + (major ? '' : minor ? 'm' : '5');
      const roman = root === 4 && major ? 'I' : degree[root];
      if (events.at(-1)?.name === name) continue;
      events.push({ start: onset, name, roman, root: pitchNames[root], parts: ['guitar'] });
    }
    events.forEach((event, i) => {
      event.duration = (events[i + 1]?.start ?? end) - event.start;
    });
    harmony.push(...events);
  }
  return {
    id: 'white-stripes-seven-nation-army-study',
    title: 'The White Stripes — Seven Nation Army · MIDI study',
    description:
      'A complete instrumental MIDI arrangement. Start with the song map, then click a section to follow the riff, power chords and basic drum groove.',
    key: 'E minor',
    tempo: 120,
    beatsPerBar: 4,
    beats: endBeat,
    notes,
    chords: [],
    harmony: harmony.sort((a, b) => a.start - b.start),
    tracks: [
      { id: 'riff', label: 'Octave-down riff', instrument: 'piano' },
      { id: 'guitar', label: 'Rhythm guitar · piano reduction', instrument: 'piano' },
      { id: 'lead', label: 'Guitar solo · piano reduction', instrument: 'piano' },
      { id: 'kick', label: 'Kick', drum: 'kick' },
      { id: 'snare', label: 'Snare', drum: 'snare' },
      { id: 'hat', label: 'Hat / cymbal', drum: 'hat' },
    ],
    sections: [
      {
        label: 'Intro',
        start: 0,
        end: 32,
        description:
          'The riff establishes E minor. Drums enter in bar 5. This is a melodic figure, not seven separate chords; the ribbon shows its tonal centre.',
      },
      {
        label: 'Verse 1',
        start: 32,
        end: 96,
        description:
          'The same riff supports the verse. The drum part changes in bar 17 while the pitch pattern stays recognizable.',
      },
      {
        label: 'Hook 1',
        start: 96,
        end: 144,
        description:
          'A two-bar G–A build leads into eight bars of the loud riff, followed by a two-bar turnaround. The guitar uses power chords: roots and fifths without a third.',
      },
      {
        label: 'Riff break',
        start: 144,
        end: 160,
        description:
          'The full guitar chords drop out. The low riff carries the transition by itself after the first drum accent.',
      },
      {
        label: 'Verse 2',
        start: 160,
        end: 240,
        description:
          'The quieter texture returns. Follow how the basic kit changes underneath the repeated riff.',
      },
      {
        label: 'Guitar solo',
        start: 240,
        end: 320,
        description:
          'After the two-bar build, the lead guitar enters at bar 63 above the loud riff. The solo lasts sixteen bars and ends with a two-bar turnaround.',
      },
      {
        label: 'Verse 3',
        start: 320,
        end: 408,
        description:
          'A short return to the exposed riff leads into the last verse. The chord ribbon again marks E minor as a tonal centre, rather than treating every riff note as a chord.',
      },
      {
        label: 'Final hook',
        start: 408,
        end: 452,
        description:
          'The build and loud riff return. The last bar ends on E major: listen for G♯ replacing the home key’s G natural.',
      },
    ],
    defaultView: 'form',
    defaultPlayback: 'midi',
    notationParts: ['riff', 'guitar', 'lead'],
    source: {
      label: 'Community MIDI · Midis101',
      url: 'https://www.midis101.com/free-midi/10674-the-white-stripes-seven-nation-army',
      detail:
        'Full instrumental community arrangement; original transcriber unidentified. Private local review.',
    },
    notices: [
      'Complete 113-bar community MIDI arrangement at its authored 120 bpm. This is not the original recording or session MIDI; vocals are absent and pitched parts use the sampled piano.',
      'Section names are editorial reading guides for this arrangement. Hook sections include their build and turnaround; the final hook includes the ending. This is not a timestamp map of the official video.',
      'Monophonic passages are labeled E minor centre, not harmonized into invented chords. Power-chord labels retain the missing third. The ending’s E major triad comes from the actual MIDI notes.',
      'Basic drums retain kick, snare and hat/cymbal events at source times. The low-tom part is omitted; cymbals use the simple hat sound. Short guitar grace notes remain audible but are omitted from the harmonic labels.',
      'Private local review only; redistribution and public application reuse permission have not been established. The MIDI and generated study data are excluded from the public build.',
    ],
  };
}
