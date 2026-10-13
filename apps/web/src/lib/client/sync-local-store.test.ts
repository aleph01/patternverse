import { webcrypto } from 'node:crypto';
import fc from 'fast-check';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '@patternverse/companion-core';
import { createIndexedDbWorkspace, type LocalWorkspace } from '@patternverse/workspace';
import {
  CorpusChangePreconditionError,
  createInMemoryRemoteCorpusStore,
  snapshotsHaveSameContent,
  synchronizeWorkspace,
} from '@patternverse/remote-store';
import { planCorpusSync } from '@patternverse/sync-domain';
import { createPrivateMiraStore } from '$lib/mira/private-store';
import { captureWorkspaceSyncSnapshot, type WorkspaceSyncSnapshot } from './sync-snapshot';
import { syncSnapshotToCorpus } from './sync-corpus';
import { createEncryptedSyncStateStore } from './sync-state';
import { createRecoverableWorkspaceCorpusStore } from './sync-local-store';
import { deriveSyncKey, syncBase64 } from './sync-envelope';

const DATE = '2026-10-09T10:00:00.000Z';
const salt = syncBase64(new Uint8Array(16).fill(27));
const workspaces: LocalWorkspace[] = [];
let key: CryptoKey;
const queues = new Map<string, Promise<unknown>>();
function exclusive<T>(name: string, work: () => Promise<T>): Promise<T> {
  const result = (queues.get(name) ?? Promise.resolve()).catch(() => undefined).then(work);
  queues.set(name, result);
  return result;
}

async function device() {
  const databaseName = `workspace-${crypto.randomUUID()}`;
  const miraName = `mira-${crypto.randomUUID()}`;
  const stateName = `state-${crypto.randomUUID()}`;
  const openWorkspace = () => {
    const workspace = createIndexedDbWorkspace({ indexedDB, IDBKeyRange, databaseName });
    workspaces.push(workspace);
    return workspace;
  };
  const workspace = openWorkspace();
  const mira = createPrivateMiraStore({ databaseName: miraName });
  const identity = await workspace.getWorkspace();
  const openState = () =>
    createEncryptedSyncStateStore({
      key,
      salt,
      databaseName: stateName,
      scope: { providerId: 'in-memory', accountId: 'account', workspaceId: identity.id },
    });
  await workspace.createEntity({ id: 'one', type: 'pattern', title: 'One', body: 'Original' });
  await workspace.setSavedEntry({ sourceId: 'commons', entityId: 'one' }, true);
  await workspace.setUsefulness({ sourceId: 'commons', entityId: 'one' }, 1);
  await workspace.savePracticeRun({
    id: 'run',
    title: 'Saved answer',
    patternRef: { sourceId: 'commons', entityId: 'one' },
    patternTitle: 'One',
    patternType: 'pattern',
    origin: 'patternverse',
    status: 'in-progress',
    revision: 0,
    verseIds: [],
    responses: [{ id: 'answer', prompt: 'Question', answer: 'Private response' }],
  });
  await workspace.createSituation('A situation');
  await mira.save(createSession('one', 'cbt', DATE));
  const stateStore = openState();
  const localStore = createRecoverableWorkspaceCorpusStore({
    workspace,
    mira,
    stateStore,
    exclusive,
  });
  const reopen = () =>
    createRecoverableWorkspaceCorpusStore({
      workspace: openWorkspace(),
      mira: createPrivateMiraStore({ databaseName: miraName }),
      stateStore: openState(),
      exclusive,
    });
  return { workspace, mira, stateStore, localStore, reopen, stateName };
}

function updated(snapshot: WorkspaceSyncSnapshot, label = 'Remote'): WorkspaceSyncSnapshot {
  return {
    version: 2,
    workspace: {
      ...snapshot.workspace,
      workspace: { ...snapshot.workspace.workspace, name: label },
      entities: snapshot.workspace.entities.map((row) => ({ ...row, title: label })),
      favorites: [],
      usefulness: snapshot.workspace.usefulness.map((row) => ({ ...row, usefulness: 2 as const })),
      practiceRuns: snapshot.workspace.practiceRuns.map((row) => ({
        ...row,
        responses: [{ id: 'answer', prompt: 'Question', answer: label }],
      })),
      situations: snapshot.workspace.situations.map((row) => ({ ...row, context: label })),
    },
    sessions: snapshot.sessions.map((row) => ({
      ...row,
      title: label,
      messages: [{ id: 'message', role: 'user', text: label, createdAt: DATE }],
    })),
  };
}
async function incoming(before: WorkspaceSyncSnapshot, after: WorkspaceSyncSnapshot) {
  const base = await syncSnapshotToCorpus(before);
  return planCorpusSync({ base, local: base, remote: await syncSnapshotToCorpus(after) }).pull;
}

beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('indexedDB', new IDBFactory());
  key = await deriveSyncKey('a long local sync test passphrase', salt);
  queues.clear();
});
afterEach(() => {
  for (const workspace of workspaces.splice(0)) workspace.close();
  vi.unstubAllGlobals();
});

describe('recoverable local sync with the real workspace and Mira databases', () => {
  it.each(['intent', 'workspace', 'mira', 'clear'] as const)(
    'recovers after an interruption at %s',
    async (stage) => {
      const d = await device();
      const before = await captureWorkspaceSyncSnapshot(d.workspace, d.mira),
        desired = updated(before);
      const interrupt = async (work: () => Promise<void>) => {
        await work();
        throw new Error('simulated interruption');
      };
      const local = createRecoverableWorkspaceCorpusStore({
        exclusive,
        workspace: {
          ...d.workspace,
          applySyncData:
            stage === 'workspace'
              ? (...args) => interrupt(() => d.workspace.applySyncData(...args))
              : d.workspace.applySyncData,
        },
        mira: {
          ...d.mira,
          applySyncSessions:
            stage === 'mira'
              ? (...args) => interrupt(() => d.mira.applySyncSessions(...args))
              : d.mira.applySyncSessions,
        },
        stateStore: {
          ...d.stateStore,
          writeApply:
            stage === 'intent'
              ? (value) => interrupt(() => d.stateStore.writeApply(value))
              : d.stateStore.writeApply,
          clearApply:
            stage === 'clear'
              ? async () => {
                  throw new Error('simulated interruption');
                }
              : d.stateStore.clearApply,
        },
      });
      await expect(local.applyChanges(await incoming(before, desired))).rejects.toThrow(
        'simulated interruption',
      );
      expect(await d.stateStore.readApply()).not.toBeNull();
      expect(
        snapshotsHaveSameContent(
          await d.reopen().readSnapshot(),
          await syncSnapshotToCorpus(desired),
        ),
      ).toBe(true);
      expect(await d.stateStore.readApply()).toBeNull();
      expect(
        snapshotsHaveSameContent(
          await d.reopen().readSnapshot(),
          await syncSnapshotToCorpus(desired),
        ),
      ).toBe(true);
      expect((await d.stateStore.readBase()).files).toHaveLength(0); // Not a successful remote sync yet.
    },
  );

  it('replans and converges through the shared orchestrator after a local partial failure', async () => {
    const d = await device();
    const before = await captureWorkspaceSyncSnapshot(d.workspace, d.mira),
      desired = updated(before);
    const base = await syncSnapshotToCorpus(before);
    await d.stateStore.writeBase(base);
    const remoteStore = createInMemoryRemoteCorpusStore({
      initialSnapshot: await syncSnapshotToCorpus(desired),
    });
    const connection = remoteStore.createConnection();
    const broken = createRecoverableWorkspaceCorpusStore({
      ...d,
      exclusive,
      mira: {
        ...d.mira,
        applySyncSessions: async () => {
          throw new Error('storage interrupted');
        },
      },
    });
    expect(
      await synchronizeWorkspace({
        localStore: broken,
        remoteStore,
        connection,
        stateStore: d.stateStore,
      }),
    ).toMatchObject({ type: 'local-error', recoveryAvailable: true });
    expect(await d.stateStore.readApply()).not.toBeNull();
    expect(snapshotsHaveSameContent(await d.stateStore.readBase(), base)).toBe(true);
    expect(
      await synchronizeWorkspace({
        localStore: d.reopen(),
        remoteStore,
        connection,
        stateStore: d.stateStore,
      }),
    ).toMatchObject({ type: 'synchronized', recovered: true });
    expect(await d.stateStore.readApply()).toBeNull();
    expect(await d.stateStore.readJournal()).toBeNull();
  });

  it('retains pending intent and newer target edits instead of overwriting them on recovery', async () => {
    const d = await device();
    const before = await captureWorkspaceSyncSnapshot(d.workspace, d.mira),
      desired = updated(before);
    const broken = createRecoverableWorkspaceCorpusStore({
      ...d,
      exclusive,
      mira: {
        ...d.mira,
        applySyncSessions: async () => {
          throw new Error('interrupted');
        },
      },
    });
    await expect(broken.applyChanges(await incoming(before, desired))).rejects.toThrow(
      'interrupted',
    );
    await d.workspace.updateEntity('one', (row) => ({ ...row, title: 'Later local work' }));
    await expect(d.reopen().readSnapshot()).rejects.toBeInstanceOf(CorpusChangePreconditionError);
    expect((await d.workspace.getEntity('one'))?.title).toBe('Later local work');
    expect((await d.mira.load('one'))?.title).toBe(before.sessions[0]!.title);
    expect(await d.stateStore.readApply()).not.toBeNull();
    const remoteStore = createInMemoryRemoteCorpusStore();
    expect(
      await synchronizeWorkspace({
        localStore: d.reopen(),
        remoteStore,
        connection: remoteStore.createConnection(),
        stateStore: d.stateStore,
      }),
    ).toMatchObject({ type: 'local-error', error: { type: 'local-changed' } });
  });

  it('preserves unrelated local work created between database stages', async () => {
    const d = await device();
    const before = await captureWorkspaceSyncSnapshot(d.workspace, d.mira),
      desired = updated(before);
    const broken = createRecoverableWorkspaceCorpusStore({
      ...d,
      exclusive,
      mira: {
        ...d.mira,
        applySyncSessions: async () => {
          throw new Error('interrupted');
        },
      },
    });
    await expect(broken.applyChanges(await incoming(before, desired))).rejects.toThrow();
    await d.workspace.createEntity({
      id: 'new-local',
      type: 'pattern',
      title: 'Keep this',
      body: 'New work',
    });
    await d.mira.save(createSession('new-local', 'cbt', DATE));
    await d.reopen().readSnapshot();
    expect((await d.workspace.getEntity('new-local'))?.title).toBe('Keep this');
    expect(await d.mira.load('new-local')).not.toBeNull();
    expect((await d.mira.load('one'))?.title).toBe('Remote');
  });

  it('does not mutate either database if intent cannot be persisted', async () => {
    const d = await device();
    const before = await captureWorkspaceSyncSnapshot(d.workspace, d.mira);
    const local = createRecoverableWorkspaceCorpusStore({
      ...d,
      exclusive,
      stateStore: {
        ...d.stateStore,
        writeApply: async () => {
          throw new Error('disk full');
        },
      },
    });
    await expect(local.applyChanges(await incoming(before, updated(before)))).rejects.toThrow(
      'disk full',
    );
    expect(await captureWorkspaceSyncSnapshot(d.workspace, d.mira)).toEqual(before);
    expect(await d.stateStore.readApply()).toBeNull();
  });

  it('serializes competing local sync commits and does not replace newer work', async () => {
    const d = await device();
    const before = await captureWorkspaceSyncSnapshot(d.workspace, d.mira);
    const first = updated(before, 'First'),
      second = updated(before, 'Second');
    const results = await Promise.allSettled([
      d.localStore.applyChanges(await incoming(before, first)),
      d.reopen().applyChanges(await incoming(before, second)),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await d.workspace.getEntity('one'))?.title).toBe('First');
    expect((await d.mira.load('one'))?.title).toBe('First');
  });

  it('encrypts pending snapshots and rejects another workspace identity', async () => {
    const d = await device();
    const expected = await captureWorkspaceSyncSnapshot(d.workspace, d.mira);
    const desired = updated(expected, 'PRIVATE APPLY RESPONSE');
    await d.stateStore.writeApply({ expected, desired });
    const database = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open(d.stateName);
      r.onsuccess = () => resolve(r.result);
    });
    const raw = await new Promise<unknown[]>((resolve) => {
      const r = database.transaction('checkpoints').objectStore('checkpoints').getAll();
      r.onsuccess = () => resolve(r.result);
    });
    database.close();
    expect(JSON.stringify(raw)).not.toContain('PRIVATE APPLY RESPONSE');
    await expect(
      d.stateStore.writeApply({
        expected,
        desired: {
          ...desired,
          workspace: {
            ...desired.workspace,
            workspace: { ...desired.workspace.workspace, id: 'foreign' },
          },
        },
      }),
    ).rejects.toThrow();
    expect(await d.stateStore.readApply()).toEqual({ expected, desired });
  });

  it('recovers across generated interruption points and private response texts (100 cases)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('intent', 'workspace', 'mira', 'clear'),
        fc.array(fc.constantFrom('a', ' ', '\n', 'é', '🌿', '中'), { maxLength: 30 }),
        async (stage, chars) => {
          const d = await device();
          const expected = await captureWorkspaceSyncSnapshot(d.workspace, d.mira),
            desired = updated(expected, `Reflection ${chars.join('')}`);
          await d.stateStore.writeApply({ expected, desired });
          if (stage !== 'intent')
            await d.workspace.applySyncData(expected.workspace, desired.workspace);
          if (stage === 'mira' || stage === 'clear')
            await d.mira.applySyncSessions(expected.sessions, desired.sessions);
          if (stage === 'clear') await d.stateStore.clearApply();
          expect(
            snapshotsHaveSameContent(
              await d.reopen().readSnapshot(),
              await syncSnapshotToCorpus(desired),
            ),
          ).toBe(true);
          expect(await d.stateStore.readApply()).toBeNull();
        },
      ),
      { numRuns: 100, seed: 20261012 },
    );
  }, 15000);
});
