import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { claimDropboxWorkspace } from './dropbox-account';
import { forgetDropboxSyncKey, syncWithDropbox } from './dropbox-sync';
import type { LocalWorkspace } from '@patternverse/workspace';
import type { PrivateMiraStore } from '$lib/mira/private-store';

beforeEach(() => vi.stubGlobal('indexedDB', new IDBFactory()));
afterEach(() => vi.unstubAllGlobals());

describe('Dropbox workspace ownership', () => {
  it('adopts a single legacy account and rejects a different account', async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('patternverse-cross-device-sync-v1', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('keys').put({}, 'alice');
        request.result.createObjectStore('bases');
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
    await expect(claimDropboxWorkspace('bob')).rejects.toThrow('another Dropbox account');
    await forgetDropboxSyncKey('alice');
    await expect(claimDropboxWorkspace('bob')).rejects.toThrow('another Dropbox account');
    await expect(claimDropboxWorkspace('alice')).resolves.toBeUndefined();
  });
  it('allows reconnecting the owner but preserves ownership after disconnect', async () => {
    await claimDropboxWorkspace('alice');
    await forgetDropboxSyncKey('alice');
    await expect(claimDropboxWorkspace('alice')).resolves.toBeUndefined();
    await expect(claimDropboxWorkspace('bob')).rejects.toThrow('another Dropbox account');
  });

  it('blocks a second account before reading or transmitting any workspace data', async () => {
    await claimDropboxWorkspace('alice');
    const fetcher = vi.fn();
    const list = vi.fn();
    await expect(
      syncWithDropbox({
        connection: { accountId: 'bob', accessToken: 'test', expiresAt: '2099-01-01' },
        workspace: { listEntities: list } as unknown as LocalWorkspace,
        mira: { list } as unknown as PrivateMiraStore,
        fetcher,
      }),
    ).rejects.toThrow('another Dropbox account');
    expect(fetcher).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });

  it('serializes simultaneous account claims from different tabs', async () => {
    const results = await Promise.allSettled([
      claimDropboxWorkspace('alice'),
      claimDropboxWorkspace('bob'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });

  it('migrates a legacy owner and refuses ambiguous legacy accounts', async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('patternverse-cross-device-sync-v1', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('keys').put({}, 'alice');
        request.result.createObjectStore('bases').put({}, 'bob');
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
    await expect(claimDropboxWorkspace('alice')).rejects.toThrow('another Dropbox account');
    await expect(claimDropboxWorkspace('bob')).rejects.toThrow('another Dropbox account');
  });

  it('keeps separate browser profiles independent', async () => {
    await claimDropboxWorkspace('alice');
    vi.stubGlobal('indexedDB', new IDBFactory());
    await expect(claimDropboxWorkspace('bob')).resolves.toBeUndefined();
  });
});
