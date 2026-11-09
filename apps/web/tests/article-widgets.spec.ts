import { expect, test } from '@playwright/test';

test('runs a local HTML statistics example, isolates it, and resets it', async ({ page }) => {
  let externalRequests = 0;
  await page.route('https://example.com/widget-test', (route) => {
    externalRequests += 1;
    return route.fulfill({
      body: 'Unexpected external request',
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/concept/sampling-variability');
  await expect(
    page.getByRole('heading', { name: 'Sampling Variability', exact: true }),
  ).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('pre [data-article-widget]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Run example' }).click();
  const host = page.frameLocator('iframe[title="Coin sampling explorer"]');
  const widget = host.frameLocator('iframe');
  await expect(widget.getByRole('button', { name: 'Toss coins' })).toBeVisible();
  await widget.getByRole('combobox', { name: 'Coins per batch' }).selectOption('10');
  await widget.getByRole('button', { name: 'Toss coins' }).click();
  await expect(widget.locator('#summary')).toContainText('10 tosses');
  await expect(widget.locator('#line')).toHaveAttribute('d', /^M/);

  const isolated = await widget.locator('body').evaluate(async () => {
    let parentBlocked = false;
    let storageBlocked = false;
    let networkBlocked = false;
    try {
      void window.top!.document;
    } catch {
      parentBlocked = true;
    }
    try {
      localStorage.setItem('widget-test', '1');
    } catch {
      storageBlocked = true;
    }
    try {
      await fetch('https://example.com/widget-test');
    } catch {
      networkBlocked = true;
    }
    return { parentBlocked, storageBlocked, networkBlocked };
  });
  expect(isolated).toEqual({ parentBlocked: true, storageBlocked: true, networkBlocked: true });
  expect(externalRequests).toBe(0);
  await page.getByRole('button', { name: 'Reset example' }).click();
  await expect(widget.locator('#summary')).toContainText('No tosses yet');
  await expect(widget.locator('#line')).not.toHaveAttribute('d');
});

test('keeps the widget available after visiting online and going offline', async ({
  page,
  context,
}) => {
  await page.goto('/concept/sampling-variability');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  // Load the article under worker control so its bootstrap assets are cached too.
  await page.reload();
  await page.getByRole('button', { name: 'Run example' }).click();
  const widget = page.frameLocator('iframe[title="Coin sampling explorer"]').frameLocator('iframe');
  await expect(widget.getByRole('button', { name: 'Toss coins' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Run example' }).click();
  await widget.getByRole('button', { name: 'Toss coins' }).click();
  await expect(widget.locator('#summary')).toContainText('100 tosses');
});
