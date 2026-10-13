import type { LocalWorkspaceData } from '@patternverse/workspace';
import { createCorpusSnapshot } from '@patternverse/sync-domain';
import {
  applyCorpusChanges,
  CorpusChangePreconditionError,
  type RemoteConnection,
  type RemoteCorpusError,
  type RemoteCorpusStore,
} from '@patternverse/remote-store';
import type { DropboxConnection } from './dropbox-auth';
import { corpusToSyncSnapshot, syncSnapshotToCorpus } from './sync-corpus';
import { MAX_SYNC_DOCUMENT_BYTES, syncUnbase64, type SyncEnvelope } from './sync-envelope';
import {
  openWorkspaceSyncSnapshot,
  parseWorkspaceSyncSnapshot,
  serializeWorkspaceSyncSnapshot,
  sealWorkspaceSyncSnapshot,
  type WorkspaceSyncSnapshot,
} from './sync-snapshot';

export const DROPBOX_WORKSPACE_PATH = '/patternverse-sync-v2.json';
export const DROPBOX_LEGACY_PATH = '/patternverse-sync-v1.json';
export const DROPBOX_ACCOUNT_WORKSPACE_PATH = '/patternverse-sync-v3.json';
export type DropboxSyncProtection = 'phrase' | 'dropbox-account';
const CONTENT_API = 'https://content.dropboxapi.com/2/files/';
const decoder = new TextDecoder('utf-8', { fatal: true });
type Document = {
  revision: string | null;
  envelope: SyncEnvelope<2> | null;
  legacyPresent?: boolean;
  snapshot?: WorkspaceSyncSnapshot;
};
type Result<T> = { ok: true; value: T } | { ok: false; error: RemoteCorpusError };
type TransportOptions = {
  getCredentials: () => DropboxConnection | undefined;
  fetcher?: typeof fetch;
  now?: () => number;
  /** Coordinator may offer an upgrade instead of interpreting v1 as an empty corpus. */
  allowLegacy?: boolean;
  protection?: DropboxSyncProtection;
};
class TransportFailure extends Error {
  constructor(readonly error: RemoteCorpusError) {
    super(error.type);
  }
}
const invalid = (details: string): TransportFailure =>
  new TransportFailure({ type: 'invalid-remote-corpus', details });
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw invalid('Dropbox returned an invalid sync response.');
  return value as Record<string, unknown>;
};

/** Bound allocations before parsing, even when Content-Length is absent or misleading. */
async function readJSON(response: Response, limit: number): Promise<unknown> {
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    throw invalid('The Dropbox sync response is too large.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw invalid('Dropbox returned an empty sync response.');
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw invalid('The Dropbox sync response is too large.');
      }
      parts.push(chunk.value);
    }
  } catch (error) {
    if (error instanceof TransportFailure) throw error;
    throw new TransportFailure({
      type:
        error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
          ? 'temporarily-unavailable'
          : 'network-error',
    });
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  try {
    return JSON.parse(decoder.decode(bytes));
  } catch {
    throw invalid('Dropbox returned an unreadable sync response.');
  }
}

async function endpointError(
  response: Response,
  operation: 'read' | 'write',
): Promise<RemoteCorpusError> {
  if (response.status === 401) return { type: 'authorization-expired' };
  if (response.status === 403) return { type: 'permission-denied' };
  if (response.status === 429) {
    const retry = response.headers.get('retry-after');
    const seconds = retry === null ? NaN : Number(retry);
    return {
      type: 'rate-limited',
      ...(Number.isFinite(seconds) && seconds >= 0
        ? { retryAfterMs: Math.min(seconds * 1000, 86400000) }
        : {}),
    };
  }
  if (response.status >= 500) return { type: 'temporarily-unavailable' };
  if (response.status !== 409) return { type: 'unknown' };
  try {
    const error = object(object(await readJSON(response, 8192)).error);
    if (error['.tag'] !== 'path') return { type: 'unknown' };
    const path = object(error.path);
    const reason = operation === 'write' ? object(path.reason) : path;
    switch (reason['.tag']) {
      case 'not_found':
        return operation === 'read' ? { type: 'not-found' } : { type: 'revision-conflict' };
      case 'conflict':
        return { type: 'revision-conflict' };
      case 'no_write_permission':
      case 'restricted_content':
      case 'access_restricted':
        return { type: 'permission-denied' };
      case 'insufficient_space':
      case 'team_folder_insufficient_space':
      case 'member_folder_insufficient_space':
        return { type: 'quota-exceeded' };
      case 'too_many_write_operations':
        return { type: 'rate-limited' };
      case 'not_file':
        return { type: 'invalid-remote-corpus', details: 'The sync archive path is not a file.' };
      default:
        return { type: 'unknown' };
    }
  } catch {
    // Never mistake an arbitrary 409 body (or a substring in it) for an empty account.
    return { type: 'unknown' };
  }
}

