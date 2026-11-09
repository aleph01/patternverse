// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { compileCorpus, parseMarkdownEntity } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';
import { renderMarkdownPreview } from '$lib/client/markdown-preview';

const config = {
  src: 'coin-sampling.html',
  title: '<img src=x onerror=alert(1)>',
  fallback: 'A readable explanation even without JavaScript.',
};
const body = `Before.\n\n\`\`\`patternverse-widget\n${JSON.stringify(config)}\n\`\`\`\n\nAfter.\n\n<script>alert(1)</script><iframe src="https://example.com"></iframe>`;

describe('article widget Markdown boundary', () => {
  it('renders the same inert, escaped mount point in articles and previews', async () => {
    const parsed = parseMarkdownEntity(
      `---\nid: sample\ntype: concept\ntitle: Sample\nstatus: published\n---\n\n${body}`,
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
      const widget = document.querySelector('[data-article-widget]')!;
      expect(widget.closest('pre, code')).toBeNull();
      expect(JSON.parse(widget.getAttribute('data-article-widget')!)).toMatchObject(config);
      expect(widget.textContent).toContain(config.fallback);
      expect(document.querySelector('script, iframe, img')).toBeNull();
      expect(document.body.textContent).toMatch(/Before\.[\s\S]*After\./);
    }
  });
});
