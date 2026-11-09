// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error The existing jsdom dependency ships without declarations; no runtime dependency is added.
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';

const root = resolve(process.cwd(), '../..');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/statistics.json'), 'utf8'),
) as {
  patterns: {
    id: string;
    practice: unknown;
    visual: { asset: string | null; interactive_asset?: string; preview_asset?: string };
  }[];
  collections: { id: string; items: string[] }[];
};
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

describe('Statistics field guide integration', () => {
  it('resolves its reading paths, subjects, and articles without interactive practices', async () => {
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const entities = new Map(corpus.entities.map((e) => [e.id, e]));
    for (const collection of metadata.collections) {
      const entity = entities.get(collection.id)!;
      expect(entity.type).toBe('collection');
      expect(entity.collectionItems.map((i) => i.entityId)).toEqual(collection.items);
      expect(collection.items.every((id) => entities.has(id))).toBe(true);
    }
    for (const pattern of metadata.patterns) {
      const entity = entities.get(pattern.id)!;
      expect(entity.verseMemberships).toContainEqual({
        sourceId: 'commons',
        entityId: 'statistics',
      });
      expect(entity.collectionMemberships.length).toBeGreaterThan(0);
      expect(pattern.practice).toBeNull();
      expect(entity.practice).toBeUndefined();
      expect(entity.languagePracticeSource).toBeUndefined();
      expect(entity.implementedByPractices).toEqual([]);
      expect(entity.body).not.toContain('## Guided application');
      expect(pattern.visual.asset, `${pattern.id} needs a visible illustration`).toBeTruthy();
      if (pattern.visual.asset) {
        const html = await renderEntityMarkdown(entity, corpus.entities);
        expect(html).not.toContain('```patternverse-widget');
        expect(html).not.toContain('patternverse-language');
        if (pattern.visual.asset.endsWith('.svg')) {
          expect(html).toContain(`/assets/${pattern.visual.asset}`);
          expect(html).toContain(`/assets/${pattern.visual.asset.replace('.svg', '-mobile.svg')}`);
          const svg = readFileSync(resolve(root, 'content/assets', pattern.visual.asset), 'utf8');
          expect(svg).toContain('<title>');
          expect(svg).toContain('<desc>');
          expect(svg).not.toMatch(/<script|<foreignObject/);
        }
        const interactive =
          pattern.visual.interactive_asset ??
          (pattern.visual.asset.endsWith('.html') ? pattern.visual.asset : undefined);
        if (interactive) {
          expect(html).toContain('data-article-widget');
          expect(
            readFileSync(resolve(root, 'content/assets/widgets', interactive), 'utf8'),
          ).toContain('<!doctype html>');
          expect(pattern.visual.preview_asset).toBeTruthy();
          // The initial chart is delivered in article HTML, without running JavaScript.
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const image = doc.querySelector(`img[src="/assets/${pattern.visual.preview_asset}"]`)!;
          expect(image).toBeTruthy();
          expect(image.getAttribute('alt')!.length).toBeGreaterThan(20);
          expect(image.closest('picture')?.querySelector('source')?.getAttribute('media')).toBe(
            '(max-width: 600px)',
          );
          expect(
            image.compareDocumentPosition(doc.querySelector('[data-article-widget]')!) & 4,
          ).toBeTruthy();
          expect(
            image.compareDocumentPosition(
              [...doc.querySelectorAll('h2')].find((h) =>
                h.textContent!.startsWith('Advanced notes'),
              )!,
            ) & 4,
          ).toBeTruthy();
        }
      }
    }
    for (const entity of corpus.entities.filter(
      (e) => e.type === 'collection' && e.id.startsWith('statistics-'),
    )) {
      expect(entity.type).toBe('collection');
      expect(entity.collectionItems.length).toBeGreaterThan(0);
      expect(entity.collectionItems.every((ref) => entities.has(ref.entityId))).toBe(true);
    }
  });

  it('preserves gaps in dashed reference lines in desktop and phone illustrations', () => {
    const assets = new Set(
      metadata.patterns.flatMap(({ visual }) => {
        const asset = visual.asset?.endsWith('.svg') ? visual.asset : visual.preview_asset;
        return asset ? [asset, asset.replace('.svg', '-mobile.svg')] : [];
      }),
    );
    for (const asset of assets) {
      const svg = new DOMParser().parseFromString(
        readFileSync(resolve(root, 'content/assets', asset), 'utf8'),
        'image/svg+xml',
      );
      for (const path of svg.querySelectorAll('path')) {
        const dashed = /stroke-dasharray:\s*[0-9]/.test(path.getAttribute('style') ?? '');
        if (!dashed) continue;
        // Closing a two-point path retraces the stroke and can fill its dash gaps.
        expect(path.getAttribute('d'), asset).not.toMatch(/^M [^ML]* L [^ML]* Z$/);
      }
    }
  });
});

