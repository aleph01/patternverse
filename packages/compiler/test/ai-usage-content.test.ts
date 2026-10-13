import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '../src/index.js';

const root = new URL('../../../', import.meta.url);
const metadata = JSON.parse(
  await readFile(new URL('docs/pattern-packages/ai-usage.json', root), 'utf8'),
) as {
  reconciliation: {
    id: string;
    original_body_sha256: string;
    original_practice_sha256: string;
    migrated_practice_sha256: string;
    migrated_body_sha256: string;
    supplement_heading: string;
  };
  patterns: {
    id: string;
    title: string;
    source_title: string;
    short_description: string;
    tags: string[];
    related_patterns: { id: string; title: string; relationship: string }[];
    example_user_queries: string[];
    article_markdown: string;
    article_sha256: string;
    article_word_count: number;
    graphic: { public_path: string; alt_text: string; caption: string };
  }[];
};
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const image = (p: (typeof metadata.patterns)[number]) =>
  `![${p.graphic.alt_text}](${p.graphic.public_path} "${p.graphic.caption}")`;
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

describe('AI Usage integration', () => {
  it('organizes six distinct articles in one collection and verse without duplicating the existing pattern', () => {
    expect(corpus.diagnostics).toEqual([]);
    expect(corpus.unresolvedReferences).toEqual([]);
    expect(metadata.patterns).toHaveLength(6);
    expect(new Set(metadata.patterns.map((p) => p.id)).size).toBe(6);
    expect(corpus.entities.filter((e) => e.id === 'expose-the-decisive-unknown')).toEqual([]);
    const collection = corpus.entities.find((e) => e.id === 'thinking-with-language-models')!;
    expect(collection.collectionItems.map((r) => r.entityId)).toEqual(
      metadata.patterns.map((p) => p.id),
    );
    const verse = corpus.entities.find((e) => e.id === 'ai-usage')!;
    expect(verse.title).toBe('AI Usage');
    expect(verse.verseMembers.map((r) => r.entityId).sort()).toEqual(
      [...metadata.patterns.map((p) => p.id), collection.id].sort(),
    );
  });

  it.each(metadata.patterns)(
    'preserves the full $title article and resolves its metadata and diagram',
    async (p) => {
      const matches = corpus.entities.filter((e) => e.id === p.id || e.title === p.title);
      expect(matches).toHaveLength(1);
      const article = matches[0]!;
      expect(article.summary).toBe(p.short_description);
      expect(article.tags).toEqual(expect.arrayContaining(p.tags));
      expect(article.verseMemberships).toContainEqual({
        sourceId: 'commons',
        entityId: 'ai-usage',
      });
      expect(article.collectionMemberships).toContainEqual({
        sourceId: 'commons',
        entityId: 'thinking-with-language-models',
      });

      let supplied: string;
      if (p.id === metadata.reconciliation.id) {
        const heading = `## ${metadata.reconciliation.supplement_heading}\n\n`;
        supplied = article.body
          .slice(
            article.body.indexOf(heading) + heading.length,
            article.body.indexOf('\n## Practice —'),
          )
          .replace(/^### /gm, '## ');
      } else {
        supplied = article.body.split('\n## Related patterns')[0]!;
        expect(article.practice).toBeUndefined();
        expect(article.implementedByPractices).toEqual([]);
        expect(article.body).not.toContain('patternverse-practice');
      }
      expect(article.body.split(image(p))).toHaveLength(2);
      supplied = supplied.replace(`\n\n${image(p)}`, '').trim();
      expect(supplied).toBe(p.article_markdown);
      expect(hash(supplied)).toBe(p.article_sha256);
      expect(supplied.split(/\s+/)).toHaveLength(p.article_word_count);
      expect(article.body).not.toContain('**Visual decision:**');
      for (const related of p.related_patterns) {
        expect(article.links.map((l) => l.target.entityId)).toContain(related.id);
        expect(corpus.entities.find((e) => e.id === related.id)?.title).toBe(related.title);
      }
      expect(p.example_user_queries).toHaveLength(8);
      expect(new Set(p.example_user_queries).size).toBe(8);
      const search = corpus.searchDocuments.find((d) => d.ref.entityId === p.id)!;
      expect(search.verseNames).toContain('AI Usage');
      expect(search.collectionNames).toContain('Thinking with Language Models');

      const svg = await readFile(new URL(`apps/web/static${p.graphic.public_path}`, root), 'utf8');
      expect(svg).toContain(p.graphic.alt_text);
      expect(svg).toContain('viewBox="0 0 720 470"');
      expect(svg).toContain('role="img"');
      expect(svg).toContain('prefers-color-scheme:dark');
      expect(svg).not.toMatch(/<script|<foreignObject|onload=|href="https?:|javascript:/i);
      const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id) => id!.startsWith(`${p.id}-`))).toBe(true);
      for (const m of svg.matchAll(/url\(#([^)]*)\)/g)) expect(ids).toContain(m[1]);
      for (const id of svg.match(/aria-labelledby="([^"]+)"/)![1]!.split(' '))
        expect(ids).toContain(id);
    },
  );

  it('keeps the original decisive-unknown prose, practice, URL, and Decision Making membership', () => {
    const p = metadata.patterns.find((p) => p.id === metadata.reconciliation.id)!;
    const entity = corpus.entities.find((e) => e.id === p.id)!;
    expect(entity.title).toBe('Look for the Decisive Unknown');
    expect(entity.aliases).toContain('Expose the Decisive Unknown');
    expect(entity.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'decision-making',
    });
    expect(corpus.entities.find((e) => e.id === 'decision-making')!.verseMembers).toContainEqual(
      entity.ref,
    );
    expect(entity.practice).toBeUndefined();
    expect(entity.languagePracticeSource?.match(/= !form \{/g)).toHaveLength(6);
    expect(hash(entity.body.match(/```patternverse-language\n[\s\S]*?```/)![0])).toBe(
      metadata.reconciliation.migrated_practice_sha256,
    );

    const start = entity.body.indexOf(`## ${metadata.reconciliation.supplement_heading}\n\n`);
    const end = entity.body.indexOf('\n## Practice —', start);
    const extraLinks =
      '\n\n' +
      p.related_patterns
        .slice(2)
        .map((r) => `- [[${r.id}|${r.title}]] — ${r.relationship}`)
        .join('\n');
    const original = (entity.body.slice(0, start) + entity.body.slice(end + 1))
      .replace(extraLinks, '')
      .trim();
    expect(hash(original)).toBe(metadata.reconciliation.migrated_body_sha256);
  });
});
