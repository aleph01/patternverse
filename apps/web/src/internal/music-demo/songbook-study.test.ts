import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { Midi } from '@tonejs/midi';
import type { MusicExample } from '../../lib/music/model';
import { formLayers } from '../../lib/music/form';
import { clockFor, measuresFor } from '../../lib/music/timing';
import { recordingClock } from '../../lib/music/recording-timing';
import { songbookStudy, type SongbookPlan } from './songbook-study';
import songbook from '../../../../../docs/music-course/songbook.json';

const source: MusicExample = {
  id: 'local-midi',
  title: 'source',
  description: '',
  key: 'C major',
  tempo: 100,
  beatsPerBar: 4,
  beats: 12,
  chords: [],
  tracks: [
    { id: 'midi-0', label: 'Piano' },
    { id: 'midi-1', label: 'DRUMS' },
  ],
  notes: [
    { part: 'midi-0', pitch: 'C4', midi: 60, start: 0.125, duration: 2.5 },
    { part: 'midi-1', pitch: 'C2', midi: 36, start: 5.75, duration: 0.125 },
    { part: 'midi-1', pitch: 'D2', midi: 38, start: 6.5, duration: 0.25 },
    { part: 'midi-1', pitch: 'F#2', midi: 42, start: 6.75, duration: 0.125 },
  ],
  tempos: [
    { beat: 0, bpm: 100 },
    { beat: 8, bpm: 80 },
  ],
  meters: [
    { beat: 0, numerator: 4, denominator: 4 },
    { beat: 8, numerator: 3, denominator: 4 },
  ],
};
const plan: SongbookPlan = {
  id: 'test',
  title: 'Test song',
  artist: 'Test artist',
  mapStatus: 'draft',
  sections: [
    { start: 0, label: 'Intro' },
    { start: 5.5, label: 'Verse' },
  ],
  percussionTracks: [1],
};
describe('private songbook preparation', () => {
  it('preserves pickup timing and changing meter/tempo, with a contiguous complete section map', () => {
    const study = songbookStudy(source, plan);
    expect(study.sections?.map((s) => [s.start, s.end])).toEqual([
      [0, 5.5],
      [5.5, 12],
    ]);
    expect(study.notes.map((n) => [n.start, n.duration])).toEqual(
      source.notes.map((n) => [n.start, n.duration]),
    );
    expect(clockFor(study).seconds(12)).toBeCloseTo(clockFor(source).seconds(12));
    expect(measuresFor(study)).toEqual(measuresFor(source));
    expect(study.key).toBe('Key unreviewed');
    expect(study.harmony).toEqual([]);
    expect(study.recording).toBeUndefined();
    expect(study.description).toContain('working section map');
  });
  it('groups percussion on non-GM channels without losing the source drum hits', () => {
    const study = songbookStudy(source, plan);
    expect(study.notes.filter((n) => n.drum).map((n) => n.drum)).toEqual(['kick', 'snare', 'hat']);
    expect(formLayers(study).map((l) => l.label)).toEqual(['Piano', 'Drums']);
    expect(source.notes[1].part).toBe('midi-1');
  });
  it('links a recording with its own clock without changing MIDI timing or inventing chord labels', () => {
    const recording = {
      src: 'https://www.youtube.com/watch?v=7TDeBi34OtE',
      label: 'Official',
      youtubeId: '7TDeBi34OtE',
      alignment: [
        { beat: 0, seconds: 0 },
        { beat: 5.5, seconds: 8 },
        { beat: 12, seconds: 20 },
      ],
    };
    const study = songbookStudy(source, { ...plan, recording });
    expect(study.recording).toEqual(recording);
    expect(recordingClock(study, recording).seconds(5.5)).toBe(8);
    expect(study.notes.map((n) => n.start)).toEqual(source.notes.map((n) => n.start));
    expect(study.tempos).toEqual(source.tempos);
    expect(study.defaultPlayback).toBe('midi');
    expect(study.harmony).toEqual([]);
    const pilot = songbook.songs.find((s) => s.id === 'nirvana-smells-like-teen-spirit')!;
    expect(pilot.recording?.alignmentStatus).toBe('draft');
    expect(pilot.recording?.alignment.slice(0, -1).map((a) => a.beat)).toEqual(
      pilot.sections?.map((s) => s.start),
    );
  });
  it('retains arrangement-specific descriptions without asserting a full-song transcription', () => {
    const study = songbookStudy(source, {
      ...plan,
      description: 'Fan arrangement · draft section map.',
      sections: [
        { start: 0, label: 'Opening figure', description: 'The repeating figure starts alone.' },
      ],
    });
    expect(study.description).toBe('Fan arrangement · draft section map.');
    expect(study.sections?.[0].description).toBe('The repeating figure starts alone.');
  });
  it('omits only explicitly reviewed source tracks and rejects invalid section maps', () => {
    expect(songbookStudy(source, { ...plan, omitTracks: [1] }).notes).toHaveLength(1);
    for (const sections of [
      [],
      [{ start: 1, label: 'Intro' }],
      [
        { start: 0, label: 'Intro' },
        { start: 12, label: 'Ending' },
      ],
      [
        { start: 0, label: 'Intro' },
        { start: 0, label: 'Verse' },
      ],
    ])
      expect(() => songbookStudy(source, { ...plan, sections })).toThrow('section starts');
  });
  it('tracks the approved shortlist and Swans addition, leaving missing full files pending', () => {
    expect(songbook.songs).toHaveLength(38);
    expect(new Set(songbook.songs.map((s) => s.id)).size).toBe(38);
    expect(songbook.songs.find((s) => s.id === 'swans-screen-shot')?.mapStatus).toBe(
      'layer-aligned',
    );
    expect(
      songbook.songs.some((s) =>
        /get.lucky|creep|dua.lipa/i.test(`${s.id} ${s.artist} ${s.title}`),
      ),
    ).toBe(false);
    expect(songbook.songs.filter((s) => s.state === 'pending-access').map((s) => s.id)).toEqual([
      'eilish-happier-than-ever',
      'boniver-holocene',
    ]);
  });
});

