import { webcrypto } from 'node:crypto';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createIndexedDbWorkspace, type LocalWorkspace } from '@patternverse/workspace';
import { createSession } from '@patternverse/companion-core';
import { planCorpusSync } from '@patternverse/sync-domain';
import { createPrivateMiraStore } from '$lib/mira/private-store';
import { syncSnapshotToCorpus } from './sync-corpus';
import {
  captureWorkspaceSyncSnapshot,
  openWorkspaceSyncSnapshot,
  sealWorkspaceSyncSnapshot,
  type WorkspaceSyncSnapshot,
} from './sync-snapshot';
import { deriveSyncKey, sealSyncDocument, syncBase64, type SyncEnvelope } from './sync-envelope';
import { createEncryptedSyncStateStore } from './sync-state';
import {
  createDropboxWorkspaceStore,
  readDropboxWorkspaceDocument,
  DROPBOX_WORKSPACE_PATH,
} from './dropbox-workspace-store';
import { syncWorkspaceWithDropbox } from './dropbox-workspace-sync';
import { loadKey } from './dropbox-sync';
import type { DropboxConnection } from './dropbox-auth';

const PHRASE = 'my sufficiently long test sync phrase';
const salt = syncBase64(new Uint8Array(16).fill(63));
const DATE = '2026-10-09T12:00:00.000Z';
const connection: DropboxConnection = {
  accountId: 'dbid:test',
  accessToken: 'PRIVATE_ACCESS_TOKEN',
  expiresAt: '2099-01-01T00:00:00Z',
};
const remoteConnection = { providerId: 'dropbox', connectionId: connection.accountId };
const workspaces: LocalWorkspace[] = [];
let key: CryptoKey;
const queues = new Map<string, Promise<unknown>>();
function exclusive<T>(name: string, work: () => Promise<T>): Promise<T> {
  const next = (queues.get(name) ?? Promise.resolve()).catch(() => undefined).then(work);
  queues.set(name, next);
  return next;
}
function tagged(status: number, tag: string, operation: 'read' | 'write' = 'read') {
  const reason = { '.tag': tag };
  return new Response(
    JSON.stringify({
      error: { '.tag': 'path', path: operation === 'write' ? { reason } : reason },
    }),
    { status },
  );
}
function server() {
  let document: string | null = null,
    revision = 0;
  const uploads: { args: Record<string, unknown>; body: string }[] = [];
  let legacy = false;
  let legacyEnvelope: SyncEnvelope | undefined;
  let beforeUpload: (() => void) | undefined;
  let lostResponse = false;
  const fetcher = vi.fn(
    async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      expect(new Headers(init?.headers).get('authorization')).toBe(
        `Bearer ${connection.accessToken}`,
      );
      if (String(url).endsWith('get_metadata'))
        return legacy ? Response.json({ rev: 'legacy1' }) : tagged(409, 'not_found');
      const args = JSON.parse(new Headers(init?.headers).get('Dropbox-API-Arg')!) as Record<
        string,
        unknown
      >;
      if (args.path === '/patternverse-sync-v1.json' && legacyEnvelope)
        return new Response(JSON.stringify(legacyEnvelope), {
          headers: { 'Dropbox-API-Result': JSON.stringify({ rev: 'legacy1' }) },
        });
      expect(args.path).toBe(DROPBOX_WORKSPACE_PATH);
      if (String(url).endsWith('download'))
        return document === null
          ? tagged(409, 'not_found')
          : new Response(document, {
              headers: { 'Dropbox-API-Result': JSON.stringify({ rev: `r${revision}` }) },
            });
      expect(String(url)).toContain('/files/upload');
      beforeUpload?.();
      beforeUpload = undefined;
      const mode = args.mode as { '.tag': string; update?: string };
      if (
        mode['.tag'] === 'add'
          ? document !== null
          : document === null || mode.update !== `r${revision}`
      )
        return tagged(409, 'conflict', 'write');
      expect(args.strict_conflict).toBe(true);
      expect(args.autorename).toBe(false);
      document = String(init?.body);
      uploads.push({ args, body: document });
      revision++;
      if (lostResponse) {
        lostResponse = false;
        throw new TypeError('Lost response after accepting upload');
      }
      return Response.json({ rev: `r${revision}` });
    },
  ) as unknown as typeof fetch;
  return {
    fetcher,
    uploads,
    inspect: () => document,
    set: (envelope: SyncEnvelope) => {
      document = JSON.stringify(envelope);
      revision++;
    },
    erase: () => {
      document = null;
      revision++;
    },
    legacy: (envelope?: SyncEnvelope) => {
      legacy = true;
      legacyEnvelope = envelope;
    },
    race: (work: () => void) => {
      beforeUpload = work;
    },
    loseResponse: () => {
      lostResponse = true;
    },
  };
}
async function device() {
  const workspace = createIndexedDbWorkspace({
    indexedDB,
    IDBKeyRange,
    databaseName: crypto.randomUUID(),
  });
  workspaces.push(workspace);
  const mira = createPrivateMiraStore({ databaseName: crypto.randomUUID() });
  const identity = await workspace.getWorkspace();
  const stateDatabaseName = crypto.randomUUID();
  const state = createEncryptedSyncStateStore({
    key,
    salt,
    databaseName: stateDatabaseName,
    scope: { providerId: 'dropbox', accountId: connection.accountId, workspaceId: identity.id },
  });
  return { workspace, mira, identity, state, stateDatabaseName };
}
function adapter(d: Awaited<ReturnType<typeof device>>, s: ReturnType<typeof server>) {
  return createDropboxWorkspaceStore({
    key,
    salt,
    identity: d.identity,
    fetcher: s.fetcher,
    getCredentials: () => connection,
  });
}
async function populate(d: Awaited<ReturnType<typeof device>>) {
  await d.workspace.createEntity({
    id: 'one',
    type: 'pattern',
    title: 'One',
    body: 'PRIVATE ARTICLE',
  });
  await d.workspace.setSavedEntry({ sourceId: 'commons', entityId: 'one' }, true);
  await d.workspace.setUsefulness({ sourceId: 'commons', entityId: 'one' }, 2);
  await d.workspace.createSituation('Private situation');
  await d.workspace.savePracticeRun({
    id: 'run',
    title: 'Answers',
    patternRef: { sourceId: 'commons', entityId: 'one' },
    patternTitle: 'One',
    patternType: 'pattern',
    origin: 'patternverse',
    status: 'in-progress',
    revision: 0,
    verseIds: [],
    responses: [{ id: 'answer', prompt: 'Question', answer: 'PRIVATE RESPONSE' }],
  });
  await d.mira.save(createSession('conversation', 'cbt', DATE));
}
async function sync(
  d: Awaited<ReturnType<typeof device>>,
  s: ReturnType<typeof server>,
  extra: Partial<Parameters<typeof syncWorkspaceWithDropbox>[0]> = {},
) {
  return syncWorkspaceWithDropbox({ ...d, connection, fetcher: s.fetcher, exclusive, ...extra });
}
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('indexedDB', new IDBFactory());
  queues.clear();
  key = await deriveSyncKey(PHRASE, salt);
});
afterEach(() => {
  for (const workspace of workspaces.splice(0)) workspace.close();
  vi.unstubAllGlobals();
});

