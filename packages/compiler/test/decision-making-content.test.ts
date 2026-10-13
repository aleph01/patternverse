import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  loadAndCompileCorpus,
  parseLanguagePracticeFromBody,
  type CompiledCorpus,
} from '../src/index.js';

const root = new URL('../../../', import.meta.url);
const articles = [
  [
    'separate-reversible-from-irreversible-decisions',
    '2ab9cf807eac6d58e480b85c10d09fe02db9285ee1778a981341792a90e19dd0',
  ],
  [
    'define-the-decision-before-comparing-options',
    'f699a2e4dc6d7aa9a61ae9864b0f52b3bfc2adf678abc2d15c682cabe6bf70c1',
  ],
  ['run-a-premortem', '1eb4e9f246786bc57d78520b46cb798769fc38645da11f72f436983a87aef362'],
  [
    'prefer-the-smallest-useful-experiment',
    '41c68aedfedd9a60cc98c3d0fe62aa732c1cf0a77cf2b73c570a83b9f61894d7',
  ],
  ['make-trade-offs-explicit', '5c76df508d15f58011a526d0e1f5f55480383314362c3b1e4e1797e6fb3fc1a9'],
  ['keep-a-decision-journal', 'e711230345a5b452b900817b283494b4c65b9564b715acbd393a505088417781'],
  [
    'map-outcomes-likelihoods-and-preferences',
    '696a4e0bbc6449d852d5445f2cc8db106194c7792b47bd27fa5e8f735d689781',
  ],
  [
    'look-for-the-decisive-unknown',
    '8191b08024e1e8fec7cacf871e1bc973fbb283a92885d997e5a68b05533eb9ec',
  ],
] as const;
const practiceHashes: Record<string, string> = {
  'separate-reversible-from-irreversible-decisions':
    '1bdb06ee977fd718a3bce3c6629db99aa9512dfc87297fe4e7b95a949fe312fe',
  'define-the-decision-before-comparing-options':
    '4da606cf3653360a266bd30a64265b9b3a64412a59524669de11488bc81aa676',
  'run-a-premortem': '2194548f8494f927f170d661e996932290758ea1ff3f319c3db8746774b91c40',
  'prefer-the-smallest-useful-experiment':
    'a125ebc3319868341bdb31403643539d7df82bc0d9a4365a6e8c87a2652b78c6',
  'make-trade-offs-explicit': '85abbfb71391905d2e5a26869464e7985813ce930301cc20de1e7dce4ae778a5',
  'keep-a-decision-journal': '8207e4c1f5d24ff5d3bb6934c10aee6b64b413ba253b25227da118d01b9f8dbe',
  'map-outcomes-likelihoods-and-preferences':
    '651e267160e0730c9272de21e1bc03eeca2bd0dc76625c0e296977af9a243149',
  'look-for-the-decisive-unknown':
    '41af39e7e26c5bbcafc6d124357d2da8acc26f426cdeda77f3d0df4e742e55d5',
};
let corpus: CompiledCorpus;

beforeAll(async () => {
  corpus = await loadAndCompileCorpus(
    {
      manifestPath: fileURLToPath(new URL('patternverse.yaml', root)),
      contentDirectory: fileURLToPath(new URL('content', root)),
      readonly: true,
    },
    { includeDrafts: false },
  );
});

describe('decision-making content package', () => {
  it('uses the existing verse and preserves all eight authored collection positions', () => {
    expect(corpus.diagnostics).toEqual([]);
    const verse = corpus.entities.find((entity) => entity.id === 'decision-making');
    expect(verse?.type).toBe('verse');
    const collection = corpus.entities.find((entity) => entity.id === 'decision-making-patterns');
    expect(collection?.type).toBe('collection');
    expect(collection?.collectionItems.map((ref) => ref.entityId)).toEqual(
      articles.map(([id]) => id),
    );
    expect(collection?.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'decision-making',
    });
    expect(verse?.verseMembers.map((ref) => ref.entityId)).toEqual(
      expect.arrayContaining(['decision-making-patterns', ...articles.map(([id]) => id)]),
    );
  });

  it.each(articles)(
    'preserves the supplied %s article and compiles its offline worksheet',
    (id, articleHash) => {
      const pattern = corpus.entities.find((entity) => entity.id === id);
      expect(pattern?.type).toBe('pattern');
      const originalArticle = pattern!.body.split('\n## Practice —')[0]!;
      // The AI Usage supplement is verified separately; keep the original article hash unchanged.
      const article =
        id === 'look-for-the-decisive-unknown'
          ? originalArticle.split('\n## Using this pattern with language models')[0]!.trim()
          : originalArticle.trim();
      expect(createHash('sha256').update(article).digest('hex')).toBe(articleHash);
      const practiceSection = pattern!.body
        .split('\n## Practice —')[1]!
        .split('\n## Related patterns')[0]!;
      const suppliedPractice = practiceSection
        .slice(practiceSection.indexOf('\n\n') + 2)
        .split('\n> **Keeping the journal:**')[0]!
        .trim();
      expect(createHash('sha256').update(suppliedPractice).digest('hex')).toBe(practiceHashes[id]);
      expect(pattern?.verseMemberships).toContainEqual({
        sourceId: 'commons',
        entityId: 'decision-making',
      });
      expect(pattern?.collectionMemberships).toContainEqual({
        sourceId: 'commons',
        entityId: 'decision-making-patterns',
      });
      expect(pattern?.links.length).toBeGreaterThanOrEqual(2);
      expect(pattern?.practice).toBeUndefined();
      const source = pattern!.languagePracticeSource!;
      expect((source.match(/= !form \{/g) ?? []).length).toBeGreaterThanOrEqual(4);
      expect(parseLanguagePracticeFromBody(pattern!.body).articleBody).not.toContain(
        '```patternverse-language',
      );
      expect(source).not.toMatch(/!timer|!agent|~\s*\{/);
      expect(
        corpus.searchDocuments.find((document) => document.ref.entityId === id)?.collectionNames,
      ).toContain('Decision-Making Patterns');
    },
  );

  it('keeps richer recommendation metadata outside the strict public entity schema', async () => {
    const metadata = JSON.parse(
      await readFile(new URL('docs/pattern-packages/decision-making.json', root), 'utf8'),
    ) as {
      patterns: { id: string; related_patterns: string[]; example_user_queries: string[] }[];
    };
    expect(metadata.patterns.map((pattern) => pattern.id)).toEqual(articles.map(([id]) => id));
    for (const pattern of metadata.patterns) {
      expect(pattern.example_user_queries).toHaveLength(8);
      expect(new Set(pattern.example_user_queries).size).toBe(8);
      expect(pattern.related_patterns.every((id) => articles.some(([known]) => known === id))).toBe(
        true,
      );
    }
  });

  it('makes journaling persistence limits explicit and separates probability from preference', () => {
    const journal = corpus.entities.find((entity) => entity.id === 'keep-a-decision-journal')!;
    expect(journal.languagePracticeSource).toContain(
      'Copy your answers into a notebook or document before leaving',
    );
    expect(journal.languagePracticeSource).toContain(
      'does not create a calendar event or reminder',
    );
    const map = corpus.entities.find(
      (entity) => entity.id === 'map-outcomes-likelihoods-and-preferences',
    )!;
    const source = map.languagePracticeSource!;
    expect(source.indexOf(':title "Estimate likelihood independently"')).toBeLessThan(
      source.indexOf(':title "Rate preference separately"'),
    );
    expect(source.indexOf(':title "Rate preference separately"')).toBeLessThan(
      source.indexOf(':title "Inspect the map"'),
    );
  });
});
