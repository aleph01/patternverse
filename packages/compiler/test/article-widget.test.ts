import { describe, expect, it } from 'vitest';
import { parseArticleWidget, parseMarkdownEntity } from '../src/index.js';

const valid = {
  src: 'coin-sampling.html',
  title: 'Sampling',
  fallback: 'Samples vary.',
};

describe('article widget blocks', () => {
  it('defaults the height and rejects remote paths, traversal, extra fields and oversized frames', () => {
    expect(parseArticleWidget(JSON.stringify(valid))).toEqual({ ...valid, height: 480 });
    for (const src of [
      'https://example.com/demo.html',
      '../demo.html',
      '/demo.html',
      'data:text/html,x',
    ])
      expect(parseArticleWidget(JSON.stringify({ ...valid, src }))).toBeUndefined();
    expect(parseArticleWidget(JSON.stringify({ ...valid, height: 10000 }))).toBeUndefined();
    expect(
      parseArticleWidget(JSON.stringify({ ...valid, sandbox: 'allow-same-origin' })),
    ).toBeUndefined();
    expect(parseArticleWidget('{broken')).toBeUndefined();
  });

  it('reports invalid authored configuration during corpus validation', () => {
    const result = parseMarkdownEntity(
      '---\nid: sample\ntype: concept\ntitle: Sample\nstatus: published\n---\n\n```patternverse-widget\n{"src":"https://example.com"}\n```',
      { sourceId: 'commons', sourcePath: 'sample.md' },
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'invalid-widget-block', severity: 'error' }),
    );
  });
});
