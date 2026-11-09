// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error Test-only jsdom dependency has no bundled declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { parseMarkdownEntity } from '@patternverse/compiler';
import library from './library-v0.8.json';

const root = resolve(process.cwd(), '../..');
const html = readFileSync(
  resolve(root, 'content/assets/widgets/identify-limiting-beliefs.html'),
  'utf8',
);
const openBrowser = () => new JSDOM(html, { runScripts: 'dangerously' });

describe('limiting-belief reference browser', () => {
  it('bundles the complete candidate library, with valid navigation and inert catalogue text', () => {
    const dom = openBrowser();
    try {
      const embedded = JSON.parse(
        dom.window.document.querySelector('#pv-belief-data')!.textContent!,
      );
      expect(embedded).toEqual(library);
      const template = readFileSync(
        resolve(root, 'apps/web/src/lib/article-widgets/beliefs/browser.html'),
        'utf8',
      );
      expect(html).toBe(
        template.replace('<!-- BELIEF_LIBRARY -->', () =>
          JSON.stringify(library).replaceAll('<', '\\u003c'),
        ),
      );
      expect(library.beliefs).toHaveLength(185);
      expect(new Set(library.beliefs.map((belief) => belief.id)).size).toBe(185);
      expect(library.domains).toHaveLength(7);
      const families = library.domains.flatMap((domain) => domain.families);
      expect(families).toHaveLength(27);
      expect(families.flatMap((family) => family.subfamilies)).toHaveLength(111);
      const ids = families.flatMap((family) => family.subfamilies.flatMap((sub) => sub.ids));
      expect(ids.sort()).toEqual(library.beliefs.map((belief) => belief.id).sort());
      for (const form of library.forms) {
        expect(library.beliefs.filter((belief) => belief.forms.includes(form.id))).toHaveLength(
          form.count,
        );
      }
      expect(Buffer.byteLength(html)).toBeLessThan(512_000);
      expect(html).not.toMatch(
        /fetch\s*\(|XMLHttpRequest|WebSocket|window\.openai|localStorage|indexedDB|<script\s+src|<iframe/,
      );
      expect(dom.window.document.querySelector('input, textarea, form')).toBeNull();
    } finally {
      dom.window.close();
    }
  });

  it('makes every belief reachable by theme and preserves every expanded meaning and question', () => {
    const dom = openBrowser();
    try {
      const { document } = dom.window;
      const reached: string[] = [];
      for (const domain of library.domains) {
        document.querySelector<HTMLButtonElement>(`[data-category="${domain.id}"]`)!.click();
        const rows = [...document.querySelectorAll<HTMLDetailsElement>('details[data-belief]')];
        expect(rows).toHaveLength(domain.count);
        for (const row of rows) {
          const belief = library.beliefs.find((entry) => entry.id === row.dataset.belief)!;
          reached.push(belief.id);
          row.querySelector<HTMLElement>('summary')!.click();
          expect(row.open).toBe(true);
          expect(row.querySelector('.pv-statement')!.textContent).toBe(belief.statement);
          const content = row.querySelector('.pv-belief-content')!.textContent!;
          for (const text of [
            belief.meaning,
            belief.context,
            ...belief.variants,
            ...belief.questions,
            ...belief.notEntailed,
            ...belief.open,
            ...belief.readings.map((reading) => reading.content),
          ]) {
            expect(content).toContain(text);
          }
        }
        document.querySelector<HTMLButtonElement>('[data-action="back"]')!.click();
        expect(document.activeElement?.getAttribute('data-category')).toBe(domain.id);
      }
      expect(reached.sort()).toEqual(library.beliefs.map((belief) => belief.id).sort());
      expect(library.beliefs.filter((belief) => belief.readings.length)).toHaveLength(32);
      expect(library.beliefs.flatMap((belief) => belief.readings)).toHaveLength(71);
    } finally {
      dom.window.close();
    }
  });

  it('offers all eight overlapping structures and keeps an unstated consequence open', () => {
    const dom = openBrowser();
    try {
      const { document, KeyboardEvent } = dom.window;
      document
        .querySelector<HTMLButtonElement>('#pv-theme-tab')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(document.querySelector('#pv-structure-tab')!.getAttribute('aria-selected')).toBe(
        'true',
      );
      expect(document.querySelectorAll('[data-category]')).toHaveLength(8);
      for (const form of library.forms) {
        document.querySelector<HTMLButtonElement>(`[data-category="${form.id}"]`)!.click();
        expect(
          [...document.querySelectorAll<HTMLElement>('details')]
            .map((row) => row.dataset.belief)
            .sort(),
        ).toEqual(
          library.beliefs
            .filter((belief) => belief.forms.includes(form.id))
            .map((belief) => belief.id)
            .sort(),
        );
        if (form.id === 'R') {
          const anger = document.querySelector('details[data-belief="P0094"]')!;
          expect(anger.querySelector('.pv-meaning')!.textContent).toContain('not stated');
          expect(anger.textContent).toContain('Fear of rejection');
          expect(anger.textContent).toContain('This statement does not establish');
        }
        document.querySelector<HTMLButtonElement>('[data-action="back"]')!.click();
      }
      document
        .querySelector<HTMLButtonElement>('#pv-structure-tab')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      expect(document.activeElement?.id).toBe('pv-theme-tab');
      expect(document.querySelectorAll('[data-category]')).toHaveLength(7);
    } finally {
      dom.window.close();
    }
  });

  it('publishes the article beside Downward Arrow in CBT and preserves its reference browser', () => {
    const parse = (path: string) =>
      parseMarkdownEntity(readFileSync(resolve(root, 'content', path), 'utf8'), {
        sourceId: 'commons',
        sourcePath: path,
      });
    const article = parse('patterns/identify-limiting-beliefs.md');
    expect(article.diagnostics).toEqual([]);
    const pattern = article.entity!;
    expect(pattern.type).toBe('pattern');
    expect(pattern.status).toBe('published');
    expect(pattern.body).toContain('"src": "identify-limiting-beliefs.html"');
    expect(pattern.tags).toContain('ai-assisted');
    expect(pattern.languagePracticeSource).toContain('matches = !agent');
    expect(pattern.body).not.toContain('patternverse-practice');
    const collection = parse('collections/cbt.md');
    expect(collection.diagnostics).toEqual([]);
    const cbt = collection.entity!;
    if (cbt.type !== 'collection') throw new Error('CBT must remain a collection.');
    const members = cbt.items;
    const index = members.indexOf(pattern.id);
    expect(members.slice(index - 1, index + 2)).toEqual([
      'cbt-thinking-patterns',
      'identify-limiting-beliefs',
      'cbt-downward-arrow',
    ]);
  });
});
