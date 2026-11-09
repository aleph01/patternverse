// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { createLibrary, createLibrarySearch } from '@patternverse/workspace/library';
import { renderEntityArticle } from './markdown';
import { contentAssetDimensions } from './content-assets';
import { findPatternGraphic, isPatternGraphic } from '$lib/illustrations/pattern-graphics';

const root = resolve(process.cwd(), '../..');
const bundle = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const metadata = bundle.patterns.find((p: { id: string }) => p.id === 'modular-monolith');
let corpus: CompiledCorpus;
beforeAll(async () => {
  corpus = await loadAndCompileCorpus(
    {
      manifestPath: resolve(root, 'patternverse.yaml'),
      contentDirectory: resolve(root, 'content'),
      readonly: true,
    },
    { includeDrafts: false },
  );
});

describe('Modular Monolith article integration', () => {
  it('has one primary collection, aliases, resolved neighbors, and no change to the 23 GoF members', () => {
    const article = corpus.entities.find((e) => e.id === 'modular-monolith')!;
    expect(
      corpus.diagnostics.filter(
        (d) =>
          d.entity?.entityId === 'modular-monolith' ||
          d.entity?.entityId === metadata.collection_id,
      ),
    ).toEqual([]);
    expect(article.title).toBe('Modular Monolith');
    expect(article.aliases).toEqual(metadata.aliases);
    expect(article.aliases).toContain('Modular Monolithic Architecture');
    expect(corpus.entities.filter((e) => e.id === 'modular-monolithic-architecture')).toHaveLength(
      0,
    );
    expect(
      corpus.entities
        .find((e) => e.id === metadata.collection_id)!
        .collectionItems.map((r) => r.entityId),
    ).toEqual(
      expect.arrayContaining([
        'layers',
        'ports-and-adapters',
        'microkernel',
        'pipes-and-filters',
        'blackboard',
        'modular-monolith',
      ]),
    );
    expect(article.summary).toBe(metadata.short_description);
    expect(article.collectionMemberships.map((r) => r.entityId)).toEqual([metadata.collection_id]);
    expect(article.verseMemberships.map((r) => r.entityId)).toEqual(['software-engineering']);
    expect(article.links.map((l) => l.target.entityId)).toEqual(metadata.related_pattern_ids);
    expect(article.languagePracticeSource).toBeUndefined();
    expect(article.implementedByPractices).toEqual([]);
    expect(
      corpus.entities.find((e) => e.id === 'gof-design-patterns')!.collectionItems,
    ).toHaveLength(23);
    const graphic = findPatternGraphic('modular-monolith')!;
    expect(isPatternGraphic(graphic)).toBe(true);
    expect(graphic.mechanism).toBe(article.summary);
  });

  it('renders all eight sections, copyable highlighted modules, and accessible responsive figures', async () => {
    const article = corpus.entities.find((e) => e.id === 'modular-monolith')!;
    const { html, sections } = await renderEntityArticle(article, corpus.entities);
    expect(sections.filter((s) => s.depth === 2).map((s) => s.title)).toEqual(
      metadata.article_outline,
    );
    const page = new DOMParser().parseFromString(html, 'text/html');
    const blocks = [...article.body.matchAll(/```python\n([\s\S]*?)\n```/g)].map(
      (m) => m[1] + '\n',
    );
    const code = [...page.querySelectorAll('pre.syntax-highlighted')];
    expect(code).toHaveLength(metadata.code_files.length);
    code.forEach((pre, index) => {
      expect(pre.getAttribute('tabindex')).toBe('0');
      expect(pre.querySelector('code')?.textContent).toBe(blocks[index]);
      expect(pre.querySelector('.syntax-kwd')).not.toBeNull();
    });
    const figures = [...page.querySelectorAll('figure.content-diagram')];
    expect(figures).toHaveLength(metadata.graphics.length);
    const dimensions = await contentAssetDimensions();
    for (const [index, graphic] of metadata.graphics.entries()) {
      const figure = figures[index]!;
      expect(figure.querySelector('img')?.getAttribute('src')).toBe(graphic.public_path);
      expect(figure.querySelector('img')?.getAttribute('alt')).toBe(graphic.alt_text);
      expect(figure.querySelector('figcaption')?.textContent).toContain(graphic.caption);
      expect(figure.querySelector('source')?.getAttribute('srcset')).toBe(
        graphic.public_path.replace('.svg', '-mobile.svg'),
      );
      for (const suffix of ['', '-mobile']) {
        const relative = graphic.public_path
          .replace('/assets/', '')
          .replace('.svg', suffix + '.svg');
        const svg = await readFile(resolve(root, 'content/assets', relative), 'utf8');
        const [, width, height] = svg.match(/viewBox="0 0 (\d+) (\d+)"/)!;
        expect(dimensions[relative]).toEqual({ width: Number(width), height: Number(height) });
        expect(svg).toContain('role="img"');
        expect(svg).toContain('color-scheme:only light');
        expect(svg).not.toMatch(/<script|<foreignObject|onload=|javascript:/);
      }
    }
  });

  it('finds the article under both established names and its primary collection', async () => {
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
    for (const query of [
      'Modular Monolith',
      'Modular Monolithic Architecture',
      'Modular Monolith Architecture',
      'Application Architecture',
    ]) {
      expect(search.search(query, { type: 'pattern' }).map((e) => e.id)).toContain(
        'modular-monolith',
      );
    }
    const source = await readFile(resolve(root, 'content/patterns/modular-monolith.md'), 'utf8');
    expect(metadata.article_sha256).toBe(createHash('sha256').update(source).digest('hex'));
    expect(metadata.example_user_queries).toHaveLength(10);
    expect(new Set(metadata.example_user_queries).size).toBe(10);
  });
});
