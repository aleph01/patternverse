import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, parseMarkdownEntity } from '../src/index.js';

type Entry = Readonly<{
  id: string;
  title: string;
  summary: string;
  version: string;
  collection: string;
  tags: readonly string[];
  inputs: readonly { name: string; type: string }[];
  outputs: readonly string[];
  dependencies: readonly string[];
  sourceFile: string;
}>;
type Catalog = Readonly<{
  namespace: string;
  version: string;
  language: number;
  patterns: readonly Entry[];
}>;
const repository = resolve(process.cwd(), '../..');
const read = (path: string) => readFileSync(resolve(repository, path), 'utf8');
const catalog = JSON.parse(read('packages/reframing-patterns/catalog.json')) as Catalog;

describe('reframing Commons collection', () => {
  it('has a complete, acyclic catalog with exact public source copies', () => {
    expect(catalog.namespace).toBe('reframing');
    expect(catalog.language).toBe(1);
    expect(catalog.patterns).toHaveLength(23);
    const byId = new Map(catalog.patterns.map((entry) => [entry.id, entry]));
    expect(byId.size).toBe(23);
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const check = (id: string) => {
      if (visited.has(id)) return;
      expect(visiting.has(id), `cycle at ${id}`).toBe(false);
      visiting.add(id);
      for (const child of byId.get(id)?.dependencies ?? []) {
        expect(byId.has(child), `missing ${child}`).toBe(true);
        check(child);
      }
      visiting.delete(id);
      visited.add(id);
    };
    for (const entry of catalog.patterns) {
      check(entry.id);
      const slug = entry.id.replace('.', '-');
      const source = read(`packages/reframing-patterns/${entry.sourceFile}`).trimEnd();
      const article = read(`content/patterns/${slug}.md`);
      const parsed = parseMarkdownEntity(article, { sourceId: 'commons', sourcePath: slug });
      expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
      expect(parsed.entity?.id).toBe(slug);
      expect(parsed.entity?.title).toBe(entry.title);
      expect(parsed.entity?.summary).toBe(entry.summary);
      expect(parsed.entity?.tags).toEqual(entry.tags);
      expect(entry.version).toBe(catalog.version);
      expect(entry.collection).toBe('reframing');
      expect(source.startsWith(':language 1')).toBe(true);
      expect(article).toContain(`\`\`\`text\n${source}\n\`\`\``);
      expect(article).toContain('## Related patterns');
      expect(article).toContain('## Source');
      const prose =
        article
          .replace(/^---\n[\s\S]*?\n---\n/, '')
          .split('## Related patterns')[0]
          ?.trim() ?? '';
      const words = prose.split(/\s+/).length;
      expect(words, `${slug} article length`).toBeGreaterThanOrEqual(300);
      expect(words, `${slug} article length`).toBeLessThanOrEqual(900);
      const declaredInputs = [...source.matchAll(/^:input (\S+) (\S+)$/gm)].map((match) => ({
        name: match[1]!,
        type: match[2]!,
      }));
      const declaredOutputs = [...source.matchAll(/^:output (\S+)$/gm)].map((match) => match[1]!);
      const calls = [
        ...new Set([...source.matchAll(/^!use (reframing\.[a-z-]+)/gm)].map((match) => match[1]!)),
      ];
      expect(entry.inputs).toEqual(declaredInputs);
      expect(entry.outputs).toEqual(declaredOutputs);
      expect(entry.dependencies).toEqual(calls);
    }
  });

  it('groups all creativity techniques directly into two collections without losing or duplicating operators', async () => {
    const groups = ['reframing', 'getting-unstuck'];
    const root = read('content/collections/reframing.md');
    const overview = root.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
    const overviewWords = overview.split(/\s+/).length;
    expect(overviewWords).toBeGreaterThanOrEqual(800);
    expect(overviewWords).toBeLessThanOrEqual(1_200);
    const listed = groups.flatMap((id) => {
      const collection = read(`content/collections/${id}.md`);
      const parsed = parseMarkdownEntity(collection, { sourceId: 'commons', sourcePath: id });
      expect(parsed.diagnostics).toEqual([]);
      if (parsed.entity?.type !== 'collection') throw new Error(`Expected collection ${id}`);
      return parsed.entity.items;
    });
    expect(new Set(listed).size).toBe(26);
    expect([...listed].sort()).toEqual(
      [
        ...catalog.patterns.map((entry) => entry.id.replace('.', '-')),
        'creative-reframing',
        'five-alternative-frames',
        'reduce-the-first-step',
      ].sort(),
    );
    const corpus = await loadAndCompileCorpus({
      manifestPath: resolve(repository, 'patternverse.yaml'),
      contentDirectory: resolve(repository, 'content'),
      readonly: true,
    });
    expect(corpus.diagnostics).toEqual([]);
    expect(corpus.unresolvedReferences).toEqual([]);
    const creativity = corpus.entities.find((entity) => entity.id === 'creativity')!;
    const collections = creativity.verseMembers
      .map((ref) => corpus.entities.find((entity) => entity.id === ref.entityId))
      .filter((entity) => entity?.type === 'collection');
    expect(collections.map((entity) => entity!.title).sort()).toEqual([
      'Find New Possibilities',
      'See the Problem Differently',
    ]);
    for (const collection of collections) {
      expect(collection!.collectionItems).not.toHaveLength(0);
      expect(
        collection!.collectionItems.every(
          (ref) =>
            corpus.entities.find((entity) => entity.id === ref.entityId)?.type !== 'collection',
        ),
      ).toBe(true);
    }
    expect(
      corpus.entities.find((entity) => entity.id === 'reframing')!.collectionItems[0]!.entityId,
    ).toBe('reframing-rapid-reframe');
    expect(
      corpus.entities.find((entity) => entity.id === 'getting-unstuck')!.collectionItems[0]!
        .entityId,
    ).toBe('five-alternative-frames');
  });
});
