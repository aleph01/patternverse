import { webcrypto } from 'node:crypto';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createIndexedDbWorkspace, type LocalWorkspace } from '@patternverse/workspace';
import { createSession } from '@patternverse/companion-core';
import { createPrivateMiraStore } from '$lib/mira/private-store';
import { getDropboxDeviceStateKey } from './dropbox-device-key';
import { createEncryptedSyncStateStore } from './sync-state';
import { syncWorkspaceWithDropbox } from './dropbox-workspace-sync';
import {
  DROPBOX_ACCOUNT_WORKSPACE_PATH,
  DROPBOX_LEGACY_PATH,
  DROPBOX_WORKSPACE_PATH,
  readDropboxWorkspaceDocument,
} from './dropbox-workspace-store';
import type { DropboxConnection } from './dropbox-auth';

const DATE = '2026-10-10T12:00:00.000Z';
const connection: DropboxConnection = {
  accountId: 'dbid:sign-in-test',
  accessToken: 'synthetic-secret-token',
  expiresAt: '2099-01-01T00:00:00Z',
};
const workspaces: LocalWorkspace[] = [];
const exclusive = async <T>(_name: string, work: () => Promise<T>) => work();

function missing() {
  return new Response(
    JSON.stringify({ error: { '.tag': 'path', path: { '.tag': 'not_found' } } }),
    {
      status: 409,
    },
  );
}
function provider() {
  const files = new Map<string, { body: unknown; revision: string }>();
  let number = 0;
  let beforeUpload: (() => void) | undefined;
  let loseResponse = false;
  let conflicts = 0;
  const uploads: { path: string; body: string }[] = [];
  const put = (path: string, body: unknown) => {
    files.set(path, { body, revision: `r${++number}` });
  };
  const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    expect(new Headers(init?.headers).get('authorization')).toBe(
      `Bearer ${connection.accessToken}`,
    );
    if (String(url).endsWith('get_metadata')) {
      const path = (JSON.parse(String(init?.body)) as { path: string }).path;
      const found = files.get(path);
      return found ? Response.json({ rev: found.revision }) : missing();
    }
    const args = JSON.parse(new Headers(init?.headers).get('Dropbox-API-Arg')!) as {
      path: string;
      mode: { '.tag': string; update?: string };
      strict_conflict: boolean;
      autorename: boolean;
    };
    expect(args.path).toBe(DROPBOX_ACCOUNT_WORKSPACE_PATH);
    if (String(url).endsWith('download')) {
      const found = files.get(args.path);
      return found
        ? new Response(JSON.stringify(found.body), {
            headers: { 'Dropbox-API-Result': JSON.stringify({ rev: found.revision }) },
          })
        : missing();
    }
    expect(String(url)).toContain('/files/upload');
    beforeUpload?.();
    beforeUpload = undefined;
    const found = files.get(args.path);
    if (args.mode['.tag'] === 'add' ? found : !found || found.revision !== args.mode.update) {
      conflicts++;
      return new Response(
        JSON.stringify({ error: { '.tag': 'path', path: { reason: { '.tag': 'conflict' } } } }),
        { status: 409 },
      );
    }
    expect(args.strict_conflict).toBe(true);
    expect(args.autorename).toBe(false);
    const body = String(init?.body);
    put(args.path, JSON.parse(body));
    uploads.push({ path: args.path, body });
    if (loseResponse) {
      loseResponse = false;
      throw new TypeError('Response lost after accepting upload');
    }
    return Response.json({ rev: files.get(args.path)!.revision });
  }) as unknown as typeof fetch;
  return {
    fetcher,
    files,
    uploads,
    conflicts: () => conflicts,
    put,
    race: (work: () => void) => (beforeUpload = work),
    loseResponse: () => (loseResponse = true),
  };
}
async function device() {
  const storage = new IDBFactory();
  const workspace = createIndexedDbWorkspace({
    indexedDB: storage,
    IDBKeyRange,
    databaseName: crypto.randomUUID(),
  });
  workspaces.push(workspace);
  const mira = createPrivateMiraStore({ indexedDB: storage, databaseName: crypto.randomUUID() });
  return { storage, workspace, mira, stateDatabaseName: crypto.randomUUID() };
}
async function sync(
  d: Awaited<ReturnType<typeof device>>,
  p: ReturnType<typeof provider>,
  extra: Partial<Parameters<typeof syncWorkspaceWithDropbox>[0]> = {},
) {
  vi.stubGlobal('indexedDB', d.storage);
  return syncWorkspaceWithDropbox({
    ...d,
    connection,
    protection: 'dropbox-account',
    fetcher: p.fetcher,
    exclusive,
    ...extra,
  });
}
async function note(d: Awaited<ReturnType<typeof device>>, body = 'Synthetic reflection') {
  await d.workspace.createEntity({ id: 'note', type: 'pattern', title: 'Test note', body });
}
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('indexedDB', new IDBFactory());
});
afterEach(() => {
  for (const workspace of workspaces.splice(0)) workspace.close();
  vi.unstubAllGlobals();
});