describe('encrypted Dropbox workspace transport', () => {
  it('creates an encrypted archive, exchanges all record types, and rebinds ownership on a second device', async () => {
    const a = await device(),
      b = await device(),
      s = server();
    await populate(a);
    // Seed the shared key cache with the deterministic test salt through an existing archive.
    s.set(
      await sealWorkspaceSyncSnapshot(
        await captureWorkspaceSyncSnapshot(a.workspace, a.mira),
        key,
        salt,
      ),
    );
    expect(await sync(a, s, { phrase: PHRASE })).toMatchObject({ type: 'complete', records: 7 });
    expect(await sync(b, s)).toMatchObject({ type: 'complete', records: 7 });
    expect((await b.workspace.getEntity('one'))?.body).toBe('PRIVATE ARTICLE');
    expect(await b.workspace.listSavedEntries()).toHaveLength(1);
    expect(await b.workspace.listUsefulness()).toHaveLength(1);
    expect(await b.workspace.listPracticeRuns()).toMatchObject([
      { responses: [{ answer: 'PRIVATE RESPONSE' }] },
    ]);
    expect(await b.workspace.listSituations()).toHaveLength(1);
    expect(await b.mira.load('conversation')).not.toBeNull();
    expect((await b.workspace.getWorkspace()).id).toBe(b.identity.id);
    await b.workspace.updateEntity('one', (row) => ({ ...row, body: 'Second device update' }));
    expect(await sync(b, s)).toMatchObject({ type: 'complete' });
    expect(await sync(a, s)).toMatchObject({ type: 'complete' });
    expect((await a.workspace.getEntity('one'))?.body).toBe('Second device update');
    expect(s.inspect()).not.toContain('Second device update');
    expect(s.inspect()).not.toContain(connection.accessToken);
    expect(s.uploads[0]?.args.mode).toMatchObject({ '.tag': 'update' });
    expect(await a.state.readJournal()).toBeNull();
    expect(await a.state.readApply()).toBeNull();
  });

  it('creates a new archive only when both v2 and the legacy path are genuinely missing', async () => {
    const d = await device(),
      s = server();
    await populate(d);
    const before = await syncSnapshotToCorpus(
      await captureWorkspaceSyncSnapshot(d.workspace, d.mira),
    );
    const store = adapter(d, s);
    const empty = await store.readSnapshot(remoteConnection);
    expect(empty).toMatchObject({ ok: true, snapshot: { revision: null, files: [] } });
    if (!empty.ok) throw new Error();
    const plan = planCorpusSync({ base: empty.snapshot, local: before, remote: empty.snapshot });
    expect(
      await store.applyChanges(remoteConnection, { expectedRevision: null, changes: plan.push }),
    ).toMatchObject({ ok: true, revision: 'r1' });
    expect(s.uploads[0]?.args.mode).toEqual({ '.tag': 'add' });
    expect(s.inspect()).not.toContain('PRIVATE RESPONSE');
  });

  it('blocks existing legacy archives without creating or replacing either remote file', async () => {
    const d = await device(),
      s = server();
    s.legacy(
      await sealSyncDocument(
        new TextEncoder().encode(JSON.stringify({ version: 1, entities: [], sessions: [] })),
        key,
        salt,
        1,
      ),
    );
    expect(await sync(d, s, { phrase: PHRASE })).toMatchObject({
      type: 'upgrade',
      items: 0,
      sessions: 0,
    });
    expect(s.uploads).toHaveLength(0);
    expect(s.inspect()).toBeNull();
    expect((await loadKey(connection.accountId))?.key.extractable).toBe(false);
  });

  it.each([
    [401, undefined, 'authorization-expired'],
    [403, undefined, 'permission-denied'],
    [429, undefined, 'rate-limited'],
    [503, undefined, 'temporarily-unavailable'],
    [409, 'restricted_content', 'permission-denied'],
    [409, 'not_file', 'invalid-remote-corpus'],
  ])('maps download error %s/%s and never uploads', async (status, tag, type) => {
    const d = await device();
    const fetcher = vi.fn(async () =>
      tag
        ? tagged(status as number, tag as string)
        : new Response('', { status: status as number, headers: { 'Retry-After': '3' } }),
    ) as unknown as typeof fetch;
    const store = createDropboxWorkspaceStore({
      key,
      salt,
      identity: d.identity,
      fetcher,
      getCredentials: () => connection,
    });
    expect(await store.readSnapshot(remoteConnection)).toMatchObject({
      ok: false,
      error: { type, ...(type === 'rate-limited' ? { retryAfterMs: 3000 } : {}) },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not interpret arbitrary not_found text as a missing archive', async () => {
    const fetcher = vi.fn(
      async () => new Response('something not_found in a permission error', { status: 409 }),
    ) as unknown as typeof fetch;
    expect(
      await readDropboxWorkspaceDocument({ getCredentials: () => connection, fetcher }),
    ).toMatchObject({ ok: false, error: { type: 'unknown' } });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refuses wrong-account and expired credentials before any request', async () => {
    const d = await device(),
      s = server();
    expect(
      await adapter(d, s).readSnapshot({ ...remoteConnection, connectionId: 'other' }),
    ).toMatchObject({ ok: false, error: { type: 'not-authenticated' } });
    expect(
      await readDropboxWorkspaceDocument({
        getCredentials: () => ({ ...connection, expiresAt: DATE }),
        now: () => Date.parse(DATE),
        fetcher: s.fetcher,
      }),
    ).toMatchObject({ ok: false, error: { type: 'authorization-expired' } });
    expect(s.fetcher).not.toHaveBeenCalled();
  });

  it('fails closed on wrong keys, tampering, malformed metadata and unsupported content', async () => {
    const d = await device(),
      s = server();
    await populate(d);
    const envelope = await sealWorkspaceSyncSnapshot(
      await captureWorkspaceSyncSnapshot(d.workspace, d.mira),
      key,
      salt,
    );
    s.set(envelope);
    const wrongKey = await deriveSyncKey('a different long phrase', salt);
    const store = createDropboxWorkspaceStore({
      key: wrongKey,
      salt,
      identity: d.identity,
      fetcher: s.fetcher,
      getCredentials: () => connection,
    });
    expect(await store.readSnapshot(remoteConnection)).toMatchObject({
      ok: false,
      error: { type: 'invalid-remote-corpus' },
    });
    s.set({ ...envelope, data: 'aaaa' });
    expect(await adapter(d, s).readSnapshot(remoteConnection)).toMatchObject({
      ok: false,
      error: { type: 'invalid-remote-corpus' },
    });
    expect(s.uploads).toHaveLength(0);
    await expect(sync(d, s, { phrase: PHRASE })).rejects.toThrow('did not unlock');
    expect(await loadKey(connection.accountId)).toBeUndefined();
    const bad = createDropboxWorkspaceStore({
      key,
      salt,
      identity: d.identity,
      getCredentials: () => connection,
      fetcher: async () => new Response('{}', { headers: { 'Dropbox-API-Result': 'not-json' } }),
    });
    expect(await bad.readSnapshot(remoteConnection)).toMatchObject({
      ok: false,
      error: { type: 'invalid-remote-corpus' },
    });
  });

  it('limits response streams even without Content-Length', async () => {
    let cancelled = false;
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(16 * 1024 * 1024 + 1));
        },
        cancel() {
          cancelled = true;
        },
      }),
      { headers: { 'Dropbox-API-Result': JSON.stringify({ rev: 'r1' }) } },
    );
    expect(
      await readDropboxWorkspaceDocument({
        getCredentials: () => connection,
        fetcher: async () => response,
      }),
    ).toMatchObject({ ok: false, error: { type: 'invalid-remote-corpus' } });
    expect(cancelled).toBe(true);
  });

  it('uses strict Dropbox preconditions if a file changes or is deleted after the adapter reads it', async () => {
    const d = await device(),
      s = server();
    await populate(d);
    const original = await captureWorkspaceSyncSnapshot(d.workspace, d.mira);
    const envelope = await sealWorkspaceSyncSnapshot(original, key, salt);
    s.set(envelope);
    const store = adapter(d, s);
    const remote = await store.readSnapshot(remoteConnection);
    if (!remote.ok) throw new Error();
    await d.workspace.updateEntity('one', (row) => ({ ...row, body: 'Change' }));
    const next = await syncSnapshotToCorpus(
      await captureWorkspaceSyncSnapshot(d.workspace, d.mira),
    );
    const changes = planCorpusSync({
      base: remote.snapshot,
      local: next,
      remote: remote.snapshot,
    }).push;
    for (const race of [() => s.set(envelope), () => s.erase()]) {
      s.set(envelope);
      const latest = await store.readSnapshot(remoteConnection);
      if (!latest.ok) throw new Error();
      s.race(race);
      expect(
        await store.applyChanges(remoteConnection, {
          expectedRevision: latest.snapshot.revision,
          changes,
        }),
      ).toMatchObject({ ok: false, error: { type: 'revision-conflict' } });
    }
    expect(s.uploads).toHaveLength(0);
  });

  it('validates canonical record IDs and hashes before uploading', async () => {
    const d = await device(),
      s = server();
    const local = await syncSnapshotToCorpus(
      await captureWorkspaceSyncSnapshot(d.workspace, d.mira),
    );
    const file = local.files[0]!;
    expect(
      await adapter(d, s).applyChanges(remoteConnection, {
        expectedRevision: null,
        changes: [{ type: 'create', ...file, path: 'entities/not-the-id.json' }],
      }),
    ).toMatchObject({ ok: false, error: { type: 'invalid-remote-corpus' } });
    expect(s.uploads).toHaveLength(0);
  });
  it.each(['insufficient_space', 'no_write_permission', 'too_many_write_operations'] as const)(
    'maps upload failures (%s) without leaking response bodies',
    async (tag) => {
      const d = await device(),
        s = server();
      const current = await syncSnapshotToCorpus(
        await captureWorkspaceSyncSnapshot(d.workspace, d.mira),
      );
      const changes = current.files.map((file) => ({ type: 'create' as const, ...file }));
      const store = createDropboxWorkspaceStore({
        key,
        salt,
        identity: d.identity,
        getCredentials: () => connection,
        fetcher: (url, init) =>
          String(url).endsWith('upload')
            ? Promise.resolve(tagged(409, tag, 'write'))
            : s.fetcher(url, init),
      });
      expect(
        await store.applyChanges(remoteConnection, { expectedRevision: null, changes }),
      ).toMatchObject({
        ok: false,
        error: {
          type:
            tag === 'insufficient_space'
              ? 'quota-exceeded'
              : tag === 'no_write_permission'
                ? 'permission-denied'
                : 'rate-limited',
        },
      });
      expect(s.uploads).toHaveLength(0);
    },
  );
  it('maps failed response streams to a network error instead of assuming an empty archive', async () => {
    const broken = new Response(
      new ReadableStream({
        start(controller) {
          controller.error(new TypeError('lost stream'));
        },
      }),
      { headers: { 'Dropbox-API-Result': JSON.stringify({ rev: 'r1' }) } },
    );
    expect(
      await readDropboxWorkspaceDocument({
        getCredentials: () => connection,
        fetcher: async () => broken,
      }),
    ).toMatchObject({ ok: false, error: { type: 'network-error' } });
  });
});

