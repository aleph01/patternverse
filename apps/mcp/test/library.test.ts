import { beforeAll, expect, it } from 'vitest';
import { loadPublicLibrary } from '../src/corpus.js';
import { createPublicLibrary, type PublicLibrary } from '../src/library.js';
import {
  loadAndCompileCorpus,
  type CompiledCorpus,
  type CompiledEntity,
} from '@patternverse/compiler';
import { fileURLToPath } from 'node:url';

const root = new URL('../../../', import.meta.url);
let corpus: CompiledCorpus;
let library: PublicLibrary;
beforeAll(async () => {
  corpus = await loadAndCompileCorpus(
    {
      manifestPath: fileURLToPath(new URL('patternverse.yaml', root)),
      contentDirectory: fileURLToPath(new URL('content', root)),
      readonly: true,
    },
    { includeDrafts: false },
  );
  library = await loadPublicLibrary(() => {
    throw new Error('No runtime in metadata tests');
  });
});

it('uses existing search ranking, pattern-only filtering, verses, and pagination', () => {
  const result = library.searchPatterns({ query: 'Cognitive Distortions', verse: 'therapy' });
  expect(result.results[0]?.id).toBe('cbt-thinking-patterns');
  expect(result.results.every((entry) => entry.type === 'pattern')).toBe(true);
  const all = library.searchPatterns({ query: '' });
  expect(all.pagination.total).toBe(
    corpus.entities.filter((entry) => entry.type === 'pattern' && entry.status === 'published')
      .length,
  );
  const second = library.searchPatterns({ limit: 2, offset: 2 });
  expect(second.results.map((entry) => entry.id)).toEqual(
    all.results.slice(2, 4).map((entry) => entry.id),
  );
  expect(second.pagination.hasMore).toBe(true);
  expect(library.searchPatterns({ offset: 10000 }).results).toEqual([]);
  expect(() => library.searchPatterns({ verse: 'cbt-thinking-patterns' })).toThrow();
});

it('preserves articles, organization, links, and existing attached practice selection', () => {
  const pattern = library.getPattern('cbt-thinking-patterns').pattern;
  expect(pattern.articleMarkdown).toBe(
    corpus.entities.find((entry) => entry.id === pattern.id)?.body,
  );
  expect(pattern.articleMarkdown).toContain('Discounting the positive');
  expect(pattern.verses.map((entry) => entry.id)).toContain('therapy');
  expect(pattern.url).toBe('https://patternverse.org/pattern/cbt-thinking-patterns');
  expect(pattern.hasPractice).toBe(true);
  expect(pattern.practices.map((entry) => entry.id)).toEqual(['cbt-thinking-patterns']);
  expect(
    library.getPattern('creative-reframing').pattern.practices.map((entry) => entry.id),
  ).toContain('five-alternative-frames');
  expect(library.getPattern('abstract-factory').pattern.hasPractice).toBe(false);
  expect(() => library.getPractice('abstract-factory')).toThrow('No Pattern Language practice');
  expect(() =>
    library.getPractice('creative-reframing', 'commons', 'cbt-thinking-patterns'),
  ).toThrow();
});

it('never indexes or returns draft, deprecated, foreign-source entries or their links', () => {
  const original = corpus.entities.find((entry) => entry.type === 'pattern')!;
  const variants: CompiledEntity[] = [
    {
      ...original,
      id: 'secret-draft',
      status: 'draft',
      ref: { sourceId: 'commons', entityId: 'secret-draft' },
    },
    {
      ...original,
      id: 'retired-entry',
      status: 'deprecated',
      ref: { sourceId: 'commons', entityId: 'retired-entry' },
    },
    {
      ...original,
      id: 'private-entry',
      sourceId: 'personal',
      ref: { sourceId: 'personal', entityId: 'private-entry' },
    },
  ];
  const guarded = createPublicLibrary(
    {
      ...corpus,
      entities: [
        ...corpus.entities.map((entry) =>
          entry.id === original.id
            ? {
                ...entry,
                links: [
                  ...entry.links,
                  ...variants.map((hidden) => ({
                    raw: hidden.id,
                    entityId: hidden.id,
                    target: hidden.ref,
                    resolvedLabel: hidden.title,
                  })),
                ],
              }
            : entry,
        ),
        ...variants,
      ],
      searchDocuments: [
        ...corpus.searchDocuments,
        ...variants.map((entry) => ({
          ...corpus.searchDocuments[0]!,
          id: `${entry.sourceId}:${entry.id}`,
          ref: entry.ref,
          sourceId: entry.sourceId,
          status: entry.status,
          type: entry.type,
          title: 'Private sentinel',
          body: 'Private sentinel',
        })),
      ],
    },
    {},
    () => {
      throw new Error();
    },
  );
  const visible = guarded.searchPatterns({ limit: 10000 }).results.map((entry) => entry.id);
  for (const entry of variants) expect(visible).not.toContain(entry.id);
  for (const entry of variants)
    expect(() => guarded.getPattern(entry.id, entry.sourceId)).toThrow();
  expect(guarded.searchPatterns({ query: 'Private sentinel' }).results).toEqual([]);
  const related = guarded.getPattern(original.id).pattern.relatedPatterns.map((entry) => entry.id);
  for (const entry of variants) expect(related).not.toContain(entry.id);
  const encoded = JSON.stringify(guarded.getPattern(original.id));
  expect(encoded).not.toContain('sourcePath');
  expect(encoded).not.toContain('/Users/');
});

it('requires explicit selection for multiple attached practices and preserves authored precedence', () => {
  const parent = corpus.entities.find((entry) => entry.id === 'cbt-thinking-patterns')!;
  const template = corpus.entities.find((entry) => entry.id === 'five-alternative-frames')!;
  const first = {
    ...template,
    id: 'first-practice',
    ref: { sourceId: 'commons', entityId: 'first-practice' },
  };
  const second = {
    ...template,
    id: 'second-practice',
    ref: { sourceId: 'commons', entityId: 'second-practice' },
  };
  const inspect = (bundle: { root: string; patterns: Record<string, string> }) => ({
    root: bundle.root,
    revision: 'test',
    snapshot_id: 'test',
    inputs: {},
    outputs: {},
    sources: { [bundle.root]: bundle.patterns[bundle.root]! },
  });
  const fixtures = (source?: string) =>
    createPublicLibrary(
      {
        ...corpus,
        entities: [
          {
            ...parent,
            languagePracticeSource: source,
            implementedByPractices: [first.ref, second.ref],
          },
          first,
          second,
        ],
        searchDocuments: [],
      },
      { 'cbt.thinking-patterns': 'bundled source' },
      inspect,
    );
  const attached = fixtures();
  expect(attached.getPattern(parent.id).pattern.practices.map((entry) => entry.id)).toEqual([
    first.id,
    second.id,
  ]);
  expect(() => attached.getPractice(parent.id)).toThrow('More than one practice');
  expect(attached.getPractice(parent.id, 'commons', second.id).practice.id).toBe(second.id);
  const authored = fixtures(':language 1\n-> end');
  expect(authored.getPractice(parent.id)).toMatchObject({
    practice: { id: parent.id },
    source: ':language 1\n-> end',
  });
});
