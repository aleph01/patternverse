// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { createLibrary, createLibrarySearch } from '@patternverse/workspace/library';
import { therapeuticPatternForMethod } from '$lib/mira/pattern-eligibility';
import { renderEntityMarkdown } from './markdown';
import { assetMimeType, contentAssetDimensions, contentAssetPaths } from './content-assets';

const root = resolve(process.cwd(), '../..');
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

describe('The Meta Model in the NLP library', () => {
  it('publishes the native article and practice in the existing NLP collection', () => {
    const article = corpus.entities.find((e) => e.id === 'meta-model')!;
    const collection = corpus.entities.find((e) => e.id === 'neuro-linguistic-programming')!;
    expect(corpus.diagnostics).toEqual([]);
    expect(corpus.unresolvedReferences).toEqual([]);
    expect(collection.title).toBe('NLP: Sleight of Mouth');
    expect(collection.collectionItems).toContainEqual(article.ref);
    expect(article.collectionMemberships).toContainEqual(collection.ref);
    expect(article.verseMemberships).toContainEqual({ sourceId: 'commons', entityId: 'therapy' });
    expect(article.languagePracticeSource).toContain(':language 1');
    expect(therapeuticPatternForMethod(article, 'nlp')).toBe(true);
  });

  it('renders all question types, captions, phone graphics and real related links without executable source', async () => {
    const article = corpus.entities.find((e) => e.id === 'meta-model')!;
    const html = await renderEntityMarkdown(article, corpus.entities);
    const page = new DOMParser().parseFromString(html, 'text/html');
    expect([...page.querySelectorAll('h2')].map((h) => h.textContent)).toContain(
      'Overview: the three broad categories',
    );
    expect(
      [...page.querySelectorAll('h3')].filter((h) => /^\d+\./.test(h.textContent ?? '')),
    ).toHaveLength(13);
    expect(page.querySelectorAll('figure')).toHaveLength(4);
    const dimensions = await contentAssetDimensions();
    const paths = await contentAssetPaths();
    for (const image of page.querySelectorAll('figure img')) {
      const path = image.getAttribute('src')!.replace('/assets/', '');
      const compact = path.replace('.svg', '-mobile.svg');
      expect(paths).toContain(path);
      expect(paths).toContain(compact);
      expect(assetMimeType(path)).toBe('image/svg+xml');
      expect(image.getAttribute('width')).toBe(String(dimensions[path].width));
      expect(image.getAttribute('height')).toBe(String(dimensions[path].height));
      expect(image.closest('figure')?.querySelector('source')?.getAttribute('srcset')).toBe(
        `/assets/${compact}`,
      );
      expect(image.closest('figure')?.querySelector('figcaption')?.textContent).not.toBe('');
      const svg = await readFile(resolve(root, 'content/assets', compact), 'utf8');
      expect(svg).toContain('<title');
      expect(svg).toContain('<desc');
      expect(svg).not.toMatch(/<script|<foreignObject|https?:\/\/(?!www\.w3\.org)/);
    }
    for (const id of [
      'chunk-down',
      'look-for-the-exception',
      'inspect-how-you-know',
      'redefine-the-terms',
    ])
      expect(page.querySelector(`a[href="/pattern/${id}"]`)).not.toBeNull();
    expect(html).not.toMatch(/<script|<iframe|patternverse-language|meta-model-guide\.pdf/);
    expect(page.body.textContent).not.toContain('No Patternverse content has been added');
  });

  it('finds the article by its method and alias through normal library search', () => {
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
    for (const query of ['NLP', 'Meta Model', 'Precision Questions'])
      expect(search.search(query, { type: 'pattern' }).map((e) => e.id)).toContain('meta-model');
  });
});
