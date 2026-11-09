import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '../src/index.js';

const root = new URL('../../../', import.meta.url);
const metadata = JSON.parse(
  await readFile(new URL('docs/pattern-packages/architecture.json', root), 'utf8'),
) as {
  article_outline: string[];
  groups: { id: string; collections: { id: string; items: string[] }[] }[];
  patterns: {
    id: string;
    title: string;
    scale: string[];
    design_concerns: string[];
    collection: string;
    related_patterns: string[];
    example_user_queries: string[];
    provenance: { kind: string; authors: string };
  }[];
  practices: { id: string; implements: string[] }[];
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

describe('Architecture corpus integration', () => {
  it('publishes the complete hierarchy without broken identities, links or collection cycles', () => {
    expect(corpus.diagnostics).toEqual([]);
    expect(corpus.unresolvedReferences).toEqual([]);
    expect(metadata.patterns).toHaveLength(36);
    expect(new Set(metadata.patterns.map((p) => p.id)).size).toBe(36);
    expect(metadata.groups.map((g) => g.id)).toEqual([
      'architecture-place',
      'architecture-space',
      'architecture-fabric',
      'architecture-practice',
    ]);
    expect(metadata.groups.flatMap((g) => g.collections)).toHaveLength(10);
    for (const group of metadata.groups) {
      expect(
        corpus.entities.find((e) => e.id === group.id)?.collectionItems.map((r) => r.entityId),
      ).toEqual(group.collections.map((c) => c.id));
      for (const collection of group.collections)
        expect(
          corpus.entities
            .find((e) => e.id === collection.id)
            ?.collectionItems.map((r) => r.entityId),
        ).toEqual(collection.items);
    }
    expect(corpus.entities.find((e) => e.id === 'architecture')?.verseMembers).toHaveLength(51);
  });

  it.each(metadata.patterns)(
    'indexes all situations, scale and concern metadata for $title',
    (p) => {
      const matches = corpus.entities.filter((e) => e.id === p.id);
      expect(matches).toHaveLength(1);
      const entity = matches[0]!;
      expect([...entity.body.matchAll(/^## (.+)$/gm)].map((m) => m[1])).toEqual(
        metadata.article_outline,
      );
      expect(entity.type).toBe('pattern');
      expect(entity.verseMemberships.map((r) => r.entityId)).toContain('architecture');
      expect(entity.collectionMemberships.map((r) => r.entityId)).toContain(p.collection);
      const doc = corpus.searchDocuments.find((d) => d.ref.entityId === p.id)!;
      expect(doc.verseNames).toContain('Architecture');
      expect(doc.tags).toEqual(
        expect.arrayContaining([...p.scale.map((s) => 'scale-' + s), ...p.design_concerns]),
      );
      expect(p.example_user_queries).toHaveLength(8);
      for (const query of p.example_user_queries) expect(doc.body).toContain(query);
      for (const id of p.related_patterns)
        expect(entity.links.map((l) => l.target.entityId)).toContain(id);
      expect(p.provenance.authors.length).toBeGreaterThan(15);
    },
  );

  it('shares canonical articles across collections and reuses neighboring general reasoning patterns', () => {
    expect(
      corpus.entities.find((e) => e.id === 'arch-courtyards-which-live')!.collectionMemberships
        .length,
    ).toBeGreaterThanOrEqual(3);
    expect(
      corpus.entities
        .find((e) => e.id === 'arch-test-at-full-scale')!
        .links.map((l) => l.target.entityId),
    ).toContain('prefer-the-smallest-useful-experiment');
    expect(
      corpus.entities
        .find((e) => e.id === 'arch-compare-spatial-alternatives')!
        .links.map((l) => l.target.entityId),
    ).toContain('reframing-alternative-paths');
    expect(corpus.entities.find((e) => e.id === 'arch-loose-fit-layers')!.title).toBe(
      'Shearing Layers',
    );
  });

  it('contains no guided practices or executable practice links', () => {
    expect(metadata.practices).toEqual([]);
    expect(
      corpus.searchDocuments.filter(
        (d) => d.type === 'practice' && d.verseNames.includes('Architecture'),
      ),
    ).toEqual([]);
    expect(
      corpus.entities.filter(
        (e) =>
          e.type === 'practice' && e.verseMemberships.some((v) => v.entityId === 'architecture'),
      ),
    ).toEqual([]);
    for (const pattern of metadata.patterns)
      expect(corpus.entities.find((e) => e.id === pattern.id)!.implementedByPractices).toEqual([]);
  });
});
