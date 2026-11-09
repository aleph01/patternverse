import { beforeEach, describe, expect, it, vi } from 'vitest';
const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('node:fs/promises', () => ({ readFile: read }));
import { loadGuidedMusicLesson } from './guided-music-lessons';

describe('private draft lesson boundary', () => {
  beforeEach(() => read.mockReset());
  it('never reads private lesson files when development access is disabled', async () => {
    expect(
      await loadGuidedMusicLesson('songwriting-pitch-and-intervals', false, '/private/source'),
    ).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });
  it('rejects paths outside the three authored lesson ids before reading', async () => {
    expect(await loadGuidedMusicLesson('../../private', true, '/private/source')).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });
  it('returns a valid allowlisted lesson and declines mismatched or missing files', async () => {
    const articleId = 'songwriting-pitch-and-intervals';
    const lesson = {
      articleId,
      steps: Array.from({ length: 4 }, () => ({ example: { notes: [{ midi: 60 }], beats: 8 } })),
    };
    read.mockResolvedValueOnce(JSON.stringify(lesson));
    expect(await loadGuidedMusicLesson(articleId, true, '/private/source')).toEqual(lesson);
    read.mockResolvedValueOnce(JSON.stringify({ ...lesson, articleId: 'other' }));
    expect(await loadGuidedMusicLesson(articleId, true, '/private/source')).toBeNull();
    read.mockRejectedValueOnce(new Error('missing'));
    expect(await loadGuidedMusicLesson(articleId, true, '/private/source')).toBeNull();
  });
});
