// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { renderEntityArticle } from './markdown';
const root = resolve(process.cwd(), '../..');
const catalog = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/film-illustrations.json'), 'utf8'),
) as {
  visuals: { id: string; article_id: string; file: string; alt_text: string; caption: string }[];
};
const ids = [...new Set(catalog.visuals.map((v) => v.article_id))];
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
describe('Filmmaking illustrations', () => {
  it('covers the existing 49 canonical articles with 51 original compositions', () => {
    expect(ids).toHaveLength(49);
    expect(catalog.visuals).toHaveLength(51);
    expect(new Set(catalog.visuals.map((v) => v.id)).size).toBe(51);
  });
  it.each(ids)('renders %s through the existing captioned responsive pipeline', async (id) => {
    const entity = corpus.entities.find((e) => e.id === id)!;
    const rendered = await renderEntityArticle(entity, corpus.entities);
    const document = new DOMParser().parseFromString(rendered.html, 'text/html');
    for (const visual of catalog.visuals.filter((v) => v.article_id === id)) {
      const image = document.querySelector(`img[src="/assets/${visual.file}"]`)!;
      expect(image).not.toBeNull();
      expect(image.getAttribute('alt')).toBe(visual.alt_text);
      expect(image.getAttribute('width')).toBe('720');
      expect(image.getAttribute('height')).toBe('560');
      expect(image.closest('figure')?.textContent).toContain(visual.caption);
      expect(image.closest('figure')?.querySelector('source')?.getAttribute('srcset')).toBe(
        '/assets/' + visual.file.replace('.svg', '-mobile.svg'),
      );
      for (const file of [visual.file, visual.file.replace('.svg', '-mobile.svg')]) {
        const source = await readFile(resolve(root, 'content/assets', file), 'utf8');
        const xml = new DOMParser().parseFromString(source, 'image/svg+xml');
        expect(xml.querySelector('parsererror')).toBeNull();
        expect(xml.documentElement.getAttribute('data-film-style')).toBe('light-editorial');
        expect(xml.querySelector('title')?.textContent).toBeTruthy();
        expect(xml.querySelector('desc')?.textContent).toBeTruthy();
        expect(source).toContain('color-scheme:only light');
        expect(source).toContain('font-family:Helvetica Neue,Helvetica,Arial,sans-serif');
        expect(source).toContain('--paper:#fff');
        expect(source).not.toMatch(/prefers-color-scheme|Georgia|Times New Roman/);
        expect(source).not.toMatch(/<script|<image|<foreignObject|<filter|Gradient|https:\/\//);
      }
    }
  });
  it('keeps all 110 published film photographs captioned and every article connected', async () => {
    let photos = 0;
    for (const id of ids) {
      const entity = corpus.entities.find((e) => e.id === id)!;
      const rendered = await renderEntityArticle(entity, corpus.entities);
      const page = new DOMParser().parseFromString(rendered.html, 'text/html');
      for (const image of page.querySelectorAll('img[src^="https:"]')) {
        photos++;
        expect(image.getAttribute('alt')?.length, id).toBeGreaterThan(25);
        expect(
          image.closest('figure.content-photo')?.querySelector('figcaption')?.textContent,
          id,
        ).toContain('Credit:');
      }
      const links = [...page.querySelectorAll('a[href^="/pattern/film-"]')];
      expect(links.length, id).toBeGreaterThan(0);
      for (const link of links) {
        const target = link.getAttribute('href')!.split('/').at(-1)!.split('?')[0].split('#')[0];
        expect(ids, id).toContain(target);
        expect(target, id).not.toBe(id);
      }
    }
    expect(photos).toBe(110);
  });
});
