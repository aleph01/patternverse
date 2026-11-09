// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';
const root = resolve(process.cwd(), '../..');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-datasheets-for-datasets',
);

describe('Datasheets for Datasets', () => {
  it('reconciles the collection ledger, duration, split totals, and label-only correction', () => {
    const e = reference.example;
    const remaining = e.exclusions.reduce(
      (counts: number[], x: { count: number }) => [...counts, counts[counts.length - 1] - x.count],
      [e.candidate_clips],
    );
    expect(remaining).toEqual([12000, 11700, 10800, 10000]);
    expect(remaining.at(-1)).toBe(e.released_clips);
    expect(e.released_clips * e.clip_seconds).toBe(100000);
    expect(e.audio_seconds).toBe(e.released_clips * e.clip_seconds);
    expect(e.duration.hours * 3600 + e.duration.minutes * 60 + e.duration.seconds).toBe(
      e.audio_seconds,
    );
    expect(e.splits.reduce((n: number, s: { clips: number }) => n + s.clips, 0)).toBe(
      e.released_clips,
    );
    expect(e.splits.reduce((n: number, s: { pumps: number }) => n + s.pumps, 0)).toBe(e.pumps);
    expect(e.correction.changed_labels / e.released_clips).toBe(0.015);
    expect(e.correction.changed_share).toBe(0.015);
    expect(e.correction.retained_clip_ids).toBe(true);
    expect(e.correction.retained_schema).toBe(true);
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-datasheets-for-datasets.md'),
      'utf8',
    );
    for (const value of [
      '12,000 − 300 − 900 − 800 = 10,000',
      '100,000 seconds',
      '27 hours, 46 minutes, 40 seconds',
      '1.5%',
      '95 unique documents from 96 annotated documents',
    ])
      expect(md).toContain(value);
    const manifest = JSON.parse(
      readFileSync(resolve(root, 'content/assets/manifest.json'), 'utf8'),
    );
    for (const suffix of ['', '-mobile']) {
      const asset = 'machine-learning/datasheets-for-datasets' + suffix + '.svg',
        svg = readFileSync(resolve(root, 'content/assets', asset), 'utf8');
      expect(manifest[asset].width).toBe(suffix ? 360 : 720);
      for (const value of [
        '12,000 candidate clips',
        'Release: 10,000 clips',
        '100,000 seconds of audio',
        '28 pumps · 7,000 clips',
        '6 pumps · 1,500 clips',
        '150 labels (1.5%)',
      ])
        expect(svg).toContain(value);
    }
    expect(reference.visual).not.toHaveProperty('interactive_asset');
  });
  it('integrates the static illustrated article, recommendation metadata, and exact structure without a practice', async () => {
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const article = corpus.entities.find((e) => e.id === 'ml-datasheets-for-datasets')!;
    expect(article.languagePracticeSource).toBeFalsy();
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-privacy-and-governance',
    });
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/datasheets-for-datasets.svg');
    expect(rendered).toContain('/assets/machine-learning/datasheets-for-datasets-mobile.svg');
    expect(rendered).not.toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-datasheets-for-datasets.md'),
      'utf8',
    );
    expect([...md.matchAll(/^## (.+)$/gm)].map((m) => m[1])).toEqual(metadata.article_structure);
    const words = md
      .replace(/^---\n[\s\S]*?\n---\n/, '')
      .split('## Sources and further reading')[0]
      .split(/\s+/)
      .filter(Boolean).length;
    expect(words).toBe(reference.article_words);
    expect(words).toBeGreaterThanOrEqual(800);
    expect(words).toBeLessThanOrEqual(1500);
    for (const url of reference.sources) expect(md).toContain(url);
    expect(reference.sources).toHaveLength(5);
    expect(reference.example_user_queries).toHaveLength(12);
  });
});
