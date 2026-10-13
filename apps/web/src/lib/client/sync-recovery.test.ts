import { webcrypto } from 'node:crypto';
import fc from 'fast-check';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '@patternverse/companion-core';
import {
  CorpusChangePreconditionError,
  createInMemoryPersonalCorpusStore,
  createInMemoryRemoteCorpusStore,
  snapshotsHaveSameContent,
  synchronizeWorkspace,
  type SyncStateStore,
} from '@patternverse/remote-store';
import { createCorpusFile, planCorpusSync } from '@patternverse/sync-domain';
import {
  corpusToSyncSnapshot,
  createWorkspaceCorpusStore,
  syncSnapshotToCorpus,
} from './sync-corpus';
import { createEncryptedSyncStateStore } from './sync-state';
import { parseWorkspaceSyncSnapshot, type WorkspaceSyncSnapshot } from './sync-snapshot';
import { deriveSyncKey, syncBase64 } from './sync-envelope';

const DATE = '2026-10-09T10:00:00.000Z';
const salt = syncBase64(new Uint8Array(16).fill(43));
const scope = { providerId: 'in-memory', accountId: 'test-account', workspaceId: 'device-a' };
const encoder = new TextEncoder();
let key: CryptoKey;
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const mutable = <T>(value: T): Mutable<T> => structuredClone(value) as Mutable<T>;

function example(label = 'original', workspaceId = 'device-a'): Mutable<WorkspaceSyncSnapshot> {
  return parseWorkspaceSyncSnapshot({
    version: 2,
    workspace: {
      workspace: {
        id: workspaceId,
        name: 'My workspace',
        kind: 'personal',
        visibility: 'private',
        createdAt: DATE,
      },
      entities: [
        {
          id: 'pattern-1',
          sourceId: 'personal',
          type: 'pattern',
          title: label,
          body: label,
          status: 'draft',
        },
      ],
      favorites: [{ workspaceId, ref: { sourceId: 'commons', entityId: 'cbt' }, createdAt: DATE }],
      usefulness: [
        {
          workspaceId,
          ref: { sourceId: 'commons', entityId: 'cbt' },
          usefulness: 1,
          updatedAt: DATE,
        },
      ],
      practiceRuns: [
        {
          workspaceId,
          id: 'run-1',
          title: label,
          patternTitle: 'CBT',
          patternRef: { sourceId: 'commons', entityId: 'cbt' },
          patternType: 'pattern',
          origin: 'patternverse',
          status: 'in-progress',
          revision: 0,
          verseIds: [],
          checkpoint: 'saved checkpoint',
          responses: [{ id: 'answer-1', prompt: 'Question', answer: label }],
          createdAt: DATE,
          updatedAt: DATE,
        },
      ],
      situations: [
        {
          workspaceId,
          id: 'situation-1',
          title: label,
          context: label,
          position: 0,
          revision: 0,
          createdAt: DATE,
          updatedAt: DATE,
        },
      ],
    },
    sessions: [
      {
        ...createSession('session-1', 'cbt', DATE),
        title: label,
        messages: [{ id: 'message-1', role: 'user', text: label, createdAt: DATE }],
      },
    ],
  }) as Mutable<WorkspaceSyncSnapshot>;
}
const checkpoint = () => createEncryptedSyncStateStore({ scope, key, salt });
const asFile = (path: string, value: unknown) =>
  createCorpusFile(path, encoder.encode(JSON.stringify(value)));

beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('indexedDB', new IDBFactory());
  key = await deriveSyncKey('a sufficiently long test phrase', salt);
});
afterEach(() => vi.unstubAllGlobals());

