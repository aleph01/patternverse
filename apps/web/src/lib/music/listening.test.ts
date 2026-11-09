import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import chapters from '../../../../../docs/songwriting-course/chapters.json';
import { isPatternVideo } from '$lib/pattern-run/video';
import {
  listeningStudies,
  listeningVideo,
  recordingLink,
  passageTime,
  studiesForArticle,
} from './listening';
import { claimMusicPlayback, releaseMusicPlayback, stopMusicPlayback } from './playback-focus';

describe('YouTube listening pilot', () => {
  it('explains every mounted listening study and recording in its actual article', () => {
    for (const study of listeningStudies) {
      for (const id of study.chapter_ids) {
        const article = readFileSync(
          resolve(process.cwd(), '../../content/patterns', `${id}.md`),
          'utf8',
        );
        expect(article).toContain(study.artist);
        expect(article).toContain(study.title);
        for (const recording of study.versions)
          expect(article).toContain(recording.sources.youtube.video_id);
      }
    }
  });
  it('keeps three studies, four recordings and chapter-specific bindings', () => {
    expect(listeningStudies.map((study) => study.id)).toEqual([
      'true-love-waits',
      'two-thousand-and-seventeen',
      'lean-on-me',
    ]);
    expect(listeningStudies.flatMap((study) => study.versions)).toHaveLength(4);
    for (const study of listeningStudies) {
      expect(study.listen_for.length).toBeGreaterThan(60);
      for (const id of study.chapter_ids)
        expect(chapters.chapters.some((chapter) => chapter.id === id)).toBe(true);
      expect(new Set(study.versions.map((version) => version.id)).size).toBe(study.versions.length);
      for (const recording of study.versions) {
        expect(recording.sources.youtube.video_id).toMatch(/^[A-Za-z0-9_-]{11}$/);
        expect(recording.passages.length).toBeGreaterThan(0);
        expect(new Set(recording.passages.map((passage) => passage.id)).size).toBe(
          recording.passages.length,
        );
        for (const passage of recording.passages) {
          expect(Number.isInteger(passage.start_seconds)).toBe(true);
          expect(Number.isInteger(passage.end_seconds)).toBe(true);
          expect(passage.start_seconds).toBeGreaterThanOrEqual(0);
          expect(passage.end_seconds).toBeGreaterThan(passage.start_seconds);
          expect(passage.listen_for.length).toBeGreaterThan(40);
          const video = listeningVideo(study, recording, passage);
          expect(isPatternVideo(video)).toBe(true);
          expect(video.start_seconds).toBe(passage.start_seconds);
          expect(video.end_seconds).toBe(passage.end_seconds);
          expect(video.autoplay).toBe(false);
          expect(video.loop_video).toBe(false);
          expect(video.title).toContain(passageTime(passage));
        }
      }
    }
    expect(studiesForArticle('songwriting-listening-guide')).toHaveLength(3);
    expect(studiesForArticle('songwriting-revise-the-weakest-moment')[0].id).toBe(
      'true-love-waits',
    );
    expect(studiesForArticle('unrelated-pattern')).toEqual([]);
  });
  it('links the selected recording and timestamp, with no endpoint implied for external playback', () => {
    const study = listeningStudies[1];
    const recording = study.versions[0];
    const passage = recording.passages[1];
    expect(passageTime(passage)).toBe('1:30–2:00');
    const url = new URL(recordingLink(recording, passage));
    expect(url.origin).toBe('https://www.youtube.com');
    expect(url.searchParams.get('v')).toBe(recording.sources.youtube.video_id);
    expect(url.searchParams.get('t')).toBe('90s');
    expect(url.searchParams.has('end')).toBe(false);
    expect(recordingLink(recording)).not.toContain('&t=');
    expect(listeningVideo(study, recording).end_seconds).toBeNull();
    expect(listeningVideo(study, recording).start_seconds).toBe(0);
    expect(listeningStudies[0].versions[0].sources.youtube.video_id).not.toBe(
      listeningStudies[0].versions[1].sources.youtube.video_id,
    );
  });
});

it('stops an old player once and does not let its late cleanup release a newer player', () => {
  const stopped: string[] = [];
  const first = () => {
    stopped.push('first');
    releaseMusicPlayback(first);
  };
  const second = () => {
    stopped.push('second');
    releaseMusicPlayback(second);
  };
  claimMusicPlayback(first);
  claimMusicPlayback(second);
  releaseMusicPlayback(first);
  expect(stopped).toEqual(['first']);
  stopMusicPlayback();
  stopMusicPlayback();
  expect(stopped).toEqual(['first', 'second']);
});
