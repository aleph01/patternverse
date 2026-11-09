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
    name: 'figure-ground-open-evening',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'photo-shade': ['opacity'] },
  },
  {
    name: 'figure-ground-loop-pitcher',
    sources: { photo: 'figure-ground-pitcher-cutout.png', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'product-ground': ['fill'] },
  },
  {
    name: 'figure-ground-date-dialog',
    sources: { photo: 'audience-workspace-photo.jpg', stage: 'audience-phone-stage.jpg' },
    changes: { 'page-dimmer': ['opacity'] },
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
describe('Separate Figure from Ground controlled photographic comparisons', () => {
  it.each(examples)('$name changes only its declared ground treatment', ({ name, changes }) => {
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
        expect(['fill', 'opacity']).toContain(attribute);
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
  it('covers all photo text with the stable shade, reuses an alpha cutout, and keeps the dimmer below the dialog', () => {
    const luminance = (color: string) => {
      const c = [1, 3, 5]
        .map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const poster = svg('figure-ground-open-evening'),
      before = group(poster, 'before'),
      after = group(poster, 'after'),
      shade = part(after, 'photo-shade');
    expect(part(before, 'photo-shade').getAttribute('opacity')).toBe('0');
    expect(shade.getAttribute('opacity')).toBe('1');
    const stops = Array.from(poster.querySelectorAll('#photo-shade-gradient stop'));
    const stableOffset = Number(stops[1].getAttribute('offset')),
      alpha = Number(stops[1].getAttribute('stop-opacity'));
    expect(stops[1].getAttribute('stop-color')).toBe('#000000');
    expect(stops[2].getAttribute('stop-opacity')).toBe(String(alpha));
    const stableTop =
      Number(shade.getAttribute('y')) + Number(shade.getAttribute('height')) * stableOffset;
    // A white source pixel is a conservative maximum behind this black shade.
    const maxBackgroundChannel = Math.ceil(255 * (1 - alpha)),
      maxBackground = '#' + maxBackgroundChannel.toString(16).padStart(2, '0').repeat(3);
    for (const id of ['headline', 'invitation', 'date', 'entry']) {
      const line = part(after, id);
      expect(
        Number(line.getAttribute('y')) - Number(line.getAttribute('font-size')),
      ).toBeGreaterThan(stableTop);
      expect(Number(line.getAttribute('y'))).toBeLessThan(
        Number(shade.getAttribute('y')) + Number(shade.getAttribute('height')),
      );
      expect(
        (luminance(line.getAttribute('fill')!) + 0.05) / (luminance(maxBackground) + 0.05),
      ).toBeGreaterThan(4.5);
    }
    const product = svg('figure-ground-loop-pitcher'),
      productBefore = group(product, 'before'),
      productAfter = group(product, 'after');
    expect(luminance(part(productAfter, 'product-ground').getAttribute('fill')!)).toBeGreaterThan(
      luminance(part(productBefore, 'product-ground').getAttribute('fill')!),
    );
    const png = readFileSync(resolve(assets, 'figure-ground-pitcher-cutout.png'));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png[25]).toBe(6); // PNG RGBA color type, not a flattened RGB photograph.
    expect(part(productAfter, 'pitcher').getAttribute('viewBox')).toBe(
      `0 0 ${png.readUInt32BE(16)} ${png.readUInt32BE(20)}`,
    );
    expect(part(productBefore, 'pitcher').isEqualNode(part(productAfter, 'pitcher'))).toBe(true);
    const dialog = svg('figure-ground-date-dialog'),
      dialogBefore = group(dialog, 'before'),
      dialogAfter = group(dialog, 'after'),
      dimmer = part(dialogAfter, 'page-dimmer');
    expect(part(dialogBefore, 'page-dimmer').getAttribute('opacity')).toBe('0');
    expect(dimmer.getAttribute('opacity')).toBe('0.48');
    const children = Array.from(dialogAfter.children);
    expect(children.indexOf(dimmer)).toBeGreaterThan(
      children.indexOf(part(dialogAfter, 'page-button-label')),
    );
    expect(children.indexOf(dimmer)).toBeLessThan(
      children.indexOf(part(dialogAfter, 'dialog-surface')),
    );
    expect(part(dialogAfter, 'dialog-surface').getAttribute('fill')).toBe('#fffdf6');
    expect(dimmer.getAttribute('clip-path')).toBe('url(#screen-clip)');
    for (const { name } of examples) {
      const doc = svg(name);
      expect(group(doc, 'before').textContent).toBe(group(doc, 'after').textContent);
    }
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});
