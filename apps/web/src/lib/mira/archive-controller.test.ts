import { webcrypto } from 'node:crypto';
import { indexedDB } from 'fake-indexeddb';
import { createSession } from '@patternverse/companion-core';
import { describe, expect, it, vi } from 'vitest';
import { createMiraArchive } from './archive-controller';
import { exportPortableArchive, readPortableArchive } from './portable';
import { createPrivateMiraStore, type MiraSettings, type PrivateMiraStore } from './private-store';

const cryptography = webcrypto as Crypto;
const at = '2026-10-10T12:00:00.000Z';
const session = createSession('one', 'cbt', at);
const passphrase = 'test archive phrase';
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
async function setup() {
  const store = createPrivateMiraStore({
    indexedDB,
    crypto: cryptography,
    databaseName: `mira-archive-controller-${crypto.randomUUID()}`,
  });
  await store.save(session);
  let available: PrivateMiraStore | undefined = store;
  let sessions = [session];
  let settings: MiraSettings = {
    model: 'test/model',
    openRouterKey: 'secret-keep-local',
    promptOverrides: { cbt: 'Private prompt' },
    activeSessionId: session.id,
    monthlyBudgetUsd: 10,
  };
  await store.saveSettings(settings);
  const ports = {
    store: () => available,
    sessions: () => sessions,
    settings: () => settings,
    cryptography: () => cryptography,
    now: () => at,
    download: vi.fn(),
    refresh: vi.fn(async () => {
      sessions = [...(await store.list())];
      settings = await store.loadSettings();
    }),
    busyChanged: vi.fn(),
    clearMessages: vi.fn(),
    error: vi.fn(),
    notice: vi.fn(),
    exported: vi.fn(),
    imported: vi.fn(),
  };
  return {
    store,
    ports,
    controller: createMiraArchive(ports),
    disconnect: () => {
      available = undefined;
    },
    changeSession: () => {
      sessions = [createSession('two', 'dbt', at)];
      settings = { ...settings, promptOverrides: { dbt: 'Changed later' } };
    },
  };
}

