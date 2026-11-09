// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from './markdown';

const root = resolve(process.cwd(), '../..');
const imported = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/bowen-import.json'), 'utf8'),
) as {
  patterns: {
    id: string;
    title: string;
    article_sha256: string;
    widget: { file: string; sha256: string; originalSha256: string } | null;
    assets: { file: string; sha256: string }[];
  }[];
};
let corpus: CompiledCorpus;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

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

describe('Bowen articles recovered from Find similar theories of dynamics', () => {
  it('publishes all six complete entries in their collection and verse, with search records', () => {
    const collection = corpus.entities.find((e) => e.id === 'bowen-family-systems')!;
    expect(imported.patterns).toHaveLength(6);
    expect(collection.collectionItems.map((ref) => ref.entityId)).toEqual(
      imported.patterns.map((pattern) => pattern.id),
    );
    for (const { id } of imported.patterns) {
      const entity = corpus.entities.find((e) => e.id === id)!;
      expect(entity.status).toBe('published');
      expect(entity.verseMemberships.map((ref) => ref.entityId)).toContain(
        'communication-and-relationships',
      );
      expect(entity.collectionMemberships.map((ref) => ref.entityId)).toContain(collection.id);
      expect(corpus.searchDocuments.some((doc) => doc.ref.entityId === id)).toBe(true);
    }
  });

  it.each(imported.patterns)(
    'preserves the full $title article and its visual',
    async (pattern) => {
      const entity = corpus.entities.find((e) => e.id === pattern.id)!;
      expect(hash(entity.body.trim())).toBe(pattern.article_sha256);
      expect(entity.body.split(/\s+/).length).toBeGreaterThan(950);
      expect(entity.body).not.toMatch(/\/Users\/|:::writing|Illustration decision/);
      const html = await renderEntityMarkdown(entity, corpus.entities);
      const page = new DOMParser().parseFromString(html, 'text/html');
      expect(page.querySelectorAll('h2').length).toBeGreaterThanOrEqual(6);
      expect(page.querySelectorAll('a[href^="https://"]').length).toBeGreaterThanOrEqual(3);
      expect(page.querySelector('a[href="/collection/bowen-family-systems"]')).not.toBeNull();
      if (pattern.widget) {
        const source = await readFile(resolve(root, 'content/assets', pattern.widget.file), 'utf8');
        expect(hash(source)).toBe(pattern.widget.sha256);
        const fragment = source.slice(source.indexOf('<div id='), source.lastIndexOf('\n</body>'));
        expect(hash(fragment)).toBe(pattern.widget.originalSha256);
        expect(entity.body).toContain(
          '"src": "' + pattern.widget.file.replace('widgets/', '') + '"',
        );
        expect(source).toContain('aria-live="polite"');
        expect(source).toContain('data-story=');
      } else {
        expect(page.querySelectorAll('table tbody tr')).toHaveLength(5);
        for (const asset of pattern.assets) {
          expect(hash(await readFile(resolve(root, 'content/assets', asset.file)))).toBe(
            asset.sha256,
          );
        }
        expect(page.querySelector('img[src="/assets/bowen/family-diagram.svg"]')).not.toBeNull();
        expect(
          page.querySelector('source[srcset="/assets/bowen/family-diagram-mobile.svg"]'),
        ).not.toBeNull();
      }
    },
  );
});
