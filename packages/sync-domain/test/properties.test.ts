import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  createCorpusSnapshot,
  planCorpusSync,
  type CorpusChange,
  type CorpusFile,
  type CorpusSnapshot,
} from '../src/index.js';

const encoder = new TextEncoder();
const paths = [
  'patternverse.yaml',
  'patterns/focus.md',
  'concepts/attention.md',
  'assets/diagram.bin',
  '.patternverse/preferences.json',
] as const;
const versions = ['A', 'B', 'C'] as const;

const entriesArbitrary = fc.dictionary(fc.constantFrom(...paths), fc.constantFrom(...versions));

const file = (path: string, version: string): CorpusFile => ({
  path,
  contentHash: `sha256:${version}`,
  content: encoder.encode(version),
});

const snapshot = (entries: Readonly<Record<string, string>>): CorpusSnapshot =>
  createCorpusSnapshot({
    revision: null,
    files: Object.entries(entries).map(([path, version]) => file(path, version)),
  });

const apply = (target: CorpusSnapshot, changes: readonly CorpusChange[]): CorpusSnapshot => {
  const files = new Map(target.files.map((entry) => [entry.path, entry]));
  for (const change of changes) {
    if (change.type === 'delete') {
      files.delete(change.path);
    } else {
      files.set(change.path, {
        path: change.path,
        contentHash: change.contentHash,
        content: new Uint8Array(change.content),
      });
    }
  }
  return createCorpusSnapshot({ revision: null, files: [...files.values()] });
};

const fileState = (value: CorpusSnapshot) =>
  value.files.map(({ path, contentHash, content }) => ({
    path,
    contentHash,
    content: [...content],
  }));

describe('sync planner properties', () => {
  it('never conflicts or transfers when local and remote are identical', () => {
    fc.assert(
      fc.property(entriesArbitrary, entriesArbitrary, (baseEntries, sharedEntries) => {
        const plan = planCorpusSync({
          base: snapshot(baseEntries),
          local: snapshot(sharedEntries),
          remote: snapshot(sharedEntries),
        });
        expect(plan.pull).toEqual([]);
        expect(plan.push).toEqual([]);
        expect(plan.conflicts).toEqual([]);
      }),
    );
  });

  it('is deterministic and leaves every input byte unchanged', () => {
    fc.assert(
      fc.property(
        entriesArbitrary,
        entriesArbitrary,
        entriesArbitrary,
        (baseEntries, localEntries, remoteEntries) => {
          const input = {
            base: snapshot(baseEntries),
            local: snapshot(localEntries),
            remote: snapshot(remoteEntries),
          };
          const before = structuredClone(input);
          const first = planCorpusSync(input);
          const second = planCorpusSync(input);
          expect(second).toEqual(first);
          expect(input).toEqual(before);
        },
      ),
    );
  });

  it('converges after applying every non-conflicting plan', () => {
    fc.assert(
      fc.property(
        entriesArbitrary,
        entriesArbitrary,
        entriesArbitrary,
        (baseEntries, localEntries, remoteEntries) => {
          const base = snapshot(baseEntries);
          const local = snapshot(localEntries);
          const remote = snapshot(remoteEntries);
          const plan = planCorpusSync({ base, local, remote });
          fc.pre(plan.conflicts.length === 0);

          const nextLocal = apply(local, plan.pull);
          const nextRemote = apply(remote, plan.push);
          expect(fileState(nextLocal)).toEqual(fileState(nextRemote));

          const rerun = planCorpusSync({ base, local: nextLocal, remote: nextRemote });
          expect(rerun.pull).toEqual([]);
          expect(rerun.push).toEqual([]);
          expect(rerun.conflicts).toEqual([]);
        },
      ),
    );
  });
});
