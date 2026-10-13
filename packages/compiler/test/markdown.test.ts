import { describe, expect, it } from 'vitest';

import { parseMarkdownEntity } from '../src/index.js';
import { markdown } from './helpers.js';

describe('Markdown to RawEntity parsing', () => {
  it('parses strict frontmatter, body, aliases, and source identity', () => {
    const result = parseMarkdownEntity(
      markdown(
        `
id: creative-reframing
type: pattern
title: Creative Reframing
summary: Change the frame.
status: published
aliases:
  - Problem Reframing`,
        '## Pattern\n\nChange the representation.',
      ),
      { sourceId: 'commons', sourcePath: 'content/patterns/creative-reframing.md' },
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.entity).toMatchObject({
      id: 'creative-reframing',
      type: 'pattern',
      aliases: ['Problem Reframing'],
      sourceId: 'commons',
      body: '## Pattern\n\nChange the representation.',
    });
  });

  it('parses basic, aliased, and source-qualified wiki links but ignores code', () => {
    const result = parseMarkdownEntity(
      markdown(
        `
id: linking-pattern
type: pattern
title: Linking Pattern
status: published`,
        'See [[plain-target]], [[alias-target|use this label]], and [[commons:public-target]].\n\n`[[ignored-inline]]`\n\n```txt\n[[ignored-code]]\n```',
      ),
      { sourceId: 'personal', sourcePath: 'content/patterns/linking-pattern.md' },
    );

    expect(result.entity?.wikiLinks).toEqual([
      expect.objectContaining({ entityId: 'plain-target' }),
      expect.objectContaining({ entityId: 'alias-target', label: 'use this label' }),
      expect.objectContaining({ entityId: 'public-target', sourceId: 'commons' }),
    ]);
  });

  it('reports unsupported Commons fields and can warn-and-ignore them for personal drafts', () => {
    const source = markdown(`
id: personal-note
type: concept
title: Personal Note
status: draft
inventedField:
  - unsupported`);
    const commons = parseMarkdownEntity(source, {
      sourceId: 'commons',
      sourcePath: 'content/concepts/personal-note.md',
    });
    const personal = parseMarkdownEntity(source, {
      sourceId: 'personal',
      sourcePath: 'concepts/personal-note.md',
      unknownFieldPolicy: 'warning',
    });
    const publishedPersonal = parseMarkdownEntity(
      source.replace('status: draft', 'status: published'),
      {
        sourceId: 'personal',
        sourcePath: 'concepts/published-note.md',
        unknownFieldPolicy: 'warning',
      },
    );

    expect(commons.entity).toBeUndefined();
    expect(commons.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'unknown-field', severity: 'error', field: 'inventedField' }),
    );
    expect(personal.entity).toBeDefined();
    expect(personal.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'unknown-field',
        severity: 'warning',
        field: 'inventedField',
      }),
    );
    expect(personal.entity).not.toHaveProperty('inventedField');
    expect(publishedPersonal.entity).toBeUndefined();
    expect(publishedPersonal.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'unknown-field', severity: 'error', field: 'inventedField' }),
    );
  });

  it('parses and validates an embedded Practice on a Pattern', () => {
    const result = parseMarkdownEntity(
      markdown(
        `
id: steady-attention
type: pattern
title: Steady Attention
status: published`,
        `
Article before the Practice.

\`\`\`patternverse-practice
title: Steady Attention Practice
steps:
  - id: notice
    blocks:
      - id: notice-guidance
        type: markdown
        content: Pause for a moment.
      - id: notice-response
        type: text-input
        label: What is happening?
        multiline: true
        required: true
\`\`\``,
      ),
      { sourceId: 'commons', sourcePath: 'content/patterns/steady-attention.md' },
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.entity?.practice?.title).toBe('Steady Attention Practice');
    expect(result.entity?.practice?.steps).toHaveLength(1);
    expect(result.entity?.body).toContain('Article before the Practice.');
  });

  it('rejects unsupported block types and Practice blocks on concepts', () => {
    const invalidPractice = parseMarkdownEntity(
      markdown(
        `
id: branching
type: pattern
title: Branching
status: published`,
        `\`\`\`patternverse-practice
title: Branching
steps:
  - id: first
    blocks:
      - id: script
        type: script
        javascript: alert(1)
\`\`\``,
      ),
      { sourceId: 'commons', sourcePath: 'content/patterns/branching.md' },
    );
    const patternWithPractice = parseMarkdownEntity(
      markdown(
        `
id: wrong-block
type: concept
title: Wrong Block
status: published`,
        `\`\`\`patternverse-practice
title: Wrong
steps:
  - id: first
    blocks:
      - id: content
        type: markdown
        content: No.
\`\`\``,
      ),
      { sourceId: 'commons', sourcePath: 'content/concepts/wrong-block.md' },
    );

    expect(invalidPractice.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'invalid-practice-block' }),
    );
    expect(patternWithPractice.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'practice-block-on-non-practice' }),
    );
  });

  it('rejects malformed YAML and multiple embedded Practice blocks', () => {
    const malformed = parseMarkdownEntity(
      markdown(
        'id: malformed\ntype: pattern\ntitle: Malformed\nstatus: published',
        '```patternverse-practice\ntitle: [broken\n```',
      ),
      { sourceId: 'commons', sourcePath: 'content/patterns/malformed.md' },
    );
    const multiple = parseMarkdownEntity(
      markdown(
        'id: multiple\ntype: pattern\ntitle: Multiple\nstatus: published',
        '```patternverse-practice\ntitle: One\nsteps: []\n```\n\n```patternverse-practice\ntitle: Two\nsteps: []\n```',
      ),
      { sourceId: 'commons', sourcePath: 'content/patterns/multiple.md' },
    );

    expect(malformed.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'invalid-practice-block' }),
    );
    expect(multiple.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'multiple-practice-blocks' }),
    );
  });

  it('returns useful errors for missing frontmatter and malformed wiki links', () => {
    expect(
      parseMarkdownEntity('# No frontmatter', {
        sourceId: 'commons',
        sourcePath: 'content/patterns/no-frontmatter.md',
      }).diagnostics,
    ).toContainEqual(expect.objectContaining({ code: 'missing-frontmatter' }));

    const badLink = parseMarkdownEntity(
      markdown(
        `
id: bad-link
type: pattern
title: Bad Link
status: published`,
        'This [[Not A Valid ID]] is invalid.',
      ),
      { sourceId: 'commons', sourcePath: 'content/patterns/bad-link.md' },
    );
    expect(badLink.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'invalid-wiki-link', reference: 'Not A Valid ID' }),
    );
  });
});
