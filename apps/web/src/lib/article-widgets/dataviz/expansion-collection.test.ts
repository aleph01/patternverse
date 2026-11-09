// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { plot } from '@observablehq/plot';
import { expansionManifest, type ExpansionLesson } from './expansion-manifest';
import * as D from './expansion-data';
import { expansionView } from './expansion-plots';

const root = resolve(process.cwd(), '../..');
function mount(lesson: ExpansionLesson) {
  const source = readFileSync(
    resolve(root, `content/assets/widgets/dataviz-${lesson.id}.html`),
    'utf8',
  );
  const parsed = new DOMParser().parseFromString(source, 'text/html');
  document.body.innerHTML = parsed.body.innerHTML;
  document.body.dataset.lesson = lesson.id;
  Object.defineProperty(document.querySelector('#panels'), 'clientWidth', { value: 640 });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  window.eval(parsed.querySelector('script')!.textContent!);
  return source;
}
function mode(value: string) {
  const input = document.querySelector<HTMLInputElement>(`input[name="mode"][value="${value}"]`)!;
  input.checked = true;
  input.dispatchEvent(new Event('change'));
}
function control(key: string, value: number | string) {
  const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#control-${key}`)!;
  input.value = String(value);
  input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input'));
}

describe('the next twenty visual lessons', () => {
  it('reconciles counts, rates, growth, intersections, transitions, and distributions', () => {
    expect(D.districts.map((d) => (d.incidents / d.population) * 100_000)).toEqual([200, 400, 100]);
    expect(D.growth.map((d) => (d.values.at(-1)! / d.values[0]) * 100)).toEqual([140, 200]);
    expect(D.repeatedPoints).toHaveLength(80);
    expect(new Set(D.repeatedPoints.map((d) => `${d.x},${d.y}`)).size).toBe(5);
    expect(D.contributions.filter((d) => !d.total).reduce((n, d) => n + d.change, 100)).toBe(130);
    expect(D.intersections.reduce((n, d) => n + d.count, 0)).toBe(20);
    expect(
      ['A', 'B', 'C'].map((set) =>
        D.intersections.filter((d) => d.members.includes(set)).reduce((n, d) => n + d.count, 0),
      ),
    ).toEqual([13, 13, 8]);
    expect(D.transitions.filter((d) => d.to === 'Active')).toHaveLength(9);
    expect(D.transitions.filter((d) => d.to === 'Paused')).toHaveLength(3);
    expect(D.cumulativeWaits().find((d) => d.minutes === 6)!.share).toBe(7 / 12);
    expect(D.cumulativeWaits().at(-1)!.share).toBe(1);
    expect(D.movingAverage(3)[0]).toEqual({ day: 2, value: 41 / 3 });
    expect(D.movingAverage(7)).toHaveLength(9);
    expect(D.selectedRequests(7, 3).map((d) => d.id)).toEqual([3, 4, 5, 6, 8, 9, 10]);
    expect(D.filteredRequests('west', 11)).toEqual([]);
  });

  it.each(expansionManifest)(
    '$title executes every mode and extra control in its actual bundle',
    (lesson) => {
      try {
        const source = mount(lesson);
        const table = document.querySelector('table')!.textContent;
        expect(source.length).toBeLessThanOrEqual(512_000);
        expect(source).toContain('@observablehq/plot@0.6.17');
        expect(document.querySelector('script[src]')).toBeNull();
        for (const [value] of lesson.modes) {
          mode(value);
          expect(document.querySelector('#panels svg')).toBeTruthy();
          expect(
            document.querySelector('#panels svg')!.getAttribute('aria-description')!.length,
          ).toBeGreaterThan(30);
          expect(document.body.dataset.mode).toBe(value);
        }
        for (const c of lesson.controls as readonly ExpansionLesson['controls'][number][]) {
          const values = c.type === 'range' ? [c.min!, c.max!] : c.options!.map((d) => d[0]);
          for (const value of values) {
            control(c.key, value);
            expect(document.querySelector('#readout')!.textContent!.length).toBeGreaterThan(30);
            expect(document.querySelector('#panels svg')).toBeTruthy();
          }
        }
        expect(document.querySelector('table')!.textContent).toBe(table);
      } finally {
        document.body.replaceChildren();
        delete document.body.dataset.lesson;
        vi.unstubAllGlobals();
      }
    },
  );

  it('reports inclusive thresholds and empty filters, and exposes persistent details without hover', () => {
    try {
      mount(expansionManifest.find((d) => d.id === 'show-the-cumulative-distribution')!);
      control('threshold', 6);
      expect(document.querySelector('#readout')!.textContent).toContain('7 of 12 waits (58.3%)');
      mount(expansionManifest.find((d) => d.id === 'filter-to-focus')!);
      control('minimum', 11);
      expect(document.querySelector('#panels svg')!.textContent).toContain('No matching requests');
      expect(document.querySelector('#readout')!.textContent).toContain('0 of 12');
      mount(expansionManifest.find((d) => d.id === 'details-on-demand')!);
      control('case', '12');
      expect(document.body.dataset.mode).toBe('details');
      expect(document.querySelector('#text-account')!.textContent).toContain(
        'Case 12 · West. 10 hours; 9 completed tasks.',
      );
    } finally {
      document.body.replaceChildren();
      delete document.body.dataset.lesson;
      vi.unstubAllGlobals();
    }
  });

  it('keeps selection identities, dots, and histogram counts in agreement', () => {
    const view = expansionView('brushing-and-linking', 'selected', 640, { low: 3, high: 7 });
    expect(view.summary).toContain('7 of 12');
    const dots = plot(view.panels[0].options);
    expect(dots.querySelectorAll('g[aria-label="dot"] circle[fill="#007a4d"]')).toHaveLength(7);
    const bins = plot(view.panels[1].options);
    const heights = [...bins.querySelectorAll('g[aria-label="rect"]')];
    expect(heights).toHaveLength(2);
    expect(heights[1].querySelectorAll('rect')).toHaveLength(5);
  });
});
