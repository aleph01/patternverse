import { compileCorpus, parseMarkdownEntity, type CompiledEntity } from '@patternverse/compiler';
// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { renderEntityMarkdown } from './markdown.js';

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
