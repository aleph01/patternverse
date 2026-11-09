// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error Test-only jsdom dependency has no bundled declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { parseMarkdownEntity, compileCorpus } from '@patternverse/compiler';
import library from '../../../../../../content/assets/libraries/needs.json';
import starters from '../../widgets/needs-starters.json';
import { renderEntityMarkdown } from '$lib/server/markdown';

const root = resolve(process.cwd(), '../..');
const html = readFileSync(resolve(root, 'content/assets/widgets/identify-needs.html'), 'utf8');
const open = () => new JSDOM(html, { runScripts: 'dangerously' });

describe('needs reference browser', () => {
  it('bundles the canonical vocabulary, shortlist, and shared selector styles without drift', () => {
    const template = readFileSync(
      resolve(root, 'apps/web/src/lib/article-widgets/needs/browser.html'),
      'utf8',
    );
    const css = readFileSync(resolve(root, 'apps/web/src/lib/widgets/templates/needs.css'), 'utf8');
    expect(html).toBe(
      template
        .replace('/* NEEDS_STYLES */', () => css)
        .replace('<!-- NEEDS_LIBRARY -->', () => JSON.stringify(library).replaceAll('<', '\\u003c'))
        .replace('<!-- NEEDS_STARTERS -->', () =>
          JSON.stringify(starters).replaceAll('<', '\\u003c'),
        ),
    );
    expect(Buffer.byteLength(html)).toBeLessThan(512_000);
  });

  it('makes every need reachable, keeps shared needs meaningful in both branches, and preserves keyboard focus', () => {
    const dom = open();
    try {
      const { document } = dom.window;
      expect(document.querySelector('.nt-view-label')!.textContent).toContain('24 starting words');
      document.querySelector<HTMLButtonElement>('[data-view="detailed"]')!.click();
      const reached = new Set<string>();
      for (const area of library.records.filter((r) => !r.parent_ids.length)) {
        const button = document.querySelector<HTMLButtonElement>(`[data-area="${area.id}"]`)!;
        if (button.getAttribute('aria-expanded') !== 'true') button.click();
      }
      for (const n of library.records.filter((r) => r.kind === 'need')) {
        const buttons = [...document.querySelectorAll<HTMLButtonElement>(`[data-need="${n.id}"]`)];
        expect(buttons).toHaveLength(n.parent_ids.length);
        for (const button of buttons) {
          const key = button.dataset.key!;
          const current = document.querySelector<HTMLButtonElement>(
            `[data-need="${n.id}"][data-key="${key}"]`,
          )!;
          if (current.getAttribute('aria-expanded') === 'true') current.click();
          const target = document.querySelector<HTMLButtonElement>(
            `[data-need="${n.id}"][data-key="${key}"]`,
          )!;
          target.focus();
          target.click();
          expect((document.activeElement as HTMLElement).dataset.need).toBe(n.id);
          const meaning = document.getElementById(`meaning-${key}`)!;
          expect(meaning.textContent).toContain(n.description);
          for (const cue of n.recognition_cues) expect(meaning.textContent).toContain(cue);
          reached.add(n.id);
        }
      }
      expect(reached.size).toBe(68);
      expect(document.querySelector('.nt-selection')).toBeNull();
    } finally {
      dom.window.close();
    }
  });

  it('searches all needs even in Simple, handles no results and renders input as text', () => {
    const dom = open();
    try {
      const { document, Event } = dom.window;
      const search = document.querySelector('input')!;
      search.value = 'hydration';
      search.dispatchEvent(new Event('input'));
      expect(document.querySelectorAll('[data-need]')).toHaveLength(1);
      document.querySelector<HTMLButtonElement>('[data-need="water"]')!.click();
      expect(document.querySelector('.nt-detail')!.textContent).toContain(
        'Enough safe drinking water',
      );
      search.value = '<img src=x onerror=alert(1)>';
      search.dispatchEvent(new Event('input'));
      expect(document.querySelector('.nt-empty')!.textContent).toContain('No matching needs');
      expect(document.querySelector('img')).toBeNull();
    } finally {
      dom.window.close();
    }
  });

  it('registers the article, resource, and three-pattern Therapy collection without moving existing memberships', async () => {
    const parse = (path: string) =>
      parseMarkdownEntity(readFileSync(resolve(root, path), 'utf8'), {
        sourceId: 'commons',
        sourcePath: path,
      });
    const collection = parse('content/collections/self-understanding.md');
    const article = parse('content/patterns/identify-needs.md');
    expect(collection.diagnostics).toEqual([]);
    expect(article.diagnostics).toEqual([]);
    const entities = [
      collection.entity!,
      article.entity!,
      parse('content/patterns/cbt-thinking-patterns.md').entity!,
      parse('content/patterns/identify-limiting-beliefs.md').entity!,
      parse('content/verses/therapy.md').entity!,
    ];
    const compiled = compileCorpus(entities, [{ id: 'commons', name: 'Commons', readonly: true }]);
    expect(collection.entity).toMatchObject({
      items: ['cbt-thinking-patterns', 'identify-limiting-beliefs', 'identify-needs'],
      verses: ['therapy'],
    });
    expect(
      compiled.entities.find((e) => e.id === 'identify-needs')!.collectionMemberships,
    ).toContainEqual({ sourceId: 'commons', entityId: 'self-understanding' });
    expect(article.entity!.libraries).toEqual([
      { id: 'needs', src: '../assets/libraries/needs.json' },
    ]);
    expect(
      await renderEntityMarkdown(
        compiled.entities.find((e) => e.id === 'identify-needs')!,
        compiled.entities,
      ),
    ).toContain('data-article-widget');
  });
});
