import { describe, expect, it } from 'vitest';

import {
  createInMemoryPersonalCorpusStore,
  createInMemoryRemoteCorpusStore,
  createInMemorySyncStateStore,
  synchronizeWorkspace,
  type InMemoryPersonalCorpusStore,
} from '../src/index.js';
import {
  createCorpusSnapshot,
  type CorpusChange,
  type CorpusSnapshot,
} from '@patternverse/sync-domain';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const snapshot = (
  entries: Readonly<Record<string, string>>,
  revision: string | null = null,
): CorpusSnapshot =>
  createCorpusSnapshot({
    revision,
    files: Object.entries(entries).map(([path, content]) => ({
      path,
      contentHash: `sha256:${content}`,
      content: encoder.encode(content),
    })),
  });

const entriesOf = (value: CorpusSnapshot): Readonly<Record<string, string>> =>
  Object.fromEntries(value.files.map((file) => [file.path, decoder.decode(file.content)]));

const replaceEntries = async (
  store: InMemoryPersonalCorpusStore,
  entries: Readonly<Record<string, string>>,
): Promise<void> => {
  await store.replaceSnapshot(snapshot(entries));
};

const createDevice = (entries: Readonly<Record<string, string>> = {}) => ({
  localStore: createInMemoryPersonalCorpusStore(snapshot(entries)),
  stateStore: createInMemorySyncStateStore(),
});

