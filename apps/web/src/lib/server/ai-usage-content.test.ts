// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { createLibrary, createLibrarySearch } from '@patternverse/workspace/library';
import { defaultPatternMark } from '../illustrations/pattern-mark-presets';
import { renderEntityMarkdown } from './markdown';

const root = resolve(process.cwd(), '../..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/ai-usage.json'), 'utf8'),
) as {
  patterns: {
    id: string;
    title: string;
    source_title: string;
    graphic: { public_path: string; alt_text: string; caption: string };
    related_patterns: { id: string }[];
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

describe('AI Usage reading and search', () => {
  it.each(metadata.patterns)(
    'renders $title through the established article components',
    async (p) => {
      const article = corpus.entities.find((e) => e.id === p.id)!;
      const html = await renderEntityMarkdown(article, corpus.entities);
      const page = new DOMParser().parseFromString(html, 'text/html');
      const figure = page.querySelector('figure.content-diagram')!;
      expect(figure).not.toBeNull();
      const img = figure.querySelector('img')!;
      expect(img.getAttribute('src')).toBe(p.graphic.public_path);
      expect(img.getAttribute('alt')).toBe(p.graphic.alt_text);
      expect(img.getAttribute('width')).toBe('720');
      expect(img.getAttribute('height')).toBe('470');
      expect(figure.querySelector('figcaption')?.textContent).toContain(p.graphic.caption);
      expect(figure.querySelector('[role="region"]')?.getAttribute('tabindex')).toBe('0');
      expect(html).not.toContain('<svg');
      expect(html).not.toContain('patternverse-practice');
      for (const r of p.related_patterns)
        expect(page.querySelector(`a[href="/pattern/${r.id}"]`)).not.toBeNull();
    },
  );

  it('finds all six patterns by title, verse, collection, and the reconciled title alias', () => {
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
    for (const p of metadata.patterns) {
      expect(search.search(p.title, { type: 'pattern' }).map((e) => e.id)).toContain(p.id);
      expect(search.search(p.source_title, { type: 'pattern' }).map((e) => e.id)).toContain(p.id);
    }
    for (const query of ['AI Usage', 'Thinking with Language Models']) {
      expect(search.search(query, { type: 'pattern' }).map((e) => e.id)).toEqual(
        expect.arrayContaining(metadata.patterns.map((p) => p.id)),
      );
    }
  });

  it('uses automatic slug-based icons, not inferred subject matter', () => {
    for (const pattern of metadata.patterns) {
      const recipe = defaultPatternMark(pattern.id, pattern.title);
      expect(recipe.generatorVersion).toBe(1);
      expect(recipe.familyHint).toBeUndefined();
    }
  });
});
