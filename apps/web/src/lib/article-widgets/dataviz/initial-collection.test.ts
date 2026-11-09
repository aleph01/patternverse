// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  loadAndCompileCorpus,
  parseArticleWidget,
  parseMarkdownEntity,
} from '@patternverse/compiler';
import { plot } from '@observablehq/plot';
import {
  dailyOutput,
  histogram,
  mean,
  observedGroups,
  pairedCases,
  reportingDays,
  responseGroups,
  responseSamples,
  surveyCoverage,
  tableForLesson,
  timedReadings,
  waitingTimes,
  wilsonInterval,
} from './lesson-data';
import { lessonManifest } from './lesson-manifest';
import { lessonView } from './lesson-plots';

const root = resolve(process.cwd(), '../..');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/data-visualization.json'), 'utf8'),
);

function mountExample(id: string) {
  const source = readFileSync(resolve(root, `content/assets/widgets/dataviz-${id}.html`), 'utf8');
  const parsed = new DOMParser().parseFromString(source, 'text/html');
  document.body.innerHTML = parsed.body.innerHTML;
  document.body.dataset.lesson = id;
  Object.defineProperty(document.querySelector('#panels'), 'clientWidth', { value: 640 });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  window.eval(parsed.querySelector('script')!.textContent!);
  return source;
}

