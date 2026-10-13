import { expect, test } from '@playwright/test';

test('creates private local content, retains ownership on reload, and never publishes it', async ({
  page,
  request,
}) => {
  await page.goto('/editor?type=pattern');
  const ownership = page.getByRole('complementary', { name: 'Workspace ownership and privacy' });
  await expect(ownership).toContainText('My Workspace');
  await expect(ownership).toContainText('Private · only you');
  await expect(ownership).toContainText('not added to public Patternverse');
  await page.getByLabel('Title', { exact: true }).fill('Foundation private pattern');
  await page.getByLabel('Status', { exact: true }).selectOption('published');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved “Foundation private pattern” as ready.')).toBeVisible();
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
  await page.goto('/my');
  await expect(page.getByRole('heading', { name: 'My Workspace.' })).toBeVisible();
  const article = page
    .locator('.workspace-entities article')
    .filter({ hasText: 'Foundation private pattern' });
  await expect(article).toContainText('pattern · mine · ready');
  await page.reload();
  await expect(article).toContainText('pattern · mine · ready');
  await expect(page.getByRole('button', { name: 'Publish locally' })).toHaveCount(0);
  expect(await (await request.get('/library')).text()).not.toContain('Foundation private pattern');
  await expect(
    page.getByText('Clearing Patternverse site data can delete work saved on this device.', {
      exact: false,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('saved references survive reload, resolve in workspace, and can be removed', async ({
  page,
}) => {
  await page.goto('/pattern/observer');
  await page.getByRole('button', { name: 'Add to my library' }).click();
  await expect(page.getByRole('button', { name: 'In my library' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'In my library' })).toBeEnabled();
  await page.goto('/my');
  await page.getByRole('button', { name: /^Saved from Explore/ }).click();
  const favorites = page.locator('.content-card').filter({ hasText: 'Observer' });
  await expect(favorites.getByRole('link', { name: /Open pattern/ })).toHaveAttribute(
    'href',
    '/pattern/observer',
  );
  await expect(favorites).toContainText('commons · saved in my library');
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('patternverse-workspace-v1');
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const all = (name: string) =>
      new Promise<unknown[]>((resolve, reject) => {
        const read = db.transaction(name).objectStore(name).getAll();
        read.onsuccess = () => resolve(read.result);
        read.onerror = () => reject(read.error);
      });
    const result = {
      entities: await all('entities'),
      favorites: await all('favorites'),
      workspaces: await all('workspaces'),
    };
    db.close();
    return result;
  });
  expect(stored.entities).toEqual([]);
  expect(stored.workspaces).toHaveLength(1);
  expect(stored.favorites).toHaveLength(1);
  expect(stored.favorites[0]).toMatchObject({ ref: { sourceId: 'commons', entityId: 'observer' } });
  expect(stored.favorites[0]).not.toHaveProperty('body');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await favorites.getByRole('button', { name: 'Remove Observer from my library' }).click();
  await expect(favorites.getByRole('link')).toHaveCount(0);
  await page.goto('/pattern/observer');
  await expect(page.getByRole('button', { name: 'Add to my library' })).toBeEnabled();
});

test('upgrades legacy local data in place and retains its stable workspace on subsequent opens', async ({
  page,
}) => {
  await page.goto('/about');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      // Match the native version of the app's original Dexie version 1 database.
      const open = indexedDB.open('patternverse-workspace-v1', 10);
      open.onupgradeneeded = () => {
        const entities = open.result.createObjectStore('entities', { keyPath: 'id' });
        for (const field of ['type', 'status', 'updatedAt']) entities.createIndex(field, field);
        const ratings = open.result.createObjectStore('usefulness', { keyPath: 'refKey' });
        for (const field of ['sourceId', 'entityId', 'updatedAt'])
          ratings.createIndex(field, field);
      };
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction(['entities', 'usefulness'], 'readwrite');
        tx.objectStore('entities').put({
          id: 'legacy-private',
          sourceId: 'personal',
          type: 'pattern',
          title: 'Legacy private pattern',
          body: 'Keep my full article.',
          status: 'published',
          createdAt: '2026-08-01',
          updatedAt: '2026-08-02',
        });
        tx.objectStore('usefulness').put({
          refKey: 'commons:observer',
          sourceId: 'commons',
          entityId: 'observer',
          usefulness: 2,
          updatedAt: '2026-08-03',
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.goto('/my');
  await expect(page.getByRole('heading', { name: 'Legacy private pattern' })).toBeVisible();
  const snapshot = () =>
    page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const open = indexedDB.open('patternverse-workspace-v1');
        open.onsuccess = () => resolve(open.result);
      });
      const read = (name: string) =>
        new Promise<unknown[]>((resolve) => {
          const request = db.transaction(name).objectStore(name).getAll();
          request.onsuccess = () => resolve(request.result);
        });
      const data = {
        workspaces: await read('workspaces'),
        entities: await read('entities'),
        ratings: await read('usefulness'),
      };
      db.close();
      return data;
    });
  const first = await snapshot();
  expect(first.workspaces).toHaveLength(1);
  expect(first.entities[0]).toMatchObject({
    id: 'legacy-private',
    body: 'Keep my full article.',
    status: 'published',
    createdAt: '2026-08-01',
    updatedAt: '2026-08-02',
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Legacy private pattern' })).toBeVisible();
  expect(await snapshot()).toEqual(first);
  await page.goto('/pattern/observer');
  await expect(page.getByRole('button', { name: 'Very useful', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
