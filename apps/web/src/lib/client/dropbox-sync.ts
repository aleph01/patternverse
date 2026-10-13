import type { CreatePersonalEntityInput, LocalWorkspace } from '@patternverse/workspace';
import type { PrivateMiraStore } from '$lib/mira/private-store';
import type { DropboxConnection } from './dropbox-auth';
import { claimDropboxWorkspace } from './dropbox-account';
import { parseLegacySyncSnapshot, type LegacySyncSnapshot } from './sync-snapshot';
import {
  deriveSyncKey,
  MAX_SYNC_DOCUMENT_BYTES,
  openSyncDocument,
  randomSyncBytes as randomBytes,
  sealSyncDocument,
  syncBase64 as base64,
  syncUnbase64 as unbase64,
  type SyncEnvelope,
} from './sync-envelope';

const FILE_PATH = '/patternverse-sync-v1.json';
const DATABASE = 'patternverse-cross-device-sync-v1';
const MAX_FILE_BYTES = MAX_SYNC_DOCUMENT_BYTES;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type SyncSnapshot = LegacySyncSnapshot;
export type SyncConflict = Readonly<{ key: string; title: string }>;
export type SyncChoice = 'local' | 'remote';
export type SyncResult =
  | Readonly<{ type: 'complete'; entities: number; sessions: number }>
  | Readonly<{ type: 'conflicts'; conflicts: readonly SyncConflict[]; token: string }>;

type Envelope = SyncEnvelope<1>;
type RemoteDocument = Readonly<{ revision: string | null; envelope: Envelope | null }>;
type StoredKey = Readonly<{ salt: string; key: CryptoKey }>;
type SealedBase = Readonly<{ iv: string; data: string }>;

/** Synchronize local-first records through one encrypted Dropbox App Folder document. */
export async function syncWithDropbox(
  input: Readonly<{
    connection: DropboxConnection;
    workspace: LocalWorkspace;
    mira: PrivateMiraStore;
    phrase?: string;
    choices?: Readonly<Record<string, SyncChoice>>;
    expectedConflictToken?: string;
    fetcher?: typeof fetch;
  }>,
): Promise<SyncResult> {
  const { connection, workspace, mira } = input;
  await claimDropboxWorkspace(connection.accountId);
  const remote = await readRemote(connection.accessToken, input.fetcher ?? fetch);
  const salt =
    remote.envelope?.salt ?? (await loadKey(connection.accountId))?.salt ?? base64(randomBytes(16));
  const key = await unlockKey(connection.accountId, salt, input.phrase);
  const remoteSnapshot = remote.envelope
    ? await unsealSnapshot(remote.envelope, key)
    : emptySnapshot();
  const local = await localSnapshot(workspace, mira);
  const conflictToken = await snapshotToken(local, remote.revision);
  if (input.expectedConflictToken && input.expectedConflictToken !== conflictToken)
    throw new Error(
      'Local or Dropbox data changed after you reviewed the conflicts. Sync again to review the latest versions.',
    );
  const base = (await loadBase(connection.accountId, key)) ?? emptySnapshot();
  if (input.phrase) await saveKey(connection.accountId, salt, key);
  const merged = mergeSnapshots(base, local, remoteSnapshot, input.choices ?? {});
  if (merged.conflicts.length)
    return { type: 'conflicts', conflicts: merged.conflicts, token: conflictToken };

  const envelope = await sealSnapshot(merged.snapshot, key, salt);
  await writeRemote(connection.accessToken, remote.revision, envelope, input.fetcher ?? fetch);
  await applySnapshot(merged.snapshot, workspace, mira);
  await saveBase(connection.accountId, key, merged.snapshot);
  return {
    type: 'complete',
    entities: merged.snapshot.entities.length,
    sessions: merged.snapshot.sessions.length,
  };
}

/** A remembered device key avoids asking for the sync phrase on every launch. */
export async function hasDropboxSyncKey(accountId: string): Promise<boolean> {
  return Boolean(await loadKey(accountId));
}

