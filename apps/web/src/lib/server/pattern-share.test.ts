// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseMarkdownEntity,
  type CompiledEntity,
  type CompiledCorpus,
} from '@patternverse/compiler';
import { embeddablePractice, patternShare } from './pattern-share';
import { embedCode } from '$lib/sharing/types';

const simple =
  ':language 1\n:title "A small reflection"\nanswer = !ask {\nWhat matters?\n}\n-> end';
function entity(source = simple, overrides: Partial<CompiledEntity> = {}): CompiledEntity {
  const parsed = parseMarkdownEntity(
    `---\nid: example\ntype: pattern\ntitle: Example\nsummary: A useful approach.\nstatus: published\n---\n\n\`\`\`patternverse-language\n${source}\n\`\`\``,
    { sourceId: 'commons', sourcePath: 'example.md' },
  ).entity!;
  return {
    ...parsed,
    ref: { sourceId: 'commons', entityId: 'example' },
    links: [],
    backlinks: [],
    collectionItems: [],
    collectionMemberships: [],
    verseMemberships: [],
    verseMembers: [],
    implementsPatterns: [],
    implementedByPractices: [],
    ...overrides,
  } as CompiledEntity;
}
const corpus = (entities: CompiledEntity[]): CompiledCorpus => ({
  schemaVersion: 1,
  entities,
  sources: [],
  searchDocuments: [],
  unresolvedReferences: [],
  diagnostics: [],
});

describe('public embed eligibility', () => {
  it('uses the authored practice title and accepts ordinary questions, not just forms', () => {
    expect(embeddablePractice(entity())).toMatchObject({
      id: 'example',
      type: 'pattern',
      title: 'A small reflection',
    });
  });
  it('rejects drafts, private content, missing definitions, invalid sources and required host inputs', () => {
    for (const candidate of [
      entity(simple, { status: 'draft' }),
      entity(simple, { sourceId: 'personal' }),
      entity(simple, { languagePracticeSource: undefined }),
      entity('not valid'),
      entity(':language 1\n:input topic text\n!show {\n{{topic}}\n}\n-> end'),
    ])
      expect(embeddablePractice(candidate)).toBeUndefined();
  });
  it('excludes AI and dependency-based practices even when their first step is a question', () => {
    for (const file of ['overt-statements', 'semantic-review', 'project-review']) {
      const source = readFileSync(
        resolve(process.cwd(), `../../docs/pattern-markdown/examples/${file}.pattern.md`),
        'utf8',
      );
      expect(embeddablePractice(entity(source))).toBeUndefined();
    }
    const ai =
      ':language 1\nanswer = !ask {\nYour situation?\n}\nreply = !agent {\n:returns text\nReflect on {{answer}}.\n}\n!show {\n{{reply}}\n}\n-> end';
    expect(embeddablePractice(entity(ai))).toBeUndefined();
  });
  it('offers only published, embeddable linked practices and keeps their identity', () => {
    const pattern = entity(simple, {
      implementedByPractices: [
        { sourceId: 'commons', entityId: 'linked' },
        { sourceId: 'commons', entityId: 'draft' },
      ],
    });
    const linked = entity(simple, {
      id: 'linked',
      type: 'practice',
      ref: { sourceId: 'commons', entityId: 'linked' },
    });
    const draft = entity(simple, { id: 'draft', type: 'practice', status: 'draft' });
    const share = patternShare(corpus([pattern, linked, draft]), pattern)!;
    expect(share.practices.map(({ type, id }) => `${type}:${id}`)).toEqual([
      'pattern:example',
      'practice:linked',
    ]);
    expect(share.pattern.usefulWhen).toBeUndefined();
    expect(patternShare(corpus([draft]), draft)).toBeNull();
  });
  it('keeps authored use-case labels readable without inventing missing context', () => {
    const pattern = entity(simple, {
      body: '## When to use\n\nWhen [[other|another approach]] feels **stuck**.\n\n## Steps\n\nTry.',
    });
    expect(patternShare(corpus([pattern]), pattern)?.pattern.usefulWhen).toBe(
      'When another approach feels stuck.',
    );
  });
});

it('escapes embed attributes and uses public URLs without carrying answers or appearance options', () => {
  const code = embedCode('/embed/practice/pattern/example', 'A "title" <test> & more', true);
  expect(code).toContain('src="https://patternverse.org/embed/practice/pattern/example"');
  expect(code).toContain('title="A &quot;title&quot; &lt;test&gt; &amp; more"');
  expect(code).toContain('height="640"');
  expect(code).not.toMatch(/appearance|theme|checkpoint|answers/);
});
