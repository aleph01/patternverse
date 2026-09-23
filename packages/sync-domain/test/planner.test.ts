import { describe, expect, it } from 'vitest';

import {
  createCorpusSnapshot,
  planCorpusSync,
  type CorpusFile,
  type CorpusSnapshot,
  type SyncPlan,
} from '../src/index.js';

const encoder = new TextEncoder();

const file = (path: string, version: string): CorpusFile => ({
  path,
  contentHash: `sha256:${version}`,
  content: encoder.encode(version),
});

const snapshot = (
  entries: Readonly<Record<string, string>>,
  revision: string | null = null,
): CorpusSnapshot =>
  createCorpusSnapshot({
    revision,
    files: Object.entries(entries).map(([path, version]) => file(path, version)),
  });

const summarize = (plan: SyncPlan) => ({
  pull: plan.pull.map((change) => `${change.type}:${change.path}`),
  push: plan.push.map((change) => `${change.type}:${change.path}`),
  conflicts: plan.conflicts.map((conflict) => `${conflict.type}:${conflict.path}`),
  unchangedPaths: plan.unchangedPaths,
});

type PlannerCase = {
  readonly name: string;
  readonly base: Readonly<Record<string, string>>;
  readonly local: Readonly<Record<string, string>>;
  readonly remote: Readonly<Record<string, string>>;
  readonly expected: ReturnType<typeof summarize>;
};

const path = 'patterns/focus.md';

const cases: readonly PlannerCase[] = [
  {
    name: 'unchanged on both sides',
    base: { [path]: 'A' },
    local: { [path]: 'A' },
    remote: { [path]: 'A' },
    expected: { pull: [], push: [], conflicts: [], unchangedPaths: [path] },
  },
  {
    name: 'local update',
    base: { [path]: 'A' },
    local: { [path]: 'B' },
    remote: { [path]: 'A' },
    expected: { pull: [], push: [`update:${path}`], conflicts: [], unchangedPaths: [] },
  },
  {
    name: 'remote update',
    base: { [path]: 'A' },
    local: { [path]: 'A' },
    remote: { [path]: 'B' },
    expected: { pull: [`update:${path}`], push: [], conflicts: [], unchangedPaths: [] },
  },
  {
    name: 'identical update convergence',
    base: { [path]: 'A' },
    local: { [path]: 'B' },
    remote: { [path]: 'B' },
    expected: { pull: [], push: [], conflicts: [], unchangedPaths: [path] },
  },
  {
    name: 'different updates conflict',
    base: { [path]: 'A' },
    local: { [path]: 'B' },
    remote: { [path]: 'C' },
    expected: {
      pull: [],
      push: [],
      conflicts: [`both-modified:${path}`],
      unchangedPaths: [],
    },
  },
  {
    name: 'local creation',
    base: {},
    local: { [path]: 'A' },
    remote: {},
    expected: { pull: [], push: [`create:${path}`], conflicts: [], unchangedPaths: [] },
  },
  {
    name: 'remote creation',
    base: {},
    local: {},
    remote: { [path]: 'A' },
    expected: { pull: [`create:${path}`], push: [], conflicts: [], unchangedPaths: [] },
  },
  {
    name: 'identical creation convergence',
    base: {},
    local: { [path]: 'A' },
    remote: { [path]: 'A' },
    expected: { pull: [], push: [], conflicts: [], unchangedPaths: [path] },
  },
  {
    name: 'different creations conflict',
    base: {},
    local: { [path]: 'A' },
    remote: { [path]: 'B' },
    expected: {
      pull: [],
      push: [],
      conflicts: [`both-created-differently:${path}`],
      unchangedPaths: [],
    },
  },
  {
    name: 'local deletion',
    base: { [path]: 'A' },
    local: {},
    remote: { [path]: 'A' },
    expected: { pull: [], push: [`delete:${path}`], conflicts: [], unchangedPaths: [] },
  },
  {
    name: 'remote deletion',
    base: { [path]: 'A' },
    local: { [path]: 'A' },
    remote: {},
    expected: { pull: [`delete:${path}`], push: [], conflicts: [], unchangedPaths: [] },
  },
  {
    name: 'local deletion versus remote modification',
    base: { [path]: 'A' },
    local: {},
    remote: { [path]: 'B' },
    expected: {
      pull: [],
      push: [],
      conflicts: [`deleted-locally-modified-remotely:${path}`],
      unchangedPaths: [],
    },
  },
  {
    name: 'local modification versus remote deletion',
    base: { [path]: 'A' },
    local: { [path]: 'B' },
    remote: {},
    expected: {
      pull: [],
      push: [],
      conflicts: [`modified-locally-deleted-remotely:${path}`],
      unchangedPaths: [],
    },
  },
  {
    name: 'identical deletion convergence',
    base: { [path]: 'A' },
    local: {},
    remote: {},
    expected: { pull: [], push: [], conflicts: [], unchangedPaths: [path] },
  },
];

