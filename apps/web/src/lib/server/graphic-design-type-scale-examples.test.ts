// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Example = { name: string; sources: Record<string, string>; changes: Record<string, string[]> };
const root = resolve(process.cwd(), '../..'),
  assets = resolve(root, 'content/assets/graphic-design');
const examples: Example[] = [
  {
    name: 'type-scale-repeated-roles',
    sources: { photo: 'audience-pottery-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: Object.fromEntries(
      [
        'headline',
        'morning-title',
        'morning-place',
        'morning-time',
        'morning-price',
        'morning-inclusion',
        'afternoon-title',
        'afternoon-place',
        'afternoon-time',
        'afternoon-price',
        'afternoon-inclusion',
      ].map((id) => [id, ['font-size']]),
    ),
  },
  {
    name: 'type-scale-distinct-levels',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: {
      headline: ['font-size'],
      'workshops-title': ['font-size'],
      'open-title': ['font-size'],
    },
  },
  {
    name: 'type-scale-phone-roles',
    sources: { photo: 'audience-workspace-photo.jpg', stage: 'audience-phone-stage.jpg' },
    changes: { headline: ['font-size'], 'included-title': ['font-size'] },
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
describe('Establish a Type Scale controlled photographic comparisons', () => {
  it.each(examples)('$name changes only its declared font sizes', ({ name, changes }) => {
    const document = svg(name),
      before = normalized(group(document, 'before')),
      after = normalized(group(document, 'after'));
    expect(before.querySelectorAll('[data-change]')).toHaveLength(Object.keys(changes).length);
    expect(after.querySelectorAll('[data-change]')).toHaveLength(Object.keys(changes).length);
    for (const [id, attributes] of Object.entries(changes)) {
      const a = part(before, id),
        b = part(after, id);
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(a.getAttribute('data-change')?.split(' ')).toEqual(attributes);
      for (const attribute of attributes) {
        expect(['font-size']).toContain(attribute);
        expect(a.getAttribute(attribute)).not.toBe(b.getAttribute(attribute));
        a.removeAttribute(attribute);
        b.removeAttribute(attribute);
      }
    }
    expect(before.isEqualNode(after)).toBe(true);
  });
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
  it('uses one fixed font, maps each role to the declared scale, and preserves body and supporting sizes when adapting the phone', () => {
    const font = readFileSync(
      resolve(root, 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2'),
    ).toString('base64');
    const printRoles: Record<string, number> = { title: 40, section: 28, body: 22, meta: 20 },
      phoneRoles: Record<string, number> = { title: 36, section: 24, body: 22, meta: 20 };
    for (const { name } of examples) {
      const doc = svg(name),
        after = group(doc, 'after');
      expect(doc.querySelector('defs style')!.textContent).toContain(
        'font-family:PVScaleSans;src:url(data:font/woff2;base64,' + font,
      );
      expect(doc.querySelector('defs style')!.textContent?.match(/@font-face/g)).toHaveLength(1);
      const roles = name === 'type-scale-phone-roles' ? phoneRoles : printRoles;
      for (const el of Array.from(after.querySelectorAll('text'))) {
        expect(el.getAttribute('font-family')).toBe('PVScaleSans');
        expect(el.getAttribute('font-weight')).toBe('400');
        expect(el.getAttribute('font-optical-sizing')).toBe('none');
        expect(Number(el.getAttribute('font-size'))).toBe(roles[el.getAttribute('data-role')!]);
      }
      expect(group(doc, 'before').textContent).toBe(after.textContent);
    }
    const sizes = (el: Element) =>
      new Set(Array.from(el.querySelectorAll('text')).map((x) => x.getAttribute('font-size')));
    const programme = svg('type-scale-repeated-roles');
    expect(sizes(group(programme, 'before')).size).toBe(8);
    expect(sizes(group(programme, 'after')).size).toBe(4);
    const report = svg('type-scale-distinct-levels');
    for (const id of ['workshops-title', 'open-title'])
      expect(part(group(report, 'after'), id).getAttribute('font-size')).toBe('28');
    const phone = svg('type-scale-phone-roles');
    for (const id of [
      'price',
      'included-body',
      'hours',
      'button-label',
      'brand',
      'terms-line-1',
      'terms-line-2',
    ])
      expect(part(group(phone, 'before'), id).isEqualNode(part(group(phone, 'after'), id))).toBe(
        true,
      );
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});
