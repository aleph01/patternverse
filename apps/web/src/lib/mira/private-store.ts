import type { Session, SessionRepository } from '@patternverse/companion-core';

const DATABASE_NAME = 'patternverse-mira-private-v1';
const KEY_STORE = 'keys';
const SESSION_STORE = 'sessions';
const SETTINGS_STORE = 'settings';
const DEVICE_KEY_ID = 'device';
const SETTINGS_ID = 'current';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type Envelope = Readonly<{ version: 1; iv: ArrayBuffer; ciphertext: ArrayBuffer }>;
export type MiraSettings = Readonly<{
  model: string;
  openRouterKey: string;
  promptOverrides: Readonly<Record<string, string>>;
  activeSessionId: string | null;
}>;

export interface PrivateMiraStore extends SessionRepository {
  list(): Promise<readonly Session[]>;
  remove(id: string): Promise<void>;
  loadSettings(): Promise<MiraSettings>;
  saveSettings(settings: MiraSettings): Promise<void>;
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
      const request = storage.open(databaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        database.createObjectStore(KEY_STORE);
        database.createObjectStore(SESSION_STORE);
        database.createObjectStore(SETTINGS_STORE);
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

  return {
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
    remove: async (id) => withDatabase((database) => erase(database, SESSION_STORE, id)),
    loadSettings: async () => {
      const envelope = await withDatabase((database) =>
        read<Envelope>(database, SETTINGS_STORE, SETTINGS_ID),
      );
      return envelope
        ? validateSettings(await unseal('settings', SETTINGS_ID, envelope))
        : { model: '', openRouterKey: '', promptOverrides: {}, activeSessionId: null };
    },
    saveSettings: async (settings) => {
      const envelope = await seal('settings', SETTINGS_ID, validateSettings(settings));
      await withDatabase((database) => put(database, SETTINGS_STORE, SETTINGS_ID, envelope));
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
        string(message.createdAt, 40),
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

function validateSettings(value: unknown): MiraSettings {
  if (
    !isRecord(value) ||
    !string(value.model, 300) ||
    !string(value.openRouterKey, 2000) ||
    (value.activeSessionId !== null && !string(value.activeSessionId, 100)) ||
    !isRecord(value.promptOverrides) ||
    Object.keys(value.promptOverrides).length > 20 ||
    !Object.values(value.promptOverrides).every((entry) => string(entry, 30000))
  ) {
    throw new Error('Private Mira settings are invalid.');
  }
  return value as MiraSettings;
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

function erase(database: IDBDatabase, store: string, id: string): Promise<void> {
  return write(database, store, (table) => {
    table.delete(id);
  });
}
