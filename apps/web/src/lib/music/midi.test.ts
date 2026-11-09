import { Midi } from '@tonejs/midi';
import { describe, expect, it } from 'vitest';
import { importMidi, MAX_MIDI_BYTES } from './midi';
import { clockFor, measuresFor } from './timing';
import { scoreVoices } from './score';

function fixture() {
  const midi = new Midi();
  midi.header.setTempo(120);
  midi.header.timeSignatures = [{ ticks: 0, timeSignature: [3, 4] }];
  const lead = midi.addTrack();
  lead.name = 'Lead';
  lead.channel = 0;
  lead.addNote({ midi: 60, ticks: 0, durationTicks: 480, velocity: 0.6 });
  const bass = midi.addTrack();
  bass.name = 'Low line';
  bass.channel = 1;
  bass.instrument.number = 33;
  bass.addNote({ midi: 36, ticks: 720, durationTicks: 720, velocity: 0.8 });
  return midi;
}
const bytes = (m: Midi) => new Uint8Array(m.toArray()).buffer;
describe('local MIDI import', () => {
  it('retains track identity, timing, duration, velocity and changing tempo/meter', () => {
    const midi = fixture();
    midi.header.tempos = [
      { ticks: 0, bpm: 120 },
      { ticks: 480, bpm: 60 },
    ];
    midi.header.timeSignatures.push({ ticks: 1440, timeSignature: [6, 8] });
    midi.header.update();
    const result = importMidi(bytes(midi), 'Original study.mid');
    expect(result.title).toBe('Original study');
    expect(result.tracks?.map((t) => t.label)).toEqual(['Lead', 'Low line']);
    expect(result.notes.map((n) => [n.start, n.duration, n.midi])).toEqual([
      [0, 1, 60],
      [1.5, 1.5, 36],
    ]);
    expect(result.notes[0].velocity).toBeCloseTo(0.6, 1);
    expect(result.tracks?.[1].instrument).toBe('bass-guitar');
    expect(clockFor(result).seconds(3)).toBeCloseTo(2.5);
    expect(measuresFor(result)[0].numerator).toBe(3);
    expect(result.source?.detail).toMatch(/not uploaded/);
  });
  it('maps percussion by MIDI note and reports approximated sounds', () => {
    const midi = fixture(),
      drums = midi.addTrack();
    drums.channel = 9;
    for (const [i, midi] of [36, 38, 42, 81].entries())
      drums.addNote({ midi, ticks: i * 240, durationTicks: 80, velocity: 0.7 });
    const result = importMidi(bytes(midi), 'drums.mid');
    expect(result.notes.filter((n) => n.drum).map((n) => n.drum)).toEqual([
      'kick',
      'snare',
      'hat',
      'click',
    ]);
    expect(new Set(result.notes.filter((n) => n.drum).map((n) => n.part)).size).toBe(4);
    expect(result.notices?.join(' ')).toMatch(/neutral click/);
  });
  it('extends held notes to pedal release and discloses unsupported controllers', () => {
    const midi = fixture(),
      track = midi.tracks[0];
    track.addCC({ number: 64, ticks: 0, value: 1 });
    track.addCC({ number: 64, ticks: 960, value: 0 });
    track.addCC({ number: 1, ticks: 0, value: 0.4 });
    const result = importMidi(bytes(midi), 'pedal.mid');
    expect(result.notes.find((n) => n.midi === 60)?.duration).toBe(2);
    expect(result.notes.find((n) => n.midi === 60)?.writtenDuration).toBe(1);
    expect(
      scoreVoices(result, result.tracks![0], measuresFor(result)[0])[0].find((event) =>
        event.pitches.includes('C4'),
      )?.duration,
    ).toBe(1);
    expect(result.notices?.join(' ')).toMatch(/controllers other than sustain/);
  });
  it('rejects malformed, empty, oversized and independent-sequence input with a useful message', () => {
    expect(() => importMidi(new ArrayBuffer(5), 'bad.mid')).toThrow(/not a standard MIDI/);
    expect(() => importMidi(new ArrayBuffer(MAX_MIDI_BYTES + 1), 'large.mid')).toThrow(/1 MB/);
    expect(() => importMidi(bytes(new Midi()), 'empty.mid')).toThrow(/no playable notes/);
    const raw = bytes(fixture());
    new DataView(raw).setUint16(8, 2);
    expect(() => importMidi(raw, 'sequences.mid')).toThrow(/format 2/);
  });
});
