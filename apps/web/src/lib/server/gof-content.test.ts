// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { createLibrary, createLibrarySearch } from '@patternverse/workspace/library';
import { renderEntityArticle } from './markdown';

const root = resolve(process.cwd(), '../..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/gof.json'), 'utf8'),
) as {
  patterns: {
    id: string;
    title: string;
    graphics: { public_path: string; alt_text: string; caption: string }[];
    related_pattern_ids: string[];
    article_outline: string[];
  }[];
};
let corpus: CompiledCorpus;
beforeAll(async () => {
  corpus = await loadAndCompileCorpus({
    manifestPath: resolve(root, 'patternverse.yaml'),
    contentDirectory: resolve(root, 'content'),
    readonly: true,
  });
});

describe('GoF public reading and search', () => {
  it.each(metadata.patterns)(
    'renders $title with highlighted code, responsive illustrations and real links',
    async (p) => {
      const entity = corpus.entities.find((e) => e.id === p.id)!;
      const { html, sections } = await renderEntityArticle(entity, corpus.entities);
      const page = new DOMParser().parseFromString(html, 'text/html');
      expect(sections.filter((s) => s.depth === 2).map((s) => s.title)).toEqual(p.article_outline);
      const figures = [...page.querySelectorAll('figure.content-diagram')];
      expect(figures).toHaveLength(p.graphics.length);
      p.graphics.forEach((graphic, index) => {
        const figure = figures[index]!;
        expect(figure.querySelector('img')?.getAttribute('src')).toBe(graphic.public_path);
        expect(figure.querySelector('img')?.getAttribute('alt')).toBe(graphic.alt_text);
        expect(figure.querySelector('figcaption')?.textContent).toContain(graphic.caption);
        expect(figure.querySelector('source')?.getAttribute('srcset')).toBe(
          graphic.public_path.replace('.svg', '-mobile.svg'),
        );
        expect(figure.querySelector('[role="region"]')?.getAttribute('tabindex')).toBe('0');
        expect(figure.querySelector('img')?.getAttribute('width')).toBe('720');
      });
      const pre = page.querySelector('pre.syntax-highlighted')!;
      expect(pre).not.toBeNull();
      expect(pre.getAttribute('tabindex')).toBe('0');
      expect(pre.querySelector('.syntax-kwd')).not.toBeNull();
      expect(pre.querySelector('.syntax-cmnt')).not.toBeNull();
      const original = entity.body.match(/```python\n([\s\S]*?)\n```/)![1] + '\n';
      expect(pre.querySelector('code')?.textContent).toBe(original);
      for (const id of p.related_pattern_ids)
        expect(page.querySelector(`a[href="/pattern/${id}"]`)).not.toBeNull();
      expect(html).not.toContain('<svg');
      expect(html).not.toContain('patternverse-practice');
    },
  );
  it('finds all 23 articles by canonical title, software domain and the single collection', () => {
    const search = createLibrarySearch(
      createLibrary([
        {
          id: 'commons',
          name: 'Commons',
          readonly: true,
          entries: corpus.entities.map((e) => ({
            id: e.id,
            sourceId: e.sourceId,
            type: e.type,
            title: e.title,
            summary: e.summary ?? '',
            status: e.status,
          })),
          searchDocuments: corpus.searchDocuments.map((d) => ({ ...d, entityId: d.ref.entityId })),
        },
      ]),
    );
    for (const p of metadata.patterns)
      expect(search.search(p.title, { type: 'pattern' }).map((e) => e.id)).toContain(p.id);
    for (const query of ['Software Engineering', 'GoF Design Patterns'])
      expect(search.search(query, { type: 'pattern' }).map((e) => e.id)).toEqual(
        expect.arrayContaining(metadata.patterns.map((p) => p.id)),
      );
    for (const p of metadata.patterns)
      expect(
        corpus.entities.find((e) => e.id === p.id)!.collectionMemberships.map((r) => r.entityId),
      ).toEqual(['gof-design-patterns']);
  });
});
