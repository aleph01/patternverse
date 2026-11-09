// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error Test-only jsdom dependency has no bundled declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { parseMarkdownEntity } from '@patternverse/compiler';
import { loadWidgetSource } from '../assets';

const root = resolve(process.cwd(), '../..');
const html = readFileSync(
  resolve(root, 'content/assets/widgets/explore-what-feels-wrong.html'),
  'utf8',
);
const resource = JSON.parse(
  readFileSync(resolve(root, 'content/assets/libraries/self-acceptability.json'), 'utf8'),
);
const open = () => new JSDOM(html, { runScripts: 'dangerously' });

describe('self-acceptability recognition browser', () => {
  it('shares all canonical entries with AI lookup and loads through the production asset boundary', async () => {
    const dom = open();
    try {
      const embedded = JSON.parse(
        dom.window.document.querySelector('#recognition-data')!.textContent!,
      );
      expect(embedded.records).toEqual(resource.records);
      expect(embedded.records).toHaveLength(317);
      expect(embedded.domains).toHaveLength(9);
      expect(embedded.subfamilies).toHaveLength(63);
      expect(embedded.judgments).toHaveLength(10);
      expect(new Set(resource.records.map((record: { id: string }) => record.id)).size).toBe(317);
      for (const family of embedded.subfamilies) {
        const examples = embedded.records.filter(
          (record: { subfamily_id: string }) => record.subfamily_id === family.id,
        );
        expect(examples.length).toBeGreaterThanOrEqual(4);
        expect(examples.length).toBeLessThanOrEqual(6);
      }
      expect(embedded.domains.flatMap((domain: { ids: string[] }) => domain.ids).sort()).toEqual(
        resource.records.map((record: { id: string }) => record.id).sort(),
      );
      expect(await loadWidgetSource('explore-what-feels-wrong.html')).toBe(html);
      expect(Buffer.byteLength(html)).toBeLessThan(512_000);
      expect(html).not.toMatch(
        /fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|indexedDB|<script\s+src|<iframe/,
      );
      expect(resource.record_type.record).not.toHaveProperty('consequence');
      expect(resource.record_type.record).not.toHaveProperty('protective_requirement');
    } finally {
      dom.window.close();
    }
  });

  it('makes every entry reachable by aspect and by self-judgment, with native expandable details', () => {
    const dom = open();
    try {
      const { document, KeyboardEvent } = dom.window;
      for (const mode of ['aspect', 'judgment']) {
        document.querySelector<HTMLButtonElement>(`[data-mode="${mode}"]`)!.click();
        const categoryIds = [...document.querySelectorAll<HTMLElement>('[data-category]')].map(
          (node) => node.dataset.category,
        );
        const reached: string[] = [];
        for (const id of categoryIds) {
          document.querySelector<HTMLButtonElement>(`[data-category="${id}"]`)!.click();
          for (const family of document.querySelectorAll<HTMLDetailsElement>('[data-family]')) {
            if (mode === 'aspect') expect(family.open).toBe(false);
            if (!family.open) family.querySelector<HTMLElement>('summary')!.click();
            expect(family.open).toBe(true);
          }
          expect(
            document.querySelector(
              'input[type="checkbox"], [data-select], .selected-button, .clear',
            ),
          ).toBeNull();
          for (const details of document.querySelectorAll<HTMLDetailsElement>('[data-entry]')) {
            const record = resource.records.find(
              (item: { id: string }) => item.id === details.dataset.entry,
            );
            reached.push(record.id);
            details.querySelector<HTMLElement>('summary')!.click();
            expect(details.open).toBe(true);
            expect(details.closest('[data-example]')!.textContent).toContain(record.statement);
            expect(
              details.closest('[data-family]')!.querySelector('summary')!.textContent,
            ).toContain(record.family_name);
            expect(details.textContent).toContain(record.meaning_boundary);
            expect(details.textContent).toContain(record.clarification);
            for (const subject of record.subjects) expect(details.textContent).toContain(subject);
          }
          document.querySelector<HTMLButtonElement>('[data-back]')!.click();
          expect(document.activeElement?.getAttribute('data-category')).toBe(id);
        }
        expect(reached.sort()).toEqual(
          resource.records.map((record: { id: string }) => record.id).sort(),
        );
      }
      document
        .querySelector('#judgment-tab')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(document.activeElement?.id).toBe('aspect-tab');
      expect(document.querySelector('#judgment-tab')!.getAttribute('tabindex')).toBe('-1');
    } finally {
      dom.window.close();
    }
  });

  it('preserves every original statement and makes mild and unnamed examples independently discoverable', () => {
    const previous = JSON.parse(
      readFileSync(resolve(root, 'docs/self-acceptability/history/library-v0.1.json'), 'utf8'),
    );
    for (const old of previous.records) {
      expect(resource.records.find((record: { id: string }) => record.id === old.id)).toMatchObject(
        old,
      );
    }
    const dom = open();
    try {
      const { document, Event } = dom.window;
      const search = document.querySelector<HTMLInputElement>('#search')!;
      search.value = 'slightly messy';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      expect(document.querySelectorAll('[data-example]')).toHaveLength(1);
      const example = document.querySelector<HTMLElement>(
        '[data-example="S0050-E02"] .example-statement',
      )!;
      expect(example.textContent).toBe(
        'My home is slightly messy, and I feel embarrassed about it.',
      );
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector<HTMLButtonElement>('#judgment-tab')!.click();
      document.querySelector<HTMLButtonElement>('[data-category="unspecified"]')!.click();
      expect(document.querySelector('[data-example="S0050-E02"]')).not.toBeNull();
      expect(document.querySelector('[data-example="S0050"]')).toBeNull();
      expect(document.querySelector('[data-example="S0008-E02"]')).not.toBeNull();
      expect(document.querySelector('[data-example="S0008-E06"]')).toBeNull();
    } finally {
      dom.window.close();
    }
  });

  it('publishes the companion article, typed resource and practice together in CBT', () => {
    const parse = (path: string) =>
      parseMarkdownEntity(readFileSync(resolve(root, 'content', path), 'utf8'), {
        sourceId: 'commons',
        sourcePath: path,
      });
    const parsed = parse('patterns/explore-what-feels-wrong.md');
    expect(parsed.diagnostics).toEqual([]);
    const pattern = parsed.entity!;
    expect(pattern.status).toBe('published');
    expect(pattern.libraries).toEqual([
      { id: 'self-acceptability', src: '../assets/libraries/self-acceptability.json' },
    ]);
    expect(pattern.body).toContain('"src": "explore-what-feels-wrong.html"');
    expect(pattern.languagePracticeSource).toContain(
      ':import library from "commons:self-acceptability"',
    );
    const collection = parse('collections/cbt.md').entity!;
    if (collection.type !== 'collection') throw new Error('Expected CBT collection');
    expect(collection.items).toContain(pattern.id);
  });
});
