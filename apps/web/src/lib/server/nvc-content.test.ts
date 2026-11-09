// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from './markdown';

const root = resolve(process.cwd(), '../..');
const imported = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/nvc-import.json'), 'utf8'),
) as {
  patterns: { id: string; title: string; article_sha256: string; sourceBodySha256: string }[];
};
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
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

describe('the eight complete NVC articles', () => {
  it('makes all eight reachable through the collection, verse, and search', () => {
    const collection = corpus.entities.find((e) => e.id === 'nonviolent-communication')!;
    expect(imported.patterns).toHaveLength(8);
    expect(collection.aliases).toContain('NVC');
    expect(collection.collectionItems.map((r) => r.entityId)).toEqual(
      imported.patterns.map((p) => p.id),
    );
    for (const { id } of imported.patterns) {
      const entity = corpus.entities.find((e) => e.id === id)!;
      expect(entity.status).toBe('published');
      expect(entity.verseMemberships.map((r) => r.entityId)).toContain(
        'communication-and-relationships',
      );
      expect(entity.collectionMemberships.map((r) => r.entityId)).toContain(collection.id);
      expect(corpus.searchDocuments.some((d) => d.ref.entityId === id)).toBe(true);
    }
  });

  it.each(imported.patterns)(
    'preserves the full $title chapter and its related links',
    async (pattern) => {
      const entity = corpus.entities.find((e) => e.id === pattern.id)!;
      expect(hash(entity.body.trim())).toBe(pattern.article_sha256);
      expect(entity.body.split(/\s+/).length).toBeGreaterThan(800);
      expect(entity.body).not.toMatch(/\/Users\/|:::writing|Editorial note on visuals/);
      const original = entity.body
        .replace(/^\*An editorial pattern[^\n]+\n\n/, '')
        .split('\n\n## Browse this field guide')[0]
        .replace(/^## /gm, '### ')
        .replace(/\[\[nvc-[^|]+\|([^\]]+)\]\]/g, '*$1*')
        .trim();
      expect(hash(original)).toBe(pattern.sourceBodySha256);
      const html = await renderEntityMarkdown(entity, corpus.entities);
      const page = new DOMParser().parseFromString(html, 'text/html');
      expect(page.querySelectorAll('h2').length).toBeGreaterThanOrEqual(5);
      expect(page.querySelectorAll('blockquote').length).toBeGreaterThanOrEqual(1);
      expect(page.querySelectorAll('a[href^="https://"]').length).toBeGreaterThanOrEqual(1);
      expect(page.querySelector('a[href="/collection/nonviolent-communication"]')).not.toBeNull();
      expect(page.querySelectorAll('a[href^="/pattern/nvc-"]').length).toBeGreaterThanOrEqual(2);
      expect(page.querySelectorAll('img,iframe')).toHaveLength(0);
    },
  );
});
