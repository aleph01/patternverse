import {
  createCorpusSnapshot,
  hashCorpusContent,
  normalizeCorpusPath,
  type CorpusChange,
  type CorpusFile,
  type CorpusSnapshot,
} from '@patternverse/sync-domain';
import type { SyncExecutionJournal, SyncStateStore } from '@patternverse/remote-store';
import { canonicalRecord } from '@patternverse/workspace';
import {
  MAX_SYNC_DOCUMENT_BYTES,
  openSyncDocument,
  sealSyncDocument,
  type SyncEnvelope,
} from './sync-envelope';
import { parseWorkspaceSyncSnapshot, type WorkspaceSyncSnapshot } from './sync-snapshot';

export type PendingLocalSyncApply = Readonly<{
  expected: WorkspaceSyncSnapshot;
  desired: WorkspaceSyncSnapshot;
}>;
export type LocalSyncApplyStateStore = {
  readApply(): Promise<PendingLocalSyncApply | null>;
  writeApply(value: PendingLocalSyncApply): Promise<void>;
  clearApply(): Promise<void>;
};
export type LocalSyncRecoveryStateStore = LocalSyncApplyStateStore & {
  readRecoveryCopy(): Promise<(PendingLocalSyncApply & { current: WorkspaceSyncSnapshot }) | null>;
  /** Atomically preserve the original intent and replace it only if still current. */
  replaceApplyForReview(
    expected: PendingLocalSyncApply,
    desired: PendingLocalSyncApply,
  ): Promise<void>;
};

const DATABASE = 'patternverse-sync-recovery-v1';
const STORE = 'checkpoints';
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const empty = (): CorpusSnapshot => createCorpusSnapshot({ revision: null, files: [] });
const portableJSON = (value: unknown): string =>
  JSON.stringify(value, (_key, entry: unknown) =>
    entry instanceof Uint8Array ? Array.from(entry) : entry,
  );
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid sync checkpoint.');
  return value as Record<string, unknown>;
};
const string = (value: unknown): string => {
  if (typeof value !== 'string') throw new Error('Invalid sync checkpoint string.');
  return value;
};
const revision = (value: unknown): string | null => (value === null ? null : string(value));
const list = (value: unknown): unknown[] => {
  if (!Array.isArray(value) || value.length > 60001)
    throw new Error('Invalid sync checkpoint list.');
  return value;
};
const path = (value: unknown): string => {
  const result = string(value);
  if (normalizeCorpusPath(result) !== result) throw new Error('Noncanonical sync checkpoint path.');
  return result;
};
const hash = (value: unknown): string => {
  const result = string(value);
  if (!/^sha256:[0-9a-f]{64}$/.test(result)) throw new Error('Invalid sync checkpoint hash.');
  return result;
};
async function file(value: unknown): Promise<CorpusFile> {
  const r = object(value);
  if (!Array.isArray(r.content) || r.content.length > MAX_SYNC_DOCUMENT_BYTES)
    throw new Error('Invalid sync checkpoint bytes.');
  const bytes = r.content as unknown[];
  if (
    !bytes.every(
      (byte) => typeof byte === 'number' && Number.isInteger(byte) && byte >= 0 && byte <= 255,
    )
  )
    throw new Error('Invalid sync checkpoint bytes.');
  const content = new Uint8Array(bytes as number[]);
  const contentHash = hash(r.contentHash);
  if ((await hashCorpusContent(content)) !== contentHash)
    throw new Error('Corrupt sync checkpoint record.');
  return { path: path(r.path), contentHash, content };
}
async function corpus(value: unknown): Promise<CorpusSnapshot> {
  const r = object(value);
  return createCorpusSnapshot({
    revision: revision(r.revision),
    files: await Promise.all(list(r.files).map(file)),
  });
}
async function change(value: unknown): Promise<CorpusChange> {
  const r = object(value);
  if (r.type === 'delete')
    return { type: 'delete', path: path(r.path), previousHash: hash(r.previousHash) };
  const checked = await file(r);
  if (r.type === 'create') return { type: 'create', ...checked };
  if (r.type === 'update')
    return { type: 'update', ...checked, previousHash: hash(r.previousHash) };
  throw new Error('Invalid sync checkpoint change.');
}
async function journal(value: unknown): Promise<SyncExecutionJournal> {
  const r = object(value);
  if (
    r.phase !== 'planned' &&
    r.phase !== 'local-applied' &&
    r.phase !== 'remote-applied' &&
    r.phase !== 'verifying'
  )
    throw new Error('Invalid sync checkpoint phase.');
  const plan = object(r.plan);
  // Only resolved execution plans are persisted. Conflicts are returned before execution.
  if (list(plan.conflicts).length !== 0) throw new Error('An unresolved plan cannot be executed.');
  return {
    id: string(r.id),
    providerId: string(r.providerId),
    phase: r.phase,
    remoteRevision: revision(r.remoteRevision),
    startedAt: string(r.startedAt),
    updatedAt: string(r.updatedAt),
    plan: {
      pull: await Promise.all(list(plan.pull).map(change)),
      push: await Promise.all(list(plan.push).map(change)),
      conflicts: [],
      unchangedPaths: list(plan.unchangedPaths).map(path),
    },
  };
}

