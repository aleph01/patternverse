import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  loadAndCompileCorpus,
  serializeEntity,
  parseMarkdownEntity,
  type CompiledCorpus,
} from '../src/index.js';

const root = new URL('../../../', import.meta.url);
const metadata = JSON.parse(
  await readFile(new URL('docs/pattern-packages/gof.json', root), 'utf8'),
) as {
  patterns: {
    id: string;
    title: string;
    short_description: string;
    tags: string[];
    related_patterns: string[];
    related_pattern_ids: string[];
    example_user_queries: string[];
    article_sha256: string;
    article_word_count: number;
    article_outline: string[];
    original_import: { article_sha256: string };
    graphics: { public_path: string; caption: string; alt_text: string }[];
  }[];
};
let corpus: CompiledCorpus;
beforeAll(async () => {
  corpus = await loadAndCompileCorpus(
    {
      manifestPath: fileURLToPath(new URL('patternverse.yaml', root)),
      contentDirectory: fileURLToPath(new URL('content', root)),
      readonly: true,
    },
    { includeDrafts: false },
  );
});

describe('GoF illustrated field guide', () => {
  it('contains all 23 canonical articles in one alphabetical collection', () => {
    const gofIds = new Set(['gof-design-patterns', ...metadata.patterns.map((p) => p.id)]);
    expect(corpus.diagnostics.filter((d) => d.entity && gofIds.has(d.entity.entityId))).toEqual([]);
    expect(metadata.patterns).toHaveLength(23);
    const ids = metadata.patterns.map((p) => p.id);
    const articles = corpus.entities.filter((e) => e.type === 'pattern' && ids.includes(e.id));
    expect(articles).toHaveLength(23);
    expect(new Set(articles.map((e) => e.title)).size).toBe(23);
    const collection = corpus.entities.find((e) => e.id === 'gof-design-patterns')!;
    expect(collection.collectionItems.map((r) => r.entityId)).toEqual(ids);
    expect(metadata.patterns.map((p) => p.title)).toEqual(
      metadata.patterns.map((p) => p.title).sort((a, b) => a.localeCompare(b, 'en')),
    );
    for (const category of ['creational', 'structural', 'behavioral']) {
      expect(corpus.entities.some((e) => e.id === `gof-${category}`)).toBe(false);
      expect(collection.body).not.toContain(`gof-${category}`);
    }
  });

  it.each(metadata.patterns)(
    '$title uses the approved outline, executable example, relationships and editorial illustrations',
    async (p) => {
      const article = corpus.entities.find((e) => e.id === p.id)!;
      expect(article.summary).toBe(p.short_description);
      expect(article.practice).toBeUndefined();
      expect(article.implementedByPractices).toEqual([]);
      expect(article.body).not.toMatch(/patternverse-practice|\*\*Category:|## Pattern details/);
      for (const category of ['creational', 'structural', 'behavioral'])
        expect(article.tags ?? []).not.toContain(category);
      expect(article.verseMemberships).toContainEqual({
        sourceId: 'commons',
        entityId: 'software-engineering',
      });
      expect(article.collectionMemberships.map((r) => r.entityId)).toEqual(['gof-design-patterns']);
      const headings = [...article.body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
      expect(headings).toEqual(p.article_outline);
      expect(article.body).toContain('```python\n');
      expect(article.body.trim().split(/\s+/)).toHaveLength(p.article_word_count);
      expect(p.article_word_count).toBeGreaterThanOrEqual(800);
      expect(createHash('sha256').update(article.body.trim()).digest('hex')).toBe(p.article_sha256);
      expect(p.original_import.article_sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(article.links.map((r) => r.target.entityId)).toEqual(p.related_pattern_ids);
      expect(article.links.map((r) => r.resolvedLabel)).toEqual(p.related_patterns);
      expect(p.example_user_queries).toHaveLength(8);
      expect(new Set(p.example_user_queries).size).toBe(8);
      const search = corpus.searchDocuments.find((d) => d.ref.entityId === p.id)!;
      expect(search.collectionNames).toEqual(['GoF Design Patterns']);
      expect(search.verseNames).toContain('Software Engineering');
      const reparsed = parseMarkdownEntity(serializeEntity(article), {
        sourceId: 'commons',
        sourcePath: article.sourcePath!,
      });
      expect(reparsed.diagnostics).toEqual([]);
      expect(reparsed.entity?.body.trim()).toBe(article.body.trim());
      for (const graphic of p.graphics) {
        expect(article.body).toContain(graphic.caption);
        expect(article.body).toContain(graphic.alt_text);
        for (const suffix of ['', '-mobile']) {
          const path = graphic.public_path
            .replace('/assets/', '')
            .replace(/\.svg$/, `${suffix}.svg`);
          const svg = await readFile(new URL(`content/assets/${path}`, root), 'utf8');
          expect(svg).toContain('role="img"');
          expect(svg).toContain('color-scheme:only light');
          expect(svg).toContain('Helvetica Neue');
          expect(svg).toContain('#00855b');
          expect(svg).toContain(`viewBox="0 0 ${suffix ? '360' : '720'} `);
          expect(svg).not.toMatch(/<script|<foreignObject|onload=|href="https?:|javascript:/i);
          const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
          expect(new Set(ids).size).toBe(ids.length);
          for (const match of svg.matchAll(/url\(#([^)]*)\)/g)) expect(ids).toContain(match[1]);
        }
      }
    },
  );
});
