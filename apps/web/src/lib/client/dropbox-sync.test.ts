import { webcrypto } from 'node:crypto';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '@patternverse/companion-core';
import { createIndexedDbWorkspace, type RawEntity } from '@patternverse/workspace';
import { createPrivateMiraStore } from '$lib/mira/private-store';
import {
  forgetDropboxSyncKey,
  hasDropboxSyncKey,
  mergeSnapshots,
  syncWithDropbox,
  type SyncSnapshot,
} from './dropbox-sync';

const pattern = (title: string): RawEntity => ({
  id: 'one',
  sourceId: 'personal',
  type: 'pattern',
  status: 'draft',
  title,
  body: '',
});
const session = (title: string) => ({
  ...createSession('session', 'narm', '2026-09-26T10:00:00Z'),
  title,
});
const snapshot = (
  entities: readonly RawEntity[] = [],
  sessions: SyncSnapshot['sessions'] = [],
): SyncSnapshot => ({ version: 1, entities, sessions });

describe('cross-device merge', () => {
  it('unions independent phone and desktop changes', () => {
    const result = mergeSnapshots(
      snapshot(),
      snapshot([pattern('From phone')]),
      snapshot([], [session('From desktop')]),
    );
    expect(result.conflicts).toEqual([]);
    expect(result.snapshot.entities.map((item) => item.title)).toEqual(['From phone']);
    expect(result.snapshot.sessions.map((item) => item.title)).toEqual(['From desktop']);
  });

  it('propagates a deletion made on one device', () => {
    const result = mergeSnapshots(
      snapshot([pattern('Original')]),
      snapshot(),
      snapshot([pattern('Original')]),
    );
    expect(result.conflicts).toEqual([]);
    expect(result.snapshot.entities).toEqual([]);
  });

  it('requires an explicit choice when the same conversation changes on both devices', () => {
    const base = snapshot([], [session('Original')]);
    const local = snapshot([], [session('Phone')]);
    const remote = snapshot([], [session('Desktop')]);
    expect(mergeSnapshots(base, local, remote).conflicts).toEqual([
      { key: 'session:session', title: 'Phone' },
    ]);
    expect(
      mergeSnapshots(base, local, remote, { 'session:session': 'remote' }).snapshot.sessions,
    ).toEqual(remote.sessions);
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('encrypted Dropbox exchange', () => {
  it('transfers the personal library and conversations without storing plaintext remotely', async () => {
    vi.stubGlobal('indexedDB', indexedDB);
    vi.stubGlobal('crypto', webcrypto);
    const firstWorkspace = createIndexedDbWorkspace({
      indexedDB,
      IDBKeyRange,
      databaseName: `sync-workspace-a-${crypto.randomUUID()}`,
    });
    const secondWorkspace = createIndexedDbWorkspace({
      indexedDB,
      IDBKeyRange,
      databaseName: `sync-workspace-b-${crypto.randomUUID()}`,
    });
    const firstMira = createPrivateMiraStore({
      indexedDB,
      crypto: webcrypto as Crypto,
      databaseName: `sync-mira-a-${crypto.randomUUID()}`,
    });
    const secondMira = createPrivateMiraStore({
      indexedDB,
      crypto: webcrypto as Crypto,
      databaseName: `sync-mira-b-${crypto.randomUUID()}`,
    });
    await firstWorkspace.createEntity(pattern('Private pattern'));
    await firstWorkspace.createEntity({
      id: 'idea',
      type: 'concept',
      status: 'draft',
      title: 'Private concept',
      body: '',
    });
    await firstMira.save(session('Private conversation'));
    let remote: string | null = null;
    let revision = 0;
    const fetcher = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      if (String(url).endsWith('/download')) {
        return remote === null
          ? new Response('path/not_found/', { status: 409 })
          : new Response(remote, {
              status: 200,
              headers: { 'Dropbox-API-Result': JSON.stringify({ rev: `rev-${revision}` }) },
            });
      }
      remote = String(options?.body);
      revision += 1;
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
    const connection = {
      accessToken: 'test-token',
      accountId: `account-${crypto.randomUUID()}`,
      expiresAt: '2099-01-01T00:00:00Z',
    };

    await expect(
      syncWithDropbox({
        connection,
        workspace: firstWorkspace,
        mira: firstMira,
        phrase: 'a long private sync phrase',
        fetcher,
      }),
    ).resolves.toMatchObject({ type: 'complete', entities: 2, sessions: 1 });
    expect(remote).not.toContain('Private pattern');
    expect(remote).not.toContain('Private concept');
    expect(remote).not.toContain('Private conversation');
    await forgetDropboxSyncKey(connection.accountId);
    await expect(
      syncWithDropbox({
        connection,
        workspace: secondWorkspace,
        mira: secondMira,
        phrase: 'the wrong private phrase',
        fetcher,
      }),
    ).rejects.toThrow('did not unlock');
    expect(await hasDropboxSyncKey(connection.accountId)).toBe(false);
    await expect(
      syncWithDropbox({
        connection,
        workspace: secondWorkspace,
        mira: secondMira,
        phrase: 'a long private sync phrase',
        fetcher,
      }),
    ).resolves.toMatchObject({ type: 'complete', entities: 2, sessions: 1 });
    expect((await secondWorkspace.listEntities()).map((item) => item.title).sort()).toEqual([
      'Private concept',
      'Private pattern',
    ]);
    expect((await secondMira.list())[0]?.title).toBe('Private conversation');
    firstWorkspace.close();
    secondWorkspace.close();
  });
});
