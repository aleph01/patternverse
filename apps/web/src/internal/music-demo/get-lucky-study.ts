import type { MusicExample } from '../../lib/music/model';
import { repertoireCatalog } from './catalog';
import { repertoireExcerpt } from './excerpt';

/** A bounded opening study, not a fabricated full-song map or original session MIDI. */
export function getLuckyStudy(source: MusicExample): MusicExample {
  const entry = repertoireCatalog.find((item) => item.id === 'daft-get-lucky')!;
  const excerpt = repertoireExcerpt(source, { ...entry, beats: 32 });
  const names = ['Bm', 'D', 'F#m', 'E'],
    romans = ['i', 'III', 'v', 'IV'];
  const notes = excerpt.notes.flatMap((note) => {
    if (!note.drum) {
      // Chord-reference pedal tails must not turn the next triad into a false slash chord.
      const duration =
        note.part === 'accompaniment'
          ? Math.min(note.duration, (Math.floor(note.start / 4) + 1) * 4 - note.start)
          : note.duration;
      return [{ ...note, duration }];
    }
    const start = Math.round(note.start * 2) / 2;
    // Only the core eighth-note groove: omit humanized fills and subdivisions.
    return Math.abs(note.start - start) < 0.035 && start < 32
      ? [{ ...note, start, duration: Math.min(0.2, note.duration, 32 - start) }]
      : [];
  });
  return {
    ...excerpt,
    id: 'daft-get-lucky-opening-study',
    title: 'Daft Punk — Get Lucky · opening study',
    description:
      'Explore two passes through Bm–D–F♯m–E. Click a passage for chords and a simplified drum groove. Playback uses the sampled piano and basic drums.',
    key: 'B Dorian',
    // The recording uses a steady 116 bpm. The provider demo's 116.05 is normalized here.
    tempo: 116,
    tempos: [{ beat: 0, bpm: 116 }],
    notes,
    harmony: Array.from({ length: 8 }, (_, i) => ({
      start: i * 4,
      duration: 4,
      name: names[i % 4],
      roman: romans[i % 4],
      parts: ['accompaniment'],
    })),
    sections: [
      {
        label: 'Opening loop',
        start: 0,
        end: 16,
        description:
          'Four chords, one bar each. The kick marks the pulse; the guitar fills the spaces around it.',
      },
      {
        label: 'Loop returns',
        start: 16,
        end: 32,
        description:
          'The same harmony returns. Listen for what the performance adds above the repeating foundation.',
      },
    ],
    defaultView: 'form',
    defaultPlayback: 'midi',
    notationParts: ['accompaniment', 'bass'],
    source: {
      label: 'MIDI DB · groove reduction',
      url: 'https://www.mididb.com/daft-punk/get-lucky-midi/',
      detail: 'MIDI DB provider demo, locally held. Opening study only; not original session MIDI.',
    },
    notices: [
      'Eight-bar opening study, not a map of the whole song. Passage labels describe the repeated loop, not verse/chorus boundaries.',
      'MIDI DB provider-demo reduction: chord reference, guitar, bass and basic kit. Vocals and doubled parts are omitted. Private local review; MIDI is not bundled with the public application.',
      'Drums are reduced to an eighth-note grid; off-grid fills are omitted. Chord-reference sustain is clipped at chord changes. MIDI timing is normalized to 116 bpm.',
      'B Dorian is the reading used for i–III–v–IV; this repeating loop can support more than one tonal interpretation.',
    ],
  };
}
