// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error The existing jsdom dependency ships without declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';
const root = resolve(process.cwd(), '../..');
const source = readFileSync(resolve(root, 'content/assets/widgets/ml-embedding.html'), 'utf8');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-embedding');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expression: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expression + ')'));

describe('Embedding lookup, learning and retrieval', () => {
  it('retrieves the correct row and computes the explicit first update without applying its preview', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'vectors')).toEqual(reference.example.initial_vectors);
      expect(read(dom, 'names')).toEqual(reference.example.names);
      expect(read(dom, 'report.e')).toEqual([0, 1]);
      expect(read(dom, 'report.z')).toBe(0);
      expect(read(dom, 'report.p')).toBe(0.5);
      expect(read(dom, 'report.loss')).toBeCloseTo(Math.log(2), 13);
      const update = read(dom, 'report.next');
      expect(update.after).toEqual([0.5, 1]);
      expect(update.gradient).toEqual([-0.5, 0]);
      expect(update.pAfter).toBeCloseTo(reference.example.next_probability, 13);
      expect(update.lossAfter).toBeCloseTo(reference.example.next_loss, 13);
      expect(read(dom, 'history')).toEqual([]);
      expect(read(dom, 'vectors[1]')).toEqual([0, 1]);
      const negative = read(dom, 'gradientStep([0,1],0)');
      expect(negative.after).toEqual([-0.5, 1]);
      expect(negative.lossAfter).toBeCloseTo(update.lossAfter, 13);
      const memory = reference.example.memory_example;
      expect(memory.vocabulary * memory.dimension * memory.bytes_per_value).toBe(128000000);
      expect(memory.parameter_bytes).toBe(128000000);
    } finally {
      dom.window.close();
    }
  });

  it('checks gradients against finite differences and decreasing loss across 104 training states', () => {
    const dom = openExample();
    try {
      let states = 0;
      for (const start of reference.example.initial_vectors.slice(0, 4))
        for (const target of [0, 1]) {
          let vector: number[] = start.slice();
          for (let step = 0; step <= 12; step++) {
            const update = read(dom, `gradientStep(${JSON.stringify(vector)},${target})`);
            // Independent scalar binary-logistic loss for q=(1,0).
            const objective = (v: number[]) =>
              target ? Math.log1p(Math.exp(-v[0])) : Math.log1p(Math.exp(v[0]));
            for (let coordinate = 0; coordinate < 2; coordinate++) {
              const plus = vector.slice(),
                minus = vector.slice(),
                epsilon = 1e-5;
              plus[coordinate] += epsilon;
              minus[coordinate] -= epsilon;
              expect(update.gradient[coordinate]).toBeCloseTo(
                (objective(plus) - objective(minus)) / (2 * epsilon),
                8,
              );
            }
            expect(update.lossBefore).toBeCloseTo(objective(vector), 12);
            expect(update.lossAfter).toBeCloseTo(objective(update.after), 12);
            expect(update.lossAfter).toBeLessThan(update.lossBefore);
            expect(update.after[1]).toBe(start[1]);
            vector = update.after;
            states++;
          }
        }
      expect(states).toBe(104);
    } finally {
      dom.window.close();
    }
  });

  it('distinguishes dot from cosine, preserves positive-scale invariance only for cosine, and handles zero length', () => {
    const dom = openExample();
    try {
      expect(read(dom, "buildReport(1,1,'dot').ranking.map(x=>x.id)")).toEqual([3, 0, 1, 2]);
      expect(read(dom, "buildReport(1,1,'cosine').ranking.map(x=>x.id)")).toEqual([0, 3, 1, 2]);
      expect(read(dom, 'dot([1,0],[4,3])')).toBe(4);
      expect(read(dom, 'cosine([1,0],[4,3])')).toBe(0.8);
      expect(read(dom, 'cosine([1,0],[8,6])')).toBe(0.8);
      expect(read(dom, 'dot([1,0],[8,6])')).toBe(8);
      expect(read(dom, 'cosine([1,0],[0,0])')).toBeNull();
      const unknown = read(dom, "buildReport(4,1,'cosine')");
      expect(unknown.next).toBeNull();
      expect(unknown.ranking).toHaveLength(4);
      expect(unknown.ranking.some((row: { id: number }) => row.id === 4)).toBe(false);
      expect(() => dom.window.eval("buildReport(5,1,'dot')")).toThrow('Unsupported setting');
    } finally {
      dom.window.close();
    }
  });

  it('updates only selected known rows, leaves the context and initial table fixed, and never learns the reserved row', () => {
    const dom = openExample();
    try {
      const d = dom.window.document;
      for (const id of [0, 1, 2, 3])
        for (const target of [0, 1]) {
          dom.window.eval('reset()');
          (d.querySelector('#item') as HTMLSelectElement).value = String(id);
          (d.querySelector('#target') as HTMLSelectElement).value = String(target);
          dom.window.eval('learn(1)');
          const table = read(dom, 'vectors');
          table.forEach((row: number[], i: number) => {
            if (i === id) expect(row).not.toEqual(reference.example.initial_vectors[i]);
            else expect(row).toEqual(reference.example.initial_vectors[i]);
          });
          expect(read(dom, 'history')).toHaveLength(1);
          expect(read(dom, 'context')).toEqual([1, 0]);
          expect(read(dom, 'initialVectors')).toEqual(reference.example.initial_vectors);
        }
      dom.window.eval('reset()');
      (d.querySelector('#item') as HTMLSelectElement).value = '4';
      dom.window.eval('render();learn(10)');
      expect(read(dom, 'vectors')).toEqual(reference.example.initial_vectors);
      expect(read(dom, 'history')).toHaveLength(0);
      expect((d.querySelector('#step') as HTMLButtonElement).disabled).toBe(true);
    } finally {
      dom.window.close();
    }
  });

  it('preserves learned parameters when changing the retrieval metric, enforces the update cap and resets every control', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          const element = d.querySelector(id) as HTMLSelectElement;
          element.value = value;
          element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
        };
      (d.querySelector('#step') as HTMLButtonElement).click();
      expect(read(dom, 'vectors[1]')).toEqual([0.5, 1]);
      const before = dom.window.eval('JSON.stringify(vectors)');
      change('#metric', 'cosine');
      expect(dom.window.eval('JSON.stringify(vectors)')).toBe(before);
      expect(read(dom, 'history')).toHaveLength(1);
      change('#item', '2');
      change('#target', '0');
      (d.querySelector('#ten') as HTMLButtonElement).click();
      (d.querySelector('#ten') as HTMLButtonElement).click();
      expect(read(dom, 'history')).toHaveLength(12);
      expect((d.querySelector('#step') as HTMLButtonElement).disabled).toBe(true);
      expect(d.querySelector('#mechanism')!.textContent).not.toContain(
        'No independently learned new-title row.',
      );
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 825');
      (d.querySelector('#state') as HTMLDetailsElement).open = true;
      (d.querySelector('#assumptions') as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'vectors')).toEqual(reference.example.initial_vectors);
      expect(read(dom, 'history')).toEqual([]);
      expect(read(dom, 'report')).toMatchObject({ id: 1, target: 1, metric: 'dot', updates: 0 });
      expect((d.querySelector('#state') as HTMLDetailsElement).open).toBe(false);
      expect((d.querySelector('#assumptions') as HTMLDetailsElement).open).toBe(false);
    } finally {
      dom.window.close();
    }
  });

  it('integrates the fixed sections, sources, original responsive figures, explorer and recommendation metadata', async () => {
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const entity = corpus.entities.find((e) => e.id === 'ml-embedding')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-inputs-and-features',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/embedding.svg');
    expect(rendered).toContain('/assets/machine-learning/embedding-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-embedding.md'), 'utf8');
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
    expect(reference.example_user_queries).toHaveLength(12);
    for (const suffix of ['', '-mobile']) {
      const svg = readFileSync(
        resolve(root, 'content/assets/machine-learning/embedding' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('probability 0.622 and loss 0.474');
    }
  });
});
