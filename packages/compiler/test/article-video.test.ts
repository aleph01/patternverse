import { describe, expect, it } from 'vitest';
import { parseArticleVideo, parseMarkdownEntity } from '../src/index.js';

const valid = { url: 'https://www.youtube.com/watch?v=SK3H4MzPJ_Q', title: 'Left' };

describe('article video configuration', () => {
  it('normalizes supported URLs for the shared player without autoplay', () => {
    for (const url of [
      valid.url,
      'https://youtu.be/SK3H4MzPJ_Q',
      'https://www.youtube.com/embed/SK3H4MzPJ_Q',
    ]) {
      expect(parseArticleVideo(JSON.stringify({ ...valid, url, start_seconds: 97 }))).toMatchObject(
        {
          provider: 'youtube',
          id: 'SK3H4MzPJ_Q',
          start_seconds: 97,
          autoplay: false,
          loop_video: false,
        },
      );
    }
    expect(parseArticleVideo(JSON.stringify(valid))?.start_seconds).toBe(0);
  });

  it('rejects untrusted frames, credentials, malformed IDs and invalid options', () => {
    for (const url of [
      'javascript:alert(1)',
      'https://youtube.com.evil.test/watch?v=SK3H4MzPJ_Q',
      'https://example.com/embed/SK3H4MzPJ_Q',
      'http://youtu.be/SK3H4MzPJ_Q',
      'https://user:pass@youtu.be/SK3H4MzPJ_Q',
      'https://youtu.be/broken',
    ]) {
      expect(parseArticleVideo(JSON.stringify({ ...valid, url }))).toBeUndefined();
    }
    for (const extra of [
      { start_seconds: -1 },
      { start_seconds: 1.5 },
      { title: '' },
      { autoplay: true },
    ]) {
      expect(parseArticleVideo(JSON.stringify({ ...valid, ...extra }))).toBeUndefined();
    }
  });

  it('reports invalid blocks during corpus validation', () => {
    const parsed = parseMarkdownEntity(
      '---\nid: sample\ntype: pattern\ntitle: Sample\nstatus: published\n---\n\n```patternverse-video\n{"url":"https://example.com","title":"Bad"}\n```',
      { sourceId: 'commons', sourcePath: 'sample.md' },
    );
    expect(parsed.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'invalid-video-block', severity: 'error' }),
    );
  });
});
