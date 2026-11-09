import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { importMidi } from './midi';
import { repertoireExcerpt } from '../../internal/music-demo/excerpt';
import { repertoireCatalog } from '../../internal/music-demo/catalog';
import { compositionExamples } from './composition-examples';
import {
  createIntervalLesson,
  createBorrowingLesson,
  createSyncopationLesson,
} from './lesson-pilot';

const source = (id: string) => {
  const entry = repertoireCatalog.find((item) => item.id === id)!;
  const bytes = readFileSync(
    new URL(`../../../../../.local/music-repertoire/${entry.file}`, import.meta.url),
  );
  return repertoireExcerpt(importMidi(Uint8Array.from(bytes).buffer, entry.file), entry);
};
const present = existsSync(
  new URL('../../../../../.local/music-repertoire/withers-lean-on-me-demo.mid', import.meta.url),
);
describe.skipIf(!present)('guided lesson transformations of the local source files', () => {
  it('preserves every interval when transposing Lean on Me and changes only the selected peak pitch in the alternative', () => {
    const original = source('withers-lean-on-me-demo');
    const lesson = createIntervalLesson(original);
    expect(lesson.steps.map((step) => step.id)).toEqual(['listen', 'isolate', 'notice', 'try']);
    expect(new Set(lesson.steps[1].example.notes.map((note) => note.part))).toEqual(
      new Set(['melody']),
    );
    const [a, b, c] = lesson.steps[3].example.variants!;
    const distances = (notes: typeof a.notes) =>
      notes.slice(1).map((note, i) => note.midi - notes[i].midi);
    expect(distances(a.notes)).toEqual(distances(b.notes));
    expect(b.notes.map((note, i) => note.midi - a.notes[i].midi)).toEqual(a.notes.map(() => 2));
    expect(c.notes.map((note, i) => note.midi - a.notes[i].midi)).toEqual(
      a.notes.map((note) => (note.midi === 65 ? 1 : 0)),
    );
    expect(c.notes.map((note) => [note.start, note.duration, note.velocity])).toEqual(
      a.notes.map((note) => [note.start, note.duration, note.velocity]),
    );
    expect(lesson.steps[2].example.beats).toBe(8);
    expect(original.notes.some((note) => note.part === 'accompaniment')).toBe(true);
  });
  it('changes only the borrowed third, retaining source bass, all other pitches and timing', () => {
    const lesson = createBorrowingLesson(source('radiohead-no-surprises'));
    const [major, minor] = lesson.steps[2].example.variants!;
    const changed = major.notes.flatMap((note, i) =>
      note.midi !== minor.notes[i].midi
        ? [{ from: note.midi, to: minor.notes[i].midi, start: note.start }]
        : [],
    );
    expect(changed).toEqual([{ from: 62, to: 61, start: 4 }]);
    const [a, b] = lesson.steps[3].example.variants!;
    expect(a.notes.map((note, i) => note.midi - b.notes[i].midi)).toEqual(
      b.notes.map((note) => (note.midi === 73 ? 1 : 0)),
    );
    expect(a.notes.map((note) => [note.start, note.duration, note.part])).toEqual(
      b.notes.map((note) => [note.start, note.duration, note.part]),
    );
    expect(new Set(lesson.steps[1].example.notes.map((note) => note.part))).toEqual(
      new Set(['melody', 'bass']),
    );
  });
  it('retains the provider groove timing, isolates its beat and moves only the kick in the original comparison', () => {
    const original = source('wonder-superstition-demo');
    const lesson = createSyncopationLesson(
      original,
      compositionExamples.find((item) => item.id === 'syncopation')!,
    );
    const before = original.notes.filter((note) => note.part === 'melody' && note.start < 8);
    const after = lesson.steps[0].example.notes.filter((note) => note.part === 'melody');
    expect(after.map((note, i) => note.midi - before[i].midi)).toEqual(before.map(() => 24));
    expect(after.map((note) => note.start)).toEqual(before.map((note) => note.start));
    expect(lesson.steps[1].example.tracks?.every((track) => Boolean(track.drum))).toBe(true);
    expect(lesson.steps[1].example.notes.every((note) => Boolean(note.drum))).toBe(true);
    expect(lesson.steps[2].example.notes.some((note) => note.part === 'bass')).toBe(false);
    const [a, b] = lesson.steps[3].example.variants!;
    expect(a.notes.filter((note) => note.part !== 'kick')).toEqual(
      b.notes.filter((note) => note.part !== 'kick'),
    );
    expect(a.notes.filter((note) => note.part === 'kick').map((note) => note.start)).toEqual([
      0, 2, 4, 6,
    ]);
    expect(b.notes.filter((note) => note.part === 'kick').map((note) => note.start)).toEqual([
      0, 2.5, 4, 6.5,
    ]);
  });
});