const repository = resolve(process.cwd(), '../..');
const prepared = resolve(repository, '.local/music-song-studies/songbook');
describe.skipIf(!existsSync(resolve(prepared, 'index.json')))('acquired local arrangements', () => {
  it('maps Screen Shot to the actual layer entries, breakdown and ending in its source MIDI', () => {
    const study: MusicExample = JSON.parse(
      readFileSync(resolve(prepared, 'swans-screen-shot.json'), 'utf8'),
    );
    expect(study.sections?.map((section) => section.start)).toEqual([
      0, 96, 192, 288, 384, 480, 576, 624, 672,
    ]);
    expect(study.beats).toBe(777.5);
    expect(study.beatsPerBar).toBe(3);
    expect(study.notes).toHaveLength(12039);
    expect(clockFor(study).seconds(study.beats)).toBeCloseTo(328.5209625, 6);
    const first = (part: string) => study.notes.find((note) => note.part === part)?.start;
    expect(first('midi-1')).toBe(96);
    expect(first('midi-8')).toBe(384);
    expect(first('midi-9')).toBe(576);
    expect(
      Math.max(...study.notes.filter((n) => n.part === 'midi-0').map((n) => n.start + n.duration)),
    ).toBe(576);
    expect(
      study.notes
        .filter((n) => n.start >= 576 && n.start < 624 && !n.drum)
        .every((n) => n.part === 'midi-9'),
    ).toBe(true);
    for (const part of ['midi-5', 'midi-6', 'midi-7', 'midi-8'])
      expect(study.notes.some((n) => n.part === part && n.start === 672)).toBe(true);
    expect(formLayers(study).filter((layer) => layer.label === 'Drums')).toHaveLength(1);
    expect(study.sections?.some((s) => /verse|chorus/i.test(s.label))).toBe(false);
  });
  const plans = songbook.songs.filter((s) => s.state === 'prepared-draft');
  for (const plan of plans)
    it(`${plan.artist} — ${plan.title}: covers every retained source note and the full timeline`, () => {
      const bytes = readFileSync(
        resolve(repository, '.local', plan.directory ?? 'music-repertoire', plan.localFile!),
      );
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(plan.sha256);
      const midi = new Midi(bytes);
      const study: MusicExample = JSON.parse(
        readFileSync(resolve(prepared, `${plan.id}.json`), 'utf8'),
      );
      const provenance = JSON.parse(
        readFileSync(resolve(prepared, `${plan.id}.provenance.json`), 'utf8'),
      );
      const sections = study.sections!;
      expect(sections[0].start).toBe(0);
      expect(sections.at(-1)?.end).toBe(study.beats);
      expect(
        sections.every((s, i) => s.end > s.start && (!i || s.start === sections[i - 1].end)),
      ).toBe(true);
      const retained = midi.tracks.flatMap((t, i) =>
        plan.omitTracks?.includes(i) ? [] : t.notes.filter((n) => n.durationTicks > 0),
      );
      expect(study.notes.length).toBe(retained.length);
      const signature = (pitch: number, start: number, duration: number) =>
        `${pitch}/${start.toFixed(6)}/${duration.toFixed(6)}`;
      const attacks = new Set(
        retained.map((n) =>
          signature(n.midi, n.ticks / midi.header.ppq, n.durationTicks / midi.header.ppq),
        ),
      );
      expect(
        study.notes.every((n) =>
          attacks.has(signature(n.midi, n.start, n.writtenDuration ?? n.duration)),
        ),
      ).toBe(true);
      expect(study.defaultPlayback).toBe('midi');
      expect(study.recording).toEqual(plan.recording);
      expect(study.harmony).toEqual([]);
      expect(clockFor(study).seconds(midi.durationTicks / midi.header.ppq)).toBeCloseTo(
        midi.duration,
        3,
      );
      expect(provenance.sha256).toBe(plan.sha256);
      expect(provenance.retainedNotes).toBe(study.notes.length);
    });
});
