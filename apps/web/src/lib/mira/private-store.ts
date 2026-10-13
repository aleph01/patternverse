import type { Session, SessionRepository } from '@patternverse/companion-core';
import { conditionalRecordWrites, LocalSyncConflictError } from '@patternverse/workspace';
import { notifyWorkspaceChanged } from '$lib/client/workspace-changes';

const DATABASE_NAME = 'patternverse-mira-private-v1';
const KEY_STORE = 'keys';
const SESSION_STORE = 'sessions';
const SETTINGS_STORE = 'settings';
const RUN_STORE = 'runs';
const DEVICE_KEY_ID = 'device';
const SETTINGS_ID = 'current';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type Envelope = Readonly<{ version: 1; iv: ArrayBuffer; ciphertext: ArrayBuffer }>;
type RunEnvelope = Envelope & Readonly<{ token: string }>;
export type PrivateRun = Readonly<{ saved: unknown; token: string }>;
export type MiraSettings = Readonly<{
  model: string;
  openRouterKey: string;
  promptOverrides: Readonly<Record<string, string>>;
  activeSessionId: string | null;
  autoSpeak?: boolean;
  preferredModalityId?: string;
  monthlyBudgetUsd?: number | null;
}>;

export interface PrivateMiraStore extends SessionRepository {
  list(): Promise<readonly Session[]>;
  remove(id: string): Promise<void>;
  loadSettings(): Promise<MiraSettings>;
  saveSettings(settings: MiraSettings): Promise<void>;
  loadRun(sessionId: string): Promise<PrivateRun | null>;
  saveRun(sessionId: string, saved: unknown, expectedToken: string | null): Promise<string>;
  /** Atomic, encrypted conversation CAS. Active replies/practices are not overwritten. */
  applySyncSessions(expected: readonly Session[], desired: readonly Session[]): Promise<void>;
}

export type PrivateStoreOptions = Readonly<{
  indexedDB?: IDBFactory;
  crypto?: Crypto;
  databaseName?: string;
}>;

