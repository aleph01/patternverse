// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { createLibrary, createLibrarySearch } from '@patternverse/workspace/library';
import { therapeuticPatternForMethod } from '$lib/mira/pattern-eligibility';
import { renderEntityMarkdown } from './markdown';

const root = resolve(process.cwd(), '../..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/sleight-of-mouth.json'), 'utf8'),
) as {
  patterns: {
    id: string;
    title: string;
    related_pattern_ids: string[];
    source: { canonical_pattern: string };
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
describe('NLP reading, discovery and method metadata', () => {
  it.each(metadata.patterns)(
    'renders $title using normal article typography and links',
    async (p) => {
      const entity = corpus.entities.find((e) => e.id === p.id)!;
      const html = await renderEntityMarkdown(entity, corpus.entities);
      const page = new DOMParser().parseFromString(html, 'text/html');
      expect(page.querySelectorAll('h3').length).toBeGreaterThanOrEqual(4);
      expect(page.body.textContent).toContain('Robert Dilts');
      for (const id of p.related_pattern_ids)
        expect(page.querySelector(`a[href="/pattern/${id}"]`)).not.toBeNull();
      expect(html).not.toMatch(/<script|<iframe|patternverse-practice|patternverse-language/);
      expect(entity.languagePracticeSource).toContain(':language 1');
      expect(therapeuticPatternForMethod(entity, 'nlp')).toBe(true);
      for (const method of ['cbt', 'dbt', 'narm', 'coherence', 'fop'])
        expect(therapeuticPatternForMethod(entity, method)).toBe(false);
    },
  );
  it('finds all articles by title, canonical name, NLP and the full collection name', () => {
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
      for (const query of [p.title, p.source.canonical_pattern])
        expect(search.search(query, { type: 'pattern' }).map((e) => e.id)).toContain(p.id);
    }
    for (const query of ['NLP', 'Neuro-Linguistic Programming', 'Sleight of Mouth'])
      expect(search.search(query, { type: 'pattern' }).map((e) => e.id)).toEqual(
        expect.arrayContaining(metadata.patterns.map((p) => p.id)),
      );
  });
});