function transport(options: TransportOptions) {
  const credentials = (connection?: RemoteConnection): DropboxConnection => {
    const value = options.getCredentials();
    if (!value?.accessToken || !value.accountId)
      throw new TransportFailure({ type: 'not-authenticated' });
    if (
      connection &&
      (connection.providerId !== 'dropbox' || connection.connectionId !== value.accountId)
    )
      throw new TransportFailure({ type: 'not-authenticated' });
    if (
      !Number.isFinite(Date.parse(value.expiresAt)) ||
      Date.parse(value.expiresAt) <= (options.now ?? Date.now)()
    )
      throw new TransportFailure({ type: 'authorization-expired' });
    return value;
  };
  const request = async (url: string, init: RequestInit, connection?: RemoteConnection) => {
    const value = credentials(connection);
    try {
      return await (options.fetcher ?? fetch)(url, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${value.accessToken}` },
        signal: AbortSignal.timeout(30000),
      });
    } catch (error) {
      throw new TransportFailure({
        type:
          error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
            ? 'temporarily-unavailable'
            : 'network-error',
      });
    }
  };
  const readArchive = async (
    path: string,
    connection?: RemoteConnection,
  ): Promise<{ revision: string; body: unknown } | null> => {
    assertArchivePath(path);
    const response = await request(
      CONTENT_API + 'download',
      {
        method: 'POST',
        headers: { 'Dropbox-API-Arg': JSON.stringify({ path }) },
      },
      connection,
    );
    if (!response.ok) {
      const error = await endpointError(response, 'read');
      if (error.type !== 'not-found') throw new TransportFailure(error);
      return null;
    }
    const metadata = response.headers.get('Dropbox-API-Result');
    if (!metadata || metadata.length > 8192)
      throw invalid('Dropbox did not return a valid file revision.');
    return {
      revision: revisionOf(JSON.parse(metadata)),
      body: await readJSON(response, MAX_SYNC_DOCUMENT_BYTES * 2),
    };
  };
  const writeArchive = async (
    path: string,
    revision: string | null,
    body: unknown,
    connection?: RemoteConnection,
  ) => {
    assertArchivePath(path);
    const serialized = JSON.stringify(body);
    if (new TextEncoder().encode(serialized).byteLength > MAX_SYNC_DOCUMENT_BYTES * 2)
      throw invalid('The Dropbox archive is too large.');
    const response = await request(
      CONTENT_API + 'upload',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            path,
            mode: revision ? { '.tag': 'update', update: revision } : { '.tag': 'add' },
            autorename: false,
            mute: true,
            strict_conflict: true,
          }),
        },
        body: serialized,
      },
      connection,
    );
    if (!response.ok) throw new TransportFailure(await endpointError(response, 'write'));
    return revisionOf(await readJSON(response, 8192));
  };
  const read = async (connection?: RemoteConnection): Promise<Document> => {
    if (options.protection === 'dropbox-account') {
      // Never silently fork or downgrade an existing encrypted archive. Recheck on
      // every read (including before upload), not just the first connection.
      for (const path of [DROPBOX_WORKSPACE_PATH, DROPBOX_LEGACY_PATH]) {
        const response = await request(
          'https://api.dropboxapi.com/2/files/get_metadata',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
          },
          connection,
        );
        if (response.ok)
          throw invalid(
            'An encrypted Dropbox sync archive already exists. Sign-in-only sync cannot read it. Keep that archive and use the previous encrypted version to recover or export your work; nothing was replaced.',
          );
        const error = await endpointError(response, 'read');
        if (error.type !== 'not-found') throw new TransportFailure(error);
      }
      const archive = await readArchive(DROPBOX_ACCOUNT_WORKSPACE_PATH, connection);
      if (!archive) return { revision: null, envelope: null };
      const body = object(archive.body);
      if (body.version !== 3 || body.protection !== 'dropbox-account')
        throw invalid('The Dropbox workspace archive has an unsupported format.');
      const snapshot = parseWorkspaceSyncSnapshot(body.snapshot);
      serializeWorkspaceSyncSnapshot(snapshot);
      return { revision: archive.revision, envelope: null, snapshot };
    }
    const archive = await readArchive(DROPBOX_WORKSPACE_PATH, connection);
    if (!archive) {
      // Do not create a parallel corpus while an old archive still exists. Upgrade
      // requires an explicit migration policy, not treating missing v2 as empty v1.
      const legacy = await request(
        'https://api.dropboxapi.com/2/files/get_metadata',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: DROPBOX_LEGACY_PATH }),
        },
        connection,
      );
      if (legacy.ok && options.allowLegacy)
        return { revision: null, envelope: null, legacyPresent: true };
      if (legacy.ok)
        throw invalid(
          'An older Dropbox sync archive exists. Upgrade it before using workspace sync; nothing was replaced.',
        );
      const legacyError = await endpointError(legacy, 'read');
      if (legacyError.type !== 'not-found') throw new TransportFailure(legacyError);
      return { revision: null, envelope: null };
    }
    const envelope = object(archive.body);
    if (
      envelope.version !== 2 ||
      typeof envelope.salt !== 'string' ||
      typeof envelope.iv !== 'string' ||
      typeof envelope.data !== 'string'
    )
      throw invalid('The Dropbox workspace archive has an unsupported format.');
    try {
      if (
        envelope.salt.length !== 24 ||
        syncUnbase64(envelope.salt).byteLength !== 16 ||
        envelope.iv.length !== 16 ||
        syncUnbase64(envelope.iv).byteLength !== 12
      )
        throw new Error();
    } catch {
      throw invalid('The Dropbox workspace archive has invalid encryption metadata.');
    }
    return { revision: archive.revision, envelope: envelope as SyncEnvelope<2> };
  };
  return { read, readArchive, writeArchive };
}

function assertArchivePath(path: string) {
  if (
    path !== DROPBOX_WORKSPACE_PATH &&
    path !== DROPBOX_LEGACY_PATH &&
    path !== DROPBOX_ACCOUNT_WORKSPACE_PATH &&
    !/^\/patternverse-sync-v1-backup-[a-zA-Z0-9]{1,256}\.json$/.test(path)
  )
    throw invalid('Invalid Patternverse archive path.');
}

/** Narrow migration boundary, reusing the same bounded HTTP and strict CAS writes. */
export function createDropboxArchiveClient(options: TransportOptions) {
  const api = transport(options);
  return {
    read: (path: string) => result(() => api.readArchive(path)),
    write: (path: string, revision: string | null, body: unknown) =>
      result(() => api.writeArchive(path, revision, body)),
  };
}

function revisionOf(value: unknown): string {
  const rev = object(value).rev;
  if (typeof rev !== 'string' || !/^[a-zA-Z0-9]{1,256}$/.test(rev))
    throw invalid('Dropbox did not return a valid file revision.');
  return rev;
}
async function result<T>(work: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await work() };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof TransportFailure
          ? error.error
          : {
              type: 'invalid-remote-corpus',
              details: 'The Dropbox sync archive is invalid or could not be unlocked.',
            },
    };
  }
}

/** Read encryption metadata before deriving the device key. Does not mutate Dropbox. */
export function readDropboxWorkspaceDocument(options: TransportOptions): Promise<Result<Document>> {
  return result(() => transport(options).read());
}

/** One versioned App Folder document, many virtual records; no second merge algorithm.
 * Credentials stay in the closure, never in corpus, checkpoints, or connection metadata.
 */
export function createDropboxWorkspaceStore(
  options: TransportOptions & {
    key: CryptoKey;
    salt: string;
    identity: LocalWorkspaceData['workspace'];
  },
): RemoteCorpusStore {
  const api = transport(options);
  const snapshot = async (connection: RemoteConnection) => {
    const document = await api.read(connection);
    if (document.snapshot) return syncSnapshotToCorpus(document.snapshot, document.revision);
    if (!document.envelope) return createCorpusSnapshot({ revision: null, files: [] });
    if (document.envelope.salt !== options.salt)
      throw invalid('The Dropbox encryption key changed. Reconnect with the original sync phrase.');
    const opened = await openWorkspaceSyncSnapshot(document.envelope, options.key);
    if (opened.version !== 2) throw invalid('An explicit archive upgrade is required.');
    return syncSnapshotToCorpus(opened, document.revision);
  };
  return {
    providerId: 'dropbox',
    capabilities: {
      supportsAtomicBatchWrite: true,
      supportsChangeCursor: false,
      supportsVisibleFiles: false,
      supportsRevisionHistory: false,
      supportsFolderSelection: false,
    },
    readSnapshot: async (connection) => {
      const read = await result(() => snapshot(connection));
      return read.ok ? { ok: true, snapshot: read.value } : read;
    },
    applyChanges: async (connection, changes) => {
      const applied = await result(async () => {
        const current = await snapshot(connection);
        if (current.revision !== changes.expectedRevision)
          throw new TransportFailure({ type: 'revision-conflict' });
        let candidate;
        try {
          candidate = applyCorpusChanges(current, changes.changes);
        } catch (error) {
          if (error instanceof CorpusChangePreconditionError)
            throw new TransportFailure({ type: 'revision-conflict' });
          throw error;
        }
        const portable = await corpusToSyncSnapshot(candidate, options.identity);
        if (options.protection === 'dropbox-account') {
          serializeWorkspaceSyncSnapshot(portable);
          return api.writeArchive(
            DROPBOX_ACCOUNT_WORKSPACE_PATH,
            current.revision,
            { version: 3, protection: 'dropbox-account', snapshot: portable },
            connection,
          );
        }
        const envelope = await sealWorkspaceSyncSnapshot(portable, options.key, options.salt);
        return api.writeArchive(DROPBOX_WORKSPACE_PATH, current.revision, envelope, connection);
      });
      return applied.ok ? { ok: true, revision: applied.value } : applied;
    },
    // The caller owns OAuth/key lifecycle; disconnect never deletes remote or local data.
    disconnect: async () => ({ ok: true }),
  };
}
