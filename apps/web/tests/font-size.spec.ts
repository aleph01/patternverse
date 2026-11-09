import { expect, test } from '@playwright/test';

test('saves all three text sizes across navigation and reloads', async ({ page }, testInfo) => {
  await page.goto('/my?pane=settings');
  const size = page.getByRole('combobox', { name: 'Font size' });
  await expect(size).toBeEnabled();
  await expect(size).toHaveValue('standard');
  const measurements: number[] = [];

  for (const [value, rootSize] of [
    ['small', '14px'],
    ['standard', '16px'],
    ['large', '18px'],
  ]) {
    await size.selectOption(value);
    await page.getByRole('button', { name: 'Save settings', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Settings saved on this device.');
    await expect(page.locator('html')).toHaveCSS('font-size', rootSize);
    await page
      .getByRole('banner')
      .getByRole('link', { name: 'Patternverse home', exact: true })
      .click();
    await page.waitForURL('/', { timeout: 45000 });
    await expect(page.locator('html')).toHaveCSS('font-size', rootSize);
    await page.goto('/pattern/creative-reframing');
    await page.reload();
    await expect(page.locator('html')).toHaveCSS('font-size', rootSize);
    const article = page.locator('.entity-article .markdown-body');
    measurements.push(
      await article.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.goto('/my?pane=settings');
    await expect(size).toHaveValue(value);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (value === 'large')
      await page.screenshot({ path: testInfo.outputPath('large-settings.png') });
  }
  expect(measurements[0]).toBeLessThan(measurements[1]);
  expect(measurements[1]).toBeLessThan(measurements[2]);
});

test('keeps standard text usable when storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage is blocked', 'SecurityError');
      },
    });
  });
  await page.goto('/pattern/creative-reframing');
  await expect(page.getByRole('heading', { level: 1, name: 'Creative Reframing' })).toBeVisible();
  await expect(page.locator('html')).toHaveCSS('font-size', '16px');
});
