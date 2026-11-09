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
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-model-cards');

describe('Model Cards', () => {
  it('reconciles the fictional evidence counts and distinguishes sample and changed-mixture summaries', () => {
    const e = reference.example,
      short = e.groups.find((g: { id: string }) => g.id === 'short'),
      long = e.groups.find((g: { id: string }) => g.id === 'long');
    const correct = e.groups.reduce((n: number, g: { correct: number }) => n + g.correct, 0),
      total = e.groups.reduce((n: number, g: { total: number }) => n + g.total, 0);
    expect([correct, total]).toEqual([920, 1000]);
    expect([e.correct, e.total]).toEqual([correct, total]);
    expect(short.correct / short.total).toBe(0.95);
    expect(long.correct / long.total).toBe(0.65);
    expect(correct / total).toBe(e.accuracy);
    expect((short.correct / short.total + long.correct / long.total) / 2).toBe(e.equal_group_mean);
    const proposed =
      ((1 - e.proposed_long_share) * short.correct) / short.total +
      (e.proposed_long_share * long.correct) / long.total;
    expect(proposed).toBeCloseTo(0.71, 12);
    expect(proposed).toBeCloseTo(e.conditional_mixture_accuracy, 12);
    expect(proposed).not.toBe(e.accuracy);
    expect(e.changed_release.version).not.toBe(e.version);
    expect(e.changed_release.input_limit_tokens).toBe(2 * e.input_limit_tokens);
    expect(e.changed_release.evaluation_status).toContain('Pending new evaluation');
    const md = readFileSync(resolve(root, 'content/patterns/ml-model-cards.md'), 'utf8');
    for (const value of ['855 / 900', '65 / 100', '920 / 1,000', '95%', '65%', '92%', '80%', '71%'])
      expect(md).toContain(value);
    const manifest = JSON.parse(
      readFileSync(resolve(root, 'content/assets/manifest.json'), 'utf8'),
    );
    for (const suffix of ['', '-mobile']) {
      const asset = 'machine-learning/model-cards' + suffix + '.svg';
      const svg = readFileSync(resolve(root, 'content/assets', asset), 'utf8');
      expect(manifest[asset].width).toBe(suffix ? 360 : 720);
      for (const value of ['855 / 900 correct', '65 / 100 correct', '920 / 1,000 correct'])
        expect(svg).toContain(value);
      expect(svg).toMatch(/documentation does not enforce restrictions/i);
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
    const article = corpus.entities.find((e) => e.id === 'ml-model-cards')!;
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
    expect(rendered).toContain('/assets/machine-learning/model-cards.svg');
    expect(rendered).toContain('/assets/machine-learning/model-cards-mobile.svg');
    expect(rendered).not.toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-model-cards.md'), 'utf8');
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