describe('synchronizeWorkspace', () => {
  it.each(['local', 'remote', 'base'] as const)(
    'binds conflict choices to the reviewed %s version before any writes',
    async (side) => {
      const base = snapshot({ 'patterns/focus.md': 'base' });
      const device = createDevice({ 'patterns/focus.md': 'local' });
      await device.stateStore.writeBase(base);
      const remoteStore = createInMemoryRemoteCorpusStore({
        initialSnapshot: snapshot({ 'patterns/focus.md': 'remote' }),
      });
      const connection = remoteStore.createConnection();
      const reviewed = await synchronizeWorkspace({ ...device, remoteStore, connection });
      if (reviewed.type !== 'conflict') throw new Error('Expected review');
      if (side === 'local')
        await replaceEntries(device.localStore, { 'patterns/focus.md': 'newer local' });
      if (side === 'base')
        await device.stateStore.writeBase(snapshot({ 'patterns/focus.md': 'newer base' }));
      if (side === 'remote') {
        const current = remoteStore.inspectSnapshot();
        await remoteStore.applyChanges(connection, {
          expectedRevision: current.revision,
          changes: [
            {
              type: 'update',
              path: 'patterns/focus.md',
              previousHash: 'sha256:remote',
              contentHash: 'sha256:newer remote',
              content: encoder.encode('newer remote'),
            },
          ],
        });
      }
      const localBefore = await device.localStore.readSnapshot(),
        remoteBefore = remoteStore.inspectSnapshot();
      const result = await synchronizeWorkspace({
        ...device,
        remoteStore,
        connection,
        reviewedConflictToken: reviewed.reviewToken,
        conflictResolutions: { 'patterns/focus.md': { type: 'keep-remote' } },
      });
      expect(result).toMatchObject({ type: 'review-outdated' });
      expect(await device.localStore.readSnapshot()).toEqual(localBefore);
      expect(remoteStore.inspectSnapshot()).toEqual(remoteBefore);
      expect(await device.stateStore.readJournal()).toBeNull();
    },
  );
  it('requires review again even if changed data no longer produces conflicts', async () => {
    const device = createDevice({ 'patterns/focus.md': 'local' });
    const remoteStore = createInMemoryRemoteCorpusStore({
      initialSnapshot: snapshot({ 'patterns/focus.md': 'remote' }),
    });
    const connection = remoteStore.createConnection();
    const reviewed = await synchronizeWorkspace({ ...device, remoteStore, connection });
    if (reviewed.type !== 'conflict') throw new Error('Expected review');
    await replaceEntries(device.localStore, { 'patterns/focus.md': 'remote' });
    expect(
      await synchronizeWorkspace({
        ...device,
        remoteStore,
        connection,
        reviewedConflictToken: reviewed.reviewToken,
        conflictResolutions: { 'patterns/focus.md': { type: 'keep-local' } },
      }),
    ).toMatchObject({ type: 'review-outdated', plan: { conflicts: [] } });
    expect((await device.stateStore.readBase()).files).toHaveLength(0);
  });
  it('requires a fresh choice when a revision retry reveals new conflicting content', async () => {
    const base = snapshot({ 'patterns/focus.md': 'base' });
    const localStore = createInMemoryPersonalCorpusStore(
      snapshot({ 'patterns/focus.md': 'local' }),
    );
    const stateStore = createInMemorySyncStateStore(base);
    const remoteStore = createInMemoryRemoteCorpusStore({
      initialSnapshot: snapshot({ 'patterns/focus.md': 'remote' }),
    });
    const connection = remoteStore.createConnection();
    remoteStore.simulateConcurrentChangesOnNextApply([
      {
        type: 'update',
        path: 'patterns/focus.md',
        previousHash: 'sha256:remote',
        contentHash: 'sha256:new-remote',
        content: encoder.encode('new-remote'),
      },
    ]);
    const result = await synchronizeWorkspace({
      localStore,
      stateStore,
      remoteStore,
      connection,
      conflictResolutions: { 'patterns/focus.md': { type: 'keep-local' } },
    });
    expect(result).toMatchObject({ type: 'conflict' });
    expect(entriesOf(remoteStore.inspectSnapshot())).toEqual({ 'patterns/focus.md': 'new-remote' });
    expect(entriesOf(await localStore.readSnapshot())).toEqual({ 'patterns/focus.md': 'local' });
    expect(entriesOf(await stateStore.readBase())).toEqual({ 'patterns/focus.md': 'base' });
  });
  it('synchronizes a new entity from one simulated device to a second', async () => {
    const remoteStore = createInMemoryRemoteCorpusStore();
    const connectionA = remoteStore.createConnection('device-a');
    const connectionB = remoteStore.createConnection('device-b');
    const deviceA = createDevice({ 'patterns/focus.md': 'A' });
    const deviceB = createDevice();

    await expect(
      synchronizeWorkspace({ ...deviceA, remoteStore, connection: connectionA }),
    ).resolves.toMatchObject({ type: 'synchronized', recovered: false });
    await expect(
      synchronizeWorkspace({ ...deviceB, remoteStore, connection: connectionB }),
    ).resolves.toMatchObject({ type: 'synchronized', recovered: false });

    expect(entriesOf(await deviceB.localStore.readSnapshot())).toEqual({
      'patterns/focus.md': 'A',
    });
    expect(entriesOf(await deviceB.stateStore.readBase())).toEqual({
      'patterns/focus.md': 'A',
    });
  });

  it('detects concurrent edits and keeps both after an explicit resolution', async () => {
    const remoteStore = createInMemoryRemoteCorpusStore();
    const connectionA = remoteStore.createConnection('device-a');
    const connectionB = remoteStore.createConnection('device-b');
    const deviceA = createDevice({ 'patterns/focus.md': 'A' });
    const deviceB = createDevice();

    await synchronizeWorkspace({ ...deviceA, remoteStore, connection: connectionA });
    await synchronizeWorkspace({ ...deviceB, remoteStore, connection: connectionB });
    await replaceEntries(deviceA.localStore, { 'patterns/focus.md': 'B' });
    await replaceEntries(deviceB.localStore, { 'patterns/focus.md': 'C' });
    await synchronizeWorkspace({ ...deviceA, remoteStore, connection: connectionA });

    const conflict = await synchronizeWorkspace({
      ...deviceB,
      remoteStore,
      connection: connectionB,
    });
    expect(conflict).toMatchObject({
      type: 'conflict',
      plan: { conflicts: [{ type: 'both-modified', path: 'patterns/focus.md' }] },
    });

    const resolved = await synchronizeWorkspace({
      ...deviceB,
      remoteStore,
      connection: connectionB,
      conflictResolutions: {
        'patterns/focus.md': {
          type: 'keep-both',
          original: 'local',
          duplicatePath: 'patterns/focus-cloud.md',
        },
      },
    });
    expect(resolved).toMatchObject({ type: 'synchronized' });
    expect(entriesOf(await deviceB.localStore.readSnapshot())).toEqual({
      'patterns/focus-cloud.md': 'B',
      'patterns/focus.md': 'C',
    });

    await synchronizeWorkspace({ ...deviceA, remoteStore, connection: connectionA });
    expect(entriesOf(await deviceA.localStore.readSnapshot())).toEqual({
      'patterns/focus-cloud.md': 'B',
      'patterns/focus.md': 'C',
    });
  });

  it('propagates an ordinary deletion to another device', async () => {
    const remoteStore = createInMemoryRemoteCorpusStore();
    const connectionA = remoteStore.createConnection('device-a');
    const connectionB = remoteStore.createConnection('device-b');
    const deviceA = createDevice({ 'patterns/focus.md': 'A' });
    const deviceB = createDevice();

    await synchronizeWorkspace({ ...deviceA, remoteStore, connection: connectionA });
    await synchronizeWorkspace({ ...deviceB, remoteStore, connection: connectionB });
    await replaceEntries(deviceA.localStore, {});
    await synchronizeWorkspace({ ...deviceA, remoteStore, connection: connectionA });
    await synchronizeWorkspace({ ...deviceB, remoteStore, connection: connectionB });

    expect(entriesOf(await deviceB.localStore.readSnapshot())).toEqual({});
  });

  it('detects a local modification versus a remote deletion', async () => {
    const remoteStore = createInMemoryRemoteCorpusStore();
    const connectionA = remoteStore.createConnection('device-a');
    const connectionB = remoteStore.createConnection('device-b');
    const deviceA = createDevice({ 'patterns/focus.md': 'A' });
    const deviceB = createDevice();

    await synchronizeWorkspace({ ...deviceA, remoteStore, connection: connectionA });
    await synchronizeWorkspace({ ...deviceB, remoteStore, connection: connectionB });
    await replaceEntries(deviceA.localStore, {});
    await replaceEntries(deviceB.localStore, { 'patterns/focus.md': 'B' });
    await synchronizeWorkspace({ ...deviceA, remoteStore, connection: connectionA });

    await expect(
      synchronizeWorkspace({ ...deviceB, remoteStore, connection: connectionB }),
    ).resolves.toMatchObject({
      type: 'conflict',
      plan: { conflicts: [{ type: 'modified-locally-deleted-remotely' }] },
    });
  });

  it('preserves an offline edit after a network failure and syncs it later', async () => {
    const remoteStore = createInMemoryRemoteCorpusStore();
    const connection = remoteStore.createConnection();
    const device = createDevice({ 'patterns/offline.md': 'saved-locally' });
    remoteStore.injectFailure({ operation: 'read', error: { type: 'network-error' } });

    await expect(
      synchronizeWorkspace({ ...device, remoteStore, connection }),
    ).resolves.toMatchObject({ type: 'remote-error', error: { type: 'network-error' } });
    expect(entriesOf(await device.localStore.readSnapshot())).toEqual({
      'patterns/offline.md': 'saved-locally',
    });

    await expect(
      synchronizeWorkspace({ ...device, remoteStore, connection }),
    ).resolves.toMatchObject({ type: 'synchronized' });
  });

  it('replans automatically after a stale remote revision', async () => {
    const remoteStore = createInMemoryRemoteCorpusStore();
    const connection = remoteStore.createConnection();
    const device = createDevice({ 'patterns/local.md': 'L' });
    const concurrentChanges: readonly CorpusChange[] = [
      {
        type: 'create',
        path: 'patterns/remote.md',
        contentHash: 'sha256:R',
        content: encoder.encode('R'),
      },
    ];
    remoteStore.simulateConcurrentChangesOnNextApply(concurrentChanges);

    await expect(
      synchronizeWorkspace({ ...device, remoteStore, connection }),
    ).resolves.toMatchObject({ type: 'synchronized' });
    expect(entriesOf(await device.localStore.readSnapshot())).toEqual({
      'patterns/local.md': 'L',
      'patterns/remote.md': 'R',
    });
  });

  it('retains a journal after an interrupted partial write and recovers on retry', async () => {
    const remoteStore = createInMemoryRemoteCorpusStore();
    const connection = remoteStore.createConnection();
    const device = createDevice({
      'patterns/a.md': 'A',
      'patterns/b.md': 'B',
    });
    remoteStore.injectFailure({
      operation: 'apply',
      afterChanges: 1,
      error: { type: 'temporarily-unavailable' },
    });

    await expect(
      synchronizeWorkspace({ ...device, remoteStore, connection }),
    ).resolves.toMatchObject({
      type: 'remote-error',
      error: { type: 'temporarily-unavailable' },
      recoveryAvailable: true,
    });
    await expect(device.stateStore.readJournal()).resolves.toMatchObject({
      phase: 'local-applied',
    });

    await expect(
      synchronizeWorkspace({ ...device, remoteStore, connection }),
    ).resolves.toMatchObject({ type: 'synchronized', recovered: true });
    await expect(device.stateStore.readJournal()).resolves.toBeNull();
    expect(entriesOf(remoteStore.inspectSnapshot())).toEqual({
      'patterns/a.md': 'A',
      'patterns/b.md': 'B',
    });
  });

  it('reports disconnection without changing pending local work', async () => {
    const remoteStore = createInMemoryRemoteCorpusStore();
    const connection = remoteStore.createConnection();
    const device = createDevice({ 'patterns/local.md': 'pending' });
    remoteStore.expireConnection(connection);

    await expect(
      synchronizeWorkspace({ ...device, remoteStore, connection }),
    ).resolves.toMatchObject({
      type: 'remote-error',
      error: { type: 'authorization-expired' },
    });
    expect(entriesOf(await device.localStore.readSnapshot())).toEqual({
      'patterns/local.md': 'pending',
    });
  });

  it('surfaces an invalid remote corpus without applying it locally', async () => {
    const remoteStore = createInMemoryRemoteCorpusStore();
    const connection = remoteStore.createConnection();
    const device = createDevice({ 'patterns/local.md': 'safe' });
    remoteStore.injectFailure({
      operation: 'read',
      error: { type: 'invalid-remote-corpus', details: 'broken manifest' },
    });

    await expect(
      synchronizeWorkspace({ ...device, remoteStore, connection }),
    ).resolves.toMatchObject({
      type: 'remote-error',
      error: { type: 'invalid-remote-corpus' },
    });
    expect(entriesOf(await device.localStore.readSnapshot())).toEqual({
      'patterns/local.md': 'safe',
    });
  });
});
