import {
  createCorpusSnapshot,
  type CorpusChange,
  type CorpusFile,
} from '@patternverse/sync-domain';
import { describe, expect, it } from 'vitest';

import type {
  RemoteConnection,
  RemoteCorpusError,
  RemoteCorpusStore,
  RemoteSnapshotResult,
} from '../index.js';

export type RemoteStoreContractInjectedFailure = {
  readonly operation: 'read' | 'apply' | 'disconnect';
  readonly error: RemoteCorpusError;
  readonly afterChanges?: number;
};

export type RemoteStoreContractTestContext = {
  readonly store: RemoteCorpusStore;
  readonly connection: RemoteConnection;
  readonly expireConnection: () => void;
  readonly injectFailure: (failure: RemoteStoreContractInjectedFailure) => void;
};

export type RemoteStoreContractTestOptions = {
  readonly name: string;
  readonly createContext: () => RemoteStoreContractTestContext;
};

const encoder = new TextEncoder();
const file = (path: string, version: string): CorpusFile => ({
  path,
  contentHash: `sha256:${version}`,
  content: encoder.encode(version),
});

const successfulSnapshot = (result: RemoteSnapshotResult) => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected snapshot, received ${result.error.type}.`);
  return result.snapshot;
};

const createChange = (path: string, version: string): CorpusChange => ({
  type: 'create',
  path,
  contentHash: `sha256:${version}`,
  content: encoder.encode(version),
});

export const runRemoteCorpusStoreContractTests = (
  options: RemoteStoreContractTestOptions,
): void => {
  describe(`${options.name} remote-store contract`, () => {
    it('reads a complete empty snapshot', async () => {
      const { store, connection } = options.createContext();
      const snapshot = successfulSnapshot(await store.readSnapshot(connection));
      expect(snapshot.files).toEqual([]);
      expect(snapshot.revision).not.toBeNull();
    });

    it('creates nested files, preserves binary bytes, and advances the revision', async () => {
      const { store, connection } = options.createContext();
      const before = successfulSnapshot(await store.readSnapshot(connection));
      const binary = new Uint8Array([0, 255, 12, 4]);
      const result = await store.applyChanges(connection, {
        expectedRevision: before.revision,
        changes: [
          createChange('patterns/focus.md', 'A'),
          {
            type: 'create',
            path: 'assets/nested/diagram.bin',
            contentHash: 'sha256:binary',
            content: binary,
          },
        ],
      });
      expect(result.ok).toBe(true);
      const after = successfulSnapshot(await store.readSnapshot(connection));
      expect(after.revision).not.toBe(before.revision);
      expect(after.files.map(({ path }) => path)).toEqual([
        'assets/nested/diagram.bin',
        'patterns/focus.md',
      ]);
      expect(after.files[0]?.content).toEqual(binary);
    });

    it('updates a file only at the expected revision and hash', async () => {
      const { store, connection } = options.createContext();
      const empty = successfulSnapshot(await store.readSnapshot(connection));
      const created = await store.applyChanges(connection, {
        expectedRevision: empty.revision,
        changes: [createChange('patterns/focus.md', 'A')],
      });
      if (!created.ok) throw new Error('Fixture creation failed.');

      const updated = await store.applyChanges(connection, {
        expectedRevision: created.revision,
        changes: [
          {
            type: 'update',
            path: 'patterns/focus.md',
            previousHash: 'sha256:A',
            contentHash: 'sha256:B',
            content: encoder.encode('B'),
          },
        ],
      });
      expect(updated.ok).toBe(true);

      const stale = await store.applyChanges(connection, {
        expectedRevision: created.revision,
        changes: [createChange('patterns/stale.md', 'S')],
      });
      expect(stale).toEqual({ ok: false, error: { type: 'revision-conflict' } });
    });

    it('deletes a file with a matching precondition', async () => {
      const { store, connection } = options.createContext();
      const empty = successfulSnapshot(await store.readSnapshot(connection));
      const created = await store.applyChanges(connection, {
        expectedRevision: empty.revision,
        changes: [createChange('patterns/focus.md', 'A')],
      });
      if (!created.ok) throw new Error('Fixture creation failed.');

      await expect(
        store.applyChanges(connection, {
          expectedRevision: created.revision,
          changes: [{ type: 'delete', path: 'patterns/focus.md', previousHash: 'sha256:A' }],
        }),
      ).resolves.toMatchObject({ ok: true });
      expect(successfulSnapshot(await store.readSnapshot(connection)).files).toEqual([]);
    });

    it('normalizes authorization expiry, permission denial, and rate limiting', async () => {
      const expired = options.createContext();
      expired.expireConnection();
      await expect(expired.store.readSnapshot(expired.connection)).resolves.toEqual({
        ok: false,
        error: { type: 'authorization-expired' },
      });

      const denied = options.createContext();
      denied.injectFailure({ operation: 'read', error: { type: 'permission-denied' } });
      await expect(denied.store.readSnapshot(denied.connection)).resolves.toEqual({
        ok: false,
        error: { type: 'permission-denied' },
      });

      const limited = options.createContext();
      limited.injectFailure({
        operation: 'read',
        error: { type: 'rate-limited', retryAfterMs: 2500 },
      });
      await expect(limited.store.readSnapshot(limited.connection)).resolves.toEqual({
        ok: false,
        error: { type: 'rate-limited', retryAfterMs: 2500 },
      });
    });

    it('invalidates a disconnected connection', async () => {
      const { store, connection } = options.createContext();
      await expect(store.disconnect(connection)).resolves.toEqual({ ok: true });
      await expect(store.readSnapshot(connection)).resolves.toEqual({
        ok: false,
        error: { type: 'not-authenticated' },
      });
    });

    it('exposes a partial write as failure while retaining completed changes', async () => {
      const { store, connection, injectFailure } = options.createContext();
      const before = successfulSnapshot(await store.readSnapshot(connection));
      injectFailure({
        operation: 'apply',
        afterChanges: 1,
        error: { type: 'temporarily-unavailable' },
      });

      await expect(
        store.applyChanges(connection, {
          expectedRevision: before.revision,
          changes: [createChange('patterns/a.md', 'A'), createChange('patterns/b.md', 'B')],
        }),
      ).resolves.toEqual({ ok: false, error: { type: 'temporarily-unavailable' } });

      const after = successfulSnapshot(await store.readSnapshot(connection));
      expect(after.revision).not.toBe(before.revision);
      expect(after.files).toEqual([file('patterns/a.md', 'A')]);
    });

    it('reports a bad per-file precondition as a revision conflict', async () => {
      const { store, connection } = options.createContext();
      const empty = successfulSnapshot(await store.readSnapshot(connection));
      await expect(
        store.applyChanges(connection, {
          expectedRevision: empty.revision,
          changes: [
            {
              type: 'update',
              path: 'missing.md',
              previousHash: 'sha256:A',
              contentHash: 'sha256:B',
              content: encoder.encode('B'),
            },
          ],
        }),
      ).resolves.toEqual({ ok: false, error: { type: 'revision-conflict' } });
    });

    it('returns snapshots isolated from caller mutation', async () => {
      const { store, connection } = options.createContext();
      const empty = successfulSnapshot(await store.readSnapshot(connection));
      await store.applyChanges(connection, {
        expectedRevision: empty.revision,
        changes: [createChange('patterns/focus.md', 'A')],
      });
      const first = successfulSnapshot(await store.readSnapshot(connection));
      const mutable = first.files[0]?.content;
      if (mutable) mutable[0] = 90;

      const second = successfulSnapshot(await store.readSnapshot(connection));
      expect(new TextDecoder().decode(second.files[0]?.content)).toBe('A');
    });

    it('declares a complete provider-neutral capability set', () => {
      const { store } = options.createContext();
      expect(store.capabilities).toEqual({
        supportsAtomicBatchWrite: expect.any(Boolean),
        supportsChangeCursor: expect.any(Boolean),
        supportsVisibleFiles: expect.any(Boolean),
        supportsRevisionHistory: expect.any(Boolean),
        supportsFolderSelection: expect.any(Boolean),
      });
      expect(createCorpusSnapshot({ revision: null, files: [] }).files).toEqual([]);
    });
  });
};
