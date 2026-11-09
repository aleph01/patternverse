import { describe, expect, it } from 'vitest';
import { songStudy, recordingStudy } from './song-study';
import { formSections } from './form';
import { displayChords } from './chord-display';
import { notesInRange, playbackRange } from './playback-range';

describe('original whole-song study', () => {
  it('uses one event list for named sections, harmony, drums and the recording', () => {
    expect(formSections(songStudy).map((s) => s.label)).toEqual([
      'Intro',
      'Verse 1',
      'Chorus 1',
      'Verse 2',
      'Chorus 2',
      'Bridge',
      'Final chorus',
      'Outro',
    ]);
    expect(songStudy.beats).toBe(256);
    expect(songStudy.harmony).toHaveLength(64);
    expect(
      songStudy.notes.every((n) => n.start >= 0 && n.duration > 0 && n.start + n.duration <= 256),
    ).toBe(true);
    expect(songStudy.notes.filter((n) => n.drum && n.start < 16)).toHaveLength(0);
    expect(songStudy.notes.filter((n) => n.drum && n.start >= 176 && n.start < 192)).toHaveLength(
      0,
    );
    expect(
      songStudy.notes.filter((n) => n.drum && n.start >= 192 && n.start < 208).length,
    ).toBeGreaterThan(0);
    const dominant = displayChords(songStudy).find((c) => c.start === 212)!;
    expect([dominant.roman, dominant.name, dominant.bass, dominant.inversion]).toEqual([
      'V',
      'G/B',
      'B',
      1,
    ]);
  });
  it('supports a recording with only authored form and no guessed chord or drum data', () => {
    expect(recordingStudy.recording).toEqual(songStudy.recording);
    expect(recordingStudy.sections).toEqual(songStudy.sections);
    expect(recordingStudy.notes).toHaveLength(0);
    expect(displayChords(recordingStudy)).toHaveLength(0);
  });
  it('normalizes invalid loop boundaries and clips sustained notes without repeating drum tails', () => {
    expect(playbackRange(songStudy, { start: 9, end: 2 })).toEqual({ start: 0, end: 256 });
    expect(playbackRange(songStudy, { start: 240, end: 300 })).toEqual({ start: 240, end: 256 });
    const notes = notesInRange(
      [
        { pitch: 'C3', midi: 48, start: 0, duration: 8, part: 'chords' },
        { pitch: 'C2', midi: 36, start: 1.9, duration: 0.2, part: 'kick', drum: 'kick' },
      ],
      { start: 2, end: 4 },
    );
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ start: 2, duration: 2 });
  });
});
