// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityArticle } from './markdown';
import { verseArea } from '$lib/verse-areas';

const root = resolve(process.cwd(), '../..');

describe('Joke Mechanics import', () => {
  it('preserves every example and quotation in published, linked articles with inline videos', async () => {
    const guide = JSON.parse(
      await readFile(resolve(root, 'docs/joke-mechanics/guide.json'), 'utf8'),
    );
    const manifest = JSON.parse(
      await readFile(resolve(root, 'docs/joke-mechanics/import-manifest.json'), 'utf8'),
    );
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    const verse = corpus.entities.find((e) => e.id === 'standup-comedy')!;
    expect(verse.title).toBe('Joke Mechanics');
    expect(verse.summary).toBe('Patterns and structures in stand-up comedy.');
    expect(verseArea(verse).title).toBe('Arts & Design');
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const structures = guide.groups.flatMap((g: { structures: unknown[] }) => g.structures);
    let examples = 0,
      quotations = 0,
      descriptions = 0,
      videos = 0;
    for (const mapping of manifest.patterns) {
      const entity = corpus.entities.find((e) => e.id === mapping.id)!;
      const structure = structures.find(
        (s: { article_id: string }) => s.article_id === mapping.source_article,
      );
      if (entity.type !== 'pattern') throw new Error(`Expected pattern ${mapping.id}`);
      expect(entity.verses).toContain('standup-comedy');
      const { html } = await renderEntityArticle(entity, corpus.entities);
      const document = new DOMParser().parseFromString(html, 'text/html');
      const headings = [...document.querySelectorAll('h2')].filter((h) =>
        h.textContent?.startsWith('Example '),
      );
      expect(headings).toHaveLength(structure.examples.length);
      examples += headings.length;
      const quoted = structure.examples.filter(
        (e: { presentation: string }) => e.presentation === 'quotation',
      );
      const nodes = [...document.querySelectorAll('blockquote')];
      expect(nodes).toHaveLength(quoted.length);
      for (const [i, example] of quoted.entries()) {
        const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
        expect(normalize(nodes[i].textContent!)).toBe(
          normalize(guide.canonical_quotes[example.quote_id].text),
        );
      }
      for (const example of structure.examples.filter(
        (e: { presentation: string }) => e.presentation !== 'quotation',
      )) {
        expect(document.body.textContent).toContain(example.description);
        descriptions++;
      }
      quotations += nodes.length;
      videos += document.querySelectorAll('[data-article-video]').length;
      expect(document.querySelector('script,iframe')).toBeNull();
    }
    expect(manifest.patterns).toHaveLength(42);
    expect({ examples, quotations, descriptions, videos }).toEqual({
      examples: 128,
      quotations: 85,
      descriptions: 43,
      videos: 36,
    });
    for (const id of ['joke-mechanics', ...manifest.collections]) {
      expect(corpus.entities.find((e) => e.id === id)?.status).toBe('published');
    }
  }, 30000);
});