describe('workspace records use the existing sync semantics', () => {
  it('round-trips every section and binds rows to the target device without identity conflicts', async () => {
    const original = example();
    const source = await syncSnapshotToCorpus(original);
    const target = example('original', 'device-b');
    const restored = await corpusToSyncSnapshot(source, target.workspace.workspace);
    expect(restored.workspace.workspace.id).toBe('device-b');
    for (const rows of [
      restored.workspace.favorites,
      restored.workspace.usefulness,
      restored.workspace.practiceRuns,
      restored.workspace.situations,
    ])
      expect(rows.every((row) => row.workspaceId === 'device-b')).toBe(true);
    expect(snapshotsHaveSameContent(source, await syncSnapshotToCorpus(target))).toBe(true);
    expect(snapshotsHaveSameContent(source, await syncSnapshotToCorpus(restored))).toBe(true);
    expect(original).toEqual(example());
  });

  it('round-trips Unicode, escaped IDs and long private text (100 generated examples)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ maxLength: 100 }), fc.nat(), async (text, n) => {
        const snapshot = example(`Reflection ${text}`);
        snapshot.workspace.practiceRuns[0]!.id = `run / % : 中 ${n}`;
        const corpus = await syncSnapshotToCorpus(snapshot);
        const restored = await corpusToSyncSnapshot(corpus, snapshot.workspace.workspace);
        expect(restored).toEqual(snapshot);
      }),
      { numRuns: 100, seed: 20261010 },
    );
  });

  it.each([
    'entities',
    'practiceRuns',
    'situations',
    'sessions',
    'usefulness',
    'favorites',
    'name',
  ] as const)(
    'detects two edits to the same %s record rather than a whole-workspace conflict',
    async (section) => {
      const base = example();
      const local = example();
      const remote = example();
      const change = (snapshot: Mutable<WorkspaceSyncSnapshot>, label: string) => {
        if (section === 'name') snapshot.workspace.workspace.name = label;
        else if (section === 'sessions') snapshot.sessions[0]!.title = label;
        else if (section === 'usefulness')
          snapshot.workspace.usefulness[0]!.usefulness = label === 'local' ? 0 : 2;
        else if (section === 'favorites')
          snapshot.workspace.favorites[0]!.createdAt =
            label === 'local' ? '2026-10-08T10:00:00.000Z' : '2026-10-07T10:00:00.000Z';
        else snapshot.workspace[section][0]!.title = label;
      };
      change(local, 'local');
      change(remote, 'remote');
      const plan = planCorpusSync({
        base: await syncSnapshotToCorpus(base),
        local: await syncSnapshotToCorpus(local),
        remote: await syncSnapshotToCorpus(remote),
      });
      expect(plan.conflicts).toHaveLength(1);
      expect(plan.conflicts[0]?.type).toBe('both-modified');
      expect(plan.pull).toHaveLength(0);
      expect(plan.push).toHaveLength(0);
    },
  );

  it('preserves v1 unknown fields from the base and still pushes new saves and removals', async () => {
    const old = example();
    const base = await syncSnapshotToCorpus(old);
    const local = example();
    local.workspace.favorites = [];
    local.workspace.situations = [
      ...local.workspace.situations,
      { ...local.workspace.situations[0]!, id: 'new-situation' },
    ];
    const remote = await syncSnapshotToCorpus(
      { version: 1, entities: old.workspace.entities, sessions: old.sessions },
      'legacy-rev',
      base,
    );
    const plan = planCorpusSync({ base, local: await syncSnapshotToCorpus(local), remote });
    expect(plan.pull).toHaveLength(0);
    expect(plan.conflicts).toHaveLength(0);
    expect(plan.push.map((c) => [c.type, c.path])).toEqual([
      ['delete', 'saved/commons/cbt.json'],
      ['create', 'situations/new-situation.json'],
    ]);
    const first = planCorpusSync({
      base: { revision: null, files: [] },
      local: await syncSnapshotToCorpus(local),
      remote: await syncSnapshotToCorpus({
        version: 1,
        entities: old.workspace.entities,
        sessions: old.sessions,
      }),
    });
    expect(first.pull).toHaveLength(0);
    expect(first.push.length).toBeGreaterThan(0);
  });

  it('rejects unknown records, ID/path mismatches, missing sections and content tampering', async () => {
    const snapshot = example();
    const corpus = await syncSnapshotToCorpus(snapshot);
    const entity = corpus.files.find((f) => f.path.startsWith('entities/'))!;
    for (const files of [
      [...corpus.files, await asFile('unknown/x.json', { title: 'bad' })],
      corpus.files.map((f) => (f === entity ? { ...f, path: 'entities/other.json' } : f)),
      corpus.files.filter((f) => f.path !== 'workspace/name.json'),
      corpus.files.map((f) => (f === entity ? { ...f, content: encoder.encode('changed') } : f)),
    ])
      await expect(
        corpusToSyncSnapshot({ revision: null, files }, snapshot.workspace.workspace),
      ).rejects.toThrow();
  });

  it('validates a full candidate before committing and rejects stale local writes', async () => {
    let current = example();
    let committed = 0;
    const store = createWorkspaceCorpusStore({
      read: async () => structuredClone(current),
      commit: async (expected, candidate) => {
        current.sessions[0]!.title = 'new local edit';
        if (JSON.stringify(expected) !== JSON.stringify(current))
          throw new CorpusChangePreconditionError('Changed while syncing');
        current = mutable(candidate);
        committed++;
      },
    });
    const before = await store.readSnapshot();
    const remote = await syncSnapshotToCorpus(example('remote'));
    const plan = planCorpusSync({ base: before, local: before, remote });
    await expect(store.applyChanges(plan.pull)).rejects.toBeInstanceOf(
      CorpusChangePreconditionError,
    );
    expect(committed).toBe(0);
    expect(current.sessions[0]!.title).toBe('new local edit');
    await expect(
      store.applyChanges([{ type: 'create', ...(await asFile('unknown/bad.json', {})) }]),
    ).rejects.toThrow();
    expect(committed).toBe(0);
  });
});

