import { expect, test } from '@playwright/test';

test('keeps shared shell geometry stable across feature navigation and Mira return', async ({
  page,
}) => {
  await page.goto('/library');
  const header = page.locator('.site-header');
  const geometry = () =>
    header.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        height: rect.height,
        padding: getComputedStyle(element).padding,
        links: [...element.querySelectorAll('nav a')].map((link) => {
          const style = getComputedStyle(link);
          return [style.fontSize, style.fontWeight, style.lineHeight];
        }),
      };
    });
  const baseline = await geometry();
  for (const destination of ['apps', 'workspace', 'library']) {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: destination, exact: true })
      .click();
    await expect(page).toHaveURL(destination === 'workspace' ? '/my' : `/${destination}`);
    await expect(header).toBeVisible();
    expect(await geometry()).toEqual(baseline);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto('/mira');
  await expect(page.locator('.mira-app')).toBeVisible();
  await page.goBack();
  await expect(header).toBeVisible();
  expect(await geometry()).toEqual(baseline);
});

test('retains compact article metadata and final reduced-motion overrides', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/pattern/cbt-thinking-patterns');
  const panel = page.locator('.entity-meta-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'was this useful for you?' })).toHaveCSS(
    'font-size',
    '16px',
  );
  await expect(panel.getByRole('heading', { name: 'Appears in' })).toHaveCSS('font-size', '16px');
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  await page.locator('.site-utilities').getByRole('link', { name: 'library', exact: true }).click();
  await expect(page).toHaveURL('/library');
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  const link = page.locator('.site-utilities a').first();
  await page.keyboard.press('Tab');
  await link.focus();
  await expect(link).toHaveCSS('outline-color', 'rgb(21, 87, 255)');
  await expect(link).toHaveCSS('outline-width', '3px');
});
