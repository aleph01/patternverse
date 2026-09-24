import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { createSession } from '@patternverse/companion-core';
import { createPrivateMiraStore } from './private-store';

const options = () => ({
  indexedDB,
  crypto: webcrypto as Crypto,
  databaseName: `mira-test-${crypto.randomUUID()}`,
});

describe('private Mira storage', () => {
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
    });

    const second = createPrivateMiraStore(setup);
    expect(await second.list()).toEqual([session]);
    expect(await second.loadSettings()).toMatchObject({
      openRouterKey: 'secret-key',
      activeSessionId: session.id,
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
});
