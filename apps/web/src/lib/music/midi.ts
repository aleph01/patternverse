import { Midi } from '@tonejs/midi';
import type { DrumSound, MusicExample, MusicTrack, Note } from './model';
import { pitchLabel } from './examples';

export const MAX_MIDI_BYTES = 1_000_000;
const drumNames: Record<number, [string, DrumSound]> = {
  35: ['Acoustic kick', 'kick'],
  36: ['Kick', 'kick'],
  38: ['Snare', 'snare'],
  40: ['Electric snare', 'snare'],
  42: ['Closed hi-hat', 'hat'],
  44: ['Pedal hi-hat', 'hat'],
  46: ['Open hi-hat', 'hat'],
  39: ['Clap', 'snare'],
};

/** Local-only import. Retain musical time; never silently quantize a performance. */
export function importMidi(bytes: ArrayBuffer, filename: string): MusicExample {
  if (bytes.byteLength > MAX_MIDI_BYTES) throw new Error('Choose a MIDI file smaller than 1 MB.');
  const data = new DataView(bytes);
  if (bytes.byteLength < 14 || data.getUint32(0) !== 0x4d546864 || data.getUint32(4) !== 6)
    throw new Error('This is not a standard MIDI file.');
  if (data.getUint16(8) > 1)
    throw new Error(
      'Use a format 0 or format 1 MIDI file. Independent format 2 sequences are not supported.',
    );
  if (!data.getUint16(12) || data.getUint16(12) & 0x8000)
    throw new Error('Use a MIDI file with musical beat timing, rather than SMPTE timecode.');
  let midi: Midi;
  try {
    midi = new Midi(bytes);
  } catch {
    throw new Error('This MIDI file could not be read. Try exporting it again.');
  }
  const ppq = midi.header.ppq,
    notes: Note[] = [],
    tracks: MusicTrack[] = [],
    notices = new Set<string>();
  if (midi.tracks.reduce((sum, track) => sum + track.notes.length, 0) > 20000)
    throw new Error('Choose a shorter excerpt with fewer than 20,000 notes.');
  for (const [i, track] of midi.tracks.entries()) {
    if (!track.notes.length) continue;
    const percussive = track.instrument.percussion || track.channel === 9;
    const pedal = track.controlChanges[64] ?? [];
    const lowerBound = (events: { ticks: number }[], ticks: number) => {
      let lo = 0,
        hi = events.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (events[mid].ticks < ticks) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };
    const releases = pedal.filter((event) => event.value < 0.5);
    const byPitch = new Map<number, typeof track.notes>();
    for (const note of track.notes) {
      const group = byPitch.get(note.midi) ?? [];
      group.push(note);
      byPitch.set(note.midi, group);
    }
    const endings = (note: (typeof track.notes)[number]) => {
      let end = note.ticks + note.durationTicks;
      const held = pedal[lowerBound(pedal, end + 1) - 1]?.value ?? 0;
      if (held >= 0.5) {
        const release =
          releases[lowerBound(releases, end + 1)]?.ticks ??
          Math.max(track.durationTicks, track.endOfTrackTicks ?? 0);
        const samePitch = byPitch.get(note.midi)!;
        const next =
          samePitch[lowerBound(samePitch, Math.max(end, note.ticks + 1))]?.ticks ?? release;
        end = Math.max(end, Math.min(release, next));
      }
      return end;
    };
    const ids = new Set<string>();
    for (const n of track.notes) {
      if (
        !Number.isFinite(n.ticks) ||
        !Number.isFinite(n.durationTicks) ||
        n.ticks < 0 ||
        n.durationTicks <= 0 ||
        !Number.isInteger(n.midi) ||
        n.midi < 0 ||
        n.midi > 127
      )
        throw new Error('The MIDI contains invalid note timing or pitch data.');
      const id = percussive ? `midi-${i}-drum-${n.midi}` : `midi-${i}`;
      const drum = drumNames[n.midi];
      if (!ids.has(id)) {
        ids.add(id);
        tracks.push({
          id,
          label: percussive
            ? (drum?.[0] ?? `Percussion ${n.midi}`)
            : track.name.trim().slice(0, 80) || `Part ${i + 1}`,
          instrument:
            track.instrument.family === 'bass'
              ? 'bass-guitar'
              : track.instrument.family === 'guitar'
                ? 'guitar'
                : 'piano',
          ...(percussive ? { drum: drum?.[1] ?? 'click' } : {}),
        });
      }
      if (percussive && !drum)
        notices.add(
          'Some percussion sounds use a neutral click; their original MIDI pitches are retained.',
        );
      notes.push({
        pitch: pitchLabel(n.midi).replace('♯', '#'),
        midi: n.midi,
        start: n.ticks / ppq,
        duration: (percussive ? n.durationTicks : endings(n) - n.ticks) / ppq,
        ...(!percussive ? { writtenDuration: n.durationTicks / ppq } : {}),
        part: id,
        velocity: n.velocity,
        ...(percussive ? { drum: drum?.[1] ?? 'click' } : {}),
      });
    }
    if (
      track.pitchBends.length ||
      Object.keys(track.controlChanges).some((key) => Number(key) !== 64)
    )
      notices.add(
        'Pitch bends and controllers other than sustain are not reproduced by these synthesized sounds.',
      );
  }
  if (!notes.length) throw new Error('This MIDI has no playable notes.');
  if (tracks.length > 32)
    throw new Error('Choose an excerpt with no more than 32 parts or percussion lanes.');
  const tempos = midi.header.tempos.map((t) => ({ beat: t.ticks / ppq, bpm: t.bpm }));
  const meters = midi.header.timeSignatures.map((t) => ({
    beat: t.ticks / ppq,
    numerator: t.timeSignature[0],
    denominator: t.timeSignature[1],
  }));
  if (
    tempos.some(
      (t) =>
        !Number.isFinite(t.beat) ||
        t.beat < 0 ||
        !Number.isFinite(t.bpm) ||
        t.bpm < 10 ||
        t.bpm > 400,
    ) ||
    meters.some(
      (t) =>
        !Number.isFinite(t.beat) ||
        t.beat < 0 ||
        !Number.isInteger(t.numerator) ||
        t.numerator < 1 ||
        t.numerator > 16 ||
        ![1, 2, 4, 8, 16, 32].includes(t.denominator),
    )
  )
    throw new Error('This excerpt uses tempo or meter values outside the supported range.');
  const firstMeter = meters.findLast((t) => t.beat === 0) ?? { numerator: 4, denominator: 4 };
  const beats = Math.max(...notes.map((n) => n.start + n.duration));
  if (beats > 4096) throw new Error('Choose an excerpt shorter than 4,096 quarter-note beats.');
  const key = midi.header.keySignatures[0];
  notices.add(
    'Notation is a quantized reading guide. The piano roll and playback retain the imported timing; pitch spelling and voice assignment have not been reviewed.',
  );
  return {
    id: 'local-midi',
    title: filename.replace(/\.midi?$/i, '').slice(0, 120),
    description: 'Your local MIDI excerpt. Follow a part, isolate a voice, or switch views.',
    key: key ? `${key.key} ${key.scale}` : 'Imported MIDI',
    tempo: tempos.findLast((t) => t.beat === 0)?.bpm ?? 120,
    beatsPerBar: firstMeter.numerator,
    beatUnit: firstMeter.denominator,
    beats,
    notes: notes.sort((a, b) => a.start - b.start),
    chords: [],
    tracks,
    tempos,
    meters,
    defaultView: tracks.every((t) => t.drum) ? 'grid' : 'roll',
    source: {
      label: 'Your local MIDI',
      detail: 'Stays on this device; not uploaded or added to the public library.',
    },
    notices: [...notices],
  };
}
