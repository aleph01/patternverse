import { describe, expect, it } from 'vitest';

import {
  createCorpusSnapshot,
  planCorpusSync,
  resolveSyncConflicts,
  type CorpusFile,
} from '../src/index.js';

const encoder = new TextEncoder();
const path = 'patterns/focus.md';
const duplicatePath = 'patterns/focus-cloud.md';
const file = (version: string): CorpusFile => ({
  path,
  contentHash: `sha256:${version}`,
  content: encoder.encode(version),
});
const snapshot = (version?: string) =>
  createCorpusSnapshot({ revision: null, files: version ? [file(version)] : [] });

describe('resolveSyncConflicts', () => {
  it('turns keep-this-device into a conditional remote update', () => {
    const plan = planCorpusSync({
      base: snapshot('A'),
      local: snapshot('B'),
      remote: snapshot('C'),
    });

    const resolved = resolveSyncConflicts(plan, {
      [path]: { type: 'keep-local' },
    });

    expect(resolved.conflicts).toEqual([]);
    expect(resolved.push).toEqual([
      expect.objectContaining({
        type: 'update',
        path,
        previousHash: 'sha256:C',
        contentHash: 'sha256:B',
      }),
    ]);
  });

  it('turns keep-cloud-version into a conditional local update', () => {
    const plan = planCorpusSync({
      base: snapshot('A'),
      local: snapshot('B'),
      remote: snapshot('C'),
    });

    const resolved = resolveSyncConflicts(plan, {
      [path]: { type: 'keep-remote' },
    });

    expect(resolved.pull).toEqual([
      expect.objectContaining({
        type: 'update',
        path,
        previousHash: 'sha256:B',
        contentHash: 'sha256:C',
      }),
    ]);
  });

  it('keeps both modified files at an explicit duplicate path', () => {
    const plan = planCorpusSync({
      base: snapshot('A'),
      local: snapshot('B'),
      remote: snapshot('C'),
    });

    const resolved = resolveSyncConflicts(plan, {
      [path]: { type: 'keep-both', original: 'local', duplicatePath },
    });

    expect(resolved.conflicts).toEqual([]);
    expect(resolved.push).toEqual([
      expect.objectContaining({ type: 'create', path: duplicatePath, contentHash: 'sha256:C' }),
      expect.objectContaining({ type: 'update', path, contentHash: 'sha256:B' }),
    ]);
    expect(resolved.pull).toEqual([
      expect.objectContaining({ type: 'create', path: duplicatePath, contentHash: 'sha256:C' }),
    ]);
  });

  it('rejects keep-both for a deletion conflict', () => {
    const plan = planCorpusSync({ base: snapshot('A'), local: snapshot(), remote: snapshot('B') });

    expect(() =>
      resolveSyncConflicts(plan, {
        [path]: { type: 'keep-both', original: 'remote', duplicatePath },
      }),
    ).toThrow(/keep both/i);
  });

  it('keeps a remotely modified file after a local deletion by recreating it locally', () => {
    const plan = planCorpusSync({ base: snapshot('A'), local: snapshot(), remote: snapshot('B') });
    const resolved = resolveSyncConflicts(plan, { [path]: { type: 'keep-remote' } });

    expect(resolved.pull).toEqual([
      expect.objectContaining({ type: 'create', path, contentHash: 'sha256:B' }),
    ]);
    expect(resolved.push).toEqual([]);
  });

  it('keeps a local modification after a remote deletion by recreating it remotely', () => {
    const plan = planCorpusSync({ base: snapshot('A'), local: snapshot('B'), remote: snapshot() });
    const resolved = resolveSyncConflicts(plan, { [path]: { type: 'keep-local' } });

    expect(resolved.push).toEqual([
      expect.objectContaining({ type: 'create', path, contentHash: 'sha256:B' }),
    ]);
    expect(resolved.pull).toEqual([]);
  });

  it('rejects a keep-both path already represented by the plan', () => {
    const secondPath = 'patterns/existing.md';
    const plan = {
      ...planCorpusSync({ base: snapshot('A'), local: snapshot('B'), remote: snapshot('C') }),
      unchangedPaths: [secondPath],
    };

    expect(() =>
      resolveSyncConflicts(plan, {
        [path]: { type: 'keep-both', original: 'local', duplicatePath: secondPath },
      }),
    ).toThrow(/already present/i);
  });

  it('requires one decision for every conflict', () => {
    const plan = planCorpusSync({
      base: snapshot('A'),
      local: snapshot('B'),
      remote: snapshot('C'),
    });
    expect(() => resolveSyncConflicts(plan, {})).toThrow(/resolution/i);
  });
});