export async function forgetDropboxSyncKey(accountId: string): Promise<void> {
  // Upgrade legacy ownership before erasing the only records identifying its account.
  await claimDropboxWorkspace(accountId);
  await withDatabase((database) => write(database, 'keys', accountId, undefined));
  await withDatabase((database) => write(database, 'bases', accountId, undefined));
}

export function mergeSnapshots(
  base: SyncSnapshot,
  local: SyncSnapshot,
  remote: SyncSnapshot,
  choices: Readonly<Record<string, SyncChoice>> = {},
): { snapshot: SyncSnapshot; conflicts: readonly SyncConflict[] } {
  const conflicts: SyncConflict[] = [];
  const merge = <T extends { id: string; title: string }>(
    kind: string,
    baseItems: readonly T[],
    localItems: readonly T[],
    remoteItems: readonly T[],
  ): T[] => {
    const before = new Map(baseItems.map((item) => [item.id, item]));
    const here = new Map(localItems.map((item) => [item.id, item]));
    const there = new Map(remoteItems.map((item) => [item.id, item]));
    const ids = new Set([...before.keys(), ...here.keys(), ...there.keys()]);
    return [...ids].flatMap((id) => {
      const ancestor = before.get(id);
      const current = here.get(id);
      const other = there.get(id);
      const localChanged = !same(ancestor, current);
      const remoteChanged = !same(ancestor, other);
      const key = `${kind}:${id}`;
      if (localChanged && remoteChanged && !same(current, other) && !choices[key]) {
        conflicts.push({ key, title: current?.title ?? other?.title ?? ancestor?.title ?? id });
        return [];
      }
      const selected =
        choices[key] === 'local'
          ? current
          : choices[key] === 'remote'
            ? other
            : localChanged
              ? current
              : other;
      return selected ? [selected] : [];
    });
  };
  return {
    snapshot: {
      version: 1,
      entities: merge('entity', base.entities, local.entities, remote.entities),
      sessions: merge('session', base.sessions, local.sessions, remote.sessions),
    },
    conflicts,
  };
}

const emptySnapshot = (): SyncSnapshot => ({ version: 1, entities: [], sessions: [] });
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
async function snapshotToken(snapshot: SyncSnapshot, revision: string | null): Promise<string> {
  const bytes = encoder.encode(`${revision ?? 'new'}:${JSON.stringify(snapshot)}`);
  return base64(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
}

async function localSnapshot(
  workspace: LocalWorkspace,
  mira: PrivateMiraStore,
): Promise<SyncSnapshot> {
  const [entities, sessions] = await Promise.all([workspace.listEntities(), mira.list()]);
  return { version: 1, entities, sessions };
}

async function applySnapshot(
  snapshot: SyncSnapshot,
  workspace: LocalWorkspace,
  mira: PrivateMiraStore,
): Promise<void> {
  const existing = await workspace.listEntities();
  const wanted = new Map(snapshot.entities.map((entity) => [entity.id, entity]));
  for (const entity of existing) {
    if (!wanted.has(entity.id)) await workspace.deleteEntity(entity.id);
  }
  for (const entity of snapshot.entities) {
    const current = existing.find((item) => item.id === entity.id);
    if (!current) await workspace.createEntity(entity as CreatePersonalEntityInput);
    else if (!same(current, entity)) await workspace.updateEntity(entity.id, () => entity);
  }
  const savedSessions = await mira.list();
  const wantedSessions = new Set(snapshot.sessions.map((session) => session.id));
  for (const session of savedSessions)
    if (!wantedSessions.has(session.id)) await mira.remove(session.id);
  for (const session of snapshot.sessions) await mira.save(session);
}

function validateSnapshot(value: unknown): SyncSnapshot {
  return parseLegacySyncSnapshot(value);
}

async function unlockKey(accountId: string, salt: string, phrase?: string): Promise<CryptoKey> {
  const saved = await loadKey(accountId);
  if (saved?.salt === salt && !phrase) return saved.key;
  if (!phrase) throw new Error('Enter your sync phrase to link this device.');
  return deriveSyncKey(phrase, salt);
}

/** Shared device key cache for the legacy and workspace adapters, not a new credential store. */
export async function saveKey(accountId: string, salt: string, key: CryptoKey): Promise<void> {
  await withDatabase((database) => write(database, 'keys', accountId, { salt, key }));
}

async function sealSnapshot(
  snapshot: SyncSnapshot,
  key: CryptoKey,
  salt: string,
): Promise<Envelope> {
  return sealSyncDocument(encoder.encode(JSON.stringify(snapshot)), key, salt, 1);
}

async function unsealSnapshot(envelope: Envelope, key: CryptoKey): Promise<SyncSnapshot> {
  try {
    const plaintext = await openSyncDocument(envelope, key);
    return validateSnapshot(JSON.parse(decoder.decode(plaintext)));
  } catch {
    throw new Error('The sync phrase did not unlock the Dropbox data, or the archive is damaged.');
  }
}

async function readRemote(token: string, fetcher: typeof fetch): Promise<RemoteDocument> {
  const response = await fetcher('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path: FILE_PATH }),
    },
  });
  if (response.status === 409) {
    const detail = await response.text();
    if (detail.includes('not_found')) return { revision: null, envelope: null };
  }
  if (!response.ok) throw dropboxError(response.status);
  const metadata = response.headers.get('Dropbox-API-Result');
  const revision = metadata ? (JSON.parse(metadata) as { rev?: string }).rev : undefined;
  if (!revision) throw new Error('Dropbox did not return a file revision.');
  const body = await response.text();
  if (body.length > MAX_FILE_BYTES * 2) throw new Error('The Dropbox sync file is too large.');
  const envelope: unknown = JSON.parse(body);
  if (
    !isRecord(envelope) ||
    envelope.version !== 1 ||
    typeof envelope.salt !== 'string' ||
    typeof envelope.iv !== 'string' ||
    typeof envelope.data !== 'string'
  )
    throw new Error('The Dropbox sync file has an unsupported format.');
  return { revision, envelope: envelope as Envelope };
}

