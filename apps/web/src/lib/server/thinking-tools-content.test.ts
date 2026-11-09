// @vitest-environment jsdom
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from './markdown';

const root = resolve(process.cwd(), '../..');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/thinking-tools.json'), 'utf8'),
) as {
  patterns: {
    id: string;
    article_words: number;
    collections: string[];
    verses: string[];
    example_user_queries: string[];
    visual: { type: string; public_path?: string; alt_text?: string; caption?: string };
    sources: unknown[];
    distinction: string;
  }[];
};
let corpus: CompiledCorpus;
beforeAll(async () => {
  corpus = await loadAndCompileCorpus({
    manifestPath: resolve(root, 'patternverse.yaml'),
    contentDirectory: resolve(root, 'content'),
    readonly: true,
  });
});
describe('Thinking Tools publication contracts', () => {
  it('covers 25 distinct methods with substantial articles, source records, and specific discovery queries', () => {
    expect(new Set(metadata.patterns.map((p) => p.id)).size).toBe(25);
    for (const p of metadata.patterns) {
      expect(p.article_words).toBeGreaterThanOrEqual(800);
      expect(p.example_user_queries).toHaveLength(8);
      expect(new Set(p.example_user_queries).size).toBe(8);
      expect(p.sources.length).toBeGreaterThan(0);
      expect(p.distinction.length).toBeGreaterThan(30);
    }
  });
  it.each(metadata.patterns)(
    'publishes $id with a practice, valid memberships, and accessible figure when warranted',
    async (p) => {
      const entity = corpus.entities.find((e) => e.id === p.id)!;
      expect(entity).toBeDefined();
      if (entity.type !== 'pattern') throw new Error('Expected a pattern');
      expect(entity.languagePracticeSource).toContain(':output result');
      expect(entity.verses).toEqual(p.verses);
      for (const id of p.collections) {
        const collection = corpus.entities.find((e) => e.id === id)!;
        if (collection.type !== 'collection') throw new Error('Expected a collection');
        expect(collection.items).toContain(p.id);
      }
      const html = await renderEntityMarkdown(entity, corpus.entities);
      expect(html).not.toContain('patternverse-language');
      const page = new DOMParser().parseFromString(html, 'text/html');
      if (p.visual.type === 'native-svg') {
        const figure = page.querySelector('figure.content-diagram');
        expect(figure).not.toBeNull();
        expect(figure!.querySelector('img')?.getAttribute('alt')).toBe(p.visual.alt_text);
        expect(figure!.querySelector('figcaption')?.textContent).toContain(p.visual.caption);
        const path = p.visual.public_path?.startsWith('/assets/')
          ? resolve(root, 'content' + p.visual.public_path)
          : resolve(root, 'apps/web/static' + p.visual.public_path);
        expect(existsSync(path)).toBe(true);
        const xml = new DOMParser().parseFromString(readFileSync(path, 'utf8'), 'image/svg+xml');
        expect(xml.querySelector('parsererror')).toBeNull();
        expect(xml.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 720 470');
        expect(xml.querySelector('title')?.textContent).toBeTruthy();
        expect(xml.querySelector('desc')?.textContent).toBeTruthy();
      }
    },
  );
});