describe('workspace Dropbox orchestration and review', () => {
  it('initializes a new encrypted workspace and remembers the non-exportable key for retry', async () => {
    const d = await device(),
      s = server();
    await populate(d);
    expect(await sync(d, s, { phrase: PHRASE })).toMatchObject({ type: 'complete', records: 7 });
    const saved = await loadKey(connection.accountId);
    expect(saved?.key.extractable).toBe(false);
    const snapshot = await openWorkspaceSyncSnapshot(JSON.parse(s.inspect()!), saved!.key);
    expect(snapshot).toEqual(await captureWorkspaceSyncSnapshot(d.workspace, d.mira));
    expect(await sync(d, s)).toMatchObject({ type: 'complete', recovered: false });
    expect(s.uploads).toHaveLength(1);
  });
  async function shared() {
    const a = await device(),
      b = await device(),
      s = server();
    await populate(a);
    s.set(
      await sealWorkspaceSyncSnapshot(
        await captureWorkspaceSyncSnapshot(a.workspace, a.mira),
        key,
        salt,
      ),
    );
    await sync(a, s, { phrase: PHRASE });
    await sync(b, s);
    return { a, b, s };
  }
  it('requires explicit choices and applies only the reviewed versions', async () => {
    const { a, b, s } = await shared();
    await a.workspace.updateEntity('one', (row) => ({ ...row, body: 'Local version' }));
    await b.workspace.updateEntity('one', (row) => ({ ...row, body: 'Dropbox version' }));
    await sync(b, s);
    const review = await sync(a, s);
    expect(review).toMatchObject({ type: 'review', stale: false });
    if (review.type !== 'review') throw new Error();
    expect(review.items).toMatchObject([
      {
        path: 'entities/one.json',
        title: 'One',
        kind: 'Library item',
        local: expect.stringContaining('Local version'),
        remote: expect.stringContaining('Dropbox version'),
      },
    ]);
    const uploads = s.uploads.length;
    await expect(sync(a, s, { choices: { 'entities/one.json': 'remote' } })).rejects.toThrow(
      'Review',
    );
    expect(s.uploads).toHaveLength(uploads);
    expect(
      await sync(a, s, { choices: { 'entities/one.json': 'remote' }, reviewedToken: review.token }),
    ).toMatchObject({ type: 'complete' });
    expect((await a.workspace.getEntity('one'))?.body).toBe('Dropbox version');
  });
  it.each(['local', 'remote'] as const)(
    'rejects stale choices after a %s edit without writes',
    async (side) => {
      const { a, b, s } = await shared();
      await a.workspace.updateEntity('one', (row) => ({ ...row, body: 'Local' }));
      await b.workspace.updateEntity('one', (row) => ({ ...row, body: 'Remote' }));
      await sync(b, s);
      const review = await sync(a, s);
      if (review.type !== 'review') throw new Error();
      const target = side === 'local' ? a : b;
      await target.workspace.updateEntity('one', (row) => ({ ...row, body: 'Newer work' }));
      if (side === 'remote') await sync(b, s);
      const localBefore = await captureWorkspaceSyncSnapshot(a.workspace, a.mira),
        remoteBefore = s.inspect(),
        uploads = s.uploads.length;
      expect(
        await sync(a, s, {
          choices: { 'entities/one.json': 'remote' },
          reviewedToken: review.token,
        }),
      ).toMatchObject({ type: 'review', stale: true });
      expect(await captureWorkspaceSyncSnapshot(a.workspace, a.mira)).toEqual(localBefore);
      expect(s.inspect()).toBe(remoteBefore);
      expect(s.uploads).toHaveLength(uploads);
    },
  );
  it('recovers when Dropbox accepts an upload but the response is lost', async () => {
    const { a, s } = await shared();
    await a.workspace.updateEntity('one', (row) => ({ ...row, body: 'Accepted remotely' }));
    s.loseResponse();
    expect(await sync(a, s)).toMatchObject({ type: 'error', recoveryAvailable: true });
    expect(await a.state.readJournal()).not.toBeNull();
    expect(await sync(a, s)).toMatchObject({ type: 'complete', recovered: true });
    expect(await a.state.readJournal()).toBeNull();
    expect(s.uploads).toHaveLength(1); // No blind duplicate upload.
  });
  it('shows blocked recovery versions while retaining pending intent and newer local work', async () => {
    const { a, b, s } = await shared();
    await b.workspace.updateEntity('one', (row) => ({ ...row, body: 'Incoming change' }));
    await b.mira.save({ ...(await b.mira.load('conversation'))!, title: 'Incoming conversation' });
    await sync(b, s);
    const failingMira = {
      ...a.mira,
      applySyncSessions: async () => {
        throw new Error('interrupted');
      },
    };
    expect(await sync(a, s, { mira: failingMira })).toMatchObject({
      type: 'blocked',
      recoveryAvailable: true,
    });
    const pending = await a.state.readApply();
    expect(pending).not.toBeNull();
    await a.workspace.updateEntity('one', (row) => ({ ...row, body: 'New local work' }));
    const blocked = await sync(a, s);
    expect(blocked).toMatchObject({ type: 'blocked', recoveryAvailable: true });
    if (blocked.type !== 'blocked') throw new Error();
    expect(blocked.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'One',
          local: expect.stringContaining('New local work'),
          remote: expect.stringContaining('Incoming change'),
        }),
      ]),
    );
    expect(await a.state.readApply()).toEqual(pending);
    expect((await a.workspace.getEntity('one'))?.body).toBe('New local work');
  });
  it('keeps active Mira practice caches and conversations protected during sync', async () => {
    const { a, b, s } = await shared();
    await a.mira.saveRun('conversation', { private: 'Device-only work' }, null);
    await b.mira.save({ ...(await b.mira.load('conversation'))!, title: 'Incoming conversation' });
    await sync(b, s);
    expect(await sync(a, s)).toMatchObject({
      type: 'blocked',
      recoveryAvailable: true,
      message: expect.stringContaining('device-local Mira practice'),
    });
    expect((await a.mira.load('conversation'))?.title).toBe('New session');
    expect(await a.mira.loadRun('conversation')).toMatchObject({
      saved: { private: 'Device-only work' },
    });
  });
  it('settles interrupted updates explicitly, then reviews the remaining Dropbox conflict', async () => {
    const { a, b, s } = await shared();
    await b.workspace.updateEntity('one', (row) => ({ ...row, body: 'Incoming change' }));
    await b.mira.save({ ...(await b.mira.load('conversation'))!, title: 'Incoming conversation' });
    await sync(b, s);
    await sync(a, s, {
      mira: {
        ...a.mira,
        applySyncSessions: async () => {
          throw new Error('interrupted');
        },
      },
    });
    await a.workspace.updateEntity('one', (row) => ({ ...row, body: 'Newer local work' }));
    const blocked = await sync(a, s);
    if (blocked.type !== 'blocked' || !blocked.token) throw new Error('Expected recovery choices');
    const choices = Object.fromEntries(
      blocked.items.map((row) => [
        row.path,
        row.path.startsWith('sessions/') ? ('remote' as const) : ('local' as const),
      ]),
    );
    const result = await sync(a, s, {
      recovery: { token: blocked.token, choices, confirmed: true },
    });
    expect(await a.state.readApply()).toBeNull();
    expect((await a.state.readRecoveryCopy())?.current.workspace.entities[0]?.body).toBe(
      'Newer local work',
    );
    expect((await a.mira.load('conversation'))?.title).toBe('Incoming conversation');
    if (result.type !== 'review') throw new Error('Expected separate Dropbox conflict');
    expect(
      await sync(a, s, { choices: { 'entities/one.json': 'local' }, reviewedToken: result.token }),
    ).toMatchObject({ type: 'complete' });
    expect((await a.workspace.getEntity('one'))?.body).toBe('Newer local work');
    expect(await a.state.readJournal()).toBeNull();
    expect(await a.state.readRecoveryCopy()).not.toBeNull();
  });
  it('serializes whole sync attempts across two callers for the same workspace', async () => {
    const { a, s } = await shared();
    await a.workspace.updateEntity('one', (row) => ({ ...row, body: 'One upload' }));
    expect(await Promise.all([sync(a, s), sync(a, s)])).toMatchObject([
      { type: 'complete' },
      { type: 'complete' },
    ]);
    expect(s.uploads).toHaveLength(1);
  });
  it('round-trips generated private texts without plaintext in the remote archive (35 cases)', async () => {
    const d = await device(),
      s = server();
    await populate(d);
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('a', 'é', '中', '🌿', '\n', '"', '\\'), {
          minLength: 1,
          maxLength: 30,
        }),
        async (chars) => {
          const body = `PRIVATE ${chars.join('')}`;
          await d.workspace.updateEntity('one', (row) => ({ ...row, body }));
          const snapshot: WorkspaceSyncSnapshot = await captureWorkspaceSyncSnapshot(
            d.workspace,
            d.mira,
          );
          s.set(await sealWorkspaceSyncSnapshot(snapshot, key, salt));
          const read = await adapter(d, s).readSnapshot(remoteConnection);
          expect(read.ok).toBe(true);
          if (!read.ok) throw new Error();
          expect(
            new TextDecoder().decode(
              read.snapshot.files.find((file) => file.path === 'entities/one.json')!.content,
            ),
          ).toContain(JSON.stringify(body).slice(1, -1));
          expect(s.inspect()).not.toContain('PRIVATE');
          expect(await openWorkspaceSyncSnapshot(JSON.parse(s.inspect()!), key)).toEqual(snapshot);
        },
      ),
      { numRuns: 35, seed: 20261014 },
    );
  });
});
