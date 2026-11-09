// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { createLibrary, createLibrarySearch } from '@patternverse/workspace/library';
import { renderEntityMarkdown } from './markdown';
import { assetMimeType, contentAssetPaths, contentAssetDimensions } from './content-assets';

const root = resolve(process.cwd(), '../..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/photography.json'), 'utf8'),
) as {
  groups: { id: string; items: string[] }[];
  patterns: {
    id: string;
    title: string;
    article_sha256: string;
    article_word_count: number;
    example_user_queries: string[];
    related_patterns: { id: string }[];
    visuals: { file: string; alt_text: string; caption: string }[];
  }[];
};
const provenance = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/photography-provenance.json'), 'utf8'),
) as {
  assets: {
    file: string;
    sha256: string;
    kind: string;
    prompt?: string;
    creator: string;
    license?: string;
    source_url?: string;
    source_files?: string[];
  }[];
};
const expansion = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/photography-example-expansion.json'), 'utf8'),
) as {
  examples: {
    entity_id: string;
    entity_type: string;
    section: string;
    file: string;
    alt_text: string;
    caption: string;
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

describe('photography collection', () => {
  it('keeps 30 distinct articles in seven ordered groups without beginner collections', () => {
    expect(metadata.patterns).toHaveLength(30);
    expect(new Set(metadata.patterns.map((p) => p.id)).size).toBe(30);
    expect(metadata.groups).toHaveLength(7);
    expect(metadata.groups.flatMap((g) => g.items)).toEqual(metadata.patterns.map((p) => p.id));
    for (const group of metadata.groups) {
      expect(
        corpus.entities.find((e) => e.id === group.id)?.collectionItems.map((r) => r.entityId),
      ).toEqual(group.items);
    }
    for (const id of ['photography-for-beginners', 'photography-beginner-path']) {
      expect(corpus.entities.find((e) => e.id === id)).toBeUndefined();
    }
    expect(corpus.unresolvedReferences).toHaveLength(0);
  });

  it.each(metadata.patterns)(
    'renders the complete $title with captions, assets and resolved neighbors',
    async (p) => {
      const entity = corpus.entities.find((e) => e.id === p.id)!;
      expect(entity.type).toBe('pattern');
      expect(entity.status).toBe('published');
      expect(entity.verseMemberships.map((r) => r.entityId)).toContain('photography');
      expect(createHash('sha256').update(entity.body).digest('hex')).toBe(p.article_sha256);
      expect(p.article_word_count).toBeGreaterThanOrEqual(800);
      expect(p.article_word_count).toBeLessThanOrEqual(1200);
      expect(p.example_user_queries).toHaveLength(8);
      expect(new Set(p.example_user_queries).size).toBe(8);
      expect(p.visuals.length).toBeGreaterThan(0);
      const page = new DOMParser().parseFromString(
        await renderEntityMarkdown(entity, corpus.entities),
        'text/html',
      );
      expect(page.body.textContent).not.toContain('[[');
      expect(page.querySelectorAll('figure')).toHaveLength(p.visuals.length);
      for (const visual of p.visuals) {
        const image = page.querySelector(`img[src="/assets/${visual.file}"]`)!;
        expect(image).not.toBeNull();
        expect(image.getAttribute('alt')).toBe(visual.alt_text);
        expect(image.getAttribute('loading')).toBe('lazy');
        expect(image.getAttribute('width')).not.toBeNull();
        expect(image.closest('figure')?.querySelector('figcaption')?.textContent).toContain(
          visual.caption,
        );
        expect(provenance.assets.some((a) => a.file === visual.file)).toBe(true);
      }
      for (const neighbor of p.related_patterns) {
        expect(page.querySelector(`a[href="/pattern/${neighbor.id}"]`)).not.toBeNull();
      }
    },
  );

  it('uses existing title, domain and situation-tag search', () => {
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
    for (const p of metadata.patterns)
      expect(search.search(p.title, { type: 'pattern' }).map((e) => e.id)).toContain(p.id);
    expect(search.search('photography', { type: 'pattern' }).map((e) => e.id)).toEqual(
      expect.arrayContaining(metadata.patterns.map((p) => p.id)),
    );
    expect(search.search('portraits', { type: 'pattern' }).map((e) => e.id)).toContain(
      'give-people-something-to-do',
    );
    expect(search.search('landscape', { type: 'pattern' }).map((e) => e.id)).toContain(
      'show-the-scale',
    );
  });

  it('records provenance and dimensions for every delivered visual, preserving source licenses', async () => {
    const dimensions = await contentAssetDimensions();
    const paths = await contentAssetPaths();
    expect(
      Object.keys(dimensions)
        .filter((file) => file.startsWith('photography/'))
        .sort(),
    ).toEqual(provenance.assets.map((a) => a.file).sort());
    for (const record of provenance.assets) {
      expect(paths).toContain(record.file);
      const data = await readFile(resolve(root, 'content/assets', record.file));
      expect(createHash('sha256').update(data).digest('hex')).toBe(record.sha256);
      expect(record.creator.length).toBeGreaterThan(0);
      if (record.kind === 'generated-illustration')
        expect(record.prompt!.length).toBeGreaterThan(100);
      for (const source of record.source_files ?? [])
        expect(provenance.assets.some((a) => a.file === source)).toBe(true);
      if (record.file.endsWith('.svg')) {
        const svg = new DOMParser().parseFromString(data.toString(), 'image/svg+xml');
        expect(svg.querySelector('parsererror')).toBeNull();
        expect(svg.querySelector('metadata')).not.toBeNull();
        expect(svg.querySelector('script,foreignObject')).toBeNull();
        for (const image of svg.querySelectorAll('image'))
          expect(image.getAttribute('href')).toMatch(/^data:image\/webp;base64,/);
      }
    }
    expect(paths).toContain('photography/licenses/gfdl-1-2.txt');
  });

  it('places all eight new article examples and three reference illustrations in their teaching sections', async () => {
    expect(expansion.examples.filter((example) => example.entity_type === 'pattern')).toHaveLength(
      8,
    );
    expect(expansion.examples.filter((example) => example.entity_type === 'concept')).toHaveLength(
      3,
    );
    const dimensions = await contentAssetDimensions();
    for (const example of expansion.examples) {
      const entity = corpus.entities.find((entry) => entry.id === example.entity_id)!;
      const section = entity.body.split(`## ${example.section}\n`)[1]?.split('\n## ')[0];
      expect(section, `${example.entity_id}: ${example.section}`).toContain(
        `../assets/${example.file}`,
      );
      const html = new DOMParser().parseFromString(
        await renderEntityMarkdown(entity, corpus.entities),
        'text/html',
      );
      const image = html.querySelector(`img[src="/assets/${example.file}"]`)!;
      expect(image?.getAttribute('alt')).toBe(example.alt_text);
      expect(image?.closest('figure')?.textContent).toContain(example.caption);
      if (example.file.endsWith('.svg')) {
        const mobile = example.file.replace('.svg', '-mobile.svg');
        expect(dimensions[mobile]?.width).toBe(360);
        expect(image.closest('picture')?.querySelector('source')?.getAttribute('srcset')).toBe(
          `/assets/${mobile}`,
        );
      }
    }
  });

  it('limits asset routes to intended file types and paths', () => {
    for (const path of [
      '../secrets.txt',
      '/etc/passwd',
      'photography/../manifest.json',
      'manifest.json',
      'photo.jpg.js',
      'https://example.com/x.jpg',
    ])
      expect(assetMimeType(path)).toBeUndefined();
    expect(assetMimeType('photography/choose-your-subject.webp')).toBe('image/webp');
    expect(assetMimeType('photography/licenses/gfdl-1-2.txt')).toBe('text/plain; charset=utf-8');
  });
});
