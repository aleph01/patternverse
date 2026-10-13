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
  await readFile(resolve(root, 'docs/pattern-packages/learning-how-to-learn.json'), 'utf8'),
) as {
  patterns: {
    id: string;
    title: string;
    aliases: string[];
    article_markdown: string;
    related_patterns: string[];
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

describe('Learning article rendering and discovery', () => {
  it.each(metadata.patterns)(
    'renders $title through the existing article renderer with real related links',
    async (pattern) => {
      const entity = corpus.entities.find((candidate) => candidate.id === pattern.id)!;
      const html = await renderEntityMarkdown(entity, corpus.entities);
      const page = new DOMParser().parseFromString(html, 'text/html');
      const paragraphs = pattern.article_markdown.split('\n\n');
      expect(page.querySelectorAll('p').length).toBeGreaterThanOrEqual(paragraphs.length);
      expect(page.querySelector('p')?.textContent).toBe(paragraphs[0]);
      expect(page.body.textContent).toContain(paragraphs.at(-1));
      for (const id of pattern.related_patterns)
        expect(page.querySelector(`a[href="/pattern/${id}"]`)).not.toBeNull();
      expect(html).not.toContain('patternverse-language');
      const mark = defaultPatternMark(pattern.id, pattern.title);
      expect(mark.generatorVersion).toBe(1);
      expect(mark.familyHint).toBeUndefined();
    },
  );

  it('finds all articles through title, aliases, Learning, and the collection name', () => {
    const search = createLibrarySearch(
      createLibrary([
        {
          id: 'commons',
          name: 'Commons',
          readonly: true,
          entries: corpus.entities.map((entity) => ({
            id: entity.id,
            sourceId: entity.sourceId,
            type: entity.type,
            title: entity.title,
            summary: entity.summary ?? '',
            status: entity.status,
          })),
          searchDocuments: corpus.searchDocuments.map((document) => ({
            ...document,
            entityId: document.ref.entityId,
          })),
        },
      ]),
    );
    for (const pattern of metadata.patterns) {
      for (const query of [pattern.title, ...pattern.aliases])
        expect(search.search(query, { type: 'pattern' }).map((entry) => entry.id)).toContain(
          pattern.id,
        );
    }
    for (const query of ['Learning', 'Learning How to Learn'])
      expect(search.search(query, { type: 'pattern' }).map((entry) => entry.id)).toEqual(
        expect.arrayContaining(metadata.patterns.map((pattern) => pattern.id)),
      );
  });
});
