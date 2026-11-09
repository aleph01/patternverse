import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { importMidi } from '../../lib/music/midi';
import type { MusicExample } from '../../lib/music/model';
import { measuresFor } from '../../lib/music/timing';
import { scoreVoices, splitRhythm } from '../../lib/music/score';
import { repertoireCatalog } from './catalog';
import { repertoireExcerpt } from './excerpt';

describe('repertoire passages', () => {
  const audit = JSON.parse(
    readFileSync(
      new URL('../../../../../docs/musical-composition/repertoire-library.json', import.meta.url),
      'utf8',
    ),
  );
  const loaded = new Map<string, MusicExample>();
  for (const entry of repertoireCatalog) {
    const url = new URL(
      `../../../../../${entry.private ? '.local/music-repertoire' : 'docs/musical-composition/midi-research'}/${entry.file}`,
      import.meta.url,
    );
    it.skipIf(entry.private && !existsSync(url))(
      `loads the actual ${entry.id} source with the intended parts and meter`,
      () => {
        const file = readFileSync(url);
        expect(createHash('sha256').update(file).digest('hex')).toBe(
          audit.examples.find((row: { id: string }) => row.id === entry.id).sha256,
        );
        const source = importMidi(Uint8Array.from(file).buffer, entry.file);
        const result = repertoireExcerpt(source, entry);
        loaded.set(entry.id, result);
        expect(result.notes.length).toBeGreaterThan(10);
        expect(result.tracks?.map((track) => track.label)).toEqual(
          entry.parts.map((part) => part.label),
        );
        expect(
          result.notes.every(
            (note) => note.start >= 0 && note.start + note.duration <= entry.beats + 1e-7,
          ),
        ).toBe(true);
        expect(result.beatUnit).toBe(entry.id === 'debussy-clair-de-lune' ? 8 : 4);
        expect(result.beatsPerBar).toBe(
          entry.id === 'debussy-clair-de-lune'
            ? 9
            : entry.id === 'joplin-entertainer' ||
                entry.id.startsWith('mozart-k265-') ||
                entry.id === 'fleetwood-landslide-arrangement'
              ? 2
              : entry.id === 'desmond-take-five'
                ? 5
                : entry.id === 'simon-scarborough-fair'
                  ? 3
                  : 4,
        );
        expect(measuresFor(result)).toHaveLength(
          entry.beats /
            (entry.id === 'debussy-clair-de-lune'
              ? 4.5
              : entry.id === 'joplin-entertainer' ||
                  entry.id.startsWith('mozart-k265-') ||
                  entry.id === 'fleetwood-landslide-arrangement'
                ? 2
                : entry.id === 'simon-scarborough-fair'
                  ? 3
                  : entry.id === 'desmond-take-five'
                    ? 5
                    : 4),
        );
        expect(
          result.notes.every((note) =>
            source.notes.some(
              (original) =>
                original.midi === note.midi &&
                original.velocity === note.velocity &&
                Math.abs(Math.max(entry.start, original.start) - entry.start - note.start) < 1e-7,
            ),
          ),
        ).toBe(true);
      },
    );
  }

  it('covers thirty-one distinct excerpts with valid lesson and pattern references', () => {
    const chapters = JSON.parse(
      readFileSync(
        new URL('../../../../../docs/songwriting-course/chapters.json', import.meta.url),
        'utf8',
      ),
    ).chapters;
    const patterns = JSON.parse(
      readFileSync(
        new URL('../../../../../docs/musical-composition/collection-map.json', import.meta.url),
        'utf8',
      ),
    ).candidates;
    expect(repertoireCatalog).toHaveLength(31);
    expect(new Set(repertoireCatalog.map((entry) => entry.id)).size).toBe(31);
    for (const entry of repertoireCatalog) {
      expect(entry.lessons?.length).toBeGreaterThan(0);
      for (const lesson of entry.lessons ?? [])
        expect(
          chapters.some(
            (c: { id: string; title: string }) => c.id === lesson.id && c.title === lesson.title,
          ),
        ).toBe(true);
      for (const pattern of entry.patterns ?? [])
        expect(patterns.some((p: { key: string }) => p.key === pattern)).toBe(true);
    }
  });

  it('retains the familiar riff and bass shapes, borrowed tone, modal sixth and four-against-three', () => {
    const seven = loaded.get('white-stripes-seven-nation-army');
    if (seven)
      expect(
        seven.notes
          .filter((note) => note.part === 'bass')
          .slice(0, 7)
          .map((note) => note.midi),
      ).toEqual([40, 40, 43, 40, 38, 36, 35]);
    const billie = loaded.get('jackson-billie-jean');
    if (billie)
      expect(
        billie.notes
          .filter((note) => note.part === 'bass')
          .slice(0, 8)
          .map((note) => note.midi),
      ).toEqual([42, 37, 40, 42, 40, 37, 35, 37]);
    const radiohead = loaded.get('radiohead-no-surprises');
    if (radiohead)
      expect(radiohead.notes.some((note) => note.midi === 73 && note.pitch === 'Db5')).toBe(true);
    const scarborough = loaded.get('simon-scarborough-fair');
    if (scarborough)
      expect(
        [...new Set(scarborough.notes.map((note) => note.midi % 12))].sort((a, b) => a - b),
      ).toEqual([1, 2, 4, 6, 7, 9, 11]);
    const chopin = loaded.get('chopin-fantaisie-impromptu')!;
    const starts = (part: string) => [
      ...new Set(
        chopin.notes
          .filter((note) => note.part === part && note.start >= 1 && note.start < 2)
          .map((note) => note.start),
      ),
    ];
    expect(starts('melody')).toEqual([1, 1.25, 1.5, 1.75]);
    expect(starts('accompaniment')).toHaveLength(3);
    expect(starts('accompaniment')[1]).toBeCloseTo(4 / 3);
    const left = chopin.tracks!.find((track) => track.id === 'accompaniment')!;
    const written = scoreVoices(chopin, left, measuresFor(chopin)[0]);
    expect(written).toHaveLength(1);
    expect(written[0]).toHaveLength(12);
    expect(written[0].flatMap(splitRhythm).every((piece) => piece.triplet)).toBe(true);
  });

  it('keeps the new swing, actual key change, inversion and layer-entrance relationships', () => {
    const fly = loaded.get('sinatra-fly-me-to-the-moon');
    if (fly) {
      const bass = fly.notes.filter((note) => note.part === 'bass');
      expect(bass.slice(0, 8).map((note) => note.start)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(
        fly.notes.some(
          (note) => note.part === 'melody' && Math.abs((note.start % 1) - 2 / 3) < 1e-7,
        ),
      ).toBe(true);
    }
    const mirror = loaded.get('jackson-man-in-the-mirror');
    if (mirror) {
      expect(mirror.notationParts).toEqual(['melody', 'return', 'accompaniment', 'bass']);
      expect(mirror.notes.some((note) => note.drum)).toBe(true);
      const firstBass = (start: number) =>
        mirror.notes.find(
          (note) => note.part === 'bass' && note.start >= start && note.start < start + 0.1,
        )!.midi;
      expect(firstBass(0)).toBe(31);
      expect(firstBass(32)).toBe(32);
      const chord = (start: number) =>
        new Set(
          mirror.notes
            .filter(
              (note) =>
                note.part === 'accompaniment' && note.start >= start && note.start < start + 0.1,
            )
            .map((note) => note.midi % 12),
        );
      expect(chord(0)).toEqual(new Set([9, 11, 2, 7]));
      expect(chord(32)).toEqual(new Set([8, 10, 0, 3]));
      expect(mirror.notes.some((note) => note.part === 'melody' && note.start < 32)).toBe(true);
      expect(mirror.notes.some((note) => note.part === 'return' && note.start >= 32)).toBe(true);
    }
    const god = loaded.get('beachboys-god-only-knows');
    if (god) {
      const bass = [0, 4, 8, 12].map(
        (start) =>
          god.notes.find((note) => note.part === 'bass' && Math.abs(note.start - start) < 0.01)!
            .midi,
      );
      expect(bass).toEqual([33, 32, 30, 28]);
      const secondChord = new Set(
        god.notes
          .filter((note) => note.part === 'accompaniment' && note.start >= 4 && note.start < 4.1)
          .map((note) => note.midi % 12),
      );
      expect(secondChord).toEqual(new Set([4, 8, 11]));
    }
    const dancing = loaded.get('abba-dancing-queen');
    if (dancing) {
      expect(
        Math.min(
          ...dancing.notes.filter((note) => note.part === 'strings').map((note) => note.start),
        ),
      ).toBeCloseTo(47.958333, 5);
      const mean = (start: number, end: number) => {
        const notes = dancing.notes.filter(
          (note) => note.part === 'melody' && note.start >= start && note.start < end,
        );
        return notes.reduce((sum, note) => sum + note.midi, 0) / notes.length;
      };
      expect(mean(40, 64)).toBeGreaterThan(mean(0, 32));
    }
  });

  it('retains ninth-chord color, staggered layer entries and the section tempo change', () => {
    const lovely = loaded.get('wonder-isnt-she-lovely');
    if (lovely) {
      const chord = new Set(
        lovely.notes
          .filter((note) => note.part === 'accompaniment' && note.start < 0.1)
          .map((note) => note.midi % 12),
      );
      expect(chord).toEqual(new Set([3, 11, 8, 4]));
      expect(
        [0, 4, 8, 12].map(
          (start) =>
            lovely.notes.find(
              (note) => note.part === 'bass' && note.start >= start && note.start < start + 0.1,
            )!.midi,
        ),
      ).toEqual([37, 30, 35, 40]);
    }
    const around = loaded.get('daft-punk-around-the-world');
    if (around) {
      for (const [part, start] of [
        ['second', 8],
        ['middle', 48],
        ['melody', 81.5],
      ] as const)
        expect(
          Math.min(...around.notes.filter((note) => note.part === part).map((note) => note.start)),
        ).toBeCloseTo(start);
      expect(around.notes.some((note) => note.drum)).toBe(true);
    }
    const queen = loaded.get('queen-bohemian-rhapsody');
    if (queen) {
      expect(queen.tempos).toHaveLength(2);
      expect(queen.tempos![0].bpm).toBeCloseTo(124, 2);
      expect(queen.tempos![1].beat).toBe(30.5);
      expect(queen.tempos![1].bpm).toBeCloseTo(176, 1);
      expect(
        Math.min(
          ...queen.notes.filter((note) => note.part === 'guitar-chords').map((note) => note.start),
        ),
      ).toBeCloseTo(30.020833, 5);
    }
    for (const example of [lovely, around, queen]) {
      if (!example) continue;
      for (const track of example.tracks ?? []) {
        if (example.notationParts && !example.notationParts.includes(track.id)) continue;
        for (const bar of measuresFor(example))
          expect(() =>
            scoreVoices(example, track, bar).flatMap((voice) => voice.flatMap(splitRhythm)),
          ).not.toThrow();
      }
    }
  });

  it('carries the active tempo and meter into a cut, preserves changes, and trims held notes', () => {
    const source: MusicExample = {
      id: 'fixture',
      title: 'Fixture',
      description: '',
      key: 'C major',
      tempo: 60,
      beatsPerBar: 4,
      beats: 20,
      chords: [],
      tracks: [
        { id: 'voice', label: 'Voice' },
        { id: 'omit', label: 'Omit' },
      ],
      notes: [
        { midi: 60, pitch: 'C4', part: 'voice', start: 3, duration: 3, velocity: 0.6 },
        { midi: 67, pitch: 'G4', part: 'voice', start: 11, duration: 4, velocity: 0.8 },
        { midi: 48, pitch: 'C3', part: 'omit', start: 4, duration: 1 },
      ],
      tempos: [
        { beat: 0, bpm: 60 },
        { beat: 3, bpm: 90 },
        { beat: 6, bpm: 120 },
      ],
      meters: [
        { beat: 0, numerator: 4, denominator: 4 },
        { beat: 3, numerator: 3, denominator: 4 },
        { beat: 9, numerator: 6, denominator: 8 },
      ],
    };
    const entry = {
      ...repertoireCatalog[0],
      start: 4,
      beats: 8,
      parts: [{ source: 'voice', id: 'melody', label: 'Melody' }],
    };
    const result = repertoireExcerpt(source, entry);
    expect(
      result.notes.map((note) => [note.start, note.duration, note.midi, note.velocity]),
    ).toEqual([
      [0, 2, 60, 0.6],
      [7, 1, 67, 0.8],
    ]);
    expect(result.tempos).toEqual([
      { beat: 0, bpm: 90 },
      { beat: 2, bpm: 120 },
    ]);
    expect(result.meters).toEqual([
      { beat: 0, numerator: 3, denominator: 4 },
      { beat: 5, numerator: 6, denominator: 8 },
    ]);
    expect(source.notes[0].duration).toBe(3);
    expect(() => repertoireExcerpt(source, { ...entry, beats: 100 })).toThrow(/outside/);
    expect(() =>
      repertoireExcerpt(source, {
        ...entry,
        parts: [{ source: 'absent', id: 'melody', label: 'Melody' }],
      }),
    ).toThrow(/missing/);
  });
});
