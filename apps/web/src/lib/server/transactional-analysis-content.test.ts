// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from './markdown';

const root = resolve(process.cwd(), '../..');
const imported = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/transactional-analysis-import.json'), 'utf8'),
) as {
  patterns: {
    id: string;
    title: string;
    article_sha256: string;
    assets: { file: string; sha256: string }[];
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

describe('Transactional Analysis and Games People Play publication', () => {
  it('keeps all 36 articles directly in Games People Play without a parent collection', () => {
    const games = corpus.entities.find((entity) => entity.id === 'games-people-play')!;
    expect(
      corpus.entities.find((entity) => entity.id === 'transactional-analysis'),
    ).toBeUndefined();
    expect(
      corpus.searchDocuments.some((document) => document.ref.entityId === 'transactional-analysis'),
    ).toBe(false);
    expect(corpus.entities.some((entity) => entity.body.includes('[[transactional-analysis'))).toBe(
      false,
    );
    expect(imported.patterns).toHaveLength(36);
    expect(games.collectionItems.map((ref) => ref.entityId)).toEqual(
      imported.patterns.map((pattern) => pattern.id),
    );
    expect(games.collectionItems).toHaveLength(36);
    expect(games.collectionMemberships).toHaveLength(0);
    for (const { id } of imported.patterns) {
      const entity = corpus.entities.find((candidate) => candidate.id === id)!;
      expect(entity.type).toBe('pattern');
      expect(entity.status).toBe('published');
      expect(entity.verseMemberships.map((ref) => ref.entityId)).toContain(
        'communication-and-relationships',
      );
      expect(entity.collectionMemberships.map((ref) => ref.entityId)).toContain(games.id);
      expect(corpus.searchDocuments.some((document) => document.ref.entityId === id)).toBe(true);
    }
  });

  it.each(imported.patterns)(
    'preserves the complete illustrated $title article',
    async (pattern) => {
      const entity = corpus.entities.find((candidate) => candidate.id === pattern.id)!;
      expect(createHash('sha256').update(entity.body.trim()).digest('hex')).toBe(
        pattern.article_sha256,
      );
      expect(entity.body.split(/\s+/).length).toBeGreaterThan(1000);
      expect(entity.body).not.toMatch(/\/Users\/|:::writing/);
      const html = await renderEntityMarkdown(entity, corpus.entities);
      const page = new DOMParser().parseFromString(html, 'text/html');
      expect(page.querySelectorAll('h2').length).toBeGreaterThanOrEqual(5);
      expect(page.querySelectorAll('a[href^="https://"]').length).toBeGreaterThanOrEqual(2);
      expect(page.querySelector('a[href="/collection/games-people-play"]')).not.toBeNull();
      expect(page.querySelector('a[href="/collection/transactional-analysis"]')).toBeNull();
      expect(page.querySelector('a[href="/verse/communication-and-relationships"]')).not.toBeNull();
      const desktop = pattern.assets.find((asset) => !asset.file.endsWith('-mobile.svg'))!;
      const phone = pattern.assets.find((asset) => asset.file.endsWith('-mobile.svg'))!;
      expect(page.querySelector(`img[src="/assets/${desktop.file}"]`)).not.toBeNull();
      expect(page.querySelector(`picture source[srcset="/assets/${phone.file}"]`)).not.toBeNull();
      for (const asset of pattern.assets) {
        const bytes = await readFile(resolve(root, 'content/assets', asset.file));
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
      }
    },
  );
});
