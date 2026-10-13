import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  loadAndCompileCorpus,
  parseMarkdownEntity,
  serializeEntity,
  type CompiledCorpus,
} from '../src/index.js';

const root = new URL('../../../', import.meta.url);
const metadata = JSON.parse(
  await readFile(new URL('docs/pattern-packages/sleight-of-mouth.json', root), 'utf8'),
) as {
  collection_id: string;
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
    use_when: string[];
    not_ideal_when: string[];
    goals: string[];
    mechanisms: string[];
    difficulty: string;
    source: { canonical_pattern: string; printed_pages: string; note: string };
    visual_decision: { status: string; brief: string };
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

describe('Neuro-Linguistic Programming article import', () => {
  it('places exactly fourteen unique articles in the NLP collection within Therapy', () => {
    expect(corpus.diagnostics).toEqual([]);
    expect(corpus.unresolvedReferences).toEqual([]);
    expect(metadata.patterns).toHaveLength(14);
    const members = corpus.entities.filter(
      (e) => e.type === 'pattern' && e.tags?.includes('sleight-of-mouth'),
    );
    expect(members).toHaveLength(14);
    expect(new Set(members.map((e) => e.id)).size).toBe(14);
    const collection = corpus.entities.find((e) => e.id === metadata.collection_id)!;
    expect(collection.title).toBe('Neuro-Linguistic Programming');
    expect(collection.aliases).toContain('NLP');
    expect(collection.collectionItems.map((r) => r.entityId)).toEqual(
      metadata.patterns.map((p) => p.id),
    );
    expect(collection.verseMemberships).toEqual([{ sourceId: 'commons', entityId: 'therapy' }]);
    expect(corpus.entities.find((e) => e.id === 'therapy')?.verseMembers).toEqual(
      expect.arrayContaining([
        { sourceId: 'commons', entityId: collection.id },
        ...metadata.patterns.map((p) => ({ sourceId: 'commons', entityId: p.id })),
      ]),
    );
    // Existing therapy and unrelated catalogues stay intact.
    // Preserve the original CBT members without freezing unrelated later additions.
    expect(corpus.entities.find((e) => e.id === 'cbt')?.collectionItems).toEqual(
      expect.arrayContaining(
        [
          'cbt-thought-record',
          'cbt-activation',
          'cbt-exposure',
          'cbt-experiment',
          'cbt-problem-solving',
          'cbt-thinking-patterns',
          'cbt-downward-arrow',
          'cbt-worry-time',
          'cbt-activity-mood',
          'cbt-graded-task',
        ].map((entityId) => ({ sourceId: 'commons', entityId })),
      ),
    );
    expect(
      corpus.entities.find((e) => e.id === 'gof-design-patterns')?.collectionItems,
    ).toHaveLength(23);
  });

  it.each(metadata.patterns)(
    'retains the complete $title article, metadata, source and real related links',
    (p) => {
      const matches = corpus.entities.filter((e) => e.id === p.id || e.title === p.title);
      expect(matches).toHaveLength(1);
      const entity = matches[0]!;
      expect(entity.type).toBe('pattern');
      expect(entity.summary).toBe(p.short_description);
      expect(entity.tags).toEqual(
        expect.arrayContaining([...p.tags, 'nlp', 'method:nlp', 'sleight-of-mouth']),
      );
      expect(entity.verseMemberships).toEqual([{ sourceId: 'commons', entityId: 'therapy' }]);
      expect(entity.collectionMemberships).toContainEqual({
        sourceId: 'commons',
        entityId: metadata.collection_id,
      });
      const article = entity.body.split('\n## Pattern details')[0]!.trim();
      expect(createHash('sha256').update(article).digest('hex')).toBe(p.article_sha256);
      expect(article.split(/\s+/)).toHaveLength(p.article_word_count);
      expect(p.article_word_count).toBeGreaterThan(800);
      for (const detail of [
        ...p.use_when,
        ...p.not_ideal_when,
        ...p.goals,
        ...p.mechanisms,
        p.difficulty,
        p.source.printed_pages,
        p.source.canonical_pattern,
        p.source.note,
      ])
        expect(entity.body).toContain(detail);
      expect(entity.links.map((link) => link.target.entityId)).toEqual(p.related_pattern_ids);
      expect(entity.links.map((link) => link.resolvedLabel)).toEqual(p.related_patterns);
      expect(entity.attribution).toContain('Robert Dilts');
      expect(entity.attribution).toContain(p.source.printed_pages);
      expect(entity.practice).toBeUndefined();
      expect(entity.languagePracticeSource).toContain(':language 1');
      expect(entity.implementedByPractices).toEqual([]);
      expect(p.example_user_queries).toHaveLength(8);
      expect(new Set(p.example_user_queries).size).toBe(8);
      expect(p.visual_decision.status).toBe('brief only');
      expect(p.visual_decision.brief.length).toBeGreaterThan(20);
      const document = corpus.searchDocuments.find((d) => d.ref.entityId === p.id)!;
      expect(document.verseNames).toContain('Therapy');
      expect(document.collectionNames).toContain('Neuro-Linguistic Programming');
      expect(document.body).toBe(entity.body);
      const restored = parseMarkdownEntity(serializeEntity(entity), {
        sourceId: 'commons',
        sourcePath: entity.sourcePath!,
      });
      expect(restored.diagnostics).toEqual([]);
      expect(restored.entity?.body.trim()).toBe(entity.body.trim());
    },
  );
});
