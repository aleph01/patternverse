// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { createLibrary, createLibrarySearch } from '@patternverse/workspace/library';
import { renderEntityArticle } from './markdown';
import { findGraphicDesignAssetLink } from './graphic-design-comparison-discovery';
import {
  graphicDesignLegacyEntries,
  graphicDesignLegacyLocation,
} from './graphic-design-consolidation';
import { findPatternGraphic, isPatternGraphic } from '../illustrations/pattern-graphics';

const root = resolve(process.cwd(), '../..');
const read = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const pkg = read('docs/pattern-packages/graphic-design.json');
const rollout = read('docs/pattern-packages/graphic-design-consolidation.json');
const originals = read('docs/pattern-packages/graphic-design-original-articles.json');
const audit = read('docs/pattern-packages/graphic-design-editorial-audit.json');
let corpus: CompiledCorpus;
const pages = new Map<string, Document>();
async function page(id: string) {
  const existing = pages.get(id);
  if (existing) return existing;
  const entity = corpus.entities.find((e) => e.id === id)!;
  expect(entity, id).toBeDefined();
  const rendered = await renderEntityArticle(entity, corpus.entities);
  const doc = new DOMParser().parseFromString(rendered.html, 'text/html');
  pages.set(id, doc);
  return doc;
}
beforeAll(async () => {
  corpus = await loadAndCompileCorpus({
    manifestPath: resolve(root, 'patternverse.yaml'),
    contentDirectory: resolve(root, 'content'),
    readonly: true,
  });
});

