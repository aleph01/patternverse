// @vitest-environment jsdom
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { parseLanguagePracticeFromBody } from '@patternverse/compiler/practice';
import { renderEntityMarkdown } from './markdown';

const root = resolve(process.cwd(), '../..');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/liberating-structures.json'), 'utf8'),
) as {
  patterns: {
    id: string;
    source_number: number;
    verses: string[];
    primary_verse: string;
    collections: string[];
    example_user_queries: string[];
    related_patterns: string[];
    practice: { path: string };
    visual: { type: string; public_path?: string; alt_text?: string; caption?: string };
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

describe('Selected Liberating Structures content publication', () => {
  it('covers the exact selection with sixteen new identities and two existing identities', () => {
    expect(metadata.patterns.map((p) => p.source_number)).toEqual([
      1, 3, 4, 5, 6, 7, 9, 11, 12, 13, 14, 15, 20, 21, 25, 26, 35, 36,
    ]);
    expect(new Set(metadata.patterns.map((p) => p.id)).size).toBe(18);
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
  it.each(metadata.patterns)(
    'renders #$source_number $id with a valid practice and memberships',
    async (p) => {
      const entity = corpus.entities.find((e) => e.id === p.id)!;
      expect(entity?.type).toBe('pattern');
      if (entity.type !== 'pattern') throw new Error('Expected pattern');
      expect(entity.verses).toEqual(p.verses);
      expect(entity.verses?.[0]).toBe(p.primary_verse);
      for (const id of p.collections) {
        const collection = corpus.entities.find((e) => e.id === id)!;
        expect(collection?.type).toBe('collection');
        if (collection.type === 'collection') expect(collection.items).toContain(p.id);
      }
      const raw = readFileSync(resolve(root, 'content/patterns', p.id + '.md'), 'utf8');
      const article = raw
        .replace(/^---[\s\S]*?---\n/, '')
        .split('## Practice —')[0]
        .replace(/```[\s\S]*?```/g, '');
      expect(article.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(800);
      expect(new Set(p.example_user_queries).size).toBeGreaterThanOrEqual(8);
      expect(p.related_patterns.length).toBeGreaterThanOrEqual(2);
      const parsed = parseLanguagePracticeFromBody(
        readFileSync(resolve(root, p.practice.path), 'utf8'),
      );
      expect(parsed.errors).toEqual([]);
      expect(parsed.source).toContain(':output result');
      expect(parsed.source).not.toMatch(/!(agent|session|parallel|publish)\b/);
      const html = await renderEntityMarkdown(entity, corpus.entities);
      expect(html).not.toContain('```patternverse-language');
      if (p.visual.type === 'native-svg') {
        const page = new DOMParser().parseFromString(html, 'text/html');
        const img = page.querySelector(`img[src="${p.visual.public_path}"]`);
        expect(img?.getAttribute('alt')).toBe(p.visual.alt_text);
        expect(img?.closest('figure')?.textContent).toContain(p.visual.caption);
        const asset = p.visual.public_path?.startsWith('/assets/')
          ? resolve(root, 'content' + p.visual.public_path)
          : resolve(root, 'apps/web/static' + p.visual.public_path);
        expect(existsSync(asset)).toBe(true);
        const xml = new DOMParser().parseFromString(readFileSync(asset, 'utf8'), 'image/svg+xml');
        expect(xml.querySelector('parsererror')).toBeNull();
        expect(xml.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 720 470');
        expect(xml.querySelector('title')?.textContent).toBeTruthy();
        expect(xml.querySelector('desc')?.textContent).toBeTruthy();
      }
    },
  );
  it('keeps the prior inversion practice and illustrative reframing operator available', () => {
    const inversion = parseLanguagePracticeFromBody(
      readFileSync(resolve(root, 'content/patterns/inversion.md'), 'utf8'),
    );
    expect(inversion.source).toContain(
      'result = {aim: context, failure_mechanisms: mechanisms, design: review}',
    );
    const purpose = readFileSync(
      resolve(root, 'content/patterns/reframing-surface-higher-goals.md'),
      'utf8',
    );
    expect(purpose).toContain('candidate_frame = !agent');
    expect(purpose).toContain(':input frame text');
    const separate = corpus.entities.find((e) => e.id === 'discover-what-to-stop-doing')!;
    expect(separate.type).toBe('practice');
    if (separate.type === 'practice') expect(separate.implements).toEqual(['inversion']);
  });
});
