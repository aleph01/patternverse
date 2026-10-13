import { IDBFactory } from 'fake-indexeddb';
import { expect, it } from 'vitest';
import { createGardenStore } from './store';
const priority = { key: 'commons:focus', sourceId: 'commons', entityId: 'focus', title: 'Focus' };
it('persists progress and serializes simultaneous updates from two tabs', async () => {
  const factory = new IDBFactory();
  const a = createGardenStore(factory);
  const b = createGardenStore(factory);
  await a.load();
  await a.dispatch({ type: 'add-priority', priority });
  await Promise.all([
    a.dispatch({ type: 'recognize', key: priority.key, points: 3 }),
    b.dispatch({ type: 'recognize', key: priority.key, points: 5 }),
  ]);
  expect((await createGardenStore(factory).load()).points).toBe(8);
});
it('failed actions never partially save resources', async () => {
  const store = createGardenStore(new IDBFactory());
  const before = await store.load();
  await expect(store.dispatch({ type: 'bridge' })).rejects.toThrow();
  expect(await store.load()).toEqual(before);
});
it('retains unreadable records for recovery', async () => {
  const factory = new IDBFactory();
  const store = createGardenStore(factory);
  await store.load();
  const db = await new Promise<IDBDatabase>((resolve) => {
    const r = factory.open('patternverse-tender-wilds-v1', 1);
    r.onsuccess = () => resolve(r.result);
  });
  await new Promise<void>((resolve) => {
    const t = db.transaction('garden', 'readwrite');
    t.objectStore('garden').put({ version: 99 }, 'current');
    t.oncomplete = () => resolve();
  });
  db.close();
  await expect(store.load()).rejects.toThrow('left untouched');
  await expect(store.dispatch({ type: 'buy', species: 'clover' })).rejects.toThrow(
    'left untouched',
  );
});
