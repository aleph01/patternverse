import { compileCorpus, parseMarkdownEntity, type CompiledEntity } from '@patternverse/compiler';
// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { renderEntityArticle, renderEntityMarkdown } from './markdown.js';

const markdown = (id: string, type: 'pattern' | 'concept' | 'practice', body: string): string =>
  `---\nid: ${id}\ntype: ${type}\ntitle: ${id}\nstatus: published\n---\n\n${body}\n`;

const compiledEntities = (
  body: string,
  originType: 'pattern' | 'practice' = 'pattern',
): readonly CompiledEntity[] => {
  const origin = parseMarkdownEntity(markdown('origin', originType, body), {
    sourceId: 'commons',
    sourcePath: 'content/patterns/origin.md',
  }).entity;
  const target = parseMarkdownEntity(markdown('target', 'concept', 'Target body.'), {
    sourceId: 'commons',
    sourcePath: 'content/concepts/target.md',
  }).entity;
  if (!origin || !target) throw new Error('Markdown rendering fixture failed to parse.');

  return compileCorpus(
    [origin, target],
    [{ id: 'commons', name: 'Patternverse Commons', readonly: true }],
  ).entities;
};

describe('safe Markdown rendering', () => {
  it('highlights fenced code while preserving literal markup, indentation and copyable text', async () => {
    const source =
      'from html import escape\n\ndef render():\n    return "<script>alert(1)</script> & text"\n# a comment\n';
    const entities = compiledEntities(`\`\`\`python\n${source}\`\`\``);
    const html = await renderEntityMarkdown(
      entities.find((e) => e.id === 'origin')!,
      entities,
    );
    const page = new DOMParser().parseFromString(html, 'text/html');
    const pre = page.querySelector('pre.syntax-highlighted')!;
    expect(pre.getAttribute('tabindex')).toBe('0');
    expect(pre.getAttribute('aria-label')).toBe('python code example');
    expect(pre.querySelector('code')?.textContent).toBe(source);
    expect(pre.querySelectorAll('span').length).toBeGreaterThan(4);
    expect(page.querySelector('script')).toBeNull();
  });

  it('keeps unknown fenced languages readable and leaves inline code literal', async () => {
    const entities = compiledEntities(
      '```unknown-language\n<component> & literal\n```\n\n`return True`',
    );
    const html = await renderEntityMarkdown(
      entities.find((e) => e.id === 'origin')!,
      entities,
    );
    const page = new DOMParser().parseFromString(html, 'text/html');
    expect(page.querySelector('pre code')?.textContent).toBe('<component> & literal\n');
    expect(page.querySelector('pre')?.classList.contains('syntax-highlighted')).toBe(false);
    expect(page.querySelector('p code')?.innerHTML).toBe('return True');
  });
  it('keeps sentence-length section links short without losing distinct targets', async () => {
    const start = 'Ask which consequences matter most when a decision is uncertain';
    const entities = compiledEntities(
      `## ${start} today\n\nFirst.\n\n## ${start} tomorrow\n\nSecond.`,
    );
    const article = await renderEntityArticle(
      entities.find((e) => e.id === 'origin')!,
      entities,
    );
    expect(article.sections[0].id.length).toBeLessThan(70);
    expect(article.sections[1].id).not.toBe(article.sections[0].id);
    const page = new DOMParser().parseFromString(article.html, 'text/html');
    for (const section of article.sections)
      expect(page.getElementById(section.id)?.textContent).toBe(section.title);
  });

  it('links article sections to unique, safe anchors with readable inline labels', async () => {
    const entities = compiledEntities(`
## Repeat
### **Nested** with \`code\` and [[target|a link]]
## Repeat
## Repeat-2
## 你好，世界
## !!!
## !!!
#### A detail outside the outline
`);
    const article = await renderEntityArticle(
      entities.find((e) => e.id === 'origin')!,
      entities,
    );
    const page = new DOMParser().parseFromString(article.html, 'text/html');
    expect(article.sections.map(({ title }) => title)).toEqual([
      'Repeat',
      'Nested with code and a link',
      'Repeat',
      'Repeat-2',
      '你好，世界',
      '!!!',
      '!!!',
    ]);
    expect(article.sections[1].depth).toBe(3);
    expect(new Set(article.sections.map(({ id }) => id)).size).toBe(article.sections.length);
    for (const section of article.sections) {
      const heading = page.getElementById(section.id);
      expect(heading?.textContent).toBe(section.title);
      expect(heading?.getAttribute('tabindex')).toBe('-1');
      expect(section.id).toMatch(/^user-content-article-section-/);
    }
    expect(page.querySelector('h4')?.hasAttribute('id')).toBe(false);
  });

  it('builds the outline from public prose after omitted sections and source blocks are removed', async () => {
    const entities = compiledEntities(`
## Visible
Text.
## With mira
### Hidden subsection
Hidden instructions.
## Example
\`\`\`text
## Code, not a section
\`\`\`
`);
    const article = await renderEntityArticle(
      entities.find((e) => e.id === 'origin')!,
      entities,
      {
        omitSections: ['With mira'],
      },
    );
    expect(article.sections.map(({ title }) => title)).toEqual(['Visible', 'Example']);
    expect(article.html).not.toContain('Hidden subsection');
    expect(article.html).toContain('## Code, not a section');
    const repeated = await renderEntityArticle(
      entities.find((e) => e.id === 'origin')!,
      entities,
      {
        omitSections: ['With mira'],
      },
    );
    expect(repeated).toEqual(article);
  });

  it('hides language practice source without hiding ordinary example code', async () => {
    const entities = compiledEntities(
      'Article.\n\n```patternverse-language\n:language 1\nanswer = !ask {\nHidden practice prompt\n}\n-> end\n```\n\n```pattern\nAn ordinary example\n```',
    );
    const html = await renderEntityMarkdown(
      entities.find((entity) => entity.id === 'origin')!,
      entities,
    );
    expect(html).toContain('Article.');
    expect(html).toContain('An ordinary example');
    expect(html).not.toContain('Hidden practice prompt');
    expect(html).not.toContain('patternverse-language');
  });
  it('renders adjacent film photographs as semantic figures without losing evidence links or credits', async () => {
    const pair = (n: number) =>
      `![Visible subject ${n}](https://example.com/film-${n}.jpg)\n\n*Film — production photograph.* Notice the hidden support. [Image source](https://example.com/source-${n}). Credit: Studio ${n}.`;
    const entities = compiledEntities([1, 2, 3].map(pair).join('\n\n'));
    const entity = { ...entities[0], id: 'film-example' };
    const html = await renderEntityMarkdown(entity, entities);
    const page = new DOMParser().parseFromString(html, 'text/html');
    expect(page.querySelectorAll('figure.content-photo')).toHaveLength(3);
    for (const n of [1, 2, 3]) {
      const image = page.querySelector(`img[alt="Visible subject ${n}"]`)!;
      const figure = image.closest('figure')!;
      expect(figure.querySelector('figcaption')?.textContent).toContain(
        'Notice the hidden support.',
      );
      expect(figure.querySelector('.figure-credit')?.textContent).toBe(`Credit: Studio ${n}.`);
      expect(figure.querySelector('figcaption a')?.getAttribute('href')).toBe(
        `https://example.com/source-${n}`,
      );
      expect(image.closest('a')?.getAttribute('href')).toBe(`https://example.com/film-${n}.jpg`);
    }
  });

  it('leaves ordinary remote images and unrelated following prose alone', async () => {
    const body =
      '![Subject](https://example.com/image.jpg)\n\nAn ordinary explanation. Credit: a useful idea.';
    const entities = compiledEntities(body);
    for (const id of ['origin', 'film-example']) {
      const html = await renderEntityMarkdown({ ...entities[0], id }, entities);
      expect(html).not.toContain('<figure');
      expect(html).toContain('An ordinary explanation.');
    }
  });

  it('isolates repeated local SVG diagrams and safely renders their captions', async () => {
    const diagram =
      '![Diagram description](/diagrams/gof/observer.svg "Subject notifies observers")';
    const entities = compiledEntities(`${diagram}\n\n${diagram}`);
    const html = await renderEntityMarkdown(
      entities.find((e) => e.id === 'origin')!,
      entities,
    );
    const page = new DOMParser().parseFromString(html, 'text/html');
    expect(page.querySelectorAll('figure.content-diagram')).toHaveLength(2);
    expect(page.querySelectorAll('figcaption')).toHaveLength(2);
    expect(page.querySelectorAll('[id]')).toHaveLength(0);
    expect(page.querySelectorAll('img[alt="Diagram description"]')).toHaveLength(2);
    expect(html).not.toContain('<svg');
  });

  it('renders GFM and resolved wiki links while leaving inline code literal', async () => {
    const entities = compiledEntities(`
## Connections

Read [[target|the target]], but keep \`[[target]]\` literal.

| A | B |
| - | - |
| 1 | 2 |`);
    const origin = entities.find((entity) => entity.id === 'origin');
    if (!origin) throw new Error('Missing origin fixture.');

    const html = await renderEntityMarkdown(origin, entities);
    expect(html).toContain('<h2>Connections</h2>');
    expect(html).toContain('<a href="/concept/target">the target</a>');
    expect(html).toContain('<code>[[target]]</code>');
    expect(html).toContain('<table>');
  });

  it('drops raw HTML and rejects unsafe URL schemes', async () => {
    const entities = compiledEntities(`
<script>alert('no')</script>

<strong onclick="alert('no')">Raw HTML</strong>

[Unsafe](javascript:alert('no'))`);
    const origin = entities.find((entity) => entity.id === 'origin');
    if (!origin) throw new Error('Missing origin fixture.');

    const html = await renderEntityMarkdown(origin, entities);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<strong');
  });

  it('removes structured Practice source blocks from reading prose', async () => {
    const entities = compiledEntities(
      `
Before.

\`\`\`patternverse-practice
steps:
  - type: content
    text: Pause.
\`\`\`

\`\`\`ts
const ordinaryCode = true;
\`\`\``,
      'practice',
    );
    const origin = entities.find((entity) => entity.id === 'origin');
    if (!origin) throw new Error('Missing origin fixture.');

    const html = await renderEntityMarkdown(origin, entities);
    expect(html).not.toContain('steps:');
    expect(html).toContain('ordinaryCode');
  });

  it('omits selected reading sections without changing neighboring prose', async () => {
    const entities = compiledEntities(`
Introduction.

## With mira

Open this in the companion.

## How it works

Keep this explanation.

## Executable Pattern Markdown

\`\`\`text
!ask hidden_source
\`\`\``);
    const origin = entities.find((entity) => entity.id === 'origin');
    if (!origin) throw new Error('Missing origin fixture.');

    const html = await renderEntityMarkdown(origin, entities, {
      omitSections: ['With mira', 'Executable Pattern Markdown'],
    });
    expect(html).toContain('Introduction.');
    expect(html).toContain('<h2>How it works</h2>');
    expect(html).toContain('Keep this explanation.');
    expect(html).not.toContain('With mira');
    expect(html).not.toContain('hidden_source');
  });
});