describe('encrypted checkpoints survive restarting the orchestrator', () => {
  it.each(['planned', 'local-applied', 'remote-applied', 'verifying'] as const)(
    'recovers after interruption at %s without repeating unsafe stale operations',
    async (phase) => {
      const initial = await syncSnapshotToCorpus(example());
      const localStore = createInMemoryPersonalCorpusStore(initial);
      const remoteSnapshot = example();
      remoteSnapshot.workspace.entities = [];
      remoteSnapshot.sessions = [
        ...remoteSnapshot.sessions,
        mutable(createSession('remote-session', 'cbt', DATE)),
      ];
      const remoteStore = createInMemoryRemoteCorpusStore({
        initialSnapshot: await syncSnapshotToCorpus(remoteSnapshot),
      });
      const connection = remoteStore.createConnection();
      const persistent = checkpoint();
      const fail: SyncStateStore = {
        ...persistent,
        writeJournal: async (j) => {
          await persistent.writeJournal(j);
          if (j.phase === phase) throw new Error('simulated restart');
        },
      };
      await expect(
        synchronizeWorkspace({ localStore, remoteStore, connection, stateStore: fail }),
      ).rejects.toThrow('simulated restart');
      expect((await checkpoint().readJournal())?.phase).toBe(phase);
      expect((await checkpoint().readBase()).files).toHaveLength(0);
      const result = await synchronizeWorkspace({
        localStore,
        remoteStore,
        connection,
        stateStore: checkpoint(),
      });
      expect(result).toMatchObject({ type: 'synchronized', recovered: true });
      expect(await checkpoint().readJournal()).toBeNull();
      const restored = await corpusToSyncSnapshot(
        await localStore.readSnapshot(),
        example().workspace.workspace,
      );
      expect(restored.workspace.entities).toHaveLength(1);
      expect(restored.sessions).toHaveLength(2);
      expect(
        snapshotsHaveSameContent(await checkpoint().readBase(), remoteStore.inspectSnapshot()),
      ).toBe(true);
    },
  );

  it('retains the old base after a partial upload, then preserves a newer offline edit', async () => {
    const base = await syncSnapshotToCorpus(example());
    const local = example('local');
    const localStore = createInMemoryPersonalCorpusStore(await syncSnapshotToCorpus(local));
    const remoteStore = createInMemoryRemoteCorpusStore({ initialSnapshot: base });
    const connection = remoteStore.createConnection();
    await checkpoint().writeBase(base);
    remoteStore.injectFailure({
      operation: 'apply',
      afterChanges: 1,
      error: { type: 'network-error' },
    });
    expect(
      await synchronizeWorkspace({ localStore, remoteStore, connection, stateStore: checkpoint() }),
    ).toMatchObject({ type: 'remote-error', recoveryAvailable: true });
    expect(snapshotsHaveSameContent(await checkpoint().readBase(), base)).toBe(true);
    local.sessions[0]!.title = 'new offline edit';
    await localStore.replaceSnapshot(await syncSnapshotToCorpus(local));
    expect(
      await synchronizeWorkspace({ localStore, remoteStore, connection, stateStore: checkpoint() }),
    ).toMatchObject({ type: 'synchronized', recovered: true });
    expect(
      (await corpusToSyncSnapshot(remoteStore.inspectSnapshot(), local.workspace.workspace))
        .sessions[0]!.title,
    ).toBe('new offline edit');
  });

  it('leaves both sides unchanged if the checkpoint cannot be written before execution', async () => {
    const local = await syncSnapshotToCorpus(example('local'));
    const remote = await syncSnapshotToCorpus(example());
    const localStore = createInMemoryPersonalCorpusStore(local);
    const remoteStore = createInMemoryRemoteCorpusStore({ initialSnapshot: remote });
    const stateStore = checkpoint();
    await stateStore.writeBase(remote);
    await expect(
      synchronizeWorkspace({
        localStore,
        remoteStore,
        connection: remoteStore.createConnection(),
        stateStore: {
          ...stateStore,
          writeJournal: async () => {
            throw new Error('disk unavailable');
          },
        },
      }),
    ).rejects.toThrow('disk unavailable');
    expect(snapshotsHaveSameContent(await localStore.readSnapshot(), local)).toBe(true);
    expect(snapshotsHaveSameContent(remoteStore.inspectSnapshot(), remote)).toBe(true);
    expect(snapshotsHaveSameContent(await stateStore.readBase(), remote)).toBe(true);
  });

  it('reports a conflict instead of overwriting an uploaded record edited elsewhere during recovery', async () => {
    const base = await syncSnapshotToCorpus(example());
    const local = await syncSnapshotToCorpus(example('local'));
    const localStore = createInMemoryPersonalCorpusStore(local);
    const remoteStore = createInMemoryRemoteCorpusStore({ initialSnapshot: base });
    const connection = remoteStore.createConnection();
    await checkpoint().writeBase(base);
    remoteStore.injectFailure({
      operation: 'apply',
      afterChanges: 1,
      error: { type: 'network-error' },
    });
    await synchronizeWorkspace({ localStore, remoteStore, connection, stateStore: checkpoint() });
    const entity = remoteStore
      .inspectSnapshot()
      .files.find((f) => f.path === 'entities/pattern-1.json')!;
    remoteStore.simulateExternalChanges([
      {
        type: 'update',
        previousHash: entity.contentHash,
        ...(await asFile(entity.path, {
          ...example().workspace.entities[0]!,
          title: 'someone else edited this',
        })),
      },
    ]);
    expect(
      await synchronizeWorkspace({ localStore, remoteStore, connection, stateStore: checkpoint() }),
    ).toMatchObject({ type: 'conflict', recovered: true });
    expect(snapshotsHaveSameContent(await localStore.readSnapshot(), local)).toBe(true);
    expect(
      (await corpusToSyncSnapshot(remoteStore.inspectSnapshot(), example().workspace.workspace))
        .workspace.entities[0]!.title,
    ).toBe('someone else edited this');
    expect(await checkpoint().readJournal()).not.toBeNull();
    expect(snapshotsHaveSameContent(await checkpoint().readBase(), base)).toBe(true);
  });

  it('does not apply an old conflict choice to a new remote version during retry', async () => {
    const base = await syncSnapshotToCorpus(example());
    const local = example();
    local.workspace.entities[0]!.title = 'local';
    const remote = example();
    remote.workspace.entities[0]!.title = 'remote';
    const remoteCorpus = await syncSnapshotToCorpus(remote);
    const remoteStore = createInMemoryRemoteCorpusStore({ initialSnapshot: remoteCorpus });
    const connection = remoteStore.createConnection();
    const newer = example();
    newer.workspace.entities[0]!.title = 'new remote';
    const concurrent = planCorpusSync({
      base: remoteCorpus,
      local: remoteCorpus,
      remote: await syncSnapshotToCorpus(newer),
    });
    remoteStore.simulateConcurrentChangesOnNextApply(concurrent.pull);
    await checkpoint().writeBase(base);
    const result = await synchronizeWorkspace({
      localStore: createInMemoryPersonalCorpusStore(await syncSnapshotToCorpus(local)),
      remoteStore,
      connection,
      stateStore: checkpoint(),
      conflictResolutions: { 'entities/pattern-1.json': { type: 'keep-local' } },
    });
    expect(result).toMatchObject({ type: 'conflict' });
    expect(
      (await corpusToSyncSnapshot(remoteStore.inspectSnapshot(), local.workspace.workspace))
        .workspace.entities[0]!.title,
    ).toBe('new remote');
  });

  it('encrypts private content, isolates namespaces and rejects wrong keys or swapped ciphertext', async () => {
    const corpus = await syncSnapshotToCorpus(example('PRIVATE RESPONSE MARKER'));
    await checkpoint().writeBase(corpus);
    const database = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('patternverse-sync-recovery-v1');
      r.onsuccess = () => resolve(r.result);
    });
    const envelopes = await new Promise<unknown[]>((resolve) => {
      const r = database.transaction('checkpoints').objectStore('checkpoints').getAll();
      r.onsuccess = () => resolve(r.result);
    });
    expect(JSON.stringify(envelopes)).not.toContain('PRIVATE RESPONSE MARKER');
    expect(snapshotsHaveSameContent(await checkpoint().readBase(), corpus)).toBe(true);
    const otherScope = { ...scope, accountId: 'someone-else' };
    const other = createEncryptedSyncStateStore({ scope: otherScope, key, salt });
    expect((await other.readBase()).files).toHaveLength(0);
    const wrongKey = await deriveSyncKey('a completely different test phrase', salt);
    await expect(
      createEncryptedSyncStateStore({ scope, key: wrongKey, salt }).readBase(),
    ).rejects.toThrow();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction('checkpoints', 'readwrite');
      tx.objectStore('checkpoints').put(
        envelopes[0],
        `${JSON.stringify([otherScope.providerId, otherScope.accountId, otherScope.workspaceId])}:base`,
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    database.close();
    await expect(other.readBase()).rejects.toThrow('different account');
  });

  it('reads records larger than 60KB after reload', async () => {
    const snapshot = example();
    snapshot.workspace.entities[0]!.body = 'x'.repeat(70000);
    const corpus = await syncSnapshotToCorpus(snapshot);
    await checkpoint().writeBase(corpus);
    expect(snapshotsHaveSameContent(await checkpoint().readBase(), corpus)).toBe(true);
  });

  it('converges after different partial-write boundaries (100 generated examples)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.nat({ max: 6 }),
        fc.string({ maxLength: 50 }),
        async (afterChanges, text) => {
          const base = await syncSnapshotToCorpus(example());
          const desired = await syncSnapshotToCorpus(example(`New ${text}`));
          const localStore = createInMemoryPersonalCorpusStore(desired);
          const remoteStore = createInMemoryRemoteCorpusStore({ initialSnapshot: base });
          const connection = remoteStore.createConnection();
          const stateStore = createEncryptedSyncStateStore({
            scope,
            key,
            salt,
            databaseName: `case-${crypto.randomUUID()}`,
          });
          await stateStore.writeBase(base);
          remoteStore.injectFailure({
            operation: 'apply',
            afterChanges,
            error: { type: 'network-error' },
          });
          expect(
            await synchronizeWorkspace({ localStore, remoteStore, connection, stateStore }),
          ).toMatchObject({ type: 'remote-error', recoveryAvailable: true });
          expect(snapshotsHaveSameContent(await stateStore.readBase(), base)).toBe(true);
          expect(
            await synchronizeWorkspace({ localStore, remoteStore, connection, stateStore }),
          ).toMatchObject({ type: 'synchronized', recovered: true });
          expect(snapshotsHaveSameContent(remoteStore.inspectSnapshot(), desired)).toBe(true);
          expect(snapshotsHaveSameContent(await localStore.readSnapshot(), desired)).toBe(true);
          expect(await stateStore.readJournal()).toBeNull();
          await corpusToSyncSnapshot(remoteStore.inspectSnapshot(), example().workspace.workspace);
        },
      ),
      { numRuns: 100, seed: 20261011 },
    );
  }, 15000);
});
