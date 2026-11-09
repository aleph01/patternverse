// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'core-message-repair-poster',
    photo: 'core-message-repair-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    headline: ['Free repair', 'help, Saturday.'],
  },
  {
    name: 'core-message-coffee-package',
    photo: 'core-message-coffee-photo.jpg',
    stage: 'core-message-coffee-package-stage.jpg',
    headline: ['Decaf.', 'Whole bean.'],
  },
  {
    name: 'core-message-library-report',
    photo: 'core-message-library-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    headline: ['30% of visits', 'repeat an issue.'],
  },
];

const svg = (name: string) => {
  const result = new DOMParser().parseFromString(
    readFileSync(resolve(assets, `${name}.svg`), 'utf8'),
    'image/svg+xml',
  );
  expect(result.querySelector('parsererror')).toBeNull();
  return result;
};

const group = (document: Document, name: string) => {
  const result = document.querySelector(`[data-variant="${name}"]`);
  expect(result).not.toBeNull();
  return result!;
};

const normalize = (node: Element, message = false) => {
  const result = node.cloneNode(true) as Element;
  result.removeAttribute('data-variant');
  result.removeAttribute('transform');
  if (message) {
    for (const headline of result.querySelectorAll('[data-message="headline"]')) {
      headline.textContent = 'Identical headline placeholder';
    }
  }
  return result;
};

describe('Define the Core Message photographic examples', () => {
  it.each(examples)('$name changes headline words without changing visual treatment', (example) => {
    const document = svg(example.name);
    const before = group(document, 'before');
    const after = group(document, 'after');
    const beforeHeadlines = [...before.querySelectorAll('[data-message="headline"]')];
    const afterHeadlines = [...after.querySelectorAll('[data-message="headline"]')];
    expect(beforeHeadlines).toHaveLength(2);
    expect(afterHeadlines.map((node) => node.textContent)).toEqual(example.headline);
    for (let i = 0; i < 2; i++) {
      expect(beforeHeadlines[i].textContent).not.toBe(afterHeadlines[i].textContent);
    }
    expect(normalize(before, true).isEqualNode(normalize(after, true))).toBe(true);
  });

  it.each(examples)('$name reuses identical photographic image data', (example) => {
    const document = svg(example.name);
    for (const [id, file] of [
      ['photo', example.photo],
      ['stage', example.stage],
    ]) {
      expect(document.querySelector(`defs image[id="${id}"]`)?.getAttribute('href')).toBe(
        `data:image/jpeg;base64,${readFileSync(resolve(assets, file)).toString('base64')}`,
      );
    }
    for (const name of ['before', 'after']) {
      const variant = group(document, name);
      expect(variant.querySelector('[data-element="stage"]')?.getAttribute('href')).toBe('#stage');
      expect(variant.querySelector('[data-element="photograph"] use')?.getAttribute('href')).toBe(
        '#photo',
      );
    }
  });

  it.each(examples)('$name keeps the same content in its narrow-screen version', (example) => {
    const wide = svg(example.name);
    const mobile = svg(`${example.name}-mobile`);
    for (const name of ['before', 'after']) {
      expect(normalize(group(wide, name)).isEqualNode(normalize(group(mobile, name)))).toBe(true);
    }
    expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
  });

  it('embeds the three comparisons and preserves the report denominator and qualifications', () => {
    const article = readFileSync(
      resolve(root, 'content/patterns/graphic-design-define-the-core-message.md'),
      'utf8',
    );
    for (const example of examples) {
      expect(article).toContain(`](../assets/graphic-design/${example.name}.svg "`);
    }
    const report = group(svg('core-message-library-report'), 'after');
    const total = Number(report.querySelector('[data-element="total"]')?.textContent);
    const repeat = Number(report.querySelector('[data-element="repeat"]')?.textContent);
    expect((repeat / total) * 100).toBe(30);
    expect(article).toContain('the denominator is visits');
    expect(article).toContain('These counts alone cannot explain causes');
    expect(article.match(/!\[/g)).toHaveLength(3);
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});
