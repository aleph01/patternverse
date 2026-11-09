// Test support shared by the controlled-artwork suites after editorial consolidation.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityArticle } from './markdown';
const root = resolve(process.cwd(), '../..');
const ownership = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/graphic-design-consolidation.json'), 'utf8'),
).comparison_ownership as Record<string, string>;

export const findGraphicDesignAssetLink = (doc: Document, path: string) =>
  Array.from(doc.querySelectorAll('a[href]')).find(
    (link) =>
      new URL(link.getAttribute('href')!, 'https://example.test/pattern/article').pathname === path,
  ) ?? null;

export async function expectGraphicDesignComparisonDiscovery(names: readonly string[]) {
  const corpus = await loadAndCompileCorpus({
    manifestPath: resolve(root, 'patternverse.yaml'),
    contentDirectory: resolve(root, 'content'),
    readonly: true,
  });
  const pages = new Map<string, Document>();
  for (const name of names) {
    const destination = ownership[name];
    expect(destination, `No editorial owner for ${name}`).toBeDefined();
    let doc = pages.get(destination);
    if (!doc) {
      const article = corpus.entities.find((entity) => entity.id === destination);
      expect(article, `Missing comparison destination ${destination}`).toBeDefined();
      const rendered = await renderEntityArticle(article!, corpus.entities);
      doc = new DOMParser().parseFromString(rendered.html, 'text/html');
      pages.set(destination, doc);
    }
    const path = `/assets/graphic-design/${name}`;
    expect(
      findGraphicDesignAssetLink(doc, `${path}.svg`),
      `${name} full-size access`,
    ).not.toBeNull();
    expect(
      findGraphicDesignAssetLink(doc, `${path}-mobile.svg`),
      `${name} narrow access`,
    ).not.toBeNull();
    const inline = doc.querySelector(`img[src="${path}.svg"]`);
    if (inline) {
      expect(inline.getAttribute('alt')?.length).toBeGreaterThan(60);
      expect(
        inline.closest('figure')?.querySelector('figcaption')?.textContent?.length,
      ).toBeGreaterThan(20);
      expect(doc.querySelector(`source[srcset="${path}-mobile.svg"]`)).not.toBeNull();
    } else {
      const saved = new DOMParser().parseFromString(
        readFileSync(resolve(root, 'content/assets/graphic-design', name + '.svg'), 'utf8'),
        'image/svg+xml',
      );
      expect(saved.querySelector('title')?.textContent?.length).toBeGreaterThan(10);
      expect(saved.querySelector('desc')?.textContent?.length).toBeGreaterThan(35);
    }
  }
}
