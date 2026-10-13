import { webcrypto } from 'node:crypto';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createIndexedDbWorkspace, type LocalWorkspace } from '@patternverse/workspace';
import { createSession } from '@patternverse/companion-core';
import { createPrivateMiraStore } from '$lib/mira/private-store';
import { deriveSyncKey, sealSyncDocument, syncBase64 } from './sync-envelope';
import { captureWorkspaceSyncSnapshot, openWorkspaceSyncSnapshot } from './sync-snapshot';
import { syncWorkspaceWithDropbox } from './dropbox-workspace-sync';
import { syncWithDropbox, loadKey } from './dropbox-sync';
import { DROPBOX_LEGACY_PATH, DROPBOX_WORKSPACE_PATH } from './dropbox-workspace-store';

const PHRASE = 'a private legacy upgrade sync phrase';
const salt = syncBase64(new Uint8Array(16).fill(44));
const connection = {
  accountId: 'upgrade-test',
  accessToken: 'not-a-live-token',
  expiresAt: '2099-01-01T00:00:00Z',
};
const workspaces: LocalWorkspace[] = [];
let key: CryptoKey;
const exclusive = <T>(_name: string, work: () => Promise<T>) => work();
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('indexedDB', new IDBFactory());
  key = await deriveSyncKey(PHRASE, salt);
});
afterEach(() => {
  for (const w of workspaces.splice(0)) w.close();
  vi.unstubAllGlobals();
});
function server() {
  const files = new Map<string, { rev: string; body: unknown }>();
  const writes: string[] = [];
  let sequence = 0;
  let hook: ((path: string, moment: 'before' | 'after') => void) | undefined;
  const set = (path: string, body: unknown) => files.set(path, { rev: `r${++sequence}`, body });
  const missing = () =>
    Response.json({ error: { '.tag': 'path', path: { '.tag': 'not_found' } } }, { status: 409 });
  const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    expect(new Headers(init?.headers).get('authorization')).toBe(
      `Bearer ${connection.accessToken}`,
    );
    const args = String(url).endsWith('get_metadata')
      ? JSON.parse(String(init?.body))
      : JSON.parse(new Headers(init?.headers).get('Dropbox-API-Arg')!);
    const path = args.path as string,
      file = files.get(path);
    if (String(url).endsWith('get_metadata'))
      return file ? Response.json({ rev: file.rev }) : missing();
    if (String(url).endsWith('download'))
      return file
        ? new Response(JSON.stringify(file.body), {
            headers: { 'Dropbox-API-Result': JSON.stringify({ rev: file.rev }) },
          })
        : missing();
    hook?.(path, 'before');
    const live = files.get(path),
      mode = args.mode;
    if (mode['.tag'] === 'add' ? live !== undefined : live?.rev !== mode.update)
      return Response.json(
        { error: { '.tag': 'path', path: { reason: { '.tag': 'conflict' } } } },
        { status: 409 },
      );
    const body = JSON.parse(String(init?.body));
    if (body.version !== 1 || path !== DROPBOX_LEGACY_PATH) expect(args.strict_conflict).toBe(true);
    set(path, body);
    writes.push(path);
    hook?.(path, 'after');
    return Response.json({ rev: files.get(path)!.rev });
  }) as unknown as typeof fetch;
  return {
    files,
    writes,
    fetcher,
    set,
    hook: (value?: typeof hook) => {
      hook = value;
    },
  };
}
async function fixture() {
  const workspace = createIndexedDbWorkspace({
    indexedDB,
    IDBKeyRange,
    databaseName: crypto.randomUUID(),
  });
  workspaces.push(workspace);
  const mira = createPrivateMiraStore({ databaseName: crypto.randomUUID() });
  await workspace.createEntity({
    id: 'one',
    type: 'pattern',
    title: 'One',
    body: 'Complete article',
  });
  await mira.save(createSession('chat', 'cbt', '2026-10-09T12:00:00Z'));
  await workspace.setSavedEntry({ sourceId: 'commons', entityId: 'example' }, true);
  await workspace.setUsefulness({ sourceId: 'commons', entityId: 'example' }, 2);
  const snapshot = await captureWorkspaceSyncSnapshot(workspace, mira);
  const sealed = await sealSyncDocument(
    new TextEncoder().encode(
      JSON.stringify({
        version: 1,
        entities: snapshot.workspace.entities,
        sessions: snapshot.sessions,
      }),
    ),
    key,
    salt,
    1,
  );
  const s = server();
  s.set(DROPBOX_LEGACY_PATH, sealed);
  const input = {
    connection,
    workspace,
    mira,
    exclusive,
    fetcher: s.fetcher,
    stateDatabaseName: crypto.randomUUID(),
  };
  return { workspace, mira, sealed, s, input };
}
async function offer(d: Awaited<ReturnType<typeof fixture>>) {
  const result = await syncWorkspaceWithDropbox({ ...d.input, phrase: PHRASE });
  if (result.type !== 'upgrade') throw new Error(JSON.stringify(result));
  return result;
}
it('previews with no archive writes and requires explicit confirmation before upgrading', async () => {
  const d = await fixture(),
    before = await captureWorkspaceSyncSnapshot(d.workspace, d.mira),
    review = await offer(d);
  expect(review).toMatchObject({ items: 1, sessions: 1, resumed: false, stale: false });
  expect(d.s.writes).toHaveLength(0);
  await expect(
    syncWorkspaceWithDropbox({ ...d.input, upgrade: { token: review.token, confirmed: false } }),
  ).rejects.toThrow('Confirm');
  expect(d.s.writes).toHaveLength(0);
  expect(await captureWorkspaceSyncSnapshot(d.workspace, d.mira)).toEqual(before);
});
it('verifies an encrypted original, parks old clients, then creates v2 without replacing local content', async () => {
  const d = await fixture(),
    before = await captureWorkspaceSyncSnapshot(d.workspace, d.mira),
    review = await offer(d);
  expect(
    await syncWorkspaceWithDropbox({
      ...d.input,
      upgrade: { token: review.token, confirmed: true },
    }),
  ).toMatchObject({ type: 'upgraded' });
  expect(d.s.writes).toEqual([
    '/patternverse-sync-v1-backup-r1.json',
    DROPBOX_LEGACY_PATH,
    DROPBOX_WORKSPACE_PATH,
  ]);
  expect(d.s.files.get('/patternverse-sync-v1-backup-r1.json')?.body).toEqual(d.sealed);
  expect(d.s.files.get(DROPBOX_LEGACY_PATH)?.body).toMatchObject({
    version: 2,
    type: 'patternverse-sync-upgrade',
  });
  expect(await captureWorkspaceSyncSnapshot(d.workspace, d.mira)).toEqual(before);
  await expect(
    syncWithDropbox({ connection, workspace: d.workspace, mira: d.mira, fetcher: d.s.fetcher }),
  ).rejects.toThrow('unsupported format');
  expect(await captureWorkspaceSyncSnapshot(d.workspace, d.mira)).toEqual(before);
  expect(await syncWorkspaceWithDropbox(d.input)).toMatchObject({ type: 'complete' });
  const upgraded = await openWorkspaceSyncSnapshot(
    d.s.files.get(DROPBOX_WORKSPACE_PATH)!.body as Parameters<typeof openWorkspaceSyncSnapshot>[0],
    key,
  );
  expect(upgraded.version).toBe(2);
  if (upgraded.version !== 2) throw new Error();
  expect(upgraded.workspace.favorites).toHaveLength(1);
  expect(upgraded.workspace.usefulness).toHaveLength(1);
  expect(JSON.stringify(d.s.files.get('/patternverse-sync-v1-backup-r1.json')?.body)).not.toContain(
    'Complete article',
  );
});
it.each(['local', 'remote'] as const)(
  'requires a new confirmation after %s changes',
  async (side) => {
    const d = await fixture(),
      reviewed = await offer(d);
    if (side === 'local')
      await d.workspace.updateEntity('one', (row) => ({ ...row, body: 'New local work' }));
    else d.s.set(DROPBOX_LEGACY_PATH, d.sealed);
    expect(
      await syncWorkspaceWithDropbox({
        ...d.input,
        upgrade: { token: reviewed.token, confirmed: true },
      }),
    ).toMatchObject({ type: 'upgrade', stale: true });
    expect(d.s.writes).toHaveLength(0);
  },
);
it.each(['backup', 'marker', 'v2'] as const)(
  'recovers a lost response after writing %s, without deleting the original',
  async (stage) => {
    const d = await fixture(),
      reviewed = await offer(d);
    const target =
      stage === 'backup'
        ? '/patternverse-sync-v1-backup-r1.json'
        : stage === 'marker'
          ? DROPBOX_LEGACY_PATH
          : DROPBOX_WORKSPACE_PATH;
    d.s.hook((path, moment) => {
      if (path === target && moment === 'after') {
        d.s.hook();
        throw new TypeError('Lost response');
      }
    });
    expect(
      await syncWorkspaceWithDropbox({
        ...d.input,
        upgrade: { token: reviewed.token, confirmed: true },
      }),
    ).toMatchObject({ type: 'error', recoveryAvailable: true });
    const restarted = await syncWorkspaceWithDropbox(d.input);
    if (restarted.type === 'upgrade') {
      expect(restarted.resumed).toBe(stage === 'marker');
      expect(
        await syncWorkspaceWithDropbox({
          ...d.input,
          upgrade: { token: restarted.token, confirmed: true },
        }),
      ).toMatchObject({ type: 'upgraded' });
    } else expect(restarted).toMatchObject({ type: 'complete' });
    expect(d.s.files.get('/patternverse-sync-v1-backup-r1.json')?.body).toEqual(d.sealed);
    expect(d.s.files.has(DROPBOX_WORKSPACE_PATH)).toBe(true);
    expect(
      d.s.writes.filter((path) => path.startsWith('/patternverse-sync-v1-backup')),
    ).toHaveLength(1);
  },
);
it('stops before parking v1 if the backup path contains different data', async () => {
  const d = await fixture(),
    reviewed = await offer(d);
  d.s.set('/patternverse-sync-v1-backup-r1.json', { ...d.sealed, data: 'damaged' });
  expect(
    await syncWorkspaceWithDropbox({
      ...d.input,
      upgrade: { token: reviewed.token, confirmed: true },
    }),
  ).toMatchObject({ type: 'error', message: expect.stringContaining('could not be verified') });
  expect(d.s.files.get(DROPBOX_LEGACY_PATH)?.body).toEqual(d.sealed);
  expect(d.s.files.has(DROPBOX_WORKSPACE_PATH)).toBe(false);
  expect(d.s.writes).toHaveLength(0);
});
it('refuses a racing old-client write at the marker CAS and leaves the newer archive intact', async () => {
  const d = await fixture(),
    reviewed = await offer(d);
  d.s.hook((path, moment) => {
    if (path === DROPBOX_LEGACY_PATH && moment === 'before') {
      d.s.hook();
      d.s.set(DROPBOX_LEGACY_PATH, d.sealed);
    }
  });
  expect(
    await syncWorkspaceWithDropbox({
      ...d.input,
      upgrade: { token: reviewed.token, confirmed: true },
    }),
  ).toMatchObject({ type: 'error', message: expect.stringContaining('changed during sync') });
  expect(d.s.files.get(DROPBOX_LEGACY_PATH)?.body).toEqual(d.sealed);
  expect(d.s.files.has(DROPBOX_WORKSPACE_PATH)).toBe(false);
});
it('refuses wrong phrases and malformed resume markers before writes', async () => {
  const d = await fixture();
  await expect(
    syncWorkspaceWithDropbox({ ...d.input, phrase: 'a different wrong sync phrase' }),
  ).rejects.toThrow('did not unlock');
  d.s.set(DROPBOX_LEGACY_PATH, {
    version: 2,
    type: 'patternverse-sync-upgrade',
    backupPath: '/other-file.json',
  });
  expect(await syncWorkspaceWithDropbox({ ...d.input, phrase: PHRASE })).toMatchObject({
    type: 'error',
  });
  expect(d.s.writes).toHaveLength(0);
});
it('preserves the real v1 ancestor so an offline deletion stays a deletion after upgrade', async () => {
  const d = await fixture();
  const oldInput = {
    connection,
    workspace: d.workspace,
    mira: d.mira,
    phrase: PHRASE,
    fetcher: d.s.fetcher,
  };
  const oldReview = await syncWithDropbox(oldInput);
  if (oldReview.type !== 'conflicts') throw new Error('Expected initial v1 review');
  expect(
    await syncWithDropbox({
      ...oldInput,
      choices: Object.fromEntries(oldReview.conflicts.map((row) => [row.key, 'remote' as const])),
      expectedConflictToken: oldReview.token,
    }),
  ).toMatchObject({ type: 'complete' });
  const initial = await offer(d);
  d.s.hook((path, moment) => {
    if (path.startsWith('/patternverse-sync-v1-backup-') && moment === 'after') {
      d.s.hook();
      throw new TypeError('Lost backup response');
    }
  });
  expect(
    await syncWorkspaceWithDropbox({
      ...d.input,
      upgrade: { token: initial.token, confirmed: true },
    }),
  ).toMatchObject({ type: 'error' });
  // v1 remains usable before parking; a later v1 sync must refresh the ancestor.
  await d.workspace.createEntity({
    id: 'two',
    type: 'pattern',
    title: 'Two',
    body: 'Later v1 content',
  });
  expect(await syncWithDropbox(oldInput)).toMatchObject({ type: 'complete' });
  await d.workspace.deleteEntity('one');
  await d.workspace.deleteEntity('two');
  const reviewed = await offer(d);
  expect(
    await syncWorkspaceWithDropbox({
      ...d.input,
      upgrade: { token: reviewed.token, confirmed: true },
    }),
  ).toMatchObject({ type: 'upgraded' });
  expect(await syncWorkspaceWithDropbox(d.input)).toMatchObject({ type: 'complete' });
  expect(await d.workspace.getEntity('one')).toBeUndefined();
  const upgraded = await openWorkspaceSyncSnapshot(
    d.s.files.get(DROPBOX_WORKSPACE_PATH)!.body as Parameters<typeof openWorkspaceSyncSnapshot>[0],
    key,
  );
  expect(upgraded.version).toBe(2);
  if (upgraded.version !== 2) throw new Error();
  expect(upgraded.workspace.entities).toHaveLength(0);
});
it('does not replace a remembered key when a changed remote key cannot unlock the v1 ancestor', async () => {
  const d = await fixture();
  const oldInput = {
    connection,
    workspace: d.workspace,
    mira: d.mira,
    phrase: PHRASE,
    fetcher: d.s.fetcher,
  };
  const oldReview = await syncWithDropbox(oldInput);
  if (oldReview.type !== 'conflicts') throw new Error('Expected initial review');
  expect(
    await syncWithDropbox({
      ...oldInput,
      expectedConflictToken: oldReview.token,
      choices: Object.fromEntries(oldReview.conflicts.map((row) => [row.key, 'remote' as const])),
    }),
  ).toMatchObject({ type: 'complete' });
  const nextSalt = syncBase64(new Uint8Array(16).fill(55)),
    nextKey = await deriveSyncKey(PHRASE, nextSalt);
  const snapshot = await captureWorkspaceSyncSnapshot(d.workspace, d.mira);
  d.s.set(
    DROPBOX_LEGACY_PATH,
    await sealSyncDocument(
      new TextEncoder().encode(
        JSON.stringify({
          version: 1,
          entities: snapshot.workspace.entities,
          sessions: snapshot.sessions,
        }),
      ),
      nextKey,
      nextSalt,
      1,
    ),
  );
  const writes = d.s.writes.length;
  await expect(syncWorkspaceWithDropbox({ ...d.input, phrase: PHRASE })).rejects.toThrow();
  expect((await loadKey(connection.accountId))?.salt).toBe(salt);
  expect(d.s.writes).toHaveLength(writes);
});
it('refuses to seed an older archive over existing v2 sync history', async () => {
  const d = await fixture();
  const { createEncryptedSyncStateStore } = await import('./sync-state');
  const { syncSnapshotToCorpus } = await import('./sync-corpus');
  const identity = await d.workspace.getWorkspace();
  const state = createEncryptedSyncStateStore({
    key,
    salt,
    databaseName: d.input.stateDatabaseName,
    scope: { providerId: 'dropbox', accountId: connection.accountId, workspaceId: identity.id },
  });
  const snapshot = await captureWorkspaceSyncSnapshot(d.workspace, d.mira),
    base = await syncSnapshotToCorpus(snapshot, 'prior-v2');
  await state.writeBase(base);
  expect(await syncWorkspaceWithDropbox({ ...d.input, phrase: PHRASE })).toMatchObject({
    type: 'error',
    message: expect.stringContaining('newer workspace sync history'),
  });
  expect(d.s.writes).toHaveLength(0);
  expect(await captureWorkspaceSyncSnapshot(d.workspace, d.mira)).toEqual(snapshot);
  expect(await state.readBase()).toEqual(base);
});
it('never overwrites a v2 archive created by another upgraded device', async () => {
  const d = await fixture(),
    reviewed = await offer(d);
  const { sealWorkspaceSyncSnapshot } = await import('./sync-snapshot');
  const snapshot = await captureWorkspaceSyncSnapshot(d.workspace, d.mira);
  const competing = await sealWorkspaceSyncSnapshot(
    {
      ...snapshot,
      workspace: {
        ...snapshot.workspace,
        entities: snapshot.workspace.entities.map((row) => ({
          ...row,
          body: 'Newer other-device work',
        })),
      },
    },
    key,
    salt,
  );
  d.s.hook((path, moment) => {
    if (path === DROPBOX_WORKSPACE_PATH && moment === 'before') {
      d.s.hook();
      d.s.set(path, competing);
    }
  });
  expect(
    await syncWorkspaceWithDropbox({
      ...d.input,
      upgrade: { token: reviewed.token, confirmed: true },
    }),
  ).toMatchObject({ type: 'upgraded' });
  expect(d.s.files.get(DROPBOX_WORKSPACE_PATH)?.body).toEqual(competing);
  expect(d.s.writes).not.toContain(DROPBOX_WORKSPACE_PATH);
  expect((await d.workspace.getEntity('one'))?.body).toBe('Complete article');
});
it.each(['missing', 'tampered'] as const)(
  'refuses a resumed upgrade with a %s backup',
  async (failure) => {
    const d = await fixture(),
      reviewed = await offer(d);
    d.s.hook((path, moment) => {
      if (path === DROPBOX_LEGACY_PATH && moment === 'after') {
        d.s.hook();
        throw new TypeError('Lost response');
      }
    });
    expect(
      await syncWorkspaceWithDropbox({
        ...d.input,
        upgrade: { token: reviewed.token, confirmed: true },
      }),
    ).toMatchObject({ type: 'error' });
    if (failure === 'missing') d.s.files.delete('/patternverse-sync-v1-backup-r1.json');
    else d.s.set('/patternverse-sync-v1-backup-r1.json', { ...d.sealed, data: 'altered' });
    const writes = d.s.writes.length;
    expect(await syncWorkspaceWithDropbox(d.input)).toMatchObject({ type: 'error' });
    expect(d.s.writes).toHaveLength(writes);
    expect(d.s.files.has(DROPBOX_WORKSPACE_PATH)).toBe(false);
  },
);