function widget(name: string) {
  const dom = new JSDOM(
    readFileSync(resolve(root, `content/assets/widgets/${name}.html`), 'utf8'),
    { runScripts: 'dangerously' },
  );
  const doc = dom.window.document;
  return {
    dom,
    doc,
    result: () => doc.querySelector('output')!.textContent!,
    set: (id: string, value: string) => {
      const input = doc.getElementById(id) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    },
  };
}

describe('Statistics interactive worked calculations', () => {
  it('keeps false positives, positive predictive value, and a zero denominator distinct', () => {
    const w = widget('stats-base-rates');
    try {
      expect(w.result()).toContain('90.00 true positives and 495.00 false positives');
      expect(w.result()).toContain('15.38%');
      w.set('prevalence', '0');
      w.set('specificity', '100');
      expect(w.result()).toContain('undefined');
    } finally {
      w.dom.window.close();
    }
  });
  it('calculates Wilson limits, handles the boundary, and rejects impossible counts', () => {
    const w = widget('stats-interval');
    try {
      expect(w.result()).toContain('5.52% to 17.44%');
      w.set('events', '0');
      expect(w.result()).toContain('0.00% to 3.70%');
      w.set('events', '101');
      expect(w.result()).toContain('cannot exceed');
      w.set('n', '0');
      expect(w.result()).toContain('within the labeled limits');
    } finally {
      w.dom.window.close();
    }
  });
  it('uses the exact one-sided zero-event bound rather than a zero-risk claim', () => {
    const w = widget('stats-zero-events');
    try {
      expect(w.result()).toContain('2.9513%');
      w.set('n', '1');
      expect(w.result()).toContain('95.0000%');
      w.set('n', '1000');
      expect(w.result()).toContain('0.2991%');
    } finally {
      w.dom.window.close();
    }
  });
  it('shares less with the population center when the local evidence is stronger', () => {
    const w = widget('stats-pooling');
    try {
      expect(w.result()).toContain('pooled estimate 0.83');
      w.set('n', '100');
      expect(w.result()).toContain('pooled estimate 5.65');
      w.set('observed', '-6');
      expect(w.result()).toContain('pooled estimate -5.65');
    } finally {
      w.dom.window.close();
    }
  });
  it('preserves the median while a genuine extreme changes the mean', () => {
    const w = widget('stats-distribution');
    try {
      expect(w.result()).toContain('mean 13.64, median 12.00');
      w.set('extreme', '200');
      expect(w.result()).toContain('mean 28.64, median 12.00');
    } finally {
      w.dom.window.close();
    }
  });
  it('distinguishes an aggregate reversal from a common-composition comparison', () => {
    const w = widget('stats-composition');
    try {
      expect(w.result()).toContain('Raw A 36.00% versus B 74.00%');
      expect(w.result()).toContain('standardized A 60.00% versus B 50.00%');
      w.set('shareA', '90');
      expect(w.result()).toContain('Raw A 84.00%');
      expect(w.result()).toContain('difference 10.00 percentage points');
    } finally {
      w.dom.window.close();
    }
  });
  it('subtracts the comparison change, including a negative resulting contrast', () => {
    const w = widget('stats-did');
    try {
      expect(w.result()).toContain('difference-in-differences 7.00');
      w.set('afterT', '40');
      expect(w.result()).toContain('difference-in-differences -8.00');
    } finally {
      w.dom.window.close();
    }
  });
  it('calculates an interaction and distinguishes the no-interaction case', () => {
    const w = widget('stats-factorial');
    try {
      expect(w.result()).toContain('Interaction contrast 15.00');
      w.set('newHigh', '60');
      expect(w.result()).toContain('Interaction contrast 0.00');
    } finally {
      w.dom.window.close();
    }
  });
  it('calculates the independent-test familywise probability and resets the simulation', async () => {
    const w = widget('stats-search');
    try {
      expect(w.result()).toContain('64.15%');
      expect(w.doc.querySelector('svg')!.textContent).not.toContain('Simulated');
      expect(w.doc.querySelectorAll('svg rect')).toHaveLength(1);
      w.doc.getElementById('simulate')!.click();
      expect(w.result()).toContain('1,000 experiments');
      expect(w.doc.querySelector('svg')!.textContent).toContain('Simulated');
      expect(w.doc.querySelectorAll('svg rect')).toHaveLength(2);
      w.set('tests', '1');
      expect(w.result()).toContain('5.00%');
      expect(w.result()).toContain('No simulations yet');
      expect(w.doc.querySelector('svg')!.textContent).not.toContain('Simulated');
      w.doc.querySelector<HTMLButtonElement>('button[type="reset"]')!.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(w.result()).toContain('64.15%');
      expect(w.result()).toContain('No simulations yet');
      expect(w.doc.querySelector('svg')!.textContent).not.toContain('Simulated');
    } finally {
      w.dom.window.close();
    }
  });
});