describe('Dropbox sign-in-only workspace sync', () => {
  it('rechecks an automatic attempt under its lock before contacting Dropbox', async () => {
    const d = await device(),
      p = provider();
    // Models an attempt queued behind a backup restore in another tab.
    const result = await sync(d, p, {
      automatic: true,
      exclusive: async (_name, work) => {
        vi.stubGlobal('localStorage', { getItem: () => 'false' });
        return work();
      },
    });
    expect(result).toMatchObject({ type: 'cancelled' });
    expect(p.fetcher).not.toHaveBeenCalled();
    // Explicit manual attempts are independent of this device-only preference.
    expect(await sync(d, p)).toMatchObject({ type: 'complete' });
  });
  it('exchanges all saved sections between independent devices without a phrase or shared key', async () => {
    const a = await device(),
      b = await device(),
      p = provider();
    await note(a);
    await a.workspace.setSavedEntry({ sourceId: 'commons', entityId: 'sample' }, true);
    await a.workspace.setUsefulness({ sourceId: 'commons', entityId: 'sample' }, 2);
    await a.workspace.createSituation('Synthetic context');
    await a.workspace.savePracticeRun({
      id: 'run',
      title: 'Test answers',
      patternRef: { sourceId: 'commons', entityId: 'sample' },
      patternTitle: 'Sample',
      patternType: 'pattern',
      origin: 'patternverse',
      status: 'in-progress',
      revision: 0,
      verseIds: [],
      responses: [{ id: 'response', prompt: 'Question', answer: 'Synthetic answer' }],
    });
    await a.mira.save(createSession('conversation', 'cbt', DATE));
    await a.mira.saveSettings({
      model: 'test',
      openRouterKey: 'UNSYNCED_AI_SECRET',
      promptOverrides: {},
      activeSessionId: null,
    });
    expect(await sync(a, p)).toMatchObject({ type: 'complete', records: 7 });
    expect(await sync(b, p)).toMatchObject({ type: 'complete', records: 7 });
    expect((await b.workspace.getEntity('note'))?.body).toBe('Synthetic reflection');
    expect(await b.workspace.listSavedEntries()).toHaveLength(1);
    expect(await b.workspace.listUsefulness()).toHaveLength(1);
    expect(await b.workspace.listSituations()).toHaveLength(1);
    expect(await b.workspace.listPracticeRuns()).toMatchObject([
      { responses: [{ answer: 'Synthetic answer' }] },
    ]);
    expect(await b.mira.load('conversation')).not.toBeNull();
    expect(p.uploads[0]?.body).toContain('Synthetic reflection');
    expect(p.uploads[0]?.body).not.toContain(connection.accessToken);
    expect(p.uploads[0]?.body).not.toContain('UNSYNCED_AI_SECRET');
    expect(p.files.has(DROPBOX_WORKSPACE_PATH)).toBe(false);
    const id = (await b.workspace.getWorkspace()).id;
    expect((await b.workspace.listPracticeRuns())[0]?.workspaceId).toBe(id);
    vi.stubGlobal('indexedDB', a.storage);
    const aKey = await getDropboxDeviceStateKey(connection.accountId);
    vi.stubGlobal('indexedDB', b.storage);
    const bKey = await getDropboxDeviceStateKey(connection.accountId);
    expect(aKey.salt).not.toBe(bKey.salt);
    expect(aKey.key.extractable).toBe(false);
    await b.workspace.updateEntity('note', (row) => ({ ...row, body: 'Changed on device B' }));
    expect(await sync(b, p)).toMatchObject({ type: 'complete' });
    expect(await sync(a, p)).toMatchObject({ type: 'complete' });
    expect((await a.workspace.getEntity('note'))?.body).toBe('Changed on device B');
  });

  it('reviews concurrent edits and rejects stale choices without silently replacing either version', async () => {
    const a = await device(),
      b = await device(),
      p = provider();
    await note(a);
    await sync(a, p);
    await sync(b, p);
    await a.workspace.updateEntity('note', (row) => ({ ...row, body: 'A edit' }));
    await b.workspace.updateEntity('note', (row) => ({ ...row, body: 'B edit' }));
    await sync(a, p);
    const review = await sync(b, p);
    expect(review.type).toBe('review');
    if (review.type !== 'review') throw new Error('Expected conflict review');
    await b.workspace.updateEntity('note', (row) => ({ ...row, body: 'B newer edit' }));
    const stale = await sync(b, p, {
      choices: { 'entities/note.json': 'remote' },
      reviewedToken: review.token,
    });
    expect(stale).toMatchObject({ type: 'review', stale: true });
    expect((await b.workspace.getEntity('note'))?.body).toBe('B newer edit');
    if (stale.type !== 'review') throw new Error('Expected fresh conflict review');
    expect(
      await sync(b, p, { choices: { 'entities/note.json': 'remote' }, reviewedToken: stale.token }),
    ).toMatchObject({ type: 'complete' });
    expect((await b.workspace.getEntity('note'))?.body).toBe('A edit');
  });

  it('propagates deliberate deletion after convergence', async () => {
    const a = await device(),
      b = await device(),
      p = provider();
    await note(a);
    await sync(a, p);
    await sync(b, p);
    await a.workspace.deleteEntity('note');
    await sync(a, p);
    await sync(b, p);
    expect(await b.workspace.getEntity('note')).toBeUndefined();
  });

  it.each([DROPBOX_WORKSPACE_PATH, DROPBOX_LEGACY_PATH])(
    'blocks an existing encrypted archive at %s with no upload or local replacement',
    async (path) => {
      const d = await device(),
        p = provider();
      await note(d);
      p.put(path, { version: path === DROPBOX_LEGACY_PATH ? 1 : 2, data: 'Original ciphertext' });
      expect(await sync(d, p)).toMatchObject({
        type: 'error',
        message: expect.stringContaining('encrypted Dropbox sync archive already exists'),
      });
      expect(p.uploads).toHaveLength(0);
      expect(p.files.get(path)?.body).toMatchObject({ data: 'Original ciphertext' });
      expect((await d.workspace.getEntity('note'))?.body).toBe('Synthetic reflection');
    },
  );

  it('rejects damaged or incomplete plain archives before any local apply', async () => {
    const d = await device(),
      p = provider();
    await note(d);
    p.put(DROPBOX_ACCOUNT_WORKSPACE_PATH, {
      version: 3,
      protection: 'dropbox-account',
      snapshot: { version: 2, workspace: {} },
    });
    expect(await sync(d, p)).toMatchObject({
      type: 'error',
      message: expect.not.stringContaining('phrase'),
    });
    expect(p.uploads).toHaveLength(0);
    expect((await d.workspace.getEntity('note'))?.body).toBe('Synthetic reflection');
  });

  it('uses strict revision checks during upload and recovers a lost response on retry', async () => {
    const d = await device(),
      p = provider();
    await note(d);
    await sync(d, p);
    await d.workspace.updateEntity('note', (row) => ({ ...row, body: 'Pending change' }));
    p.race(() =>
      p.put(DROPBOX_ACCOUNT_WORKSPACE_PATH, p.files.get(DROPBOX_ACCOUNT_WORKSPACE_PATH)!.body),
    );
    expect(await sync(d, p)).toMatchObject({ type: 'complete' });
    expect(p.conflicts()).toBe(1);
    expect(await sync(d, p)).toMatchObject({ type: 'complete' });
    await d.workspace.updateEntity('note', (row) => ({ ...row, body: 'Lost response change' }));
    p.loseResponse();
    expect(await sync(d, p)).toMatchObject({ type: 'error', recoveryAvailable: true });
    expect(await sync(d, p)).toMatchObject({ type: 'complete', recovered: true });
    const stateKey = await getDropboxDeviceStateKey(connection.accountId);
    const state = createEncryptedSyncStateStore({
      ...stateKey,
      databaseName: d.stateDatabaseName,
      scope: {
        providerId: 'dropbox',
        accountId: connection.accountId,
        workspaceId: (await d.workspace.getWorkspace()).id,
      },
    });
    expect(await state.readJournal()).toBeNull();
  });

  it('fails closed on ambiguous metadata errors, expired authorization, and wrong-account reuse', async () => {
    const d = await device(),
      p = provider();
    await note(d);
    const fetcher = vi.fn(async () => new Response('not_found', { status: 409 })) as typeof fetch;
    expect(await sync(d, p, { fetcher })).toMatchObject({ type: 'error' });
    expect(p.uploads).toHaveLength(0);
    expect(
      await sync(d, p, { connection: { ...connection, expiresAt: '2000-01-01T00:00:00Z' } }),
    ).toMatchObject({ type: 'error', message: expect.stringContaining('Reconnect') });
    await expect(
      sync(d, p, { connection: { ...connection, accountId: 'other-account' } }),
    ).rejects.toThrow('another Dropbox account');
    expect((await d.workspace.getEntity('note'))?.body).toBe('Synthetic reflection');
  });

  it('round-trips generated Unicode article text without a phrase', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ unit: 'grapheme', maxLength: 100 }), async (text) => {
        const a = await device(),
          b = await device(),
          p = provider();
        await note(a, text);
        expect(await sync(a, p)).toMatchObject({ type: 'complete' });
        expect(await sync(b, p)).toMatchObject({ type: 'complete' });
        expect((await b.workspace.getEntity('note'))?.body).toBe(text);
      }),
      { seed: 20261010, numRuns: 20 },
    );
  });

  it('never treats malformed format or forbidden access as an empty account', async () => {
    const p = provider();
    for (const status of [401, 403, 429, 503]) {
      const fetcher = vi.fn(async () => new Response('', { status })) as typeof fetch;
      expect(
        await readDropboxWorkspaceDocument({
          getCredentials: () => connection,
          protection: 'dropbox-account',
          fetcher,
        }),
      ).toMatchObject({ ok: false });
    }
    expect(p.uploads).toHaveLength(0);
  });
});

describe('local-only recovery key', () => {
  it('retains one non-exportable key across reloads and concurrent creation, isolated by account', async () => {
    const [a, b] = await Promise.all([
      getDropboxDeviceStateKey('account'),
      getDropboxDeviceStateKey('account'),
    ]);
    expect(a.salt).toBe(b.salt);
    expect((await getDropboxDeviceStateKey('account')).salt).toBe(a.salt);
    expect((await getDropboxDeviceStateKey('other')).salt).not.toBe(a.salt);
    await expect(crypto.subtle.exportKey('raw', a.key)).rejects.toThrow();
  });
});
