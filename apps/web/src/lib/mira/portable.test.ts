import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { createSession } from '@patternverse/companion-core';
import { createPrivateMiraStore } from './private-store';
import { exportPortableArchive, importPortableArchive, readPortableArchive } from './portable';

const cryptography = webcrypto as Crypto;
const settings = {
  model: 'a/model',
  openRouterKey: 'never-export-this-key',
  promptOverrides: { narm: 'My prompt' },
  activeSessionId: 'one',
};
const session = createSession('one', 'narm', '2026-09-24T10:00:00Z');

describe('portable Mira archives', () => {
  it('encrypts sessions, excludes API credentials, and round-trips the payload', async () => {
    const raw = await exportPortableArchive([session], settings, 'long passphrase', cryptography);
    expect(raw).not.toContain('never-export-this-key');
    expect(raw).not.toContain('My prompt');
    expect(await readPortableArchive(raw, 'long passphrase', cryptography)).toEqual({
      sessions: [session],
      promptOverrides: { narm: 'My prompt' },
    });
    await expect(readPortableArchive(raw, 'wrong passphrase', cryptography)).rejects.toThrow();
  });

  it('imports collisions as copies, leaving the original intact', async () => {
    const store = createPrivateMiraStore({
      indexedDB,
      crypto: cryptography,
      databaseName: `mira-import-${crypto.randomUUID()}`,
    });
    await store.save(session);
    await store.saveSettings({
      model: '',
      openRouterKey: 'my-current-key',
      promptOverrides: { narm: 'Current prompt' },
      activeSessionId: 'one',
    });
    const raw = await exportPortableArchive([session], settings, 'long passphrase', cryptography);
    expect(await importPortableArchive(store, raw, 'long passphrase', cryptography)).toBe(1);
    const sessions = await store.list();
    expect(sessions).toHaveLength(2);
    expect(sessions.map((item) => item.id)).toContain('one');
    expect(new Set(sessions.map((item) => item.id)).size).toBe(2);
    expect(await store.loadSettings()).toMatchObject({
      openRouterKey: 'my-current-key',
      promptOverrides: { narm: 'Current prompt' },
    });
  });
});
