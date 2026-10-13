import { randomSyncBytes, syncBase64, syncUnbase64 } from './sync-envelope';

type DeviceStateKey = Readonly<{ key: CryptoKey; salt: string }>;
const DATABASE = 'patternverse-dropbox-device-state-v1';
const STORE = 'keys';

/** Local recovery encryption only. Never uploaded, derived from OAuth, or shared
 * between devices. Retained on disconnect so pending sync can be recovered later.
 */
export async function getDropboxDeviceStateKey(accountId: string): Promise<DeviceStateKey> {
  if (!accountId.trim()) throw new Error('A Dropbox account is required.');
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open(DATABASE, 1);
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
  const validate = (value: DeviceStateKey): DeviceStateKey => {
    if (
      !value?.key ||
      value.key.type !== 'secret' ||
      value.key.algorithm.name !== 'AES-GCM' ||
      (value.key.algorithm as AesKeyAlgorithm).length !== 256 ||
      value.key.extractable ||
      !value.key.usages.includes('encrypt') ||
      !value.key.usages.includes('decrypt') ||
      typeof value.salt !== 'string' ||
      syncUnbase64(value.salt).byteLength !== 16
    )
      throw new Error('The local sync recovery key is invalid. Your recovery data was preserved.');
    return value;
  };
  try {
    const existing = await new Promise<DeviceStateKey | undefined>((resolve, reject) => {
      const transaction = database.transaction(STORE);
      const request = transaction.objectStore(STORE).get(accountId);
      transaction.oncomplete = () => resolve(request.result as DeviceStateKey | undefined);
      transaction.onerror = transaction.onabort = () => reject(transaction.error);
    });
    if (existing) return validate(existing);
    const generated: DeviceStateKey = {
      key: await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ]),
      salt: syncBase64(randomSyncBytes(16)),
    };
    // Read/put in one transaction: another tab's winning key must not be replaced.
    return validate(
      await new Promise<DeviceStateKey>((resolve, reject) => {
        const transaction = database.transaction(STORE, 'readwrite');
        const table = transaction.objectStore(STORE);
        const request = table.get(accountId);
        let selected = generated;
        request.onsuccess = () => {
          if (request.result) selected = request.result as DeviceStateKey;
          else table.put(generated, accountId);
        };
        transaction.oncomplete = () => resolve(selected);
        transaction.onerror = transaction.onabort = () => reject(transaction.error);
      }),
    );
  } finally {
    database.close();
  }
}
