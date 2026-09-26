import { expect, test } from '@playwright/test';

test('keeps saved Mira sessions and the pattern editor available offline', async ({
  page,
  context,
}) => {
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session' }).click();
  await expect(page.getByRole('heading', { name: 'New session' })).toBeVisible();

  await page.goto('/editor?type=pattern');
  await expect(page.getByRole('heading', { name: 'new pattern' })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'new pattern' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Title' }).fill('Offline pocket pattern');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved “Offline pocket pattern”')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'edit Offline pocket pattern' })).toBeVisible();

  await page.goto('/mira');
  await page.getByRole('button', { name: 'Sessions' }).click();
  await expect(page.getByRole('heading', { name: 'New session' })).toBeVisible();
});

test('keeps the principal phone screens within a narrow viewport', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 740 });
    for (const route of ['/', '/my', '/editor?type=pattern', '/mira']) {
      await page.goto(route);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width);
    }
  }
});
