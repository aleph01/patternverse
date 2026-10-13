import { describe, expect, it } from 'vitest';
import {
  checkVideoDuration,
  clipPosition,
  isPatternVideo,
  vimeoSource,
  youtubeSource,
  type PatternVideo,
} from './video';
import { worksheetSteps } from './view';

export const sampleVideo: PatternVideo = {
  url: 'https://youtu.be/M7lc1UVf-VE',
  provider: 'youtube',
  id: 'M7lc1UVf-VE',
  title: 'Introduction',
  start_seconds: 10,
  end_seconds: 30,
  autoplay: false,
  muted: false,
  loop_video: false,
  captions: 'en',
};

describe('video host configuration', () => {
  it('accepts the Rust payload and rejects malformed ranges', () => {
    expect(isPatternVideo(sampleVideo)).toBe(true);
    for (const bad of [
      null,
      {},
      { ...sampleVideo, start_seconds: -1 },
      { ...sampleVideo, end_seconds: 10 },
      { ...sampleVideo, autoplay: 'false' },
    ])
      expect(isPatternVideo(bad)).toBe(false);
    expect(clipPosition(sampleVideo, 9)).toBe('start');
    expect(clipPosition(sampleVideo, 10)).toBeNull();
    expect(clipPosition(sampleVideo, 29)).toBeNull();
    expect(clipPosition(sampleVideo, 30)).toBe('end');
    expect(() => checkVideoDuration(sampleVideo, 20)).toThrow('outside');
    expect(() => checkVideoDuration(sampleVideo, 30)).not.toThrow();
  });
  it('preserves unlisted Vimeo access hashes', () => {
    expect(vimeoSource({ ...sampleVideo, id: '123', url: 'https://vimeo.com/123/abcdef' })).toBe(
      'https://vimeo.com/123/abcdef',
    );
    expect(
      vimeoSource({
        ...sampleVideo,
        id: '123',
        url: 'https://player.vimeo.com/video/123?h=abcdef',
      }),
    ).toBe('https://vimeo.com/123/abcdef');
  });
  it('uses canonical YouTube bounds, captions and the host origin', () => {
    const url = new URL(youtubeSource(sampleVideo, 'https://patternverse.org'));
    expect(url.hostname).toBe('www.youtube-nocookie.com');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      start: '10',
      end: '30',
      origin: 'https://patternverse.org',
      cc_lang_pref: 'en',
      enablejsapi: '1',
    });
  });
  it('keeps videos between worksheet interactions without numbering them', () => {
    const effect = {
      effect_id: 'clip',
      run_id: 'run',
      request: { kind: 'content.video', payload: { video: sampleVideo, markdown: 'Watch.' } },
    };
    expect(
      worksheetSteps({
        technique_id: 'practice',
        root_id: 'run',
        revision: 0,
        status: 'Completed',
        pending: null,
        outputs: {},
        items: [{ effect, result: null }],
      }),
    ).toEqual([{ effect, answer: '', result: null, number: 0 }]);
  });
});