describe('Graphic Design editorial consolidation', () => {
  it('has 39 authored core patterns, one foundation and no unfulfilled core briefs', () => {
    const actual = corpus.entities.filter(
      (e) => e.type === 'pattern' && e.id.startsWith('graphic-design-'),
    );
    expect(actual.map((e) => e.id).sort()).toEqual(
      pkg.patterns.map((p: { id: string }) => p.id).sort(),
    );
    expect(actual).toHaveLength(39);
    expect(
      corpus.entities
        .filter((e) => e.type === 'concept' && e.id.startsWith('graphic-design-'))
        .map((e) => e.id),
    ).toEqual(['graphic-design-foundations-contrast']);
    expect(
      pkg.groups
        .flatMap((g: { items: { state: string }[] }) => g.items)
        .filter((i: { state: string }) => i.state === 'planned'),
    ).toHaveLength(0);
    expect(pkg.planned_core_briefs).toHaveLength(0);
    expect(pkg.completed_core_briefs).toHaveLength(3);
    for (const brief of pkg.completed_core_briefs) {
      expect(brief.status).toBe('authored');
      expect(corpus.entities.some((e) => e.id === brief.id)).toBe(true);
    }
    for (const brief of pkg.planned_core_briefs) {
      expect(brief.status).toBe('planned');
      expect(brief.example_briefs).toHaveLength(3);
      expect(corpus.entities.some((e) => e.id === brief.id)).toBe(false);
    }
    for (const id of Object.keys(rollout.redirects))
      expect(corpus.entities.some((e) => e.id === id)).toBe(false);
  });

  it('keeps collections and related-pattern metadata on actual core decisions', () => {
    const ids = new Set(pkg.patterns.map((p: { id: string }) => p.id));
    const planned = new Set(pkg.planned_core_briefs.map((p: { id: string }) => p.id));
    for (const p of pkg.patterns) {
      expect(p.example_user_queries.length).toBeGreaterThanOrEqual(8);
      expect(p.example_user_queries.length).toBeLessThanOrEqual(15);
      for (const rel of p.related_patterns)
        expect(ids.has(rel.id), `${p.id} → ${rel.id}`).toBe(true);
      for (const id of p.planned_neighbors) expect(planned.has(id)).toBe(true);
      const entity = corpus.entities.find((e) => e.id === p.id)!;
      expect(entity.status).toBe('published');
      expect(findPatternGraphic(p.id)?.mechanism).toBe(entity.summary);
      expect(isPatternGraphic(findPatternGraphic(p.id))).toBe(true);
    }
    for (const collection of corpus.entities.filter(
      (e) => e.type === 'collection' && e.id.startsWith('graphic-design-'),
    )) {
      for (const item of collection.collectionItems)
        expect(Object.hasOwn(rollout.redirects, item.entityId)).toBe(false);
    }
  });

  it('finds every retired title through the actual library search aliases', () => {
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
    for (const old of pkg.retired_patterns) {
      const target = rollout.redirects[old.id].id;
      expect(
        search.search(old.title).map((e) => e.id),
        old.title,
      ).toContain(target);
      const entry = pkg.patterns.find((p: { id: string }) => p.id === target);
      if (entry)
        for (const query of old.example_user_queries)
          expect(entry.legacy_user_queries).toContain(query);
    }
  });

  it('preserves old links, queries and real section anchors without exposing missing draft targets', async () => {
    expect(graphicDesignLegacyEntries(corpus.entities)).toHaveLength(19);
    expect(graphicDesignLegacyEntries([])).toEqual([]);
    for (const [id, unknown] of Object.entries(rollout.redirects)) {
      const target = unknown as { type: string; id: string; fragment?: string };
      const location = graphicDesignLegacyLocation(
        'pattern',
        id,
        corpus.entities,
        '/preview',
        '?from=legacy',
      );
      expect(location).toBe(
        `/preview/${target.type}/${target.id}?from=legacy${target.fragment ? '#' + target.fragment : ''}`,
      );
      if (target.fragment)
        expect((await page(target.id)).getElementById(target.fragment), id).not.toBeNull();
      expect(graphicDesignLegacyLocation('pattern', id, [], '', '')).toBeNull();
      expect(graphicDesignLegacyLocation('concept', id, corpus.entities, '', '')).toBeNull();
    }
    expect(graphicDesignLegacyLocation('pattern', '__proto__', corpus.entities, '', '')).toBeNull();
  });

  it('publishes Graphic Design core articles and their legacy routes', async () => {
    const publicCorpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(publicCorpus.entities.filter((e) => e.type === 'pattern' && e.id.startsWith('graphic-design-'))).toHaveLength(pkg.patterns.length);
    expect(graphicDesignLegacyEntries(publicCorpus.entities)).toHaveLength(19);
    expect(
      publicCorpus.diagnostics.some((d) => JSON.stringify(d).includes('graphic-design-')),
    ).toBe(false);
  });

  it('retains all348 source-asset hashes and52 archived article snapshots', () => {
    for (const entry of pkg.patterns) {
      const source = readFileSync(resolve(root, 'content/patterns', entry.id + '.md'), 'utf8');
      const body = source.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
      expect(createHash('sha256').update(body).digest('hex'), entry.id).toBe(entry.body_sha256);
    }
    expect(pkg.assets).toEqual(expect.arrayContaining(originals.package.assets));
    expect(originals.package.assets).toHaveLength(348);
    expect(pkg.assets).toHaveLength(366);
    for (const asset of pkg.assets) {
      const sha = createHash('sha256')
        .update(readFileSync(resolve(root, 'content/assets', asset.src)))
        .digest('hex');
      expect(sha, asset.src).toBe(asset.sha256);
    }
    expect(Object.keys(originals.articles)).toHaveLength(52);
    for (const entry of audit.entries)
      if (entry.evidence.sha256) {
        expect(createHash('sha256').update(originals.articles[entry.id]).digest('hex')).toBe(
          entry.evidence.sha256,
        );
      }
  });

  it('gives all156 comparisons one discoverable full-size and narrow-screen home', async () => {
    expect(Object.keys(rollout.comparison_ownership)).toHaveLength(156);
    for (const [name, id] of Object.entries(rollout.comparison_ownership)) {
      const doc = await page(id as string);
      expect(
        findGraphicDesignAssetLink(doc, `/assets/graphic-design/${name}.svg`),
        name,
      ).not.toBeNull();
      expect(
        findGraphicDesignAssetLink(doc, `/assets/graphic-design/${name}-mobile.svg`),
        name,
      ).not.toBeNull();
    }
    expect(
      findGraphicDesignAssetLink(
        await page('graphic-design-establish-a-grid'),
        '/assets/graphic-design/break-grid-anatomy.svg',
      ),
    ).not.toBeNull();
  });

  it.each([
    'graphic-design-establish-visual-hierarchy',
    'graphic-design-use-spacing-to-express-relationships',
    'graphic-design-build-a-purposeful-palette',
  ])('%s develops three transformations with captions and readable alternatives', async (id) => {
    const doc = await page(id);
    expect(doc.querySelectorAll('figure')).toHaveLength(3);
    for (const figure of doc.querySelectorAll('figure')) {
      expect(figure.querySelector('figcaption')?.textContent?.length).toBeGreaterThan(20);
      expect(figure.querySelector('img')?.getAttribute('alt')?.length).toBeGreaterThan(60);
      expect(figure.querySelector('source')).not.toBeNull();
    }
  });
});
