import { webcrypto } from 'node:crypto';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import fc from 'fast-check';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createIndexedDbWorkspace, type LocalWorkspace } from '@patternverse/workspace';
import { createSession } from '@patternverse/companion-core';
import { createPrivateMiraStore } from '$lib/mira/private-store';
import { captureWorkspaceSyncSnapshot } from './sync-snapshot';
import { createEncryptedSyncStateStore } from './sync-state';
import { createRecoverableWorkspaceCorpusStore } from './sync-local-store';
import { createSyncRecoveryReview } from './sync-recovery-review';
import { deriveSyncKey, syncBase64 } from './sync-envelope';

const salt = syncBase64(new Uint8Array(16).fill(7));
let key: CryptoKey;
const workspaces: LocalWorkspace[] = [];
const queues = new Map<string, Promise<unknown>>();
function exclusive<T>(name: string, work: () => Promise<T>): Promise<T> {
  const next = (queues.get(name) ?? Promise.resolve()).catch(() => undefined).then(work);
  queues.set(name, next);
  return next;
}
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('indexedDB', new IDBFactory());
  key = await deriveSyncKey('a private recovery review phrase', salt);
  queues.clear();
});
afterEach(() => {
  for (const w of workspaces.splice(0)) w.close();
  vi.unstubAllGlobals();
});
async function fixture() {
  const workspace = createIndexedDbWorkspace({
    indexedDB,
    IDBKeyRange,
    databaseName: crypto.randomUUID(),
  });
  workspaces.push(workspace);
  const mira = createPrivateMiraStore({ databaseName: crypto.randomUUID() });
  const identity = await workspace.getWorkspace(),
    databaseName = crypto.randomUUID();
  const stateStore = createEncryptedSyncStateStore({
    key,
    salt,
    databaseName,
    scope: { providerId: 'test', accountId: 'account', workspaceId: identity.id },
  });
  await workspace.createEntity({ id: 'one', type: 'pattern', title: 'One', body: 'Original' });
  await mira.save(createSession('chat', 'cbt', '2026-10-09T10:00:00Z'));
  const expected = await captureWorkspaceSyncSnapshot(workspace, mira);
  const desired = {
    ...expected,
    workspace: {
      ...expected.workspace,
      entities: expected.workspace.entities.map((row) => ({ ...row, body: 'Incoming' })),
    },
    sessions: expected.sessions.map((row) => ({ ...row, title: 'Incoming chat' })),
  };
  await stateStore.writeApply({ expected, desired });
  const review = createSyncRecoveryReview({ workspace, mira, stateStore, exclusive });
  const local = createRecoverableWorkspaceCorpusStore({ workspace, mira, stateStore, exclusive });
  return { workspace, mira, stateStore, review, local, expected, desired, databaseName };
}
it('keeps newer local work, applies an explicitly selected pending record, and retains encrypted originals', async () => {
  const d = await fixture();
  await d.workspace.updateEntity('one', (row) => ({ ...row, body: 'Newer local work' }));
  await d.workspace.createEntity({
    id: 'unrelated',
    type: 'pattern',
    title: 'Keep unrelated',
    body: 'Private',
  });
  const reviewed = await d.review.inspect();
  expect(reviewed?.records).toHaveLength(2);
  const current = await captureWorkspaceSyncSnapshot(d.workspace, d.mira);
  expect(
    await d.review.resolve({
      token: reviewed!.token,
      confirmed: true,
      choices: { 'entities/one.json': 'local', 'sessions/chat.json': 'remote' },
    }),
  ).toEqual({ type: 'prepared' });
  // Resolution only prepares durable intent, never writes records outside the CAS adapter.
  expect((await d.mira.load('chat'))?.title).toBe('New session');
  await d.local.readSnapshot();
  expect((await d.workspace.getEntity('one'))?.body).toBe('Newer local work');
  expect(await d.workspace.getEntity('unrelated')).not.toBeNull();
  expect((await d.mira.load('chat'))?.title).toBe('Incoming chat');
  expect(await d.stateStore.readRecoveryCopy()).toEqual({
    expected: d.expected,
    desired: d.desired,
    current,
  });
  expect(await d.stateStore.readApply()).toBeNull();
  const db = await new Promise<IDBDatabase>((resolve) => {
    const r = indexedDB.open(d.databaseName);
    r.onsuccess = () => resolve(r.result);
  });
  const raw = await new Promise<unknown[]>((resolve) => {
    const r = db.transaction('checkpoints').objectStore('checkpoints').getAll();
    r.onsuccess = () => resolve(r.result);
  });
  db.close();
  expect(JSON.stringify(raw)).not.toContain('Incoming');
  expect(JSON.stringify(raw)).not.toContain('Original');
});
it('rejects incomplete/unconfirmed choices and leaves the existing intent untouched', async () => {
  const d = await fixture(),
    reviewed = await d.review.inspect();
  const invalid: { confirmed: boolean; choices: Record<string, 'local' | 'remote'> }[] = [
    { confirmed: false, choices: {} },
    { confirmed: true, choices: {} },
    { confirmed: true, choices: { 'other.json': 'local' as const } },
  ];
  for (const input of invalid)
    await expect(d.review.resolve({ ...input, token: reviewed!.token })).rejects.toThrow();
  expect(await d.stateStore.readApply()).toEqual({ expected: d.expected, desired: d.desired });
  expect(await d.stateStore.readRecoveryCopy()).toBeNull();
});
it.each(['workspace', 'pending', 'cache'] as const)(
  'rejects a stale review after %s changes without replacing intent',
  async (kind) => {
    const d = await fixture(),
      reviewed = await d.review.inspect();
    if (kind === 'workspace')
      await d.workspace.updateEntity('one', (row) => ({ ...row, body: 'Newer' }));
    if (kind === 'pending')
      await d.stateStore.writeApply({ expected: d.expected, desired: d.expected });
    if (kind === 'cache') await d.mira.saveRun('chat', { private: 'Active practice' }, null);
    const before = await d.stateStore.readApply();
    expect(
      await d.review.resolve({
        token: reviewed!.token,
        confirmed: true,
        choices: { 'entities/one.json': 'remote', 'sessions/chat.json': 'remote' },
      }),
    ).toEqual({ type: 'stale' });
    expect(await d.stateStore.readApply()).toEqual(before);
    expect(await d.stateStore.readRecoveryCopy()).toBeNull();
  },
);
it.each(['cache', 'reply'] as const)(
  'allows only keeping the local conversation with an active %s',
  async (kind) => {
    const d = await fixture();
    if (kind === 'cache') await d.mira.saveRun('chat', { private: 'Active practice' }, null);
    else await d.mira.save({ ...(await d.mira.load('chat'))!, pendingReplyId: 'reply' });
    const reviewed = await d.review.inspect();
    expect(
      reviewed?.records.find((row) => row.path === 'sessions/chat.json')?.protectedReason,
    ).toContain('Keep this device');
    await expect(
      d.review.resolve({
        token: reviewed!.token,
        confirmed: true,
        choices: { 'entities/one.json': 'remote', 'sessions/chat.json': 'remote' },
      }),
    ).rejects.toThrow('Keep this device');
    await d.review.resolve({
      token: reviewed!.token,
      confirmed: true,
      choices: { 'entities/one.json': 'remote', 'sessions/chat.json': 'local' },
    });
    await d.local.readSnapshot();
    expect((await d.mira.load('chat'))?.title).toBe('New session');
    if (kind === 'cache') expect(await d.mira.loadRun('chat')).not.toBeNull();
    else expect((await d.mira.load('chat'))?.pendingReplyId).toBe('reply');
  },
);
it('handles pending deletions explicitly and preserves unrelated work', async () => {
  const d = await fixture();
  await d.stateStore.writeApply({ expected: d.expected, desired: { ...d.expected, sessions: [] } });
  const reviewed = await d.review.inspect();
  expect(reviewed?.records[0]?.remote).toBeUndefined();
  await d.review.resolve({
    token: reviewed!.token,
    confirmed: true,
    choices: { 'sessions/chat.json': 'remote' },
  });
  await d.local.readSnapshot();
  expect(await d.mira.load('chat')).toBeNull();
  expect(await d.workspace.getEntity('one')).not.toBeNull();
});
it('CAS-rejects another pending writer and retains both the actual intent and prior recovery copy', async () => {
  const d = await fixture();
  const original = { expected: d.expected, desired: d.desired };
  await d.stateStore.replaceApplyForReview(original, { expected: d.expected, desired: d.expected });
  await expect(d.stateStore.replaceApplyForReview(original, original)).rejects.toThrow('changed');
  expect(await d.stateStore.readApply()).toEqual({ expected: d.expected, desired: d.expected });
  expect(await d.stateStore.readRecoveryCopy()).toEqual({ ...original, current: d.expected });
});
it('does not overwrite an edit made after confirmed intent was prepared', async () => {
  const d = await fixture(),
    reviewed = await d.review.inspect();
  await d.review.resolve({
    token: reviewed!.token,
    confirmed: true,
    choices: { 'entities/one.json': 'remote', 'sessions/chat.json': 'remote' },
  });
  await d.workspace.updateEntity('one', (row) => ({ ...row, body: 'Later work' }));
  await expect(d.local.readSnapshot()).rejects.toThrow();
  expect((await d.workspace.getEntity('one'))?.body).toBe('Later work');
  expect(await d.stateStore.readApply()).not.toBeNull();
  expect(await d.stateStore.readRecoveryCopy()).not.toBeNull();
});
it('applies generated choices/texts without losing newer or unrelated local work (50 cases)', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.boolean(),
      fc.array(fc.constantFrom('é', '中', '🌿', '\n', 'a'), { maxLength: 30 }),
      async (keepLocal, chars) => {
        const d = await fixture(),
          body = `Private ${chars.join('')}`;
        await d.workspace.updateEntity('one', (row) => ({ ...row, body }));
        const current = await captureWorkspaceSyncSnapshot(d.workspace, d.mira);
        const reviewed = await d.review.inspect();
        await d.review.resolve({
          token: reviewed!.token,
          confirmed: true,
          choices: {
            'entities/one.json': keepLocal ? 'local' : 'remote',
            'sessions/chat.json': 'local',
          },
        });
        await d.local.readSnapshot();
        expect((await d.workspace.getEntity('one'))?.body).toBe(keepLocal ? body : 'Incoming');
        expect((await d.mira.load('chat'))?.title).toBe('New session');
        expect(await d.stateStore.readRecoveryCopy()).toEqual({
          expected: d.expected,
          desired: d.desired,
          current,
        });
      },
    ),
    { seed: 20261015, numRuns: 50 },
  );
}, 15000);
