// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { CompiledCorpus } from '@patternverse/compiler';
import { loadCommons } from './commons';
import { articleNavigationAsset, articleNavigationContext } from './article-navigation';

vi.mock('$app/environment', () => ({ dev: false }));
let corpus: CompiledCorpus;
beforeAll(async () => {
  corpus = await loadCommons();
});

describe('compiled breadcrumb navigation', () => {
  it('includes sibling collections with source-qualified Verse memberships and authored article order', () => {
    const { navigation } = articleNavigationAsset(corpus);
    const software = navigation.verses.find((verse) => verse.id === 'software-engineering')!;
    expect(software.collectionKeys).toContain('commons:gof-design-patterns');
    const collection = navigation.collections.find((entry) => entry.id === 'gof-design-patterns')!;
    const authored = corpus.entities.find((entry) => entry.id === 'gof-design-patterns')!;
    expect(collection.items.map((item) => `${item.sourceId}:${item.id}`)).toEqual(
      authored.collectionItems.map((ref) => `${ref.sourceId}:${ref.entityId}`),
    );
  });
  it('embeds only the current path and loads unrelated collections from the shared asset', () => {
    const entity = corpus.entities.find((entry) => entry.id === 'observer')!;
    const context = articleNavigationContext(corpus, entity);
    expect(context.navigation.collections.map((entry) => entry.id)).toEqual([
      'gof-design-patterns',
    ]);
    expect(
      context.navigation.collections.every((entry) =>
        entry.items.some((item) => item.id === 'observer'),
      ),
    ).toBe(true);
    expect(context.navigation.verses.some((entry) => entry.id === 'software-engineering')).toBe(
      true,
    );
  });
  it('keeps article-body edits out of navigation downloads and page context', () => {
    const larger = {
      ...corpus,
      entities: corpus.entities.map((entity) => ({
        ...entity,
        body: `${entity.body}\n${'Extra prose '.repeat(100)}`,
      })),
    };
    expect(articleNavigationAsset(larger).body).toBe(articleNavigationAsset(corpus).body);
    expect(articleNavigationAsset(larger).asset).toEqual(articleNavigationAsset(corpus).asset);
    expect(articleNavigationAsset(corpus)).toBe(articleNavigationAsset(corpus));
    expect(articleNavigationAsset(corpus).body).not.toContain('Extra prose');
  });
  it('supports a collection page directly and preserves the guided-course default', () => {
    const collection = corpus.entities.find((entry) => entry.id === 'gof-design-patterns')!;
    expect(
      articleNavigationContext(corpus, collection).navigation.collections.map((entry) => entry.id),
    ).toEqual(['gof-design-patterns']);
    const original = corpus.entities.find((entry) => entry.id === 'observer')!;
    const chapter = {
      ...original,
      id: 'songwriting-example',
      ref: { sourceId: 'commons', entityId: 'songwriting-example' },
      collectionMemberships: [
        { sourceId: 'commons', entityId: 'songwriting-reference' },
        { sourceId: 'commons', entityId: 'songwriting-part-1' },
      ],
    };
    const reference = {
      ...collection,
      id: 'songwriting-reference',
      ref: { sourceId: 'commons', entityId: 'songwriting-reference' },
      collectionItems: [chapter.ref],
    };
    const guided = {
      ...reference,
      id: 'songwriting-part-1',
      ref: { sourceId: 'commons', entityId: 'songwriting-part-1' },
    };
    const fixture = { ...corpus, entities: [...corpus.entities, chapter, reference, guided] };
    expect(articleNavigationContext(fixture, chapter).navigation.collections[0].id).toBe(
      'songwriting-part-1',
    );
  });
});
