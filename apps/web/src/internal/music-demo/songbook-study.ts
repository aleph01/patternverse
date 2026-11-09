import type {
  MusicExample,
  MusicSection,
  MusicTrack,
  MusicRecording,
  Note,
} from '../../lib/music/model';
import { recordingClock } from '../../lib/music/recording-timing';

export type SongbookPlan = {
  id: string;
  title: string;
  artist: string;
  description?: string;
  source?: string | null;
  credit?: string | null;
  mapStatus?: string;
  review?: string;
  sections?: { start: number; label: string; description?: string }[];
  omitTracks?: number[];
  percussionTracks?: number[];
  trackLabels?: Record<string, string>;
  recording?: MusicRecording;
};
export type SourceTrack = { index: number; label: string };

const kit = (midi: number) =>
  [35, 36].includes(midi)
    ? ('kick' as const)
    : [38, 39, 40].includes(midi)
      ? ('snare' as const)
      : [42, 44, 46, 49, 51, 52, 53, 55, 57, 59].includes(midi)
        ? ('hat' as const)
        : ('click' as const);

/** Editorial maps share the imported MIDI's beat coordinates, including pickups and meter changes. */
export function songbookStudy(
  source: MusicExample,
  plan: SongbookPlan,
  sourceTracks: SourceTrack[] = [],
): MusicExample {
  const beats = source.beats;
  if (
    !plan.sections?.length ||
    plan.sections[0].start !== 0 ||
    plan.sections.some(
      (section, i, sections) =>
        !section.label.trim() ||
        !Number.isFinite(section.start) ||
        section.start < 0 ||
        section.start >= beats ||
        (i > 0 && section.start <= sections[i - 1].start),
    )
  )
    throw new Error(`${plan.title}: section starts must cover the arrangement in order from zero.`);

  const sections: MusicSection[] = plan.sections.map((section, i, all) => ({
    ...section,
    end: all[i + 1]?.start ?? beats,
    description:
      section.description ??
      (plan.mapStatus === 'source-markers'
        ? 'This boundary comes from a source MIDI section marker.'
        : 'Working section map for this MIDI arrangement. Section names and boundaries are open for review.'),
  }));
  const tracks = new Map<string, MusicTrack>();
  const notes: Note[] = [];
  let otherPercussion = false;
  for (const note of source.notes) {
    const index = Number(/^midi-(\d+)(?:-|$)/.exec(note.part)?.[1]);
    if (!Number.isInteger(index) || plan.omitTracks?.includes(index)) continue;
    const percussive = Boolean(note.drum || plan.percussionTracks?.includes(index));
    if (percussive) {
      const drum = kit(note.midi);
      otherPercussion ||= drum === 'click';
      const id = `drums-${drum}`;
      tracks.set(id, {
        id,
        label: { kick: 'Kick', snare: 'Snare', hat: 'Hat / cymbal', click: 'Other percussion' }[
          drum
        ],
        drum,
      });
      notes.push({ ...note, part: id, drum });
    } else {
      const track = source.tracks?.find((track) => track.id === note.part);
      const label =
        plan.trackLabels?.[String(index)] ??
        sourceTracks.find((track) => track.index === index)?.label ??
        track?.label ??
        `Part ${index + 1}`;
      tracks.set(note.part, { id: note.part, label, instrument: 'piano' });
      notes.push({ ...note });
    }
  }
  if (!notes.some((note) => !note.drum)) throw new Error(`${plan.title}: no pitched parts remain.`);
  if (plan.recording) recordingClock(source, plan.recording);
  // Do not infer harmony or a tonal key from an arranger's default C-major header.
  return {
    ...source,
    id: `${plan.id}-study`,
    title: `${plan.artist} — ${plan.title} · MIDI study`,
    description:
      plan.description ??
      (plan.mapStatus === 'source-markers'
        ? 'Full-length MIDI arrangement with source section markers. Click a section to explore its parts and drums.'
        : 'Full-length MIDI arrangement · working section map. Click a section to explore its parts and drums.'),
    key: 'Key unreviewed',
    notes,
    tracks: [...tracks.values()],
    sections,
    chords: [],
    harmony: [],
    defaultView: 'form',
    defaultPlayback: 'midi',
    notationParts: [...tracks.values()]
      .filter((track) => !track.drum)
      .slice(0, 2)
      .map((t) => t.id),
    source: {
      label: plan.credit ?? 'Community MIDI arrangement',
      ...(plan.source ? { url: plan.source } : {}),
      detail: plan.recording
        ? 'Community MIDI arrangement with a separately linked official recording and recording-specific timing anchors.'
        : 'Private local arrangement review. This is MIDI playback, with no recording or video.',
    },
    recording: plan.recording,
    notices: [
      plan.review ?? 'Section map awaiting a complete listening review.',
      'Source pitches, note onsets, tempo changes and meter changes are retained. Pitched instruments use sampled piano; these are community arrangements rather than original recordings.',
      ...(plan.omitTracks?.length
        ? [
            'Selected duplicate or effect tracks are omitted; the private provenance lists their source track indices.',
          ]
        : []),
      ...(otherPercussion
        ? [
            'Kick, snare and cymbals use the basic kit. Other percussion retains its timing with a neutral click sound.',
          ]
        : []),
      'Harmonic analysis and key labels are pending review; no automatic Roman numerals are asserted. The notes and drum view can already be explored.',
      'Private local review only. Public redistribution permission has not been established; source MIDI and generated studies stay outside the public build.',
    ],
  };
}