/** Encrypt all session content and settings before they enter IndexedDB. */
export function createPrivateMiraStore(options: PrivateStoreOptions = {}): PrivateMiraStore {
  const storage = options.indexedDB ?? indexedDB;
  const cryptography = options.crypto ?? crypto;
  const databaseName = options.databaseName ?? DATABASE_NAME;
  let keyPromise: Promise<CryptoKey> | undefined;

  const open = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const request = storage.open(databaseName, 2);
      request.onupgradeneeded = () => {
        const database = request.result;
        for (const name of [KEY_STORE, SESSION_STORE, SETTINGS_STORE, RUN_STORE]) {
          if (!database.objectStoreNames.contains(name)) database.createObjectStore(name);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Private storage is unavailable.'));
    });

  const withDatabase = async <T>(work: (database: IDBDatabase) => Promise<T>): Promise<T> => {
    const database = await open();
    try {
      return await work(database);
    } finally {
      database.close();
    }
  };

  const readKey = async (): Promise<CryptoKey> => {
    const existing = await withDatabase((database) =>
      read<CryptoKey>(database, KEY_STORE, DEVICE_KEY_ID),
    );
    if (existing) return validateKey(existing);
    const generated = await cryptography.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
    try {
      await withDatabase((database) => add(database, KEY_STORE, DEVICE_KEY_ID, generated));
      return generated;
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'ConstraintError') throw error;
      const winner = await withDatabase((database) =>
        read<CryptoKey>(database, KEY_STORE, DEVICE_KEY_ID),
      );
      if (!winner) throw new Error('The private device key could not be loaded.', { cause: error });
      return validateKey(winner);
    }
  };

  const deviceKey = (): Promise<CryptoKey> => (keyPromise ??= readKey());
  const seal = async (kind: string, id: string, value: unknown): Promise<Envelope> => {
    const ivBytes = cryptography.getRandomValues(new Uint8Array(12));
    const iv = ivBytes.buffer;
    const ciphertext = await cryptography.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: associatedData(kind, id) },
      await deviceKey(),
      bytes(JSON.stringify(value)),
    );
    return { version: 1, iv, ciphertext };
  };
  const unseal = async (kind: string, id: string, envelope: Envelope): Promise<unknown> => {
    if (envelope?.version !== 1 || envelope.iv?.byteLength !== 12 || !envelope.ciphertext) {
      throw new Error('Private Mira data is damaged.');
    }
    const plaintext = await cryptography.subtle.decrypt(
      { name: 'AES-GCM', iv: envelope.iv, additionalData: associatedData(kind, id) },
      await deviceKey(),
      envelope.ciphertext,
    );
    return JSON.parse(decoder.decode(plaintext));
  };

  const applySyncSessions: PrivateMiraStore['applySyncSessions'] = async (expected, desired) => {
    if (expected.length > 10000 || desired.length > 10000)
      throw new Error('Too many synced conversations.');
    const old = expected.map(portableMiraSession),
      next = desired.map(portableMiraSession);
    const entries = await withDatabase((database) => readAll<Envelope>(database, SESSION_STORE));
    const envelopes = new Map(entries);
    const current = await Promise.all(
      entries.map(async ([id, envelope]) =>
        validateSession(await unseal('session', id, envelope), id),
      ),
    );
    const writes = conditionalRecordWrites(
      old,
      next,
      current.map(portableMiraSession),
      (row) => row.id,
    );
    const currentById = new Map(current.map((row) => [row.id, row]));
    for (const write of writes)
      if (currentById.get(write.key)?.pendingReplyId != null)
        throw new LocalSyncConflictError(
          'A Mira reply is in progress. Finish it before syncing this conversation.',
        );
    const sealed = await Promise.all(
      writes.map(async (write) => ({
        ...write,
        envelope: write.after ? await seal('session', write.key, write.after) : null,
      })),
    );
    if (!sealed.length) return;
    await withDatabase(
      (database) =>
        new Promise<void>((resolve, reject) => {
          const transaction = database.transaction([SESSION_STORE, RUN_STORE], 'readwrite');
          const table = transaction.objectStore(SESSION_STORE);
          let remaining = sealed.length * 2;
          let failure: Error | undefined;
          const checked = () => {
            if (--remaining !== 0 || failure) return;
            for (const write of sealed) {
              if (write.envelope) table.put(write.envelope, write.key);
              else table.delete(write.key);
            }
          };
          for (const write of sealed) {
            const session = table.get(write.key);
            session.onsuccess = () => {
              if (!sameEnvelope(session.result as Envelope | undefined, envelopes.get(write.key))) {
                failure = new LocalSyncConflictError();
                transaction.abort();
                return;
              }
              checked();
            };
            const run = transaction.objectStore(RUN_STORE).get(write.key);
            run.onsuccess = () => {
              if (run.result) {
                failure = new LocalSyncConflictError(
                  'A device-local Mira practice is stored. Review it before replacing this conversation.',
                );
                transaction.abort();
                return;
              }
              checked();
            };
          }
          transaction.oncomplete = () => resolve();
          transaction.onerror = transaction.onabort = () =>
            reject(failure ?? transaction.error ?? new Error('Conversation sync failed.'));
        }),
    );
  };

  return {
    applySyncSessions: async (expected, desired) => {
      await applySyncSessions(expected, desired);
      notifyWorkspaceChanged({ origin: 'sync', topics: ['mira-sessions'] });
    },
    load: async (id) => {
      const envelope = await withDatabase((database) =>
        read<Envelope>(database, SESSION_STORE, id),
      );
      return envelope ? validateSession(await unseal('session', id, envelope), id) : null;
    },
    save: async (session) => {
      const valid = validateSession(session, session.id);
      const envelope = await seal('session', valid.id, valid);
      await withDatabase((database) => put(database, SESSION_STORE, valid.id, envelope));
      notifyWorkspaceChanged({ origin: 'local', topics: ['mira-sessions'] });
    },
    list: async () => {
      const entries = await withDatabase((database) => readAll<Envelope>(database, SESSION_STORE));
      const sessions = await Promise.all(
        entries.map(async ([id, envelope]) =>
          validateSession(await unseal('session', id, envelope), id),
        ),
      );
      return sessions.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    remove: async (id) => {
      await withDatabase((database) =>
        writeMany(database, [SESSION_STORE, RUN_STORE], (transaction) => {
          transaction.objectStore(SESSION_STORE).delete(id);
          transaction.objectStore(RUN_STORE).delete(id);
        }),
      );
      notifyWorkspaceChanged({ origin: 'local', topics: ['mira-sessions'] });
    },
    loadSettings: async () => {
      const envelope = await withDatabase((database) =>
        read<Envelope>(database, SETTINGS_STORE, SETTINGS_ID),
      );
      return envelope
        ? validateSettings(await unseal('settings', SETTINGS_ID, envelope))
        : {
            model: '',
            openRouterKey: '',
            promptOverrides: {},
            activeSessionId: null,
            autoSpeak: false,
            monthlyBudgetUsd: null,
          };
    },
    saveSettings: async (settings) => {
      const envelope = await seal('settings', SETTINGS_ID, validateSettings(settings));
      await withDatabase((database) => put(database, SETTINGS_STORE, SETTINGS_ID, envelope));
    },
    loadRun: async (sessionId) => {
      const envelope = await withDatabase((database) =>
        read<RunEnvelope>(database, RUN_STORE, sessionId),
      );
      if (!envelope) return null;
      if (!string(envelope.token, 100) || !envelope.token)
        throw new Error('Private exercise data is damaged.');
      return { saved: await unseal('run', sessionId, envelope), token: envelope.token };
    },
    saveRun: async (sessionId, saved, expectedToken) => {
      if (!sessionId || JSON.stringify(saved).length > 8 * 1024 * 1024)
        throw new Error('Exercise checkpoint is invalid or too large.');
      const envelope: RunEnvelope = {
        ...(await seal('run', sessionId, saved)),
        token: cryptography.randomUUID(),
      };
      await withDatabase(
        (database) =>
          new Promise<void>((resolve, reject) => {
            const transaction = database.transaction(RUN_STORE, 'readwrite');
            const table = transaction.objectStore(RUN_STORE);
            const request = table.get(sessionId);
            request.onsuccess = () => {
              const current = request.result as RunEnvelope | undefined;
              if ((current?.token ?? null) !== expectedToken) {
                transaction.abort();
                reject(new Error('Exercise changed elsewhere. Reload it before continuing.'));
                return;
              }
              table.put(envelope, sessionId);
            };
            transaction.oncomplete = () => resolve();
            transaction.onabort = transaction.onerror = () =>
              reject(transaction.error ?? new Error('Private exercise could not be saved.'));
          }),
      );
      return envelope.token;
    },
  };
}

