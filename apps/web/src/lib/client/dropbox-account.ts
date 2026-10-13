const DATABASE = 'patternverse-cross-device-sync-v1';
const OWNER = 'workspace-owner';

/** Bind this browser's shared workspace before any sync. Disconnect must not erase ownership. */
export function claimDropboxWorkspace(accountId: string): Promise<void> {
  if (!accountId.trim()) return Promise.reject(new Error('Dropbox did not identify the account.'));
  return new Promise((resolve, reject) => {
    let blocked = false;
    const opening = indexedDB.open(DATABASE, 2);
    opening.onupgradeneeded = () => {
      for (const store of ['keys', 'bases', 'metadata'])
        if (!opening.result.objectStoreNames.contains(store))
          opening.result.createObjectStore(store);
    };
    opening.onerror = () => reject(opening.error);
    opening.onblocked = () => {
      blocked = true;
      reject(new Error('Close other Patternverse tabs, then try syncing again.'));
    };
    opening.onsuccess = () => {
      const database = opening.result;
      if (blocked) {
        database.close();
        return;
      }
      // One transaction serializes claims from different tabs and migrates known legacy owners.
      const transaction = database.transaction(['metadata', 'keys', 'bases'], 'readwrite');
      const metadata = transaction.objectStore('metadata');
      const owner = metadata.get(OWNER);
      const keys = transaction.objectStore('keys').getAllKeys();
      const bases = transaction.objectStore('bases').getAllKeys();
      let failure: Error | undefined;
      bases.onsuccess = () => {
        const previous = owner.result ? [owner.result] : [...keys.result, ...bases.result];
        if (previous.some((id) => id !== accountId)) {
          failure = new Error(
            'This browser workspace belongs to another Dropbox account. Reconnect the original account, or use a separate browser profile for a different person. Your local data has not been moved or deleted.',
          );
          transaction.abort();
          return;
        }
        metadata.put(accountId, OWNER);
      };
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onabort = transaction.onerror = () => {
        database.close();
        reject(failure ?? transaction.error ?? new Error('Could not verify workspace ownership.'));
      };
    };
  });
}
