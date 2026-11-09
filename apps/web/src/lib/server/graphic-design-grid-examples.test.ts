// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..'),
  assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'grid-studio-program',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
  },
  {
    name: 'grid-editorial-spans',
    sources: { photo: 'core-message-repair-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
  },
  {
    name: 'grid-responsive-workshops',
    sources: {
      photo: 'audience-pottery-photo.jpg',
      photo2: 'scale-workshop-photo-v2.jpg',
      stage: 'audience-phone-stage.jpg',
    },
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
const group = (document: Document, name: string) =>
  document.querySelector(`[data-variant="${name}"]`)!;
const part = (element: Element, id: string) => element.querySelector(`[data-element="${id}"]`)!;
const normalized = (element: Element) => {
  const copy = element.cloneNode(true) as Element;
  copy.removeAttribute('transform');
  copy.removeAttribute('data-variant');
  return copy;
};
const words = (element: Element) =>
  [...element.querySelectorAll('text')]
    .map((e) => e.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
const position = (element: Element) => {
  const match = element.getAttribute('transform')!.match(/^translate\(([\d.]+) ([\d.]+)\)$/)!;
  expect(match).toBeTruthy();
  return [Number(match[1]), Number(match[2])];
};
describe('Establish a Grid controlled photographic examples', () => {
  it.each(examples)('$name embeds the exact shared photographic sources', ({ name, sources }) => {
    const document = svg(name);
    for (const [id, file] of Object.entries(sources))
      expect(document.querySelector(`defs image[id="${id}"]`)?.getAttribute('href')).toBe(
        'data:image/jpeg;base64,' + readFileSync(resolve(assets, file)).toString('base64'),
      );
  });
  it.each(examples)(
    '$name keeps complete variants unchanged in the stacked presentation',
    ({ name }) => {
      const wide = svg(name),
        mobile = svg(name + '-mobile');
      for (const variant of ['before', 'after'])
        expect(
          normalized(group(wide, variant)).isEqualNode(normalized(group(mobile, variant))),
        ).toBe(true);
      expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
    },
  );
  it('moves only three complete program cards onto recurring two-track regions', () => {
    const document = svg('grid-studio-program'),
      before = normalized(group(document, 'before')),
      after = normalized(group(document, 'after'));
    const positions = [1, 2, 3, 4].map((i) => position(part(after, 'session-' + i)));
    expect(positions[0][0]).toBe(positions[2][0]);
    expect(positions[1][0]).toBe(positions[3][0]);
    expect(positions[0][1]).toBe(positions[1][1]);
    expect(positions[2][1]).toBe(positions[3][1]);
    expect(positions[1][0] - positions[0][0]).toBe(228 + 24);
    for (const id of ['session-2', 'session-3', 'session-4']) {
      expect(part(before, id).getAttribute('transform')).not.toBe(
        part(after, id).getAttribute('transform'),
      );
      part(before, id).removeAttribute('transform');
      part(after, id).removeAttribute('transform');
    }
    expect(before.isEqualNode(after)).toBe(true);
  });
  it('widens only the story span while preserving every word, typography, leading and unrelated element', () => {
    const document = svg('grid-editorial-spans'),
      before = normalized(group(document, 'before')),
      after = normalized(group(document, 'after'));
    const frames = [part(before, 'story-frame'), part(after, 'story-frame')];
    expect(words(frames[0])).toBe(words(frames[1]));
    expect(frames.map((f) => Number(f.getAttribute('width')))).toEqual([102, 3 * 102 + 2 * 24]);
    expect(frames.map((f) => f.querySelectorAll('text').length)).toEqual([13, 4]);
    for (const frame of frames) {
      expect(frame.getAttribute('overflow')).toBe('visible');
      [...frame.querySelectorAll('text')].forEach((line, i) => {
        expect(line.getAttribute('font-size')).toBe('18');
        expect(line.getAttribute('font-weight')).toBe('400');
        expect(line.getAttribute('font-family')).toBe('Arial, Helvetica, sans-serif');
        expect(Number(line.getAttribute('y'))).toBe(20 + i * 22);
      });
      frame.replaceChildren();
      frame.removeAttribute('width');
      frame.removeAttribute('data-span');
    }
    expect(before.isEqualNode(after)).toBe(true);
  });
  it('changes only responsive card geometry and inclusion wrapping while preserving text, styles, order and normalized crops', () => {
    const document = svg('grid-responsive-workshops'),
      before = normalized(group(document, 'before')),
      after = normalized(group(document, 'after'));
    for (const id of ['course-clay', 'course-print']) {
      const a = part(before, id),
        b = part(after, id);
      expect(words(a)).toBe(words(b));
      for (const card of [a, b]) {
        card.removeAttribute('transform');
        card.removeAttribute('data-track');
        const image = part(card, 'course-image');
        expect(Number(image.getAttribute('width')) / Number(image.getAttribute('height'))).toBe(2);
        expect(image.getAttribute('viewBox')).toBe('0 0 1536 1024');
        expect(image.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice');
        image.removeAttribute('width');
        image.removeAttribute('height');
        for (const key of ['course-title', 'course-date', 'course-price'])
          part(card, key).removeAttribute('y');
        const inclusion = part(card, 'course-inclusion'),
          copy = words(inclusion);
        for (const line of inclusion.querySelectorAll('text')) {
          expect(line.getAttribute('font-size')).toBe('16');
          expect(line.getAttribute('font-weight')).toBe('400');
          expect(line.getAttribute('fill')).toBe('#17352f');
          expect(line.getAttribute('font-family')).toBe('Arial, Helvetica, sans-serif');
          expect(line.getAttribute('x')).toBe('0');
        }
        inclusion.replaceChildren(document.createTextNode(copy));
        const button = part(card, 'course-button');
        button.removeAttribute('width');
        button.removeAttribute('y');
        const action = part(card, 'course-action');
        action.removeAttribute('x');
        action.removeAttribute('y');
      }
      expect(a.isEqualNode(b)).toBe(true);
    }
    expect(before.isEqualNode(after)).toBe(true);
  });
  it('keeps identical course content and order in the independent responsive policy study', () => {
    const document = new DOMParser().parseFromString(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-grid-responsive-proof.html'),
        'utf8',
      ),
      'text/html',
    );
    const before = document.querySelector('[data-variant="before"] .courses')!,
      after = document.querySelector('[data-variant="after"] .courses')!;
    expect(before.isEqualNode(after)).toBe(true);
    expect(
      [...after.querySelectorAll('[data-course]')].map((e) => e.getAttribute('data-course')),
    ).toEqual(['clay', 'print']);
    expect(document.querySelector('style')?.textContent).toContain(
      '.after .courses{grid-template-columns:1fr}',
    );
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});