describe('the initial visualization collection', () => {
  it('preserves the independently checkable numerical examples', () => {
    expect(mean(waitingTimes)).toBe(7);
    expect(histogram(waitingTimes).map((bin) => bin.count)).toEqual([2, 6, 2, 1, 1]);
    expect(histogram(waitingTimes).reduce((sum, bin) => sum + bin.count, 0)).toBe(
      waitingTimes.length,
    );
    expect(observedGroups.map((group) => mean(group.values))).toEqual([6, 6]);
    expect(
      observedGroups.map((group) => Math.max(...group.values) - Math.min(...group.values)),
    ).toEqual([8, 2]);
    expect(pairedCases.map((row) => row.after - row.before)).toEqual([3, -2, 6, 1]);
    expect(mean(pairedCases.map((row) => row.after - row.before))).toBe(2);
    expect(
      timedReadings
        .slice(1)
        .map((row, i) => (row.value - timedReadings[i].value) / (row.day - timedReadings[i].day)),
    ).toEqual([4, 4 / 7, 2]);
    expect(responseGroups.map((group) => group.positive / group.total)).toEqual([0.4, 0.3]);
    expect(dailyOutput.map((row) => row.value - 80)).toEqual([-8, 5, -16, 11]);
    expect(surveyCoverage.map((row) => row.positive / row.n)).toEqual([0.75, 0.75]);
    expect(surveyCoverage.map((row) => row.n / row.invited)).toEqual([0.4, 1]);
  });

  it('checks Wilson endpoints by independently inverting the score-test equation', () => {
    const z = 1.959963984540054;
    for (const sample of [...responseSamples, { positive: 0, n: 4 }, { positive: 4, n: 4 }]) {
      const phat = sample.positive / sample.n;
      const score = (p: number) => (phat - p) ** 2 - (z ** 2 * p * (1 - p)) / sample.n;
      const rootBetween = (left: number, right: number, lower: boolean) => {
        for (let i = 0; i < 70; i++) {
          const middle = (left + right) / 2;
          if (score(middle) > 0 === lower) left = middle;
          else right = middle;
        }
        return (left + right) / 2;
      };
      const actual = wilsonInterval(sample.positive, sample.n);
      expect(actual[0]).toBeCloseTo(phat === 0 ? 0 : rootBetween(0, phat, true), 12);
      expect(actual[1]).toBeCloseTo(phat === 1 ? 1 : rootBetween(phat, 1, false), 12);
    }
    expect(wilsonInterval(7, 10)[1] - wilsonInterval(7, 10)[0]).toBeGreaterThan(
      wilsonInterval(70, 100)[1] - wilsonInterval(70, 100)[0],
    );
  });

  it.each(lessonManifest)('$title runs all controls using the real local Plot bundle', (lesson) => {
    try {
      const source = mountExample(lesson.id);
      const recorded = document.querySelector('table')!.textContent;
      const fixture = JSON.stringify(tableForLesson(lesson.id));
      expect(source.length).toBeLessThanOrEqual(512_000);
      expect(source).toContain('@observablehq/plot@0.6.17');
      expect(
        new DOMParser().parseFromString(source, 'text/html').querySelector('script[src]'),
      ).toBeNull();
      for (const [mode] of lesson.modes) {
        const input = document.querySelector<HTMLInputElement>(`input[value="${mode}"]`)!;
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        const graphics = [...document.querySelectorAll<SVGSVGElement>('#panels svg')];
        expect(graphics.length).toBeGreaterThan(0);
        expect(
          graphics.every(
            (graphic) =>
              graphic.dataset.mode === mode &&
              graphic.getAttribute('aria-description')!.length > 20,
          ),
        ).toBe(true);
        expect(document.querySelector('#readout')!.textContent!.length).toBeGreaterThan(30);
        expect(document.querySelector('table')!.textContent).toBe(recorded);
        expect(JSON.stringify(tableForLesson(lesson.id))).toBe(fixture);
      }
      if (lesson.id === 'redundant-coding') {
        const checkbox = document.querySelector<HTMLInputElement>('#grayscale')!;
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
        expect((document.querySelector('#panels') as HTMLElement).style.filter).toBe(
          'grayscale(1)',
        );
        expect(document.querySelector('#key')!.textContent).toMatch(/○.*North.*□.*East.*△.*West/);
      }
      if (lesson.id === 'provide-an-equivalent-text-account') {
        const input = document.querySelector<HTMLInputElement>('input[value="account"]')!;
        input.checked = true;
        input.dispatchEvent(new Event('change'));
        expect(document.querySelector('#text-account')!.textContent).toContain('23.6%');
      }
    } finally {
      document.body.replaceChildren();
      delete document.body.dataset.lesson;
      vi.unstubAllGlobals();
    }
  });

  it('leaves a genuine line gap for missing data and wraps the cyclic palette', () => {
    const missing = plot(
      lessonView('distinguish-missing-from-zero', 'missing', 640).panels[0].options,
    );
    const zero = plot(lessonView('distinguish-missing-from-zero', 'zero', 640).panels[0].options);
    expect(
      (missing.querySelector('g[aria-label="line"] path')!.getAttribute('d')!.match(/M/g) ?? [])
        .length,
    ).toBe(2);
    expect(
      (zero.querySelector('g[aria-label="line"] path')!.getAttribute('d')!.match(/M/g) ?? [])
        .length,
    ).toBe(1);
    expect(reportingDays[2].value).toBeNull();
    const cyclic = plot(lessonView('match-color-to-the-data', 'cyclic', 640).panels[0].options);
    expect(cyclic.scale('color')!.apply(0)).toBe(cyclic.scale('color')!.apply(360));
  });

  it('publishes all 38 articles with consistent concise structures and complete metadata', async () => {
    expect(metadata.patterns).toHaveLength(38);
    expect(new Set(metadata.patterns.map((entry: { id: string }) => entry.id)).size).toBe(38);
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(corpus.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const collection = corpus.entities.find((entry) => entry.id === 'data-visualization-patterns')!;
    expect(collection.collectionItems.map((entry) => entry.entityId)).toEqual(
      metadata.collections.map((entry: { id: string }) => entry.id),
    );
    const groupedIds: string[] = [];
    for (const group of metadata.collections) {
      const entity = corpus.entities.find((candidate) => candidate.id === group.id)!;
      expect(entity.type).toBe('collection');
      expect(entity.status).toBe('published');
      expect(entity.collectionItems.map((item) => item.entityId)).toEqual(group.items);
      const description = readFileSync(
        resolve(root, `content/collections/${group.id}.md`),
        'utf8',
      ).split('---')[2];
      expect(description).not.toMatch(/\[\[|\]\(/);
      groupedIds.push(...group.items);
    }
    expect(new Set(groupedIds).size).toBe(38);
    expect([...groupedIds].sort()).toEqual(
      metadata.patterns.map((entry: { id: string }) => entry.id).sort(),
    );
    expect(
      readFileSync(
        resolve(root, 'content/collections/data-visualization-patterns.md'),
        'utf8',
      ).split('---')[2],
    ).not.toMatch(/\[\[|\]\(/);
    for (const entry of metadata.patterns) {
      const source = readFileSync(resolve(root, `content/patterns/${entry.id}.md`), 'utf8');
      const parsed = parseMarkdownEntity(source, {
        sourceId: 'commons',
        sourcePath: `patterns/${entry.id}.md`,
      });
      expect(parsed.entity!.status).toBe('published');
      const body = parsed.entity!.body;
      const config = JSON.parse(body.match(/```patternverse-widget\n([\s\S]*?)\n```/)![1]);
      expect(parseArticleWidget(JSON.stringify(config))).toBeDefined();
      expect(body.indexOf('```patternverse-widget')).toBeLessThan(
        body.indexOf('## What to notice'),
      );
      const words = body
        .replace(/```[\s\S]*?```/g, '')
        .split('## Sources')[0]
        .trim()
        .split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(150);
      expect(words).toBeLessThanOrEqual(250);
      expect([...body.matchAll(/^## (.+)$/gm)].map((match) => match[1])).toEqual(
        metadata.article_structure,
      );
      expect(entry.example_user_queries.length).toBeGreaterThanOrEqual(8);
      for (const target of entry.related_patterns)
        expect(
          corpus.entities.some(
            (candidate) => candidate.id === target && candidate.status === 'published',
          ),
        ).toBe(true);
      for (const url of entry.sources) expect(body).toContain(url);
    }
  }, 30_000);
});
