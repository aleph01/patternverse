// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { parseArticleWidget, parseMarkdownEntity } from '@patternverse/compiler';
import { orderCounts, ticketCounts } from './sort-order-data';

const root = resolve(process.cwd(), '../..');
const source = readFileSync(
  resolve(root, 'content/assets/widgets/dataviz-sort-order.html'),
  'utf8',
);

describe('Sort to Reveal Order', () => {
  it('preserves every observation and uses a deterministic secondary order for ties', () => {
    expect(ticketCounts.reduce((sum, row) => sum + row.tickets, 0)).toBe(525);
    expect(orderCounts('descending').map((row) => row.category)).toEqual([
      'Billing',
      'Subscription',
      'Delivery',
      'Returns',
      'Access',
      'Setup',
      'Warranty',
      'Feedback',
    ]);
    expect(orderCounts('alphabetical')).toEqual(ticketCounts);
    expect(
      orderCounts('descending')
        .map((row) => row.tickets)
        .sort((a, b) => a - b),
    ).toEqual(ticketCounts.map((row) => row.tickets).sort((a, b) => a - b));
    const ties = [
      { category: 'Z', tickets: 3 },
      { category: 'A', tickets: 3 },
    ];
    expect(orderCounts('descending', ties).map((row) => row.category)).toEqual(['A', 'Z']);
    expect(ties[0].category).toBe('Z');
  });

  it('runs the real bundled Plot renderer and changes only vertical placement', () => {
    const parsed = new DOMParser().parseFromString(source, 'text/html');
    document.body.innerHTML = parsed.body.innerHTML;
    Object.defineProperty(document.querySelector('#chart'), 'clientWidth', { value: 640 });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    try {
      window.eval(parsed.querySelector('script')!.textContent!);
      const doc = document;
      const measurements = () =>
        new Map(
          [...doc.querySelectorAll('g[aria-label="bar"] rect')].map((rect) => [
            rect.getAttribute('aria-label'),
            [rect.getAttribute('x'), rect.getAttribute('width'), rect.getAttribute('fill')],
          ]),
        );
      const before = measurements();
      expect(before.size).toBe(8);
      expect(doc.querySelector('#chart svg')?.getAttribute('aria-label')).toBe(
        'Support tickets by category',
      );
      const descending = doc.querySelector<HTMLInputElement>('input[value="descending"]')!;
      descending.checked = true;
      descending.dispatchEvent(new Event('change', { bubbles: true }));
      expect(measurements()).toEqual(before);
      expect(doc.querySelector('#chart svg')?.getAttribute('data-order')).toBe('descending');
      expect(doc.querySelector('#readout')?.textContent).toContain('Billing leads with 124');
      const visualOrder = [...doc.querySelectorAll('g[aria-label="bar"] rect')]
        .sort((a, b) => Number(a.getAttribute('y')) - Number(b.getAttribute('y')))
        .map((rect) => rect.getAttribute('aria-label'));
      expect(visualOrder[0]).toBe('Billing: 124 tickets');
      expect(visualOrder.at(-1)).toBe('Feedback: 28 tickets');
      expect(doc.querySelector('#counts tbody tr th')?.textContent).toBe('Billing');
      const alphabetical = doc.querySelector<HTMLInputElement>('input[value="alphabetical"]')!;
      alphabetical.checked = true;
      alphabetical.dispatchEvent(new Event('change', { bubbles: true }));
      expect(measurements()).toEqual(before);
      expect(doc.querySelector('#counts tbody tr th')?.textContent).toBe('Access');
    } finally {
      document.body.replaceChildren();
      vi.unstubAllGlobals();
    }
  });

  it('keeps the article concise, its visual before the explanation, and its references valid', () => {
    const markdown = readFileSync(
      resolve(root, 'content/patterns/dataviz-sort-to-reveal-order.md'),
      'utf8',
    );
    const result = parseMarkdownEntity(markdown, {
      sourceId: 'commons',
      sourcePath: 'patterns/dataviz-sort-to-reveal-order.md',
    });
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const body = result.entity!.body;
    const config = JSON.parse(body.match(/```patternverse-widget\n([\s\S]*?)\n```/)![1]);
    expect(parseArticleWidget(JSON.stringify(config))).toBeDefined();
    expect(body.indexOf('```patternverse-widget')).toBeLessThan(body.indexOf('## What to notice'));
    const words = body
      .replace(/```[\s\S]*?```/g, '')
      .split('## Sources')[0]
      .trim()
      .split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(150);
    expect(words).toBeLessThanOrEqual(250);
    const metadata = JSON.parse(
      readFileSync(resolve(root, 'docs/pattern-packages/data-visualization.json'), 'utf8'),
    );
    expect([...body.matchAll(/^## (.+)$/gm)].map((match) => match[1])).toEqual(
      metadata.article_structure,
    );
    for (const id of metadata.patterns[0].related_patterns) {
      expect(readFileSync(resolve(root, `content/patterns/${id}.md`), 'utf8')).toContain(
        'status: published',
      );
    }
    expect(source.length).toBeLessThanOrEqual(512_000);
    expect(source).not.toMatch(/<script\b[^>]*\bsrc\s*=/i);
    expect(source).toContain('@observablehq/plot@0.6.17');
  });
});
