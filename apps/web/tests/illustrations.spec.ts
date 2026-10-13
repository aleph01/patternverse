import { expect, test } from '@playwright/test';

test('featured illustrations lead the cards in compact and non-wide layouts', async ({ page }) => {
  await page.goto('/');
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 900, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    for (const card of await page.locator('.featured-grid article').all()) {
      const art = (await card.locator('.featured-art').boundingBox())!;
      const copy = (await card.locator('.featured-copy').boundingBox())!;
      expect(art.y + art.height).toBeLessThanOrEqual(copy.y + 1);
      const svg = card.locator('.featured-art > svg');
      await expect(svg).toHaveAttribute('viewBox', '0 0 400 300');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  const first = page.locator('.featured-grid article').first();
  const art = (await first.locator('.featured-art').boundingBox())!;
  const copy = (await first.locator('.featured-copy').boundingBox())!;
  expect(art.x).toBeGreaterThanOrEqual(copy.x + copy.width - 1);
});

test('personal studio is not exposed in the public website', async ({ page }) => {
  await page.goto('/my');
  await expect(page.getByRole('link', { name: 'Create an illustration' })).toHaveCount(0);
  const response = await page.goto('/tools/illustrations');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('button', { name: 'Download SVG' })).toHaveCount(0);
});