describe('Mira explicit archive transfers', () => {
  it('exports through the existing encryption codec and excludes credentials', async () => {
    const test = await setup();
    await test.controller.export(passphrase);
    expect(test.ports.download).toHaveBeenCalledTimes(1);
    const [raw, filename] = test.ports.download.mock.calls[0];
    expect(filename).toBe('patternverse-mira-2026-10-10.json');
    expect(raw).not.toContain('secret-keep-local');
    expect(await readPortableArchive(raw, passphrase, cryptography)).toEqual({
      sessions: [session],
      promptOverrides: { cbt: 'Private prompt' },
      runs: [],
    });
    expect(test.ports.exported).toHaveBeenCalledTimes(1);
    expect(test.ports.busyChanged.mock.calls).toEqual([[true], [false]]);
  });

  it('snapshots the selected sessions and prompts before loading their saved runs', async () => {
    const test = await setup();
    const gate = deferred<null>();
    vi.spyOn(test.store, 'loadRun').mockReturnValue(gate.promise);
    const exporting = test.controller.export(passphrase);
    test.changeSession();
    gate.resolve(null);
    await exporting;
    const [raw] = test.ports.download.mock.calls[0];
    expect(await readPortableArchive(raw, passphrase, cryptography)).toMatchObject({
      sessions: [session],
      promptOverrides: { cbt: 'Private prompt' },
    });
  });

  it('imports collisions as copies and refreshes without replacing existing sessions or settings', async () => {
    const test = await setup();
    const raw = await exportPortableArchive(
      [session],
      {
        model: 'other/model',
        openRouterKey: 'other-key',
        promptOverrides: { cbt: 'Imported prompt' },
        activeSessionId: null,
      },
      passphrase,
      cryptography,
    );
    await test.controller.import({ text: async () => raw }, passphrase);
    expect(await test.store.load('one')).toEqual(session);
    expect(await test.store.list()).toHaveLength(2);
    expect(await test.store.loadSettings()).toMatchObject({
      openRouterKey: 'secret-keep-local',
      model: 'test/model',
      promptOverrides: { cbt: 'Private prompt' },
    });
    expect(test.ports.refresh).toHaveBeenCalledTimes(1);
    expect(test.ports.imported).toHaveBeenCalledTimes(1);
    expect(test.ports.notice).toHaveBeenCalledWith(
      'Imported 1 session without replacing existing sessions.',
    );
  });

  it('retains the selection/passphrase after an invalid archive and resets busy', async () => {
    const test = await setup();
    await test.controller.import({ text: async () => '{}' }, passphrase);
    expect(test.ports.error).toHaveBeenCalledTimes(1);
    expect(test.ports.imported).not.toHaveBeenCalled();
    expect(test.ports.refresh).not.toHaveBeenCalled();
    expect(await test.store.list()).toEqual([session]);
    expect(test.ports.busyChanged.mock.calls).toEqual([[true], [false]]);
  });

  it('serializes import and export actions while a file is being read', async () => {
    const test = await setup();
    const gate = deferred<string>();
    const file = { text: vi.fn(() => gate.promise) };
    const importing = test.controller.import(file, passphrase);
    await test.controller.import(file, passphrase);
    await test.controller.export(passphrase);
    expect(file.text).toHaveBeenCalledTimes(1);
    expect(test.ports.download).not.toHaveBeenCalled();
    gate.resolve('{}');
    await importing;
    await test.controller.export(passphrase);
    expect(test.ports.download).toHaveBeenCalledTimes(1);
  });

  it('does not start import writes if disposed while reading the file', async () => {
    const test = await setup();
    const gate = deferred<string>();
    const importing = test.controller.import({ text: () => gate.promise }, passphrase);
    test.controller.dispose();
    gate.resolve(
      await exportPortableArchive(
        [session],
        await test.store.loadSettings(),
        passphrase,
        cryptography,
      ),
    );
    await importing;
    expect(await test.store.list()).toEqual([session]);
    expect(test.ports.refresh).not.toHaveBeenCalled();
    expect(test.ports.imported).not.toHaveBeenCalled();
    expect(test.ports.error).not.toHaveBeenCalled();
    expect(test.ports.busyChanged.mock.calls).toEqual([[true]]);
  });

  it('does not download or update UI after disposal during an export', async () => {
    const test = await setup();
    const gate = deferred<null>();
    vi.spyOn(test.store, 'loadRun').mockReturnValue(gate.promise);
    const exporting = test.controller.export(passphrase);
    test.controller.dispose();
    gate.resolve(null);
    await exporting;
    expect(test.ports.download).not.toHaveBeenCalled();
    expect(test.ports.exported).not.toHaveBeenCalled();
    expect(test.ports.notice).not.toHaveBeenCalled();
    expect(test.ports.busyChanged.mock.calls).toEqual([[true]]);
  });

  it('keeps error publication suppressed if file reading fails after disposal', async () => {
    const test = await setup();
    const file = deferred<string>();
    const importing = test.controller.import(
      {
        text: async () => {
          await file.promise;
          throw new Error('Read failed');
        },
      },
      passphrase,
    );
    test.controller.dispose();
    file.resolve('');
    await importing;
    expect(test.ports.error).not.toHaveBeenCalled();
  });

  it('reports export failures and permits retry without clearing the passphrase', async () => {
    const test = await setup();
    await test.controller.export('short');
    expect(test.ports.error).toHaveBeenCalledTimes(1);
    expect(test.ports.exported).not.toHaveBeenCalled();
    expect(test.ports.busyChanged.mock.calls).toEqual([[true], [false]]);
    await test.controller.export(passphrase);
    expect(test.ports.download).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a store/file or after disposal', async () => {
    const test = await setup();
    await test.controller.import(null, passphrase);
    test.disconnect();
    await test.controller.export(passphrase);
    await test.controller.import({ text: async () => '{}' }, passphrase);
    test.controller.dispose();
    await test.controller.export(passphrase);
    expect(test.ports.busyChanged).not.toHaveBeenCalled();
    expect(test.ports.download).not.toHaveBeenCalled();
  });
});
