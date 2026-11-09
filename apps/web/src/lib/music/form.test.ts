import { describe, expect, it } from 'vitest';
import { formExample, layeredEntrances } from './form-examples';
import { formActivity, formLayers, formSections } from './form';
import { withVariant, type MusicExample } from './model';
import { exampleForChapter } from './examples';

describe('whole-piece form and controlled layered entry', () => {
  it('changes only the entrance schedule, with an identical reference and subsequent notes', () => {
    const a = withVariant(formExample, 'a'),
      b = withVariant(formExample, 'b');
    expect(a.notes.filter((n) => n.part === 'figure')).toEqual(
      b.notes.filter((n) => n.part === 'figure'),
    );
    for (const [part, entrance] of Object.entries(layeredEntrances)) {
      const notes = b.notes.filter((n) => n.part === part);
      expect(notes[0].start).toBe(entrance);
      expect(notes).toEqual(a.notes.filter((n) => n.part === part && n.start >= entrance));
    }
    expect([a.tempo, a.beatsPerBar, a.beats, a.tracks]).toEqual([
      b.tempo,
      b.beatsPerBar,
      b.beats,
      b.tracks,
    ]);
    expect(formExample.notes).toEqual(b.notes);
    expect(a.notes.every((n) => n.start >= 0 && n.start + n.duration <= a.beats)).toBe(true);
  });
  it('uses full-passage section coordinates and independent variant labels', () => {
    const a = withVariant(formExample, 'a'),
      b = withVariant(formExample, 'b');
    expect(formSections(b).map((s) => [s.start, s.end])).toEqual([
      [0, 8],
      [8, 16],
      [16, 24],
      [24, 32],
    ]);
    expect(formSections(a)[0].label).toBe('Full texture');
    expect(formSections(b)[0].label).toBe('Figure');
    expect(formSections(b).at(-1)?.end).toBe(b.beats);
    expect(exampleForChapter('songwriting-choose-a-song-form')).toBe(formExample.id);
    expect(exampleForChapter('songwriting-shape-energy-over-time')).toBe(formExample.id);
  });
  it('preserves unequal lengths, clips invalid boundaries, and leaves unannotated examples alone', () => {
    const sections = formSections({
      ...formExample,
      sections: [
        { label: 'B', start: 2, end: 8 },
        { label: 'A', start: -2, end: 2 },
        { label: 'C', start: 8, end: 50 },
        { label: 'Empty', start: 4, end: 4 },
        { label: 'Invalid', start: NaN, end: 7 },
      ],
    });
    expect(sections.map((s) => s.end - s.start)).toEqual([2, 6, 24]);
    expect(formSections({ ...formExample, sections: undefined })).toEqual([]);
  });
  it('shows articulated instrumental passages as continuous blocks', () => {
    const layers = formLayers(formExample);
    expect(layers.find((l) => l.id === 'sustain')?.spans).toEqual([{ start: 16, end: 32 }]);
    expect(layers.find((l) => l.id === 'low')?.spans).toEqual([{ start: 8, end: 31.8 }]);
  });
  it('combines all percussion into one continuous overview, preserving longer breaks and original parts', () => {
    const example: MusicExample = {
      ...formExample,
      beats: 8,
      tracks: [
        { id: 'melody', label: 'Melody' },
        { id: 'kick', label: 'Kick', drum: 'kick' },
        { id: 'snare', label: 'Snare', drum: 'snare' },
        { id: 'cymbal', label: 'Cymbal' },
      ],
      notes: [
        { part: 'melody', pitch: 'C4', midi: 60, start: 0, duration: 8 },
        { part: 'kick', pitch: 'C2', midi: 36, start: -0.1, duration: 0.3 },
        { part: 'snare', pitch: 'D2', midi: 38, start: 0.1, duration: 0.4 },
        { part: 'cymbal', pitch: 'F#2', midi: 42, start: 2, duration: 0.25, drum: 'hat' },
        { part: 'kick', pitch: 'C2', midi: 36, start: 7.9, duration: 1 },
        { part: 'snare', pitch: 'D2', midi: 38, start: 8, duration: 0.5 },
      ],
    };
    const original = structuredClone(example.notes);
    const layers = formLayers(example);
    expect(layers.map((layer) => layer.label)).toEqual(['Melody', 'Drums']);
    expect(layers.map((layer) => layer.parts)).toEqual([['melody'], ['kick', 'snare', 'cymbal']]);
    expect(layers[1].spans).toEqual([
      { start: 0, end: 2.25 },
      { start: 7.9, end: 8 },
    ]);
    expect(layers[0].spans).toEqual([{ start: 0, end: 8 }]);
    expect(example.notes).toEqual(original);
  });
  it('uses the musical bar length and preserves complete-bar rests and exact entry/exit times', () => {
    const example: MusicExample = {
      ...formExample,
      beats: 15,
      beatsPerBar: 3,
      tracks: [{ id: 'figure', label: 'Figure' }],
      notes: [0, 3, 6, 9.25, 12].map((start) => ({
        part: 'figure',
        pitch: 'D3',
        midi: 50,
        start,
        duration: 0.25,
      })),
    };
    expect(formLayers(example)[0].spans).toEqual([
      { start: 0, end: 6.25 },
      { start: 9.25, end: 12.25 },
    ]);
    expect(formLayers({ ...example, notes: [] })[0].spans).toEqual([]);
  });
  it('counts authored note onsets, without pretending to measure perceived intensity', () => {
    expect(formActivity(withVariant(formExample, 'a')).map((b) => b.count)).toEqual(
      Array(8).fill(16),
    );
    expect(formActivity(formExample).map((b) => b.count)).toEqual([4, 4, 6, 6, 8, 8, 16, 16]);
    expect(formActivity({ ...formExample, notes: [] }).map((b) => b.count)).toEqual(
      Array(8).fill(0),
    );
  });
});
