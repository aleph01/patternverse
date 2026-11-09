import { midiPitch } from '../../lib/music/examples';
import type { MusicExample } from '../../lib/music/model';

/** Original, short scores: the displayed bass and layers are read from these sounding notes. */
function study(
  id: string,
  title: string,
  description: string,
  cells: { name: string; roman: string; beats: number; pitches: string[] }[],
): MusicExample {
  let start = 0;
  const harmony = cells.map(({ name, roman, beats }) => {
    const chord = { name, roman, start, duration: beats };
    start += beats;
    return chord;
  });
  return {
    id,
    title,
    description,
    key: 'C major',
    tempo: 100,
    beatsPerBar: 4,
    beats: start,
    chords: cells.map((c) => c.name),
    harmony,
    defaultView: 'harmony',
    tracks: [{ id: 'chords', label: 'Piano', instrument: 'piano' }],
    notes: cells.flatMap((c, i) =>
      c.pitches.map((pitch) => ({
        pitch,
        midi: midiPitch(pitch),
        start: harmony[i].start,
        duration: c.beats,
        part: 'chords',
      })),
    ),
    source: { label: 'Original Patternverse chord study' },
  };
}

export const chordStudies: MusicExample[] = [
  study(
    'chord-time',
    'Chord duration · I–V–vi–IV',
    'The same four relationships, held for different lengths. Width represents time: one, two, four and one beats.',
    [
      { name: 'C', roman: 'I', beats: 1, pitches: ['C3', 'E3', 'G3'] },
      { name: 'G', roman: 'V', beats: 2, pitches: ['G2', 'B2', 'D3'] },
      { name: 'Am', roman: 'vi', beats: 4, pitches: ['A2', 'C3', 'E3'] },
      { name: 'F', roman: 'IV', beats: 1, pitches: ['F3', 'A3', 'C4'] },
    ],
  ),
  study(
    'chord-bass',
    'Inversions · G, G/B and C/G',
    'G and G/B are both V. The lowest note changes the inversion, while the chord root stays the same. C/G is I in second inversion.',
    [
      { name: 'G', roman: 'V', beats: 4, pitches: ['G2', 'B2', 'D3'] },
      // Deliberately keep the root name G: the slash and inversion are derived from the voicing.
      { name: 'G', roman: 'V', beats: 4, pitches: ['B2', 'D3', 'G3'] },
      { name: 'C', roman: 'I', beats: 4, pitches: ['G2', 'C3', 'E3'] },
    ],
  ),
  study(
    'chord-layers',
    'Extensions · C, Cmaj7 and Cmaj9',
    'Expand a chord to see its stack. Start with C–E–G, add B for a major seventh, then D for a ninth. Each chord still lasts four beats.',
    [
      { name: 'C', roman: 'I', beats: 4, pitches: ['C3', 'E3', 'G3'] },
      { name: 'Cmaj7', roman: 'I', beats: 4, pitches: ['C3', 'E3', 'G3', 'B3'] },
      { name: 'Cmaj9', roman: 'I', beats: 4, pitches: ['C3', 'E3', 'G3', 'B3', 'D4'] },
    ],
  ),
  study(
    'chord-ninths',
    'Compare · Cadd9, Cmaj9 and C7',
    'Cadd9 has a ninth without a seventh. Cmaj9 includes B; C7 uses B-flat instead. The labeled layers make the difference visible.',
    [
      { name: 'Cadd9', roman: 'I', beats: 4, pitches: ['C3', 'E3', 'G3', 'D4'] },
      { name: 'Cmaj9', roman: 'I', beats: 4, pitches: ['C3', 'E3', 'G3', 'B3', 'D4'] },
      { name: 'C7', roman: 'I', beats: 4, pitches: ['C3', 'E3', 'G3', 'Bb3'] },
    ],
  ),
  study(
    'chord-short',
    'Quick changes · half-beat chords',
    'Short chords keep their true proportions. Scroll the timeline to follow the change; revealing notes never changes a chord’s width.',
    [
      { name: 'C', roman: 'I', beats: 0.5, pitches: ['C3', 'E3', 'G3'] },
      { name: 'G', roman: 'V', beats: 0.5, pitches: ['B2', 'D3', 'G3'] },
      { name: 'Am', roman: 'vi', beats: 2, pitches: ['A2', 'C3', 'E3'] },
      { name: 'F', roman: 'IV', beats: 5, pitches: ['F3', 'A3', 'C4'] },
    ],
  ),
];
