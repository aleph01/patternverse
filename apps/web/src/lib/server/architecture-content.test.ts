// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { createLibrary, createLibrarySearch } from '@patternverse/workspace/library';
import { renderEntityArticle } from './markdown';
import { contentAssetPaths } from './content-assets';

const root = resolve(process.cwd(), '../..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/architecture.json'), 'utf8'),
) as {
  article_outline: string[];
  patterns: {
    id: string;
    title: string;
    visuals: { file: string; alt_text: string; caption: string }[];
    photographs?: { file: string; caption: string }[];
  }[];
};
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

describe('Architecture reading and discovery', () => {
  it.each(metadata.patterns)(
    'renders every $title visual through the captioned responsive renderer',
    async (p) => {
      const entity = corpus.entities.find((e) => e.id === p.id)!;
      const article = await renderEntityArticle(entity, corpus.entities);
      const page = new DOMParser().parseFromString(article.html, 'text/html');
      expect(article.sections.filter((s) => s.depth === 2).map((s) => s.title)).toEqual(
        metadata.article_outline,
      );
      expect(article.sections.filter((s) => s.depth === 3).length).toBeGreaterThanOrEqual(2);
      expect(new Set(article.sections.map((s) => s.id)).size).toBe(article.sections.length);
      for (const section of article.sections)
        expect(page.getElementById(section.id)?.textContent).toBe(section.title);
      expect(page.querySelectorAll('figure')).toHaveLength(3 + (p.photographs?.length ?? 0));
      expect(p.photographs?.length).toBeGreaterThanOrEqual(1);
      expect(p.photographs?.length).toBeLessThanOrEqual(2);
      expect(page.body.textContent).not.toContain('[[');
      for (const visual of p.visuals) {
        const img = page.querySelector(`img[src="/assets/${visual.file}"]`)!;
        expect(img).not.toBeNull();
        expect(img.getAttribute('alt')).toBe(visual.alt_text);
        expect(img.getAttribute('width')).toBe('560');
        expect(img.getAttribute('loading')).toBe('lazy');
        expect(img.closest('figure')?.querySelector('source')?.getAttribute('srcset')).toBe(
          '/assets/' + visual.file.replace('.svg', '-mobile.svg'),
        );
        expect(img.closest('figure')?.textContent).toContain(visual.caption);
        const xml = new DOMParser().parseFromString(
          await readFile(resolve(root, 'content/assets', visual.file), 'utf8'),
          'image/svg+xml',
        );
        expect(xml.querySelector('parsererror')).toBeNull();
        expect(xml.querySelector('title')?.textContent).not.toBe('');
        expect(xml.documentElement.getAttribute('data-architecture-style')).toBe('light-editorial');
        const style = xml.querySelector('style')?.textContent;
        expect(style).toContain('color-scheme:only light');
        expect(style).toContain('--paper:#fff');
        expect(style).toContain('font-family:Helvetica Neue,Helvetica,Arial,sans-serif');
        expect(style).not.toContain('prefers-color-scheme');
      }
      for (const photo of p.photographs ?? []) {
        expect(
          page.querySelector(`img[src="/assets/${photo.file}"]`)?.closest('figure')?.textContent,
        ).toContain('Photograph:');
      }
    },
  );
  it('serves every diagram and photographic example through the existing asset route', async () => {
    const assets = new Set(await contentAssetPaths());
    const distinct = new Set(
      metadata.patterns.flatMap((p) => [...p.visuals, ...(p.photographs ?? [])].map((v) => v.file)),
    );
    const photos = new Set(
      metadata.patterns.flatMap((p) => (p.photographs ?? []).map((v) => v.file)),
    );
    expect(distinct.size).toBe(108 + photos.size);
    for (const file of distinct) expect(assets.has(file)).toBe(true);
  });
  it('retrieves architecture titles and real situation language with the existing library search', () => {
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
    for (const p of metadata.patterns)
      expect(search.search(p.title, { type: 'pattern' }).map((e) => e.id)).toContain(p.id);
    for (const [query, id] of [
      ['courtyard', 'arch-courtyards-which-live'],
      ['overheats', 'arch-external-solar-shading'],
      ['demolition', 'arch-reuse-before-replacement'],
      ['intercom', 'arch-inclusive-arrival'],
    ])
      expect(search.search(query, { type: 'pattern' }).map((e) => e.id)).toContain(id);
  });
});
