// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TextEncoder } from 'node:util';
// @ts-expect-error The existing jsdom dependency ships without declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';

const root = resolve(process.cwd(), '../..');
const html = readFileSync(resolve(root, 'content/assets/widgets/ml-hashed-feature.html'), 'utf8');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
function openExample() {
  return new JSDOM(html, {
    runScripts: 'dangerously',
    beforeParse(window: Window) {
      Object.assign(window, { TextEncoder });
    },
  });
}

describe('Hashed Feature worked example', () => {
  it('uses the fixed article structure recorded for the ML field guide', () => {
    expect(metadata.article_structure).toHaveLength(10);
    for (const pattern of metadata.patterns) {
      const article = readFileSync(resolve(root, 'content/patterns', `${pattern.id}.md`), 'utf8');
      const headings = [...article.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
      expect(headings).toEqual(metadata.article_structure);
      expect(article).not.toContain('patternverse-language');
    }
  });

  it('implements standard FNV-1a vectors and the six independent reference assignments', () => {
    const dom = openExample();
    try {
      expect(dom.window.eval('hashKey("")')).toBe(2166136261);
      expect(dom.window.eval('hashKey("hello")')).toBe(1335831723);
      const cells = [...dom.window.document.querySelectorAll('tbody tr')].map((row) =>
        [...(row as Element).querySelectorAll('td')].map((cell) => cell.textContent),
      );
      expect(cells.map((row) => Number(row[1]))).toEqual(
        metadata.patterns[0].example.expected_hashes,
      );
      expect(cells.map((row) => Number(row[2]))).toEqual([1, 3, 0, 2, 2, 2]);
      expect(dom.window.document.querySelector('output').textContent).toContain(
        '4 occupied · 3 colliding pairs',
      );
    } finally {
      dom.window.close();
    }
  });

  it('recomputes assignments at each supported width and preserves identities at a fixed width', () => {
    const dom = openExample();
    try {
      const select = dom.window.document.querySelector('select');
      const input = dom.window.document.querySelector('textarea');
      const pairs = [7, 3, 1, 0];
      for (const [i, count] of [2, 4, 8, 16].entries()) {
        select.value = String(count);
        select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
        expect(dom.window.document.querySelector('output').textContent).toContain(
          pairs[i] + (pairs[i] === 1 ? ' colliding pair' : ' colliding pairs'),
        );
        expect(dom.window.document.querySelectorAll('svg g')).toHaveLength(count);
      }
      const before = [...dom.window.document.querySelectorAll('tbody tr')].map(
        (row) => (row as Element).textContent,
      );
      input.value += '\ndisplay';
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      const after = [...dom.window.document.querySelectorAll('tbody tr')]
        .slice(0, 6)
        .map((row) => (row as Element).textContent);
      expect(after).toEqual(before);
    } finally {
      dom.window.close();
    }
  });

  it('normalizes Unicode, deduplicates names, handles empty input, and renders names as text', () => {
    const dom = openExample();
    try {
      const input = dom.window.document.querySelector('textarea');
      input.value = ' café\ncafe\u0301\n\n<img src=x>\ncafé';
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      expect(dom.window.document.querySelectorAll('tbody tr')).toHaveLength(2);
      expect(dom.window.document.querySelector('tbody').textContent).toContain(
        'channel=<img src=x>',
      );
      expect(dom.window.document.querySelectorAll('img')).toHaveLength(0);
      input.value = '\n  \n';
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      expect(dom.window.document.querySelector('output').textContent).toContain(
        '0 occupied · 0 colliding pairs',
      );
      expect(dom.window.document.querySelectorAll('svg g')).toHaveLength(4);
      input.value = Array.from({ length: 13 }, (_, i) => 'name' + i).join('\n');
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      expect(dom.window.document.querySelector('output').textContent).toContain('at most 12');
      expect(dom.window.document.querySelectorAll('tbody tr')).toHaveLength(0);
    } finally {
      dom.window.close();
    }
  });

  it('restores inputs, diagram, and numerical results on reset', async () => {
    const dom = openExample();
    try {
      dom.window.document.querySelector('textarea').value = 'new';
      dom.window.document.querySelector('form').reset();
      await new Promise((resolveWait) => setTimeout(resolveWait, 10));
      expect(dom.window.document.querySelector('output').textContent).toContain(
        '6 categories · 4 buckets · 4 occupied · 3 colliding pairs',
      );
      expect(dom.window.document.querySelectorAll('tbody tr')).toHaveLength(6);
    } finally {
      dom.window.close();
    }
  });

  it('compiles into its guide and verse, renders compact illustrations and the widget, and contains no guided practice', async () => {
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const article = corpus.entities.find((entity) => entity.id === 'ml-hashed-feature')!;
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-inputs-and-features',
    });
    expect(article.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/hashed-feature-buckets.svg');
    expect(rendered).toContain('/assets/machine-learning/hashed-feature-buckets-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    expect(rendered).not.toContain('```patternverse-widget');
    for (const name of ['hashed-feature-buckets.svg', 'hashed-feature-buckets-mobile.svg']) {
      const svg = readFileSync(resolve(root, 'content/assets/machine-learning', name), 'utf8');
      expect(svg).toContain('<title');
      expect(svg).toContain('<desc');
      expect(svg).not.toMatch(/<script|<foreignObject/);
    }
  });
});