function associatedData(kind: string, id: string): ArrayBuffer {
  return bytes(`patternverse-mira-v1:${kind}:${id}`);
}

function bytes(value: string): ArrayBuffer {
  return new Uint8Array(encoder.encode(value)).buffer;
}

function validateKey(key: CryptoKey): CryptoKey {
  if (key.extractable || key.type !== 'secret' || key.algorithm.name !== 'AES-GCM') {
    throw new Error('The private device key is invalid.');
  }
  return key;
}

/** Validate imported data before it can enter private storage or a model request. */
export function validateSession(value: unknown, id: string): Session {
  if (
    !isRecord(value) ||
    value.id !== id ||
    !string(value.title, 120) ||
    !string(value.modalityId, 80) ||
    !string(value.createdAt, 40) ||
    !string(value.updatedAt, 40) ||
    (value.pendingReplyId !== null && !string(value.pendingReplyId, 100)) ||
    !Array.isArray(value.messages) ||
    value.messages.length > 2000 ||
    !value.messages.every(
      (message) =>
        isRecord(message) &&
        string(message.id, 100) &&
        (message.role === 'user' || message.role === 'assistant') &&
        string(message.text, 30000) &&
        string(message.createdAt, 40) &&
        (message.patternMentions === undefined ||
          (message.role === 'user' &&
            Array.isArray(message.patternMentions) &&
            message.patternMentions.length <= 100 &&
            message.patternMentions.every(
              (mention) =>
                isRecord(mention) &&
                string(mention.sourceId, 120) &&
                string(mention.entityId, 120) &&
                string(mention.title, 1000),
            ) &&
            new Set(
              message.patternMentions.map((mention) => `${mention.sourceId}:${mention.entityId}`),
            ).size === message.patternMentions.length)),
    ) ||
    (value.activePattern !== null &&
      (!isRecord(value.activePattern) ||
        !string(value.activePattern.sourceId, 120) ||
        !string(value.activePattern.entityId, 120) ||
        (value.activePattern.revision !== undefined && !string(value.activePattern.revision, 120))))
  ) {
    throw new Error('Private Mira session data is invalid.');
  }
  return value as Session;
}

