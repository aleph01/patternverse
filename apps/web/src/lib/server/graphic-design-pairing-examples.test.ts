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
    name: 'pairing-supporting-voice',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'supporting-type': ['font-family'] },
  },
  {
    name: 'pairing-distinct-roles',
    sources: { photo: 'explicit-tableware-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'headline-type': ['font-family'] },
  },
  {
    name: 'pairing-consistent-assignments',
    sources: { photo: 'audience-pottery-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'afternoon-title-type': ['font-family'], 'afternoon-details-type': ['font-family'] },
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
describe('Pair Complementary Typefaces controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only its declared font-role assignments',
    ({ name, changes }) => {
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
          expect(['font-family']).toContain(attribute);
          expect(a.getAttribute(attribute)).not.toBe(b.getAttribute(attribute));
          a.removeAttribute(attribute);
          b.removeAttribute(attribute);
        }
      }
      expect(before.isEqualNode(after)).toBe(true);
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
  it('embeds exact licensed fonts and gives each complete artifact precisely two faces with the intended role map', () => {
    const files: Record<string, string> = {
      PVReadingDisplay: 'docs/pattern-packages/graphic-design-typeface-fonts/reading-display.woff2',
      PVGeometric: 'docs/pattern-packages/graphic-design-typeface-fonts/geometric.woff2',
      PVEvent: 'docs/pattern-packages/graphic-design-typeface-fonts/event.woff2',
      PVPairingSans: 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2',
      PVPairingScript: 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-script.woff2',
    };
    const face = (el: Element) => el.closest('[font-family]')!.getAttribute('font-family');
    for (const { name } of examples) {
      const doc = svg(name),
        style = doc.querySelector('defs style')!.textContent!;
      for (const [family, file] of Object.entries(files))
        expect(style).toContain(
          'font-family:' +
            family +
            ';src:url(data:font/woff2;base64,' +
            readFileSync(resolve(root, file)).toString('base64'),
        );
      for (const variant of ['before', 'after']) {
        const g = group(doc, variant),
          faces = new Set(Array.from(g.querySelectorAll('text')).map(face));
        expect(faces.size).toBe(2);
        expect(faces.has('Arial, Helvetica, sans-serif')).toBe(false);
      }
      expect(group(doc, 'before').textContent).toBe(group(doc, 'after').textContent);
    }
    const invitation = svg('pairing-supporting-voice');
    expect(face(part(group(invitation, 'before'), 'headline'))).toBe('PVEvent');
    expect(face(part(group(invitation, 'after'), 'headline'))).toBe('PVEvent');
    for (const id of ['brand', 'description', 'date', 'entry', 'activities', 'footer']) {
      expect(face(part(group(invitation, 'before'), id))).toBe('PVPairingScript');
      expect(face(part(group(invitation, 'after'), id))).toBe('PVGeometric');
    }
    const journal = svg('pairing-distinct-roles');
    expect(face(part(group(journal, 'before'), 'headline'))).toBe('PVGeometric');
    expect(face(part(group(journal, 'after'), 'headline'))).toBe('PVReadingDisplay');
    for (const id of ['brand', 'byline', 'body-0', 'body-6', 'footer'])
      for (const variant of ['before', 'after'])
        expect(face(part(group(journal, variant), id))).toBe('PVPairingSans');
    const programme = svg('pairing-consistent-assignments'),
      after = group(programme, 'after');
    for (const prefix of ['morning', 'afternoon']) {
      expect(face(part(after, prefix + '-title'))).toBe('PVEvent');
      for (const role of ['place', 'time', 'price', 'inclusion'])
        expect(face(part(after, prefix + '-' + role))).toBe('PVGeometric');
    }
    for (const role of ['title', 'place', 'time', 'price', 'inclusion'])
      expect(
        part(group(programme, 'before'), 'morning-' + role).isEqualNode(
          part(after, 'morning-' + role),
        ),
      ).toBe(true);
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});
