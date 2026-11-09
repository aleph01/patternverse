// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';

const root = resolve(process.cwd(), '../..');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
) as { patterns: { id: string; collections: string[] }[] };
const groups = [
  ['machine-learning-inputs-and-features', 8],
  ['machine-learning-learning-and-adaptation', 10],
  ['machine-learning-evaluation-and-uncertainty', 8],
  ['machine-learning-training-and-deployment', 10],
  ['machine-learning-monitoring-and-robustness', 5],
  ['machine-learning-decisions-and-feedback', 4],
  ['machine-learning-generative-systems', 4],
  ['machine-learning-privacy-and-governance', 4],
] as const;
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

describe('Machine Learning collection organization', () => {
  it('offers eight published collections directly in the verse without a parent collection', () => {
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(corpus.entities.some((e) => e.id === 'machine-learning-field-guide')).toBe(false);
    const verse = corpus.entities.find((e) => e.id === 'machine-learning')!;
    const collections = corpus.entities.filter(
      (e) => e.type === 'collection' && e.verseMemberships.some((ref) => ref.entityId === verse.id),
    );
    expect(collections.map((e) => e.id).sort()).toEqual(groups.map(([id]) => id).sort());
    for (const [id, count] of groups) {
      const group = corpus.entities.find((e) => e.id === id)!;
      expect(group.type).toBe('collection');
      expect(group.status).toBe('published');
      expect(group.collectionItems).toHaveLength(count);
      expect(group.verseMemberships).toContainEqual({
        sourceId: 'commons',
        entityId: 'machine-learning',
      });
      expect(group.collectionMemberships).toEqual([]);
      expect(verse.links.some((link) => link.target.entityId === id)).toBe(true);
    }
  });

  it('places every integrated article exactly once and keeps recommendation metadata aligned', () => {
    const placed = groups.flatMap(([id]) =>
      corpus.entities.find((e) => e.id === id)!.collectionItems.map((ref) => ref.entityId),
    );
    expect(placed).toHaveLength(53);
    expect(new Set(placed).size).toBe(53);
    expect([...placed].sort()).toEqual(metadata.patterns.map((p) => p.id).sort());
    for (const pattern of metadata.patterns) {
      const article = corpus.entities.find((e) => e.id === pattern.id)!;
      expect(article.type).toBe('pattern');
      expect(article.collectionMemberships).toEqual([
        { sourceId: 'commons', entityId: pattern.collections[0] },
      ]);
      expect(pattern.collections).toHaveLength(1);
      expect(article.verseMemberships).toContainEqual({
        sourceId: 'commons',
        entityId: 'machine-learning',
      });
    }
  });
});
