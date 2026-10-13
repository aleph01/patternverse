import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '../src/index.js';

const root = new URL('../../../', import.meta.url);
const metadata = JSON.parse(
  await readFile(new URL('docs/pattern-packages/learning-how-to-learn.json', root), 'utf8'),
) as {
  patterns: {
    id: string;
    title: string;
    short_description: string;
    aliases: string[];
    related_patterns: string[];
    article_markdown: string;
    article_sha256: string;
    article_word_count: number;
    example_user_queries: string[];
    practice: null;
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

describe('Learning How to Learn content', () => {
  it('adds exactly 15 distinct articles in authored order to a collection in the existing Learning verse', () => {
    expect(corpus.diagnostics).toEqual([]);
    expect(corpus.unresolvedReferences).toEqual([]);
    expect(metadata.patterns).toHaveLength(15);
    expect(new Set(metadata.patterns.map((pattern) => pattern.id)).size).toBe(15);
    const collection = corpus.entities.find((entity) => entity.id === 'learning-how-to-learn')!;
    expect(collection.type).toBe('collection');
    expect(collection.title).toBe('Learning How to Learn');
    expect(collection.collectionItems.map((ref) => ref.entityId)).toEqual(
      metadata.patterns.map((pattern) => pattern.id),
    );
    expect(collection.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'learning',
    });
    const verse = corpus.entities.find((entity) => entity.id === 'learning')!;
    expect(verse.verseMembers.map((ref) => ref.entityId)).toEqual(
      expect.arrayContaining([
        collection.id,
        ...metadata.patterns.map((pattern) => pattern.id),
        'working-memory',
        'reduce-the-first-step',
        'getting-unstuck',
      ]),
    );
  });

  it.each(metadata.patterns)(
    'preserves the complete $title article without inventing an interactive practice',
    (pattern) => {
      const matches = corpus.entities.filter(
        (entity) => entity.id === pattern.id || entity.title === pattern.title,
      );
      expect(matches).toHaveLength(1);
      const article = matches[0]!;
      expect(article.type).toBe('pattern');
      expect(article.status).toBe('published');
      expect(article.summary).toBe(pattern.short_description);
      expect(article.aliases).toEqual(pattern.aliases);
      expect(article.verseMemberships).toContainEqual({
        sourceId: 'commons',
        entityId: 'learning',
      });
      expect(article.collectionMemberships).toContainEqual({
        sourceId: 'commons',
        entityId: 'learning-how-to-learn',
      });
      const body = article.body.split('\n## Related patterns')[0]!.trim();
      expect(body).toBe(pattern.article_markdown);
      expect(createHash('sha256').update(body).digest('hex')).toBe(pattern.article_sha256);
      expect(body.split(/\s+/)).toHaveLength(pattern.article_word_count);
      expect(article.practice).toBeUndefined();
      expect(article.languagePracticeSource).toBeUndefined();
      expect(article.implementedByPractices).toEqual([]);
      expect(pattern.practice).toBeNull();
      for (const id of pattern.related_patterns) {
        expect(article.links.map((link) => link.target.entityId)).toContain(id);
        expect(corpus.entities.find((entity) => entity.id === id)?.type).toBe('pattern');
      }
      const search = corpus.searchDocuments.find(
        (document) => document.ref.entityId === pattern.id,
      )!;
      expect(search.verseNames).toContain('Learning');
      expect(search.collectionNames).toContain('Learning How to Learn');
      expect(pattern.example_user_queries).toHaveLength(8);
      expect(new Set(pattern.example_user_queries).size).toBe(8);
    },
  );

  it('keeps the learning contrast article distinct from the existing AI-use contrast article', () => {
    const learning = corpus.entities.find((entity) => entity.id === 'learn-through-contrast')!;
    const ai = corpus.entities.find((entity) => entity.id === 'use-contrast-not-just-examples')!;
    expect(learning.title).toBe('Learn Through Contrast');
    expect(ai.title).toBe('Use Contrast, Not Just Examples');
    expect(ai.verseMemberships).toContainEqual({ sourceId: 'commons', entityId: 'ai-usage' });
    expect(learning.links.map((link) => link.target.entityId)).toContain(ai.id);
  });
});
