import { transition, type Session } from '@patternverse/companion-core';
import { validateSession, type MiraSettings, type PrivateMiraStore } from './private-store';
import { validateGuidedSaved } from './guided';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ITERATIONS = 310_000;
const aad = (version: 1 | 2) => encoder.encode(`patternverse-mira-portable-v${version}`);

type Archive = Readonly<{
  format: 'patternverse-mira';
  version: 1 | 2;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}>;

type ArchiveContents = Readonly<{
  sessions: readonly Session[];
  promptOverrides: MiraSettings['promptOverrides'];
  runs: readonly Readonly<{ sessionId: string; saved: unknown }>[];
}>;

/** Produce an encrypted, versioned archive without ever exporting the provider API key. */
export async function exportPortableArchive(
  sessions: readonly Session[],
  settings: MiraSettings,
  passphrase: string,
  cryptography: Crypto = crypto,
  runs: ArchiveContents['runs'] = [],
): Promise<string> {
  requirePassphrase(passphrase);
  const salt = cryptography.getRandomValues(new Uint8Array(16));
  const iv = cryptography.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, cryptography);
  const payload: ArchiveContents = { sessions, promptOverrides: settings.promptOverrides, runs };
  const ciphertext = await cryptography.subtle.encrypt(
    { name: 'AES-GCM', iv: buffer(iv), additionalData: buffer(aad(2)) },
    key,
    buffer(encoder.encode(JSON.stringify(payload))),
  );
  return JSON.stringify({
    format: 'patternverse-mira',
    version: 2,
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: base64(salt),
    iv: base64(iv),
    ciphertext: base64(new Uint8Array(ciphertext)),
  } satisfies Archive);
}

/** Decrypt and validate everything before any imported session is written. */
export async function readPortableArchive(
  raw: string,
  passphrase: string,
  cryptography: Crypto = crypto,
): Promise<ArchiveContents> {
  requirePassphrase(passphrase);
  if (raw.length > 30_000_000) throw new Error('The archive is too large.');
  const archive = parseArchive(raw);
  const key = await deriveKey(passphrase, fromBase64(archive.salt), cryptography);
  let decrypted: ArrayBuffer;
  try {
    decrypted = await cryptography.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: buffer(fromBase64(archive.iv)),
        additionalData: buffer(aad(archive.version)),
      },
      key,
      buffer(fromBase64(archive.ciphertext)),
    );
  } catch {
    throw new Error('The passphrase is incorrect or the archive is damaged.');
  }
  const payload: unknown = JSON.parse(decoder.decode(decrypted));
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.sessions) ||
    payload.sessions.length > 2000 ||
    !isRecord(payload.promptOverrides) ||
    Object.keys(payload.promptOverrides).length > 20 ||
    !Object.values(payload.promptOverrides).every(
      (value) => typeof value === 'string' && value.length <= 30000,
    )
  ) {
    throw new Error('The archive contents are invalid.');
  }
  const sessions = payload.sessions.map((value) => {
    if (!isRecord(value) || typeof value.id !== 'string')
      throw new Error('The archive contains an invalid session.');
    return validateSession(value, value.id);
  });
  const runs = archive.version === 1 ? [] : payload.runs;
  if (
    !Array.isArray(runs) ||
    runs.length > sessions.length ||
    !runs.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.sessionId === 'string' &&
        entry.saved !== undefined &&
        sessions.some((session) => session.id === entry.sessionId) &&
        JSON.stringify(entry.saved).length <= 8 * 1024 * 1024,
    ) ||
    new Set(runs.map((entry) => entry.sessionId)).size !== runs.length
  )
    throw new Error('The archive contains an invalid guided exercise.');
  return {
    sessions,
    promptOverrides: payload.promptOverrides as Record<string, string>,
    runs: runs as ArchiveContents['runs'],
  };
}

/** Merge a user-selected archive without overwriting existing sessions or prompts. */
export async function importPortableArchive(
  store: PrivateMiraStore,
  raw: string,
  passphrase: string,
  cryptography: Crypto = crypto,
  validateRun: (saved: unknown) => Promise<void> = validateGuidedSaved,
): Promise<number> {
  const payload = await readPortableArchive(raw, passphrase, cryptography);
  await Promise.all(payload.runs.map((run) => validateRun(run.saved)));
  const existing = await store.list();
  const ids = new Set(existing.map((session) => session.id));
  const importedIds = new Map<string, string>();
  const imports = payload.sessions.map((session) => {
    let id = session.id;
    while (ids.has(id)) id = cryptography.randomUUID();
    ids.add(id);
    importedIds.set(session.id, id);
    const unique = id === session.id ? session : { ...session, id };
    return unique.pendingReplyId
      ? transition(unique, {
          type: 'reply-failed',
          replyId: unique.pendingReplyId,
          at: new Date().toISOString(),
        }).session
      : unique;
  });
  for (const session of imports) await store.save(session);
  for (const run of payload.runs) {
    const id = importedIds.get(run.sessionId);
    if (!id) throw new Error('The archive contains an unmatched guided exercise.');
    await store.saveRun(id, run.saved, null);
  }
  const settings = await store.loadSettings();
  await store.saveSettings({
    ...settings,
    promptOverrides: { ...payload.promptOverrides, ...settings.promptOverrides },
  });
  return imports.length;
}

function parseArchive(raw: string): Archive {
  const value: unknown = JSON.parse(raw);
  if (
    !isRecord(value) ||
    value.format !== 'patternverse-mira' ||
    (value.version !== 1 && value.version !== 2) ||
    value.kdf !== 'PBKDF2-SHA256' ||
    value.iterations !== ITERATIONS ||
    typeof value.salt !== 'string' ||
    typeof value.iv !== 'string' ||
    typeof value.ciphertext !== 'string' ||
    fromBase64(value.salt).length !== 16 ||
    fromBase64(value.iv).length !== 12 ||
    fromBase64(value.ciphertext).length < 16
  )
    throw new Error('This is not a supported Mira archive.');
  return value as Archive;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  cryptography: Crypto,
): Promise<CryptoKey> {
  const material = await cryptography.subtle.importKey(
    'raw',
    buffer(encoder.encode(passphrase)),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return cryptography.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: buffer(salt) },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function requirePassphrase(passphrase: string): void {
  if (passphrase.length < 8)
    throw new Error('Use at least eight characters for the archive passphrase.');
}

function buffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}
function base64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
}
function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
