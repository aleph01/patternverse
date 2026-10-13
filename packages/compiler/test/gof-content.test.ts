import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
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
    category: string;
    short_description: string;
    tags: string[];
    use_when: string[];
    not_ideal_when: string[];
    prerequisites: string[];
    difficulty: string;
    related_patterns: string[];
    related_pattern_ids: string[];
    example_user_queries: string[];
    article_sha256: string;
    article_word_count: number;
    graphic: { public_path: string; caption: string; alt_text: string };
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

describe('GoF article integration', () => {
  it('has exactly 23 unique canonical articles, 5 creational, 7 structural, 11 behavioral', () => {
    expect(corpus.diagnostics).toEqual([]);
    expect(corpus.unresolvedReferences).toEqual([]);
    expect(metadata.patterns).toHaveLength(23);
    const all = corpus.entities.filter(
      (e) => e.type === 'pattern' && e.tags?.includes('gof-design-patterns'),
    );
    expect(all).toHaveLength(23);
    expect(new Set(all.map((e) => e.id)).size).toBe(23);
    expect(new Set(all.map((e) => e.title)).size).toBe(23);
    for (const [category, count] of [
      ['Creational', 5],
      ['Structural', 7],
      ['Behavioral', 11],
    ] as const) {
      const members = metadata.patterns.filter((p) => p.category === category);
      expect(members).toHaveLength(count);
      const collection = corpus.entities.find((e) => e.id === `gof-${category.toLowerCase()}`);
      expect(collection?.collectionItems.map((r) => r.entityId)).toEqual(members.map((p) => p.id));
    }
    const collection = corpus.entities.find((e) => e.id === 'gof-design-patterns');
    expect(collection?.collectionItems.map((r) => r.entityId)).toEqual(
      metadata.patterns.map((p) => p.id),
    );
    const verse = corpus.entities.find((e) => e.id === 'software-engineering');
    expect(verse?.verseMembers).toHaveLength(27);
  });

  it.each(metadata.patterns)(
    'preserves the complete $title text, metadata, diagram and resolved neighbors',
    async (p) => {
      const matches = corpus.entities.filter((e) => e.id === p.id || e.title === p.title);
      expect(matches).toHaveLength(1);
      const article = matches[0]!;
      expect(article.type).toBe('pattern');
      expect(article.summary).toBe(p.short_description);
      expect(article.practice).toBeUndefined();
      expect(article.implementedByPractices).toEqual([]);
      expect(article.body).not.toContain('patternverse-practice');
      expect(article.tags).toEqual(expect.arrayContaining(p.tags));
      expect(article.verseMemberships).toContainEqual({
        sourceId: 'commons',
        entityId: 'software-engineering',
      });
      expect(article.collectionMemberships.map((r) => r.entityId)).toEqual(
        expect.arrayContaining(['gof-design-patterns', `gof-${p.category.toLowerCase()}`]),
      );

      const diagram = `![${p.graphic.alt_text}](${p.graphic.public_path} "${p.graphic.caption}")`;
      expect(article.body.split(diagram)).toHaveLength(2);
      expect(article.body.indexOf(diagram)).toBeLessThan(article.body.indexOf('\n### '));
      const supplied = article.body
        .split('\n## Pattern details')[0]!
        .replace(`\n\n${diagram}`, '')
        .trim();
      expect(createHash('sha256').update(supplied).digest('hex')).toBe(p.article_sha256);
      expect(supplied.split(/\s+/)).toHaveLength(p.article_word_count);
      for (const detail of [...p.use_when, ...p.not_ideal_when, ...p.prerequisites, p.difficulty])
        expect(article.body).toContain(detail);
      expect(article.links.map((r) => r.target.entityId)).toEqual(p.related_pattern_ids);
      expect(article.links.map((r) => r.resolvedLabel)).toEqual(p.related_patterns);
      for (const link of article.links)
        expect(
          corpus.entities.some((e) => e.id === link.target.entityId && e.type === 'pattern'),
        ).toBe(true);
      expect(p.example_user_queries).toHaveLength(8);
      expect(new Set(p.example_user_queries).size).toBe(8);

      const document = corpus.searchDocuments.find((d) => d.ref.entityId === p.id)!;
      expect(document.verseNames).toContain('Software Engineering');
      expect(document.collectionNames).toContain('GoF Design Patterns');
      expect(document.collectionNames).toContain(p.category);
      expect(document.body).toBe(article.body);
      const reparsed = parseMarkdownEntity(serializeEntity(article), {
        sourceId: 'commons',
        sourcePath: article.sourcePath!,
      });
      expect(reparsed.diagnostics).toEqual([]);
      expect(reparsed.entity?.body.trim()).toBe(article.body.trim());

      const svg = await readFile(new URL(`apps/web/static${p.graphic.public_path}`, root), 'utf8');
      expect(svg).toContain(p.graphic.alt_text);
      expect(svg).toContain('role="img"');
      expect(svg).toContain('viewBox="0 0 720 470"');
      expect(svg).toContain('prefers-color-scheme:dark');
      expect(svg).toContain('--diagram-highlight:#dff8ea');
      expect(svg).not.toMatch(/<script|<foreignObject|onload=|href="https?:|javascript:/i);
      const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id) => id!.startsWith(`${p.id}-`))).toBe(true);
      for (const match of svg.matchAll(/url\(#([^)]*)\)/g)) expect(ids).toContain(match[1]);
      for (const id of svg.match(/aria-labelledby="([^"]+)"/)![1]!.split(' '))
        expect(ids).toContain(id);
    },
  );

  it('contains only the 23 required diagram assets', async () => {
    const files = await readdir(new URL('apps/web/static/diagrams/gof/', root));
    expect(files.sort()).toEqual(metadata.patterns.map((p) => `${p.id}.svg`).sort());
  });
});
