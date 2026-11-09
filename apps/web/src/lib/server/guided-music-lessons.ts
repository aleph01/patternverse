import { dev } from '$app/environment';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { musicLessonIds, type GuidedMusicLesson } from '$lib/music/lesson-pilot';

/** Private, allowlisted authoring files are read only by the local development server. */
export async function loadGuidedMusicLesson(
  articleId: string,
  enabled = dev,
  directory = process.env.PATTERNVERSE_MUSIC_LESSON_ROOT ??
    resolve(process.cwd(), '../../.local/music-lessons'),
): Promise<GuidedMusicLesson | null> {
  if (!enabled || !musicLessonIds.some((id) => id === articleId)) return null;
  try {
    const lesson = JSON.parse(
      await readFile(resolve(directory, `${articleId}.json`), 'utf8'),
    ) as GuidedMusicLesson;
    if (
      lesson.articleId !== articleId ||
      lesson.steps.length !== 4 ||
      lesson.steps.some(
        (step) =>
          !step.example.notes.length ||
          !Number.isFinite(step.example.beats) ||
          step.example.beats <= 0,
      )
    )
      return null;
    return lesson;
  } catch {
    return null;
  }
}
