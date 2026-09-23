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
});
