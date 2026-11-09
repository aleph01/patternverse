// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { beforeAll, describe, it, expect } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { createLibrary, createLibrarySearch } from '@patternverse/workspace/library';
import { renderEntityArticle } from './markdown';
import { contentAssetDimensions } from './content-assets';
import { findPatternGraphic, isPatternGraphic } from '$lib/illustrations/pattern-graphics';
const root = resolve(process.cwd(), '../..');
const ids = [
  'audit-logging',
  'humble-object',
  'golden-master-approval-testing',
  'parameterized-test',
  'ml-shadow-deployment',
];
const bundle = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
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
for (const id of ids)
  describe(id, () => {
    const m = bundle.patterns.find((p: { id: string }) => p.id === id);
    it('has one correct home, canonical identity, resolved neighbors and an authored mark', () => {
      const a = corpus.entities.find((e) => e.id === id)!;
      expect(a.title).toBe(m.title);
      expect(a.summary).toBe(m.short_description);
      expect(a.aliases ?? []).toEqual(m.aliases);
      expect(a.collectionMemberships.map((r) => r.entityId)).toEqual([m.collection_id]);
      expect(a.links.map((l) => l.target.entityId)).toEqual(m.related_pattern_ids);
      expect(corpus.diagnostics.filter((d) => d.entity?.entityId === id)).toEqual([]);
      expect(a.implementedByPractices).toEqual([]);
      const g = findPatternGraphic(id)!;
      expect(isPatternGraphic(g)).toBe(true);
      expect(g.mechanism).toBe(a.summary);
      expect(
        corpus.entities.find((e) => e.id === 'gof-design-patterns')!.collectionItems,
      ).toHaveLength(23);
      if (id === 'ml-shadow-deployment') {
        expect(a.verseMemberships.map((r) => r.entityId)).toEqual([
          'machine-learning',
          'software-engineering',
        ]);
        const former = corpus.entities.find(
          (e) => e.id === 'machine-learning-training-and-deployment',
        )!;
        expect(former.collectionItems).toHaveLength(8);
        expect(former.links.map((l) => l.target.entityId)).toContain(id);
      }
    });
    it('renders eight sections, exact copyable highlighted Python and responsive native SVG', async () => {
      const a = corpus.entities.find((e) => e.id === id)!;
      const { html, sections } = await renderEntityArticle(a, corpus.entities);
      expect(sections.filter((s) => s.depth === 2).map((s) => s.title)).toEqual([
        'Purpose and problem',
        'Core idea',
        'How it works',
        'Worked example',
        'When to use it',
        'Tradeoffs and common mistakes',
        'Related patterns',
        'Sources',
      ]);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const source =
        (await readFile(resolve(root, 'content/patterns', id + '.md'), 'utf8')).match(
          /```python\n([\s\S]*?)\n```/,
        )![1] + '\n';
      const pre = doc.querySelector('pre.syntax-highlighted')!;
      expect(pre.querySelector('code')!.textContent).toBe(source);
      expect(pre.getAttribute('tabindex')).toBe('0');
      expect(pre.querySelector('.syntax-kwd')).not.toBeNull();
      const figs = doc.querySelectorAll('figure.content-diagram');
      expect(figs).toHaveLength(1);
      expect(figs[0].querySelector('img')!.getAttribute('alt')).toBe(m.graphics[0].alt_text);
      expect(figs[0].textContent).toContain(m.graphics[0].caption);
      expect(figs[0].querySelector('source')!.getAttribute('srcset')).toBe(
        m.graphics[0].public_path.replace('.svg', '-mobile.svg'),
      );
      const dims = await contentAssetDimensions();
      for (const suffix of ['', '-mobile']) {
        const path = m.graphics[0].public_path
          .replace('/assets/', '')
          .replace('.svg', suffix + '.svg');
        const svg = await readFile(resolve(root, 'content/assets', path), 'utf8');
        const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/)!;
        expect(dims[path]).toEqual({ width: +w, height: +h });
        expect(svg).toContain('color-scheme:only light');
        expect(svg).not.toMatch(/<script|<foreignObject|onload=/);
      }
      if (id === 'ml-shadow-deployment')
        expect(
          JSON.parse(
            doc.querySelector('[data-article-widget]')!.getAttribute('data-article-widget')!,
          ).src,
        ).toBe('ml-shadow-deployment.html');
    });
    it('preserves metadata integrity and searches canonical names and aliases', async () => {
      const source = await readFile(resolve(root, 'content/patterns', id + '.md'), 'utf8');
      expect(m.article_sha256).toBe(createHash('sha256').update(source).digest('hex'));
      expect(m.example_user_queries).toHaveLength(10);
      expect(new Set(m.example_user_queries).size).toBe(10);
      expect(m.practices).toEqual([]);
      expect(m.body_word_count).toBeGreaterThanOrEqual(800);
      expect(m.body_word_count).toBeLessThanOrEqual(1600);
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
            searchDocuments: corpus.searchDocuments.map((d) => ({
              ...d,
              entityId: d.ref.entityId,
            })),
          },
        ]),
      );
      for (const query of [m.title, ...m.aliases])
        expect(search.search(query, { type: 'pattern' }).map((e) => e.id)).toContain(id);
    });
  });
