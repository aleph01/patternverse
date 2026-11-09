import pilot from '../../../../../docs/songwriting-course/listening-pilot.json';
import type { PatternVideo } from '$lib/pattern-run/video';

export type ListeningPassage = {
  id: string;
  label: string;
  start_seconds: number;
  end_seconds: number;
  listen_for: string;
};
export type Recording = {
  id: string;
  label: string;
  release: string;
  year: number;
  sources: { youtube: { video_id: string } };
  passages: ListeningPassage[];
};
export type ListeningStudy = {
  id: string;
  title: string;
  artist: string;
  chapter_ids: string[];
  listen_for: string;
  perspective: string;
  original_comparison: string;
  versions: Recording[];
};
export const listeningStudies: readonly ListeningStudy[] = pilot.studies;
export const studiesForArticle = (id: string): readonly ListeningStudy[] =>
  id === 'songwriting-listening-guide'
    ? listeningStudies
    : listeningStudies.filter((study) => study.chapter_ids.includes(id));

export const formatListeningTime = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
export const passageTime = (passage: ListeningPassage): string =>
  `${formatListeningTime(passage.start_seconds)}–${formatListeningTime(passage.end_seconds)}`;

export function recordingLink(recording: Recording, passage?: ListeningPassage): string {
  const url = new URL('https://www.youtube.com/watch');
  url.searchParams.set('v', recording.sources.youtube.video_id);
  if (passage) url.searchParams.set('t', `${passage.start_seconds}s`);
  return url.href;
}

/** Use the existing host video runtime for YouTube readiness, excerpt boundaries and disposal. */
export function listeningVideo(
  study: ListeningStudy,
  recording: Recording,
  passage?: ListeningPassage,
): PatternVideo {
  return {
    provider: 'youtube',
    id: recording.sources.youtube.video_id,
    url: recordingLink(recording, passage),
    title: `${study.artist} — ${study.title} · ${recording.label} · ${passage ? passageTime(passage) : 'Whole recording'} · YouTube`,
    start_seconds: passage?.start_seconds ?? 0,
    end_seconds: passage?.end_seconds ?? null,
    autoplay: false,
    muted: false,
    loop_video: false,
    captions: null,
  };
}