async function writeRemote(
  token: string,
  revision: string | null,
  envelope: Envelope,
  fetcher: typeof fetch,
): Promise<void> {
  const mode = revision ? { '.tag': 'update', update: revision } : { '.tag': 'add' };
  const response = await fetcher('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({ path: FILE_PATH, mode, autorename: false, mute: true }),
    },
    body: JSON.stringify(envelope),
  });
  if (response.status === 409)
    throw new Error('Dropbox changed during sync. Try again; no local data was overwritten.');
  if (!response.ok) throw dropboxError(response.status);
}

function dropboxError(status: number): Error {
  return new Error(
    status === 401
      ? 'Dropbox authorization expired. Reconnect and try again.'
      : `Dropbox sync failed (${status}). Your local data is unchanged.`,
  );
}

export async function loadKey(accountId: string): Promise<StoredKey | undefined> {
  return withDatabase((database) => read<StoredKey>(database, 'keys', accountId));
}

/** Last successful v1 ancestor, reused during explicit archive upgrade. */
export async function loadBase(accountId: string, key: CryptoKey): Promise<SyncSnapshot | null> {
  const sealed = await withDatabase((database) => read<SealedBase>(database, 'bases', accountId));
  if (!sealed) return null;
  const value = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unbase64(sealed.iv) },
    key,
    unbase64(sealed.data),
  );
  return validateSnapshot(JSON.parse(decoder.decode(value)));
}

async function saveBase(accountId: string, key: CryptoKey, snapshot: SyncSnapshot): Promise<void> {
  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(snapshot)),
  );
  await withDatabase((database) =>
    write(database, 'bases', accountId, {
      iv: base64(iv),
      data: base64(new Uint8Array(encrypted)),
    }),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 2);
    request.onupgradeneeded = () => {
      for (const store of ['keys', 'bases', 'metadata'])
        if (!request.result.objectStoreNames.contains(store))
          request.result.createObjectStore(store);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withDatabase<T>(work: (database: IDBDatabase) => Promise<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await work(database);
  } finally {
    database.close();
  }
}

function read<T>(database: IDBDatabase, store: string, id: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = database.transaction(store).objectStore(store).get(id);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

function write(database: IDBDatabase, store: string, id: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, 'readwrite');
    if (value === undefined) transaction.objectStore(store).delete(id);
    else transaction.objectStore(store).put(value, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () => reject(transaction.error);
  });
}
