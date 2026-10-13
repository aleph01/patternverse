import { expect, test } from '@playwright/test';

test('leaving during private startup prevents a late default-settings write and allows a fresh mount', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const state = { delay: true, pending: [] as (() => void)[], closes: 0, writes: 0 };
    Object.assign(window, { miraStartupTest: state });
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (...args) {
      const request = open.apply(this, args);
      if (args[0] === 'patternverse-mira-private-v1' && state.delay) {
        // Hold only delivery to Mira, not IndexedDB transactions or database creation.
        Object.defineProperty(request, 'onsuccess', {
          configurable: true,
          set(handler: (this: IDBOpenDBRequest, event: Event) => void) {
            request.addEventListener('success', (event) => {
              state.pending.push(() => handler.call(request, event));
            });
          },
        });
      }
      return request;
    };
    const close = IDBDatabase.prototype.close;
    IDBDatabase.prototype.close = function () {
      if (this.name === 'patternverse-mira-private-v1') state.closes += 1;
      close.call(this);
    };
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.transaction.db.name === 'patternverse-mira-private-v1') state.writes += 1;
      return put.apply(this, args);
    };
  });
  await page.goto('/mira?panel=settings');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { miraStartupTest: { pending: unknown[] } }).miraStartupTest.pending
            .length,
      ),
    )
    .toBeGreaterThanOrEqual(2);
  await page.locator('.mira-app-header a').click();
  await expect(page).toHaveURL(/\/apps\/mira$/);
  await page.evaluate(() => {
    const state = (
      window as unknown as { miraStartupTest: { delay: boolean; pending: (() => void)[] } }
    ).miraStartupTest;
    state.delay = false;
    state.pending.splice(0).forEach((finish) => finish());
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { miraStartupTest: { closes: number } }).miraStartupTest.closes,
      ),
    )
    .toBeGreaterThanOrEqual(2);
  expect(
    await page.evaluate(
      () => (window as unknown as { miraStartupTest: { writes: number } }).miraStartupTest.writes,
    ),
  ).toBe(0);
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('pending article requests are aborted on leave and selected context loads on a fresh mount', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const state = { requests: 0, aborted: 0 };
    Object.assign(window, { miraReferenceTest: state });
    const transport = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (String(input).includes('/mira/reference/')) {
        state.requests += 1;
        init?.signal?.addEventListener(
          'abort',
          () => {
            state.aborted += 1;
          },
          { once: true },
        );
      }
      return transport(input, init);
    };
  });
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route('**/mira/reference/cbt-thinking-patterns', async (route) => {
    requests += 1;
    if (requests === 1) await delayed;
    await route.fulfill({
      json: {
        sourceId: 'commons',
        id: 'cbt-thinking-patterns',
        title: 'Identify Cognitive Distortions',
        summary: 'Synthetic reference',
        body: 'Synthetic article body',
        html: '<p>Synthetic article body</p>',
        standaloneHref: '/pattern/cbt-thinking-patterns/run',
      },
    });
  });
  await page.goto('/mira?source=commons&pattern=cbt-thinking-patterns');
  await page
    .locator('.mira-context-actions')
    .getByRole('button', { name: 'New session', exact: true })
    .click();
  await expect.poll(() => requests).toBe(1);
  await page.locator('.mira-app-header a').click();
  await expect(page).toHaveURL(/\/apps\/mira$/);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { miraReferenceTest: { aborted: number } }).miraReferenceTest
            .aborted,
      ),
    )
    .toBe(1);
  release();
  await page.goBack();
  const selected = page.getByRole('region', { name: 'Selected pattern' });
  await expect(selected).toBeVisible();
  await selected.getByText('Read article', { exact: true }).click();
  await expect(selected.getByText('Synthetic article body')).toBeVisible();
  expect(requests).toBe(2);
  expect(errors).toEqual([]);
});

test('repeated mounts detach and reinstall page listeners without duplicate shortcuts', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const keyboard = new Set<EventListenerOrEventListenerObject>();
    const visibility = new Set<EventListenerOrEventListenerObject>();
    Object.assign(window, {
      miraListenerCounts: () => ({ keyboard: keyboard.size, visibility: visibility.size }),
    });
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (listener && this === window && type === 'keydown') keyboard.add(listener);
      if (listener && this === document && type === 'visibilitychange') visibility.add(listener);
      add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      if (listener && this === window && type === 'keydown') keyboard.delete(listener);
      if (listener && this === document && type === 'visibilitychange') visibility.delete(listener);
      remove.call(this, type, listener, options);
    };
  });
  const counts = () =>
    page.evaluate(() =>
      (
        window as unknown as { miraListenerCounts: () => { keyboard: number; visibility: number } }
      ).miraListenerCounts(),
    );
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toBeVisible();
  const mounted = await counts();
  for (let mount = 0; mount < 2; mount += 1) {
    await page.locator('.mira-app-header a').click();
    await expect(page).toHaveURL(/\/apps\/mira$/);
    await expect
      .poll(counts)
      .toEqual({ keyboard: mounted.keyboard - 1, visibility: mounted.visibility - 1 });
    await page.goBack();
    const composer = page.getByRole('textbox', { name: 'Message mira' });
    await expect(composer).toBeVisible();
    await expect.poll(counts).toEqual(mounted);
    await composer.focus();
    await composer.press('Shift+Space');
    await expect(page.getByRole('dialog', { name: 'Patterns & practices' })).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(composer).toBeFocused();
  }
  expect(errors).toEqual([]);
});