/** The shared allowlist for portable conversations. Never carry a device's pending request. */
export function portableMiraSession(value: Session): Session {
  const session = validateSession(value, value.id);
  return {
    id: session.id,
    title: session.title,
    modalityId: session.modalityId,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    pendingReplyId: null,
    activePattern: session.activePattern
      ? {
          sourceId: session.activePattern.sourceId,
          entityId: session.activePattern.entityId,
          ...(session.activePattern.revision === undefined
            ? {}
            : { revision: session.activePattern.revision }),
        }
      : null,
    messages: session.messages.map((message) => ({
      id: message.id,
      role: message.role,
      text: message.text,
      createdAt: message.createdAt,
      ...(message.patternMentions === undefined
        ? {}
        : {
            patternMentions: message.patternMentions.map((mention) => ({
              sourceId: mention.sourceId,
              entityId: mention.entityId,
              title: mention.title,
            })),
          }),
    })),
  };
}

function sameEnvelope(left: Envelope | undefined, right: Envelope | undefined): boolean {
  if (!left || !right) return left === right;
  const same = (a: ArrayBuffer, b: ArrayBuffer) => {
    const leftBytes = new Uint8Array(a),
      rightBytes = new Uint8Array(b);
    return (
      leftBytes.byteLength === rightBytes.byteLength &&
      leftBytes.every((byte, index) => byte === rightBytes[index])
    );
  };
  return (
    left.version === right.version &&
    same(left.iv, right.iv) &&
    same(left.ciphertext, right.ciphertext)
  );
}

function validateSettings(value: unknown): MiraSettings {
  if (
    !isRecord(value) ||
    !string(value.model, 300) ||
    !string(value.openRouterKey, 2000) ||
    (value.autoSpeak !== undefined && typeof value.autoSpeak !== 'boolean') ||
    (value.preferredModalityId !== undefined && !string(value.preferredModalityId, 100)) ||
    (value.monthlyBudgetUsd !== undefined &&
      value.monthlyBudgetUsd !== null &&
      (typeof value.monthlyBudgetUsd !== 'number' ||
        !Number.isFinite(value.monthlyBudgetUsd) ||
        value.monthlyBudgetUsd <= 0 ||
        value.monthlyBudgetUsd > 1_000_000)) ||
    (value.activeSessionId !== null && !string(value.activeSessionId, 100)) ||
    !isRecord(value.promptOverrides) ||
    Object.keys(value.promptOverrides).length > 20 ||
    !Object.values(value.promptOverrides).every((entry) => string(entry, 30000))
  ) {
    throw new Error('Private Mira settings are invalid.');
  }
  return {
    ...value,
    autoSpeak: value.autoSpeak === true,
    monthlyBudgetUsd: value.monthlyBudgetUsd ?? null,
  } as MiraSettings;
}

function string(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function read<T>(database: IDBDatabase, store: string, id: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = database.transaction(store).objectStore(store).get(id);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

function readAll<T>(database: IDBDatabase, store: string): Promise<readonly [string, T][]> {
  return new Promise((resolve, reject) => {
    const entries: [string, T][] = [];
    const request = database.transaction(store).objectStore(store).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return resolve(entries);
      entries.push([String(cursor.key), cursor.value as T]);
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

function write(
  database: IDBDatabase,
  store: string,
  operation: (store: IDBObjectStore) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, 'readwrite');
    operation(transaction.objectStore(store));
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () =>
      reject(transaction.error ?? new Error('Private Mira data could not be saved.'));
  });
}

function writeMany(
  database: IDBDatabase,
  stores: string[],
  operation: (transaction: IDBTransaction) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(stores, 'readwrite');
    operation(transaction);
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () =>
      reject(transaction.error ?? new Error('Private Mira data could not be saved.'));
  });
}

function put(database: IDBDatabase, store: string, id: string, value: unknown): Promise<void> {
  return write(database, store, (table) => {
    table.put(value, id);
  });
}

function add(database: IDBDatabase, store: string, id: string, value: unknown): Promise<void> {
  return write(database, store, (table) => {
    table.add(value, id);
  });
}
