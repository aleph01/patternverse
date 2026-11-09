// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { createLibrary, createLibrarySearch } from '@patternverse/workspace/library';
import { verseArea } from '../verse-areas';
import { renderEntityMarkdown } from './markdown';

const root = resolve(process.cwd(), '../..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/parenting.json'), 'utf8'),
) as {
  collection_id: string;
  groups: { id: string; pattern_ids: string[] }[];
  patterns: {
    id: string;
    title: string;
    aliases: string[];
    related_patterns: string[];
    article_sha256: string;
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

describe('Parenting field guide import', () => {
  it('publishes all 27 separate guides in six groups under Life & Wellbeing', () => {
    const verse = corpus.entities.find((entity) => entity.id === 'parenting')!;
    expect(verse.type).toBe('verse');
    expect(verse.status).toBe('published');
    expect(verseArea(verse).title).toBe('Life & Wellbeing');
    const guides = corpus.entities.filter(
      (entity) => entity.type === 'pattern' && entity.verses?.includes('parenting'),
    );
    expect(guides.map((entity) => entity.id).sort()).toEqual(
      metadata.patterns.map((pattern) => pattern.id).sort(),
    );
    expect(guides).toHaveLength(27);
    expect(metadata.groups).toHaveLength(6);
    const guide = corpus.entities.find((entity) => entity.id === metadata.collection_id)!;
    expect(guide.type).toBe('collection');
    expect(guide.collectionItems.map((ref) => ref.entityId)).toEqual(
      metadata.groups.map((group) => group.id),
    );
    expect(metadata.groups.flatMap((group) => group.pattern_ids)).toEqual(
      metadata.patterns.map((pattern) => pattern.id),
    );
    for (const group of metadata.groups) {
      const collection = corpus.entities.find((entity) => entity.id === group.id)!;
      expect(collection.collectionItems.map((ref) => ref.entityId)).toEqual(group.pattern_ids);
    }
  });

  it.each(metadata.patterns)('preserves and renders the revised $title', async (pattern) => {
    const entity = corpus.entities.find((candidate) => candidate.id === pattern.id)!;
    expect(createHash('sha256').update(entity.body.trim()).digest('hex')).toBe(
      pattern.article_sha256,
    );
    const html = await renderEntityMarkdown(entity, corpus.entities);
    const page = new DOMParser().parseFromString(html, 'text/html');
    expect(page.querySelectorAll('h2')).toHaveLength(9);
    expect(page.querySelector('h2')?.textContent).toBe('1. A recognizable situation');
    expect([...page.querySelectorAll('h2')].at(-1)?.textContent).toBe(
      '9. Related patterns and sources',
    );
    expect(page.querySelectorAll('a[href^="https://"]').length).toBeGreaterThan(0);
    expect(html).not.toContain('chatgpt.com/space/');
    expect(page.querySelector('a[href="/collection/parenting-field-guide"]')).not.toBeNull();
    for (const id of pattern.related_patterns) {
      expect(page.querySelector(`a[href="/pattern/${id}"]`)).not.toBeNull();
    }
  });

  it('finds each guide by title and aliases, and all guides through Parenting', () => {
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
      for (const query of [pattern.title, ...pattern.aliases]) {
        expect(search.search(query, { type: 'pattern' }).map((entry) => entry.id)).toContain(
          pattern.id,
        );
      }
    }
    expect(search.search('Parenting', { type: 'pattern' }).map((entry) => entry.id)).toEqual(
      expect.arrayContaining(metadata.patterns.map((pattern) => pattern.id)),
    );
  });
});