/** Persistent recovery boundary for the existing orchestrator. Keys/tokens are supplied,
 * never serialized. The namespace must identify provider + account + local workspace.
 * Base and journal contain private answers, so even locally they are encrypted; payload
 * binding prevents swapping ciphertext between accounts, workspaces or checkpoint slots.
 * Callers must serialize whole sync attempts (including across browser tabs).
 */
export function createEncryptedSyncStateStore(options: {
  scope: { providerId: string; accountId: string; workspaceId: string };
  key: CryptoKey;
  salt: string;
  databaseName?: string;
}): SyncStateStore & LocalSyncRecoveryStateStore {
  if (Object.values(options.scope).some((value) => !value.trim()))
    throw new Error('Sync checkpoint scope is required.');
  const binding = JSON.stringify([
    options.scope.providerId,
    options.scope.accountId,
    options.scope.workspaceId,
  ]);
  const apply = (value: unknown): PendingLocalSyncApply => {
    const r = object(value);
    const expected = parseWorkspaceSyncSnapshot(r.expected);
    const desired = parseWorkspaceSyncSnapshot(r.desired);
    for (const snapshot of [expected, desired])
      if (snapshot.workspace.workspace.id !== options.scope.workspaceId)
        throw new Error('Pending sync update belongs to a different workspace.');
    if (expected.workspace.workspace.createdAt !== desired.workspace.workspace.createdAt)
      throw new Error('Pending sync update cannot replace device identity.');
    return { expected, desired };
  };
  const open = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      let blocked = false;
      const request = indexedDB.open(options.databaseName ?? DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        blocked = true;
        reject(new Error('Close other Patternverse tabs, then retry sync.'));
      };
      request.onsuccess = () => {
        if (blocked) request.result.close();
        else resolve(request.result);
      };
    });
  type Kind = 'base' | 'journal' | 'apply' | 'recovery-copy';
  const read = async (kind: Kind): Promise<unknown | null> => {
    const database = await open();
    try {
      const envelope = await new Promise<SyncEnvelope | undefined>((resolve, reject) => {
        const transaction = database.transaction(STORE);
        const request = transaction.objectStore(STORE).get(`${binding}:${kind}`);
        transaction.oncomplete = () => resolve(request.result as SyncEnvelope | undefined);
        transaction.onerror = transaction.onabort = () => reject(transaction.error);
      });
      if (!envelope) return null;
      const r = object(JSON.parse(decoder.decode(await openSyncDocument(envelope, options.key))));
      if (
        envelope.version !== 2 ||
        envelope.salt !== options.salt ||
        r.version !== 1 ||
        r.binding !== binding ||
        r.kind !== kind
      )
        throw new Error('Sync checkpoint belongs to a different account, workspace or key.');
      return r.value;
    } finally {
      database.close();
    }
  };
  const write = async (kind: Kind, value: unknown | null): Promise<void> => {
    const envelope =
      value === null
        ? null
        : await sealSyncDocument(
            encoder.encode(portableJSON({ version: 1, binding, kind, value })),
            options.key,
            options.salt,
            2,
          );
    const database = await open();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, 'readwrite');
        const store = transaction.objectStore(STORE);
        if (envelope) store.put(envelope, `${binding}:${kind}`);
        else store.delete(`${binding}:${kind}`);
        transaction.oncomplete = () => resolve();
        transaction.onerror = transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  };
  return {
    readRecoveryCopy: async () => {
      const value = await read('recovery-copy');
      if (value === null) return null;
      const original = apply(value),
        current = parseWorkspaceSyncSnapshot(object(value).current);
      apply({ expected: original.expected, desired: current });
      return { ...original, current };
    },
    replaceApplyForReview: async (expected, desired) => {
      const original = apply(expected),
        replacement = apply(desired);
      // Encryption is outside the transaction. Check the exact persisted envelope
      // again in the transaction so even a competing writer cannot replace our intent.
      const database = await open();
      try {
        const prior = await new Promise<SyncEnvelope | undefined>((resolve, reject) => {
          const transaction = database.transaction(STORE);
          const request = transaction.objectStore(STORE).get(`${binding}:apply`);
          transaction.oncomplete = () => resolve(request.result as SyncEnvelope | undefined);
          transaction.onerror = transaction.onabort = () => reject(transaction.error);
        });
        if (!prior) throw new Error('The pending update changed. Review it again.');
        const payload = object(
          JSON.parse(decoder.decode(await openSyncDocument(prior, options.key))),
        );
        if (
          prior.version !== 2 ||
          prior.salt !== options.salt ||
          payload.binding !== binding ||
          payload.version !== 1 ||
          payload.kind !== 'apply' ||
          canonicalRecord(apply(payload.value)) !== canonicalRecord(original)
        )
          throw new Error('The pending update changed. Review it again.');
        const seal = (
          kind: Kind,
          value: PendingLocalSyncApply & { current?: WorkspaceSyncSnapshot },
        ) =>
          sealSyncDocument(
            encoder.encode(portableJSON({ version: 1, binding, kind, value })),
            options.key,
            options.salt,
            2,
          );
        const [copy, next] = await Promise.all([
          // Keep both the original intent and the current versions a deliberate
          // pending choice might replace, not just the older expected values.
          seal('recovery-copy', { ...original, current: replacement.expected }),
          seal('apply', replacement),
        ]);
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(STORE, 'readwrite');
          const store = transaction.objectStore(STORE),
            request = store.get(`${binding}:apply`);
          let changed = false;
          request.onsuccess = () => {
            if (canonicalRecord(request.result) !== canonicalRecord(prior)) {
              changed = true;
              transaction.abort();
              return;
            }
            store.put(copy, `${binding}:recovery-copy`);
            store.put(next, `${binding}:apply`);
          };
          transaction.oncomplete = () => resolve();
          transaction.onerror = transaction.onabort = () =>
            reject(
              changed
                ? new Error('The pending update changed. Review it again.')
                : transaction.error,
            );
        });
      } finally {
        database.close();
      }
    },
    readApply: async () => {
      const value = await read('apply');
      return value === null ? null : apply(value);
    },
    writeApply: async (value) => {
      await write('apply', apply(value));
    },
    clearApply: () => write('apply', null),
    readBase: async () => {
      const value = await read('base');
      return value === null ? empty() : corpus(value);
    },
    writeBase: async (snapshot) => {
      await write('base', await corpus(JSON.parse(portableJSON(snapshot))));
    },
    readJournal: async () => {
      const value = await read('journal');
      if (value === null) return null;
      const checked = await journal(value);
      if (checked.providerId !== options.scope.providerId)
        throw new Error('Checkpoint provider mismatch.');
      return checked;
    },
    writeJournal: async (value) => {
      if (value.providerId !== options.scope.providerId)
        throw new Error('Checkpoint provider mismatch.');
      await write('journal', await journal(JSON.parse(portableJSON(value))));
    },
    clearJournal: () => write('journal', null),
  };
}
