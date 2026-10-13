import { webcrypto } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { createSession } from '@patternverse/companion-core';
import { createPrivateMiraStore } from './private-store';
import * as changes from '$lib/client/workspace-changes';

const options = () => ({
  indexedDB,
  crypto: webcrypto as Crypto,
  databaseName: `mira-test-${crypto.randomUUID()}`,
});

describe('private Mira storage', () => {
  it('emits content-free local/sync invalidations, never for credentials or live checkpoints', async () => {
    const spy = vi.spyOn(changes, 'notifyWorkspaceChanged');
    try {
      const store = createPrivateMiraStore(options());
      const one = createSession('synthetic-session', 'cbt', '2026-10-10T12:00:00Z');
      await store.save(one);
      await store.saveSettings({
        model: 'model',
        openRouterKey: 'synthetic-secret',
        promptOverrides: {},
        activeSessionId: one.id,
      });
      expect(spy).toHaveBeenCalledExactlyOnceWith({ origin: 'local', topics: ['mira-sessions'] });
      await store.applySyncSessions([one], [{ ...one, title: 'Remote' }]);
      expect(spy).toHaveBeenLastCalledWith({ origin: 'sync', topics: ['mira-sessions'] });
      await store.saveRun(one.id, { privateAnswer: 'unsaved' }, null);
      expect(spy).toHaveBeenCalledTimes(2);
      await store.remove(one.id);
      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenLastCalledWith({ origin: 'local', topics: ['mira-sessions'] });
    } finally {
      spy.mockRestore();
    }
  });
  it('applies synced conversations atomically and idempotently, leaving settings and unrelated sessions alone', async () => {
    const setup = options(),
      first = createPrivateMiraStore(setup),
      second = createPrivateMiraStore(setup);
    const one = createSession('one', 'cbt', '2026-10-09T10:00:00Z');
    const two = createSession('two', 'cbt', '2026-10-09T10:00:00Z');
    await first.save(one);
    await first.save(two);
    const expected = await first.list();
    await second.save(createSession('new-local', 'cbt', '2026-10-09T10:00:00Z'));
    await first.saveSettings({
      model: 'local',
      openRouterKey: 'secret',
      promptOverrides: {},
      activeSessionId: 'one',
    });
    const desired = [{ ...one, title: 'Remote title' }];
    await first.applySyncSessions(expected, desired);
    await second.applySyncSessions(expected, desired);
    expect((await second.list()).map((s) => s.id).sort()).toEqual(['new-local', 'one']);
    expect((await first.load('one'))?.title).toBe('Remote title');
    expect((await first.loadSettings()).openRouterKey).toBe('secret');
  });

  it('rejects stale conversations without applying any other change in the batch', async () => {
    const store = createPrivateMiraStore(options());
    const one = createSession('one', 'cbt', '2026-10-09T10:00:00Z'),
      two = createSession('two', 'cbt', '2026-10-09T10:00:00Z');
    await store.save(one);
    await store.save(two);
    const expected = await store.list();
    await store.save({ ...one, title: 'Later local edit' });
    await expect(store.applySyncSessions(expected, [{ ...one, title: 'Remote' }])).rejects.toThrow(
      'changed while syncing',
    );
    expect(await store.load('two')).toEqual(two);
    expect((await store.load('one'))?.title).toBe('Later local edit');
  });

  it('preserves in-flight replies and device-local practice checkpoints', async () => {
    const store = createPrivateMiraStore(options());
    const one = createSession('one', 'cbt', '2026-10-09T10:00:00Z');
    await store.save(one);
    await store.save({ ...one, pendingReplyId: 'reply' });
    await expect(store.applySyncSessions([one], [])).rejects.toThrow('reply is in progress');
    expect((await store.load('one'))?.pendingReplyId).toBe('reply');
    await store.save(one);
    const token = await store.saveRun('one', { privateAnswer: 'Unsaved on this device' }, null);
    await expect(store.applySyncSessions([one], [{ ...one, title: 'Remote' }])).rejects.toThrow(
      'device-local Mira practice',
    );
    expect((await store.loadRun('one'))?.token).toBe(token);
    expect(await store.load('one')).toEqual(one);
  });

  it('detects a write racing with encryption and rolls back every session write', async () => {
    const setup = options(),
      first = createPrivateMiraStore(setup),
      second = createPrivateMiraStore(setup);
    const one = createSession('one', 'cbt', '2026-10-09T10:00:00Z'),
      two = createSession('two', 'cbt', '2026-10-09T10:00:00Z');
    await first.save(one);
    await first.save(two);
    const originalEncrypt = webcrypto.subtle.encrypt.bind(webcrypto.subtle);
    let raced = false;
    const spy = vi.spyOn(webcrypto.subtle, 'encrypt').mockImplementation(async (...args) => {
      const result = await originalEncrypt(...args);
      if (!raced) {
        raced = true;
        await second.save({ ...one, title: 'Raced local write' });
      }
      return result;
    });
    try {
      await expect(
        first.applySyncSessions(
          [one, two],
          [
            { ...one, title: 'Remote one' },
            { ...two, title: 'Remote two' },
          ],
        ),
      ).rejects.toThrow('changed while syncing');
    } finally {
      spy.mockRestore();
    }
    expect((await first.load('one'))?.title).toBe('Raced local write');
    expect(await first.load('two')).toEqual(two);
  });
  it('encrypts sessions and settings, and restores them after reopening', async () => {
    const setup = options();
    const first = createPrivateMiraStore(setup);
    const session = {
      ...createSession('session-one', 'narm', '2026-09-24T10:00:00Z'),
      messages: [
        {
          id: 'message-one',
          role: 'user' as const,
          text: 'Private words',
          createdAt: '2026-09-24T10:00:00Z',
        },
      ],
    };
    await first.save(session);
    await first.saveSettings({
      model: 'a/model',
      openRouterKey: 'secret-key',
      promptOverrides: {},
      activeSessionId: session.id,
      monthlyBudgetUsd: 5,
    });

    const second = createPrivateMiraStore(setup);
    expect(await second.list()).toEqual([session]);
    expect(await second.loadSettings()).toMatchObject({
      openRouterKey: 'secret-key',
      activeSessionId: session.id,
      monthlyBudgetUsd: 5,
    });
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(setup.databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const raw = await new Promise<unknown>((resolve) => {
        const request = database.transaction('sessions').objectStore('sessions').get(session.id);
        request.onsuccess = () => resolve(request.result);
      });
      expect(JSON.stringify(raw)).not.toContain('Private words');
      expect(JSON.stringify(raw)).not.toContain('secret-key');
    } finally {
      database.close();
    }
  });

  it('keeps deletion scoped to the selected session', async () => {
    const store = createPrivateMiraStore(options());
    await store.save(createSession('one', 'narm', '2026-09-24T10:00:00Z'));
    await store.save(createSession('two', 'cbt', '2026-09-24T10:00:01Z'));
    await store.remove('one');
    expect(await store.load('one')).toBeNull();
    expect((await store.list()).map((session) => session.id)).toEqual(['two']);
  });

  it('encrypts exercise checkpoints and rejects stale cross-tab writes', async () => {
    const setup = options();
    const first = createPrivateMiraStore(setup);
    const second = createPrivateMiraStore(setup);
    await first.save(createSession('guided', 'cbt', '2026-09-25T10:00:00Z'));
    const initial = { privateAnswer: 'Only in encrypted bytes', revision: 0 };
    const token = await first.saveRun('guided', initial, null);
    expect(await second.loadRun('guided')).toEqual({ saved: initial, token });
    const nextToken = await second.saveRun('guided', { ...initial, revision: 1 }, token);
    await expect(first.saveRun('guided', { ...initial, revision: 2 }, token)).rejects.toThrow(
      'Exercise changed elsewhere',
    );
    expect((await first.loadRun('guided'))?.token).toBe(nextToken);
    const database = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open(setup.databaseName);
      request.onsuccess = () => resolve(request.result);
    });
    try {
      const raw = await new Promise<unknown>((resolve) => {
        const request = database.transaction('runs').objectStore('runs').get('guided');
        request.onsuccess = () => resolve(request.result);
      });
      expect(JSON.stringify(raw)).not.toContain(initial.privateAnswer);
    } finally {
      database.close();
    }
    await first.remove('guided');
    expect(await second.loadRun('guided')).toBeNull();
  });
});
