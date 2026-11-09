// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Example = {
  name: string;
  sources: Record<string, string>;
  before: number;
  after: number;
  counts: [number, number];
};
const root = resolve(process.cwd(), '../..'),
  assets = resolve(root, 'content/assets/graphic-design');
const examples: Example[] = [
  {
    name: 'line-length-visitor-guide',
    sources: { photo: 'audience-workspace-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    before: 725,
    after: 480,
    counts: [4, 6],
  },
  {
    name: 'line-length-care-note',
    sources: { photo: 'explicit-tableware-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    before: 180,
    after: 390,
    counts: [8, 4],
  },
  {
    name: 'line-length-report-scope',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    before: 725,
    after: 480,
    counts: [3, 4],
  },
];
const svg = (name: string) => {
  const document = new DOMParser().parseFromString(
    readFileSync(resolve(assets, name + '.svg'), 'utf8'),
    'image/svg+xml',
  );
  expect(document.querySelector('parsererror')).toBeNull();
  return document;
};
const group = (document: Document, variant: string) =>
  document.querySelector(`[data-variant="${variant}"]`)!;
const part = (element: Element, id: string) => element.querySelector(`[data-element="${id}"]`)!;
const normalized = (element: Element) => {
  const clone = element.cloneNode(true) as Element;
  clone.removeAttribute('transform');
  clone.removeAttribute('data-variant');
  return clone;
};
describe('Control Line Length controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only its declared measure and necessary wrapping',
    ({ name, before, after, counts }) => {
      const doc = svg(name),
        variants = [normalized(group(doc, 'before')), normalized(group(doc, 'after'))];
      for (const [index, g] of variants.entries()) {
        expect(g.querySelectorAll('[data-change]')).toHaveLength(1);
        const column = part(g, 'reading-column'),
          body = part(g, 'body'),
          copy = body.getAttribute('data-copy')!;
        expect(column.getAttribute('data-change')).toBe('data-measure reflow');
        expect(Number(column.getAttribute('data-measure'))).toBe(index === 0 ? before : after);
        expect(body.textContent).toBe(copy);
        expect(body.getAttribute('aria-label')).toBe(copy);
        const lines = Array.from(body.children);
        expect(lines).toHaveLength(counts[index]);
        for (const [i, line] of lines.entries()) {
          expect(line.localName).toBe('tspan');
          expect(line.getAttribute('x')).toBe(body.getAttribute('x'));
          expect(Number(line.getAttribute('y'))).toBe(
            Number(body.getAttribute('y')) + i * Number(body.getAttribute('data-leading')),
          );
        }
        column.removeAttribute('data-measure');
        body.replaceChildren(doc.createTextNode(copy));
      }
      expect(variants[0].isEqualNode(variants[1])).toBe(true);
    },
  );
  it.each(examples)(
    '$name embeds the identical local image and paper sources',
    ({ name, sources }) => {
      const document = svg(name);
      for (const [id, file] of Object.entries(sources))
        expect(document.querySelector(`defs image[id="${id}"]`)?.getAttribute('href')).toBe(
          'data:image/' +
            (file.endsWith('.png') ? 'png' : 'jpeg') +
            ';base64,' +
            readFileSync(resolve(assets, file)).toString('base64'),
        );
    },
  );
  it.each(examples)('$name preserves the complete variants in its stacked view', ({ name }) => {
    const wide = svg(name),
      mobile = svg(name + '-mobile');
    for (const variant of ['before', 'after'])
      expect(normalized(group(wide, variant)).isEqualNode(normalized(group(mobile, variant)))).toBe(
        true,
      );
    expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
  });
  it('preserves the exact font and source paragraph, measured wrap records, and the complete report table', () => {
    const data = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-line-length-wraps.json'),
        'utf8',
      ),
    ) as {
      examples: {
        name: string;
        copy: string;
        size: number;
        leading: number;
        before: { lines: string[] };
        after: { lines: string[] };
      }[];
    };
    const font = readFileSync(
      resolve(root, 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2'),
    ).toString('base64');
    for (const { name } of examples) {
      const doc = svg(name),
        record = data.examples.find((r) => r.name === name)!;
      expect(doc.querySelector('defs style')!.textContent).toContain(
        'font-family:PVMeasureSans;src:url(data:font/woff2;base64,' + font,
      );
      for (const variant of ['before', 'after'] as const) {
        const body = part(group(doc, variant), 'body');
        expect(body.getAttribute('data-copy')).toBe(record.copy);
        expect(body.getAttribute('font-family')).toBe('PVMeasureSans');
        expect(body.getAttribute('font-weight')).toBe('400');
        expect(Number(body.getAttribute('font-size'))).toBe(record.size);
        expect(Number(body.getAttribute('data-leading'))).toBe(record.leading);
        expect(Array.from(body.children).map((line) => line.textContent?.trimEnd())).toEqual(
          record[variant].lines,
        );
      }
    }
    const report = svg('line-length-report-scope'),
      before = part(group(report, 'before'), 'table'),
      after = part(group(report, 'after'), 'table');
    expect(before.isEqualNode(after)).toBe(true);
    expect(part(after, 'table-rule').getAttribute('d')).toBe('M95 428H820');
    expect(part(after, 'row-1-places').textContent).toBe('84');
    expect(part(after, 'row-2-places').textContent).toBe('96');
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});
