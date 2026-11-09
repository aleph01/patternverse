// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { compileCorpus, parseMarkdownEntity } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';
import { renderMarkdownPreview } from '$lib/client/markdown-preview';

describe('article video rendering boundary', () => {
  it('keeps the video config and fallback link through sanitization in reading and editing', async () => {
    const config = {
      url: 'https://www.youtube.com/watch?v=SK3H4MzPJ_Q',
      title: '<img src=x onerror=alert(1)>',
      start_seconds: 97,
    };
    const body = `Before.\n\n\`\`\`patternverse-video\n${JSON.stringify(config)}\n\`\`\`\n\nAfter.\n\n<script>alert(1)</script><iframe src="https://example.com"></iframe>`;
    const parsed = parseMarkdownEntity(
      `---\nid: sample\ntype: pattern\ntitle: Sample\nstatus: published\n---\n\n${body}`,
      { sourceId: 'commons', sourcePath: 'sample.md' },
    );
    const corpus = compileCorpus(
      [parsed.entity!],
      [{ id: 'commons', name: 'Commons', readonly: true }],
    );
    for (const html of [
      await renderEntityMarkdown(corpus.entities[0], corpus.entities),
      await renderMarkdownPreview(body),
    ]) {
      const document = new DOMParser().parseFromString(html, 'text/html');
      const video = document.querySelector('[data-article-video]')!;
      expect(video.closest('pre,code')).toBeNull();
      expect(JSON.parse(video.getAttribute('data-article-video')!)).toEqual(config);
      expect(video.querySelector('a')?.getAttribute('href')).toBe(config.url);
      expect(video.textContent).toBe(config.title);
      expect(document.querySelector('script,iframe,img')).toBeNull();
      expect(document.body.textContent).toMatch(/Before\.[\s\S]*After\./);
    }
  });
});
