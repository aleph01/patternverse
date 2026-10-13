// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { createLibrary, createLibrarySearch } from '@patternverse/workspace/library';
import { renderEntityMarkdown } from './markdown';

const root = resolve(process.cwd(), '../..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/gof.json'), 'utf8'),
) as {
  patterns: {
    id: string;
    title: string;
    graphic: { public_path: string; alt_text: string; caption: string };
    related_pattern_ids: string[];
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
    'renders $title with a captioned, accessible diagram and real pattern links',
    async (p) => {
      const entity = corpus.entities.find((e) => e.id === p.id)!;
      const html = await renderEntityMarkdown(entity, corpus.entities);
      const page = new DOMParser().parseFromString(html, 'text/html');
      const figure = page.querySelector('figure.content-diagram')!;
      expect(figure).not.toBeNull();
      expect(figure.querySelector('img')?.getAttribute('src')).toBe(p.graphic.public_path);
      expect(figure.querySelector('img')?.getAttribute('alt')).toBe(p.graphic.alt_text);
      expect(figure.querySelector('figcaption')?.textContent).toContain(p.graphic.caption);
      expect(figure.querySelector('[role="region"]')?.getAttribute('tabindex')).toBe('0');
      expect(figure.querySelector('img')?.getAttribute('width')).toBe('720');
      for (const id of p.related_pattern_ids)
        expect(page.querySelector(`a[href="/pattern/${id}"]`)).not.toBeNull();
      expect(html).not.toContain('<svg'); // SVG IDs live in isolated image documents, even with repeated articles.
      expect(html).not.toContain('patternverse-practice');
    },
  );

  it('finds every article by canonical title, software domain, GoF collection and category', () => {
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
    for (const query of ['Software Engineering', 'GoF Design Patterns']) {
      expect(search.search(query, { type: 'pattern' }).map((e) => e.id)).toEqual(
        expect.arrayContaining(metadata.patterns.map((p) => p.id)),
      );
    }
    for (const [category, count] of [
      ['Creational', 5],
      ['Structural', 7],
      ['Behavioral', 11],
    ] as const) {
      // Full-text/fuzzy search can also find neighboring designs discussed in prose.
      // Category browsing is authoritative; search must include every member.
      const matches = search.search(`GoF ${category}`, { type: 'pattern' });
      const categoryIds = corpus.entities
        .find((e) => e.id === `gof-${category.toLowerCase()}`)!
        .collectionItems.map((r) => r.entityId);
      expect(categoryIds).toHaveLength(count);
      expect(matches.map((e) => e.id)).toEqual(expect.arrayContaining(categoryIds));
    }
  });
});