describe('planCorpusSync', () => {
  for (const testCase of cases) {
    it(testCase.name, () => {
      expect(
        summarize(
          planCorpusSync({
            base: snapshot(testCase.base, 'base'),
            local: snapshot(testCase.local, 'local'),
            remote: snapshot(testCase.remote, 'remote'),
          }),
        ),
      ).toEqual(testCase.expected);
    });
  }

  it('sorts every output group by canonical path', () => {
    const plan = planCorpusSync({
      base: snapshot({
        'verses/z.md': 'A',
        'patterns/b.md': 'A',
        'assets/a.webp': 'A',
      }),
      local: snapshot({
        'verses/z.md': 'B',
        'patterns/b.md': 'B',
        'assets/a.webp': 'A',
        'collections/c.md': 'A',
      }),
      remote: snapshot({
        'verses/z.md': 'C',
        'patterns/b.md': 'A',
        'assets/a.webp': 'B',
      }),
    });

    expect(plan.pull.map(({ path }) => path)).toEqual(['assets/a.webp']);
    expect(plan.push.map(({ path }) => path)).toEqual(['collections/c.md', 'patterns/b.md']);
    expect(plan.conflicts.map(({ path }) => path)).toEqual(['verses/z.md']);
  });

  it('does not mutate snapshots or their byte arrays', () => {
    const base = snapshot({ [path]: 'A' });
    const local = snapshot({ [path]: 'B' });
    const remote = snapshot({ [path]: 'A' });
    const before = {
      base: structuredClone(base),
      local: structuredClone(local),
      remote: structuredClone(remote),
    };

    planCorpusSync({ base, local, remote });

    expect({ base, local, remote }).toEqual(before);
  });

  it('uses content hashes rather than revision metadata or byte identity', () => {
    const sameHashDifferentBytes = (revision: string, bytes: string): CorpusSnapshot =>
      createCorpusSnapshot({
        revision,
        files: [
          {
            path,
            contentHash: 'sha256:trusted-shared-hash',
            content: encoder.encode(bytes),
          },
        ],
      });

    const plan = planCorpusSync({
      base: sameHashDifferentBytes('base-revision', 'base bytes'),
      local: sameHashDifferentBytes('local-revision', 'local bytes'),
      remote: sameHashDifferentBytes('remote-revision', 'remote bytes'),
    });

    expect(summarize(plan)).toEqual({
      pull: [],
      push: [],
      conflicts: [],
      unchangedPaths: [path],
    });
  });

  it.each([
    ['patternverse.yaml', 'manifest'],
    ['assets/diagram.webp', 'asset'],
    ['.patternverse/preferences.json', 'preferences'],
  ])('treats %s as an ordinary corpus file', (corpusPath, version) => {
    const plan = planCorpusSync({
      base: snapshot({ [corpusPath]: 'A' }),
      local: snapshot({ [corpusPath]: version }),
      remote: snapshot({ [corpusPath]: 'A' }),
    });

    expect(plan.push).toHaveLength(1);
    expect(plan.push[0]).toMatchObject({ type: 'update', path: corpusPath });
  });
});
