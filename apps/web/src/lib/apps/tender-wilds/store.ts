import { act, newGame, parseGame, type Action, type Game } from './game';

/** Separate from the library and Mira; read and mutate in one transaction across tabs. */
export function createGardenStore(
  storage: IDBFactory = indexedDB,
  name = 'patternverse-tender-wilds-v1',
) {
  async function transact(action?: Action): Promise<Game> {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = storage.open(name, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('garden');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Close another Tender Wilds tab and try again.'));
    });
    try {
      return await new Promise<Game>((resolve, reject) => {
        const tx = db.transaction('garden', 'readwrite');
        const table = tx.objectStore('garden');
        const request = table.get('current');
        let next: Game;
        let cause: unknown;
        request.onsuccess = () => {
          try {
            const now = Date.now();
            const current = request.result === undefined ? newGame(now) : parseGame(request.result);
            next = action ? act(current, action, now) : current;
            if (action || request.result === undefined) table.put(next, 'current');
          } catch (error) {
            cause = error;
            tx.abort();
          }
        };
        tx.oncomplete = () => resolve(next);
        tx.onabort = () =>
          reject(cause ?? tx.error ?? new Error('Your garden could not be saved.'));
        tx.onerror = () => {
          cause ??= tx.error;
        };
      });
    } finally {
      db.close();
    }
  }
  return { load: () => transact(), dispatch: (action: Action) => transact(action) };
}
