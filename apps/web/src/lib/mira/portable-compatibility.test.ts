import { webcrypto } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import fixtures from './portable-archive.fixtures.json';
import { exportPortableArchive, importPortableArchive, readPortableArchive } from './portable';
import type { PrivateMiraStore } from './private-store';

const cryptography = webcrypto as Crypto;
const payload = {
  sessions: [fixtures.session],
  promptOverrides: fixtures.settings.promptOverrides,
  runs: fixtures.runs,
};

// v2 was captured from the original exporter. v1 uses the historical envelope and AAD,
// independently encrypted with WebCrypto and accepted by the original reader.
describe('portable archive format compatibility', () => {
  it.each([1, 2] as const)(
    'reads the fixed version %s archive with Unicode content',
    async (version) => {
      expect(
        await readPortableArchive(fixtures[`v${version}`], fixtures.passphrase, cryptography),
      ).toEqual({
        ...payload,
        runs: version === 1 ? [] : fixtures.runs,
      });
    },
  );

  it('retains the exact v2 serializer, crypto parameters and credential allowlist', async () => {
    const deterministic: Crypto = {
      subtle: cryptography.subtle,
      randomUUID: () => '00000000-0000-4000-8000-000000000000',
      getRandomValues(array) {
        if (!(array instanceof Uint8Array)) throw new Error('Expected archive bytes.');
        array.set(Array.from({ length: array.length }, (_, index) => index));
        return array;
      },
    };
    expect(
      await exportPortableArchive(
        payload.sessions,
        fixtures.settings,
        fixtures.passphrase,
        deterministic,
        fixtures.runs,
      ),
    ).toBe(fixtures.v2);
    const restored = await readPortableArchive(fixtures.v2, fixtures.passphrase, cryptography);
    expect(Object.keys(restored).sort()).toEqual(['promptOverrides', 'runs', 'sessions']);
    expect(restored).not.toHaveProperty('openRouterKey');
    expect(restored).not.toHaveProperty('model');
    expect(restored).not.toHaveProperty('activeSessionId');
  });

  it.each([
    ['unsupported format', { format: 'other' }],
    ['unsupported version', { version: 3 }],
    ['unsupported KDF', { kdf: 'other' }],
    ['changed iterations', { iterations: 310001 }],
    ['short salt', { salt: 'AA==' }],
    ['short IV', { iv: 'AA==' }],
    ['short ciphertext', { ciphertext: 'AA==' }],
  ])('retains the envelope error for %s', async (_name, change) => {
    const envelope = JSON.parse(fixtures.v2) as Record<string, unknown>;
    await expect(
      readPortableArchive(
        JSON.stringify({ ...envelope, ...change }),
        fixtures.passphrase,
        cryptography,
      ),
    ).rejects.toThrow('This is not a supported Mira archive.');
  });

  it('rejects wrong passphrases and authenticated-version tampering with the same error', async () => {
    await expect(
      readPortableArchive(fixtures.v2, 'incorrect passphrase', cryptography),
    ).rejects.toThrow('The passphrase is incorrect or the archive is damaged.');
    const envelope = JSON.parse(fixtures.v2) as Record<string, unknown>;
    await expect(
      readPortableArchive(
        JSON.stringify({ ...envelope, version: 1 }),
        fixtures.passphrase,
        cryptography,
      ),
    ).rejects.toThrow('The passphrase is incorrect or the archive is damaged.');
  });

  it('preserves passphrase checks before parsing and the raw archive size limit', async () => {
    await expect(readPortableArchive('invalid JSON', 'short', cryptography)).rejects.toThrow(
      'Use at least eight characters for the archive passphrase.',
    );
    await expect(
      exportPortableArchive([], fixtures.settings, 'short', cryptography),
    ).rejects.toThrow('Use at least eight characters for the archive passphrase.');
    await expect(
      readPortableArchive(' '.repeat(30_000_001), fixtures.passphrase, cryptography),
    ).rejects.toThrow('The archive is too large.');
  });

  it.each([
    ['unmatched session', [{ sessionId: 'other', saved: { checkpoint: 'old' } }]],
    ['duplicate run', [fixtures.runs[0]!, fixtures.runs[0]!]],
    ['missing checkpoint', [{ sessionId: fixtures.session.id, saved: undefined }]],
  ])('rejects %s before starting any store operations', async (_name, runs) => {
    const raw = await exportPortableArchive(
      payload.sessions,
      fixtures.settings,
      fixtures.passphrase,
      cryptography,
      runs,
    );
    const store = {
      list: vi.fn(),
      save: vi.fn(),
      saveRun: vi.fn(),
      loadSettings: vi.fn(),
      saveSettings: vi.fn(),
    } as unknown as PrivateMiraStore;
    const validateRun = vi.fn();
    await expect(
      importPortableArchive(store, raw, fixtures.passphrase, cryptography, validateRun),
    ).rejects.toThrow('The archive contains an invalid guided exercise.');
    expect(validateRun).not.toHaveBeenCalled();
    expect(store.list).not.toHaveBeenCalled();
    expect(store.save).not.toHaveBeenCalled();
    expect(store.saveRun).not.toHaveBeenCalled();
    expect(store.loadSettings).not.toHaveBeenCalled();
    expect(store.saveSettings).not.toHaveBeenCalled();
  });

  it('validates all guided checkpoints before reading or writing the destination store', async () => {
    const store = { list: vi.fn(), save: vi.fn(), saveRun: vi.fn() } as unknown as PrivateMiraStore;
    const failure = new Error('Invalid Rust checkpoint.');
    const validateRun = vi.fn(async () => {
      throw failure;
    });
    await expect(
      importPortableArchive(store, fixtures.v2, fixtures.passphrase, cryptography, validateRun),
    ).rejects.toBe(failure);
    expect(validateRun).toHaveBeenCalledWith(fixtures.runs[0]!.saved);
    expect(store.list).not.toHaveBeenCalled();
    expect(store.save).not.toHaveBeenCalled();
    expect(store.saveRun).not.toHaveBeenCalled();
  });
});
